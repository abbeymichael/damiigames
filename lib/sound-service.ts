"use client";

/**
 * Web Audio API Sound Service for DAMII Strategy Game
 * Provides zero-latency synthesized audio cues for moves, captures, king promotions,
 * multi-jumps, victory checkmates, and UI interactions with granular category controls.
 */

export interface SoundSettings {
  master: boolean;
  move: boolean;
  capture: boolean;
  win: boolean;
  ui: boolean;
  notification: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  master: true,
  move: true,
  capture: true,
  win: true,
  ui: true,
  notification: true,
};

class SoundService {
  private ctx: AudioContext | null = null;
  private settings: SoundSettings = { ...DEFAULT_SOUND_SETTINGS };

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedJson = localStorage.getItem("damii-sound-settings-v2");
        if (savedJson) {
          const parsed = JSON.parse(savedJson);
          this.settings = { ...DEFAULT_SOUND_SETTINGS, ...parsed };
        } else {
          const legacySaved = localStorage.getItem("damii-sound-enabled");
          if (legacySaved !== null) {
            this.settings.master = legacySaved === "true";
          }
        }
      } catch {
        this.settings = { ...DEFAULT_SOUND_SETTINGS };
      }
    }
  }

  public getSettings(): SoundSettings {
    return { ...this.settings };
  }

  public setSettings(newSettings: Partial<SoundSettings>): SoundSettings {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("damii-sound-settings-v2", JSON.stringify(this.settings));
        localStorage.setItem("damii-sound-enabled", this.settings.master ? "true" : "false");
      } catch {
        /* ignore */
      }
    }
    return this.getSettings();
  }

  public toggleCategory(category: keyof SoundSettings): SoundSettings {
    const updated = !this.settings[category];
    const newSettings = this.setSettings({ [category]: updated });
    if (category === "master" && updated) {
      this.playSelect();
    }
    return newSettings;
  }

  public isCategoryEnabled(category: keyof SoundSettings): boolean {
    if (!this.settings.master) return false;
    return !!this.settings[category];
  }

  public isEnabled(): boolean {
    return this.settings.master;
  }

  public setEnabled(enable: boolean) {
    this.setSettings({ master: enable });
  }

  public toggle(): boolean {
    const newSettings = this.toggleCategory("master");
    return newSettings.master;
  }

  private initCtx(): AudioContext | null {
    if (!this.settings.master) return null;
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Gentle click/tap when a player selects a piece or button
   */
  public playSelect() {
    if (!this.isCategoryEnabled("ui")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      /* ignore audio context restrictions */
    }
  }

  /**
   * Tactile wooden piece placement sound
   */
  public playMove() {
    if (!this.isCategoryEnabled("move")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Low woody body resonance
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.07);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);

      // Noise impact for timber contact
      const bufferSize = ctx.sampleRate * 0.025;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 1400;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
    } catch {
      /* ignore */
    }
  }

  /**
   * Crisp marble impact clack on piece capture
   */
  public playCapture() {
    if (!this.isCategoryEnabled("capture")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Primary pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);

      // Secondary transient echo
      setTimeout(() => {
        if (!this.ctx || !this.isCategoryEnabled("capture")) return;
        try {
          const t = this.ctx.currentTime;
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();

          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(1800, t);
          osc2.frequency.exponentialRampToValueAtTime(450, t + 0.05);

          gain2.gain.setValueAtTime(0.2, t);
          gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);

          osc2.start(t);
          osc2.stop(t + 0.05);
        } catch {
          /* ignore */
        }
      }, 35);
    } catch {
      /* ignore */
    }
  }

  /**
   * Rapid ascending double capture tone for compulsory multi-jumps
   */
  public playMultiJump() {
    if (!this.isCategoryEnabled("capture")) return;
    this.playCapture();
    setTimeout(() => {
      const ctx = this.initCtx();
      if (!ctx || !this.isCategoryEnabled("capture")) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(1750, now + 0.09);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
      } catch {
        /* ignore */
      }
    }, 110);
  }

  /**
   * Regal ascending 4-note chime when a piece reaches the back row and becomes a Flying King
   */
  public playKingPromotion() {
    if (!this.isCategoryEnabled("win")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      });
    } catch {
      /* ignore */
    }
  }

  /**
   * Triumphant fanfare sequence when checkmate / match victory is achieved
   */
  public playVictory() {
    if (!this.isCategoryEnabled("win")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const arpeggio = [
        { freq: 392.0, delay: 0 }, // G4
        { freq: 523.25, delay: 0.12 }, // C5
        { freq: 659.25, delay: 0.24 }, // E5
        { freq: 783.99, delay: 0.36 }, // G5
        { freq: 1046.5, delay: 0.52 }, // C6
      ];

      arpeggio.forEach(({ freq, delay }) => {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.55);
      });
    } catch {
      /* ignore */
    }
  }

  /**
   * Low warning buzz for compulsory capture reminders or turn warnings
   */
  public playWarning() {
    if (!this.isCategoryEnabled("ui")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      /* ignore */
    }
  }

  /**
   * Attention-grabbing 3-tone ascending alert when a 1-on-1 game challenge arrives
   */
  public playGameRequest() {
    if (!this.isCategoryEnabled("notification")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const triad = [
        { freq: 587.33, delay: 0, dur: 0.1 }, // D5
        { freq: 739.99, delay: 0.08, dur: 0.1 }, // F#5
        { freq: 880.0, delay: 0.16, dur: 0.12 }, // A5
        { freq: 1174.66, delay: 0.26, dur: 0.28 }, // D6
      ];

      triad.forEach(({ freq, delay, dur }) => {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + dur);
      });
    } catch {
      /* ignore */
    }
  }

  /**
   * Royal chime sequence when a tournament round or match time approaches
   */
  public playTournamentAlert() {
    if (!this.isCategoryEnabled("notification")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [
        { freq: 523.25, delay: 0 }, // C5
        { freq: 659.25, delay: 0.1 }, // E5
        { freq: 783.99, delay: 0.2 }, // G5
        { freq: 1046.5, delay: 0.32 }, // C6
      ];

      notes.forEach(({ freq, delay }) => {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
      });
    } catch {
      /* ignore */
    }
  }

  /**
   * Dual blip pulse when a player's turn is waiting or timer is running low
   */
  public playTurnReminder() {
    if (!this.isCategoryEnabled("notification")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const pulses = [
        { freq: 659.25, delay: 0 },
        { freq: 880.0, delay: 0.12 },
      ];

      pulses.forEach(({ freq, delay }) => {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
      });
    } catch {
      /* ignore */
    }
  }

  /**
   * Urgent clock countdown tick when player has less than 10 seconds remaining
   */
  public playUrgentTick(secondsRemaining: number = 5) {
    if (!this.isCategoryEnabled("ui")) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch increases from 800Hz at 9s up to 1400Hz at 1s for escalating urgency
      const baseFreq = Math.min(1400, 750 + (10 - Math.max(1, secondsRemaining)) * 65);

      osc.type = secondsRemaining <= 3 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.045);

      const volume = secondsRemaining <= 3 ? 0.22 : 0.14;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      /* ignore */
    }
  }

  /**
   * General notification chime dispatcher
   */
  public playNotification(type: string = "default") {
    if (!this.isCategoryEnabled("notification")) return;

    if (type === "game_request" || type === "challenge") {
      this.playGameRequest();
      return;
    }
    if (type === "tournament_match" || type === "tournament_alert" || type === "tournament") {
      this.playTournamentAlert();
      return;
    }
    if (type === "turn_reminder" || type === "turn") {
      this.playTurnReminder();
      return;
    }

    // Default clean glass ding
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1320, now);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch {
      /* ignore */
    }
  }
}

export const soundService = new SoundService();
