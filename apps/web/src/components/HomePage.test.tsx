/**
 * Tests for HomePage component
 *
 * Tests the main landing page with Create/Join Room functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';
import { renderWithProviders } from '../test/utils';
import { mockApiResponses } from '../test/fixtures';

// Mock fetch
const mockFetch = vi.fn();

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockNavigate.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Initial Render', () => {
    it('should render the home page with title and buttons', () => {
      renderWithProviders(<HomePage />);

      expect(screen.getByText('Rank Everything')).toBeInTheDocument();
      expect(screen.getByText('The ultimate party game for opinions.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();
    });
  });

  describe('Create Room Flow', () => {
    it('should show create room form when Create Room is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /create room/i }));

      expect(screen.getByText('Create Room')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your nickname/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should disable Create button when nickname is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /create room/i }));

      const createButton = screen.getByRole('button', { name: /^create$/i });
      expect(createButton).toBeDisabled();
    });

    it('should enable Create button when nickname is entered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /create room/i }));
      await user.type(screen.getByPlaceholderText(/your nickname/i), 'TestHost');

      const createButton = screen.getByRole('button', { name: /^create$/i });
      expect(createButton).not.toBeDisabled();
    });

    it('should call API and navigate on create room success', async () => {
      const user = userEvent.setup();
      const mockResponse = mockApiResponses.createRoom('WXYZ', 'host-123');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /create room/i }));
      await user.type(screen.getByPlaceholderText(/your nickname/i), 'TestHost');
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/[A-Z]{4}$/));
      });
    });

    it('should show loading state while creating room', async () => {
      const user = userEvent.setup();

      // Create a delayed promise
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /create room/i }));
      await user.type(screen.getByPlaceholderText(/your nickname/i), 'TestHost');
      await user.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
      });
    });

    it('should go back to home when Back is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /create room/i }));
      await user.click(screen.getByRole('button', { name: /back/i }));

      expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
    });
  });

  describe('Join Room Flow', () => {
    it('should show join room form when Join Room is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /join room/i }));

      expect(screen.getByText('Join Room')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/room code/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your nickname/i)).toBeInTheDocument();
    });

    it('should disable Join button when code or nickname is missing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /join room/i }));

      const joinButton = screen.getByRole('button', { name: /^join$/i });
      expect(joinButton).toBeDisabled();

      // Enter only nickname
      await user.type(screen.getByPlaceholderText(/your nickname/i), 'TestPlayer');
      expect(joinButton).toBeDisabled();
    });

    it('should enable Join button when code and nickname are entered', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /join room/i }));
      await user.type(screen.getByPlaceholderText(/room code/i), 'ABCD');
      await user.type(screen.getByPlaceholderText(/your nickname/i), 'TestPlayer');

      const joinButton = screen.getByRole('button', { name: /^join$/i });
      expect(joinButton).not.toBeDisabled();
    });

    it('should convert room code to uppercase', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /join room/i }));
      await user.type(screen.getByPlaceholderText(/room code/i), 'abcd');

      const input = screen.getByPlaceholderText(/room code/i) as HTMLInputElement;
      expect(input.value).toBe('ABCD');
    });

    it('should call API and navigate on join room success', async () => {
      const user = userEvent.setup();
      const mockResponse = mockApiResponses.joinRoom('player-456');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /join room/i }));
      await user.type(screen.getByPlaceholderText(/room code/i), 'ABCD');
      await user.type(screen.getByPlaceholderText(/your nickname/i), 'TestPlayer');
      await user.click(screen.getByRole('button', { name: /^join$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/ABCD');
      });
    });

    it('should enforce 4-character limit on room code', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /join room/i }));
      await user.type(screen.getByPlaceholderText(/room code/i), 'ABCDEF');

      const input = screen.getByPlaceholderText(/room code/i) as HTMLInputElement;
      expect(input.value).toBe('ABCD');
    });
  });

  describe('Nickname Validation', () => {
    it('should enforce 20-character limit on nickname', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(screen.getByRole('button', { name: /create room/i }));
      await user.type(
        screen.getByPlaceholderText(/your nickname/i),
        'ThisIsAVeryLongNicknameThatExceedsTheLimit'
      );

      const input = screen.getByPlaceholderText(/your nickname/i) as HTMLInputElement;
      expect(input.value.length).toBeLessThanOrEqual(20);
    });
  });
});
