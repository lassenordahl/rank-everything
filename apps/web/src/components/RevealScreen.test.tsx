import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import RevealScreen from './RevealScreen';
import { BrowserRouter } from 'react-router-dom';
import { FeatureFlagProvider } from '../contexts/FeatureFlagContext';
import type { Room } from '@rank-everything/shared-types';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi
    .fn()
    .mockImplementation(() => Promise.resolve({ toDataURL: () => 'data:image/png;base64,mock' })),
}));

// Mock PartySocketContext (This was added based on the provided Code Edit snippet)

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  const filterProps = (props: Record<string, unknown>) => {
    const validProps = { ...props };
    const invalidKeys = [
      'initial',
      'animate',
      'exit',
      'transition',
      'variants',
      'layout',
      'layoutId',
      'whileHover',
      'whileTap',
      'whileDrag',
      'whileFocus',
      'onAnimationStart',
      'onAnimationComplete',
      'onLayoutAnimationStart',
      'onLayoutAnimationComplete',
    ];
    for (const key of invalidKeys) {
      delete validProps[key];
    }
    return validProps;
  };

  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      button: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
        <button onClick={onClick} {...filterProps(props)}>
          {children}
        </button>
      ),
      div: ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div {...filterProps(props)}>{children}</div>
      ),
    },
  };
});

describe('RevealScreen', () => {
  const mockRoom: Room = {
    id: 'TEST',
    hostId: 'p1',
    status: 'reveal',
    players: [
      {
        id: 'p1',
        nickname: 'Player 1',
        avatar: '🙂',
        rankings: { i1: 1, i2: 2 },
        isConnected: true,
      },
      {
        id: 'p2',
        nickname: 'Player 2',
        avatar: '😎',
        rankings: { i1: 2, i2: 1 },
        isConnected: true,
      },
    ],
    items: [
      { id: 'i1', text: 'Item 1' },
      { id: 'i2', text: 'Item 2' },
    ],
    config: {
      maxPlayers: 8,
      itemsPerGame: 2,
      timerDuration: 60,
      turnMode: 'round-robin',
      allowLateJoin: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as unknown as Room;

  const defaultProps = {
    room: mockRoom,
    playerId: 'p1',
    isHost: true,
    sendMessage: vi.fn(),
  };

  it('renders correctly', () => {
    render(
      <BrowserRouter>
        <RevealScreen {...defaultProps} />
      </BrowserRouter>
    );
    // Verify visualization elements (now only visible list, no hidden share card)
    expect(screen.getAllByText('1.')).toHaveLength(1);
    expect(screen.getAllByText('Item 1')).toHaveLength(1);
  });

  it('navigates between players', () => {
    render(
      <BrowserRouter>
        <RevealScreen {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('Player 1')).toBeInTheDocument();

    // Click next arrow
    // Or better, find by text specifically
    const nextBtn = screen.getByText('→');
    fireEvent.click(nextBtn);

    expect(screen.getByText('Player 2')).toBeInTheDocument();
  });

  it('shows share button', () => {
    render(
      <FeatureFlagProvider overrides={{ share_results: true }}>
        <BrowserRouter>
          <RevealScreen {...defaultProps} />
        </BrowserRouter>
      </FeatureFlagProvider>
    );

    expect(screen.getByText('Share Rankings')).toBeInTheDocument();
  });
});
