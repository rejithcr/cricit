import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, typography } from '../../theme';

interface ButtonProps {
  /** Button label text. */
  readonly title: string;
  /** Called when the button is pressed. */
  readonly onPress: () => void;
  /** Visual variant. Defaults to 'primary'. */
  readonly variant?: 'primary' | 'secondary' | 'text';
  /** Show a spinner and disable the button. */
  readonly isLoading?: boolean;
  /** Disable the button without showing a spinner. */
  readonly disabled?: boolean;
  /** Optional style overrides for the container. */
  readonly style?: ViewStyle;
}

/**
 * Reusable button following the WhatsApp iOS design language.
 *
 * - **primary**: Filled green background.
 * - **secondary**: Outlined style.
 * - **text**: Text-only link style.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.onPrimary : colors.whatsappGreen}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.primaryLabel,
            variant === 'secondary' && styles.secondaryLabel,
            variant === 'text' && styles.textLabel,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  } as ViewStyle,
  primary: {
    backgroundColor: colors.whatsappGreen,
  } as ViewStyle,
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.whatsappGreen,
  } as ViewStyle,
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
  label: {
    fontSize: typography.bodyLgSemibold.fontSize,
    fontWeight: typography.bodyLgSemibold.fontWeight,
    letterSpacing: typography.bodyLgSemibold.letterSpacing,
  } as TextStyle,
  primaryLabel: {
    color: colors.onPrimary,
  } as TextStyle,
  secondaryLabel: {
    color: colors.whatsappGreen,
  } as TextStyle,
  textLabel: {
    color: colors.whatsappGreen,
    fontSize: typography.bodyMd.fontSize,
    fontWeight: typography.bodyMd.fontWeight,
  } as TextStyle,
});
