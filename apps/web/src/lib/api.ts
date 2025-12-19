import { config } from './config';
import type { Room } from '@rank-everything/shared-types';

export class ApiClient {
  private static get baseUrl() {
    return config.apiBaseUrl;
  }

  static async createRoom(nickname: string): Promise<{ roomCode: string; playerId: string }> {
    // Generate random 4-letter code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const code = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');

    const response = await fetch(`${this.baseUrl}/party/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', nickname }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to create room');
    }

    return response.json();
  }

  static async joinRoom(code: string, nickname: string): Promise<{ playerId: string; room: Room }> {
    const response = await fetch(`${this.baseUrl}/party/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', nickname }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to join room');
    }

    return response.json();
  }

  static async startGame(code: string): Promise<{ room: Room }> {
    const response = await fetch(`${this.baseUrl}/party/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to start game');
    }

    return response.json();
  }

  static async getRoom(code: string): Promise<{ room: Room }> {
    const response = await fetch(`${this.baseUrl}/party/${code}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Failed to get room');
    }

    return response.json();
  }
}
