import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import GameView from './GameView';
import { renderWithProviders } from '../test/utils';
import type { Room } from '@rank-everything/shared-types';

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ code: 'TEST' }),
  };
});

// Mock useGameRoom
const mockRoom: Room = {
  id: 'TEST',
  hostPlayerId: 'p1',
  status: 'in-progress',
  players: [
    { id: 'p1', nickname: 'Host', connected: true, rankings: {} },
  ],
  items: [],
  config: {
    itemsPerGame: 3, // Set to 3 to test dynamic slots
    timerDuration: 60,
    allowGuestSubmission: true,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  currentTurnPlayerId: 'p1',
};

const mockUseGameRoom = vi.fn();
vi.mock('../hooks/useGameRoom', () => ({
  useGameRoom: () => mockUseGameRoom(),
}));

// Mock useEmojiClassifier
vi.mock('../hooks/useEmojiClassifier', () => ({
  useEmojiClassifier: () => ({
    emoji: '',
    isClassifying: false,
    isModelLoading: false,
    modelProgress: 0,
  }),
}));

describe('GameView', () => {
  beforeEach(() => {
    mockUseGameRoom.mockReturnValue({
      room: mockRoom,
      sendMessage: vi.fn(),
      isMyTurn: true,
      isHost: true,
      playerId: 'p1',
      isConnected: true,
    });
  });

  it('should render correct number of ranking slots based on config', () => {
    // We need a current item to show the ranking view
    renderWithProviders(<GameView />);

    // With current code, GameView shows submission input if isMyTurn is true and there is no currentItem.
    // However, the bug is about the RankingSlots which are shown when ranking an item.
    // We need to simulate that we have an item to rank.
    // But GameView derives currentItem from unranked items in the room.
    // Let's add an unranked item to the mock room.

    const roomWithItem = {
        ...mockRoom,
        items: [{ id: 'item1', text: 'Test Item', emoji: '🧪', type: 'text' as const, createdBy: 'p1', createdAt: Date.now() }]
    };

    mockUseGameRoom.mockReturnValue({
      room: roomWithItem,
      sendMessage: vi.fn(),
      isMyTurn: true, // Needs to be my turn to rank
      isHost: true,
      playerId: 'p1',
      isConnected: true,
    });

    renderWithProviders(<GameView />);

    // Ranking slots should be visible now.
    // We check how many slots are rendered.
    // The RankingSlot render buttons with the rank number as text.
    // We can look for buttons with 1, 2, 3.
    // And ideally make sure 4 doesn't exist.

    expect(screen.getByText('Test Item')).toBeInTheDocument();

    // There are actually TWO sets of numbers:
    // 1. The RankingSlots for clicking (if ranking view is active)
    // 2. The RankingList at the bottom (my rankings)

    // The bug report says "on the game state badge get rid of double ring" -> wait that was previous.
    // "if the config file says rank 3 things, we shouldn't have 10 numbered options for the ranking component"

    // This implies the interactive ranking component (the grid of buttons).

    const slots = screen.getAllByRole('button', { name: /^[0-9]+$/ });

    // If bug exists, this will likely be 10. If fixed, it should be 3.
    // Wait, RankingList (at the bottom) ALSO renders numbers? No, RankingList renders RankingSlots but they might not be buttons if not interactive?
    // Let's check RankingList implementation. RankingSlot uses a button if onClick is provided.
    // In GameView, RankingList has interactive=false (default). So those shouldn't be buttons?

    // Let's check RankingList usage in GameView:
    // <RankingList rankings={myRankings} ... />
    // In RankingList:
    // <div className={...}> {rank} </div> inside RankingSlot?

    // Let's assume we are targeting the interactive slots in the middle of the screen.
    // Those are definitely buttons.

    // We expect 3 buttons.
    expect(slots).toHaveLength(3);
  });
});
