import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../lib/api';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('createRoom', () => {
    it('should create a room and return roomCode and playerId', async () => {
      const mockResponse = {
        roomCode: 'ABCD',
        playerId: 'player-123',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await ApiClient.createRoom('TestUser');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/party\/[A-Z]{4}$/),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', nickname: 'TestUser' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if the request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Room creation failed' }),
      });

      await expect(ApiClient.createRoom('TestUser')).rejects.toThrow('Room creation failed');
    });
  });

  describe('joinRoom', () => {
    it('should join a room and return playerId and room', async () => {
      const mockRoom = {
        id: 'ABCD',
        players: [{ id: 'player-123', nickname: 'TestUser' }],
      };
      const mockResponse = {
        playerId: 'player-123',
        room: mockRoom,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await ApiClient.joinRoom('ABCD', 'TestUser');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/party/ABCD'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'join', nickname: 'TestUser' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('startGame', () => {
    it('should start a game and return the updated room', async () => {
      const mockRoom = {
        id: 'ABCD',
        status: 'in-progress',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ room: mockRoom }),
      });

      const result = await ApiClient.startGame('ABCD');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/party/ABCD'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'start' }),
        })
      );
      expect(result.room).toEqual(mockRoom);
    });
  });

  describe('getRandomItems', () => {
    it('should fetch random items with count', async () => {
      const mockItems = {
        items: [{ text: 'Pizza' }, { text: 'Tacos' }],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockItems),
      });

      const result = await ApiClient.getRandomItems(2);

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/random-items?count=2'));
      expect(result).toEqual(mockItems);
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'DB Error' }),
      });

      await expect(ApiClient.getRandomItems(1)).rejects.toThrow('DB Error');
    });
  });
});
