import React, { useState, useEffect } from 'react';
import { Radio, X, Volume2, Sparkles, Send, Compass, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { MazeLevel } from '../types';

interface TacticalAuraModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: MazeLevel;
  telemetry: {
    distToExit: number;
    normalizedDist: number;
    pan: number;
    speed: number;
    hazardDist: number;
  };
  collisionsCount: number;
  sonarPingsCount: number;
  blindfoldMode: boolean;
}

export const TacticalAuraModal: React.FC<TacticalAuraModalProps> = ({
  isOpen,
  onClose,
  level,
  telemetry,
  collisionsCount,
  sonarPingsCount,
  blindfoldMode,
}) => {
  const [adviceText, setAdviceText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const fetchAdvice = async (prompt?: string) => {
    soundEngine.init();
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/tactical-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelName: level.name,
          difficulty: level.difficulty,
          distToExit: telemetry.distToExit,
          normalizedDist: telemetry.normalizedDist,
          pan: telemetry.pan,
          speed: telemetry.speed,
          collisionsCount,
          sonarPingsCount,
          hazardDist: telemetry.hazardDist,
          blindfoldMode,
          userPrompt: prompt || '',
        }),
      });

      const data = await res.json();
      const text = data.advice || 'Acoustic beacon locked. Advance with steady tilt.';
      setAdviceText(text);

      // Speak advice via speech synthesis
      soundEngine.speak(text);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 4500);
    } catch (e) {
      console.error('Tactical advice request failed:', e);
      setAdviceText('Beacon signal faint. Keep listening to the spatial ping in your headset.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !adviceText) {
      fetchAdvice();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const clockDirection = telemetry.pan < -0.3 ? '10 o\'clock (Left)' : telemetry.pan > 0.3 ? '2 o\'clock (Right)' : '12 o\'clock (Straight Ahead)';
  const proximityPercent = Math.max(0, Math.min(100, Math.round((1 - telemetry.normalizedDist) * 100)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md font-mono">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-3">
            <div className="relative w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm text-white tracking-wider">AURA TACTICAL ORACLE</h2>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1.5 py-0.2 rounded uppercase">
                  Gemini Live
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">Real-time acoustic AI guidance & Doppler radar telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Sonar Telemetry Radar Cards */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800/80 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exit Beacon Angle</span>
            </div>
            <div className="font-bold text-white text-xs">{clockDirection}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Stereo Pan: {telemetry.pan.toFixed(2)}</div>
          </div>

          <div className="p-2.5 bg-neutral-900/60 rounded-xl border border-neutral-800">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Proximity & Doppler</span>
            </div>
            <div className="font-bold text-emerald-400 text-xs">{proximityPercent}% Proximity</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Speed: {telemetry.speed.toFixed(1)} u/s</div>
          </div>
        </div>

        {/* AI Transmission Terminal */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>TACTICAL VOICE TRANSMISSION</span>
              </div>
              {isSpeaking && (
                <div className="flex items-center space-x-1">
                  <span className="w-1 h-3 bg-cyan-400 animate-pulse" />
                  <span className="w-1 h-5 bg-cyan-400 animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-cyan-400 animate-pulse delay-150" />
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="py-6 flex items-center justify-center space-x-2 text-cyan-300 text-xs">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Decoding echolocation waves via Gemini 3.8...</span>
              </div>
            ) : (
              <p className="text-sm text-neutral-200 leading-relaxed font-mono font-medium">
                "{adviceText}"
              </p>
            )}

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-cyan-900/40 text-[10px] text-neutral-400">
              <span>Voice transmission active</span>
              <button
                onClick={() => {
                  soundEngine.init();
                  soundEngine.speak(adviceText);
                }}
                className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Replay Voice</span>
              </button>
            </div>
          </div>

          {/* Quick Tactical Preset Chips */}
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Quick Tactical Inquiries</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fetchAdvice('Where is the sanctuary exit beacon located?')}
                disabled={isLoading}
                className="text-left p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-[11px] transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                📍 Locate Exit Vector
              </button>
              <button
                onClick={() => fetchAdvice('Scan for nearby pitfall traps or hazards.')}
                disabled={isLoading}
                className="text-left p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-[11px] transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                ⚠️ Scan Traps & Hazards
              </button>
              <button
                onClick={() => fetchAdvice('How do I minimize wall scrapes and optimize my tilt?')}
                disabled={isLoading}
                className="text-left p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-[11px] transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                🧭 Tilt & Motion Advice
              </button>
              <button
                onClick={() => fetchAdvice('Give me encouragement and tactical instinct for blindfolded navigation.')}
                disabled={isLoading}
                className="text-left p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-[11px] transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                👁️ Eyes-Free Instinct
              </button>
            </div>
          </div>
        </div>

        {/* Custom Question Input */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-900/60 flex items-center space-x-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customPrompt.trim()) {
                fetchAdvice(customPrompt);
                setCustomPrompt('');
              }
            }}
            placeholder="Ask Aura anything about current maze acoustics..."
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => {
              if (customPrompt.trim()) {
                fetchAdvice(customPrompt);
                setCustomPrompt('');
              }
            }}
            disabled={isLoading || !customPrompt.trim()}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black transition active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
