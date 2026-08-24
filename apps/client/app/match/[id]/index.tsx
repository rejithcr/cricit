import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, typography } from '../../../src/theme';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react-native';

const BatterRow = ({ batter, playerName, isLast }: any) => (
  <View style={[styles.tableRow, !isLast && styles.borderBottom]}>
    <View style={styles.playerInfo}>
      <Text style={[styles.playerName, !batter.out && styles.statBold]}>
        {playerName}{batter.isStriker ? ' *' : ''}
      </Text>
      <Text style={styles.dismissal}>{batter.dismissal}</Text>
    </View>
    <View style={styles.statsCols}>
      <Text style={[styles.statText, styles.statBold, { width: 36, textAlign: 'right' }]}>{batter.runs}</Text>
      <Text style={[styles.statText, { width: 32, textAlign: 'right' }]}>{batter.balls}</Text>
      <Text style={[styles.statText, { width: 28, textAlign: 'right' }]}>{batter.fours}</Text>
      <Text style={[styles.statText, { width: 28, textAlign: 'right' }]}>{batter.sixes}</Text>
      <Text style={[styles.statText, { width: 45, textAlign: 'right' }]}>{Math.round(batter.strikeRate)}</Text>
    </View>
  </View>
);

const BowlerRow = ({ bowler, playerName, isLast }: any) => (
  <View style={[styles.tableRow, !isLast && styles.borderBottom]}>
    <View style={styles.playerInfo}>
      <Text style={[styles.playerName, bowler.isCurrentBowler && styles.statBold]}>{playerName}</Text>
    </View>
    <View style={styles.statsCols}>
      <Text style={[styles.statText, { width: 36, textAlign: 'right' }]}>{bowler.overs}</Text>
      <Text style={[styles.statText, { width: 32, textAlign: 'right' }]}>{bowler.maidens}</Text>
      <Text style={[styles.statText, { width: 32, textAlign: 'right' }]}>{bowler.runs}</Text>
      <Text style={[styles.statText, styles.statBold, { width: 28, textAlign: 'right' }]}>{bowler.wickets}</Text>
      <Text style={[styles.statText, { width: 45, textAlign: 'right' }]}>{bowler.economy}</Text>
    </View>
  </View>
);

