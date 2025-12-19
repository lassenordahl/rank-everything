import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateRoom, useJoinRoom } from '../hooks/useGameMutations';
import { MAX_NICKNAME_LENGTH, ROOM_CODE_LENGTH } from '@rank-everything/validation';
import { COPY } from '../lib/copy';
import { animations, transitions } from '../lib/design-tokens';
import { Input } from './ui';

export default function HomePage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  useEffect(() => {
    // Check for error param from redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'connection_lost') {
      setError(COPY.errors.connectionLost);
      // Clear URL param without reload
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) return;

    createRoom.mutate(nickname, {
      onSuccess: (data) => {
        localStorage.setItem('playerId', data.playerId);
        localStorage.setItem('roomCode', data.roomCode);
        navigate(`/${data.roomCode}`);
      },
      onError: (error) => {
        setError(error.message);
      },
    });
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim() || !joinCode.trim()) return;

    const code = joinCode.toUpperCase();

    joinRoom.mutate(
      { code, nickname },
      {
        onSuccess: (data) => {
          localStorage.setItem('playerId', data.playerId);
          localStorage.setItem('roomCode', code);
          navigate(`/${code}`);
        },
        onError: (error) => {
          setError(error.message);
        },
      }
    );
  };

  if (mode === 'home') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitions.default}
          className="text-center"
        >
          <h1 className="text-5xl font-bold mb-2">{COPY.appTitle}</h1>
          <p className="text-muted mb-12">{COPY.appTagline}</p>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              variants={animations.fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitions.default}
              className="w-full max-w-xs mb-6 p-3 border-2 border-red-500 bg-red-50 text-red-500 text-sm text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.default, delay: 0.1 }}
          className="flex flex-col gap-4 w-full max-w-xs"
        >
          <motion.button
            onClick={() => {
              setError(null);
              setMode('create');
            }}
            className="btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {COPY.buttons.createRoom}
          </motion.button>

          <motion.button
            onClick={() => {
              setError(null);
              setMode('join');
            }}
            className="btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {COPY.buttons.joinRoom}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transitions.default}
        className="min-h-full flex flex-col items-center justify-center p-6"
      >
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitions.default}
          className="text-3xl font-bold mb-8"
        >
          {COPY.labels.createRoomTitle}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.default, delay: 0.1 }}
          className="flex flex-col gap-4 w-full max-w-xs"
        >
          <Input
            placeholder={COPY.placeholders.nickname}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={MAX_NICKNAME_LENGTH}
            autoFocus
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
            onClick={handleCreateRoom}
            disabled={!nickname.trim() || createRoom.isPending}
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {createRoom.isPending ? COPY.pending.creating : COPY.buttons.create}
          </motion.button>

          <button
            onClick={() => {
              setError(null);
              setMode('home');
            }}
            className="text-muted hover:text-black transition-colors mt-4"
          >
            {COPY.buttons.back}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transitions.default}
      className="min-h-full flex flex-col items-center justify-center p-6"
    >
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitions.default}
        className="text-3xl font-bold mb-8"
      >
        {COPY.labels.joinRoomTitle}
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transitions.default, delay: 0.1 }}
        className="flex flex-col gap-4 w-full max-w-xs"
      >
        <Input
          placeholder={COPY.placeholders.roomCode}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          className="text-center text-2xl tracking-widest uppercase font-mono"
          maxLength={ROOM_CODE_LENGTH}
          autoFocus
        />

        <Input
          placeholder={COPY.placeholders.nickname}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={MAX_NICKNAME_LENGTH}
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
          onClick={handleJoinRoom}
          disabled={!nickname.trim() || joinCode.length !== ROOM_CODE_LENGTH || joinRoom.isPending}
          className="btn-primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {joinRoom.isPending ? COPY.pending.joining : COPY.buttons.join}
        </motion.button>

        <button
          onClick={() => {
            setError(null);
            setMode('home');
          }}
          className="text-muted hover:text-black transition-colors mt-4"
        >
          {COPY.buttons.back}
        </button>
      </motion.div>
    </motion.div>
  );
}
