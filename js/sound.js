/**
 * Agende-me — Sound Alert Manager (Web Audio API)
 * Gera sinal sonoro cristalino e profissional (chime harmônico de 4 notas de sino)
 * para alertar a manicure instantaneamente sobre novos agendamentos sem depender de arquivos externos.
 */

class SoundAlertManager {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.unlocked = false;
  }

  init() {
    // Recuperar preferência salva
    const saved = localStorage.getItem('agendeme_sound_enabled');
    if (saved !== null) {
      this.soundEnabled = (saved === 'true');
    }

    // Ouvir primeira interação do usuário para desbloquear o AudioContext no navegador
    const unlock = () => {
      this.getAudioContext();
      this.unlocked = true;
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);

    this.updateToggleButtonUI();
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('agendeme_sound_enabled', String(this.soundEnabled));
    this.updateToggleButtonUI();

    if (this.soundEnabled) {
      this.playChime();
      if (window.app) window.app.showToast('Alerta sonoro ativado!', 'success');
    } else {
      if (window.app) window.app.showToast('Alerta sonoro silenciado.', 'info');
    }
    return this.soundEnabled;
  }

  updateToggleButtonUI() {
    const btn = document.getElementById('btnSoundToggle');
    if (btn) {
      btn.innerHTML = this.soundEnabled 
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg><span>Som Ativo</span>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg><span>Silenciado</span>`;
      btn.classList.toggle('muted', !this.soundEnabled);
    }

    const chkSettings = document.getElementById('settingSoundAlerts');
    if (chkSettings) {
      chkSettings.checked = this.soundEnabled;
    }
  }

  // Toca o acorde de notificação agradável (4 notas de sino: Dó, Mi, Sol, Dó oitava)
  playChime() {
    if (!this.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Notas harmônicas de sino: C5, E5, G5, C6
      const notes = [
        { freq: 523.25, time: 0.00, duration: 0.40, peakGain: 0.18 },
        { freq: 659.25, time: 0.09, duration: 0.45, peakGain: 0.20 },
        { freq: 783.99, time: 0.18, duration: 0.50, peakGain: 0.22 },
        { freq: 1046.50, time: 0.28, duration: 0.85, peakGain: 0.28 }
      ];

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        // Ataque suave e decaimento acústico natural
        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.exponentialRampToValueAtTime(n.peakGain, now + n.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.duration);
      });
    } catch (e) {
      console.warn('Não foi possível reproduzir alerta sonoro:', e);
    }
  }
}

window.soundAlertManager = new SoundAlertManager();
