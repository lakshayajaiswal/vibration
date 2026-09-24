/**
 * Motion Permission Banner
 * Prompts user on iOS Safari (which requires explicit user gesture to allow DeviceOrientationEvent).
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Check, ArrowRight } from 'lucide-react';
import { motionEngine } from '../motion/motionEngine';
import { soundEngine } from '../audio/soundEngine';

interface MotionPermissionBannerProps {
  onPermissionGranted: () => void;
}

export const MotionPermissionBanner: React.FC<MotionPermissionBannerProps> = ({
  onPermissionGranted,
}) => {
  const [needsPermission, setNeedsPermission] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const data = motionEngine.getData();
    if (data.needsPermission && !data.permissionGranted) {
      setNeedsPermission(true);
    }
  }, []);

  if (!needsPermission || granted) return null;

  const handleGrant = async () => {
    soundEngine.init();
    const success = await motionEngine.requestPermission();
    if (success) {
      setGranted(true);
      onPermissionGranted();
    }
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-40 max-w-md mx-auto bg-neutral-950/95 border-2 border-cyan-500/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between font-mono text-xs">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
          <Smartphone className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="font-bold text-white">Enable Motion Tilt Sensors</div>
          <div className="text-[11px] text-neutral-400">iOS requires permission to read gyroscope tilt</div>
        </div>
      </div>

      <button
        onClick={handleGrant}
        className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition active:scale-95 flex items-center space-x-1 shadow-lg shadow-cyan-500/30 whitespace-nowrap"
      >
        <span>ENABLE</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
