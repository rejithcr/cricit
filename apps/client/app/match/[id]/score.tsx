import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, typography } from '../../../src/theme';

// ─── Domain types ────────────────────────────────────────────────────────────

interface BatterState {
  playerId: number;
  name: string;
  runs: number;
  balls: number;
}

interface BowlerState {
  playerId: number;
  name: string;
  runsGiven: number;
  wicketsTaken: number;
  /** Legal balls bowled in the current over */
  ballsThisOver: number;
  /** Total legal balls bowled in spell (for overs display) */
  totalLegalBalls: number;
}

interface ScoringState {
  teamName: string;
  score: number;
  wickets: number;
  /** Total legal balls bowled in innings */
  totalLegalBalls: number;
  /** All deliveries (including extras) recorded in the current over */
  currentOverDeliveries: string[];
  striker: BatterState;
  nonStriker: BatterState;
  bowler: BowlerState;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEGAL_OUTCOMES = new Set(['0', '1', '2', '3', '4', '6', 'W']);
const EXTRA_OUTCOMES = new Set(['Wd', 'Nb']);

function formatOvers(totalLegalBalls: number): string {
  const overs = Math.floor(totalLegalBalls / 6);
  const balls = totalLegalBalls % 6;
  return `${overs}.${balls}`;
}

function deliveryBgColor(outcome: string): string {
  if (outcome === 'W') return colors.error;
  if (outcome === '4') return '#1a73e8';
  if (outcome === '6') return colors.whatsappGreen;
  if (EXTRA_OUTCOMES.has(outcome)) return '#f59e0b';
  return colors.surfaceContainerHighest;
}

function deliveryTextColor(outcome: string): string {
  if (['W', '4', '6'].includes(outcome)) return '#fff';
  if (EXTRA_OUTCOMES.has(outcome)) return '#fff';
  return colors.onSurface;
}

function runsFromOutcome(outcome: string): number {
  if (outcome === 'W') return 0;
  if (EXTRA_OUTCOMES.has(outcome)) return 1;
  return parseInt(outcome, 10);
}

// ─── Pad layout ───────────────────────────────────────────────────────────────

const PAD_ROWS: { label: string; value: string }[][] = [
  [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
  ],
  [
    { label: '6', value: '6' },
    { label: 'W', value: 'W' },
    { label: 'Wd', value: 'Wd' },
    { label: 'Nb', value: 'Nb' },
  ],
  [
    { label: '0 · Dot', value: '0' },
    { label: '⟵ Undo', value: 'UNDO' },
  ],
];

// ─── State initialiser ────────────────────────────────────────────────────────

function buildInitialState(match: any): ScoringState | null {
  const innings = match.innings?.[match.innings.length - 1];
  if (!innings) return null;

  const battingTeam = match.teams.find((t: any) => t.teamId === innings.teamId);
  const bowlingTeam = match.teams.find((t: any) => t.teamId !== innings.teamId);

  const getPlayerName = (team: any, playerId: number): string =>
    team?.players?.find((p: any) => p.playerId === playerId)?.playerName ?? 'Unknown';

  const notOut = innings.batting?.filter((b: any) => !b.out) ?? [];
  const strikerData = notOut.find((b: any) => b.isStriker) ?? notOut[0];
  const nonStrikerData = notOut.find((b: any) => !b.isStriker) ?? notOut[1];
  const bowlerData =
    innings.bowling?.find((b: any) => b.isCurrentBowler) ??
    innings.bowling?.[innings.bowling.length - 1];

  const oversToLegal = (overs: number) =>
    Math.floor(overs) * 6 + Math.round((overs % 1) * 10);

  return {
    teamName: battingTeam?.teamName ?? '',
    score: innings.score ?? 0,
    wickets: innings.wickets ?? 0,
    totalLegalBalls: oversToLegal(innings.overs ?? 0),
    currentOverDeliveries: [],
    striker: {
      playerId: strikerData?.playerId,
      name: getPlayerName(battingTeam, strikerData?.playerId),
      runs: strikerData?.runs ?? 0,
      balls: strikerData?.balls ?? 0,
    },
    nonStriker: {
      playerId: nonStrikerData?.playerId,
      name: getPlayerName(battingTeam, nonStrikerData?.playerId),
      runs: nonStrikerData?.runs ?? 0,
      balls: nonStrikerData?.balls ?? 0,
    },
    bowler: {
      playerId: bowlerData?.playerId,
      name: getPlayerName(bowlingTeam, bowlerData?.playerId),
      runsGiven: bowlerData?.runs ?? 0,
      wicketsTaken: bowlerData?.wickets ?? 0,
      ballsThisOver: oversToLegal(bowlerData?.overs ?? 0) % 6,
      totalLegalBalls: oversToLegal(bowlerData?.overs ?? 0),
    },
  };
}

// ─── Delivery reducer ─────────────────────────────────────────────────────────

function applyDelivery(prev: ScoringState, outcome: string): ScoringState {
  const isLegal = LEGAL_OUTCOMES.has(outcome);
  const isExtra = EXTRA_OUTCOMES.has(outcome);
  const isWicket = outcome === 'W';
  const runs = runsFromOutcome(outcome);

  const newDeliveries = [...prev.currentOverDeliveries, outcome];
  const newBowlerBalls = isLegal ? prev.bowler.ballsThisOver + 1 : prev.bowler.ballsThisOver;
  const overComplete = newBowlerBalls >= 6;

  const updatedStriker: BatterState = {
    ...prev.striker,
    runs: prev.striker.runs + (isExtra || isWicket ? 0 : runs),
    balls: isLegal ? prev.striker.balls + 1 : prev.striker.balls,
  };

  const shouldRotate = overComplete || (!isExtra && !isWicket && runs % 2 === 1);
  const nextStriker = shouldRotate ? prev.nonStriker : updatedStriker;
  const nextNonStriker = shouldRotate ? updatedStriker : prev.nonStriker;

  return {
    ...prev,
    score: prev.score + runs,
    wickets: isWicket ? prev.wickets + 1 : prev.wickets,
    totalLegalBalls: isLegal ? prev.totalLegalBalls + 1 : prev.totalLegalBalls,
    currentOverDeliveries: overComplete ? [] : newDeliveries,
    striker: nextStriker,
    nonStriker: nextNonStriker,
    bowler: {
      ...prev.bowler,
      runsGiven: prev.bowler.runsGiven + runs,
      wicketsTaken: isWicket ? prev.bowler.wicketsTaken + 1 : prev.bowler.wicketsTaken,
      ballsThisOver: overComplete ? 0 : newBowlerBalls,
      totalLegalBalls: isLegal ? prev.bowler.totalLegalBalls + 1 : prev.bowler.totalLegalBalls,
    },
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScoringScreen() {
  const { id } = useLocalSearchParams();
  const [scoringState, setScoringState] = useState<ScoringState | null>(null);
  const [history, setHistory] = useState<ScoringState[]>([]);

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';
      const res = await fetch(`${apiUrl}/matches/${id}`);
      if (!res.ok) throw new Error('Failed to load match');
      return res.json();
    },
  });

