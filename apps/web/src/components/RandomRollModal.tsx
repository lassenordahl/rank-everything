import { useState, useEffect } from 'react';
import type { GlobalItem } from '@rank-everything/shared-types';

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
        const data = await response.json() as { items: GlobalItem[] };
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
      onSelect(randomItem.text);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-2 border-black w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black">
          <h2 className="text-xl font-bold">Random Roll</h2>
          <button onClick={onClose} className="text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted">Loading...</p>
            </div>
          ) : currentItem ? (
            <div className="text-center py-4">
              <p className="text-5xl mb-4">{currentItem.emoji}</p>
              <p className="text-xl font-bold">{currentItem.text}</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted">No items available</p>
              <p className="text-sm text-muted mt-2">
                Play some games to build up the pool!
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t-2 border-black space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleNext}
              disabled={loading}
              className="btn flex-1"
            >
              Next
            </button>
            <button
              onClick={handleSelect}
              disabled={loading || !currentItem}
              className="btn flex-1"
            >
              Use This
            </button>
          </div>

          <button
            onClick={handleYolo}
            disabled={loading || items.length === 0}
            className="btn w-full bg-black text-white hover:bg-gray-800"
          >
            🎲 YOLO Roll
          </button>
        </div>
      </div>
    </div>
  );
}
