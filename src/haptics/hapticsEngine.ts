/**
 * Haptic Feedback Controller
 * Implements Web Vibration API (navigator.vibrate) patterns
 * specified in ShadowBlind requirements:
 * - Grazing wall: Single sharp pulse [30]
 * - Hard pressing against wall: Continuous low-frequency stutter [15, 30]
 * - Proximity Beacon (Hot/Cold): Manhattan distance scaled pulse interval
 * - Exit Reached: Victory rhythm [100, 50, 100, 50, 300]
 * - Hazard alert: [40, 30, 40]
 * - Fallback audio-haptics & screen shake dispatch for iOS Safari and desktop
 */

import { soundEngine } from '../audio/soundEngine';

type HapticStrength = 'soft' | 'medium' | 'strong';

class HapticsEngine {
  private isEnabled = true;
  private strength: HapticStrength = 'medium';
  private hasVibration = false;
  private audioHapticsFallback = true;
  private lastWallPulseTime = 0;
  private isStuttering = false;
  private stutterIntervalId: number | null = null;
  private screenShakeCallback: ((intensity: number) => void) | null = null;

  constructor() {
    this.checkSupport();
  }

  private checkSupport() {
    this.hasVibration = typeof window !== 'undefined' && 'navigator' in window && typeof window.navigator.vibrate === 'function';
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopWallStutter();
      this.cancel();
    }
  }

  public setStrength(strength: HapticStrength) {
    this.strength = strength;
  }

  public setAudioFallback(enabled: boolean) {
    this.audioHapticsFallback = enabled;
  }

  public onScreenShake(cb: (intensity: number) => void) {
    this.screenShakeCallback = cb;
  }

  public isSupported(): boolean {
    return this.hasVibration;
  }

  private scale(ms: number): number {
    const factor = this.strength === 'soft' ? 0.65 : this.strength === 'strong' ? 1.4 : 1.0;
    return Math.max(8, Math.round(ms * factor));
  }

  private scalePattern(pattern: number[]): number[] {
    return pattern.map((val, idx) => (idx % 2 === 0 ? this.scale(val) : val));
  }

  private triggerVibrate(pattern: number | number[], triggerShake = false, shakeIntensity = 0.5) {
    if (!this.isEnabled) return;

    if (triggerShake && this.screenShakeCallback) {
      this.screenShakeCallback(shakeIntensity);
    }

    if (this.hasVibration) {
      try {
        const scaled = Array.isArray(pattern) ? this.scalePattern(pattern) : this.scale(pattern);
        navigator.vibrate(scaled);
      } catch {
        // Safe catch
      }
    } else if (this.audioHapticsFallback) {
      // Audio-haptic fallback for iOS / desktop:
      // Subtle synthesized tactile click + sub-bass
      soundEngine.playTactileClick('sharp', shakeIntensity);
      soundEngine.playAudioHapticThud(shakeIntensity);
    }
  }

  /**
   * Wall Collision: Single sharp pulse [30] when grazing walls
   */
  public wallGraze() {
    const now = Date.now();
    // Debounce sharp pulse so it doesn't trigger 60 times a second
    if (now - this.lastWallPulseTime < 140) return;
    this.lastWallPulseTime = now;

    if (!this.hasVibration && this.audioHapticsFallback) {
      soundEngine.playTactileClick('graze', 0.4);
    }
    this.triggerVibrate([30], true, 0.4);
  }

  /**
   * Continuous low-frequency stutter [15, 30] when pressing hard against a wall
   */
  public startWallStutter() {
    if (!this.isEnabled || this.isStuttering) return;
    this.isStuttering = true;

    if (!this.hasVibration && this.audioHapticsFallback) {
      soundEngine.playTactileStutter();
    }
    // Trigger initial stutter pattern
    this.triggerVibrate([15, 30, 15, 30], true, 0.7);

    // Continue repeating stutter while pressed
    this.stutterIntervalId = window.setInterval(() => {
      if (this.isStuttering && this.isEnabled) {
        if (!this.hasVibration && this.audioHapticsFallback) {
          soundEngine.playTactileStutter();
        }
        this.triggerVibrate([15, 30], true, 0.6);
      }
    }, 110);
  }

  public stopWallStutter() {
    this.isStuttering = false;
    if (this.stutterIntervalId !== null) {
      clearInterval(this.stutterIntervalId);
      this.stutterIntervalId = null;
    }
  }

  /**
   * Proximity Beacon pulse (Hot/Cold)
   * Pulse scales based on distance to the exit
   */
  public beaconPulse(normalizedDistance: number) {
    if (!this.isEnabled) return;
    // Closer = slightly longer, more crisp tap
    const duration = Math.round(18 + (1 - normalizedDistance) * 16);
    if (!this.hasVibration && this.audioHapticsFallback) {
      soundEngine.playTactileClick('beacon', 1 - normalizedDistance);
    }
    this.triggerVibrate([duration], false, 0.25);
  }

  /**
   * Sonar Wave Released feedback
   */
  public sonarPulse() {
    if (!this.hasVibration && this.audioHapticsFallback) {
      soundEngine.playTactileClick('sharp', 0.6);
    }
    this.triggerVibrate([20, 25, 20], true, 0.35);
  }

  /**
   * Exit Reached: Success vibration rhythm [100, 50, 100, 50, 300]
   */
  public exitReached() {
    this.stopWallStutter();
    soundEngine.playWinPulse();
    this.triggerVibrate([100, 50, 100, 50, 300], true, 1.0);
  }

  /**
   * Hazard Hit Alarm [60, 30, 60, 30, 90]
   */
  public hazardAlert() {
    this.stopWallStutter();
    this.triggerVibrate([50, 40, 50, 40, 80], true, 0.9);
  }

  /**
   * Calibration feedback
   */
  public calibrated() {
    this.triggerVibrate([40, 40, 40], true, 0.5);
  }

  public cancel() {
    this.stopWallStutter();
    if (this.hasVibration) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }
}

export const hapticsEngine = new HapticsEngine();
