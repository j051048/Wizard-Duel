import React from 'react';
import { Pressable, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { motion } from 'framer-motion/client';
import { Ionicons } from '@expo/vector-icons';

// framer-motion MotionView for React Native
const MotionView = motion(View);

interface IconButtonProps {
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
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
  style?: ViewStyle;
  /** Badge count (optional) */
  badge?: number;
  /** Badge color */
  badgeColor?: string;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * IconButton - A tactile button with physics-based press feedback
 * 
 * Features:
 * - Smooth spring-based scale animation on tap (0.92 scale)
 * - Subtle hover/touch feedback
 * - Optional badge for notifications
 * - Accessible and testable
 */
const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 24,
  color = '#FFFFFF',
  backgroundColor = 'transparent',
  onPress,
  onLongPress,
  disabled = false,
  style,
  badge,
  badgeColor = '#FF3B30',
  accessibilityLabel,
  testID,
}) => {
  const isInteractive = !disabled && (onPress || onLongPress);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{ backgroundColor: 'transparent' }}
    >
      <MotionView
        style={[
          styles.container,
          { backgroundColor },
          disabled && styles.disabled,
          style,
        ]}
        whileTap={isInteractive ? { scale: 0.92 } : undefined}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 17,
        }}
      >
        <Ionicons
          name={icon}
          size={size}
          color={disabled ? '#666666' : color}
        />
        
        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Ionicons
              name="ellipsis-horizontal"
              size={10}
              color="#FFFFFF"
            />
          </View>
        )}
      </MotionView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999, // Fully rounded by default
    padding: 8,
    minWidth: 44, // Minimum touch target
    minHeight: 44,
  },
  disabled: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});

export default IconButton;
