import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 14, // Roughly label-sm but uppercase in design
    fontWeight: typography.labelSm.fontWeight,
    color: colors.systemGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