export default function ScorecardScreen() {
  const { id } = useLocalSearchParams();
  const [collapsedInnings, setCollapsedInnings] = useState<Record<number, boolean>>({});

  const { data: match, error, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';
      const res = await fetch(`${apiUrl}/matches/${id}`);
      if (!res.ok) throw new Error('API responded with ' + res.status);
      return res.json();
    }
  });

  const getTeamName = (teamId: number) => {
    return match?.teams?.find((t: any) => t.teamId === teamId)?.teamName || 'Unknown Team';
  };

  const getPlayerName = (teamId: number, playerId: number) => {
    const team = match?.teams?.find((t: any) => t.teamId === teamId);
    const player = team?.players?.find((p: any) => p.playerId === playerId);
    return player?.playerName || 'Unknown Player';
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Loading...', headerBackTitle: 'Back' }} />
        <ActivityIndicator size="large" color={colors.whatsappGreen} />
      </View>
    );
  }

  if (error || !match) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Error', headerBackTitle: 'Back' }} />
        <AlertCircle size={40} color={colors.error} />
        <Text style={styles.errorText}>Failed to load match details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: `${match.teams?.[0]?.teamName} vs ${match.teams?.[1]?.teamName}`, headerBackTitle: 'Back' }} />

      {/* Match Header Info */}
      <View style={styles.matchHeader}>
        <Text style={styles.groundText}>{match.ground} • {match.date}</Text>
        {match.toss && (
          <Text style={styles.tossText}>
            {getTeamName(match.toss.wonBy)} won the toss and elected to {match.toss.decision}
          </Text>
        )}
        {match.result ? (
          <Text style={styles.resultText}>{match.result}</Text>
        ) : match.status === 'live' ? (
          <Text style={[styles.resultText, { color: colors.error }]}>Match is Live</Text>
        ) : null}
      </View>

      {/* Innings Scorecards */}
      {match.innings?.map((inning: any, index: number) => {
        const teamName = getTeamName(inning.teamId);
        const bowlingTeamId = match.teams.find((t: any) => t.teamId !== inning.teamId)?.teamId;

        // Default to active for the last inning, collapsed for previous ones
        const isCollapsed = collapsedInnings[index] !== undefined
          ? collapsedInnings[index]
          : index !== match.innings.length - 1;

        const toggleCollapse = () => {
          setCollapsedInnings(prev => ({
            ...prev,
            [index]: !isCollapsed
          }));
        };

        return (
          <View key={`inning-${index}`} style={styles.inningContainer}>
            <TouchableOpacity
              style={styles.inningHeader}
              onPress={toggleCollapse}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.inningTitle}>{teamName}</Text>
                <Text style={styles.inningScore}>
                  {inning.score}/{inning.wickets} <Text style={styles.inningOvers}>({inning.overs} Ov)</Text>
                </Text>
              </View>
              {isCollapsed ? (
                <ChevronDown size={24} color={colors.onSurface} />
              ) : (
                <ChevronUp size={24} color={colors.onSurface} />
              )}
            </TouchableOpacity>

            {!isCollapsed && (
              <>
                {/* Batting Section */}
                <View style={styles.cardGroup}>
                  <View style={[styles.tableHeader, styles.borderBottom]}>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Batter</Text>
                    <View style={styles.statsCols}>
                      <Text style={[styles.tableHeaderText, { width: 36, textAlign: 'right' }]}>R</Text>
                      <Text style={[styles.tableHeaderText, { width: 32, textAlign: 'right' }]}>B</Text>
                      <Text style={[styles.tableHeaderText, { width: 28, textAlign: 'right' }]}>4s</Text>
                      <Text style={[styles.tableHeaderText, { width: 28, textAlign: 'right' }]}>6s</Text>
                      <Text style={[styles.tableHeaderText, { width: 45, textAlign: 'right' }]}>SR</Text>
                    </View>
                  </View>
                  {inning.batting?.map((batter: any, bIdx: number) => (
                    <BatterRow
                      key={`batter-${batter.playerId}`}
                      batter={batter}
                      playerName={getPlayerName(inning.teamId, batter.playerId)}
                      isLast={bIdx === inning.batting.length - 1}
                    />
                  ))}
                </View>

                <View style={styles.extrasContainer}>
                  <Text style={styles.extrasText}>
                    <Text style={{ fontWeight: 'bold' }}>Extras: {inning.extras.total}</Text> (b {inning.extras.byes}, lb {inning.extras.legByes}, w {inning.extras.wides}, nb {inning.extras.noBalls})
                  </Text>
                </View>

                {/* Bowling Section */}
                <View style={styles.cardGroup}>
                  <View style={[styles.tableHeader, styles.borderBottom]}>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Bowler</Text>
                    <View style={styles.statsCols}>
                      <Text style={[styles.tableHeaderText, { width: 36, textAlign: 'right' }]}>O</Text>
                      <Text style={[styles.tableHeaderText, { width: 32, textAlign: 'right' }]}>M</Text>
                      <Text style={[styles.tableHeaderText, { width: 32, textAlign: 'right' }]}>R</Text>
                      <Text style={[styles.tableHeaderText, { width: 28, textAlign: 'right' }]}>W</Text>
                      <Text style={[styles.tableHeaderText, { width: 45, textAlign: 'right' }]}>ECON</Text>
                    </View>
                  </View>
                  {inning.bowling?.map((bowler: any, bwIdx: number) => (
                    <BowlerRow
                      key={`bowler-${bowler.playerId}`}
                      bowler={bowler}
                      playerName={getPlayerName(bowlingTeamId, bowler.playerId)}
                      isLast={bwIdx === inning.bowling.length - 1}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        );
      })}

      {/* Commentary Section */}
      {match.commentary && match.commentary.length > 0 && (
        <View style={styles.commentaryContainer}>
          <Text style={styles.sectionTitle}>Commentary</Text>
          {match.commentary.map((comm: any, idx: number) => (
            <View key={`comm-${idx}`} style={styles.commentaryItem}>
              <View style={styles.overBadge}>
                <Text style={styles.overBadgeText}>{comm.over}</Text>
              </View>
              <Text style={styles.commentaryText}>
                <Text style={{ fontWeight: 'bold' }}>{comm.isWicket ? 'OUT! ' : (comm.runs > 0 ? `${comm.runs} runs! ` : '')}</Text>
                {comm.text}
              </Text>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  errorText: {
    marginTop: 16,
    fontSize: typography.bodyLg.fontSize,
    color: colors.error,
  },
  matchHeader: {
    padding: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    marginBottom: 16,
  },
  groundText: {
    fontSize: typography.labelSm.fontSize,
    color: colors.systemGray,
    marginBottom: 8,
  },
  tossText: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultText: {
    fontSize: typography.bodyLgSemibold.fontSize,
    fontWeight: 'bold',
    color: colors.whatsappGreen,
    marginTop: 8,
  },
  inningContainer: {
    marginBottom: 24,
  },
  inningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  inningTitle: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: typography.headlineMd.fontWeight,
    color: colors.onSurface,
  },
  inningScore: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: typography.headlineMd.fontWeight,
    color: colors.onSurface,
  },
  inningOvers: {
    fontSize: typography.bodyMd.fontSize,
    fontWeight: 'normal',
    color: colors.systemGray,
  },
  cardGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceContainerLowest,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerHighest,
  },
  tableHeaderText: {
    fontSize: typography.caption.fontSize,
    color: colors.systemGray,
    fontWeight: 'bold',
  },
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
  extrasContainer: {
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    marginBottom: 16,
    marginTop: -16, // Connect to batting card group
  },
  extrasText: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
  commentaryContainer: {
    padding: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  sectionTitle: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: typography.headlineMd.fontWeight,
    color: colors.onSurface,
    marginBottom: 16,
  },
  commentaryItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  overBadge: {
    width: 44,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  overBadgeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  commentaryText: {
    flex: 1,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    lineHeight: 22,
  }
});
