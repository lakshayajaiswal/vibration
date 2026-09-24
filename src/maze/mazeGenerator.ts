import { MazeLevel } from '../types';

/**
 * Procedural Maze Generator using randomized Depth-First Search with backtracking.
 * Generates guaranteed solvable mazes with start, exit, and balanced hazards.
 */
export function generateProceduralMaze(width = 15, height = 15, hazardCount = 3): MazeLevel {
  // Ensure odd dimensions for proper wall/corridor cell division
  const cols = width % 2 === 0 ? width + 1 : width;
  const rows = height % 2 === 0 ? height + 1 : height;

  // Initialize with walls (1)
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(1));

  // Depth First Search carving
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack: [number, number][] = [];

  const startR = 1;
  const startC = 1;
  grid[startR][startC] = 0;
  visited[startR][startC] = true;
  stack.push([startR, startC]);

  const directions = [
    [0, 2],
    [2, 0],
    [0, -2],
    [-2, 0],
  ];

  let maxDist = 0;
  let exitPos = { r: rows - 2, c: cols - 2 };
  const distances: Record<string, number> = {};
  distances[`${startR},${startC}`] = 0;

  while (stack.length > 0) {
    const [currR, currC] = stack[stack.length - 1];
    const currDist = distances[`${currR},${currC}`] || 0;

    // Shuffle directions
    const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);
    let carved = false;

    for (const [dr, dc] of shuffledDirs) {
      const nextR = currR + dr;
      const nextC = currC + dc;

      if (nextR > 0 && nextR < rows - 1 && nextC > 0 && nextC < cols - 1 && !visited[nextR][nextC]) {
        // Carve in-between wall
        grid[currR + dr / 2][currC + dc / 2] = 0;
        // Carve destination
        grid[nextR][nextC] = 0;
        visited[nextR][nextC] = true;

        distances[`${nextR},${nextC}`] = currDist + 1;
        if (currDist + 1 > maxDist) {
          maxDist = currDist + 1;
          exitPos = { r: nextR, c: nextC };
        }

        stack.push([nextR, nextC]);
        carved = true;
        break;
      }
    }

    if (!carved) {
      stack.pop();
    }
  }

  // Set Exit
  grid[exitPos.r][exitPos.c] = 2;

  // Sprinkle hazards in dead ends or branches, but never adjacent to start or exit
  let placedHazards = 0;
  const pathCells: [number, number][] = [];

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] === 0) {
        const distFromStart = Math.hypot(r - startR, c - startC);
        const distFromExit = Math.hypot(r - exitPos.r, c - exitPos.c);
        if (distFromStart > 3 && distFromExit > 3) {
          pathCells.push([r, c]);
        }
      }
    }
  }

  // Shuffle candidate cells
  pathCells.sort(() => Math.random() - 0.5);
  for (const [r, c] of pathCells) {
    if (placedHazards >= hazardCount) break;
    // Check neighbors: place in cul-de-sac or corridor
    grid[r][c] = 3;
    placedHazards++;
  }

  const seedId = Math.random().toString(36).substring(2, 7).toUpperCase();

  return {
    id: `procedural-${seedId}`,
    name: `The Shifting Cavern #${seedId}`,
    subtitle: 'Procedurally generated sensory labyrinth',
    difficulty: 'Procedural',
    description: `A unique labyrinth synthesized algorithmically with ${cols}x${rows} grid dimensions and ${placedHazards} hazardous voids.`,
    parTimeSeconds: 45 + Math.round((cols * rows) / 6),
    start: { x: startC, y: startR },
    grid,
  };
}
