import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import RoomLobby from './components/RoomLobby';
import GameView from './components/GameView';

function App() {
  return (
    <div className="min-h-full">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:code" element={<GameView />} />
        <Route path="/reveal/:code" element={<GameView />} />
        <Route path="/:code" element={<RoomLobby />} />
      </Routes>
    </div>
  );
}

export default App;
