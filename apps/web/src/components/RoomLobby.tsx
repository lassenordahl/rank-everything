import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameRoom } from '../hooks/useGameRoom';
import { useJoinRoom, useStartGame } from '../hooks/useGameMutations';
import { MAX_NICKNAME_LENGTH } from '@rank-everything/validation';

export default function RoomLobby() {
  const { code } = useParams<{ code: string }>();
  // const navigate = useNavigate(); // handled by hook now? Navigate on start handled by hook?
  // No, useGameRoom handles navigation on 'game_started'.
  // But wait, explicit navigation actions (like Join onSuccess) might still need it.
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { room, error: roomError, isHost } = useGameRoom(code || '');
  console.log(`[RoomLobby] Rendering. Room: ${room?.id}, Players: ${room?.players?.length || 0}`);
  const joinRoom = useJoinRoom();
  const startGame = useStartGame();

  const error = localError || (roomError?.message ?? null);
  const playerId = localStorage.getItem('playerId');

  // Effects removed!

  const handleStartGame = async () => {
    if (!code) return;
    setLocalError(null);
    startGame.mutate(code, {
      onSuccess: () => navigate(`/game/${code}`),
      onError: (error) => setLocalError(error.message)
    });
  };

  const handleJoin = async () => {
    if (!nickname.trim() || !code) return;
    setLocalError(null);

    joinRoom.mutate({ code, nickname }, {
      onSuccess: (data) => {
        localStorage.setItem('playerId', data.playerId);
        localStorage.setItem('roomCode', code);
        window.location.reload();
      },
      onError: (error) => setLocalError(error.message)
    });
  };

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

            {/* Error used to be here, but we have a main error block below room code now */}

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
      {/* Room Code */}
      <div className="text-center mb-8">
        <p className="text-muted mb-2">Room Code</p>
        <h1 className="text-6xl font-bold tracking-widest mb-4">{code}</h1>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="btn btn-secondary text-sm py-2 px-4"
        >
          {copied ? '✅  Copied Link!' : '🔗  Copy Link'}
        </button>
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
          disabled={!(room && room.players.length >= 1) || startGame.isPending}
          className="btn disabled:opacity-50"
        >
          {startGame.isPending ? 'Starting...' : (room && room.players.length >= 1 ? 'Start Game' : 'Need 1+ Players')}
        </button>
      )}

      {!isHost && (
        <p className="text-muted">Waiting for host to start...</p>
      )}
    </div>
  );
}
