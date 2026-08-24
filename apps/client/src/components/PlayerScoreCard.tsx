import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface PlayerScoreCardProps {
  name: string;
  team: string;
  runs: number;
  average: number;
  strikeRate: number;
  imageUrl: string;
  isLast?: boolean;
}

export function PlayerScoreCard({ 
  name, 
  team, 
  runs, 
  average, 
  strikeRate, 
  imageUrl,
  isLast = false
}: PlayerScoreCardProps) {
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
            {runs} <Text style={styles.statLabel}>Runs</Text>
          </Text>
          <Text style={styles.secondaryStat}>
            Avg: {average.toFixed(2)} • SR: {strikeRate.toFixed(1)}
          </Text>
        </View>
      </View>
    </View>
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
});
