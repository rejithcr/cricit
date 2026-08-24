import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors, typography } from '../theme';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

export function SearchBar({ placeholder = "Search...", value, onChangeText }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Search size={20} color={colors.systemGray} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.systemGray}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 36,
    width: '100%',
  },
  icon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.onSurface,
    fontSize: typography.bodyLg.fontSize,
  },
});
