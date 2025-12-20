import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Download } from 'lucide-react';
import { transitions } from '../lib/design-tokens';
import { AnimatedBackground } from './AnimatedBackground';

interface SharePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageBlob: Blob | null;
  imageDataUrl: string | null;
}

export default function SharePreviewModal({
  isOpen,
  onClose,
  imageBlob,
  imageDataUrl,
}: SharePreviewModalProps) {
  const handleShare = async () => {
    if (!imageBlob) return;

    try {
      // Check if Web Share API is supported with files
      if (navigator.share && navigator.canShare) {
        const file = new File([imageBlob], 'rank-everything-results.png', {
          type: 'image/png',
        });

        const shareData = {
          files: [file],
          title: 'Rank Everything Results',
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }

      // Fallback: Just let user save the image manually
      // We could add a toast here saying "Touch and hold to save"
      alert('Press and hold the image to save it to your photos!');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = 'rank-everything-results.png';
    link.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-white"
        >
          {/* Background */}
          <AnimatedBackground />
          <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-6">
            <h2 className="text-3xl font-bold font-display text-black text-center">
              Share Results
            </h2>

            {/* Image Preview Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={transitions.spring}
              className="bg-white p-4 border-2 border-black w-full shadow-[8px_8px_0_0_#000] flex items-center justify-center relative"
            >
              {imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt="Ranking Results"
                  className="w-full h-auto object-contain max-h-[50vh]"
                />
              ) : (
                <div className="aspect-[4/5] w-full flex flex-col items-center justify-center gap-4 py-20 text-black/50">
                  <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono font-bold tracking-widest text-sm uppercase">Generating...</span>
                </div>
              )}

              {/* Close Button - positioned on corner of card for style */}
              <button
                onClick={onClose}
                className="absolute -top-4 -right-4 bg-white text-black p-2 border-2 border-black hover:scale-110 active:scale-95 transition-transform z-10 shadow-[2px_2px_0_0_#000]"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </motion.div>

            <p className="text-black/70 text-center font-medium px-4">
              {imageDataUrl
                ? "Tap to share, or long-press to save image"
                : "Creating your custom ranking card..."}
            </p>

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <button
                onClick={handleShare}
                disabled={!imageBlob}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-4"
              >
                <Share size={20} />
                Share
              </button>

              {/* Desktop download button fallback, usually hidden on mobile by share logic but good to have */}
              <button
                onClick={handleDownload}
                disabled={!imageDataUrl}
                className="btn-secondary px-4 flex items-center justify-center"
                title="Download"
              >
                <Download size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
