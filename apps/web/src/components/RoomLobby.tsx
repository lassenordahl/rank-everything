import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameRoom } from '../hooks/useGameRoom';
import { useJoinRoom, useStartGame } from '../hooks/useGameMutations';
import { MAX_NICKNAME_LENGTH } from '@rank-everything/validation';
import { COPY } from '../lib/copy';
import { transitions } from '../lib/design-tokens';
import { PlayerList, RoomCodeDisplay, Input, LoadingSpinner } from './ui';
import QRCodeModal from './QRCodeModal';
import { AnimatedBackground } from './AnimatedBackground';

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

  const playerId = localStorage.getItem('playerId');
  const isJoined = room?.players?.some((p) => p.id === playerId);

  // Redirect to game if room is already in-progress
  // This handles the race condition where game starts during page reload
  useEffect(() => {
    // Only redirect if we are already part of the game
    // Otherwise, stay here to show the Join Form (late join)
    if (room?.status === 'in-progress' && code && isJoined) {
      console.log(`[RoomLobby] Room is in-progress and player joined, redirecting to game`);
      navigate(`/game/${code}`);
    }
  }, [room?.status, code, navigate, isJoined]);

  const joinRoom = useJoinRoom();
  const startGame = useStartGame();

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

  const error = localError || (roomError?.message ?? null);

  // Loading state
  if (!room) {
    return (
      <>
        <AnimatedBackground />
        <LoadingSpinner />
      </>
    );
  }

  // Not joined state - Show Join Form
  if (!isJoined) {
    return (
      <>
        <AnimatedBackground />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitions.default}
            className="w-full max-w-sm flex flex-col gap-10"
          >
            <div className="text-center">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-black/70 font-medium mb-4">
                {COPY.labels.joinRoomTitle}
              </p>
              <h1 className="text-6xl font-black tracking-tighter uppercase mb-2">{code}</h1>
              <p className="font-mono text-xs uppercase text-black/70 font-medium">
                {COPY.labels.enterNickname}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                placeholder={COPY.placeholders.nickname}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={MAX_NICKNAME_LENGTH}
                autoFocus
                className="text-center text-lg bg-white border-black"
              />

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-3 border-2 border-red-500 bg-red-50 text-red-500 text-xs font-mono font-bold uppercase"
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
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />
      <div className="relative z-10 flex-1 flex flex-col items-center p-6 max-w-xl mx-auto w-full justify-center gap-8 py-12">
        {/* Room Code */}
        <RoomCodeDisplay
          code={code || ''}
          showCopyButton={true}
          showQRButton={true}
          onQRClick={() => setShowQRModal(true)}
        />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-sm p-3 border-2 border-red-500 bg-red-50 text-red-500 text-xs font-mono font-bold uppercase text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm flex flex-col gap-8">
          {/* Players */}
          <PlayerList players={room?.players || []} hostId={room?.hostPlayerId} showCount={true} />
        </div>

        {/* Settings (host only - editable) */}
        {isHost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transitions.default, delay: 0.2 }}
            className="card card-shadow w-full max-w-sm"
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
                    className="px-2 py-1 border-2 border-black text-sm rounded-none bg-white"
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
                  className="px-2 py-1 border-2 border-black text-sm rounded-none bg-white"
                >
                  <option value="round-robin">{COPY.settings.roundRobin}</option>
                  <option value="host-only">{COPY.settings.hostOnly}</option>
                </select>
              </div>

              {/* List Size (Items Per Game) */}
              <div className="flex justify-between items-center">
                <span>{COPY.settings.listSize}</span>
                <select
                  value={room.config.itemsPerGame}
                  onChange={(e) => {
                    sendMessage(
                      JSON.stringify({
                        type: 'update_config',
                        config: { itemsPerGame: parseInt(e.target.value, 10) },
                      })
                    );
                  }}
                  className="px-2 py-1 border-2 border-black text-sm rounded-none bg-white"
                >
                  <option value={3}>3 Items</option>
                  <option value={5}>5 Items</option>
                  <option value={10}>10 Items</option>
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
            className="badge-waiting inset-shadow"
          >
            <span className="animate-pulse">●</span>
            {COPY.labels.waitingForHost}
          </motion.div>
        )}

        {/* Back Button - below start game */}
        <motion.button
          onClick={() => {
            localStorage.removeItem('playerId');
            localStorage.removeItem('roomCode');
            navigate('/');
          }}
          className="btn-secondary text-sm flex items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ delay: 0.4 }}
        >
          <span>←</span>
          <span>Leave Room</span>
        </motion.button>

        <QRCodeModal
          roomCode={code || ''}
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
        />
      </div>
    </>
  );
}
