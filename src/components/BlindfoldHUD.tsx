/**
 * Blindfold HUD Component
 * Full-screen eyes-free touch surface and minimal high-contrast HUD.
 * Allows blindfolded players to:
 * - Tap anywhere on screen to trigger Sonar Echolocation ping
 * - Calibrate neutral angle with a dedicated high-contrast button
 * - Receive haptic & audio pulses with zero visual reliance
 */

import React, { useState } from 'react';
import { Eye, Radio, Compass, Volume2, RotateCcw, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { motionEngine } from '../motion/motionEngine';
import { hapticsEngine } from '../haptics/hapticsEngine';
import { soundEngine } from '../audio/soundEngine';

interface BlindfoldHUDProps {
  onToggleSpectator: () => void;
  onPingSonar: () => void;
  isColliding: boolean;
  wallForce: number;
  distToExit: number;
  normalizedDist: number;
  pan: number;
  elapsedSeconds: number;
  voiceCues: boolean;
  onToggleVoice: () => void;
  onOpenTacticalAura?: () => void;
}

export const BlindfoldHUD: React.FC<BlindfoldHUDProps> = ({
  onToggleSpectator,
  onPingSonar,
  isColliding,
  wallForce,
  distToExit,
  normalizedDist,
  pan,
  elapsedSeconds,
  voiceCues,
  onToggleVoice,
  onOpenTacticalAura,
}) => {
  const [lastActionText, setLastActionText] = useState('TAP SCREEN FOR SONAR');
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Trigger Sonar on screen tap
  const handleSurfaceTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Avoid double trigger if clicking buttons
    if ((e.target as HTMLElement).closest('button')) return;

    soundEngine.init();
    onPingSonar();
    setLastActionText('SONAR ECHO EMITTED');
    setTimeout(() => setLastActionText('BLINDFOLD ACTIVE — EYES FREE'), 1200);
  };

  const handleCalibrate = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.init();
    motionEngine.calibrate();
    hapticsEngine.calibrated();
    setIsCalibrating(true);
    setLastActionText('NEUTRAL ANGLE CALIBRATED');
    if (voiceCues) {
      soundEngine.speak('Sensors Calibrated');
    }
    setTimeout(() => setIsCalibrating(false), 800);
  };

  const handleVoiceQuery = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.init();
    const directionStr = pan > 0.3 ? 'to your right' : pan < -0.3 ? 'to your left' : 'straight ahead';
    const distanceStr = normalizedDist < 0.25 ? 'very close' : normalizedDist < 0.6 ? 'moderate distance' : 'far away';
    soundEngine.speak(`Exit is ${directionStr}, ${distanceStr}`);
    setLastActionText(`EXIT: ${directionStr.toUpperCase()}`);
  };

  // Proximity percentage (100% when right at exit)
  const proximityPercent = Math.max(0, Math.min(100, Math.round((1 - normalizedDist) * 100)));

  return (
    <div
      onClick={handleSurfaceTap}
      className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 cursor-pointer select-none no-touch-gesture bg-black/60 pointer-events-auto"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Top Bar: Minimal High-Contrast Info */}
      <div className="flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <button
            onClick={onToggleSpectator}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 transition active:scale-95 text-xs font-mono tracking-wider shadow-lg"
            title="Switch to Spectator View"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">SPECTATOR VIEW</span>
          </button>

          <button
            onClick={handleVoiceQuery}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 transition active:scale-95 text-xs font-mono tracking-wider shadow-lg"
            title="Speak Directional Guidance"
          >
            <Volume2 className={`w-4 h-4 ${voiceCues ? 'text-cyan-400' : 'text-neutral-500'}`} />
            <span className="hidden sm:inline">VOICE CUE</span>
          </button>

          {onOpenTacticalAura && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenTacticalAura();
              }}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 hover:text-white hover:bg-cyan-900/80 transition active:scale-95 text-xs font-mono tracking-wider shadow-lg"
              title="Aura AI Tactical Guidance"
            >
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">AURA AI</span>
            </button>
          )}
        </div>

        {/* Proximity Hot/Cold Bar */}
        <div className="flex items-center space-x-3 bg-neutral-950/80 px-4 py-2 rounded-xl border border-neutral-800 backdrop-blur-md">
          <div className="text-right">
            <div className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase">Beacon Proximity</div>
            <div className="text-sm font-mono font-bold text-emerald-400">{proximityPercent}%</div>
          </div>
          <div className="w-24 sm:w-32 h-2 bg-neutral-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${proximityPercent}%`,
                backgroundColor: proximityPercent > 70 ? '#10b981' : proximityPercent > 40 ? '#38bdf8' : '#f59e0b',
                boxShadow: `0 0 8px ${proximityPercent > 70 ? '#10b981' : '#38bdf8'}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Center Tactile Focus: Big Calibrate Button & Sensory Status */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
        {/* Wall Collision Alert Ring */}
        {isColliding && (
          <div className="mb-6 flex items-center space-x-2 px-4 py-2 rounded-full bg-red-950/80 border border-red-500/80 text-red-200 animate-pulse text-xs font-mono tracking-wider">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>WALL CONTACT ({Math.round(wallForce * 100)}%)</span>
          </div>
        )}

        {/* Center Calibrate Button (Accessible high-contrast target) */}
        <button
          onClick={handleCalibrate}
          className={`pointer-events-auto relative group flex flex-col items-center justify-center w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 transition-all duration-300 active:scale-95 shadow-2xl ${
            isCalibrating
              ? 'border-emerald-400 bg-emerald-950/60 scale-95 shadow-emerald-500/50'
              : isColliding
              ? 'border-red-500/60 bg-red-950/20 shadow-red-500/20'
              : 'border-neutral-700 hover:border-cyan-500/80 bg-neutral-950/90 hover:bg-neutral-900 shadow-cyan-500/10'
          }`}
        >
          <div className="relative z-10 flex flex-col items-center text-center p-4">
            <RotateCcw
              className={`w-8 h-8 mb-2 transition-transform ${
                isCalibrating ? 'animate-spin text-emerald-400' : 'text-neutral-400 group-hover:text-cyan-400'
              }`}
            />
            <span className="font-mono text-sm sm:text-base font-bold tracking-widest text-neutral-200 group-hover:text-white">
              {isCalibrating ? 'CALIBRATED!' : 'CALIBRATE'}
            </span>
            <span className="text-[10px] font-mono text-neutral-400 mt-1 uppercase tracking-wider">
              Hold phone naturally & tap
            </span>
          </div>

          {/* Concentric subtle radar pulse ring */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping pointer-events-none opacity-40" />
        </button>

        {/* Last Action / Feedback Notice */}
        <div className="mt-8 font-mono text-xs text-neutral-400 tracking-widest uppercase bg-neutral-950/80 px-4 py-1.5 rounded-full border border-neutral-800">
          {lastActionText}
        </div>
      </div>

      {/* Bottom Bar: Touch Surface Instructions */}
      <div className="flex items-center justify-between text-neutral-500 text-[11px] font-mono border-t border-neutral-900 pt-3 pointer-events-none">
        <div className="flex items-center space-x-2">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>TAP ANYWHERE: SONAR PING</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>TIME: {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
};
