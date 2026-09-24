/**
 * Device Motion & Orientation Controller
 * Handles:
 * - DeviceOrientationEvent listener & iOS 13+ permission request
 * - Calibration offsets to establish zero-velocity at natural holding angle
 * - Tilt to normalized vector force calculation
 * - Fallbacks: Keyboard (WASD/Arrows), Touch Virtual Joystick, and Manual Simulation Sliders
 */

import { OrientationData } from '../types';

export interface MotionConfig {
  sensitivity: number; // 0.5 to 2.5
  invertPitch: boolean;
  invertRoll: boolean;
  deadzone: number; // degrees, e.g. 2.5
}

class MotionEngine {
  private data: OrientationData = {
    supported: false,
    permissionGranted: false,
    needsPermission: false,
    rawGamma: 0,
    rawBeta: 0,
    calibratedGamma: 0,
    calibratedBeta: 0,
    offsetGamma: 0,
    offsetBeta: 40, // typical resting tilt angle ~40 deg
    tiltX: 0,
    tiltY: 0,
    source: 'keyboard',
  };

  private listeners: Set<(data: OrientationData) => void> = new Set();
  private keysPressed: Record<string, boolean> = {};
  private simulatedTilt: { x: number; y: number } | null = null;
  private touchVector: { x: number; y: number } | null = null;
  private config: MotionConfig = {
    sensitivity: 1.0,
    invertPitch: false,
    invertRoll: false,
    deadzone: 2.0,
  };

  constructor() {
    this.checkPlatformSupport();
    this.bindKeyboard();
  }

  public checkPlatformSupport() {
    if (typeof window === 'undefined') return;

    const hasOrientation = 'DeviceOrientationEvent' in window;
    this.data.supported = hasOrientation;

    // Check iOS 13+ permission requirement
    const devOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (devOrientation && typeof devOrientation.requestPermission === 'function') {
      this.data.needsPermission = true;
      this.data.permissionGranted = false;
    } else if (hasOrientation) {
      this.data.needsPermission = false;
      this.data.permissionGranted = true;
      this.startListening();
    }
  }

  /**
   * Must be called inside a user gesture (button click / tap) on iOS
   */
  public async requestPermission(): Promise<boolean> {
    const devOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (devOrientation && typeof devOrientation.requestPermission === 'function') {
      try {
        const response = await devOrientation.requestPermission();
        if (response === 'granted') {
          this.data.permissionGranted = true;
          this.startListening();
          return true;
        } else {
          this.data.permissionGranted = false;
          return false;
        }
      } catch (err) {
        console.error('Error requesting orientation permission', err);
        return false;
      }
    } else {
      this.data.permissionGranted = true;
      this.startListening();
      return true;
    }
  }

  private handleOrientation = (e: DeviceOrientationEvent) => {
    if (e.gamma === null && e.beta === null) return;

    this.data.rawGamma = e.gamma ?? 0;
    this.data.rawBeta = e.beta ?? 0;
    this.data.source = 'sensor';

    this.calculateForces();
    this.notify();
  };

