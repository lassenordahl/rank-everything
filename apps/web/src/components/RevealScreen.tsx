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
    <div className="min-h-full flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.default}
        className="text-center mb-6"
      >
        <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
        <p className="text-muted">Room {room.id}</p>
      </motion.div>

      {/* Player Selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center gap-4 mb-6"
      >
        <motion.button
          onClick={goToPrevPlayer}
          className="btn p-2"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ←
        </motion.button>

        <div className="text-center flex items-center gap-3">
          <PlayerAvatar name={currentPlayer.nickname} colorIndex={currentPlayerIndex} size="md" />
          <div>
            <p className="text-xl font-bold">
              {currentPlayer.nickname}
              {isMyList && <span className="text-muted text-sm ml-2">(you)</span>}
            </p>
            <p className="text-sm text-muted">
              {currentPlayerIndex + 1} of {players.length}
            </p>
          </div>
        </div>

        <motion.button
          onClick={goToNextPlayer}
          className="btn p-2"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          →
        </motion.button>
      </motion.div>

      {/* Rankings Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPlayer.id}
          ref={rankingRef}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={transitions.default}
          className="card mb-6 bg-white"
        >
          <div className="card w-full max-w-sm">
            <div className="card-header text-center">
              <h3 className="font-bold">{currentPlayer.nickname}'s Rankings</h3>
            </div>
            <RankingList
              rankings={currentPlayer.rankings}
              items={room.items || []} // Assuming room.items exists or is derived
              itemsPerGame={room.config.itemsPerGame}
              showHeader={false}
              animate={true}
            />
          </div>

          <div className="text-center mt-4 pt-4 border-t border-neutral-200">
            <p className="text-xs text-muted">rankeverything.com • Room {room.id}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3 mt-auto"
      >
        <motion.button
          onClick={handleScreenshot}
          className="btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          📸 Save Screenshot
        </motion.button>

        <div className="flex gap-3">
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
            className="btn flex-1"
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
