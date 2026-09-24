/**
 * ShadowBlind (Tactile Escape)
 * Main Application Orchestrator
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, ArrowRight, EyeOff, Radio } from 'lucide-react';
import { GameBoard } from './components/GameBoard';
import { SpectatorHUD } from './components/SpectatorHUD';
import { BlindfoldHUD } from './components/BlindfoldHUD';
import { SettingsModal } from './components/SettingsModal';
import { ControlsGuideModal } from './components/ControlsGuideModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { QRCodeModal } from './components/QRCodeModal';
import { VictoryModal } from './components/VictoryModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { UserProfileModal } from './components/UserProfileModal';
import { TacticalAuraModal } from './components/TacticalAuraModal';
import { MotionPermissionBanner } from './components/MotionPermissionBanner';
import { HANDCRAFTED_LEVELS } from './maze/mazeData';
import { MazeLevel, GameSettings, OrientationData } from './types';
import { soundEngine } from './audio/soundEngine';
import { hapticsEngine } from './haptics/hapticsEngine';
import { motionEngine } from './motion/motionEngine';

export default function App() {
  // Current Maze Level
  const [currentLevel, setCurrentLevel] = useState<MazeLevel>(HANDCRAFTED_LEVELS[0]);

  // Global Settings with Blackout, Audio Fallback, and Auto-Advance options
  const [settings, setSettings] = useState<GameSettings>({
    hapticsEnabled: true,
    hapticStrength: 'medium',
    audioEnabled: true,
    spatialAudio: true,
    masterVolume: 0.85,
    voiceCues: false,
    tiltSensitivity: 1.0,
    invertPitch: false,
    invertRoll: false,
    deadzone: 2.0,
    blindfoldMode: false,
    blackoutWalls: false, // Hides canvas walls for pure touch navigation test
    audioHapticsFallback: true, // Synthesized clicks/beeps on iOS Safari where navigator.vibrate is restricted
    autoAdvanceLevel: true, // Smooth transition to next level without freeze or crash
    peekAllowed: true,
  });

  // Match / Level Statistics
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [collisionsCount, setCollisionsCount] = useState(0);
  const [sonarPingsCount, setSonarPingsCount] = useState(0);
  const [hazardHitsCount, setHazardHitsCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  // Non-blocking level clear transition banner state
  const [levelClearBanner, setLevelClearBanner] = useState<{
    levelName: string;
    nextLevelName: string;
    timeSeconds: number;
  } | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);

  // Real-time Physics & Collision Telemetry
  const [isColliding, setIsColliding] = useState(false);
  const [wallForce, setWallForce] = useState(0);
  const [telemetry, setTelemetry] = useState({
    distToExit: 400,
    normalizedDist: 0.8,
    pan: 0,
    speed: 0,
    hazardDist: 999,
  });

  // Motion Orientation Data
  const [orientationData, setOrientationData] = useState<OrientationData>(motionEngine.getData());

  // Modals Visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuraOpen, setIsAuraOpen] = useState(false);

  // Timer reference
  const timerRef = useRef<number | null>(null);

  // Subscribe to orientation changes
  useEffect(() => {
    const unsub = motionEngine.subscribe((data) => {
      setOrientationData(data);
    });
    return unsub;
  }, []);

  // Sync settings with audio/haptics engines
  useEffect(() => {
    soundEngine.setVolume(settings.masterVolume);
    soundEngine.setMuted(!settings.audioEnabled);
    soundEngine.setSpatialAudio(settings.spatialAudio);
    hapticsEngine.setEnabled(settings.hapticsEnabled);
    hapticsEngine.setStrength(settings.hapticStrength);
    hapticsEngine.setAudioFallback(settings.audioHapticsFallback);
    motionEngine.setConfig({
      sensitivity: settings.tiltSensitivity,
      invertPitch: settings.invertPitch,
      invertRoll: settings.invertRoll,
      deadzone: settings.deadzone,
    });
  }, [settings]);

  // Level timer
  useEffect(() => {
    if (isPaused || isVictory || levelClearBanner) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isVictory, levelClearBanner]);

  // Reset counters when switching level
  const handleSelectLevel = useCallback((lvl: MazeLevel) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setLevelClearBanner(null);
    setCurrentLevel(lvl);
    setElapsedSeconds(0);
    setCollisionsCount(0);
    setSonarPingsCount(0);
    setHazardHitsCount(0);
    setIsVictory(false);
    setIsPaused(false);
  }, []);

  // Ping Sonar
  const handlePingSonar = useCallback(() => {
    soundEngine.init();
    setSonarPingsCount((prev) => prev + 1);
    window.dispatchEvent(new CustomEvent('shadowblind-sonar-ping'));
  }, []);

  // Wall Collision Handler
  const lastCollisionRecorded = useRef(0);
  const handleCollisionChange = useCallback((colliding: boolean, force: number) => {
    setIsColliding(colliding);
    setWallForce(force);

    if (colliding) {
      const now = Date.now();
      if (now - lastCollisionRecorded.current > 350) {
        lastCollisionRecorded.current = now;
        setCollisionsCount((prev) => prev + 1);
      }
    }
  }, []);

  // Hazard Hit Handler
  const handleHazardHit = useCallback(() => {
    setHazardHitsCount((prev) => prev + 1);
    if (settings.voiceCues) {
      soundEngine.speak('Hazard triggered! Resetting to start position.');
    }
  }, [settings.voiceCues]);

  // Execute transition to next level cleanly without freezing
  const executeAdvanceToNextLevel = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setLevelClearBanner(null);
    setIsVictory(false);

    const currentIndex = HANDCRAFTED_LEVELS.findIndex((l) => l.id === currentLevel.id);
    const nextIndex = (currentIndex + 1) % HANDCRAFTED_LEVELS.length;
    const nextLvl = HANDCRAFTED_LEVELS[nextIndex];

    handleSelectLevel(nextLvl);
    if (settings.voiceCues) {
      soundEngine.speak(`Entering ${nextLvl.name}`);
    }
  }, [currentLevel.id, handleSelectLevel, settings.voiceCues]);

  // Victory Handler: Distinct win pulse + smooth auto-transition to next level
  const handleLevelComplete = useCallback((runSeconds?: number) => {
    const finalSeconds = runSeconds !== undefined ? runSeconds : elapsedSeconds;

    const currentIndex = HANDCRAFTED_LEVELS.findIndex((l) => l.id === currentLevel.id);
    const nextIndex = (currentIndex + 1) % HANDCRAFTED_LEVELS.length;
    const nextLvl = HANDCRAFTED_LEVELS[nextIndex];

    if (settings.voiceCues) {
      soundEngine.speak('Sanctuary reached! Chamber cleared.');
    }

    if (settings.autoAdvanceLevel) {
      // Show celebratory banner and trigger smooth auto-transition in 1.8s
      setLevelClearBanner({
        levelName: currentLevel.name,
        nextLevelName: nextLvl.name,
        timeSeconds: finalSeconds,
      });

      autoAdvanceTimerRef.current = window.setTimeout(() => {
        executeAdvanceToNextLevel();
      }, 1800);
    } else {
      setIsVictory(true);
    }
  }, [currentLevel.id, currentLevel.name, elapsedSeconds, executeAdvanceToNextLevel, settings.autoAdvanceLevel, settings.voiceCues]);

  // Calibrate Neutral Angle
  const handleCalibrate = useCallback(() => {
    soundEngine.init();
    motionEngine.calibrate();
    hapticsEngine.calibrated();
  }, []);

  // Toggle Blindfold Mode (Full-screen HUD)
  const handleToggleBlindfold = useCallback(() => {
    soundEngine.init();
    setSettings((prev) => {
      const next = !prev.blindfoldMode;
      if (prev.voiceCues) {
        soundEngine.speak(next ? 'Blindfold Mode Activated' : 'Spectator View Restored');
      }
      return { ...prev, blindfoldMode: next };
    });
  }, []);

  // Toggle Blackout / Hide Walls (Canvas walls hidden for touch testing)
  const handleToggleBlackoutWalls = useCallback(() => {
    soundEngine.init();
    setSettings((prev) => {
      const next = !prev.blackoutWalls;
      if (prev.voiceCues) {
        soundEngine.speak(next ? 'Walls Hidden. Blackout Mode.' : 'Walls Visible.');
      }
      return { ...prev, blackoutWalls: next };
    });
  }, []);

  // Replay current chamber
  const handleReplay = (blindfold: boolean) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setLevelClearBanner(null);
    setSettings((prev) => ({ ...prev, blindfoldMode: blindfold }));
    handleSelectLevel(currentLevel);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (levelClearBanner) {
          executeAdvanceToNextLevel();
        } else {
          handlePingSonar();
        }
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        handleToggleBlackoutWalls();
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        handleCalibrate();
      } else if (e.code === 'KeyA') {
        e.preventDefault();
        setIsAuraOpen((prev) => !prev);
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        setIsLeaderboardOpen((prev) => !prev);
      } else if (e.code === 'KeyH') {
        setIsHelpOpen((prev) => !prev);
      } else if (e.code === 'KeyM') {
        setSettings((prev) => {
          const next = !prev.audioEnabled;
          soundEngine.setMuted(!next);
          return { ...prev, audioEnabled: next };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePingSonar, handleToggleBlackoutWalls, handleCalibrate, levelClearBanner, executeAdvanceToNextLevel]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center font-mono select-none no-touch-gesture">
      {/* iOS Safari Motion Permission Prompt Banner */}
      <MotionPermissionBanner onPermissionGranted={() => handleCalibrate()} />

      {/* Non-Blocking Distinct Win Pulse & Transition Notification Banner */}
      {levelClearBanner && (
        <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md bg-neutral-950/95 border-2 border-emerald-400 rounded-2xl p-4 shadow-2xl shadow-emerald-500/40 text-center animate-bounce">
          <div className="flex items-center justify-center space-x-2 text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
            <Trophy className="w-4 h-4 animate-spin text-emerald-400" />
            <span>SANCTUARY CLEARED!</span>
          </div>
          <h3 className="text-white font-bold text-sm sm:text-base">
            Transitioning to {levelClearBanner.nextLevelName}...
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Escape completed in {levelClearBanner.timeSeconds}s
          </p>

          <div className="mt-3 flex items-center justify-center space-x-2">
            <button
              onClick={executeAdvanceToNextLevel}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/30 flex items-center space-x-1.5"
            >
              <span>ADVANCE NOW</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (autoAdvanceTimerRef.current) {
                  clearTimeout(autoAdvanceTimerRef.current);
                  autoAdvanceTimerRef.current = null;
                }
                setLevelClearBanner(null);
                setIsVictory(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs transition cursor-pointer"
            >
              STATS & DEBRIEF
            </button>
          </div>
        </div>
      )}

      {/* Main 2D Canvas Maze GameBoard */}
      <GameBoard
        level={currentLevel}
        settings={settings}
        isPaused={isPaused}
        onLevelComplete={handleLevelComplete}
        onHazardHit={handleHazardHit}
        onCollisionChange={handleCollisionChange}
        onTelemetryUpdate={setTelemetry}
        onPingSonar={handlePingSonar}
      />

      {/* Interactive HUD: Switch between Spectator View & Blindfold Mode */}
      {settings.blindfoldMode ? (
        <BlindfoldHUD
          onToggleSpectator={handleToggleBlindfold}
          onPingSonar={handlePingSonar}
          isColliding={isColliding}
          wallForce={wallForce}
          distToExit={telemetry.distToExit}
          normalizedDist={telemetry.normalizedDist}
          pan={telemetry.pan}
          elapsedSeconds={elapsedSeconds}
          voiceCues={settings.voiceCues}
          onToggleVoice={() => setSettings((s) => ({ ...s, voiceCues: !s.voiceCues }))}
          onOpenTacticalAura={() => setIsAuraOpen(true)}
        />
      ) : (
        <SpectatorHUD
          level={currentLevel}
          orientation={orientationData}
          telemetry={telemetry}
          isColliding={isColliding}
          wallForce={wallForce}
          elapsedSeconds={elapsedSeconds}
          collisionsCount={collisionsCount}
          sonarPingsCount={sonarPingsCount}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused((prev) => !prev)}
          onToggleBlindfold={handleToggleBlindfold}
          onPingSonar={handlePingSonar}
          onCalibrate={handleCalibrate}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
          onOpenQR={() => setIsQROpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenTacticalAura={() => setIsAuraOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          blackoutWalls={settings.blackoutWalls}
          onToggleBlackoutWalls={handleToggleBlackoutWalls}
        />
      )}

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newPartial) => setSettings((prev) => ({ ...prev, ...newPartial }))}
      />

      <ControlsGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <LevelSelectModal
        isOpen={isLevelSelectOpen}
        onClose={() => setIsLevelSelectOpen(false)}
        currentLevelId={currentLevel.id}
        onSelectLevel={handleSelectLevel}
      />

      <QRCodeModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentLevelId={currentLevel.id}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <TacticalAuraModal
        isOpen={isAuraOpen}
        onClose={() => setIsAuraOpen(false)}
        level={currentLevel}
        telemetry={telemetry}
        collisionsCount={collisionsCount}
        sonarPingsCount={sonarPingsCount}
        blindfoldMode={settings.blindfoldMode}
      />

      <VictoryModal
        isOpen={isVictory}
        level={currentLevel}
        elapsedSeconds={elapsedSeconds}
        collisionsCount={collisionsCount}
        sonarPingsCount={sonarPingsCount}
        isBlindfold={settings.blindfoldMode}
        onNextLevel={executeAdvanceToNextLevel}
        onReplay={handleReplay}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
      />
    </div>
  );
}
