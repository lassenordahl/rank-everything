import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { usePartySocket } from '../hooks/usePartySocket';
import type { Room, Item } from '@rank-everything/shared-types';
import RevealScreen from './RevealScreen';
import RandomRollModal from './RandomRollModal';

export default function GameView() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const [room, setRoom] = useState<Room | null>(null);
  const [inputText, setInputText] = useState('');
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [showRandomRoll, setShowRandomRoll] = useState(false);
  const playerId = localStorage.getItem('playerId');

  const { sendMessage, lastMessage } = usePartySocket(code || '');

  useEffect(() => {
    if (lastMessage) {
      try {
        const event = JSON.parse(lastMessage);
        if (event.type === 'room_updated') {
          setRoom(event.room);
        }
        if (event.type === 'item_submitted') {
          setCurrentItem(event.item);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [lastMessage]);

  // Show reveal screen if game has ended
  if (room?.status === 'ended' && playerId) {
    return <RevealScreen room={room} playerId={playerId} />;
  }

  const isMyTurn = room?.currentTurnPlayerId === playerId;
  const currentPlayer = room?.players.find(p => p.id === room?.currentTurnPlayerId);
  const myRankings = room?.players.find(p => p.id === playerId)?.rankings || {};

  const handleSubmitItem = () => {
    if (!inputText.trim() || !isMyTurn) return;

    sendMessage(JSON.stringify({
      type: 'submit_item',
      text: inputText.trim(),
    }));

    setInputText('');
  };

  const handleRandomRollSelect = (text: string) => {
    sendMessage(JSON.stringify({
      type: 'submit_item',
      text,
    }));
  };

  const handleRankItem = (ranking: number) => {
    if (!currentItem) return;

    sendMessage(JSON.stringify({
      type: 'rank_item',
      itemId: currentItem.id,
      ranking,
    }));

    setCurrentItem(null);
  };

  // Get which slots are already used
  const usedSlots = new Set(Object.values(myRankings));

  // Calculate timer display
  const timerRemaining = room?.timerEndAt
    ? Math.max(0, Math.ceil((room.timerEndAt - Date.now()) / 1000))
    : null;

  return (
    <div className="min-h-full flex flex-col p-6">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-sm text-muted">Room {code}</p>
        <p className="text-lg font-bold">
          {room?.items.length || 0} / 10 items
        </p>
        {timerRemaining !== null && timerRemaining > 0 && (
          <p className={`text-sm ${timerRemaining <= 10 ? 'text-red-600 font-bold' : 'text-muted'}`}>
            {timerRemaining}s remaining
          </p>
        )}
      </div>

      {/* Turn Indicator */}
      <div className="text-center mb-6">
        {isMyTurn ? (
          <p className="text-2xl font-bold">Your turn!</p>
        ) : (
          <p className="text-xl text-muted">
            Waiting for {currentPlayer?.nickname || '...'}
          </p>
        )}
      </div>

      {/* Submit Item (when it's your turn) */}
      {isMyTurn && !currentItem && (
        <div className="card mb-6">
          <input
            type="text"
            placeholder="Enter something to rank..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitItem()}
            className="input mb-4"
            maxLength={100}
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={handleSubmitItem}
              disabled={!inputText.trim()}
              className="btn flex-1 disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={() => setShowRandomRoll(true)}
              className="btn"
              title="Random Roll"
            >
              🎲
            </button>
          </div>
        </div>
      )}

      {/* Current Item to Rank */}
      {currentItem && (
        <div className="card mb-6 text-center">
          <p className="text-4xl mb-2">{currentItem.emoji}</p>
          <p className="text-xl font-bold mb-4">{currentItem.text}</p>
          <p className="text-muted mb-4">Choose a slot (1 = best, 10 = worst):</p>

          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => handleRankItem(n)}
                disabled={usedSlots.has(n)}
                className={`
                  p-3 border-2 border-black font-bold transition-colors
                  ${usedSlots.has(n) ? 'opacity-30 cursor-not-allowed bg-gray-100' : 'hover:bg-black hover:text-white'}
                `}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* My Rankings */}
      <div className="card mt-auto">
        <h2 className="font-bold mb-4">My Rankings</h2>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((slot) => {
            const item = room?.items.find(i => myRankings[i.id] === slot);
            return (
              <div
                key={slot}
                className={`flex items-center gap-2 py-1 ${
                  slot === 1 ? 'font-bold' : ''
                }`}
              >
                <span className="w-6 text-right">{slot}.</span>
                {item ? (
                  <>
                    <span>{item.emoji}</span>
                    <span className="truncate flex-1">{item.text}</span>
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Random Roll Modal */}
      <RandomRollModal
        isOpen={showRandomRoll}
        onClose={() => setShowRandomRoll(false)}
        onSelect={handleRandomRollSelect}
      />
    </div>
  );
}
