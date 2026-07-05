const Tags = {
  currentTags: [],
  allTagNames: [],
  highlightedIndex: -1,
  selectingEndTags: false,
  selectedEndTags: [],

  elements: {},

  init() {
    this.elements = {
      input: document.getElementById('tagInput'),
      suggestions: document.getElementById('tagsSuggestions'),
      list: document.getElementById('currentTags')
    };

    this.elements.input.addEventListener('input', () => this.onInput());
    this.elements.input.addEventListener('keydown', (e) => this.onKeydown(e));
    this.elements.input.addEventListener('blur', () => {
      setTimeout(() => this.hideSuggestions(), 200);
    });
    this.elements.input.addEventListener('focus', () => {
      if (this.elements.input.value.trim()) {
        this.showSuggestions();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.selectingEndTags) {
        this.cancelEndTagSelection();
      }
    });

    this.loadAllTags();
  },

  async loadAllTags() {
    try {
      const tagTime = await Storage.loadAllTags();
      this.allTagNames = Object.keys(tagTime).sort();
    } catch (e) {
      this.allTagNames = [];
    }
  },

  onInput() {
    const value = this.elements.input.value.trim().toLowerCase();
    if (!value) {
      this.hideSuggestions();
      return;
    }
    this.highlightedIndex = -1;
    this.showSuggestions();
  },

  onKeydown(e) {
    const items = this.elements.suggestions.querySelectorAll('.suggestion-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, items.length - 1);
      this.updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
      this.updateHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.highlightedIndex >= 0 && items[this.highlightedIndex]) {
        this.selectTag(items[this.highlightedIndex].textContent);
      } else {
        this.addTag(this.elements.input.value.trim());
      }
    } else if (e.key === 'Escape') {
      this.hideSuggestions();
    }
  },

  updateHighlight(items) {
    items.forEach((item, i) => {
      item.classList.toggle('highlighted', i === this.highlightedIndex);
    });
  },

  showSuggestions() {
    const value = this.elements.input.value.trim().toLowerCase();
    if (!value) {
      this.hideSuggestions();
      return;
    }

    // First try prefix match, then fallback to includes
    let filtered = this.allTagNames.filter(tag =>
      tag.toLowerCase().startsWith(value) &&
      !this.currentTags.includes(tag.toLowerCase())
    );

    if (filtered.length === 0) {
      filtered = this.allTagNames.filter(tag =>
        tag.toLowerCase().includes(value) &&
        !this.currentTags.includes(tag.toLowerCase())
      );
    }

    filtered = filtered.slice(0, 5);

    if (filtered.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.elements.suggestions.innerHTML = filtered.map(tag =>
      `<div class="suggestion-item">${this.escapeHtml(tag)}</div>`
    ).join('');

    this.elements.suggestions.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('mousedown', () => {
        this.selectTag(item.textContent);
      });
    });

    this.elements.suggestions.classList.add('visible');
  },

  hideSuggestions() {
    this.elements.suggestions.classList.remove('visible');
    this.highlightedIndex = -1;
  },

  selectTag(tagName) {
    this.elements.input.value = '';
    this.hideSuggestions();
    this.addTag(tagName);
  },

  addTag(tagName) {
    const tag = tagName.trim().toLowerCase();
    if (!tag || this.currentTags.includes(tag)) {
      this.elements.input.value = '';
      return;
    }

    this.currentTags.push(tag);
    Timer.currentTags = [...this.currentTags];
    Timer.startTag(tag);
    this.renderTags();
    this.elements.input.value = '';
    this.elements.input.focus();

    if (!this.allTagNames.includes(tag)) {
      this.allTagNames.push(tag);
      this.allTagNames.sort();
    }
  },

  removeTag(tagName) {
    this.currentTags = this.currentTags.filter(t => t !== tagName);
    Timer.currentTags = [...this.currentTags];
    if (Timer.activeSegment) {
      Timer.activeSegment.tags = Timer.activeSegment.tags.filter(t => t !== tagName);
      if (Timer.activeSegment.tags.length === 0) {
        Timer.activeSegment = null;
      }
    }
    Timer.updateEndTagBtn();
    this.renderTags();
  },

  endTag() {
    if (!Timer.activeSegment) return;

    this.selectingEndTags = true;
    this.selectedEndTags = Timer.activeSegment.tags.slice();
    Timer.updateEndTagBtn();
    this.renderTags();
  },

  toggleEndTagSelection(tag) {
    if (!this.selectingEndTags) return;
    if (this.selectedEndTags.includes(tag)) {
      this.selectedEndTags = this.selectedEndTags.filter(t => t !== tag);
    } else {
      this.selectedEndTags.push(tag);
    }
    Timer.updateEndTagBtn();
    this.renderTags();
  },

  confirmEndTag() {
    if (!this.selectingEndTags) return;
    const tagsToKeep = Timer.activeSegment.tags.filter(
      t => !this.selectedEndTags.includes(t)
    );
    Timer.endCurrentTag(tagsToKeep);
    this.selectingEndTags = false;
    this.selectedEndTags = [];
    this.currentTags = Timer.currentTags.slice();
    Timer.updateEndTagBtn();
    this.renderTags();
  },

  cancelEndTagSelection() {
    this.selectingEndTags = false;
    this.selectedEndTags = [];
    Timer.updateEndTagBtn();
    this.renderTags();
  },

  clearTags() {
    this.currentTags = [];
    Timer.currentTags = [];
    Timer.activeSegment = null;
    Timer.tagSegments = [];
    Timer.updateEndTagBtn();
    this.renderTags();
  },

  renderTags() {
    const segmentsDone = Timer.tagSegments || [];
    const active = Timer.activeSegment;

    let html = '';

    segmentsDone.forEach(seg => {
      seg.tags.forEach(tag => {
        html += `<span class="tag-item completed">
          ${this.escapeHtml(tag)}
          <span class="tag-check">✓</span>
        </span>`;
      });
    });

    if (active) {
      active.tags.forEach(tag => {
        if (this.selectingEndTags) {
          const selected = this.selectedEndTags.includes(tag);
          html += `<span class="tag-item active selectable ${selected ? 'selected' : ''}" data-endtag="${this.escapeHtml(tag)}">
            ${this.escapeHtml(tag)}
            <span class="tag-select-icon">${selected ? '✓' : '○'}</span>
          </span>`;
        } else {
          html += `<span class="tag-item active">
            ${this.escapeHtml(tag)}
          </span>`;
        }
      });
    }

    this.currentTags.forEach(tag => {
      if ((!active || !active.tags.includes(tag)) &&
          !segmentsDone.some(s => s.tags.includes(tag))) {
        html += `<span class="tag-item">
          ${this.escapeHtml(tag)}
          <span class="tag-remove" data-tag="${this.escapeHtml(tag)}">&times;</span>
        </span>`;
      }
    });

    if (!html && this.currentTags.length > 0) {
      html = this.currentTags.map(tag =>
        `<span class="tag-item">
          ${this.escapeHtml(tag)}
          <span class="tag-remove" data-tag="${this.escapeHtml(tag)}">&times;</span>
        </span>`
      ).join('');
    }

    this.elements.list.innerHTML = html;

    this.elements.list.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.removeTag(btn.dataset.tag);
      });
    });

    this.elements.list.querySelectorAll('.tag-item.selectable').forEach(el => {
      el.addEventListener('click', () => {
        this.toggleEndTagSelection(el.dataset.endtag);
      });
    });
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
