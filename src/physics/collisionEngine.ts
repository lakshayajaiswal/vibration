/**
 * Collision Physics & Sliding Mechanics
 * Features:
 * - Continuous circle vs AABB (grid cell) collision detection
 * - Smooth wall sliding (resolves X and Y independently to avoid sticking)
 * - Wall normal & contact force calculation (differentiates graze vs hard push)
 * - Raycaster for Sonar echolocation wave reflections
 */

import { PlayerPhysics } from '../types';

export interface CollisionResult {
  newX: number;
  newY: number;
  newVx: number;
  newVy: number;
  isCollidingWall: boolean;
  wallForce: number; // 0 to 1
  wallNormal: { x: number; y: number };
  cellTypeAtCenter: number;
  hitHazard: boolean;
  hitExit: boolean;
}

export function updatePhysics(
  player: PlayerPhysics,
  tiltX: number,
  tiltY: number,
  grid: number[][],
  cellSize: number,
  dt: number // delta time in seconds
): CollisionResult {
  // Movement physics constants
  const ACCELERATION = 280; // pixels / s^2
  const FRICTION = 0.88; // velocity dampening per frame (~60fps equivalent)
  const MAX_SPEED = 240;

  // Apply tilt force
  let vx = player.vx + tiltX * ACCELERATION * (dt * 60);
  let vy = player.vy + tiltY * ACCELERATION * (dt * 60);

  // Apply friction
  const frictionFactor = Math.pow(FRICTION, dt * 60);
  vx *= frictionFactor;
  vy *= frictionFactor;

  // Speed clamping
  const currentSpeed = Math.hypot(vx, vy);
  if (currentSpeed > MAX_SPEED) {
    vx = (vx / currentSpeed) * MAX_SPEED;
    vy = (vy / currentSpeed) * MAX_SPEED;
  }

  const radius = player.radius;
  let nextX = player.x + vx * dt;
  let nextY = player.y + vy * dt;

  let isColliding = false;
  let wallForce = 0;
  let normalX = 0;
  let normalY = 0;

  const rows = grid.length;
  const cols = grid[0].length;

  // Resolve X-axis collision first
  const minCellX = Math.max(0, Math.floor((nextX - radius) / cellSize));
  const maxCellX = Math.min(cols - 1, Math.floor((nextX + radius) / cellSize));
  const currMinY = Math.max(0, Math.floor((player.y - radius + 2) / cellSize));
  const currMaxY = Math.min(rows - 1, Math.floor((player.y + radius - 2) / cellSize));

  let blockedX = false;
  for (let r = currMinY; r <= currMaxY; r++) {
    for (let c = minCellX; c <= maxCellX; c++) {
      if (grid[r][c] === 1) {
        // Wall box bounds
        const wallLeft = c * cellSize;
        const wallRight = (c + 1) * cellSize;

        if (vx > 0 && nextX + radius > wallLeft && player.x + radius <= wallLeft + 4) {
          nextX = wallLeft - radius;
          normalX = -1;
          blockedX = true;
        } else if (vx < 0 && nextX - radius < wallRight && player.x - radius >= wallRight - 4) {
          nextX = wallRight + radius;
          normalX = 1;
          blockedX = true;
        }
      }
    }
  }

  if (blockedX) {
    isColliding = true;
    // Calculate how strongly user is pushing in X
    const push = Math.abs(tiltX);
    wallForce = Math.max(wallForce, push);
    vx = 0;
  }

  // Resolve Y-axis collision next (enables smooth sliding along walls!)
  const currMinX = Math.max(0, Math.floor((nextX - radius + 2) / cellSize));
  const currMaxX = Math.min(cols - 1, Math.floor((nextX + radius - 2) / cellSize));
  const minCellY = Math.max(0, Math.floor((nextY - radius) / cellSize));
  const maxCellY = Math.min(rows - 1, Math.floor((nextY + radius) / cellSize));

  let blockedY = false;
  for (let r = minCellY; r <= maxCellY; r++) {
    for (let c = currMinX; c <= currMaxX; c++) {
      if (grid[r][c] === 1) {
        const wallTop = r * cellSize;
        const wallBottom = (r + 1) * cellSize;

        if (vy > 0 && nextY + radius > wallTop && player.y + radius <= wallTop + 4) {
          nextY = wallTop - radius;
          normalY = -1;
          blockedY = true;
        } else if (vy < 0 && nextY - radius < wallBottom && player.y - radius >= wallBottom - 4) {
          nextY = wallBottom + radius;
          normalY = 1;
          blockedY = true;
        }
      }
    }
  }

  if (blockedY) {
    isColliding = true;
    const push = Math.abs(tiltY);
    wallForce = Math.max(wallForce, push);
    vy = 0;
  }

  // Bounds clamping to grid
  const maxX = cols * cellSize - radius;
  const maxY = rows * cellSize - radius;
  if (nextX < radius) {
    nextX = radius;
    vx = 0;
    isColliding = true;
  } else if (nextX > maxX) {
    nextX = maxX;
    vx = 0;
    isColliding = true;
  }

  if (nextY < radius) {
    nextY = radius;
    vy = 0;
    isColliding = true;
  } else if (nextY > maxY) {
    nextY = maxY;
    vy = 0;
    isColliding = true;
  }

  // Check center cell interaction
  const centerCellC = Math.max(0, Math.min(cols - 1, Math.floor(nextX / cellSize)));
  const centerCellR = Math.max(0, Math.min(rows - 1, Math.floor(nextY / cellSize)));
  const cellType = grid[centerCellR][centerCellC];

  // Precise overlap with exit (cellType === 2)
  let hitExit = false;
  let hitHazard = false;

  // Check overlap with 3 (Hazard) or 2 (Exit)
  const checkR1 = Math.max(0, Math.floor((nextY - radius * 0.6) / cellSize));
  const checkR2 = Math.min(rows - 1, Math.floor((nextY + radius * 0.6) / cellSize));
  const checkC1 = Math.max(0, Math.floor((nextX - radius * 0.6) / cellSize));
  const checkC2 = Math.min(cols - 1, Math.floor((nextX + radius * 0.6) / cellSize));

  for (let r = checkR1; r <= checkR2; r++) {
    for (let c = checkC1; c <= checkC2; c++) {
      if (grid[r][c] === 2) {
        // Distance to center of exit cell
        const exitCenterX = (c + 0.5) * cellSize;
        const exitCenterY = (r + 0.5) * cellSize;
        if (Math.hypot(nextX - exitCenterX, nextY - exitCenterY) < cellSize * 0.65) {
          hitExit = true;
        }
      } else if (grid[r][c] === 3) {
        // Distance to center of hazard
        const hazardCenterX = (c + 0.5) * cellSize;
        const hazardCenterY = (r + 0.5) * cellSize;
        if (Math.hypot(nextX - hazardCenterX, nextY - hazardCenterY) < cellSize * 0.55) {
          hitHazard = true;
        }
      }
    }
  }

  return {
    newX: nextX,
    newY: nextY,
    newVx: vx,
    newVy: vy,
    isCollidingWall: isColliding,
    wallForce,
    wallNormal: { x: normalX, y: normalY },
    cellTypeAtCenter: cellType,
    hitHazard,
    hitExit,
  };
}

