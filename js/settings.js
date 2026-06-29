const Settings = {
  current: null,

  init() {
    this.elements = {
      focus: document.getElementById('settingFocus'),
      shortBreak: document.getElementById('settingShortBreak'),
      longBreak: document.getElementById('settingLongBreak'),
      sessionsBeforeLong: document.getElementById('settingSessionsBeforeLong'),
      soundEnabled: document.getElementById('settingSoundEnabled'),
      youTubeUrl: document.getElementById('settingYouTubeUrl'),
      saveBtn: document.getElementById('btnSaveSettings')
    };

    this.elements.saveBtn.addEventListener('click', () => this.save());
  },

  async load() {
    this.current = await Storage.loadSettings();
    this.populateForm();
    return this.current;
  },

  populateForm() {
    if (!this.current) return;
    this.elements.focus.value = this.current.focusDuration;
    this.elements.shortBreak.value = this.current.shortBreakDuration;
    this.elements.longBreak.value = this.current.longBreakDuration;
    this.elements.sessionsBeforeLong.value = this.current.sessionsBeforeLongBreak;
    this.elements.soundEnabled.checked = this.current.soundEnabled;
    this.elements.youTubeUrl.value = this.current.youtubeUrl || '';
  },

  async save() {
    this.current = {
      focusDuration: parseInt(this.elements.focus.value) || 25,
      shortBreakDuration: parseInt(this.elements.shortBreak.value) || 5,
      longBreakDuration: parseInt(this.elements.longBreak.value) || 15,
      sessionsBeforeLongBreak: parseInt(this.elements.sessionsBeforeLong.value) || 4,
      autoTransition: Settings.current ? Settings.current.autoTransition : true,
      soundEnabled: this.elements.soundEnabled.checked,
      youtubeUrl: this.elements.youTubeUrl.value.trim(),
      theme: Theme.currentTheme
    };

    const success = await Storage.saveSettings(this.current);

    if (success) {
      Timer.configure(this.current);
      Theme.apply(this.current.theme);

      this.elements.saveBtn.textContent = '✓ Salvo!';
      this.elements.saveBtn.classList.add('saved');
      setTimeout(() => {
        this.elements.saveBtn.textContent = 'Salvar Configurações';
        this.elements.saveBtn.classList.remove('saved');
      }, 2000);
    }
  },

  updateSetting(key, value) {
    if (!this.current) return;
    this.current[key] = value;
    Storage.saveSettings(this.current);
  }
};
