import { useMutation } from '@tanstack/react-query';
import { ApiClient } from '../lib/api';

export function useCreateRoom() {
  return useMutation({
    mutationFn: (nickname: string) => ApiClient.createRoom(nickname),
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: ({ code, nickname }: { code: string; nickname: string }) =>
      ApiClient.joinRoom(code, nickname),
  });
}

export function useStartGame() {
  return useMutation({
    mutationFn: (code: string) => ApiClient.startGame(code),
  });
}
