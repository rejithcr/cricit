import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface FilterChipsProps {
  options: string[];
  selectedOption: string;
  onSelect: (option: string) => void;
}

export function FilterChips({ options, selectedOption, onSelect }: FilterChipsProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isSelected = option === selectedOption;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.chip,
              isSelected ? styles.chipSelected : styles.chipUnselected
            ]}
          >
            <Text 
              style={[
                styles.chipText,
                isSelected ? styles.textSelected : styles.textUnselected
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.whatsappGreen,
    borderColor: colors.whatsappGreen,
  },
  chipUnselected: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.divider,
  },
  chipText: {
    fontSize: typography.bodyMd.fontSize,
    fontWeight: typography.bodyMd.fontWeight,
  },
  textSelected: {
    color: colors.onPrimary,
  },
  textUnselected: {
    color: colors.onSurface,
  },
});
