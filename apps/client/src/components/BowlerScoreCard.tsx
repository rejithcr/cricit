import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, typography } from '../theme';

interface BowlerScoreCardProps {
  variant: 'highlight' | 'compact';
  name: string;
  team?: string;
  wickets: number;
  economy?: number;
  average?: number;
  imageUrl?: string;
  rank?: number;
  isLast?: boolean;
  onPress?: () => void;
}

export function BowlerScoreCard({
  variant,
  name,
  team,
  wickets,
  economy,
  average,
  imageUrl,
  rank,
  isLast = false,
  onPress
}: BowlerScoreCardProps) {
  if (variant === 'highlight') {
    return (
      <View style={styles.container}>
        <Image source={{ uri: imageUrl }} style={styles.avatar} />
        <View style={[styles.content, !isLast && styles.borderBottom]}>
          <View style={styles.info}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.team}>{team}</Text>
          </View>
          <View style={styles.stats}>
            <Text style={styles.primaryStat}>
              {wickets} <Text style={styles.statLabel}>Wkts</Text>
            </Text>
            <Text style={styles.secondaryStat}>
              Econ: {economy?.toFixed(2)} • Avg: {average?.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.compactContent, !isLast && styles.borderBottom]}>
        <View style={styles.compactLeft}>
          <Text style={styles.rank}>{rank}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        <View style={styles.compactRight}>
          <Text style={styles.compactWickets}>{wickets} W</Text>
          <ChevronRight size={24} color={colors.divider} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    backgroundColor: colors.surfaceContainerLowest,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: typography.bodyLg.fontSize,
    fontWeight: typography.bodyLgSemibold.fontWeight,
    color: colors.onSurface,
  },
  team: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.systemGray,
    marginTop: 2,
  },
  stats: {
    alignItems: 'flex-end',
  },
  primaryStat: {
    fontSize: typography.bodyLg.fontSize,
    fontWeight: typography.bodyLgSemibold.fontWeight,
    color: colors.onSurface,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.systemGray,
  },
  secondaryStat: {
    fontSize: typography.labelSm.fontSize,
    color: colors.systemGray,
    marginTop: 2,
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingRight: 16,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: {
    fontSize: typography.bodyLg.fontSize,
    color: colors.systemGray,
    width: 20,
    textAlign: 'center',
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactWickets: {
    fontSize: typography.bodyLg.fontSize,
    color: colors.systemGray,
  }
});
