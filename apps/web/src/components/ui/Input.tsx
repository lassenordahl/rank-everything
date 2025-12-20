/**
 * Input Component
 *
 * Standard text input using design system styles.
 * Used in RoomLobby, GameView, and DesignShowcase.
 */

import { forwardRef } from 'react';
import { componentClasses } from '../../lib/design-tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text (optional) */
  label?: string;
  /** Error message (optional) */
  error?: string;
  /** Full width? (default: true) */
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, fullWidth = true, ...props }, ref) => {
    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && <label className="block text-sm font-bold mb-1">{label}</label>}
        <input
          ref={ref}
          className={`${componentClasses.input} focus:ring-0 focus:border-black focus:shadow-[0_0_0_1px_black] ${error ? 'border-red-500 bg-red-50' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
