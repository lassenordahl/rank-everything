import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRoom } from '../hooks/useGameRoom';
import { useEmojiClassifier } from '../hooks/useEmojiClassifier';
import type { Item } from '@rank-everything/shared-types';
import RevealScreen from './RevealScreen';
import RandomRollModal from './RandomRollModal';
import { COPY } from '../lib/copy';
import { transitions } from '../lib/design-tokens';
import { RankingList, RankingSlot, GameSubmission } from './ui';
import TimerProgressBar from './TimerProgressBar';

export default function GameView() {
  const { code } = useParams<{ code: string }>();
  const [inputText, setInputText] = useState('');
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [showRandomRoll, setShowRandomRoll] = useState(false);
  const [now, setNow] = useState(Date.now());

  const { room, sendMessage, isMyTurn, isHost, playerId } = useGameRoom(code || '');

  // Emoji classification from local LLM
  const {
    emoji: classifiedEmoji,
    isClassifying,
    isModelLoading,
    modelProgress,
  } = useEmojiClassifier(inputText);

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
    return (
      <RevealScreen room={room} playerId={playerId} isHost={isHost} sendMessage={sendMessage} />
    );
  }

  const currentPlayer = room?.players.find((p) => p.id === room?.currentTurnPlayerId);

  const handleSubmitItem = () => {
    if (!inputText.trim() || !isMyTurn) return;

    sendMessage(
      JSON.stringify({
        type: 'submit_item',
        text: inputText.trim(),
        emoji: classifiedEmoji || undefined, // Include classified emoji if available
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
    <div className="min-h-full flex flex-col p-6 max-w-xl mx-auto w-full justify-center">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.default}
        className="text-center mb-4"
      >
        <p className="text-sm text-muted">Room {code}</p>
        <p className="text-lg font-bold">
          {room?.items.length || 0} / {room?.config.itemsPerGame ?? 10} items
        </p>
      </motion.div>

      {/* Timer Bar */}
      {timerRemaining !== null && timerRemaining > 0 && room?.config.timerDuration && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          className="mb-4"
        >
          <TimerProgressBar
            secondsRemaining={timerRemaining}
            totalSeconds={room.config.timerDuration}
          />
        </motion.div>
      )}

      {/* Turn Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
      >
        {isMyTurn ? (
          <motion.div
            className="badge-active inline-flex"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {COPY.game.yourTurn}
          </motion.div>
        ) : (
          <div className="badge-waiting inline-flex">
            <span className="animate-pulse">●</span>
            {COPY.game.waitingFor} {currentPlayer?.nickname || '...'}
          </div>
        )}
      </motion.div>

      {/* Submit Item (when it's your turn and no item to rank) */}
      <AnimatePresence mode="wait">
        {isMyTurn && !effectiveCurrentItem && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={transitions.default}
            className="mb-6"
          >
            <GameSubmission
              value={inputText}
              onChange={setInputText}
              onSubmit={handleSubmitItem}
              onRandomClick={() => setShowRandomRoll(true)}
              isClassifying={isClassifying}
              isModelLoading={isModelLoading}
              modelProgress={modelProgress}
              classifiedEmoji={classifiedEmoji}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Item to Rank */}
      <AnimatePresence mode="wait">
        {effectiveCurrentItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={transitions.spring}
            className="card mb-6 text-center"
          >
            <motion.p
              className="text-5xl mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={transitions.springBouncy}
            >
              {effectiveCurrentItem.emoji}
            </motion.p>
            <p className="text-xl font-bold mb-4">{effectiveCurrentItem.text}</p>
            <p className="text-muted mb-4">{COPY.game.chooseSlot}</p>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <RankingSlot
                  key={n}
                  rank={n}
                  item={null}
                  onClick={() => handleRankItem(n)}
                  disabled={usedSlots.has(n)}
                  interactive={true}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Rankings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-auto"
      >
        <RankingList
          rankings={myRankings}
          items={room?.items || []}
          itemsPerGame={room?.config.itemsPerGame || 10}
          showHeader={true}
          headerTitle={COPY.game.myRankings}
          animate={true}
        />
      </motion.div>

      {/* Random Roll Modal */}
      <RandomRollModal
        isOpen={showRandomRoll}
        onClose={() => setShowRandomRoll(false)}
        onSelect={handleRandomRollSelect}
      />
    </div>
  );
}
