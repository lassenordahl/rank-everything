import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateRoom, useJoinRoom } from '../hooks/useGameMutations';
import { MAX_NICKNAME_LENGTH, ROOM_CODE_LENGTH } from '@rank-everything/validation';

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
      setError('Connection lost! Redirected to home.');
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
      }
    });
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim() || !joinCode.trim()) return;

    const code = joinCode.toUpperCase();

    joinRoom.mutate({ code, nickname }, {
      onSuccess: (data) => {
        localStorage.setItem('playerId', data.playerId);
        localStorage.setItem('roomCode', code);
        navigate(`/${code}`);
      },
      onError: (error) => {
        setError(error.message);
      }
    });
  };

  if (mode === 'home') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 to-black text-white">
        <h1 className="text-5xl font-extrabold mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Rank Everything
        </h1>
        <p className="text-gray-400 mb-12 text-lg">The ultimate party game for opinions.</p>

        {error && (
            <div className="w-full max-w-xs mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg text-sm text-center shadow-lg backdrop-blur-sm">
              {error}
            </div>
        )}

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => { setError(null); setMode('create'); }}
            className="btn btn-primary w-full py-4 text-lg shadow-xl shadow-purple-900/20"
          >
            Create Room
          </button>

          <button
            onClick={() => { setError(null); setMode('join'); }}
            className="btn btn-outline w-full py-4 text-lg"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-gray-900 text-white">
        <h2 className="text-3xl font-bold mb-8">Create Room</h2>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <input
            type="text"
            placeholder="Your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            maxLength={MAX_NICKNAME_LENGTH}
            autoFocus
          />

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 rounded text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateRoom}
            disabled={!nickname.trim() || createRoom.isPending}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {createRoom.isPending ? 'Creating...' : 'Create'}
          </button>

          <button
            onClick={() => { setError(null); setMode('home'); }}
            className="text-gray-500 hover:text-white transition-colors mt-4"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 bg-gray-900 text-white">
      <h2 className="text-3xl font-bold mb-8">Join Room</h2>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <input
          type="text"
          placeholder="Room code (e.g., ABCD)"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          className="input text-center text-2xl tracking-widest uppercase bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          maxLength={ROOM_CODE_LENGTH}
          autoFocus
        />

        <input
          type="text"
          placeholder="Your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="input bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          maxLength={MAX_NICKNAME_LENGTH}
        />

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 rounded text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleJoinRoom}
          disabled={!nickname.trim() || joinCode.length !== ROOM_CODE_LENGTH || joinRoom.isPending}
          className="btn btn-primary w-full disabled:opacity-50"
        >
          {joinRoom.isPending ? 'Joining...' : 'Join'}
        </button>

        <button
          onClick={() => { setError(null); setMode('home'); }}
          className="text-gray-500 hover:text-white transition-colors mt-4"
        >
          Back
        </button>
      </div>
    </div>
  );
}
