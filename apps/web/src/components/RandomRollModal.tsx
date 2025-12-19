import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GlobalItem } from '@rank-everything/shared-types';
import { transitions } from '../lib/design-tokens';

interface RandomRollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
}

export default function RandomRollModal({ isOpen, onClose, onSelect }: RandomRollModalProps) {
  const [items, setItems] = useState<GlobalItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch random items when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRandomItems();
    }
  }, [isOpen]);

  const fetchRandomItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/random-items?count=10');
      if (response.ok) {
        const data = (await response.json()) as { items: GlobalItem[] };
        setItems(data.items);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Failed to fetch random items:', error);
    }
    setLoading(false);
  };

  const currentItem = items[currentIndex];

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Fetch more items when we reach the end
      fetchRandomItems();
    }
  };

  const handleSelect = () => {
    if (currentItem) {
      onSelect(currentItem.text);
      onClose();
    }
  };

  const handleYolo = () => {
    if (currentItem) {
      onSelect(currentItem.text);
      onClose();
    } else if (items.length > 0) {
      // Pick random from loaded items
      const randomItem = items[Math.floor(Math.random() * items.length)];
      if (randomItem) {
        onSelect(randomItem.text);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={transitions.spring}
          className="modal-content"
        >
          {/* Header */}
          <div className="modal-header">
            <h2 className="text-xl font-bold">Random Roll</h2>
            <motion.button
              onClick={onClose}
              className="text-2xl leading-none hover:text-neutral-500 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ×
            </motion.button>
          </div>

          {/* Content */}
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="text-4xl inline-block"
                >
                  🎲
                </motion.div>
                <p className="text-muted mt-2">Rolling...</p>
              </div>
            ) : currentItem ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentItem.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={transitions.default}
                  className="text-center py-4"
                >
                  <motion.p
                    className="text-6xl mb-4"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={transitions.springBouncy}
                  >
                    {currentItem.emoji}
                  </motion.p>
                  <p className="text-xl font-bold">{currentItem.text}</p>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">🎰</p>
                <p className="text-muted">No items available</p>
                <p className="text-sm text-muted mt-2">Play some games to build up the pool!</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-footer space-y-3">
            <div className="flex gap-3">
              <motion.button
                onClick={handleNext}
                disabled={loading}
                className="btn flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Next
              </motion.button>
              <motion.button
                onClick={handleSelect}
                disabled={loading || !currentItem}
                className="btn-accent flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Use This
              </motion.button>
            </div>

            <motion.button
              onClick={handleYolo}
              disabled={loading || items.length === 0}
              className="btn-primary w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🎲 YOLO Roll
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