  useEffect(() => {
    if (match && !scoringState) {
      setScoringState(buildInitialState(match));
    }
  }, [match]);

  const handleBall = useCallback(
    (value: string) => {
      if (value === 'UNDO') {
        if (history.length === 0) return;
        setScoringState(history[history.length - 1]);
        setHistory(prev => prev.slice(0, -1));
        return;
      }
      setScoringState(prev => {
        if (!prev) return prev;
        setHistory(h => [...h, prev]);
        return applyDelivery(prev, value);
      });
    },
    [history],
  );

  if (isLoading || !scoringState) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Scoring' }} />
        <ActivityIndicator size="large" color={colors.whatsappGreen} />
      </View>
    );
  }

  const { striker, nonStriker, bowler } = scoringState;
  const matchTitle = `${match?.teams?.[0]?.teamName} vs ${match?.teams?.[1]?.teamName}`;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: matchTitle }} />

      {/* Score Banner */}
      <View style={styles.scoreBanner}>
        <Text style={styles.bannerTeam}>{scoringState.teamName}</Text>
        <Text style={styles.bannerScore}>
          {scoringState.score}
          <Text style={styles.bannerWickets}>/{scoringState.wickets}</Text>
        </Text>
        <Text style={styles.bannerOvers}>
          {formatOvers(scoringState.totalLegalBalls)} Overs
        </Text>
      </View>

      {/* Current Players Card */}
      <View style={styles.playersCard}>
        <Text style={styles.sectionLabel}>BATTING</Text>

        <View style={styles.playerRow}>
          <View style={styles.playerLeft}>
            <Text style={styles.strikerStar}>*</Text>
            <Text style={styles.playerName}>{striker.name}</Text>
          </View>
          <Text style={styles.playerStats}>
            {striker.runs}
            <Text style={styles.ballsText}> ({striker.balls})</Text>
          </Text>
        </View>

        <View style={styles.playerRow}>
          <View style={styles.playerLeft}>
            <Text style={[styles.strikerStar, { opacity: 0 }]}>*</Text>
            <Text style={[styles.playerName, styles.nonStrikerName]}>
              {nonStriker.name}
            </Text>
          </View>
          <Text style={[styles.playerStats, styles.nonStrikerStats]}>
            {nonStriker.runs}
            <Text style={styles.ballsText}> ({nonStriker.balls})</Text>
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>BOWLING</Text>
        <View style={styles.playerRow}>
          <Text style={styles.playerName}>{bowler.name}</Text>
          <Text style={styles.bowlerFigures}>
            {formatOvers(bowler.totalLegalBalls)}–0–{bowler.runsGiven}–{bowler.wicketsTaken}
          </Text>
        </View>
      </View>

      {/* This Over */}
      <View style={styles.overRow}>
        <Text style={styles.overLabel}>This Over</Text>
        <View style={styles.deliveries}>
          {scoringState.currentOverDeliveries.length === 0 ? (
            <Text style={styles.overEmpty}>No deliveries yet</Text>
          ) : (
            scoringState.currentOverDeliveries.map((d, i) => (
              <View
                key={i}
                style={[styles.deliveryBadge, { backgroundColor: deliveryBgColor(d) }]}
              >
                <Text style={[styles.deliveryText, { color: deliveryTextColor(d) }]}>
                  {d}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Input Pad */}
      <View style={styles.pad}>
        {PAD_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.padRow}>
            {row.map(btn => {
              const isUndo = btn.value === 'UNDO';
              const isWicket = btn.value === 'W';
              const isFour = btn.value === '4';
              const isSix = btn.value === '6';
              const isExtra = EXTRA_OUTCOMES.has(btn.value);
              const disabled = isUndo && history.length === 0;

              return (
                <TouchableOpacity
                  key={btn.value}
                  style={[
                    styles.padBtn,
                    isWicket && styles.padBtnWicket,
                    isFour && styles.padBtnFour,
                    isSix && styles.padBtnSix,
                    isExtra && styles.padBtnExtra,
                    isUndo && styles.padBtnUndo,
                    disabled && styles.padBtnDisabled,
                  ]}
                  onPress={() => handleBall(btn.value)}
                  disabled={disabled}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.padBtnText,
                      (isWicket || isFour || isSix || isExtra) && styles.padBtnTextLight,
                      disabled && styles.padBtnTextDisabled,
                    ]}
                  >
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  scoreBanner: {
    backgroundColor: colors.whatsappGreen,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  bannerTeam: {
    fontSize: typography.labelSm.fontSize,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bannerScore: {
    fontSize: 56,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 64,
  },
  bannerWickets: {
    fontSize: 36,
    fontWeight: '400',
  },
  bannerOvers: {
    fontSize: typography.bodyMd.fontSize,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  playersCard: {
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: colors.systemGray,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  strikerStar: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.whatsappGreen,
    width: 14,
    marginRight: 4,
  },
  playerName: {
    fontSize: typography.bodyLg.fontSize,
    fontWeight: '600',
    color: colors.onSurface,
  },
  nonStrikerName: {
    fontWeight: '400',
    color: colors.systemGray,
  },
  playerStats: {
    fontSize: typography.bodyLg.fontSize,
    fontWeight: '700',
    color: colors.onSurface,
  },
  nonStrikerStats: {
    fontWeight: '400',
    color: colors.systemGray,
  },
  ballsText: {
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '400',
    color: colors.systemGray,
  },
  bowlerFigures: {
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '500',
    color: colors.systemGray,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },
  overRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  overLabel: {
    fontSize: typography.labelSm.fontSize,
    fontWeight: '600',
    color: colors.systemGray,
    width: 64,
  },
  deliveries: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  deliveryBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  overEmpty: {
    fontSize: typography.labelSm.fontSize,
    color: colors.systemGray,
    fontStyle: 'italic',
  },
  pad: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    marginTop: 12,
  },
  padRow: {
    flexDirection: 'row',
    gap: 10,
  },
  padBtn: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  padBtnWicket: {
    backgroundColor: colors.error,
  },
  padBtnFour: {
    backgroundColor: '#1a73e8',
  },
  padBtnSix: {
    backgroundColor: colors.whatsappGreen,
  },
  padBtnExtra: {
    backgroundColor: '#f59e0b',
  },
  padBtnUndo: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  padBtnDisabled: {
    opacity: 0.3,
  },
  padBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  padBtnTextLight: {
    color: '#fff',
  },
  padBtnTextDisabled: {
    color: colors.systemGray,
  },
});
