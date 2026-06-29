const Storage = {
  SETTINGS_DOC: 'app_settings',
  COLLECTION_SESSIONS: 'sessions',

  // SETTINGS
  async loadSettings() {
    try {
      const doc = await db.collection('settings').doc(this.SETTINGS_DOC).get();
      if (doc.exists) {
        return doc.data();
      }
      return this.defaultSettings();
    } catch (e) {
      console.warn('Erro ao carregar configurações, usando padrões:', e);
      return this.defaultSettings();
    }
  },

  async saveSettings(settings) {
    try {
      await db.collection('settings').doc(this.SETTINGS_DOC).set(settings);
      return true;
    } catch (e) {
      console.error('Erro ao salvar configurações:', e);
      return false;
    }
  },

  defaultSettings() {
    return {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
      autoTransition: true,
      soundEnabled: true,
      youtubeUrl: '',
      theme: 'dark'
    };
  },

  // SESSIONS
  async saveSession(session) {
    try {
      const dayKey = this.getDayKey(session.completedAt);
      await db.collection(this.COLLECTION_SESSIONS).add({
        ...session,
        dayKey: dayKey
      });
      return true;
    } catch (e) {
      console.error('Erro ao salvar sessão:', e);
      return false;
    }
  },

  async updateSession(sessionId, data) {
    try {
      await db.collection(this.COLLECTION_SESSIONS).doc(sessionId).update(data);
      return true;
    } catch (e) {
      console.error('Erro ao atualizar sessão:', e);
      return false;
    }
  },

  async deleteSession(sessionId) {
    try {
      await db.collection(this.COLLECTION_SESSIONS).doc(sessionId).delete();
      return true;
    } catch (e) {
      console.error('Erro ao deletar sessão:', e);
      return false;
    }
  },

  async loadSessions(period) {
    try {
      let query = db.collection(this.COLLECTION_SESSIONS).orderBy('completedAt', 'desc');
      const now = new Date();
      let startDate = null;

      if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (startDate) {
        query = query.where('completedAt', '>=', startDate.toISOString());
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error('Erro ao carregar sessões:', e);
      return [];
    }
  },

  async loadAllSessions() {
    try {
      const snapshot = await db.collection(this.COLLECTION_SESSIONS)
        .orderBy('completedAt', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error('Erro ao carregar todas as sessões:', e);
      return [];
    }
  },

  getDayKey(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // TAGS - collect from sessions
  async loadAllTags() {
    try {
      const snapshot = await db.collection(this.COLLECTION_SESSIONS).get();
      const tagTime = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.type === 'focus') {
          if (data.tagSegments && data.tagSegments.length > 0) {
            data.tagSegments.forEach(seg => {
              const dur = (seg.end || 0) - (seg.start || 0);
              if (dur > 0) {
                (seg.tags || []).forEach(tag => {
                  tagTime[tag] = (tagTime[tag] || 0) + dur;
                });
              }
            });
          } else if (data.tags) {
            data.tags.forEach(tag => {
              tagTime[tag] = (tagTime[tag] || 0) + (data.duration || 0);
            });
          }
        }
      });
      return tagTime;
    } catch (e) {
      console.error('Erro ao carregar tags:', e);
      return {};
    }
  }
};
