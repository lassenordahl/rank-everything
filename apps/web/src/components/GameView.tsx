import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRoom } from '../hooks/useGameRoom';
import { useEmojiClassifier } from '../hooks/useEmojiClassifier';
import type { Item } from '@rank-everything/shared-types';
import RevealScreen from './RevealScreen';
import { COPY } from '../lib/copy';
import { transitions } from '../lib/design-tokens';
import { RankingList, RankingSlot, GameSubmission, LoadingSpinner, RoomCodeDisplay, GameStatusBadge } from './ui';
import TimerProgressBar from './TimerProgressBar';
import QRCodeModal from './QRCodeModal';

export default function GameView() {
  const { code } = useParams<{ code: string }>();
  const [inputText, setInputText] = useState('');
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

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

  // Get which slots are already used
  const usedSlots = new Set(Object.values(myRankings));
  const itemsPerGame = room?.config.itemsPerGame ?? 10;
  const numRankingsMade = Object.keys(myRankings).length;

  // Track last auto-ranked item to prevent double-ranking
  const lastAutoRankedRef = useRef<string | null>(null);

  // Track auto-ranking state for UI feedback
  const [isAutoRanking, setIsAutoRanking] = useState(false);

  // Auto-assign ranking when only 1 slot is left (no choice to make)
  // We add a delay to improve UX and prevent race conditions
  // NOTE: We MUST depend on the ID string, not the item object.
  // We also use refs for object dependencies to preventing re-running on every room update.
  const currentItemId = effectiveCurrentItem?.id;
  const myRankingsRef = useRef(myRankings);
  myRankingsRef.current = myRankings;
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    if (!effectiveCurrentItem || !currentItemId) return;

    // Don't auto-rank the same item twice
    // Note: We check this against the ref current value in the logic below if needed,
    // but the dependency on currentItemId handles the trigger.
    if (lastAutoRankedRef.current === currentItemId) return;

    // If we've made itemsPerGame - 1 rankings, there's only 1 slot left
    if (numRankingsMade === itemsPerGame - 1) {
      setIsAutoRanking(true);

      // Find the one remaining slot (using ref to access latest rankings without re-running effect)
      let lastSlot = 1;
      for (let i = 1; i <= itemsPerGame; i++) {
        const slotUsed = Object.values(myRankingsRef.current).includes(i);
        if (!slotUsed) {
          lastSlot = i;
          break;
        }
      }

      console.log(
        `[GameView] Auto-ranking "${effectiveCurrentItem.text}" to slot ${lastSlot} in 1.5s...`
      );
      lastAutoRankedRef.current = currentItemId;

      // Add delay for UX + reliability
      const timer = setTimeout(() => {
        sendMessageRef.current(
          JSON.stringify({
            type: 'rank_item',
            itemId: currentItemId,
            ranking: lastSlot,
          })
        );
        setCurrentItem(null);
        setIsAutoRanking(false);
      }, 1500);

      // Explicitly return cleanup function
      return () => clearTimeout(timer);
    }

    // Explicitly return undefined if no timer set
    return undefined;
  }, [currentItemId, numRankingsMade, itemsPerGame]);

  // Determine if timer should be shown (static check)
  const shouldShowTimer = Boolean(
    room?.timerEndAt && room?.timerEndAt > Date.now() && room?.config.timerDuration
  );

  const handleSubmitItem = useCallback(() => {
    if (!inputText.trim() || !isMyTurn) return;

    sendMessage(
      JSON.stringify({
        type: 'submit_item',
        text: inputText.trim(),
        emoji: classifiedEmoji || undefined, // Include classified emoji if available
      })
    );

    setInputText('');
  }, [inputText, isMyTurn, sendMessage, classifiedEmoji]);

  // Fetch random item and prepopulate the input field
  const handleRandomRoll = useCallback(async () => {
    if (isLoadingRandom) return;
    setIsLoadingRandom(true);
    try {
      const response = await fetch('/api/random-items?count=1');
      if (response.ok) {
        const data = (await response.json()) as { items: { text: string }[] };
        if (data.items?.[0]?.text) {
          setInputText(data.items[0].text);
        }
      }
    } catch (error) {
      console.error('Failed to fetch random item:', error);
    } finally {
      setIsLoadingRandom(false);
    }
  }, [isLoadingRandom]);

  const handleRankItem = useCallback(
    (ranking: number) => {
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
    },
    [effectiveCurrentItem, sendMessage]
  );

  // Show reveal screen if game has ended
  // IMPORTANT: This must come AFTER all hooks to avoid "fewer hooks" error
  if (room?.status === 'ended' && playerId) {
    return <RevealScreen room={room} playerId={playerId} isHost={isHost} sendMessage={sendMessage} />;
  }

  // Loading state
  if (!room) {
    return (
      <>
        <LoadingSpinner />
      </>
    );
  }



  return (
    <>
      <div className="relative z-10 flex-1 flex flex-col p-6 max-w-xl mx-auto w-full justify-center gap-6">
        {/* Header - shared with lobby */}
        <RoomCodeDisplay
          code={code || ''}
          showCopyButton={true}
          showQRButton={true}
          onQRClick={() => setShowQRModal(true)}
        />

        {/* Timer Bar */}
        {shouldShowTimer && room?.timerEndAt && room?.config.timerDuration && (
          <div>
            <TimerProgressBar
              timerEndAt={room.timerEndAt}
              totalSeconds={room.config.timerDuration}
            />
          </div>
        )}

        {/* Dynamic Content Area (Input or Ranking) */}
        <div className="overflow-hidden relative flex flex-col gap-6 p-1">
          {/* Game Status Badge */}
          <div className="flex justify-center">
            <GameStatusBadge
              players={room?.players || []}
              currentTurnPlayerId={room?.currentTurnPlayerId ?? undefined}
              isMyTurn={isMyTurn}
              myPlayerId={playerId ?? undefined}
            />
          </div>

          {/* Content Switching Area: Submission or Ranking */}
          <AnimatePresence mode="popLayout">
            {isMyTurn && !effectiveCurrentItem ? (
              <motion.div
                key="submission-form"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={transitions.default}
                className="w-full"
              >
                <GameSubmission
                  value={inputText}
                  onChange={setInputText}
                  onSubmit={handleSubmitItem}
                  onRandomClick={handleRandomRoll}
                  isClassifying={isClassifying}
                  isModelLoading={isModelLoading}
                  modelProgress={modelProgress}
                  classifiedEmoji={classifiedEmoji}
                />
              </motion.div>
            ) : effectiveCurrentItem ? (
              <motion.div
                key="ranking-panel"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={transitions.spring}
                className="card text-center w-full"
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
                <p className="text-black/70 font-medium mb-4">
                  {isAutoRanking ? 'Auto-assigning last slot...' : COPY.game.chooseSlot}
                </p>

                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: itemsPerGame }, (_, i) => i + 1).map((n) => (
                    <RankingSlot
                      key={n}
                      rank={n}
                      item={null}
                      onClick={() => handleRankItem(n)}
                      disabled={usedSlots.has(n) || isAutoRanking}
                      interactive={true}
                    />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* My Rankings */}
        <div>
          <RankingList
            rankings={myRankings}
            items={room?.items || []}
            itemsPerGame={room?.config.itemsPerGame || 10}
            showHeader={true}
            headerTitle={COPY.game.myRankings}
            animate={true}
          />
        </div>

        <QRCodeModal
          roomCode={code || ''}
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
        />
      </div>
    </>
  );
}
