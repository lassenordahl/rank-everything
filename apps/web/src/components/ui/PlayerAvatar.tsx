/**
 * PlayerAvatar Component
 *
 * Circular avatar with color based on player index and first letter of name.
 * Used in RoomLobby, RevealScreen, and DesignShowcase.
 */

import { getAvatarColor } from '../../lib/design-tokens';

export interface PlayerAvatarProps {
  /** Player's nickname */
  name: string;
  /** Index in player list (determines color) */
  colorIndex: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function PlayerAvatar({ name, colorIndex, size = 'md', className = '' }: PlayerAvatarProps) {
  const color = getAvatarColor(colorIndex);
  const firstLetter = name[0]?.toUpperCase() ?? '?';

  return (
    <div
      className={`
        rounded-full flex items-center justify-center font-bold border-2 border-black flex-shrink-0
        ${sizeClasses[size]}
        ${color?.bg ?? 'bg-neutral-200'}
        ${color?.text ?? 'text-black'}
        ${className}
      `}
    >
      {firstLetter}
    </div>
  );
}

export default PlayerAvatar;
