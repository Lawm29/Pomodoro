const Stats = {
  currentPeriod: 'today',
  editingSessionId: null,
  editSessionTags: [],
  editTagSegments: [],

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
      btnAddSegment: document.getElementById('btnAddSegment')
    };

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPeriod = btn.dataset.period;
        this.load();
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
  },

  async load() {
    let sessions;
    if (this.currentPeriod === 'all') {
      sessions = await Storage.loadAllSessions();
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
          <span class="tag-chart-name">${this.escapeHtml(tag)}</span>
          <div class="tag-chart-bar-wrapper">
            <div class="tag-chart-bar" style="width: ${pct}%"></div>
          </div>
          <span class="tag-chart-time">${this.formatDuration(time)}</span>
        </div>`;
    }).join('');
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
  }
};
