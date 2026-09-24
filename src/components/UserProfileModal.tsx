import React, { useState, useEffect } from 'react';
import { User, X, LogOut, Award, EyeOff, Trophy, Shield, Clock, Calendar } from 'lucide-react';
import { useFirebase } from '../firebase/FirebaseContext';
import { PersonalRunData, subscribeToUserRuns } from '../firebase/firestoreService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, signOut } = useFirebase();
  const [runs, setRuns] = useState<PersonalRunData[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;
    setLoadingRuns(true);
    const unsubscribe = subscribeToUserRuns(user.uid, (userRuns) => {
      setRuns(userRuns);
      setLoadingRuns(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md font-mono">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500/50 bg-neutral-800 flex items-center justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Player'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-neutral-400" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">{user.displayName || 'Shadow Navigator'}</h2>
              <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="p-4 grid grid-cols-3 gap-2.5 bg-neutral-950 border-b border-neutral-800 text-center">
          <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
            <div className="text-[10px] text-neutral-500 tracking-wider uppercase mb-1">Total Escapes</div>
            <div className="text-xl font-bold text-emerald-400">{profile?.totalEscapes ?? 0}</div>
            <div className="text-[9px] text-neutral-400 mt-0.5">completed</div>
          </div>

          <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
            <div className="text-[10px] text-neutral-500 tracking-wider uppercase mb-1">Blindfold Runs</div>
            <div className="text-xl font-bold text-amber-400">{profile?.blindfoldEscapes ?? 0}</div>
            <div className="text-[9px] text-neutral-400 mt-0.5">pure sensory</div>
          </div>

          <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800">
            <div className="text-[10px] text-neutral-500 tracking-wider uppercase mb-1">Personal Record</div>
            <div className="text-xl font-bold text-cyan-400">
              {profile?.bestTimeSeconds && profile.bestTimeSeconds > 0 ? `${profile.bestTimeSeconds.toFixed(1)}s` : '--'}
            </div>
            <div className="text-[9px] text-neutral-400 mt-0.5">fastest time</div>
          </div>
        </div>

        {/* Run History */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-neutral-300 tracking-wider uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chamber Escape Log</span>
            </h3>
            <span className="text-[10px] text-neutral-500">{runs.length} logged</span>
          </div>

          {loadingRuns ? (
            <div className="py-10 text-center text-xs text-neutral-500">Loading escape history...</div>
          ) : runs.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-500 bg-neutral-900/30 rounded-xl border border-neutral-900">
              No chamber escapes logged yet. Complete a maze run to start your sensory log!
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((r, i) => (
                <div
                  key={r.id || i}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-800/80 text-xs"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{r.levelName}</span>
                      {r.blindfoldMode && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/40">
                          Blindfold
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      {r.collisionsCount} scrapes • {r.sonarPingsCount} sonar pings
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-400">{r.timeSeconds.toFixed(1)}s</div>
                    <div className="text-[9px] text-neutral-500">
                      {new Date(r.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <button
            onClick={async () => {
              await signOut();
              onClose();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 transition cursor-pointer border border-red-900/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
