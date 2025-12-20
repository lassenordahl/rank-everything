import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Room } from '@rank-everything/shared-types';
import { transitions } from '../lib/design-tokens';
import { PlayerAvatar, RankingList } from './ui';
import SharePreviewModal from './SharePreviewModal';

interface RevealScreenProps {
  room: Room;
  playerId: string;
  isHost: boolean;
  sendMessage: (message: string) => void;
}

export default function RevealScreen({ room, playerId, isHost, sendMessage }: RevealScreenProps) {
  const navigate = useNavigate();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [shareDataUrl, setShareDataUrl] = useState<string | null>(null);

  const rankingRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const players = room.players;
  const currentPlayer = players[currentPlayerIndex];

  // Guard against undefined player (shouldn't happen but TypeScript requires check)
  if (!currentPlayer) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted">No players found</p>
      </div>
    );
  }

  const isMyList = currentPlayer.id === playerId;

  // Handle share image generation
  const handleShare = async () => {
    if (!shareCardRef.current) return;

    // Show modal immediately with loading state potentially
    setIsShareModalOpen(true);
    // Clear previous result to show loading spinner
    setShareBlob(null);
    setShareDataUrl(null);

    try {
      const html2canvas = (await import('html2canvas')).default;

      // Small delay to ensure render (though React is usually fast enough)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#ffffff', // Force white background as requested
        scale: 2, // High quality
        useCORS: true, // For external images like avatars if needed
        logging: false,
      });

      // Get Data URL for preview
      const dataUrl = canvas.toDataURL('image/png');
      setShareDataUrl(dataUrl);

      // Get Blob for sharing
      canvas.toBlob((blob) => {
        if (blob) {
          setShareBlob(blob);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error generating share image:', error);
      alert('Failed to generate share image. Please try again.');
      setIsShareModalOpen(false);
    }
  };

  // Navigation between players
  const goToPrevPlayer = () => {
    setCurrentPlayerIndex((prev) => (prev - 1 + players.length) % players.length);
  };

  const goToNextPlayer = () => {
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  };

  const handlePlayAgain = () => {
    if (isHost) {
      // Host sends reset_room event to reset room for all players
      sendMessage(JSON.stringify({ type: 'reset_room' }));
    } else {
      // Non-host just navigates back to lobby
      navigate(`/${room.id}`);
    }
  };

  const handleExit = () => {
    localStorage.removeItem('playerId');
    localStorage.removeItem('roomCode');
    navigate('/');
  };

  return (
    <>
      <div className="relative z-10 min-h-full flex flex-col justify-center items-center p-6 gap-6 w-full max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitions.default}
          className="text-center"
        >
          <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
          <p className="text-black/70 font-medium">Room {room.id}</p>
        </motion.div>

        {/* Player Selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-4 w-full"
        >
          <motion.button
            onClick={goToPrevPlayer}
            disabled={players.length <= 1}
            className="btn-secondary p-2 w-12 h-12 flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={players.length > 1 ? { scale: 1.1 } : {}}
            whileTap={players.length > 1 ? { scale: 0.9 } : {}}
            layout
          >
            ←
          </motion.button>

          <div className="text-center flex flex-col items-center gap-1 min-w-[160px]">
            <div className="flex items-center gap-3">
              <PlayerAvatar
                name={currentPlayer.nickname}
                colorIndex={currentPlayerIndex}
                size="md"
              />
              <p className="text-xl font-bold">
                {currentPlayer.nickname}
                {isMyList && <span className="text-muted text-sm ml-2">(you)</span>}
              </p>
            </div>
            <p className="text-xs text-black/70 font-mono tracking-wider font-semibold">
              {currentPlayerIndex + 1} OF {players.length}
            </p>
          </div>

          <motion.button
            onClick={goToNextPlayer}
            disabled={players.length <= 1}
            className="btn-secondary p-2 w-12 h-12 flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={players.length > 1 ? { scale: 1.1 } : {}}
            whileTap={players.length > 1 ? { scale: 0.9 } : {}}
            layout
          >
            →
          </motion.button>
        </motion.div>

        {/* Rankings List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayer.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={transitions.default}
            className="w-full flex justify-center"
          >
            {/* Display version - fits in UI */}
            <div ref={rankingRef} className="w-full max-w-sm">
              <RankingList
                rankings={currentPlayer.rankings}
                items={room.items || []}
                itemsPerGame={room.config.itemsPerGame}
                showHeader={true}
                headerTitle={`${currentPlayer.nickname}'s Rankings`}
                animate={true}
              />

              <div className="text-center mt-4">
                <p className="text-xs text-black/70 font-mono uppercase font-medium">
                  {window.location.host}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3 w-full"
        >
          <motion.button
            onClick={handleShare}
            className="btn-primary w-full inset-shadow flex items-center justify-center gap-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>📸</span>
            <span>Share Rankings</span>
          </motion.button>

          <div className="flex gap-3 w-full">
            <motion.button
              onClick={handlePlayAgain}
              className="btn-primary flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Play Again
            </motion.button>
            <motion.button
              onClick={handleExit}
              className="btn-secondary flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Exit
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Hidden Share Card Generation Container */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div
          ref={shareCardRef}
          className="w-[600px] bg-white p-12 flex flex-col items-center gap-8 rounded-none"
        >
          {/* Title - "Rank Everything" */}
          <h1 className="text-5xl font-black font-display tracking-tight text-black">
            Rank Everything
          </h1>

          <div className="w-full transform scale-100 origin-top">
            <RankingList
              rankings={currentPlayer.rankings}
              items={room.items || []}
              itemsPerGame={room.config.itemsPerGame}
              showHeader={true}
              headerTitle={`${currentPlayer.nickname}'s Rankings`}
              animate={false} // No animation for snapshot
            />
          </div>

          <div className="flex flex-col items-center gap-2 mt-4 opacity-70">
            <p className="text-lg font-mono font-bold tracking-widest uppercase">
              rank-everything.pages.dev
            </p>
          </div>
        </div>
      </div>

      {/* Share Preview Modal */}
      <SharePreviewModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        imageBlob={shareBlob}
        imageDataUrl={shareDataUrl}
      />
    </>
  );
}
