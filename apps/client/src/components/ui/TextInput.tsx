import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { colors, typography } from '../../theme';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  /** Label displayed above the input. */
  readonly label: string;
  /** Error message shown below the input (turns border red). */
  readonly errorMessage?: string;
  /** Optional style overrides for the outer container. */
  readonly containerStyle?: ViewStyle;
}

/**
 * Reusable text input following the WhatsApp iOS grouped-cell design.
 *
 * Features:
 * - Floating-style label above the field
 * - Bottom-border focus indicator
 * - Error state with red styling
 */
export function TextInput({
  label,
  errorMessage,
  containerStyle,
  ...rest
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(errorMessage);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
      <RNTextInput
        placeholderTextColor={colors.systemGray}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
        ]}
        {...rest}
      />
      {hasError && <Text style={styles.errorText}>{errorMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  } as ViewStyle,
  label: {
    fontSize: typography.labelSm.fontSize,
    fontWeight: typography.labelSm.fontWeight,
    letterSpacing: typography.labelSm.letterSpacing,
    color: colors.systemGray,
    marginBottom: 6,
  } as TextStyle,
  input: {
    fontSize: typography.bodyLg.fontSize,
    fontWeight: typography.bodyLg.fontWeight,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as TextStyle,
  inputFocused: {
    borderColor: colors.whatsappGreen,
  } as ViewStyle,
  inputError: {
    borderColor: colors.error,
  } as ViewStyle,
  labelError: {
    color: colors.error,
  } as TextStyle,
  errorText: {
    fontSize: typography.caption.fontSize,
    color: colors.error,
    marginTop: 4,
  } as TextStyle,
});
