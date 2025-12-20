import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import RoomLobby from './components/RoomLobby';
import GameView from './components/GameView';
import DesignShowcase from './pages/DesignShowcase';
import { usePreloadLLM } from './hooks/useEmojiClassifier';

function App() {
  // Preload the emoji LLM model in the background
  usePreloadLLM();

  return (
    <div className="min-h-full flex flex-col">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/design" element={<DesignShowcase />} />
        <Route path="/game/:code" element={<GameView />} />
        <Route path="/reveal/:code" element={<GameView />} />
        <Route path="/:code" element={<RoomLobby />} />
      </Routes>
    </div>
  );
}

export default App;
