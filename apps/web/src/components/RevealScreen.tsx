import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Room, Player } from '@rank-everything/shared-types';

interface RevealScreenProps {
  room: Room;
  playerId: string;
}

export default function RevealScreen({ room, playerId }: RevealScreenProps) {
  const navigate = useNavigate();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const rankingRef = useRef<HTMLDivElement>(null);

  const players = room.players;
  const currentPlayer = players[currentPlayerIndex];
  const isMyList = currentPlayer.id === playerId;

  // Get sorted rankings for a player
  const getPlayerRankings = (player: Player) => {
    const rankings: Array<{ rank: number; item: typeof room.items[0] | null }> = [];

    for (let i = 1; i <= 10; i++) {
      const itemId = Object.entries(player.rankings).find(([, rank]) => rank === i)?.[0];
      const item = itemId ? room.items.find(it => it.id === itemId) ?? null : null;
      rankings.push({ rank: i, item });
    }

    return rankings;
  };

  const rankings = getPlayerRankings(currentPlayer);

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
    } catch (error) {
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
    // Navigate back to lobby to start new game
    navigate(`/room/${room.id}`);
  };

  const handleExit = () => {
    localStorage.removeItem('playerId');
    localStorage.removeItem('roomCode');
    navigate('/');
  };

  return (
    <div className="min-h-full flex flex-col p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
        <p className="text-muted">Room {room.id}</p>
      </div>

      {/* Player Selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={goToPrevPlayer}
          className="p-2 border-2 border-black hover:bg-black hover:text-white"
        >
          ←
        </button>

        <div className="text-center">
          <p className="text-xl font-bold">
            {currentPlayer.nickname}
            {isMyList && <span className="text-muted text-sm ml-2">(you)</span>}
          </p>
          <p className="text-sm text-muted">
            {currentPlayerIndex + 1} of {players.length}
          </p>
        </div>

        <button
          onClick={goToNextPlayer}
          className="p-2 border-2 border-black hover:bg-black hover:text-white"
        >
          →
        </button>
      </div>

      {/* Rankings Card */}
      <div ref={rankingRef} className="card mb-6 bg-white">
        <div className="text-center mb-4 pb-4 border-b-2 border-black">
          <p className="text-2xl font-bold">{currentPlayer.nickname}'s Rankings</p>
        </div>

        <div className="space-y-2">
          {rankings.map(({ rank, item }) => (
            <div
              key={rank}
              className={`flex items-center gap-3 p-2 ${
                rank === 1 ? 'bg-gray-100' : ''
              }`}
            >
              <span className="w-8 text-xl font-bold text-right">{rank}.</span>
              {item ? (
                <>
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="flex-1">{item.text}</span>
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-muted">rankeverything.com • Room {room.id}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-auto">
        <button onClick={handleScreenshot} className="btn">
          📸 Save Screenshot
        </button>

        <div className="flex gap-3">
          <button onClick={handlePlayAgain} className="btn flex-1">
            Play Again
          </button>
          <button onClick={handleExit} className="btn flex-1">
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
