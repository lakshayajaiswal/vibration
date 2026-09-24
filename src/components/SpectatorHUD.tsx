/**
 * Spectator / Audience Telemetry HUD
 * Provides rich real-time visual telemetry, sensory diagnostic gauges,
 * Firebase user account / leaderboard actions, and Gemini Tactical AI.
 */

import React from 'react';
import {
  Compass,
  Radio,
  EyeOff,
  Sliders,
  QrCode,
  Layers,
  HelpCircle,
  Volume2,
  Vibrate,
  RotateCcw,
  Activity,
  AlertTriangle,
  Play,
  Pause,
  Trophy,
  Sparkles,
  User,
} from 'lucide-react';
import { OrientationData, MazeLevel } from '../types';
import { useFirebase } from '../firebase/FirebaseContext';

interface SpectatorHUDProps {
  level: MazeLevel;
  orientation: OrientationData;
  telemetry: {
    distToExit: number;
    normalizedDist: number;
    pan: number;
    speed: number;
    hazardDist: number;
  };
  isColliding: boolean;
  wallForce: number;
  elapsedSeconds: number;
  collisionsCount: number;
  sonarPingsCount: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onToggleBlindfold: () => void;
  onPingSonar: () => void;
  onCalibrate: () => void;
  onOpenSettings: () => void;
  onOpenLevelSelect: () => void;
  onOpenQR: () => void;
  onOpenHelp: () => void;
  onOpenLeaderboard: () => void;
  onOpenTacticalAura: () => void;
  onOpenProfile: () => void;
  blackoutWalls: boolean;
  onToggleBlackoutWalls: () => void;
}

