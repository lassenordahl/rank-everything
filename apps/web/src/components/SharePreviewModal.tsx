import { motion, AnimatePresence } from 'framer-motion';
import { X, Share } from 'lucide-react';
import { transitions } from '../lib/design-tokens';

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

      // Fallback: Just let user save the image manually (already visible)
      // We could add a toast here saying "Touch and hold to save"
      alert('Press and hold the image to save it to your photos!');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={transitions.spring}
            className="relative w-full max-w-sm bg-surface-100 rounded-3xl p-4 flex flex-col gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-50 p-2 rounded-full shadow-lg border-2 border-surface-200 dark:border-surface-700 hover:scale-110 active:scale-95 transition-transform z-10"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold font-display text-surface-900 dark:text-surface-50">
                Share Results
              </h2>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Save to camera roll or share directly!
              </p>
            </div>

            {/* Image Preview */}
            <div className="relative rounded-xl overflow-hidden shadow-inner bg-surface-50 dark:bg-surface-900/50 aspect-auto min-h-[300px] flex items-center justify-center">
              {imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt="Ranking Results"
                  className="w-full h-auto object-contain"
                />
              ) : (
                <div className="animate-pulse flex flex-col items-center gap-2 text-surface-400">
                  <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Generating image...</span>
                </div>
              )}
            </div>

            {/* Share Action */}
            <button
              onClick={handleShare}
              className="btn-primary w-full flex items-center justify-center gap-3 py-3 text-lg"
            >
              <Share size={20} />
              Share Image
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
