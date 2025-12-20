import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRoom } from '../hooks/useGameRoom';
import { useJoinRoom, useStartGame } from '../hooks/useGameMutations';
import { MAX_NICKNAME_LENGTH } from '@rank-everything/validation';
import { COPY } from '../lib/copy';
import { animations, transitions } from '../lib/design-tokens';
import { PlayerList, RoomCodeDisplay, Input } from './ui';
import QRCodeModal from './QRCodeModal';

export default function RoomLobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const { room, error: roomError, isHost, sendMessage } = useGameRoom(code || '');
  console.log(
    `[RoomLobby] Rendering. Room: ${room?.id}, Players: ${room?.players?.length || 0}, Status: ${room?.status}`
  );

  // Redirect to game if room is already in-progress
  // This handles the race condition where game starts during page reload
  useEffect(() => {
    if (room?.status === 'in-progress' && code) {
      console.log(`[RoomLobby] Room is in-progress, redirecting to game`);
      navigate(`/game/${code}`);
    }
  }, [room?.status, code, navigate]);
  const joinRoom = useJoinRoom();
  const startGame = useStartGame();

  const error = localError || (roomError?.message ?? null);
  const playerId = localStorage.getItem('playerId');

  // Effects removed!

  const handleStartGame = async () => {
    if (!code) return;
    setLocalError(null);
    startGame.mutate(code, {
      onSuccess: () => navigate(`/game/${code}`),
      onError: (error) => setLocalError(error.message),
    });
  };

  const handleJoin = async () => {
    if (!nickname.trim() || !code) return;
    setLocalError(null);

    joinRoom.mutate(
      { code, nickname },
      {
        onSuccess: (data) => {
          localStorage.setItem('playerId', data.playerId);
          localStorage.setItem('roomCode', code);
          window.location.reload();
        },
        onError: (error) => setLocalError(error.message),
      }
    );
  };

  const isJoined = room?.players.some((p) => p.id === playerId);

  // Loading state
  if (!room) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted">
          {COPY.pending.loading}
        </motion.p>
      </div>
    );
  }

  // Not joined state - Show Join Form
  if (!isJoined) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitions.default}
          className="card w-full max-w-sm"
        >
          <div className="text-center mb-6">
            <p className="text-muted mb-2">{COPY.labels.joinRoomTitle}</p>
            <h1 className="text-4xl font-bold tracking-widest font-mono mb-4">{code}</h1>
            <p>{COPY.labels.enterNickname}</p>
          </div>

          <div className="flex flex-col gap-4">
            <Input
              placeholder={COPY.placeholders.nickname}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={MAX_NICKNAME_LENGTH}
              autoFocus
              className="text-center text-lg" // Keeping style but using shared component
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  variants={animations.fadeInUp}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transitions.default}
                  className="p-3 border-2 border-red-500 bg-red-50 text-red-500 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleJoin}
              disabled={!nickname.trim() || joinRoom.isPending}
              className="btn-primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {joinRoom.isPending ? COPY.pending.joining : COPY.buttons.join}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center p-6 max-w-xl mx-auto w-full justify-center">
      {/* Room Code */}
      <RoomCodeDisplay
        code={code || ''}
        showCopyButton={true}
        showQRButton={true}
        onQRClick={() => setShowQRModal(true)}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        roomCode={code || ''}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />

      <AnimatePresence>
        {error && (
          <motion.div
            variants={animations.fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitions.default}
            className="w-full max-w-sm mb-6 p-3 border-2 border-red-500 bg-red-50 text-red-500 text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Players */}
      <PlayerList players={room?.players || []} hostId={room?.hostPlayerId} showCount={true} />

      {/* Settings (host only - editable) */}
      {isHost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.default, delay: 0.2 }}
          className="card w-full max-w-sm mb-6"
        >
          <h2 className="font-bold mb-4">{COPY.labels.settings}</h2>
          <div className="space-y-4 text-sm">
            {/* Timer Toggle */}
            <div className="flex justify-between items-center">
              <span>{COPY.settings.timerEnabled}</span>
              <motion.button
                onClick={() => {
                  sendMessage(
                    JSON.stringify({
                      type: 'update_config',
                      config: { timerEnabled: !room.config.timerEnabled },
                    })
                  );
                }}
                className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
                  room.config.timerEnabled
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-white border-black text-black'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {room.config.timerEnabled ? 'ON' : 'OFF'}
              </motion.button>
            </div>

            {/* Timer Duration (only if timer enabled) */}
            {room.config.timerEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-between items-center"
              >
                <span>{COPY.settings.timerDuration}</span>
                <select
                  value={room.config.timerDuration}
                  onChange={(e) => {
                    sendMessage(
                      JSON.stringify({
                        type: 'update_config',
                        config: { timerDuration: parseInt(e.target.value, 10) },
                      })
                    );
                  }}
                  className="px-2 py-1 border-2 border-black text-sm rounded-none"
                >
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>120s</option>
                </select>
              </motion.div>
            )}

            {/* Submission Mode */}
            <div className="flex justify-between items-center">
              <span>{COPY.settings.submissionMode}</span>
              <select
                value={room.config.submissionMode}
                onChange={(e) => {
                  sendMessage(
                    JSON.stringify({
                      type: 'update_config',
                      config: { submissionMode: e.target.value },
                    })
                  );
                }}
                className="px-2 py-1 border-2 border-black text-sm rounded-none"
              >
                <option value="round-robin">{COPY.settings.roundRobin}</option>
                <option value="host-only">{COPY.settings.hostOnly}</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Start Button (host only) */}
      {isHost && (
        <motion.button
          onClick={handleStartGame}
          disabled={!(room && room.players.length >= 1) || startGame.isPending}
          className="btn-primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.default, delay: 0.3 }}
        >
          {startGame.isPending
            ? COPY.pending.starting
            : room && room.players.length >= 1
              ? COPY.buttons.startGame
              : COPY.labels.needPlayers}
        </motion.button>
      )}

      {!isHost && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="badge-waiting"
        >
          <span className="animate-pulse">●</span>
          {COPY.labels.waitingForHost}
        </motion.div>
      )}
    </div>
  );
}
