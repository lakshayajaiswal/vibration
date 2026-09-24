/**
 * Level Select & Procedural Generator Modal
 */

import React from 'react';
import { X, Layers, Sparkles, Trophy, Clock, AlertTriangle } from 'lucide-react';
import { MazeLevel } from '../types';
import { HANDCRAFTED_LEVELS } from '../maze/mazeData';
import { generateProceduralMaze } from '../maze/mazeGenerator';

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevelId: string;
  onSelectLevel: (level: MazeLevel) => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  onClose,
  currentLevelId,
  onSelectLevel,
}) => {
  if (!isOpen) return null;

  const handleGenerateProcedural = (difficulty: 'Normal' | 'Labyrinth' | 'Nightmare') => {
    let size = 15;
    let hazards = 2;
    if (difficulty === 'Labyrinth') {
      size = 19;
      hazards = 4;
    } else if (difficulty === 'Nightmare') {
      size = 23;
      hazards = 6;
    }
    const maze = generateProceduralMaze(size, size, hazards);
    onSelectLevel(maze);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-200 font-mono max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Select Maze Chamber</h3>
            <p className="text-xs text-neutral-400">Handcrafted trials & infinite procedural caverns</p>
          </div>
        </div>

        {/* Handcrafted Levels List */}
        <div className="space-y-2.5 mb-6">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
            Chronological Trials
          </div>
          {HANDCRAFTED_LEVELS.map((lvl, index) => {
            const isSelected = lvl.id === currentLevelId;
            return (
              <div
                key={lvl.id}
                onClick={() => {
                  onSelectLevel(lvl);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between group ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-emerald-500 text-black'
                        : 'bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700'
                    }`}
                  >
                    0{index + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm">{lvl.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-cyan-300 uppercase">
                        {lvl.difficulty}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 line-clamp-1">{lvl.subtitle}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-neutral-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~{lvl.parTimeSeconds}s</span>
                  </div>
                  {isSelected && <span className="text-emerald-400 font-bold text-xs">ACTIVE</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Procedural Generator Section */}
        <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-800">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Generate Infinite Procedural Maze</span>
          </div>
          <p className="text-[11px] text-neutral-400 mb-3">
            Algorithmic labyrinths synthesized with recursive backtracking. Guaranteed solvable with randomized hazard placement.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleGenerateProcedural('Normal')}
              className="py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold transition active:scale-95 text-center"
            >
              <div>Standard (15x15)</div>
              <div className="text-[10px] font-normal text-neutral-400">2 Hazards</div>
            </button>
            <button
              onClick={() => handleGenerateProcedural('Labyrinth')}
              className="py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-cyan-800 text-cyan-200 text-xs font-bold transition active:scale-95 text-center"
            >
              <div>Complex (19x19)</div>
              <div className="text-[10px] font-normal text-cyan-400">4 Hazards</div>
            </button>
            <button
              onClick={() => handleGenerateProcedural('Nightmare')}
              className="py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-amber-800 text-amber-200 text-xs font-bold transition active:scale-95 text-center"
            >
              <div>Abyssal (23x23)</div>
              <div className="text-[10px] font-normal text-amber-400">6 Hazards</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
