import { describe, it, expect, beforeEach } from 'vitest';
import { GameRoomState } from '../state/GameRoomState';
import type { Room } from '@rank-everything/shared-types';

describe('Jackbox Robustness Scenarios', () => {
    let gameState: GameRoomState;
    let room: Room;

    beforeEach(() => {
        // Setup initial state with a running game
        const hostId = 'host-1';
        const config = { timerEnabled: true, timerDuration: 10 };

        gameState = new GameRoomState({ room: null, connections: new Map() });
        gameState.createRoom('room-1', hostId, 'Host', config);

        // Add 3 more players
        gameState.addPlayer({ id: 'p2', nickname: 'P2', roomId: 'room-1', connected: true, rankings: {}, joinedAt: Date.now() });
        gameState.addPlayer({ id: 'p3', nickname: 'P3', roomId: 'room-1', connected: true, rankings: {}, joinedAt: Date.now() });
        gameState.addPlayer({ id: 'p4', nickname: 'P4', roomId: 'room-1', connected: true, rankings: {}, joinedAt: Date.now() });

        // Start game
        gameState.startGame();
        room = gameState.room!;
    });

    it('should indicate if join is allowed based on status', () => {
        // This test simulates logic we need to add to handleJoinRoom or a helper in GameRoomState
        // We might want a helper "canJoin()"
        // expect(gameState.canJoin()).toBe(false);
        expect(gameState.room?.status).toBe('in-progress');
    });

    it('should migrate host if host leaves MID-GAME', () => {
        expect(gameState.room?.hostPlayerId).toBe('host-1');

        // Host leaves (simulated via removePlayer or disconnect logic)
        gameState.removePlayer('host-1');

        // Assert: Host should migrate to next player
        expect(gameState.room?.hostPlayerId).not.toBe('host-1');
        expect(gameState.room?.hostPlayerId).toBeDefined();
        expect(gameState.room?.hostPlayerId).toBe('p2');
    });

    it('should auto-advance turn if timer expires', () => {
        // Setup: Current player is host-1 (since we just started, usually index 0)
        expect(gameState.room?.currentTurnPlayerId).toBe('host-1');

        // Mock time passing past timerEndAt
        const timerEnd = gameState.room!.timerEndAt!;
        const future = timerEnd + 1000;

        // Action: Check timeout (method to be implemented)
        // @ts-ignore
        const turnChanged = gameState.checkTurnTimeout(future);

        // Expectation: Turn should advance
        expect(turnChanged).toBe(true);
        expect(gameState.room?.currentTurnPlayerId).not.toBe('host-1');
        expect(gameState.room?.currentTurnPlayerId).toBe('p2');
    });
});
