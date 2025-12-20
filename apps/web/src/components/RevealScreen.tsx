import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Room } from '@rank-everything/shared-types';
import { transitions } from '../lib/design-tokens';
import { PlayerAvatar, RankingList } from './ui';

interface RevealScreenProps {
  room: Room;
  playerId: string;
  isHost: boolean;
  sendMessage: (message: string) => void;
}

export default function RevealScreen({ room, playerId, isHost, sendMessage }: RevealScreenProps) {
  const navigate = useNavigate();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const rankingRef = useRef<HTMLDivElement>(null);

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

  // Use simple ranking construction for clipboard text fallback (since RankingList is just UI)
  const rankings = Array.from({ length: 10 }, (_, i) => {
    const rank = i + 1;
    const itemId = Object.entries(currentPlayer.rankings).find(([, r]) => r === rank)?.[0];
    const item = itemId ? (room.items.find((it) => it.id === itemId) ?? null) : null;
    return { rank, item };
  });

  // Handle screenshot
  const handleScreenshot = async () => {
    if (!rankingRef.current) return;

    try {
      // Use html2canvas if available, otherwise fallback to clipboard
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(rankingRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rank-everything-${room.id}-${currentPlayer.nickname}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch {
      // Fallback: copy text version to clipboard
      const text = rankings
        .map(({ rank, item }) => `${rank}. ${item?.emoji || ''} ${item?.text || '—'}`)
        .join('\n');

      await navigator.clipboard.writeText(`${currentPlayer.nickname}'s Rankings:\n${text}`);
      alert('Rankings copied to clipboard!');
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
            <PlayerAvatar name={currentPlayer.nickname} colorIndex={currentPlayerIndex} size="md" />
            <p className="text-xl font-bold">
              {currentPlayer.nickname}
              {isMyList && <span className="text-muted text-sm ml-2">(you)</span>}
            </p>
          </div>
          <p className="text-xs text-muted font-mono tracking-wider">
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
          {/* Screenshot Wrapper - added padding to prevent cut-off */}
          <div ref={rankingRef} className="w-full max-w-sm bg-white p-4 rounded-xl">
            <RankingList
              rankings={currentPlayer.rankings}
              items={room.items || []}
              itemsPerGame={room.config.itemsPerGame}
              showHeader={true}
              headerTitle={`${currentPlayer.nickname}'s Rankings`}
              animate={true}
            />

            <div className="text-center mt-4">
              <p className="text-xs text-muted font-mono uppercase">{window.location.host}</p>
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
          onClick={handleScreenshot}
          className="btn-secondary w-full"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          📸 Share Rankings
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
  );
}
