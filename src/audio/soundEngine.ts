/**
 * Web Audio API Sound & Spatial Synthesizer Engine
 * Features:
 * - Directional acoustic pings using StereoPannerNode
 * - Distance-scaled proximity beacon (tempo + pitch scaling)
 * - Sonar echolocation chirp with spatial reflections
 * - Wall collision thuds and continuous friction scrapes
 * - Hazard proximity dissonant alarm
 * - Sub-bass audio-haptic pulses for iOS Safari & desktop fallback
 * - SpeechSynthesis accessibility cues
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scrapeOsc: OscillatorNode | null = null;
  private scrapeGain: GainNode | null = null;
  private scrapeFilter: BiquadFilterNode | null = null;
  private hazardOsc: OscillatorNode | null = null;
  private hazardGain: GainNode | null = null;
  private lastScrapeTime = 0;
  private isMuted = false;
  private volume = 0.8;
  private isSpatialEnabled = true;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.setupContinuousNodes();
    } catch (e) {
      console.warn('Web Audio API not supported in this browser', e);
    }
  }

  private setupContinuousNodes() {
    if (!this.ctx || !this.masterGain) return;

    try {
      // Setup wall scrape generator (filtered pink noise / triangle oscillator)
      this.scrapeOsc = this.ctx.createOscillator();
      this.scrapeOsc.type = 'sawtooth';
      this.scrapeOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

      this.scrapeFilter = this.ctx.createBiquadFilter();
      this.scrapeFilter.type = 'bandpass';
      this.scrapeFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.scrapeFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.scrapeGain = this.ctx.createGain();
      this.scrapeGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.scrapeOsc.connect(this.scrapeFilter);
      this.scrapeFilter.connect(this.scrapeGain);
      this.scrapeGain.connect(this.masterGain);
      this.scrapeOsc.start();

      // Setup hazard warning drone
      this.hazardOsc = this.ctx.createOscillator();
      this.hazardOsc.type = 'triangle';
      this.hazardOsc.frequency.setValueAtTime(95, this.ctx.currentTime);

      this.hazardGain = this.ctx.createGain();
      this.hazardGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.hazardOsc.connect(this.hazardGain);
      this.hazardGain.connect(this.masterGain);
      this.hazardOsc.start();
    } catch (err) {
      console.warn('Could not setup continuous audio nodes', err);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public setSpatialAudio(enabled: boolean) {
    this.isSpatialEnabled = enabled;
  }

  /**
   * Helper to create StereoPannerNode with cross-browser compatibility
   */
  private createPanner(pan: number): StereoPannerNode | null {
    if (!this.ctx || !this.isSpatialEnabled) return null;
    try {
      if (typeof this.ctx.createStereoPanner === 'function') {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
        return panner;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  /**
   * Proximity Beacon Ping with Doppler Effect simulation:
   * Emits a directional spatial tone.
   * Distance normalized: 0 (right at exit) to 1 (far away).
   * Pan: -1 (far left) to +1 (far right).
   * radialVelocity: Normalized velocity component toward (+) or away from (-) exit beacon.
   *   Positive (>0) means moving toward the beacon (blue shift / pitch up).
   *   Negative (<0) means moving away from the beacon (red shift / pitch down).
   */
  public playBeaconPing(normalizedDist: number, pan: number, radialVelocity: number = 0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Closer distance = higher pitch and brighter harmonics
    // 0 = ~880Hz (A5), 1 = ~290Hz (D4)
    const baseFreq = 290 + (1 - normalizedDist) * 590;

    // Doppler Shift simulation:
    // Acoustic Doppler equation: f_observed = f_source * (v_sound / (v_sound - v_relative))
    // Clamping radialVelocity between -1.0 and 1.0 (where 1.0 is max sprint speed)
    // yielding a pitch shift of up to ~25% higher when rushing toward exit,
    // and up to ~20% lower pitch when moving rapidly away from it.
    const clampedRadialVel = Math.max(-1.0, Math.min(1.0, radialVelocity));
    const dopplerFactor = Math.max(0.75, Math.min(1.35, 1.0 + clampedRadialVel * 0.25));
    const shiftedFreq = baseFreq * dopplerFactor;

    osc.type = normalizedDist < 0.3 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(shiftedFreq, t);
    // Slight upward chirp characteristic of active sonar ping, keeping Doppler scaling
    osc.frequency.exponentialRampToValueAtTime(shiftedFreq * 1.22, t + 0.12);

    // Gain envelope: crisp ping (slightly louder punch when closing in rapidly)
    const velocityGainMod = clampedRadialVel > 0 ? 1 + clampedRadialVel * 0.15 : 1;
    const pingVol = 0.35 * (1 - normalizedDist * 0.4) * velocityGainMod;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(pingVol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    const panner = this.createPanner(pan);
    if (panner) {
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      osc.connect(gain);
      gain.connect(this.masterGain);
    }

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Echolocation / Sonar Ping:
   * A synthetic sonar chirp that scans surrounding geometry.
   */
  public playSonarPing(reflectionsCount: number, avgDistance: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    const t = this.ctx.currentTime;

    // 1. Initial chirp
    const chirpOsc = this.ctx.createOscillator();
    const chirpGain = this.ctx.createGain();
    chirpOsc.type = 'sine';
    chirpOsc.frequency.setValueAtTime(450, t);
    chirpOsc.frequency.exponentialRampToValueAtTime(1400, t + 0.09);

    chirpGain.gain.setValueAtTime(0.001, t);
    chirpGain.gain.linearRampToValueAtTime(0.4, t + 0.01);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    chirpOsc.connect(chirpGain);
    chirpGain.connect(this.masterGain);
    chirpOsc.start(t);
    chirpOsc.stop(t + 0.2);

    // 2. Echo reflections after tiny acoustic delay
    const echoDelay = Math.max(0.05, Math.min(0.25, avgDistance * 0.15));
    const echoOsc = this.ctx.createOscillator();
    const echoGain = this.ctx.createGain();
    const echoFilter = this.ctx.createBiquadFilter();

    echoOsc.type = 'sine';
    echoOsc.frequency.setValueAtTime(800 - Math.min(400, avgDistance * 80), t + echoDelay);
    echoFilter.type = 'lowpass';
    echoFilter.frequency.setValueAtTime(900, t + echoDelay);

    const echoVol = Math.max(0.05, Math.min(0.25, 0.3 - avgDistance * 0.04));
    echoGain.gain.setValueAtTime(0.001, t + echoDelay);
    echoGain.gain.linearRampToValueAtTime(echoVol, t + echoDelay + 0.02);
    echoGain.gain.exponentialRampToValueAtTime(0.0001, t + echoDelay + 0.25);

    echoOsc.connect(echoFilter);
    echoFilter.connect(echoGain);
    echoGain.connect(this.masterGain);
    echoOsc.start(t + echoDelay);
    echoOsc.stop(t + echoDelay + 0.28);
  }

  /**
   * Sharp Wall Collision Thud
   */
  public playWallHit(intensity: number, pan: number = 0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Low impactful wooden/metallic thud
    osc.type = 'sine';
    const startFreq = 160 + intensity * 60;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    const hitVol = Math.min(0.6, 0.15 + intensity * 0.4);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(hitVol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    const panner = this.createPanner(pan);
    if (panner) {
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      osc.connect(gain);
      gain.connect(this.masterGain);
    }

    osc.start(t);
    osc.stop(t + 0.14);

    // Audio-Haptic punch
    this.playAudioHapticThud(intensity);
  }

  /**
   * Continuous Wall Scrape:
   * When sliding or pressing hard against the wall.
   */
  public updateWallScrape(isPressing: boolean, intensity: number) {
    if (!this.ctx || !this.scrapeGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    if (isPressing && intensity > 0.05) {
      const targetGain = Math.min(0.28, intensity * 0.3);
      this.scrapeGain.gain.setTargetAtTime(targetGain, t, 0.03);
      if (this.scrapeFilter) {
        this.scrapeFilter.frequency.setTargetAtTime(300 + intensity * 600, t, 0.05);
      }
      this.lastScrapeTime = Date.now();
    } else {
      this.scrapeGain.gain.setTargetAtTime(0, t, 0.06);
    }
  }

  /**
   * Hazard Warning Tone:
   * Distorted low-frequency alarm when approaching spikes / void pits.
   */
  public updateHazardWarning(normalizedDist: number, pan: number = 0) {
    if (!this.ctx || !this.hazardGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    if (normalizedDist < 0.4) {
      // 0 = touching, 0.4 = edge of warning radius
      const threatFactor = 1 - normalizedDist / 0.4;
      const targetGain = Math.min(0.35, threatFactor * 0.35);
      this.hazardGain.gain.setTargetAtTime(targetGain, t, 0.08);

      if (this.hazardOsc) {
        const pulse = 85 + Math.sin(t * 14) * 25;
        this.hazardOsc.frequency.setTargetAtTime(pulse, t, 0.02);
      }
    } else {
      this.hazardGain.gain.setTargetAtTime(0, t, 0.1);
    }
  }

  /**
   * Audio-Haptic Sub-bass pulse:
   * Produces a 42Hz tactile punch for devices lacking physical vibration motors (like iOS Safari).
   */
  public playAudioHapticThud(strength = 1) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(52, t);
      subOsc.frequency.exponentialRampToValueAtTime(32, t + 0.06);

      const vol = Math.min(0.8, 0.3 * strength);
      subGain.gain.setValueAtTime(0.001, t);
      subGain.gain.linearRampToValueAtTime(vol, t + 0.006);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      subOsc.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(t);
      subOsc.stop(t + 0.08);
    } catch {
      // Ignore
    }
  }

  /**
   * Tactile Audio Click & Beep Fallback for iOS Safari:
   * Synthesizes sharp, subtle micro-clicks/beeps audible on iPhone speakers
   * to replace physical haptic pulses.
   */
  public playTactileClick(type: 'sharp' | 'graze' | 'stutter' | 'beacon' = 'sharp', force = 0.5) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';

      if (type === 'sharp') {
        // Crisp physical snap / tick
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1600, t);
        osc.frequency.exponentialRampToValueAtTime(350, t + 0.012);
        filter.frequency.setValueAtTime(1400, t);
        filter.Q.setValueAtTime(2.5, t);

        const vol = Math.min(0.45, 0.18 + force * 0.22);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.018);
      } else if (type === 'graze') {
        // Subtle soft tap
        osc.type = 'sine';
        osc.frequency.setValueAtTime(980, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.01);
        filter.frequency.setValueAtTime(900, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.015);
      } else if (type === 'beacon') {
        // High soft beep tick
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.018);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.022);
      }
    } catch {
      // Safe fallback
    }
  }

  /**
   * Continuous Stutter Click Texture for iOS Safari (when pressing hard on walls)
   */
  public playTactileStutter() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    try {
      const t = this.ctx.currentTime;
      // Pair of rapid micro-clicks 18ms apart
      [0, 0.022].forEach((offset, idx) => {
        const clickOsc = this.ctx!.createOscillator();
        const clickGain = this.ctx!.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(idx === 0 ? 1450 : 950, t + offset);
        clickOsc.frequency.exponentialRampToValueAtTime(300, t + offset + 0.008);

        clickGain.gain.setValueAtTime(0.001, t + offset);
        clickGain.gain.linearRampToValueAtTime(0.2, t + offset + 0.001);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.01);

        clickOsc.connect(clickGain);
        clickGain.connect(this.masterGain!);
        clickOsc.start(t + offset);
        clickOsc.stop(t + offset + 0.012);
      });
    } catch {
      // Safe fallback
    }
  }

  /**
   * Distinct Win Pulse:
   * Explosive, celebratory multi-stage audio shockwave when goal is cleared.
   */
  public playWinPulse() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    try {
      const t = this.ctx.currentTime;

      // 1. Triumphant resonant major chords (C5 -> E5 -> G5 -> C6)
      const chordNotes = [523.25, 659.25, 783.99, 1046.5];
      chordNotes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, t + idx * 0.06 + 0.4);

        gain.gain.setValueAtTime(0.001, t + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.35, t + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.06 + 0.85);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 0.9);
      });

      // 2. High sparkle chime
      const sparkleOsc = this.ctx.createOscillator();
      const sparkleGain = this.ctx.createGain();
      sparkleOsc.type = 'sine';
      sparkleOsc.frequency.setValueAtTime(1567.98, t + 0.2); // G6
      sparkleOsc.frequency.exponentialRampToValueAtTime(2093.0, t + 0.6); // C7
      sparkleGain.gain.setValueAtTime(0.001, t + 0.2);
      sparkleGain.gain.linearRampToValueAtTime(0.3, t + 0.24);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(this.masterGain);
      sparkleOsc.start(t + 0.2);
      sparkleOsc.stop(t + 0.72);

      // 3. Warm celebratory bass pulse
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(130.81, t); // C3
      bassOsc.frequency.exponentialRampToValueAtTime(65.41, t + 0.4); // C2
      bassGain.gain.setValueAtTime(0.001, t);
      bassGain.gain.linearRampToValueAtTime(0.4, t + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain);
      bassOsc.start(t);
      bassOsc.stop(t + 0.75);
    } catch {
      // Safe fallback
    }
  }

  /**
   * Victory Chime:
   * Harmonic celebration fanfare on escaping.
   */
  public playVictoryFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.09;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.28, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.65);
    });
  }

  /**
   * Hazard Hit / Fall Sound
   */
  public playHazardHit() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /**
   * Voice announcement using Web Speech API
   */
  public speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15;
      utterance.pitch = 1.0;
      utterance.volume = this.volume;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis error
    }
  }

  public stopAll() {
    if (this.scrapeGain && this.ctx) {
      this.scrapeGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    if (this.hazardGain && this.ctx) {
      this.hazardGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }
}

export const soundEngine = new SoundEngine();
