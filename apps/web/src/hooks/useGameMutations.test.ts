/**
 * Tests for useGameMutations hooks
 *
 * Tests the React Query mutation hooks that wrap the API client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCreateRoom, useJoinRoom, useStartGame } from './useGameMutations';
import { mockApiResponses } from '../test/fixtures';

// Setup
const mockFetch = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useGameMutations', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('useCreateRoom', () => {
    it('should successfully create a room', async () => {
      const mockResponse = mockApiResponses.createRoom('WXYZ', 'new-host');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useCreateRoom(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('TestHost');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/party\/[A-Z]{4}$/),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"create"'),
        })
      );
    });

    it('should handle create room failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Room already exists' }),
      });

      const { result } = renderHook(() => useCreateRoom(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('TestHost');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Room already exists');
    });
  });

  describe('useJoinRoom', () => {
    it('should successfully join a room', async () => {
      const mockResponse = mockApiResponses.joinRoom('joining-player');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useJoinRoom(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ code: 'ABCD', nickname: 'JoiningPlayer' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/party/ABCD'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"join"'),
        })
      );
    });

    it('should handle room not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Room not found' }),
      });

      const { result } = renderHook(() => useJoinRoom(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ code: 'ZZZZ', nickname: 'JoiningPlayer' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toContain('Room not found');
    });

    it('should handle game already started error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Game already started', code: 'GAME_ALREADY_STARTED' }),
      });

      const { result } = renderHook(() => useJoinRoom(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ code: 'ABCD', nickname: 'LatePlayer' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useStartGame', () => {
    it('should successfully start a game', async () => {
      const mockResponse = mockApiResponses.startGame();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useStartGame(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('ABCD');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/party/ABCD'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"start"'),
        })
      );
    });

    it('should handle not enough players error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Not enough players', code: 'NOT_ENOUGH_PLAYERS' }),
      });

      const { result } = renderHook(() => useStartGame(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('ABCD');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
