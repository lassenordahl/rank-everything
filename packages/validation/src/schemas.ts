// Zod schemas for request validation
import { z } from 'zod';
import {
  ROOM_CODE_LENGTH,
  MAX_NICKNAME_LENGTH,
  MIN_NICKNAME_LENGTH,
  MAX_ITEM_LENGTH,
  MIN_ITEM_LENGTH,
  MIN_TIMER_DURATION,
  MAX_TIMER_DURATION,
  ROOM_CODE_REGEX
} from './constants';

export const nicknameSchema = z.string()
  .min(MIN_NICKNAME_LENGTH, 'Nickname is required')
  .max(MAX_NICKNAME_LENGTH, `Nickname must be ${MAX_NICKNAME_LENGTH} characters or less`)
  .trim();

export const roomCodeSchema = z.string()
  .length(ROOM_CODE_LENGTH)
  .regex(ROOM_CODE_REGEX, 'Room code must be 4 uppercase letters');

export const createRoomSchema = z.object({
  nickname: nicknameSchema,
  config: z.object({
    submissionMode: z.enum(['round-robin', 'host-only']).optional(),
    timerEnabled: z.boolean().optional(),
    timerDuration: z.number().min(MIN_TIMER_DURATION).max(MAX_TIMER_DURATION).optional(),
  }).optional(),
});

export const joinRoomSchema = z.object({
  nickname: nicknameSchema,
});

export const submitItemSchema = z.object({
  text: z.string()
    .min(MIN_ITEM_LENGTH, 'Item text is required')
    .max(MAX_ITEM_LENGTH, `Item must be ${MAX_ITEM_LENGTH} characters or less`)
    .trim(),
});

export const rankItemSchema = z.object({
  itemId: z.string(),
  ranking: z.number().min(1).max(10),
});