  public startListening() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('deviceorientation', this.handleOrientation);
    window.addEventListener('deviceorientation', this.handleOrientation, { passive: true });
  }

  public stopListening() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('deviceorientation', this.handleOrientation);
  }

  /**
   * Record current tilt angles as the neutral 0,0 rest position
   */
  public calibrate(customBeta?: number, customGamma?: number) {
    if (customBeta !== undefined && customGamma !== undefined) {
      this.data.offsetBeta = customBeta;
      this.data.offsetGamma = customGamma;
    } else {
      this.data.offsetBeta = this.data.rawBeta;
      this.data.offsetGamma = this.data.rawGamma;
    }
    this.calculateForces();
    this.notify();
  }

  public setConfig(config: Partial<MotionConfig>) {
    this.config = { ...this.config, ...config };
    this.calculateForces();
  }

  /**
   * Set simulated tilt from on-screen tester sliders or virtual controls
   */
  public setSimulatedTilt(x: number | null, y: number | null) {
    if (x === null || y === null) {
      this.simulatedTilt = null;
    } else {
      this.simulatedTilt = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
      this.data.source = 'simulation';
    }
    this.calculateForces();
    this.notify();
  }

  /**
   * Set touch/virtual joystick vector
   */
  public setTouchVector(x: number | null, y: number | null) {
    if (x === null || y === null) {
      this.touchVector = null;
    } else {
      this.touchVector = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
      this.data.source = 'touch';
    }
    this.calculateForces();
    this.notify();
  }

  private calculateForces() {
    // Priority 1: Simulated tilt / tester slider if active
    if (this.simulatedTilt) {
      this.data.tiltX = this.simulatedTilt.x;
      this.data.tiltY = this.simulatedTilt.y;
      return;
    }

    // Priority 2: Touch vector if active
    if (this.touchVector) {
      this.data.tiltX = this.touchVector.x;
      this.data.tiltY = this.touchVector.y;
      return;
    }

    // Priority 3: Keyboard controls if any active key
    const hasKeys = this.hasActiveKeyboard();
    if (hasKeys) {
      let kx = 0;
      let ky = 0;
      if (this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA']) kx -= 1;
      if (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD']) kx += 1;
      if (this.keysPressed['ArrowUp'] || this.keysPressed['KeyW']) ky -= 1;
      if (this.keysPressed['ArrowDown'] || this.keysPressed['KeyS']) ky += 1;

      // Normalize diagonal
      const len = Math.hypot(kx, ky);
      if (len > 0) {
        kx /= len;
        ky /= len;
      }
      this.data.tiltX = kx;
      this.data.tiltY = ky;
      this.data.source = 'keyboard';
      return;
    }

    // Priority 4: Device Orientation Sensors
    let diffGamma = this.data.rawGamma - this.data.offsetGamma;
    let diffBeta = this.data.rawBeta - this.data.offsetBeta;

    // Apply dead-zone
    const dz = this.config.deadzone;
    if (Math.abs(diffGamma) < dz) diffGamma = 0;
    else diffGamma -= Math.sign(diffGamma) * dz;

    if (Math.abs(diffBeta) < dz) diffBeta = 0;
    else diffBeta -= Math.sign(diffBeta) * dz;

    this.data.calibratedGamma = diffGamma;
    this.data.calibratedBeta = diffBeta;

    // Map tilt angles to normalized -1 to 1 force.
    // 25 degrees tilt corresponds to full force at 1.0 sensitivity.
    const maxTilt = 25 / Math.max(0.1, this.config.sensitivity);

    let fx = diffGamma / maxTilt;
    let fy = diffBeta / maxTilt;

    if (this.config.invertRoll) fx = -fx;
    if (this.config.invertPitch) fy = -fy;

    // Clamp
    this.data.tiltX = Math.max(-1, Math.min(1, fx));
    this.data.tiltY = Math.max(-1, Math.min(1, fy));
    this.data.source = 'sensor';
  }

  private bindKeyboard() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      // Don't capture when typing into inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code)) {
        this.keysPressed[e.code] = true;
        this.calculateForces();
        this.notify();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keysPressed[e.code]) {
        delete this.keysPressed[e.code];
        this.calculateForces();
        this.notify();
      }
    });

    window.addEventListener('blur', () => {
      this.keysPressed = {};
      this.calculateForces();
      this.notify();
    });
  }

  private hasActiveKeyboard(): boolean {
    return Object.values(this.keysPressed).some(Boolean);
  }

  public subscribe(cb: (data: OrientationData) => void): () => void {
    this.listeners.add(cb);
    cb({ ...this.data });
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const copy = { ...this.data };
    this.listeners.forEach((cb) => cb(copy));
  }

  public getData(): OrientationData {
    return { ...this.data };
  }
}

export const motionEngine = new MotionEngine();
