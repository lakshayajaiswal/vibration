import React, { useState, useEffect } from 'react';
import { Trophy, X, EyeOff, Sparkles, User, Award, Shield, Loader2, ArrowRight } from 'lucide-react';
import { HANDCRAFTED_LEVELS } from '../maze/mazeData';
import { LeaderboardRecordData, subscribeToLevelLeaderboard } from '../firebase/firestoreService';
import { useFirebase } from '../firebase/FirebaseContext';
import { soundEngine } from '../audio/soundEngine';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevelId: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentLevelId,
}) => {
  const { user, signIn } = useFirebase();
  const [selectedLevelId, setSelectedLevelId] = useState<string>(currentLevelId);
  const [filterBlindfoldOnly, setFilterBlindfoldOnly] = useState<boolean>(false);
  const [records, setRecords] = useState<LeaderboardRecordData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedLevelId(currentLevelId);
    }
  }, [isOpen, currentLevelId]);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribe = subscribeToLevelLeaderboard(
      selectedLevelId,
      (data) => {
        setRecords(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, selectedLevelId]);

  if (!isOpen) return null;

  const currentLevelInfo = HANDCRAFTED_LEVELS.find((l) => l.id === selectedLevelId) || HANDCRAFTED_LEVELS[0];

  const filteredRecords = records.filter((r) => {
    if (filterBlindfoldOnly && !r.blindfoldMode) return false;
    return true;
  });

  const handleGoogleSignIn = async () => {
    try {
      soundEngine.init();
      setIsSigningIn(true);
      await signIn();
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md font-mono">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-wide flex items-center gap-2">
                CHAMBER LEADERBOARD
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full uppercase">
                  Real-time
                </span>
              </h2>
              <p className="text-xs text-neutral-400">Global tactile escape records verified by Firestore</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Selector & Filter Bar */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">Chamber:</span>
            <select
              value={selectedLevelId}
              onChange={(e) => setSelectedLevelId(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
            >
              {HANDCRAFTED_LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name} ({lvl.difficulty})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setFilterBlindfoldOnly((prev) => !prev)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              filterBlindfoldOnly
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Blindfold Runs Only</span>
          </button>
        </div>

        {/* User Auth Banner if Not Signed In */}
        {!user && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <p className="text-xs text-cyan-200">
                Sign in with Google to record your escape times and claim your call-sign on the leaderboard!
              </p>
            </div>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSigningIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5" />}
              <span>Sign In</span>
            </button>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-500 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
              <span>Fetching chamber records from Firestore...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-16 px-4 bg-neutral-900/40 rounded-xl border border-neutral-900">
              <Shield className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
              <p className="text-neutral-300 font-semibold text-sm">No chamber records logged yet</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                {filterBlindfoldOnly
                  ? 'No blindfold runs completed on this chamber yet. Be the first to navigate eyes-free!'
                  : 'Be the first navigator to escape this chamber and set the benchmark time!'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecords.map((record, idx) => {
                const isCurrentUser = user && user.uid === record.userId;
                return (
                  <div
                    key={record.id || `${record.userId}_${idx}`}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      isCurrentUser
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                        : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    {/* Rank & Player Info */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center font-bold text-xs">
                        {idx === 0 ? (
                          <span className="text-lg">🥇</span>
                        ) : idx === 1 ? (
                          <span className="text-lg">🥈</span>
                        ) : idx === 2 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="text-neutral-500">#{idx + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 flex-shrink-0 flex items-center justify-center">
                        {record.userPhoto ? (
                          <img src={record.userPhoto} alt={record.userName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>

                      {/* Name & Badge */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-white truncate max-w-[140px] sm:max-w-xs">
                            {record.userName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-neutral-400">
                          {record.blindfoldMode ? (
                            <span className="inline-flex items-center space-x-1 text-amber-400 font-semibold">
                              <EyeOff className="w-3 h-3" />
                              <span>Blindfolded</span>
                            </span>
                          ) : (
                            <span>Spectator</span>
                          )}
                          <span>•</span>
                          <span>{record.collisionsCount} scrapes</span>
                          <span>•</span>
                          <span>{record.sonarPingsCount} pings</span>
                        </div>
                      </div>
                    </div>

                    {/* Completion Time */}
                    <div className="text-right flex-shrink-0 pl-3">
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        {record.timeSeconds.toFixed(1)}s
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {new Date(record.achievedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Chamber Par: {currentLevelInfo.parTimeSeconds}s</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
