/**
 * QRCodeModal Component
 *
 * Full-screen modal that displays a QR code for easy room sharing.
 * Uses the current window.location.origin for URL compatibility across all deployments.
 */

import { useState, useEffect } from 'react';
import { generateQRCode } from '@rank-everything/qrcode';
import { COPY } from '../lib/copy';
import { componentClasses } from '../lib/design-tokens';

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center justify-center p-8 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Room Code */}
        <h1 className="text-5xl font-bold tracking-widest text-white mb-4">{roomCode}</h1>

        {/* Label */}
        <p className="text-white/70 text-lg mb-6">{COPY.labels.scanToJoin}</p>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg shadow-2xl w-full max-w-[400px] aspect-square flex items-center justify-center">
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

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`${componentClasses.buttonSecondary} mt-8 border-white`}
        >
          {COPY.buttons.close}
        </button>
      </div>
    </div>
  );
}
