const Theme = {
  init() {
    this.toggleBtn = document.getElementById('themeToggle');
    this.toggleBtn.addEventListener('click', () => this.toggle());
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
  },

  toggle() {
    const next = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.apply(next);
    if (typeof Settings !== 'undefined') {
      Settings.updateSetting('theme', next);
    }
  },

  currentTheme: 'dark'
};
