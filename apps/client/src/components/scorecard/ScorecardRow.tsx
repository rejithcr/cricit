import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2 } from 'lucide-react-native';
import { colors, typography } from '../../theme';

interface BatterRowProps {
  batter: any;
  playerName: string;
  isLast?: boolean;
  onPress?: () => void;
  isEditing?: boolean;
}

export const BatterRow = ({ batter, playerName, isLast, onPress, isEditing }: BatterRowProps) => {
  const content = (
    <View style={[styles.tableRow, !isLast && styles.borderBottom, isEditing && { backgroundColor: 'rgba(37, 211, 102, 0.05)' }]}>
      <View style={styles.playerInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isEditing && <Edit2 size={12} color={colors.whatsappGreen} style={{ marginRight: 6, marginBottom: 4 }} />}
          <Text style={[styles.playerName, !batter.out && styles.statBold]}>
            {playerName}{batter.isStriker ? ' *' : ''}
          </Text>
        </View>
        <Text style={styles.dismissal}>{batter.dismissal}</Text>
      </View>
      <View style={styles.statsCols}>
        <Text style={[styles.statText, styles.statBold, { width: 36, textAlign: 'right' }]}>{batter.runs}</Text>
        <Text style={[styles.statText, { width: 32, textAlign: 'right' }]}>{batter.balls}</Text>
        <Text style={[styles.statText, { width: 28, textAlign: 'right' }]}>{batter.fours}</Text>
        <Text style={[styles.statText, { width: 28, textAlign: 'right' }]}>{batter.sixes}</Text>
        <Text style={[styles.statText, { width: 45, textAlign: 'right' }]}>{Math.round(batter.strikeRate || 0)}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
};

interface BowlerRowProps {
  bowler: any;
  playerName: string;
  isLast?: boolean;
  onPress?: () => void;
  isEditing?: boolean;
}

export const BowlerRow = ({ bowler, playerName, isLast, onPress, isEditing }: BowlerRowProps) => {
  const content = (
    <View style={[styles.tableRow, !isLast && styles.borderBottom, isEditing && { backgroundColor: 'rgba(37, 211, 102, 0.05)' }]}>
      <View style={styles.playerInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isEditing && <Edit2 size={12} color={colors.whatsappGreen} style={{ marginRight: 6, marginBottom: 4 }} />}
          <Text style={[styles.playerName, bowler.isCurrentBowler && styles.statBold]}>{playerName}</Text>
        </View>
      </View>
      <View style={styles.statsCols}>
        <Text style={[styles.statText, { width: 36, textAlign: 'right' }]}>{bowler.overs}</Text>
        <Text style={[styles.statText, { width: 32, textAlign: 'right' }]}>{bowler.maidens}</Text>
        <Text style={[styles.statText, { width: 32, textAlign: 'right' }]}>{bowler.runs}</Text>
        <Text style={[styles.statText, styles.statBold, { width: 28, textAlign: 'right' }]}>{bowler.wickets}</Text>
        <Text style={[styles.statText, { width: 45, textAlign: 'right' }]}>{(bowler.economy || 0).toFixed(1)}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
};

const styles = StyleSheet.create({
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  playerInfo: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  playerName: {
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '400',
    color: colors.onSurface,
    marginBottom: 4,
  },
  dismissal: {
    fontSize: typography.caption.fontSize,
    color: colors.systemGray,
  },
  statsCols: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  statText: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    textAlign: 'right',
  },
  statBold: {
    fontWeight: 'bold',
  },
});
