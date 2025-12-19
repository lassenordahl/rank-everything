import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateRoom, useJoinRoom } from '../hooks/useGameMutations';
import { MAX_NICKNAME_LENGTH, ROOM_CODE_LENGTH } from '@rank-everything/validation';

export default function HomePage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  const handleCreateRoom = async () => {
    if (!nickname.trim()) return;

    createRoom.mutate(nickname, {
      onSuccess: (data) => {
        localStorage.setItem('playerId', data.playerId);
        localStorage.setItem('roomCode', data.roomCode);
        navigate(`/${data.roomCode}`);
      },
      onError: (error) => {
        console.error('Failed to create room:', error);
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
        console.error('Failed to join room:', error);
      }
    });
  };

  if (mode === 'home') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <h1 className="text-5xl font-bold mb-2">Rank Everything</h1>
        <p className="text-muted mb-12">A party game for ranking anything</p>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => setMode('create')}
            className="btn"
          >
            Create Room
          </button>

          <button
            onClick={() => setMode('join')}
            className="btn"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <h2 className="text-3xl font-bold mb-8">Create Room</h2>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <input
            type="text"
            placeholder="Your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="input"
            maxLength={MAX_NICKNAME_LENGTH}
          />

          <button
            onClick={handleCreateRoom}
            disabled={!nickname.trim() || createRoom.isPending}
            className="btn disabled:opacity-50"
          >
            {createRoom.isPending ? 'Creating...' : 'Create'}
          </button>

          <button
            onClick={() => setMode('home')}
            className="text-muted underline"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6">
      <h2 className="text-3xl font-bold mb-8">Join Room</h2>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <input
          type="text"
          placeholder="Room code (e.g., ABCD)"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          className="input text-center text-2xl tracking-widest"
          maxLength={ROOM_CODE_LENGTH}
        />

        <input
          type="text"
          placeholder="Your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="input"
          maxLength={MAX_NICKNAME_LENGTH}
        />

        <button
          onClick={handleJoinRoom}
          disabled={!nickname.trim() || joinCode.length !== ROOM_CODE_LENGTH || joinRoom.isPending}
          className="btn disabled:opacity-50"
        >
          {joinRoom.isPending ? 'Joining...' : 'Join'}
        </button>

        <button
          onClick={() => setMode('home')}
          className="text-muted underline"
        >
          Back
        </button>
      </div>
    </div>
  );
}
