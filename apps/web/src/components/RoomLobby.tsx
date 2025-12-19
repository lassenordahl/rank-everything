import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePartySocket } from '../hooks/usePartySocket';
import { useJoinRoom, useStartGame } from '../hooks/useGameMutations';
import { config } from '../lib/config';
import type { Room } from '@rank-everything/shared-types';

export default function RoomLobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const playerId = localStorage.getItem('playerId');

  const { lastMessage, sendMessage } = usePartySocket(code || '');
  const joinRoom = useJoinRoom();
  const startGame = useStartGame();

  useEffect(() => {
    if (lastMessage) {
      try {
        const event = JSON.parse(lastMessage);
        if (event.type === 'room_updated') {
          setRoom(event.room);
        }
        if (event.type === 'game_started') {
          navigate(`/game/${code}`);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [lastMessage, code, navigate]);

  const handleStartGame = async () => {
    if (!code) return;
    startGame.mutate(code, {
      onError: (error) => console.error('Failed to start game:', error)
    });
  };

  const handleJoin = async () => {
    if (!nickname.trim() || !code) return;

    joinRoom.mutate({ code, nickname }, {
      onSuccess: (data) => {
        localStorage.setItem('playerId', data.playerId);
        localStorage.setItem('roomCode', code);
        window.location.reload();
      },
      onError: (error) => console.error('Failed to join room:', error)
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
              maxLength={20}
              autoFocus
            />

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
