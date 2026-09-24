/**
 * Mobile QR Code Modal
 * Generates an instant QR code of the current HTTPS app URL
 * so players can test real DeviceOrientation motion sensors and
 * Web Vibration API on their iPhone or Android device!
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, ShieldCheck, ExternalLink, Copy, Check } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-200 font-mono">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Play on Mobile</h3>
            <p className="text-xs text-neutral-400">Real Gyroscope & Tactile Vibration</p>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner my-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Game QR Code" className="w-56 h-56 rounded-lg" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-neutral-600 text-xs">
              Generating QR Code...
            </div>
          )}
        </div>

        {/* Mobile Instructions */}
        <div className="space-y-2 text-xs text-neutral-400 mb-5 bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800/80">
          <div className="flex items-start space-x-2">
            <span className="text-cyan-400 font-bold">1.</span>
            <span>Scan with your phone camera (iOS Camera or Android Chrome).</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-cyan-400 font-bold">2.</span>
            <span>Tap "Enable Motion Sensors" when prompted on iOS Safari.</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-cyan-400 font-bold">3.</span>
            <span>Put on headphones and switch to Blindfold Mode for full immersion!</span>
          </div>
        </div>

        {/* Copy Link Button */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-300 truncate font-mono select-all focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition active:scale-95 whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-white" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
