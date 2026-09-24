/**
 * Victory / Escape Success Celebration Modal with Firebase Leaderboard Sync & Gemini Debrief
 */

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Clock,
  Zap,
  Radio,
  RotateCcw,
  ArrowRight,
  EyeOff,
  Award,
  Sparkles,
  User,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { MazeLevel } from '../types';
import { useFirebase } from '../firebase/FirebaseContext';
import { recordRunSubmission } from '../firebase/firestoreService';
import { soundEngine } from '../audio/soundEngine';

interface VictoryModalProps {
  isOpen: boolean;
  level: MazeLevel;
  elapsedSeconds: number;
  collisionsCount: number;
  sonarPingsCount: number;
  isBlindfold: boolean;
  onNextLevel: () => void;
  onReplay: (blindfold: boolean) => void;
  onOpenLeaderboard?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  level,
  elapsedSeconds,
  collisionsCount,
  sonarPingsCount,
  isBlindfold,
  onNextLevel,
  onReplay,
  onOpenLeaderboard,
}) => {
  const { user, signIn } = useFirebase();
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [callSign, setCallSign] = useState<string>('');
  const [commentary, setCommentary] = useState<string>('');
  const [isDebriefLoading, setIsDebriefLoading] = useState<boolean>(false);

  // Trigger confetti & debrief analysis on mount
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#38bdf8', '#a855f7', '#fbbf24'],
        });
      } catch {
        // Safe ignore
      }

      // Fetch AI tactical debrief from Gemini API
      setIsDebriefLoading(true);
      fetch('/api/gemini/tactical-debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelName: level.name,
          timeSeconds: elapsedSeconds,
          collisionsCount,
          sonarPingsCount,
          blindfoldMode: isBlindfold,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setCallSign(data.callSign || (isBlindfold ? 'Blindfold Ghost' : 'Sanctuary Pathfinder'));
          setCommentary(data.commentary || 'Sensory navigation complete. Sanctuary portal accessed cleanly.');
        })
        .catch(() => {
          setCallSign(isBlindfold ? 'Blindfold Vanguard' : 'Acoustic Scout');
          setCommentary('Escape telemetry registered successfully.');
        })
        .finally(() => setIsDebriefLoading(false));
    }
  }, [isOpen, level.name, elapsedSeconds, collisionsCount, sonarPingsCount, isBlindfold]);

  // Save run to Firebase when signed in
  useEffect(() => {
    if (isOpen && user && !isSaved && !isSaving) {
      setIsSaving(true);
      recordRunSubmission({
        levelId: level.id,
        levelName: level.name,
        timeSeconds: elapsedSeconds,
        collisionsCount,
        sonarPingsCount,
        blindfoldMode: isBlindfold,
      })
        .then(() => {
          setIsSaved(true);
        })
        .catch((err) => {
          console.error('Failed to submit score to Firestore:', err);
        })
        .finally(() => setIsSaving(false));
    }
  }, [isOpen, user, isSaved, isSaving, level.id, level.name, elapsedSeconds, collisionsCount, sonarPingsCount, isBlindfold]);

  if (!isOpen) return null;

  // Grade calculation
  let grade = 'A';
  if (isBlindfold && collisionsCount < 6) grade = 'S+ (Master Navigator)';
  else if (isBlindfold) grade = 'S (True Blindfold)';
  else if (collisionsCount < 10) grade = 'A (Tactical Scout)';
  else grade = 'B (Survivor)';

  const handleSignInAndSave = async () => {
    soundEngine.init();
    try {
      await signIn();
    } catch (e) {
      console.error('Sign-in error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md font-mono">
      <div className="relative w-full max-w-md bg-neutral-950 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl text-neutral-200 text-center max-h-[95vh] overflow-y-auto">
        {/* Glowing Trophy Icon */}
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/20">
          <Trophy className="w-7 h-7 animate-bounce" />
        </div>

        <h3 className="font-bold text-lg sm:text-xl text-white tracking-wide mb-0.5">ESCAPE SUCCESSFUL</h3>
        <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-3">
          {level.name} Cleared
        </p>

        {/* Tactical Call-Sign from Gemini Debrief */}
        <div className="mb-4 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-left">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Tactical Evaluation</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
              GRADE: {grade}
            </span>
          </div>

          <div className="text-sm font-bold text-white mb-1">
            Call-Sign: <span className="text-cyan-300">{callSign || (isDebriefLoading ? 'Analyzing...' : 'Tactile Pathfinder')}</span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            {commentary || (isDebriefLoading ? 'Analyzing sensory acoustic vectors...' : 'Sanctuary portal cleared.')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 text-xs mb-4">
          <div>
            <div className="text-neutral-500 text-[10px]">TIME</div>
            <div className="font-bold text-white text-sm">
              {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-[9px] text-neutral-400">par {level.parTimeSeconds}s</div>
          </div>

          <div>
            <div className="text-neutral-500 text-[10px]">WALL CONTACTS</div>
            <div className="font-bold text-amber-400 text-sm">{collisionsCount}</div>
            <div className="text-[9px] text-neutral-400">scrapes</div>
          </div>

          <div>
            <div className="text-neutral-500 text-[10px]">SONAR PINGS</div>
            <div className="font-bold text-cyan-400 text-sm">{sonarPingsCount}</div>
            <div className="text-[9px] text-neutral-400">echos</div>
          </div>
        </div>

        {/* Leaderboard / Firestore Sync Status */}
        {user ? (
          <div className="mb-4 flex items-center justify-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Syncing escape run to Firestore leaderboard...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verified & Saved to Chamber Leaderboard</span>
              </>
            )}
          </div>
        ) : (
          <div className="mb-4 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-left">
            <div>
              <div className="text-xs font-bold text-white">Save your record?</div>
              <div className="text-[10px] text-neutral-400">Sign in to rank on the live global leaderboard</div>
            </div>
            <button
              onClick={handleSignInAndSave}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onNextLevel}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>NEXT CHAMBER</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs tracking-wider uppercase transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>VIEW CHAMBER LEADERBOARD</span>
            </button>
          )}

          {!isBlindfold && (
            <button
              onClick={() => onReplay(true)}
              className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-300 font-bold text-xs tracking-wider uppercase transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <EyeOff className="w-4 h-4 text-amber-400" />
              <span>REPLAY IN BLINDFOLD MODE</span>
            </button>
          )}

          <button
            onClick={() => onReplay(isBlindfold)}
            className="w-full py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RETRY CURRENT CHAMBER</span>
          </button>
        </div>
      </div>
    </div>
  );
};
