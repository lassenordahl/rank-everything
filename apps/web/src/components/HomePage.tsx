import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateRoom, useJoinRoom } from '../hooks/useGameMutations';
import { MAX_NICKNAME_LENGTH, ROOM_CODE_LENGTH } from '@rank-everything/validation';
import { COPY } from '../lib/copy';
import { transitions } from '../lib/design-tokens';
import { Input } from './ui';
import { AnimatedBackground } from './AnimatedBackground';

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

  return (
    <>
      <AnimatedBackground />
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Main Content Area - Open Layout */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitions.spring}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {mode === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={transitions.default}
                  className="flex flex-col gap-12"
                >
                  <div className="text-center">
                    <motion.h1 className="text-6xl sm:text-7xl font-black mb-1 tracking-tighter uppercase leading-[0.8]">
                      RANK
                      <br />
                      EVERYTHING
                    </motion.h1>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/70 font-medium mt-4">
                      {COPY.appTagline}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <motion.button
                      onClick={() => setMode('create')}
                      className="btn-primary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {COPY.buttons.createRoom}
                    </motion.button>

                    <motion.button
                      onClick={() => setMode('join')}
                      className="btn-secondary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {COPY.buttons.joinRoom}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {mode === 'create' && (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={transitions.default}
                  className="flex flex-col gap-8 text-center"
                >
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
                    {COPY.labels.createRoomTitle}
                  </h2>

                  <div className="flex flex-col gap-4">
                    <Input
                      placeholder={COPY.placeholders.nickname}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={MAX_NICKNAME_LENGTH}
                      autoFocus
                      className="text-center bg-white border-black"
                    />

                    <motion.button
                      onClick={handleCreateRoom}
                      disabled={!nickname.trim() || createRoom.isPending}
                      className="btn-primary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {createRoom.isPending ? COPY.pending.creating : COPY.buttons.create}
                    </motion.button>

                    <motion.button
                      onClick={() => setMode('home')}
                      className="btn-secondary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {COPY.buttons.back}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {mode === 'join' && (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={transitions.default}
                  className="flex flex-col gap-8 text-center"
                >
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
                    {COPY.labels.joinRoomTitle}
                  </h2>

                  <div className="flex flex-col gap-4">
                    <Input
                      placeholder={COPY.placeholders.roomCode}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="text-center text-3xl tracking-[0.2em] uppercase font-mono bg-white border-black"
                      maxLength={ROOM_CODE_LENGTH}
                      autoFocus
                    />

                    <Input
                      placeholder={COPY.placeholders.nickname}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={MAX_NICKNAME_LENGTH}
                      className="text-center bg-white border-black"
                    />

                    <motion.button
                      onClick={handleJoinRoom}
                      disabled={
                        !nickname.trim() ||
                        joinCode.length !== ROOM_CODE_LENGTH ||
                        joinRoom.isPending
                      }
                      className="btn-primary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {joinRoom.isPending ? COPY.pending.joining : COPY.buttons.join}
                    </motion.button>

                    <motion.button
                      onClick={() => setMode('home')}
                      className="btn-secondary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {COPY.buttons.back}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Global Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-8 p-4 bg-red-500 text-white font-mono text-[10px] font-bold uppercase tracking-tight border-2 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
              >
                <div className="flex justify-between items-center">
                  <span>Error: {error}</span>
                  <button onClick={() => setError(null)}>✕</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
