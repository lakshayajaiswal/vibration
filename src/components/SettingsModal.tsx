/**
 * Settings & Sensory Calibration Modal
 * Allows adjusting audio volume, spatial 3D sound, haptic intensity,
 * motion sensitivity, dead-zone, and manual tilt simulation tester.
 */

import React, { useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Vibrate,
  Sliders,
  Compass,
  Mic,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { GameSettings } from '../types';
import { soundEngine } from '../audio/soundEngine';
import { hapticsEngine } from '../haptics/hapticsEngine';
import { motionEngine } from '../motion/motionEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [simX, setSimX] = useState(0);
  const [simY, setSimY] = useState(0);

  if (!isOpen) return null;

  const handleTestHaptic = () => {
    soundEngine.init();
    hapticsEngine.wallGraze();
  };

  const handleTestStutter = () => {
    soundEngine.init();
    hapticsEngine.startWallStutter();
    setTimeout(() => hapticsEngine.stopWallStutter(), 500);
  };

  const handleTestAudioBeacon = () => {
    soundEngine.init();
    soundEngine.playBeaconPing(0.2, 0.6);
  };

  const handleSimChange = (x: number, y: number) => {
    setSimX(x);
    setSimY(y);
    motionEngine.setSimulatedTilt(x, y);
  };

  const handleResetSim = () => {
    setSimX(0);
    setSimY(0);
    motionEngine.setSimulatedTilt(null, null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-200 font-mono max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Sensory Settings</h3>
            <p className="text-xs text-neutral-400">Audio, Haptics & Motion Calibration</p>
          </div>
        </div>

        <div className="space-y-6 text-xs">
          {/* SECTION 1: HAPTICS & VIBRATION */}
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Vibrate className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white uppercase tracking-wider">Haptic Feedback</span>
              </div>
              <button
                onClick={() => {
                  const next = !settings.hapticsEnabled;
                  onUpdateSettings({ hapticsEnabled: next });
                  hapticsEngine.setEnabled(next);
                }}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  settings.hapticsEnabled ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {settings.hapticsEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Haptic Strength */}
            <div>
              <div className="text-neutral-400 mb-1.5">Vibration Intensity</div>
              <div className="grid grid-cols-3 gap-2">
                {(['soft', 'medium', 'strong'] as const).map((str) => (
                  <button
                    key={str}
                    onClick={() => {
                      onUpdateSettings({ hapticStrength: str });
                      hapticsEngine.setStrength(str);
                    }}
                    className={`py-1.5 rounded-lg border text-center uppercase tracking-wider text-[11px] transition ${
                      settings.hapticStrength === str
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {str}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Haptics buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={handleTestHaptic}
                className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition"
              >
                Test Graze [30]
              </button>
              <button
                onClick={handleTestStutter}
                className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition"
              >
                Test Stutter [15,30]
              </button>
            </div>

            {/* iOS Safari Synthesized Audio Fallback */}
            <div className="pt-2 border-t border-neutral-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <div className="text-white font-semibold text-xs">iOS Safari Audio Fallback</div>
                  <div className="text-[10px] text-neutral-400">
                    Subtle synthesized clicks & beeps when navigator.vibrate is restricted
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !settings.audioHapticsFallback;
                    onUpdateSettings({ audioHapticsFallback: next });
                    hapticsEngine.setAudioFallback(next);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    settings.audioHapticsFallback
                      ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                      : 'bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {settings.audioHapticsFallback ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => {
                    soundEngine.init();
                    soundEngine.playTactileClick('sharp', 0.8);
                  }}
                  className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-[10px] transition"
                >
                  Test iOS Click
                </button>
                <button
                  onClick={() => {
                    soundEngine.init();
                    soundEngine.playTactileStutter();
                  }}
                  className="flex-1 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-[10px] transition"
                >
                  Test iOS Stutter
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: AUDIO SYNTHESIZER */}
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {settings.audioEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-neutral-500" />
                )}
                <span className="font-bold text-white uppercase tracking-wider">Spatial Audio Engine</span>
              </div>
              <button
                onClick={() => {
                  const next = !settings.audioEnabled;
                  onUpdateSettings({ audioEnabled: next });
                  soundEngine.setMuted(!next);
                }}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  settings.audioEnabled ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {settings.audioEnabled ? 'MUTED' : 'UNMUTED'}
              </button>
            </div>

            {/* Master Volume */}
            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>Master Volume</span>
                <span className="text-cyan-400">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings({ masterVolume: val });
                  soundEngine.setVolume(val);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Spatial Audio & Voice cues toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  const next = !settings.spatialAudio;
                  onUpdateSettings({ spatialAudio: next });
                  soundEngine.setSpatialAudio(next);
                }}
                className={`py-2 px-3 rounded-lg border text-left flex items-center justify-between transition ${
                  settings.spatialAudio
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <span>3D Stereo Pan</span>
                <span className="font-bold">{settings.spatialAudio ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => {
                  const next = !settings.voiceCues;
                  onUpdateSettings({ voiceCues: next });
                }}
                className={`py-2 px-3 rounded-lg border text-left flex items-center justify-between transition ${
                  settings.voiceCues
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <span>Voice Guidance</span>
                <span className="font-bold">{settings.voiceCues ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <button
              onClick={handleTestAudioBeacon}
              className="w-full py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition"
            >
              Test Beacon Chime
            </button>
          </div>

          {/* SECTION 3: MOTION SENSORS & TILT CALIBRATION */}
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white uppercase tracking-wider">Motion & Gyro Sensitivity</span>
            </div>

            {/* Sensitivity Slider */}
            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>Tilt Sensitivity</span>
                <span className="text-amber-400">{settings.tiltSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={settings.tiltSensitivity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings({ tiltSensitivity: val });
                  motionEngine.setConfig({ sensitivity: val });
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Invert Controls */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const next = !settings.invertPitch;
                  onUpdateSettings({ invertPitch: next });
                  motionEngine.setConfig({ invertPitch: next });
                }}
                className={`py-1.5 px-3 rounded-lg border text-center transition ${
                  settings.invertPitch
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                Invert Pitch: {settings.invertPitch ? 'YES' : 'NO'}
              </button>

              <button
                onClick={() => {
                  const next = !settings.invertRoll;
                  onUpdateSettings({ invertRoll: next });
                  motionEngine.setConfig({ invertRoll: next });
                }}
                className={`py-1.5 px-3 rounded-lg border text-center transition ${
                  settings.invertRoll
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                Invert Roll: {settings.invertRoll ? 'YES' : 'NO'}
              </button>
            </div>
          </div>

          {/* SECTION 4: DESKTOP TILT SIMULATOR TESTER */}
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white uppercase tracking-wider">Desktop Sensor Simulator</span>
              </div>
              <button
                onClick={handleResetSim}
                className="flex items-center space-x-1 text-[11px] text-neutral-400 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-400">
              For testing tilt physics on laptops or desktop computers without physical gyroscopes:
            </p>

            <div>
              <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                <span>Roll (Left / Right)</span>
                <span className="text-indigo-400">{Math.round(simX * 100)}%</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={simX}
                onChange={(e) => handleSimChange(parseFloat(e.target.value), simY)}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                <span>Pitch (Forward / Back)</span>
                <span className="text-indigo-400">{Math.round(simY * 100)}%</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={simY}
                onChange={(e) => handleSimChange(simX, parseFloat(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>
          {/* SECTION 5: BLINDFOLD & LEVEL CLEAR LOOP */}
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-amber-400 font-bold">👁️‍🗨️</span>
              <span className="font-bold text-white uppercase tracking-wider">Blindfold & Level Clear Loop</span>
            </div>

            {/* Blackout Walls Toggle */}
            <div className="flex items-center justify-between py-1 border-b border-neutral-800">
              <div>
                <div className="text-white font-semibold text-xs">Blackout / Hide Walls</div>
                <div className="text-[10px] text-neutral-400">
                  Hides canvas walls so judges can test closing their eyes and navigating purely via touch
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ blackoutWalls: !settings.blackoutWalls })}
                className={`px-3 py-1 rounded-md font-bold transition text-xs ${
                  settings.blackoutWalls ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {settings.blackoutWalls ? 'HIDDEN' : 'VISIBLE'}
              </button>
            </div>

            {/* Auto-Advance Level Toggle */}
            <div className="flex items-center justify-between py-1 border-b border-neutral-800">
              <div>
                <div className="text-white font-semibold text-xs">Seamless Level Clear Loop</div>
                <div className="text-[10px] text-neutral-400">
                  Immediately pulses on goal reach and smoothly transitions to Level 2 without freezing
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ autoAdvanceLevel: !settings.autoAdvanceLevel })}
                className={`px-3 py-1 rounded-md font-bold transition text-xs ${
                  settings.autoAdvanceLevel ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {settings.autoAdvanceLevel ? 'AUTO-ADVANCE' : 'MODAL PAUSE'}
              </button>
            </div>

            {/* Test Win Pulse Sound */}
            <button
              onClick={() => {
                soundEngine.init();
                soundEngine.playWinPulse();
                hapticsEngine.exitReached();
              }}
              className="w-full py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold transition"
            >
              Test Distinct Win Pulse Fanfare
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition active:scale-95 text-xs"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
