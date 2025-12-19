import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGameRoom } from '../hooks/useGameRoom';
import type { Item } from '@rank-everything/shared-types';
import RevealScreen from './RevealScreen';
import RandomRollModal from './RandomRollModal';
import { COPY } from '../lib/copy';

export default function GameView() {
  const { code } = useParams<{ code: string }>();
  const [inputText, setInputText] = useState('');
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [showRandomRoll, setShowRandomRoll] = useState(false);
  const [now, setNow] = useState(Date.now());

  const { room, sendMessage, isMyTurn, playerId } = useGameRoom(code || '');

  // Derive current item to rank from room state
  // Find the most recent unranked item for this player
  const myRankings = room?.players.find((p) => p.id === playerId)?.rankings || {};
  const unrankedItem = room?.items.find((item) => !(item.id in myRankings)) || null;

  // Use derived unrankedItem, but allow manual override via setCurrentItem for immediate feedback
  const effectiveCurrentItem = currentItem ?? unrankedItem;

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Show reveal screen if game has ended
  if (room?.status === 'ended' && playerId) {
    return <RevealScreen room={room} playerId={playerId} />;
  }

  const currentPlayer = room?.players.find((p) => p.id === room?.currentTurnPlayerId);

  const handleSubmitItem = () => {
    if (!inputText.trim() || !isMyTurn) return;

    sendMessage(
      JSON.stringify({
        type: 'submit_item',
        text: inputText.trim(),
      })
    );

    setInputText('');
  };

  const handleRandomRollSelect = (text: string) => {
    sendMessage(
      JSON.stringify({
        type: 'submit_item',
        text,
      })
    );
  };

  const handleRankItem = (ranking: number) => {
    if (!effectiveCurrentItem) return;

    sendMessage(
      JSON.stringify({
        type: 'rank_item',
        itemId: effectiveCurrentItem.id,
        ranking,
      })
    );

    // Clear manual override - derived state will take over
    setCurrentItem(null);
  };

  // Get which slots are already used
  const usedSlots = new Set(Object.values(myRankings));

  // Calculate timer display (uses `now` state that updates every second)
  const timerRemaining = room?.timerEndAt
    ? Math.max(0, Math.ceil((room.timerEndAt - now) / 1000))
    : null;

  return (
    <div className="min-h-full flex flex-col p-6">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-sm text-muted">Room {code}</p>
        <p className="text-lg font-bold">{room?.items.length || 0} / 10 items</p>
        {timerRemaining !== null && timerRemaining > 0 && (
          <p
            className={`text-sm ${timerRemaining <= 10 ? 'text-red-600 font-bold' : 'text-muted'}`}
          >
            {timerRemaining}s remaining
          </p>
        )}
      </div>

      {/* Turn Indicator */}
      <div className="text-center mb-6">
        {isMyTurn ? (
          <p className="text-2xl font-bold">{COPY.game.yourTurn}</p>
        ) : (
          <p className="text-xl text-muted">
            {COPY.game.waitingFor} {currentPlayer?.nickname || '...'}
          </p>
        )}
      </div>

      {/* Submit Item (when it's your turn and no item to rank) */}
      {isMyTurn && !effectiveCurrentItem && (
        <div className="card mb-6">
          <input
            type="text"
            placeholder={COPY.game.enterItem}
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
              {COPY.game.submit}
            </button>
            <button onClick={() => setShowRandomRoll(true)} className="btn" title="Random Roll">
              🎲
            </button>
          </div>
        </div>
      )}

      {/* Current Item to Rank */}
      {effectiveCurrentItem && (
        <div className="card mb-6 text-center">
          <p className="text-4xl mb-2">{effectiveCurrentItem.emoji}</p>
          <p className="text-xl font-bold mb-4">{effectiveCurrentItem.text}</p>
          <p className="text-muted mb-4">{COPY.game.chooseSlot}</p>

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
        <h2 className="font-bold mb-4">{COPY.game.myRankings}</h2>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((slot) => {
            const item = room?.items.find((i) => myRankings[i.id] === slot);
            return (
              <div
                key={slot}
                className={`flex items-center gap-2 py-1 ${slot === 1 ? 'font-bold' : ''}`}
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