export const SpectatorHUD: React.FC<SpectatorHUDProps> = ({
  level,
  orientation,
  telemetry,
  isColliding,
  wallForce,
  elapsedSeconds,
  collisionsCount,
  sonarPingsCount,
  isPaused,
  onTogglePause,
  onToggleBlindfold,
  onPingSonar,
  onCalibrate,
  onOpenSettings,
  onOpenLevelSelect,
  onOpenQR,
  onOpenHelp,
  onOpenLeaderboard,
  onOpenTacticalAura,
  onOpenProfile,
  blackoutWalls,
  onToggleBlackoutWalls,
}) => {
  const { user, signIn } = useFirebase();
  const proximityPercent = Math.max(0, Math.min(100, Math.round((1 - telemetry.normalizedDist) * 100)));
  const beaconBpm = Math.round(60000 / (120 + Math.pow(telemetry.normalizedDist, 1.4) * 980));

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none z-10 font-mono">
      {/* Top Header / Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Brand & Level Title */}
        <div className="flex items-center space-x-3 pointer-events-auto bg-neutral-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-neutral-800 shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wider text-white">SHADOWBLIND</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-cyan-300 uppercase">
                {level.difficulty}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 truncate max-w-[160px] sm:max-w-xs">
              {level.name}
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Gemini Tactical AI Oracle button */}
          <button
            onClick={onOpenTacticalAura}
            className="relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/60 text-cyan-200 hover:text-white text-xs transition shadow-lg shadow-cyan-950/50 active:scale-95 cursor-pointer"
            title="Aura AI Tactical Sonar Voice Guide [A]"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-bold tracking-wider">AURA AI</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
          </button>

          {/* Leaderboard button */}
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs transition shadow-lg active:scale-95 cursor-pointer"
            title="Chamber Leaderboard"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-semibold">RANKS</span>
          </button>

          {/* Level Switcher */}
          <button
            onClick={onOpenLevelSelect}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 text-xs transition shadow-lg active:scale-95 cursor-pointer"
            title="Change Maze Level"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">MAZES</span>
          </button>

          {/* Mobile QR Code button */}
          <button
            onClick={onOpenQR}
            className="p-2 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 text-xs transition shadow-lg active:scale-95 cursor-pointer"
            title="Open on Mobile via QR"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 transition shadow-lg active:scale-95 cursor-pointer"
            title="Settings & Audio/Haptics"
          >
            <Sliders className="w-4 h-4 text-neutral-300" />
          </button>

          {/* Controls Help */}
          <button
            onClick={onOpenHelp}
            className="p-2 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 transition shadow-lg active:scale-95 cursor-pointer"
            title="Controls & Sensory Guide"
          >
            <HelpCircle className="w-4 h-4 text-neutral-300" />
          </button>

          {/* Blackout / Hide Walls Toggle for Judges to test pure touch */}
          <button
            onClick={onToggleBlackoutWalls}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition active:scale-95 cursor-pointer shadow-lg ${
              blackoutWalls
                ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-amber-500/20'
                : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-700/80 text-neutral-300 hover:text-white'
            }`}
            title="Blackout Mode: Hide canvas walls to test navigating purely via touch [B]"
          >
            <EyeOff className={`w-3.5 h-3.5 ${blackoutWalls ? 'text-amber-400 animate-pulse' : 'text-neutral-400'}`} />
            <span>{blackoutWalls ? 'WALLS HIDDEN' : 'HIDE WALLS'}</span>
            <span className="hidden sm:inline-block px-1 py-0.2 text-[9px] bg-neutral-800 text-neutral-400 rounded">
              B
            </span>
          </button>

          {/* Blindfold Mode Switch Button (Core feature!) */}
          <button
            onClick={onToggleBlindfold}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 hover:text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
            title="Switch to full-screen blindfold HUD"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">FULL BLINDFOLD</span>
          </button>

          {/* User Profile or Google Sign In */}
          {user ? (
            <button
              onClick={onOpenProfile}
              className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-white text-xs transition active:scale-95 cursor-pointer"
              title="Player Profile & Escape History"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 border border-cyan-400 flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-cyan-300" />
                )}
              </div>
              <span className="hidden md:inline font-semibold truncate max-w-[90px]">
                {user.displayName?.split(' ')[0] || 'Player'}
              </span>
            </button>
          ) : (
            <button
              onClick={async () => {
                try {
                  await signIn();
                } catch (e) {
                  console.error(e);
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
              title="Sign in with Google"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SIGN IN</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Center Notification for Wall Collision */}
      {isColliding && (
        <div className="mx-auto pointer-events-none flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-red-950/80 border border-red-500/80 text-red-200 text-xs shadow-xl animate-bounce">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>
            WALL FRICTION ({Math.round(wallForce * 100)}%) — Haptic Stutter Active
          </span>
        </div>
      )}

      {/* Bottom Telemetry & Controls Dashboard */}
      <div className="flex flex-wrap items-end justify-between gap-3 pointer-events-auto">
        {/* Left Telemetry Box: Motion & Tilt Gauges */}
        <div className="bg-neutral-950/90 backdrop-blur-md p-3 rounded-xl border border-neutral-800 shadow-2xl flex flex-col space-y-2 max-w-xs text-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 text-neutral-400 text-[10px] tracking-wider uppercase">
            <span className="flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sensors & Gyroscope</span>
            </span>
            <span className="text-cyan-400 font-bold uppercase">{orientation.source}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-neutral-500">Roll (γ):</span>
              <span className="ml-1 text-neutral-200 font-bold">
                {orientation.calibratedGamma.toFixed(1)}°
              </span>
            </div>
            <div>
              <span className="text-neutral-500">Pitch (β):</span>
              <span className="ml-1 text-neutral-200 font-bold">
                {orientation.calibratedBeta.toFixed(1)}°
              </span>
            </div>
          </div>

          {/* Visual Tilt Force Vector Level */}
          <div className="relative w-full h-4 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
            <div
              className="absolute top-0 bottom-0 w-2.5 bg-cyan-400 rounded-full transition-all duration-75 shadow-sm shadow-cyan-400"
              style={{
                left: `calc(50% + ${(orientation.tiltX * 45).toFixed(1)}% - 5px)`,
              }}
            />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-700" />
          </div>

          {/* Zero Calibration Button */}
          <button
            onClick={onCalibrate}
            className="w-full mt-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 hover:text-white transition text-[11px] active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>CALIBRATE ZERO ANGLE [C]</span>
          </button>
        </div>

        {/* Right Telemetry Box: Proximity Beacon & Game Stats */}
        <div className="bg-neutral-950/90 backdrop-blur-md p-3 rounded-xl border border-neutral-800 shadow-2xl flex flex-col space-y-2.5 max-w-xs text-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 text-neutral-400 text-[10px] tracking-wider uppercase">
            <span className="flex items-center space-x-1.5">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Sensory Beacon</span>
            </span>
            <span className="text-emerald-400 font-bold">{beaconBpm} BPM</span>
          </div>

          {/* Proximity Progress */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-400">Exit Proximity</span>
              <span className="text-emerald-400 font-bold">{proximityPercent}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${proximityPercent}%`,
                  backgroundColor: proximityPercent > 70 ? '#10b981' : proximityPercent > 40 ? '#38bdf8' : '#f59e0b',
                }}
              />
            </div>
          </div>

          {/* Match Stats */}
          <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-1 border-t border-neutral-800/80">
            <div>
              <div className="text-neutral-500 text-[10px]">TIME</div>
              <div className="font-bold text-neutral-200">
                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 text-[10px]">BUMPS</div>
              <div className="font-bold text-amber-400">{collisionsCount}</div>
            </div>
            <div>
              <div className="text-neutral-500 text-[10px]">PINGS</div>
              <div className="font-bold text-cyan-400">{sonarPingsCount}</div>
            </div>
          </div>

          {/* Sonar Ping Trigger Button */}
          <button
            onClick={onPingSonar}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-200 hover:text-white transition text-[11px] active:scale-95 shadow-lg shadow-cyan-950/40 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>EMIT SONAR PING [SPACE]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
