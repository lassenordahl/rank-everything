import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameRoom } from '../hooks/useGameRoom';
import { useJoinRoom, useStartGame } from '../hooks/useGameMutations';
import { MAX_NICKNAME_LENGTH } from '@rank-everything/validation';
import { COPY } from '../lib/copy';

export default function RoomLobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { room, error: roomError, isHost } = useGameRoom(code || '');
  console.log(
    `[RoomLobby] Rendering. Room: ${room?.id}, Players: ${room?.players?.length || 0}, Status: ${room?.status}`
  );

  // Redirect to game if room is already in-progress
  // This handles the race condition where game starts during page reload
  useEffect(() => {
    if (room?.status === 'in-progress' && code) {
      console.log(`[RoomLobby] Room is in-progress, redirecting to game`);
      navigate(`/game/${code}`);
    }
  }, [room?.status, code, navigate]);
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
      onError: (error) => setLocalError(error.message),
    });
  };

  const handleJoin = async () => {
    if (!nickname.trim() || !code) return;
    setLocalError(null);

    joinRoom.mutate(
      { code, nickname },
      {
        onSuccess: (data) => {
          localStorage.setItem('playerId', data.playerId);
          localStorage.setItem('roomCode', code);
          window.location.reload();
        },
        onError: (error) => setLocalError(error.message),
      }
    );
  };

  const isJoined = room?.players.some((p) => p.id === playerId);

  // Loading state
  if (!room) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted">{COPY.pending.loading}</p>
      </div>
    );
  }

  // Not joined state - Show Join Form
  if (!isJoined) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <div className="card w-full max-w-sm">
          <div className="text-center mb-6">
            <p className="text-muted mb-2">{COPY.labels.joinRoomTitle}</p>
            <h1 className="text-4xl font-bold tracking-widest mb-4">{code}</h1>
            <p>{COPY.labels.enterNickname}</p>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder={COPY.placeholders.nickname}
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
              {joinRoom.isPending ? COPY.pending.joining : COPY.buttons.join}
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
        <p className="text-muted mb-2">{COPY.labels.roomCode}</p>
        <h1 className="text-6xl font-bold tracking-widest mb-4">{code}</h1>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="btn btn-secondary text-sm py-2 px-4"
        >
          {copied ? `✅  ${COPY.buttons.copiedLink}` : `🔗  ${COPY.buttons.copyLink}`}
        </button>
      </div>

      {error && (
        <div className="w-full max-w-sm mb-6 p-3 bg-red-100/10 border border-red-500/50 text-red-500 rounded text-sm text-center">
          {error}
        </div>
      )}

      {/* Players */}
      <div className="card w-full max-w-sm mb-8">
        <h2 className="font-bold mb-4">
          {COPY.labels.players} ({room?.players.length || 0})
        </h2>
        <ul className="space-y-2">
          {room?.players.map((player) => (
            <li key={player.id} className="flex items-center gap-2">
              <span className={player.connected ? 'text-green-600' : 'text-red-600'}>
                {player.connected ? '●' : '○'}
              </span>
              <span>{player.nickname}</span>
              {player.id === room.hostPlayerId && (
                <span className="text-muted text-sm">{COPY.labels.host}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Settings (host only) */}
      {isHost && (
        <div className="card w-full max-w-sm mb-8">
          <h2 className="font-bold mb-4">{COPY.labels.settings}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{COPY.labels.mode}</span>
              <span>{room.config.submissionMode}</span>
            </div>
            <div className="flex justify-between">
              <span>{COPY.labels.timer}</span>
              <span>
                {room.config.timerEnabled ? `${room.config.timerDuration}s` : COPY.labels.timerOff}
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
          {startGame.isPending
            ? COPY.pending.starting
            : room && room.players.length >= 1
              ? COPY.buttons.startGame
              : COPY.labels.needPlayers}
        </button>
      )}

      {!isHost && <p className="text-muted">{COPY.labels.waitingForHost}</p>}
    </div>
  );
}