/**
 * Casts rays outward from origin to find wall intersection points for Sonar visualization and audio reverberation
 */
export function castSonarRays(
  originX: number,
  originY: number,
  grid: number[][],
  cellSize: number,
  numRays = 24,
  maxDistance = 500
): { x: number; y: number; distance: number; angle: number }[] {
  const reflections: { x: number; y: number; distance: number; angle: number }[] = [];
  const rows = grid.length;
  const cols = grid[0].length;
  const step = 4; // raymarch step size in pixels

  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * (Math.PI * 2);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let curDist = 0;
    let hit = false;
    let hitX = originX;
    let hitY = originY;

    while (curDist < maxDistance && !hit) {
      curDist += step;
      const testX = originX + cos * curDist;
      const testY = originY + sin * curDist;

      const cellC = Math.floor(testX / cellSize);
      const cellR = Math.floor(testY / cellSize);

      if (cellC < 0 || cellC >= cols || cellR < 0 || cellR >= rows) {
        hit = true;
        hitX = testX;
        hitY = testY;
        break;
      }

      if (grid[cellR][cellC] === 1) {
        hit = true;
        hitX = testX;
        hitY = testY;
        break;
      }
    }

    reflections.push({
      x: hitX,
      y: hitY,
      distance: curDist,
      angle,
    });
  }

  return reflections;
}
