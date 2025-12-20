/**
 * QRCodeModal Component
 *
 * Full-screen view that displays a QR code for easy room sharing.
 * Uses the animated background for visual consistency with the rest of the app.
 */

import { useState, useEffect } from 'react';
import { generateQRCode } from '@rank-everything/qrcode';
import { COPY } from '../lib/copy';
import { AnimatedBackground } from './AnimatedBackground';

interface QRCodeModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ roomCode, isOpen, onClose }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const generateQR = async () => {
      setIsLoading(true);
      try {
        // Use current origin for URL compatibility across all deployments
        const joinUrl = `${window.location.origin}/${roomCode}`;
        const dataUrl = await generateQRCode(joinUrl, {
          size: 400,
          margin: 2,
          darkColor: '#000000',
          lightColor: '#ffffff',
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [isOpen, roomCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Animated gradient background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-full p-8 gap-6">
        {/* Room Code - matches homepage display font */}
        <h1 className="text-5xl font-bold tracking-widest text-black font-mono">{roomCode}</h1>

        {/* Label */}
        <p className="text-black/70 text-lg font-medium">{COPY.labels.scanToJoin}</p>

        {/* QR Code with inset highlight */}
        <div className="bg-white p-4 border-2 border-black w-full max-w-[320px] aspect-square flex items-center justify-center inset-highlight shadow-[4px_4px_0_0_#000] card-shadow">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Generating...</div>
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code to join room ${roomCode}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-red-500 text-center">
              Failed to generate QR code
            </div>
          )}
        </div>

        {/* Close Button with inset */}
        <button onClick={onClose} className="btn-primary mt-4 inset-shadow">
          {COPY.buttons.close}
        </button>
      </div>
    </div>
  );
}
