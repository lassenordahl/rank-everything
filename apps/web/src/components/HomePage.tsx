import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateRoom, useJoinRoom } from '../hooks/useGameMutations';
import { MAX_NICKNAME_LENGTH, ROOM_CODE_LENGTH } from '@rank-everything/validation';
import { COPY } from '../lib/copy';

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
        <h1 className="text-5xl font-bold mb-2">{COPY.appTitle}</h1>
        <p className="text-gray-500 mb-12">{COPY.appTagline}</p>

        {error && (
          <div className="w-full max-w-xs mb-6 p-3 border-2 border-red-500 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => {
              setError(null);
              setMode('create');
            }}
            className="btn"
          >
            {COPY.buttons.createRoom}
          </button>

          <button
            onClick={() => {
              setError(null);
              setMode('join');
            }}
            className="btn"
          >
            {COPY.buttons.joinRoom}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <h2 className="text-3xl font-bold mb-8">{COPY.labels.createRoomTitle}</h2>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <input
            type="text"
            placeholder={COPY.placeholders.nickname}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="input"
            maxLength={MAX_NICKNAME_LENGTH}
            autoFocus
          />

          {error && (
            <div className="p-3 border-2 border-red-500 text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateRoom}
            disabled={!nickname.trim() || createRoom.isPending}
            className="btn disabled:opacity-50"
          >
            {createRoom.isPending ? COPY.pending.creating : COPY.buttons.create}
          </button>

          <button
            onClick={() => {
              setError(null);
              setMode('home');
            }}
            className="text-gray-500 hover:text-black transition-colors mt-4"
          >
            {COPY.buttons.back}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">
      <h2 className="text-3xl font-bold mb-8">{COPY.labels.joinRoomTitle}</h2>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <input
          type="text"
          placeholder={COPY.placeholders.roomCode}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          className="input text-center text-2xl tracking-widest uppercase"
          maxLength={ROOM_CODE_LENGTH}
          autoFocus
        />

        <input
          type="text"
          placeholder={COPY.placeholders.nickname}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="input"
          maxLength={MAX_NICKNAME_LENGTH}
        />

        {error && (
          <div className="p-3 border-2 border-red-500 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleJoinRoom}
          disabled={!nickname.trim() || joinCode.length !== ROOM_CODE_LENGTH || joinRoom.isPending}
          className="btn disabled:opacity-50"
        >
          {joinRoom.isPending ? COPY.pending.joining : COPY.buttons.join}
        </button>

        <button
          onClick={() => {
            setError(null);
            setMode('home');
          }}
          className="text-gray-500 hover:text-black transition-colors mt-4"
        >
          {COPY.buttons.back}
        </button>
      </div>
    </div>
  );
}
