const App = {
  async init() {
    // Init modules
    Theme.init();
    Timer.init();
    Tags.init();
    Settings.init();
    Stats.init();
    Sound.init();

    // Navigation
    this.initNavigation();

    // Load settings from Firebase
    const settings = await Settings.load();
    Theme.apply(settings.theme || 'dark');
    Timer.configure(settings);

    // Start timer with focus mode
    Timer.start('focus');

    // Load stats
    Stats.load().then(() => Stats.attachEditListeners());
  },

  initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Switch views
        const viewId = `view-${btn.dataset.view}`;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');

        // Load stats when switching to stats view
        if (btn.dataset.view === 'stats') {
          Stats.load().then(() => Stats.attachEditListeners());
        }
      });
    });
  }
};

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
