import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');

  const handleCreateRoom = async () => {
    if (!nickname.trim()) return;

    try {
      // Generate a random room code (in production, this would come from the server)
      const code = generateRoomCode();

      // Create room via API
      const response = await fetch(`/party/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', nickname }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('playerId', data.playerId);
        localStorage.setItem('roomCode', code);
        navigate(`/room/${code}`);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim() || !joinCode.trim()) return;

    try {
      const code = joinCode.toUpperCase();

      const response = await fetch(`/party/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', nickname }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('playerId', data.playerId);
        localStorage.setItem('roomCode', code);
        navigate(`/room/${code}`);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  // Generate random 4-letter room code
  function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

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
            maxLength={20}
          />

          <button
            onClick={handleCreateRoom}
            disabled={!nickname.trim()}
            className="btn disabled:opacity-50"
          >
            Create
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
          maxLength={4}
        />

        <input
          type="text"
          placeholder="Your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="input"
          maxLength={20}
        />

        <button
          onClick={handleJoinRoom}
          disabled={!nickname.trim() || joinCode.length !== 4}
          className="btn disabled:opacity-50"
        >
          Join
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
