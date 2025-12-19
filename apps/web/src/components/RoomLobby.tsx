import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePartySocket } from '../hooks/usePartySocket';
import type { Room } from '@rank-everything/shared-types';

export default function RoomLobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const playerId = localStorage.getItem('playerId');

  const { lastMessage } = usePartySocket(code || '');

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
    try {
      await fetch(`/party/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const isHost = room?.hostPlayerId === playerId;
  const canStart = room && room.players.length >= 2;

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
      {isHost && room && (
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
          disabled={!canStart}
          className="btn disabled:opacity-50"
        >
          {canStart ? 'Start Game' : 'Need 2+ Players'}
        </button>
      )}

      {!isHost && (
        <p className="text-muted">Waiting for host to start...</p>
      )}
    </div>
  );
}
