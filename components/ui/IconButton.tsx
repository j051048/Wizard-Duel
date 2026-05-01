import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';

interface IconButtonProps {
  /** Icon component from lucide-react */
  icon?: LucideIcon;
  /** Icon size (default: 24) */
  size?: number;
  /** Icon color (default: #FFFFFF) */
  color?: string;
  /** Background color (default: transparent) */
  backgroundColor?: string;
  /** Press callback */
  onPress?: () => void;
  /** Long press callback */
  onLongPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom container style */
  style?: React.CSSProperties;
  /** Badge count (optional) */
  badge?: number;
  /** Badge color */
  badgeColor?: string;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID for testing */
  testID?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  size = 24,
  color = '#FFFFFF',
  backgroundColor = 'transparent',
  onPress,
  disabled = false,
  style,
  badge,
  badgeColor = '#FF3B30',
  accessibilityLabel,
  testID,
}) => {
  const isInteractive = !disabled && !!onPress;

  return (
    <motion.button
      onClick={onPress}
      disabled={disabled}
      aria-label={accessibilityLabel}
      data-testid={testID}
      whileTap={isInteractive ? { scale: 0.92 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '9999px',
        padding: 8,
        minWidth: 44,
        minHeight: 44,
        backgroundColor,
        border: 'none',
        cursor: disabled ? 'not-allowed' : isInteractive ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        outline: 'none',
        ...style,
      }}
    >
      {Icon ? (
        <Icon size={size} color={disabled ? '#666666' : color} />
      ) : (
        <MoreHorizontal size={size} color={disabled ? '#666666' : color} />
      )}

      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            backgroundColor: badgeColor,
            color: '#FFFFFF',
            fontSize: 10,
            lineHeight: '16px',
          }}
        >
          {badge}
        </span>
      )}
    </motion.button>
  );
};

export default IconButton;
