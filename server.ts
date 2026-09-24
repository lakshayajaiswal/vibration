import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini SDK with runtime env key
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn('GEMINI_API_KEY not detected. Using tactical sensory heuristics fallback.');
}

/**
 * Tactical Real-Time Audio & Navigation Advisor
 */
app.post('/api/gemini/tactical-advice', async (req, res) => {
  try {
    const {
      levelName,
      difficulty,
      distToExit,
      normalizedDist,
      pan,
      speed,
      collisionsCount,
      sonarPingsCount,
      hazardDist,
      blindfoldMode,
      userPrompt,
    } = req.body;

    const clockDirection = pan < -0.3 ? 'Left' : pan > 0.3 ? 'Right' : 'Directly Ahead';
    const urgency = normalizedDist < 0.25 ? 'VERY CLOSE' : normalizedDist < 0.6 ? 'MODERATE' : 'FAR';

    // If Gemini client is available, generate immersive tactical guidance
    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `
You are "AURA", the high-tech tactical sound & sonar echolocation guide in the sensory accessibility maze game "ShadowBlind (Tactile Escape)".
The player is navigating a pitch-black labyrinth using device tilt motion and 3D spatial sonar audio.

Current Telemetry:
- Chamber: "${levelName || 'Unknown Chamber'}" (${difficulty || 'Standard'} difficulty)
- Mode: ${blindfoldMode ? '100% Blindfold Mode (Screen Pitch Black)' : 'Spectator Assist'}
- Exit Beacon Direction: ${clockDirection} (Stereo pan: ${typeof pan === 'number' ? pan.toFixed(2) : 0})
- Distance to Exit: ${typeof normalizedDist === 'number' ? (normalizedDist * 100).toFixed(0) : 50}% (${urgency})
- Hazards Nearby: ${hazardDist < 120 ? `DANGER - Trap detected at ${Math.round(hazardDist)} units!` : 'No immediate traps detected'}
- Wall Collisions: ${collisionsCount || 0} contacts
- Sonar Echolocations Used: ${sonarPingsCount || 0}
- Player velocity: ${typeof speed === 'number' ? speed.toFixed(1) : 0} units/sec
${userPrompt ? `- Player Question / Status: "${userPrompt}"` : ''}

Task:
Provide immediate, crisp tactical navigational audio advice in 2 short sentences (max 40 words).
Format as high-clarity voice transmission for an eyes-free navigator relying on haptics and sonar.
Focus on:
1. Directional tilt advice (e.g. gentle tilt right/left, steady roll forward).
2. Acoustic Doppler / sonar frequency cues (high pitch = closing in).
3. Hazard alerts if any are close.
Do not use bullet points or markdown headers. Keep it spoken-style, military-futuristic, calming and encouraging.
`,
      });

      const adviceText = response.text?.trim() || 'Exit beacon locked. Tilt steadily towards your right audio channel.';
      return res.json({ advice: adviceText, status: 'success' });
    }

    // Heuristic fallback if Gemini API key not present
    let fallbackText = '';
    if (hazardDist < 100) {
      fallbackText = `Warning: High hazard dissonance detected nearby! Ease off your tilt and ping sonar to locate safe passage.`;
    } else if (normalizedDist < 0.2) {
      fallbackText = `Target sanctuary is in immediate reach! High-frequency acoustic beacon is centered. Advance gently.`;
    } else if (pan < -0.25) {
      fallbackText = `Exit beacon is resonant on your left audio channel. Tilt device roll gently to the left and listen for the Doppler frequency rise.`;
    } else if (pan > 0.25) {
      fallbackText = `Exit beacon acoustic signature detected on the right. Angle tilt rightward and follow the proximity tempo.`;
    } else {
      fallbackText = `Course aligned straight ahead. Maintain steady forward pitch; listen for wall reflection echoes.`;
    }

    return res.json({ advice: fallbackText, status: 'fallback' });
  } catch (error) {
    console.error('Gemini tactical advisor error:', error);
    return res.status(500).json({
      error: 'Tactile transmission interrupted',
      advice: 'Exit beacon signal intermittent. Rely on spatial audio pings and wall haptics.',
    });
  }
});

/**
 * Post-Run Tactical Debrief & Sensory Rating
 */
app.post('/api/gemini/tactical-debrief', async (req, res) => {
  try {
    const { levelName, timeSeconds, collisionsCount, sonarPingsCount, blindfoldMode } = req.body;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `
You are "AURA", the tactical sonar controller for "ShadowBlind".
The player just successfully completed chamber "${levelName}".
Run stats:
- Time: ${timeSeconds} seconds
- Wall Collisions: ${collisionsCount}
- Sonar Pings: ${sonarPingsCount}
- Blindfold Mode: ${blindfoldMode ? 'YES (100% eyes-free blindfold navigation)' : 'NO (Spectator view)'}

Generate a concise post-escape debrief:
1. Give them a cool Tactical Call-Sign title (e.g., "Sonar Phantom", "Vibrational Whisperer", "Acoustic Apex").
2. Two sentences analyzing their sensory efficiency (e.g. wall scrape restraint, sonar discipline).
Format as JSON with keys: "callSign" (string) and "commentary" (string).
Return ONLY the raw JSON object.
`,
      });

      const raw = response.text?.trim() || '';
      const cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({
        callSign: parsed.callSign || (blindfoldMode ? 'Echo Sentinel' : 'Pathfinder'),
        commentary: parsed.commentary || 'Flawless spatial acoustic alignment. Escape verified.',
      });
    }

    // Heuristic debrief
    const callSign = blindfoldMode
      ? collisionsCount < 4
        ? 'Acoustic Ghost'
        : 'Blindfold Vanguard'
      : collisionsCount === 0
      ? 'Clean Drift'
      : 'Maze Pathfinder';

    const commentary = blindfoldMode
      ? `Remarkable blindfolded acoustic navigation. You completed the escape in ${timeSeconds}s with minimal wall contact.`
      : `Tactile escape logged in ${timeSeconds}s. Try toggling Blindfold Mode next to test pure sensory instinct!`;

    return res.json({ callSign, commentary });
  } catch (error) {
    console.error('Debrief error:', error);
    return res.json({
      callSign: 'Resolute Survivor',
      commentary: 'Sanctuary reached. Sensory telemetry logged successfully.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In dev mode, mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShadowBlind Tactile server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
