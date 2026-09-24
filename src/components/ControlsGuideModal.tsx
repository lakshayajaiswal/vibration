/**
 * Controls & Sensory Navigation Guide Modal
 */

import React from 'react';
import {
  X,
  Smartphone,
  Vibrate,
  Radio,
  Volume2,
  Compass,
  EyeOff,
  Keyboard,
  ShieldAlert,
} from 'lucide-react';

interface ControlsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsGuideModal: React.FC<ControlsGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-200 font-mono max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-lg text-white mb-1">How to Play ShadowBlind</h3>
        <p className="text-xs text-neutral-400 mb-6">Tactile & Acoustic Eyes-Free Navigation</p>

        <div className="space-y-4 text-xs">
          {/* Motion Tilt */}
          <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 space-y-1.5">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold">
              <Smartphone className="w-4 h-4" />
              <span>1. MOTION CONTROL & TILT</span>
            </div>
            <p className="text-neutral-300">
              Hold your smartphone comfortably. Tilt forward to move forward, tilt left/right to steer.
              Tap <strong>CALIBRATE</strong> at any time to set your current holding angle as the neutral rest position.
            </p>
            <div className="flex items-center space-x-2 pt-1 text-[11px] text-neutral-400">
              <Keyboard className="w-3.5 h-3.5 text-neutral-400" />
              <span>Desktop: Use <strong>WASD</strong> or <strong>Arrow Keys</strong> or drag with mouse!</span>
            </div>
          </div>

          {/* Haptic Vocabulary */}
          <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <Vibrate className="w-4 h-4" />
              <span>2. THE HAPTIC SENSORY VOCABULARY</span>
            </div>
            <div className="space-y-1 text-neutral-300 text-[11px]">
              <div>
                <strong className="text-white">Wall Graze:</strong> Single sharp tap <code className="text-emerald-400">[30ms]</code> when sliding past a wall.
              </div>
              <div>
                <strong className="text-white">Wall Press:</strong> Continuous low-frequency stutter <code className="text-emerald-400">[15ms, 30ms]</code> when pushing hard into an obstacle.
              </div>
              <div>
                <strong className="text-white">Exit Beacon:</strong> Heartbeat pulses that speed up as you get closer to the escape portal.
              </div>
              <div>
                <strong className="text-white">Escape Success:</strong> Rhythmic victory flourish <code className="text-emerald-400">[100, 50, 100, 50, 300]</code>.
              </div>
            </div>
          </div>

          {/* Spatial Audio & Sonar */}
          <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-purple-400 font-bold">
              <Volume2 className="w-4 h-4" />
              <span>3. SPATIAL AUDIO & ECHOLOCATION</span>
            </div>
            <p className="text-neutral-300">
              Wear headphones! The beacon pings in your left or right ear corresponding to the exit's direction.
              Tap the screen or press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-purple-300">Space</kbd> to emit a <strong>Sonar Echolocation Ping</strong> that bounces off nearby walls.
            </p>
          </div>

          {/* Blindfold & Blackout Mode */}
          <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-bold">
              <EyeOff className="w-4 h-4" />
              <span>4. BLINDFOLD & BLACKOUT TESTING</span>
            </div>
            <p className="text-neutral-300">
              Toggle <strong>HIDE WALLS [B]</strong> to black out canvas walls so judges can test closing their eyes and navigating purely via touch & audio.
              Toggle <strong>FULL BLINDFOLD</strong> to turn the entire screen into an eyes-free touch surface.
            </p>
          </div>

          {/* iOS Safari Fallback & Level Loop */}
          <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <Radio className="w-4 h-4" />
              <span>5. IOS SAFARI AUDIO-HAPTIC FALLBACK</span>
            </div>
            <p className="text-neutral-300 text-[11px]">
              On iOS Safari (where Web Vibration is restricted), subtle synthesized acoustic clicks & stutter beeps automatically replace physical vibration.
              Reaching the sanctuary exit triggers a distinct win pulse and smoothly transitions into Level 2!
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition active:scale-95 text-xs"
          >
            LET'S ESCAPE
          </button>
        </div>
      </div>
    </div>
  );
};
