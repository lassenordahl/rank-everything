import { Routes, Route, useParams } from 'react-router-dom';
import HomePage from './components/HomePage';
import RoomLobby from './components/RoomLobby';
import GameView from './components/GameView';
import DesignShowcase from './pages/DesignShowcase';
import { usePreloadLLM } from './hooks/useEmojiClassifier';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnimatedBackground } from './components/AnimatedBackground';

/**
 * Route wrapper that extracts the room code and uses it as a key.
 * This ensures React creates a fresh component instance when navigating between rooms,
 * preventing stale hook state from causing issues.
 */
function GameRoute() {
  const { code } = useParams<{ code: string }>();
  return (
    <ErrorBoundary key={code}>
      <GameView />
    </ErrorBoundary>
  );
}

function LobbyRoute() {
  const { code } = useParams<{ code: string }>();
  return (
    <ErrorBoundary key={code}>
      <RoomLobby />
    </ErrorBoundary>
  );
}

function App() {
  // Preload the emoji LLM model in the background
  usePreloadLLM();

  return (
    <div className="min-h-full flex flex-col">
      <AnimatedBackground />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/design" element={<DesignShowcase />} />
        <Route path="/game/:code" element={<GameRoute />} />
        <Route path="/reveal/:code" element={<GameRoute />} />
        <Route path="/:code" element={<LobbyRoute />} />
      </Routes>
    </div>
  );
}

export default App;
