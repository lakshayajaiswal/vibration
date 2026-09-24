/**
 * GameBoard Canvas Engine
 * Renders:
 * - Spectator View: Tactical grid, walls, glowing exit portal, hazards, avatar trail, velocity vector, sonar sound waves
 * - Blindfold View: Pitch black canvas with acoustic sonar ripples & tactile feedback
 * - Screen shake effects on wall impact
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MazeLevel, PlayerPhysics, SonarWave, Particle, GameSettings } from '../types';
import { updatePhysics, castSonarRays } from '../physics/collisionEngine';
import { soundEngine } from '../audio/soundEngine';
import { hapticsEngine } from '../haptics/hapticsEngine';
import { motionEngine } from '../motion/motionEngine';

interface GameBoardProps {
  level: MazeLevel;
  settings: GameSettings;
  isPaused: boolean;
  onLevelComplete: (timeSeconds: number) => void;
  onHazardHit: () => void;
  onCollisionChange: (isColliding: boolean, force: number) => void;
  onTelemetryUpdate: (data: {
    distToExit: number;
    normalizedDist: number;
    pan: number;
    speed: number;
    hazardDist: number;
  }) => void;
  onPingSonar: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  level,
  settings,
  isPaused,
  onLevelComplete,
  onHazardHit,
  onCollisionChange,
  onTelemetryUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dynamic canvas sizing
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [screenShake, setScreenShake] = useState(0);

  // Game internal state
  const stateRef = useRef<{
    player: PlayerPhysics;
    cellSize: number;
    gridOffsetX: number;
    gridOffsetY: number;
    sonarWaves: SonarWave[];
    particles: Particle[];
    winPulses: { x: number; y: number; radius: number; maxRadius: number; color: string }[];
    trail: { x: number; y: number; time: number }[];
    lastBeaconPulseTime: number;
    lastFrameTime: number;
    isPressingWall: boolean;
    hazardWarningPlayed: boolean;
    isLevelFinished: boolean;
    touchStartPos: { x: number; y: number } | null;
    isDragging: boolean;
    peekTimer: number; // for emergency visual peek
  }>({
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 12,
      isCollidingWall: false,
      wallForce: 0,
      isTouchingHazard: false,
    },
    cellSize: 40,
    gridOffsetX: 0,
    gridOffsetY: 0,
    sonarWaves: [],
    particles: [],
    winPulses: [],
    trail: [],
    lastBeaconPulseTime: 0,
    lastFrameTime: performance.now(),
    isPressingWall: false,
    hazardWarningPlayed: false,
    isLevelFinished: false,
    touchStartPos: null,
    isDragging: false,
    peekTimer: 0,
  });

  // Calculate cell size and offsets to center maze in canvas
  const calculateLayout = useCallback((canvasW: number, canvasH: number) => {
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    // Leave some margin
    const availW = canvasW * 0.94;
    const availH = canvasH * 0.94;
    const cellSize = Math.floor(Math.min(availW / cols, availH / rows));
    const mazeW = cols * cellSize;
    const mazeH = rows * cellSize;
    const gridOffsetX = Math.floor((canvasW - mazeW) / 2);
    const gridOffsetY = Math.floor((canvasH - mazeH) / 2);

    return { cellSize, gridOffsetX, gridOffsetY };
  }, [level]);

  // Reset player to start whenever level changes
  useEffect(() => {
    const { cellSize, gridOffsetX, gridOffsetY } = calculateLayout(dimensions.width, dimensions.height);
    const radius = Math.max(8, Math.floor(cellSize * 0.35));
    const startX = gridOffsetX + (level.start.x + 0.5) * cellSize;
    const startY = gridOffsetY + (level.start.y + 0.5) * cellSize;

    stateRef.current.cellSize = cellSize;
    stateRef.current.gridOffsetX = gridOffsetX;
    stateRef.current.gridOffsetY = gridOffsetY;
    stateRef.current.player = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      radius,
      isCollidingWall: false,
      wallForce: 0,
      isTouchingHazard: false,
    };
    stateRef.current.sonarWaves = [];
    stateRef.current.particles = [];
    stateRef.current.winPulses = [];
    stateRef.current.trail = [];
    stateRef.current.isLevelFinished = false;
    stateRef.current.lastBeaconPulseTime = performance.now();
  }, [level, dimensions, calculateLayout]);

  // Hook screen shake callback into haptics engine
  useEffect(() => {
    hapticsEngine.onScreenShake((intensity) => {
      setScreenShake(intensity * 12);
      setTimeout(() => setScreenShake(0), 120);
    });
  }, []);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Trigger Sonar Echolocation wave
  const triggerSonar = useCallback(() => {
    const state = stateRef.current;
    const player = state.player;
    const rows = level.grid.length;
    const cols = level.grid[0].length;

    // Convert player position to grid local coordinate
    const localX = player.x - state.gridOffsetX;
    const localY = player.y - state.gridOffsetY;

    // Cast rays to find reflections
    const reflections = castSonarRays(
      localX,
      localY,
      level.grid,
      state.cellSize,
      28,
      state.cellSize * Math.max(rows, cols)
    );

    // Map back to canvas coords
    const mappedReflections = reflections.map((r) => ({
      ...r,
      x: r.x + state.gridOffsetX,
      y: r.y + state.gridOffsetY,
    }));

    const avgDist = reflections.reduce((acc, r) => acc + r.distance, 0) / reflections.length / state.cellSize;

    state.sonarWaves.push({
      x: player.x,
      y: player.y,
      radius: player.radius,
      maxRadius: state.cellSize * 10,
      startTime: performance.now(),
      wallReflections: mappedReflections,
    });

    // Audio & haptic feedback
    soundEngine.playSonarPing(mappedReflections.length, avgDist);
    hapticsEngine.sonarPulse();

    // Spawn burst particles
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const spd = 40 + Math.random() * 50;
      state.particles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.6,
        maxLife: 0.6,
        color: '#38bdf8',
        size: 2.5,
      });
    }
  }, [level]);

  // Allow external calls to triggerSonar via custom event
  useEffect(() => {
    const handlePingEvent = () => triggerSonar();
    window.addEventListener('shadowblind-sonar-ping', handlePingEvent);
    return () => window.removeEventListener('shadowblind-sonar-ping', handlePingEvent);
  }, [triggerSonar]);

  // Touch drag controls on canvas for devices without orientation or mouse drag
  const handlePointerDown = (e: React.PointerEvent) => {
    soundEngine.init();
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    stateRef.current.touchStartPos = { x: px, y: py };
    stateRef.current.isDragging = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stateRef.current.isDragging || !stateRef.current.touchStartPos) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const dx = px - stateRef.current.touchStartPos.x;
    const dy = py - stateRef.current.touchStartPos.y;

    const maxDrag = 60;
    const tx = Math.max(-1, Math.min(1, dx / maxDrag));
    const ty = Math.max(-1, Math.min(1, dy / maxDrag));

    motionEngine.setTouchVector(tx, ty);
  };

  const handlePointerUp = () => {
    stateRef.current.isDragging = false;
    stateRef.current.touchStartPos = null;
    motionEngine.setTouchVector(null, null);
  };

  // Main Game Loop (Physics, Audio Beacon, Haptics, Canvas Render)
  useEffect(() => {
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const runLoop = (now: number) => {
      animId = requestAnimationFrame(runLoop);

      const dt = Math.min(0.06, (now - stateRef.current.lastFrameTime) / 1000);
      stateRef.current.lastFrameTime = now;

      // Only pause when explicit pause is active; if level finished, keep rendering win pulse & particles!
      if (isPaused) {
        return;
      }

      const state = stateRef.current;
      const motion = motionEngine.getData();

      // Find exit coordinates in local grid
      let exitCell = { r: 1, c: 1 };
      const hazardCells: { r: number; c: number }[] = [];
      const rows = level.grid.length;
      const cols = level.grid[0].length;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (level.grid[r][c] === 2) exitCell = { r, c };
          else if (level.grid[r][c] === 3) hazardCells.push({ r, c });
        }
      }

      const exitWorldX = state.gridOffsetX + (exitCell.c + 0.5) * state.cellSize;
      const exitWorldY = state.gridOffsetY + (exitCell.r + 0.5) * state.cellSize;

      // 1. Physics & Collision updates (only while level is actively being played)
      if (!state.isLevelFinished) {
        const localPlayer: PlayerPhysics = {
          ...state.player,
          x: state.player.x - state.gridOffsetX,
          y: state.player.y - state.gridOffsetY,
        };

        const collision = updatePhysics(
          localPlayer,
          motion.tiltX,
          motion.tiltY,
          level.grid,
          state.cellSize,
          dt
        );

        // Map back to canvas coords
        state.player.x = collision.newX + state.gridOffsetX;
        state.player.y = collision.newY + state.gridOffsetY;
        state.player.vx = collision.newVx;
        state.player.vy = collision.newVy;
        state.player.isCollidingWall = collision.isCollidingWall;
        state.player.wallForce = collision.wallForce;

        // Record player trail for spectator view
        if (!settings.blindfoldMode && now % 3 === 0) {
          state.trail.push({ x: state.player.x, y: state.player.y, time: now });
          if (state.trail.length > 45) state.trail.shift();
        }

        // 2. Wall Haptic & Audio Feedback Controller
        onCollisionChange(collision.isCollidingWall, collision.wallForce);

        if (collision.isCollidingWall) {
          // Distinguish between hard pressing (force > 0.45) vs grazing
          if (collision.wallForce > 0.45) {
            if (!state.isPressingWall) {
              state.isPressingWall = true;
              hapticsEngine.startWallStutter();
              soundEngine.playWallHit(collision.wallForce);
            }
            soundEngine.updateWallScrape(true, collision.wallForce);
          } else {
            // Grazing
            if (state.isPressingWall) {
              state.isPressingWall = false;
              hapticsEngine.stopWallStutter();
            }
            hapticsEngine.wallGraze();
            soundEngine.updateWallScrape(true, 0.25);
          }
        } else {
          if (state.isPressingWall) {
            state.isPressingWall = false;
            hapticsEngine.stopWallStutter();
          }
          soundEngine.updateWallScrape(false, 0);
        }

        // 3. Proximity Beacon (Hot/Cold) Audio & Haptics
        const distToExit = Math.hypot(exitWorldX - state.player.x, exitWorldY - state.player.y);
        const maxPossibleDist = Math.hypot(cols * state.cellSize, rows * state.cellSize);
        const normalizedDist = Math.max(0, Math.min(1, distToExit / maxPossibleDist));

        // Calculate stereo pan (-1 to 1) based on angle to exit relative to player
        const dxToExit = exitWorldX - state.player.x;
        const dyToExit = exitWorldY - state.player.y;
        const pan = Math.max(-1, Math.min(1, dxToExit / (state.cellSize * 4)));

        let radialVelocity = 0;
        if (distToExit > 1e-3) {
          const uX = dxToExit / distToExit;
          const uY = dyToExit / distToExit;
          const radialSpeed = state.player.vx * uX + state.player.vy * uY;
          radialVelocity = Math.max(-1, Math.min(1, radialSpeed / 200));
        }

        const beaconInterval = 120 + Math.pow(normalizedDist, 1.4) * 980;
        if (now - state.lastBeaconPulseTime >= beaconInterval) {
          state.lastBeaconPulseTime = now;
          soundEngine.playBeaconPing(normalizedDist, pan, radialVelocity);
          hapticsEngine.beaconPulse(normalizedDist);
        }

        // 4. Hazard Warning calculations
        let minHazardDist = Infinity;
        for (const h of hazardCells) {
          const hx = state.gridOffsetX + (h.c + 0.5) * state.cellSize;
          const hy = state.gridOffsetY + (h.r + 0.5) * state.cellSize;
          const d = Math.hypot(hx - state.player.x, hy - state.player.y);
          if (d < minHazardDist) minHazardDist = d;
        }
        const hazardThreshold = state.cellSize * 2.4;
        const normalizedHazardDist = Math.max(0, Math.min(1, minHazardDist / hazardThreshold));

        if (minHazardDist < hazardThreshold) {
          soundEngine.updateHazardWarning(normalizedHazardDist);
          if (minHazardDist < state.cellSize * 1.0) {
            hapticsEngine.hazardAlert();
          }
        } else {
          soundEngine.updateHazardWarning(1.0);
        }

        // 5. Hazard Pitfall / Trap Collision
        if (collision.hitHazard) {
          state.player.isTouchingHazard = true;
          soundEngine.playHazardHit();
          hapticsEngine.hazardAlert();
          // Reset player to start with small penalty
          const startX = state.gridOffsetX + (level.start.x + 0.5) * state.cellSize;
          const startY = state.gridOffsetY + (level.start.y + 0.5) * state.cellSize;
          state.player.x = startX;
          state.player.y = startY;
          state.player.vx = 0;
          state.player.vy = 0;
          onHazardHit();
        }

        // 6. Distinct Victory Condition (Goal Reached)
        if (collision.hitExit) {
          state.isLevelFinished = true;
          state.player.vx = 0;
          state.player.vy = 0;

          // Distinct Win Pulse: Web Audio + Haptics + Visual Shockwaves
          soundEngine.playWinPulse();
          soundEngine.playVictoryFanfare();
          hapticsEngine.exitReached();

          // Spawn distinct concentric victory shockwave rings on canvas
          const maxDimension = Math.max(canvas.width, canvas.height);
          state.winPulses.push(
            { x: exitWorldX, y: exitWorldY, radius: 10, maxRadius: maxDimension * 1.5, color: '#10b981' },
            { x: exitWorldX, y: exitWorldY, radius: 2, maxRadius: maxDimension * 1.2, color: '#38bdf8' },
            { x: exitWorldX, y: exitWorldY, radius: 1, maxRadius: maxDimension * 0.9, color: '#f59e0b' }
          );

          // Burst celebration confetti particles
          for (let i = 0; i < 48; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 70 + Math.random() * 200;
            state.particles.push({
              x: exitWorldX,
              y: exitWorldY,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              life: 1.6,
              maxLife: 1.6,
              color: ['#10b981', '#38bdf8', '#fbbf24', '#a855f7', '#ec4899', '#ffffff'][i % 6],
              size: 3 + Math.random() * 3,
            });
          }

          onLevelComplete(Math.round((now - state.lastBeaconPulseTime) / 1000));
        }

        // Update telemetry for HUD
        const speed = Math.hypot(state.player.vx, state.player.vy);
        onTelemetryUpdate({
          distToExit: Math.round(distToExit),
          normalizedDist,
          pan,
          speed: Math.round(speed),
          hazardDist: Math.round(minHazardDist),
        });
      }

      // 7. Update Sonar Waves, Win Pulses & Particles (Continues running at 60fps)
      for (let i = state.winPulses.length - 1; i >= 0; i--) {
        const wp = state.winPulses[i];
        wp.radius += 560 * dt;
        if (wp.radius >= wp.maxRadius) {
          state.winPulses.splice(i, 1);
        }
      }

      // 7. Update Sonar Waves & Particles
      for (let i = state.sonarWaves.length - 1; i >= 0; i--) {
        const wave = state.sonarWaves[i];
        wave.radius += 240 * dt;
        if (wave.radius >= wave.maxRadius) {
          state.sonarWaves.splice(i, 1);
        }
      }

      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
        }
      }

      // 8. RENDER CANVAS
      renderCanvas(ctx, canvas.width, canvas.height);
    };

    animId = requestAnimationFrame(runLoop);
    return () => {
      cancelAnimationFrame(animId);
      soundEngine.stopAll();
      hapticsEngine.stopWallStutter();
    };
  }, [level, isPaused, settings.blindfoldMode, onCollisionChange, onHazardHit, onLevelComplete, onTelemetryUpdate]);

  // Canvas drawing routine
  const renderCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current;
    const { player, cellSize, gridOffsetX, gridOffsetY, sonarWaves, particles, trail } = state;
    const isBlindfold = settings.blindfoldMode;
    const isBlackoutWalls = settings.blackoutWalls;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply screen shake if active
    if (screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * screenShake;
      const shakeY = (Math.random() - 0.5) * screenShake;
      ctx.translate(shakeX, shakeY);
    }

    if (isBlindfold) {
      // ==========================================
      // BLINDFOLD MODE: PITCH BLACK SENSORY SPACE
      // ==========================================
      ctx.fillStyle = '#030407';
      ctx.fillRect(0, 0, width, height);

      // Acoustic echo ripples from Sonar if active
      sonarWaves.forEach((wave) => {
        const progress = wave.radius / wave.maxRadius;
        const alpha = Math.max(0, 1 - progress) * 0.45;

        // Draw faint expanding sonar ring
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Illuminate wall reflection points briefly
        wave.wallReflections.forEach((ref) => {
          if (wave.radius >= ref.distance) {
            const hitAlpha = Math.max(0, 1 - (wave.radius - ref.distance) / 80) * 0.6;
            if (hitAlpha > 0.05) {
              ctx.beginPath();
              ctx.arc(ref.x, ref.y, 4, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(168, 85, 247, ${hitAlpha})`;
              ctx.shadowColor = '#a855f7';
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        });
      });

      // Subtle pulse dot at avatar center only during sonar ping or wall touch
      if (player.isCollidingWall) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.fill();
      }

      // Draw Distinct Win Celebration Shockwaves in Blindfold Mode
      state.winPulses.forEach((wp) => {
        const progress = wp.radius / wp.maxRadius;
        const alpha = Math.max(0, 1 - progress);
        ctx.save();
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, wp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = wp.color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.lineWidth = 4 + (1 - progress) * 8;
        ctx.shadowColor = wp.color;
        ctx.shadowBlur = 24;
        ctx.stroke();
        ctx.restore();
      });

      ctx.restore();
      return;
    }

    // ==========================================
    // SPECTATOR / AUDIENCE VIEW
    // ==========================================

    // 1. Dark tactical grid background (or blackout void if walls hidden)
    ctx.fillStyle = isBlackoutWalls ? '#030407' : '#080a10';
    ctx.fillRect(0, 0, width, height);

    if (!isBlackoutWalls) {
      // Subtle background grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridStep = 24;
      for (let x = 0; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else {
      // Blackout Mode Watermark for testing judges
      ctx.save();
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.fillText('👁️‍🗨️ BLACKOUT ACTIVE: WALLS HIDDEN — NAVIGATE BY TOUCH & AUDIO BEACON', width / 2, 28);
      ctx.restore();
    }

    // 2. Draw Maze Cells (Skip walls if Blackout Mode is active)
    const rows = level.grid.length;
    const cols = level.grid[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellX = gridOffsetX + c * cellSize;
        const cellY = gridOffsetY + r * cellSize;
        const cellType = level.grid[r][c];

        if (cellType === 1) {
          if (!isBlackoutWalls) {
            // WALL: Sleek futuristic monolith
            ctx.fillStyle = '#111827';
            ctx.fillRect(cellX, cellY, cellSize, cellSize);

            // Wall bevel border
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cellX + 0.5, cellY + 0.5, cellSize - 1, cellSize - 1);

            // Inner high-tech grid accent
            ctx.fillStyle = '#161e2e';
            ctx.fillRect(cellX + 3, cellY + 3, cellSize - 6, cellSize - 6);
          }
        } else if (cellType === 2) {
          if (!isBlackoutWalls) {
            // EXIT SANCTUARY PORTAL
            const centerX = cellX + cellSize / 2;
            const centerY = cellY + cellSize / 2;

            // Glowing aura
            const pulse = (Math.sin(performance.now() * 0.005) + 1) / 2;
            const radGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, cellSize * 0.85);
            radGrad.addColorStop(0, 'rgba(52, 211, 153, 0.9)');
            radGrad.addColorStop(0.5, `rgba(16, 185, 129, ${0.4 + pulse * 0.3})`);
            radGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, cellSize * 0.85, 0, Math.PI * 2);
            ctx.fill();

            // Concentric portal rings
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, cellSize * (0.3 + pulse * 0.15), 0, Math.PI * 2);
            ctx.stroke();

            // Core beacon icon
            ctx.fillStyle = '#6ee7b7';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (cellType === 3) {
          if (!isBlackoutWalls) {
            // HAZARD SPIKE PIT / VOID
            const centerX = cellX + cellSize / 2;
            const centerY = cellY + cellSize / 2;

            // Danger pulsing perimeter
            const pulse = (Math.sin(performance.now() * 0.008) + 1) / 2;
            ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + pulse * 0.15})`;
            ctx.fillRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);

            ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + pulse * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);

            // Danger cross / hazard spikes
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            const pad = cellSize * 0.28;
            ctx.beginPath();
            ctx.moveTo(cellX + pad, cellY + pad);
            ctx.lineTo(cellX + cellSize - pad, cellY + cellSize - pad);
            ctx.moveTo(cellX + cellSize - pad, cellY + pad);
            ctx.lineTo(cellX + pad, cellY + cellSize - pad);
            ctx.stroke();
          }
        } else {
          if (!isBlackoutWalls) {
            // PATH: Soft floor indicator
            ctx.fillStyle = '#0a0d16';
            ctx.fillRect(cellX, cellY, cellSize, cellSize);
          }
        }
      }
    }

    // 3. Draw Sonar Echolocation Waves
    sonarWaves.forEach((wave) => {
      const progress = wave.radius / wave.maxRadius;
      const alpha = Math.max(0, 1 - progress) * 0.65;

      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw reflection points
      wave.wallReflections.forEach((ref) => {
        if (wave.radius >= ref.distance) {
          const hitAlpha = Math.max(0, 1 - (wave.radius - ref.distance) / 100);
          if (hitAlpha > 0.05) {
            ctx.beginPath();
            ctx.arc(ref.x, ref.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(168, 85, 247, ${hitAlpha * 0.8})`;
            ctx.fill();
          }
        }
      });
    });

    // 4. Draw Particle sparks
    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // 5. Draw Avatar Trail
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // 6. Draw Line to Exit Vector (Spectator assistance)
    let exitWorldX = gridOffsetX;
    let exitWorldY = gridOffsetY;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (level.grid[r][c] === 2) {
          exitWorldX = gridOffsetX + (c + 0.5) * cellSize;
          exitWorldY = gridOffsetY + (r + 0.5) * cellSize;
        }
      }
    }

    ctx.beginPath();
    ctx.setLineDash([4, 6]);
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(exitWorldX, exitWorldY);
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // 7. Draw Player Avatar
    // Outer glow
    const playerGlow = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, player.radius * 2.2);
    playerGlow.addColorStop(0, player.isCollidingWall ? 'rgba(239, 68, 68, 0.8)' : 'rgba(56, 189, 248, 0.8)');
    playerGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = playerGlow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Solid core
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.isCollidingWall ? '#ef4444' : '#38bdf8';
    ctx.shadowColor = player.isCollidingWall ? '#ef4444' : '#0284c7';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Velocity vector direction arrow
    const velLen = Math.hypot(player.vx, player.vy);
    if (velLen > 5) {
      const arrowLen = Math.min(30, velLen * 0.18);
      const nx = player.vx / velLen;
      const ny = player.vy / velLen;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + nx * (player.radius + arrowLen), player.y + ny * (player.radius + arrowLen));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 8. Draw Distinct Win Celebration Shockwaves
    state.winPulses.forEach((wp) => {
      const progress = wp.radius / wp.maxRadius;
      const alpha = Math.max(0, 1 - progress);
      ctx.save();
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, wp.radius, 0, Math.PI * 2);
      ctx.strokeStyle = wp.color;
      ctx.globalAlpha = alpha * 0.9;
      ctx.lineWidth = 4 + (1 - progress) * 8;
      ctx.shadowColor = wp.color;
      ctx.shadowBlur = 24;
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none no-touch-gesture"
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="block cursor-crosshair no-touch-gesture"
      />
    </div>
  );
};
