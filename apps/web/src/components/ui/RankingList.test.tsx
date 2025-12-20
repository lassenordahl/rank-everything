import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RankingList } from './RankingList';

// Mock RankingSlot to verify props
vi.mock('./RankingSlot', () => ({
  RankingSlot: vi.fn(({ rank, item, comparisonDiff }) => (
    <div data-testid={`slot-${rank}`}>
      <span data-testid={`rank-${rank}`}>{rank}</span>
      {item && <span data-testid={`item-${rank}`}>{item.text}</span>}
      {comparisonDiff !== null && <span data-testid={`diff-${rank}`}>{comparisonDiff}</span>}
    </div>
  )),
}));

describe('RankingList', () => {
  const mockItems = [
    { id: 'i1', text: 'Item 1', emoji: '🍎' },
    { id: 'i2', text: 'Item 2', emoji: '🍌' },
    { id: 'i3', text: 'Item 3', emoji: '🍒' },
  ];

  const rankings = {
    i1: 1, // Player ranked Better than viewer
    i2: 3, // Player ranked Worse than viewer
    i3: 2, // Player ranked Same as viewer
  };

  const compareToRankings = {
    i1: 3, // Viewer ranked it #3
    i2: 1, // Viewer ranked it #1
    i3: 2, // Viewer ranked it #2
  };

  it('calculates comparisonDiff correctly (viewerRank - thisRank)', () => {
    render(
      <RankingList
        rankings={rankings}
        items={mockItems}
        compareToRankings={compareToRankings}
        itemsPerGame={3}
        animate={false}
      />
    );

    // Item 1: Player #1, Viewer #3 -> Diff: 3 - 1 = +2
    expect(screen.getByTestId('diff-1')).toHaveTextContent('2');

    // Item 3: Player #2, Viewer #2 -> Diff: 2 - 2 = 0 (might be null or 0 depending on impl)
    // Looking at RankingList.tsx, 0 is returned but RankingSlot.tsx might hide it.
    // In our mock, if it's not null it shows up.
    expect(screen.getByTestId('diff-2')).toHaveTextContent('0');

    // Item 2: Player #3, Viewer #1 -> Diff: 1 - 3 = -2
    expect(screen.getByTestId('diff-3')).toHaveTextContent('-2');
  });

  it('returns null for comparisonDiff if no matching item in compareToRankings', () => {
    const incompleteCompare = { i1: 1 };
    render(
      <RankingList
        rankings={rankings}
        items={mockItems}
        compareToRankings={incompleteCompare}
        itemsPerGame={3}
        animate={false}
      />
    );

    // i2 and i3 should not have diff badges
    expect(screen.queryByTestId('diff-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('diff-3')).not.toBeInTheDocument();
  });
});
