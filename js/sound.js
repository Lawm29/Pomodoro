const Sound = {
  player: null,
  isPlaying: false,
  videoId: null,
  ready: false,
  stopBtn: null,

  init() {
    this.stopBtn = document.getElementById('btnStopSound');
    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => this.stop());
    }

    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIFrameAPIReady = () => {
      this.ready = true;
      this.createPlayer();
    };
  },

  createPlayer() {
    if (this.player) return;

    this.player = new YT.Player('youtubePlayerContainer', {
      height: '1',
      width: '1',
      videoId: '',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        loop: 1,
        modestbranding: 1,
        playlist: '',
        rel: 0,
        showinfo: 0,
        start: 0
      },
      events: {
        onReady: () => {},
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.showStopBtn(true);
          } else if (e.data === YT.PlayerState.ENDED) {
            this.isPlaying = false;
            this.showStopBtn(false);
          } else if (e.data === YT.PlayerState.PAUSED) {
            this.isPlaying = false;
            this.showStopBtn(false);
          }
        }
      }
    });
  },

  extractVideoId(url) {
    if (!url) return null;
    url = url.trim();

    // Already just an ID (no slashes or dots)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    const patterns = [
      /(?:youtube\.com\/watch\?.*?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  },

  setVideo(url) {
    this.videoId = this.extractVideoId(url);
    if (this.player && this.videoId) {
      this.player.loadVideoById(this.videoId);
      this.player.setLoop(true);
    }
  },

  play(url) {
    if (url) {
      this.videoId = this.extractVideoId(url);
    }

    if (!this.ready || !this.player) {
      // Retry when API is ready
      const checkReady = setInterval(() => {
        if (this.ready && this.player) {
          clearInterval(checkReady);
          this._doPlay();
        }
      }, 200);
      setTimeout(() => clearInterval(checkReady), 5000);
      return;
    }

    this._doPlay();
  },

  _doPlay() {
    if (!this.videoId) {
      // Fallback to oscillator beep
      this.playBeep();
      return;
    }

    this.player.loadVideoById(this.videoId);
    this.player.setLoop(true);
  },

  stop() {
    if (this.player && this.isPlaying) {
      this.player.stopVideo();
    }
    this.isPlaying = false;
    this.showStopBtn(false);

    // Also stop any beep
    if (this.beepOsc) {
      try { this.beepOsc.stop(); } catch (e) {}
      this.beepOsc = null;
    }
  },

  showStopBtn(visible) {
    if (this.stopBtn) {
      this.stopBtn.style.display = visible ? 'inline-flex' : 'none';
    }
  },

  playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      this.beepOsc = osc;
      this.isPlaying = true;
      this.showStopBtn(true);

      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.stop(ctx.currentTime + 1);

      osc.onended = () => {
        this.isPlaying = false;
        this.showStopBtn(false);
        this.beepOsc = null;
      };
    } catch (e) {}
  }
};
