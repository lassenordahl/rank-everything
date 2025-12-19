import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiClient } from '../lib/api';
import { usePartySocket } from '../hooks/usePartySocket';
import { useJoinRoom, useStartGame } from '../hooks/useGameMutations';
import type { Room } from '@rank-everything/shared-types';
import { MAX_NICKNAME_LENGTH } from '@rank-everything/validation';

export default function RoomLobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [nickname, setNickname] = useState('');
  const playerId = localStorage.getItem('playerId');
  const [error, setError] = useState<string | null>(null);

  const { lastMessage } = usePartySocket(code || '');
  const joinRoom = useJoinRoom();
  const startGame = useStartGame();

  useEffect(() => {
    // Initial fetch via HTTP to prevent "Loading..." hang on mobile
    if (code && !room) {
      ApiClient.getRoom(code)
        .then(data => setRoom(data.room))
        .catch(err => console.error('Failed to fetch initial room state:', err));
    }
  }, [code]); // Run once on mount (or code change)

  useEffect(() => {
    if (lastMessage) {
      try {
        const event = JSON.parse(lastMessage);
        if (event.type === 'room_updated') {
          setRoom(event.room);
          setError(null); // Clear errors on success
        }
        if (event.type === 'game_started') {
          navigate(`/game/${code}`);
        }
        if (event.type === 'error') {
          setError(event.message || 'An unknown error occurred');
        }
        if (event.type === 'player_left') {
           // If we just get a player ID left, we might not have the full room update
           // But server sends room_updated for lobby removals now.
           // For game disconnects, it sends player_left.
           // We should probably rely on the room state being updated?
           // The RoomLobby list relies on `room.players`.
           // If we receive `player_left`, we need to update state locally OR wait for `room_updated`.
           // Server logic I wrote sends `broadcast({ type: 'player_left', playerId })` for game disconnects.
           // It sends `room_updated` for lobby removals.
           // So for game disconnects, we need to update the player's connection status locally?
           // OR server should just send `room_updated` always?
           // For now, let's keep it simple.
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [lastMessage, code, navigate]);

  const handleStartGame = async () => {
    if (!code) return;
    setError(null);
    startGame.mutate(code, {
      onError: (error) => setError(error.message)
    });
  };

  const handleJoin = async () => {
    if (!nickname.trim() || !code) return;
    setError(null);

    joinRoom.mutate({ code, nickname }, {
      onSuccess: (data) => {
        localStorage.setItem('playerId', data.playerId);
        localStorage.setItem('roomCode', code);
        window.location.reload();
      },
      onError: (error) => setError(error.message)
    });
  };

  const isHost = room?.hostPlayerId === playerId;
  const canStart = room && room.players.length >= 1;
  const isJoined = room?.players.some(p => p.id === playerId);

  // Loading state
  if (!room) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted">Loading room...</p>
      </div>
    );
  }

  // Not joined state - Show Join Form
  if (!isJoined) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <div className="card w-full max-w-sm">
          <div className="text-center mb-6">
            <p className="text-muted mb-2">Join Room</p>
            <h1 className="text-4xl font-bold tracking-widest mb-4">{code}</h1>
            <p>Enter your nickname to join</p>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input"
              maxLength={MAX_NICKNAME_LENGTH}
              autoFocus
            />

            {error && (
              <div className="p-3 bg-red-100/10 border border-red-500/50 text-red-500 rounded text-sm text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={!nickname.trim() || joinRoom.isPending}
              className="btn disabled:opacity-50"
            >
              {joinRoom.isPending ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center p-6">
      {/* Room Code */}
      <div className="text-center mb-8">
        <p className="text-muted mb-2">Room Code</p>
        <h1 className="text-6xl font-bold tracking-widest">{code}</h1>
      </div>

      {error && (
        <div className="w-full max-w-sm mb-6 p-3 bg-red-100/10 border border-red-500/50 text-red-500 rounded text-sm text-center">
          {error}
        </div>
      )}

      {/* Players */}
      <div className="card w-full max-w-sm mb-8">
        <h2 className="font-bold mb-4">Players ({room?.players.length || 0})</h2>
        <ul className="space-y-2">
          {room?.players.map((player) => (
            <li key={player.id} className="flex items-center gap-2">
              <span className={player.connected ? 'text-green-600' : 'text-red-600'}>
                {player.connected ? '●' : '○'}
              </span>
              <span>{player.nickname}</span>
              {player.id === room.hostPlayerId && (
                <span className="text-muted text-sm">(host)</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Settings (host only) */}
      {isHost && (
        <div className="card w-full max-w-sm mb-8">
          <h2 className="font-bold mb-4">Settings</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Mode:</span>
              <span>{room.config.submissionMode}</span>
            </div>
            <div className="flex justify-between">
              <span>Timer:</span>
              <span>
                {room.config.timerEnabled ? `${room.config.timerDuration}s` : 'Off'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Start Button (host only) */}
      {isHost && (
        <button
          onClick={handleStartGame}
          disabled={!canStart || startGame.isPending}
          className="btn disabled:opacity-50"
        >
          {startGame.isPending ? 'Starting...' : (canStart ? 'Start Game' : 'Need 1+ Players')}
        </button>
      )}

      {!isHost && (
        <p className="text-muted">Waiting for host to start...</p>
      )}
    </div>
  );
}
