export type CellType = 0 | 1 | 2 | 3 | 4;
// 0: Path, 1: Wall, 2: Exit, 3: Hazard (pitfall/trap), 4: Safe Checkpoint

export interface MazeLevel {
  id: string;
  name: string;
  subtitle: string;
  difficulty: 'Training' | 'Easy' | 'Medium' | 'Hard' | 'Master' | 'Procedural';
  grid: number[][]; // [row][col]
  start: { x: number; y: number }; // cell coordinate or continuous
  description: string;
  parTimeSeconds: number;
}

export interface PlayerPhysics {
  x: number; // continuous canvas/world coordinate
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isCollidingWall: boolean;
  wallForce: number; // 0 to 1 intensity of pressing into wall
  isTouchingHazard: boolean;
}

export interface OrientationData {
  supported: boolean;
  permissionGranted: boolean;
  needsPermission: boolean; // iOS 13+
  rawGamma: number; // -90 to 90 (left/right tilt)
  rawBeta: number; // -180 to 180 (front/back pitch)
  calibratedGamma: number;
  calibratedBeta: number;
  offsetGamma: number;
  offsetBeta: number;
  tiltX: number; // normalized -1 to 1 force
  tiltY: number; // normalized -1 to 1 force
  source: 'sensor' | 'keyboard' | 'touch' | 'simulation';
}

export interface SonarWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  wallReflections: { x: number; y: number; distance: number; angle: number }[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameSettings {
  hapticsEnabled: boolean;
  hapticStrength: 'soft' | 'medium' | 'strong';
  audioEnabled: boolean;
  spatialAudio: boolean;
  masterVolume: number; // 0 to 1
  voiceCues: boolean;
  tiltSensitivity: number; // 0.5 to 2.5
  invertPitch: boolean;
  invertRoll: boolean;
  deadzone: number; // degrees
  blindfoldMode: boolean; // true = pitch black blindfold, false = spectator view
  blackoutWalls: boolean; // hides walls on canvas for eyes-free tactile test
  audioHapticsFallback: boolean; // synthesized audio beeps/clicks on iOS Safari / devices without vibration
  autoAdvanceLevel: boolean; // auto-advances to next level after victory pulse without freezing
  peekAllowed: boolean;
}

export interface GameStats {
  elapsedTime: number;
  wallCollisionsCount: number;
  hazardHitsCount: number;
  sonarPingsCount: number;
  distanceTraveled: number;
  completed: boolean;
}
