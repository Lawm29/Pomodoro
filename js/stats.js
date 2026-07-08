const Stats = {
  currentPeriod: 'today',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  editingSessionId: null,
  editSessionTags: [],
  editTagSegments: [],
  manualTags: [],
  manualTagSegments: [],

  init() {
    this.elements = {
      focusTime: document.getElementById('statFocusTime'),
      breakTime: document.getElementById('statBreakTime'),
      sessionsCount: document.getElementById('statSessionsCount'),
      tagsChart: document.getElementById('tagsChart'),
      historyFocusList: document.getElementById('historyFocusList'),
      historyBreakList: document.getElementById('historyBreakList'),
      editModal: document.getElementById('editModal'),
      editDuration: document.getElementById('editSessionDuration'),
      editTagInput: document.getElementById('editTagInput'),
      editTagsSuggestions: document.getElementById('editTagsSuggestions'),
      editSessionTags: document.getElementById('editSessionTags'),
      editCancel: document.getElementById('btnEditCancel'),
      editSave: document.getElementById('btnEditSave'),
      editSegmentsField: document.getElementById('editSegmentsField'),
      editSegmentsList: document.getElementById('editSegmentsList'),
      btnAddSegment: document.getElementById('btnAddSegment'),
      monthNav: document.getElementById('monthNav'),
      monthLabel: document.getElementById('monthLabel'),
      btnPrevMonth: document.getElementById('btnPrevMonth'),
      btnNextMonth: document.getElementById('btnNextMonth'),
      manualModal: document.getElementById('manualModal'),
      manualDate: document.getElementById('manualDate'),
      manualTime: document.getElementById('manualTime'),
      manualDuration: document.getElementById('manualDuration'),
      manualTagInput: document.getElementById('manualTagInput'),
      manualTagsSuggestions: document.getElementById('manualTagsSuggestions'),
      manualSessionTags: document.getElementById('manualSessionTags'),
      btnManualCancel: document.getElementById('btnManualCancel'),
      btnManualSave: document.getElementById('btnManualSave'),
      btnManualEntry: document.getElementById('btnManualEntry'),
      manualSegmentsField: document.getElementById('manualSegmentsField'),
      manualSegmentsList: document.getElementById('manualSegmentsList'),
      btnManualAddSegment: document.getElementById('btnManualAddSegment')
    };

    const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    this.updateMonthLabel = () => {
      this.elements.monthLabel.textContent = `${MONTH_NAMES[this.currentMonth]} ${this.currentYear}`;
      const now = new Date();
      this.elements.btnNextMonth.style.visibility =
        (this.currentYear === now.getFullYear() && this.currentMonth >= now.getMonth()) ? 'hidden' : 'visible';
    };

    this.elements.btnPrevMonth.addEventListener('click', () => {
      this.currentMonth--;
      if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
      this.updateMonthLabel();
      this.load().then(() => this.attachEditListeners());
    });

    this.elements.btnNextMonth.addEventListener('click', () => {
      const now = new Date();
      if (this.currentYear < now.getFullYear() || this.currentMonth < now.getMonth()) {
        this.currentMonth++;
        if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
        this.updateMonthLabel();
        this.load().then(() => this.attachEditListeners());
      }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPeriod = btn.dataset.period;
        if (btn.dataset.period === 'month') {
          this.currentMonth = new Date().getMonth();
          this.currentYear = new Date().getFullYear();
          this.elements.monthNav.style.display = 'flex';
          this.updateMonthLabel();
        } else {
          this.elements.monthNav.style.display = 'none';
        }
        this.load().then(() => this.attachEditListeners());
      });
    });

    // Edit modal events
    this.elements.editCancel.addEventListener('click', () => this.closeEditModal());
    this.elements.editSave.addEventListener('click', () => this.saveEdit());
    this.elements.editModal.addEventListener('click', (e) => {
      if (e.target === this.elements.editModal) this.closeEditModal();
    });

    // Edit tag input
    this.elements.editTagInput.addEventListener('input', () => this.onEditTagInput());
    this.elements.editTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = this.elements.editTagInput.value.trim().toLowerCase();
        if (val && !this.editSessionTags.includes(val)) {
          this.editSessionTags.push(val);
          this.renderEditTags();
          this.elements.editTagInput.value = '';
        }
      }
    });

    // Add segment button
    this.elements.btnAddSegment.addEventListener('click', () => {
      this.editTagSegments.push({ tags: [], duration: 0 });
      this.renderEditSegments();
    });

    // Manual entry modal
    this.elements.btnManualEntry.addEventListener('click', () => this.openManualModal());
    this.elements.btnManualCancel.addEventListener('click', () => this.closeManualModal());
    this.elements.btnManualSave.addEventListener('click', () => this.saveManualEntry());
    this.elements.manualModal.addEventListener('click', (e) => {
      if (e.target === this.elements.manualModal) this.closeManualModal();
    });
    this.elements.btnManualAddSegment.addEventListener('click', () => {
      this.manualTagSegments.push({ tags: [], duration: 0 });
      this.elements.manualSegmentsField.style.display = '';
      this.renderManualSegments();
    });

    // Manual tag input
    this.elements.manualTagInput.addEventListener('input', () => this.onManualTagInput());
    this.elements.manualTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = this.elements.manualTagInput.value.trim().toLowerCase();
        if (val && !this.manualTags.includes(val)) {
          this.manualTags.push(val);
          this.renderManualTags();
          this.elements.manualTagInput.value = '';
        }
      }
    });
  },

  async load() {
    let sessions;
    if (this.currentPeriod === 'all') {
      sessions = await Storage.loadAllSessions();
    } else if (this.currentPeriod === 'month') {
      sessions = await Storage.loadSessions('month', this.currentMonth, this.currentYear);
    } else {
      sessions = await Storage.loadSessions(this.currentPeriod);
    }
    this.render(sessions);
  },

  render(sessions) {
    const focusSessions = sessions.filter(s => s.type === 'focus');
    const breakSessions = sessions.filter(s => s.type !== 'focus');

    const totalFocus = focusSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalBreak = breakSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    this.elements.focusTime.textContent = this.formatDuration(totalFocus);
    this.elements.breakTime.textContent = this.formatDuration(totalBreak);
    this.elements.sessionsCount.textContent = focusSessions.length;

    this.renderTagsChart(focusSessions);
    this.renderFocusHistory(focusSessions);
    this.renderBreakHistory(breakSessions);
  },

  renderTagsChart(focusSessions) {
    const tagTime = {};
    focusSessions.forEach(s => {
      if (s.tagSegments && s.tagSegments.length > 0) {
        s.tagSegments.forEach(seg => {
          const dur = (seg.end || 0) - (seg.start || 0);
          if (dur > 0) {
            (seg.tags || []).forEach(tag => {
              tagTime[tag] = (tagTime[tag] || 0) + dur;
            });
          }
        });
      } else {
        (s.tags || []).forEach(tag => {
          tagTime[tag] = (tagTime[tag] || 0) + (s.duration || 0);
        });
      }
    });

    const sorted = Object.entries(tagTime).sort((a, b) => b[1] - a[1]);
    const maxTime = sorted.length > 0 ? sorted[0][1] : 1;

    if (sorted.length === 0) {
      this.elements.tagsChart.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏷</div>
          <p>Nenhuma tag registrada ainda</p>
        </div>`;
      return;
    }

    this.elements.tagsChart.innerHTML = sorted.map(([tag, time]) => {
      const pct = (time / maxTime) * 100;
      return `
        <div class="tag-chart-row">
          <span class="tag-chart-name editable" data-tag="${this.escapeHtml(tag)}" title="Clique para renomear">${this.escapeHtml(tag)}</span>
          <div class="tag-chart-bar-wrapper">
            <div class="tag-chart-bar" style="width: ${pct}%"></div>
          </div>
          <span class="tag-chart-time">${this.formatDuration(time)}</span>
        </div>`;
    }).join('');

    this.elements.tagsChart.querySelectorAll('.tag-chart-name.editable').forEach(el => {
      el.addEventListener('click', () => this.handleRenameTag(el.dataset.tag, el));
    });
  },

  renderFocusHistory(sessions) {
    if (sessions.length === 0) {
      this.elements.historyFocusList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <p>Nenhuma sessão de foco registrada</p>
        </div>`;
      return;
    }

    this.elements.historyFocusList.innerHTML = sessions.map(s => this.renderHistoryItem(s)).join('');
  },

  renderBreakHistory(sessions) {
    if (sessions.length === 0) {
      this.elements.historyBreakList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">☕</div>
          <p>Nenhuma sessão de descanso registrada</p>
        </div>`;
      return;
    }

    this.elements.historyBreakList.innerHTML = sessions.map(s => this.renderHistoryItem(s)).join('');
  },

  renderHistoryItem(s) {
    const date = new Date(s.completedAt);
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const typeLabel = s.type === 'focus' ? 'Foco' :
                      s.type === 'shortBreak' ? 'Pausa Curta' : 'Pausa Longa';
    const tagsHtml = (s.tags || []).map(t =>
      `<span class="history-tag">${this.escapeHtml(t)}</span>`
    ).join('');

    return `
      <div class="history-item">
        <div class="history-type ${s.type}"></div>
        <div class="history-info">
          <div class="history-duration">${typeLabel} - ${this.formatDuration(s.duration)}</div>
          <div class="history-date">${dateStr} ${timeStr}</div>
        </div>
        <div class="history-tags">${tagsHtml}</div>
        <button class="history-edit-btn" data-id="${s.id}" data-duration="${s.duration}" data-tags='${JSON.stringify(s.tags || [])}' data-segments='${JSON.stringify(s.tagSegments || [])}' title="Editar">✏</button>
      </div>`;
  },

  attachEditListeners() {
    document.querySelectorAll('.history-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openEditModal(
          btn.dataset.id,
          parseInt(btn.dataset.duration),
          JSON.parse(btn.dataset.tags || '[]'),
          JSON.parse(btn.dataset.segments || '[]')
        );
      });
    });
  },

  openEditModal(sessionId, duration, tags, tagSegments) {
    this.editingSessionId = sessionId;
    this.editSessionTags = [...tags];
    this.editTagSegments = (tagSegments || []).map(s => ({
      tags: [...(s.tags || [])],
      duration: Math.round(((s.end || 0) - (s.start || 0)) / 60)
    }));

    const durationMin = Math.floor(duration / 60);
    this.elements.editDuration.value = durationMin || 1;

    if (this.editTagSegments.length > 0) {
      this.elements.editSegmentsField.style.display = '';
      this.renderEditSegments();
    } else {
      this.elements.editSegmentsField.style.display = 'none';
    }

    this.renderEditTags();
    this.elements.editModal.style.display = 'flex';
    this.elements.editDuration.focus();
  },

  closeEditModal() {
    this.elements.editModal.style.display = 'none';
    this.editingSessionId = null;
    this.editSessionTags = [];
    this.editTagSegments = [];
  },

  renderEditTags() {
    this.elements.editSessionTags.innerHTML = this.editSessionTags.map(tag =>
      `<span class="tag-item">
        ${this.escapeHtml(tag)}
        <span class="tag-remove" data-tag="${this.escapeHtml(tag)}">&times;</span>
      </span>`
    ).join('');

    this.elements.editSessionTags.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editSessionTags = this.editSessionTags.filter(t => t !== btn.dataset.tag);
        this.renderEditTags();
      });
    });
  },

  renderEditSegments() {
    this.elements.editSegmentsList.innerHTML = this.editTagSegments.map((seg, i) => {
      const tagsHtml = seg.tags.map(t =>
        `<span class="edit-segment-tag">${this.escapeHtml(t)}<span class="edit-segment-tag-remove" data-seg="${i}" data-tag="${this.escapeHtml(t)}">&times;</span></span>`
      ).join('');
      return `
        <div class="edit-segment-row" data-seg="${i}">
          <div class="edit-segment-tags">
            ${tagsHtml}
            <input type="text" class="edit-segment-tag-input" placeholder="tag..." data-seg="${i}" autocomplete="off">
          </div>
          <input type="number" class="edit-segment-duration" value="${seg.duration}" min="0" max="999" data-seg="${i}" title="Duração (min)">
          <span class="edit-segment-unit">min</span>
          <button class="edit-segment-remove" data-seg="${i}" title="Remover intervalo">&times;</button>
        </div>`;
    }).join('');

    this.elements.editSegmentsList.querySelectorAll('.edit-segment-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editTagSegments.splice(parseInt(btn.dataset.seg), 1);
        this.renderEditSegments();
      });
    });

    this.elements.editSegmentsList.querySelectorAll('.edit-segment-duration').forEach(input => {
      input.addEventListener('change', (e) => {
        const i = parseInt(e.target.dataset.seg);
        this.editTagSegments[i].duration = parseInt(e.target.value) || 0;
      });
    });

    this.elements.editSegmentsList.querySelectorAll('.edit-segment-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.seg);
        this.editTagSegments[i].tags = this.editTagSegments[i].tags.filter(t => t !== btn.dataset.tag);
        this.renderEditSegments();
      });
    });

    this.elements.editSegmentsList.querySelectorAll('.edit-segment-tag-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const i = parseInt(input.dataset.seg);
          const val = input.value.trim().toLowerCase();
          if (val && !this.editTagSegments[i].tags.includes(val)) {
            this.editTagSegments[i].tags.push(val);
            this.renderEditSegments();
          }
        }
      });
    });
  },

  handleRenameTag(oldTag, element) {
    const currentName = element.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-chart-name-input';
    input.value = currentName;
    input.style.width = Math.max(60, currentName.length * 10) + 'px';

    element.replaceWith(input);
    input.focus();
    input.select();

    const finish = async () => {
      const newTag = input.value.trim().toLowerCase();
      if (newTag && newTag !== oldTag) {
        const confirmed = confirm(`Renomear '${oldTag}' para '${newTag}' em todas as sessões?`);
        if (confirmed) {
          await Storage.renameTag(oldTag, newTag);
          Tags.loadAllTags();
        }
      }
      this.load().then(() => this.attachEditListeners());
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = currentName; input.blur(); }
    });
    input.addEventListener('blur', finish);
  },

  async onEditTagInput() {
    const value = this.elements.editTagInput.value.trim().toLowerCase();
    if (!value) {
      this.elements.editTagsSuggestions.classList.remove('visible');
      return;
    }

    let allTagNames = [];
    try {
      const tagTime = await Storage.loadAllTags();
      allTagNames = Object.keys(tagTime);
    } catch (e) {}

    const filtered = allTagNames.filter(tag =>
      tag.toLowerCase().startsWith(value) &&
      !this.editSessionTags.includes(tag.toLowerCase())
    ).slice(0, 5);

    if (filtered.length === 0) {
      this.elements.editTagsSuggestions.classList.remove('visible');
      return;
    }

    this.elements.editTagsSuggestions.innerHTML = filtered.map(tag =>
      `<div class="suggestion-item">${this.escapeHtml(tag)}</div>`
    ).join('');

    this.elements.editTagsSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('mousedown', () => {
        const tag = item.textContent.trim().toLowerCase();
        if (!this.editSessionTags.includes(tag)) {
          this.editSessionTags.push(tag);
          this.renderEditTags();
        }
        this.elements.editTagInput.value = '';
        this.elements.editTagsSuggestions.classList.remove('visible');
      });
    });

    this.elements.editTagsSuggestions.classList.add('visible');
  },

  async saveEdit() {
    if (!this.editingSessionId) return;

    const pendingTag = this.elements.editTagInput.value.trim().toLowerCase();
    if (pendingTag && !this.editSessionTags.includes(pendingTag)) {
      this.editSessionTags.push(pendingTag);
      this.elements.editTagInput.value = '';
    }

    const newDurationMin = parseInt(this.elements.editDuration.value) || 1;
    const newDuration = newDurationMin * 60;
    const tagsToSend = [...this.editSessionTags];

    const updateData = {
      duration: newDuration,
      tags: tagsToSend
    };

    if (this.editTagSegments.length > 0) {
      let accumulated = 0;
      updateData.tagSegments = this.editTagSegments.map(seg => {
        const start = accumulated;
        accumulated += seg.duration * 60;
        return {
          tags: seg.tags,
          start: start,
          end: accumulated
        };
      });
    }

    const success = await Storage.updateSession(this.editingSessionId, updateData);

    if (success) {
      this.closeEditModal();
      await this.load();
      this.attachEditListeners();
    }
  },

  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Manual entry modal
  openManualModal() {
    this.manualTags = [];
    this.manualTagSegments = [];
    this.renderManualTags();
    this.elements.manualSegmentsField.style.display = 'none';

    const now = new Date();
    this.elements.manualDate.value = now.toISOString().split('T')[0];
    this.elements.manualTime.value = now.toTimeString().slice(0, 5);
    this.elements.manualDuration.value = 25;
    this.elements.manualTagInput.value = '';
    this.elements.manualTagsSuggestions.classList.remove('visible');

    document.querySelector('input[name="manualType"][value="focus"]').checked = true;

    this.elements.manualModal.style.display = 'flex';
  },

  closeManualModal() {
    this.elements.manualModal.style.display = 'none';
    this.manualTags = [];
    this.manualTagSegments = [];
  },

  async saveManualEntry() {
    const dateVal = this.elements.manualDate.value;
    const timeVal = this.elements.manualTime.value;
    const durationMin = parseInt(this.elements.manualDuration.value) || 1;
    const type = document.querySelector('input[name="manualType"]:checked').value;

    if (!dateVal) {
      alert('Selecione uma data.');
      return;
    }

    const pendingTag = this.elements.manualTagInput.value.trim().toLowerCase();
    if (pendingTag && !this.manualTags.includes(pendingTag)) {
      this.manualTags.push(pendingTag);
    }

    let completedAt;
    if (timeVal) {
      completedAt = new Date(`${dateVal}T${timeVal}:00`).toISOString();
    } else {
      completedAt = new Date(`${dateVal}T12:00:00`).toISOString();
    }

    const session = {
      type: type,
      duration: durationMin * 60,
      plannedDuration: durationMin * 60,
      completedAt: completedAt,
      tags: [...this.manualTags],
      manual: true
    };

    if (this.manualTagSegments.length > 0) {
      let accumulated = 0;
      session.tagSegments = this.manualTagSegments.map(seg => {
        const start = accumulated;
        accumulated += seg.duration * 60;
        return { tags: seg.tags, start, end: accumulated };
      });
      session.tags = [...new Set(this.manualTagSegments.flatMap(s => s.tags))];
    }

    const success = await Storage.saveSession(session);

    if (success) {
      this.closeManualModal();
      await this.load();
      this.attachEditListeners();
    }
  },

  renderManualTags() {
    this.elements.manualSessionTags.innerHTML = this.manualTags.map(tag =>
      `<span class="edit-tag">${this.escapeHtml(tag)} <span class="edit-tag-remove" data-tag="${this.escapeHtml(tag)}">&times;</span></span>`
    ).join('');

    this.elements.manualSessionTags.querySelectorAll('.edit-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.manualTags = this.manualTags.filter(t => t !== btn.dataset.tag);
        this.renderManualTags();
      });
    });
  },

  renderManualSegments() {
    this.elements.manualSegmentsList.innerHTML = this.manualTagSegments.map((seg, i) => {
      const tagsHtml = seg.tags.map(t =>
        `<span class="edit-segment-tag">${this.escapeHtml(t)}<span class="edit-segment-tag-remove" data-seg="${i}" data-tag="${this.escapeHtml(t)}">&times;</span></span>`
      ).join('');
      return `
        <div class="edit-segment-row" data-seg="${i}">
          <div class="edit-segment-tags">
            ${tagsHtml}
            <input type="text" class="edit-segment-tag-input" placeholder="tag..." data-seg="${i}" autocomplete="off">
          </div>
          <input type="number" class="edit-segment-duration" value="${seg.duration}" min="0" max="999" data-seg="${i}" title="Duração (min)">
          <span class="edit-segment-unit">min</span>
          <button class="edit-segment-remove" data-seg="${i}" title="Remover intervalo">&times;</button>
        </div>`;
    }).join('');

    this.elements.manualSegmentsList.querySelectorAll('.edit-segment-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.manualTagSegments.splice(parseInt(btn.dataset.seg), 1);
        if (this.manualTagSegments.length === 0) {
          this.elements.manualSegmentsField.style.display = 'none';
        }
        this.renderManualSegments();
      });
    });

    this.elements.manualSegmentsList.querySelectorAll('.edit-segment-duration').forEach(input => {
      input.addEventListener('change', (e) => {
        const i = parseInt(e.target.dataset.seg);
        this.manualTagSegments[i].duration = parseInt(e.target.value) || 0;
      });
    });

    this.elements.manualSegmentsList.querySelectorAll('.edit-segment-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.seg);
        this.manualTagSegments[i].tags = this.manualTagSegments[i].tags.filter(t => t !== btn.dataset.tag);
        this.renderManualSegments();
      });
    });

    this.elements.manualSegmentsList.querySelectorAll('.edit-segment-tag-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const i = parseInt(input.dataset.seg);
          const val = input.value.trim().toLowerCase();
          if (val && !this.manualTagSegments[i].tags.includes(val)) {
            this.manualTagSegments[i].tags.push(val);
            this.renderManualSegments();
          }
        }
      });
    });
  },

  async onManualTagInput() {
    const value = this.elements.manualTagInput.value.trim().toLowerCase();
    if (!value) {
      this.elements.manualTagsSuggestions.classList.remove('visible');
      return;
    }

    let allTagNames = [];
    try {
      const tagTime = await Storage.loadAllTags();
      allTagNames = Object.keys(tagTime);
    } catch (e) {}

    const filtered = allTagNames.filter(tag =>
      tag.toLowerCase().startsWith(value) &&
      !this.manualTags.includes(tag.toLowerCase())
    ).slice(0, 5);

    if (filtered.length === 0) {
      this.elements.manualTagsSuggestions.classList.remove('visible');
      return;
    }

    this.elements.manualTagsSuggestions.innerHTML = filtered.map(tag =>
      `<div class="suggestion-item">${this.escapeHtml(tag)}</div>`
    ).join('');

    this.elements.manualTagsSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('mousedown', () => {
        const tag = item.textContent.trim().toLowerCase();
        if (!this.manualTags.includes(tag)) {
          this.manualTags.push(tag);
          this.renderManualTags();
        }
        this.elements.manualTagInput.value = '';
        this.elements.manualTagsSuggestions.classList.remove('visible');
      });
    });

    this.elements.manualTagsSuggestions.classList.add('visible');
  }
};
