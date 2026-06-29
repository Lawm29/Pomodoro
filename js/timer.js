const Timer = {
  duration: 0,
  remaining: 0,
  isRunning: false,
  interval: null,
  mode: 'focus',
  sessionCount: 0,
  totalSessions: 4,
  currentTags: [],
  tagSegments: [],
  activeSegment: null,
  startTimestamp: 0,
  startRemaining: 0,
  countUp: false,
  breakElapsed: 0,
  editing: false,

  elements: {},

  init() {
    this.elements = {
      minutes: document.getElementById('timerMinutes'),
      seconds: document.getElementById('timerSeconds'),
      progress: document.getElementById('timerProgress'),
      playPause: document.getElementById('btnPlayPause'),
      reset: document.getElementById('btnReset'),
      skip: document.getElementById('btnSkip'),
      typeLabel: document.getElementById('sessionTypeLabel'),
      sessionCount: document.getElementById('sessionCount'),
      wrapper: document.querySelector('.timer-circle-wrapper'),
      display: document.querySelector('.timer-display'),
      timerDisplay: document.querySelector('.timer-circle-wrapper'),
      skipLabel: document.getElementById('btnSkipLabel')
    };

    this.elements.playPause.addEventListener('click', () => this.togglePlay());
    this.elements.reset.addEventListener('click', () => this.reset());
    this.elements.skip.addEventListener('click', () => this.skip());

    // Editable display - click to edit time
    this.elements.timerDisplay.addEventListener('click', (e) => {
      if (!this.isRunning && !this.countUp && this.remaining === this.duration) {
        this.startEditing();
      }
    });

    // Transition toggle on timer view
    this.autoTransitionToggle = document.getElementById('timerAutoTransition');
    this.transitionModeLabel = document.getElementById('transitionModeLabel');
    if (this.autoTransitionToggle) {
      this.autoTransitionToggle.addEventListener('change', () => {
        this.autoTransition = this.autoTransitionToggle.checked;
        this.transitionModeLabel.textContent = this.autoTransition ? 'Automática' : 'Manual';
        if (typeof Settings !== 'undefined' && Settings.current) {
          Settings.current.autoTransition = this.autoTransition;
          Storage.saveSettings(Settings.current);
        }
      });
    }

    // Time adjustment buttons
    document.querySelectorAll('.adjust-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const minutes = parseInt(btn.dataset.minutes);
        this.adjustTime(minutes);
      });
    });

    // End tag button
    const endTagBtn = document.getElementById('btnEndTag');
    if (endTagBtn) {
      endTagBtn.addEventListener('click', () => {
        if (typeof Tags !== 'undefined') {
          Tags.endTag();
        }
      });
    }

    // Custom time adjustment
    const customBtn = document.getElementById('btnCustomAdjust');
    const customInput = document.getElementById('customAdjustInput');
    if (customBtn && customInput) {
      customBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        customInput.style.display = customInput.style.display === 'none' ? 'block' : 'none';
        customInput.focus();
      });
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = parseInt(customInput.value);
          if (val && val !== 0) {
            this.adjustTime(val);
            customInput.value = '';
            customInput.style.display = 'none';
          }
        } else if (e.key === 'Escape') {
          customInput.value = '';
          customInput.style.display = 'none';
        }
      });
      customInput.addEventListener('blur', () => {
        customInput.style.display = 'none';
        customInput.value = '';
      });
    }

    this.CIRCUMFERENCE = 2 * Math.PI * 90;
    this.elements.progress.style.strokeDasharray = this.CIRCUMFERENCE;
  },

  configure(settings) {
    this.totalSessions = settings.sessionsBeforeLongBreak || 4;
    this.focusDuration = (settings.focusDuration || 25) * 60;
    this.shortBreakDuration = (settings.shortBreakDuration || 5) * 60;
    this.longBreakDuration = (settings.longBreakDuration || 15) * 60;
    this.autoTransition = settings.autoTransition !== false;
    this.soundEnabled = settings.soundEnabled !== false;
    this.youtubeUrl = settings.youtubeUrl || '';

    if (this.autoTransitionToggle) {
      this.autoTransitionToggle.checked = this.autoTransition;
      this.transitionModeLabel.textContent = this.autoTransition ? 'Automática' : 'Manual';
    }

    if (!this.isRunning) {
      if (this.mode === 'focus') {
        this.duration = this.focusDuration;
      } else if (this.mode === 'shortBreak') {
        this.duration = this.shortBreakDuration;
      } else {
        this.duration = this.longBreakDuration;
      }
      this.remaining = this.countUp ? 0 : this.duration;
      this.breakElapsed = 0;
      this.updateDisplay();
      this.updateProgress();
    }
  },

  getElapsed() {
    if (this.countUp) {
      return this.breakElapsed;
    }
    return this.duration - this.remaining;
  },

  startTag(tagName) {
    if (!tagName || this.mode !== 'focus') return;

    const elapsed = this.getElapsed();

    if (this.activeSegment) {
      this.activeSegment.tags.push(tagName);
    } else {
      this.activeSegment = {
        tags: [tagName],
        start: elapsed
      };
    }

    this.currentTags = this.activeSegment.tags.slice();
    this.updateEndTagBtn();
    if (typeof Tags !== 'undefined') {
      Tags.renderTags();
    }
  },

  endCurrentTag() {
    if (!this.activeSegment) return false;

    const elapsed = this.getElapsed();
    this.activeSegment.end = elapsed;
    this.tagSegments.push(this.activeSegment);
    this.activeSegment = null;
    this.updateEndTagBtn();
    if (typeof Tags !== 'undefined') {
      Tags.renderTags();
    }
    return true;
  },

  updateEndTagBtn() {
    const btn = document.getElementById('btnEndTag');
    if (btn) {
      btn.style.display = (this.activeSegment && this.isRunning) ? 'inline-flex' : 'none';
    }
  },

  getAllTags() {
    const allTags = [];
    this.tagSegments.forEach(seg => {
      (seg.tags || []).forEach(tag => {
        if (!allTags.includes(tag)) allTags.push(tag);
      });
    });
    if (this.activeSegment) {
      (this.activeSegment.tags || []).forEach(tag => {
        if (!allTags.includes(tag)) allTags.push(tag);
      });
    }
    this.currentTags.forEach(tag => {
      if (!allTags.includes(tag)) allTags.push(tag);
    });
    return allTags;
  },

  start(mode) {
    this.stop();
    this.mode = mode || 'focus';
    this.countUp = (this.mode !== 'focus');
    this.breakElapsed = 0;
    this.tagSegments = [];
    this.activeSegment = null;

    if (this.mode === 'focus') {
      this.duration = this.focusDuration;
      this.remaining = this.duration;
      this.elements.typeLabel.textContent = 'Foco';
      this.elements.typeLabel.className = 'session-type focus';
      this.elements.progress.classList.remove('break-mode');
      this.elements.progress.style.display = '';
      if (this.elements.skipLabel) this.elements.skipLabel.textContent = 'Pular';
    } else if (this.mode === 'shortBreak') {
      this.duration = this.shortBreakDuration;
      this.remaining = 0;
      this.elements.typeLabel.textContent = 'Pausa Curta';
      this.elements.typeLabel.className = 'session-type break';
      this.elements.progress.classList.add('break-mode');
      this.elements.progress.style.display = 'none';
      if (this.elements.skipLabel) this.elements.skipLabel.textContent = 'Finalizar';
    } else {
      this.duration = this.longBreakDuration;
      this.remaining = 0;
      this.elements.typeLabel.textContent = 'Pausa Longa';
      this.elements.typeLabel.className = 'session-type break';
      this.elements.progress.classList.add('break-mode');
      this.elements.progress.style.display = 'none';
      if (this.elements.skipLabel) this.elements.skipLabel.textContent = 'Finalizar';
    }

    this.elements.sessionCount.textContent = `${this.sessionCount + 1} / ${this.totalSessions}`;
    this.updateDisplay();
    this.updateProgress();
    this.updateEndTagBtn();
  },

  togglePlay() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.play();
    }
  },

  play() {
    if (this.countUp && this.remaining === 0 && !this.isRunning) {
      // Fresh start for break
    } else if (!this.countUp && this.remaining <= 0) {
      this.start(this.mode);
    }

    clearInterval(this.interval);

    this.startTimestamp = Date.now();
    this.startRemaining = this.remaining;
    this.isRunning = true;

    this.elements.playPause.textContent = '⏸';
    this.elements.wrapper.classList.remove('paused');
    this.elements.display.classList.remove('paused');
    this.updateEndTagBtn();

    this.interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTimestamp) / 1000);

      if (this.countUp) {
        this.remaining = this.startRemaining + elapsed;
        this.breakElapsed = this.remaining;

        if (this.remaining >= this.duration) {
          this.remaining = this.duration;
          this.breakElapsed = this.duration;
          this.updateDisplay();
          this.complete();
          return;
        }
      } else {
        this.remaining = this.startRemaining - elapsed;

        if (this.remaining <= 0) {
          this.remaining = 0;
          this.updateDisplay();
          this.updateProgress();
          this.complete();
          return;
        }
      }

      this.updateDisplay();
      this.updateProgress();
    }, 250);
  },

  pause() {
    if (this.isRunning) {
      const elapsed = Math.floor((Date.now() - this.startTimestamp) / 1000);
      if (this.countUp) {
        this.remaining = this.startRemaining + elapsed;
        this.breakElapsed = this.remaining;
      } else {
        this.remaining = this.startRemaining - elapsed;
        if (this.remaining < 0) this.remaining = 0;
      }
    }

    this.isRunning = false;
    clearInterval(this.interval);
    this.elements.playPause.textContent = '▶';
    this.elements.wrapper.classList.add('paused');
    this.elements.display.classList.add('paused');
    this.updateEndTagBtn();
  },

  stop() {
    if (this.isRunning) {
      const elapsed = Math.floor((Date.now() - this.startTimestamp) / 1000);
      if (this.countUp) {
        this.remaining = this.startRemaining + elapsed;
        this.breakElapsed = this.remaining;
      } else {
        this.remaining = this.startRemaining - elapsed;
        if (this.remaining < 0) this.remaining = 0;
      }
    }

    this.isRunning = false;
    clearInterval(this.interval);
    this.elements.playPause.textContent = '▶';
    this.elements.wrapper.classList.remove('paused');
    this.elements.display.classList.remove('paused');
    this.updateEndTagBtn();
  },

  reset() {
    if (this.activeSegment) {
      const elapsed = this.getElapsed();
      this.activeSegment.end = elapsed;
      this.tagSegments.push(this.activeSegment);
      this.activeSegment = null;
      this.updateEndTagBtn();
      if (typeof Tags !== 'undefined') {
        Tags.renderTags();
      }
    }
    this.stop();
    if (this.countUp) {
      this.remaining = 0;
      this.breakElapsed = 0;
    } else {
      this.remaining = this.duration;
    }
    this.updateDisplay();
    this.updateProgress();
  },

  skip() {
    this.complete();
  },

  complete() {
    this.stop();

    let actualDuration;
    if (this.countUp) {
      actualDuration = this.breakElapsed;
      if (actualDuration < 1) actualDuration = 1;
    } else {
      actualDuration = this.duration - this.remaining;
      if (actualDuration < 1) actualDuration = 1;
    }

    if (this.activeSegment) {
      this.activeSegment.end = actualDuration;
      this.tagSegments.push(this.activeSegment);
      this.activeSegment = null;
    }

    const completedSession = {
      type: this.mode,
      duration: actualDuration,
      plannedDuration: this.duration,
      completedAt: new Date().toISOString(),
      tags: this.getAllTags(),
      tagSegments: this.tagSegments.length > 0 ? [...this.tagSegments] : undefined
    };

    if (this.soundEnabled) {
      this.playAlarm();
    }

    if (typeof Storage !== 'undefined') {
      Storage.saveSession(completedSession);
    }

    this.tagSegments = [];
    this.updateEndTagBtn();

    if (this.mode === 'focus') {
      this.sessionCount++;
      if (this.sessionCount >= this.totalSessions) {
        this.sessionCount = 0;
        this.startNext('longBreak');
      } else {
        this.startNext('shortBreak');
      }
    } else {
      this.startNext('focus');
    }
  },

  startNext(mode) {
    this.currentTags = [];
    this.tagSegments = [];
    this.activeSegment = null;
    this.updateEndTagBtn();
    if (typeof Tags !== 'undefined') {
      Tags.clearTags();
    }
    this.start(mode);

    if (this.autoTransition && mode === 'focus') {
      this.play();
    }
  },

  adjustTime(minutes) {
    const seconds = minutes * 60;

    if (this.countUp) {
      // Break mode - count up
      this.breakElapsed = Math.max(0, this.breakElapsed + seconds);
      if (this.isRunning) {
        this.startRemaining = this.breakElapsed;
        this.startTimestamp = Date.now();
        this.remaining = this.breakElapsed;
      } else {
        this.remaining = this.breakElapsed;
      }
    } else {
      // Focus mode - count down
      const newRemaining = Math.max(1, this.remaining + seconds);
      this.duration = this.duration + seconds;
      this.remaining = newRemaining;

      if (this.isRunning) {
        this.startRemaining = this.remaining;
        this.startTimestamp = Date.now();
      }
    }

    this.updateDisplay();
    this.updateProgress();
  },

  startEditing() {
    if (this.editing || this.isRunning || this.countUp) return;
    this.editing = true;

    const minSpan = this.elements.minutes;
    const secSpan = this.elements.seconds;

    const currentMin = Math.floor(this.remaining / 60);
    const currentSec = this.remaining % 60;

    const wrapper = document.createElement('div');
    wrapper.className = 'timer-edit-inputs';
    wrapper.innerHTML = `
      <input type="number" class="timer-edit-min" min="0" max="999" value="${currentMin}">:
      <input type="number" class="timer-edit-sec" min="0" max="59" value="${currentSec}">
    `;

    minSpan.style.display = 'none';
    secSpan.style.display = 'none';
    this.elements.display.querySelector('.timer-separator').style.display = 'none';
    this.elements.display.appendChild(wrapper);

    const minInput = wrapper.querySelector('.timer-edit-min');
    const secInput = wrapper.querySelector('.timer-edit-sec');
    minInput.focus();
    minInput.select();

    const finishEditing = () => {
      const newMin = parseInt(minInput.value) || 0;
      const newSec = parseInt(secInput.value) || 0;
      const totalSec = (newMin * 60) + newSec;

      if (totalSec > 0) {
        this.duration = totalSec;
        this.remaining = totalSec;
        this.updateDisplay();
        this.updateProgress();
      }

      wrapper.remove();
      minSpan.style.display = '';
      secSpan.style.display = '';
      this.elements.display.querySelector('.timer-separator').style.display = '';
      this.editing = false;
    };

    minInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') secInput.focus();
      if (e.key === 'Escape') finishEditing();
    });
    secInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishEditing();
      if (e.key === 'Escape') finishEditing();
    });
    minInput.addEventListener('blur', () => {
      setTimeout(finishEditing, 100);
    });
  },

  updateDisplay() {
    const mins = Math.floor(this.remaining / 60);
    const secs = this.remaining % 60;
    this.elements.minutes.textContent = String(mins).padStart(2, '0');
    this.elements.seconds.textContent = String(secs).padStart(2, '0');
  },

  updateProgress() {
    if (this.countUp || this.duration === 0) return;
    const progress = 1 - (this.remaining / this.duration);
    const offset = this.CIRCUMFERENCE * (1 - progress);
    this.elements.progress.style.strokeDashoffset = offset;
  },

  playAlarm() {
    if (typeof Sound !== 'undefined') {
      Sound.play(this.youtubeUrl);
    }
  }
};
