import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Search, MoreVertical } from 'lucide-react-native';
import { colors, typography } from '../../../src/theme';
import { ConfirmationModal, SearchBar, SettingsMenu, NumericTextInput } from '../../../src/components';
import { useRouter } from 'expo-router';

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
  needsNewBowler?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEGAL_OUTCOMES = new Set(['0', '1', '2', '3', '4', '6', 'W']);
const EXTRA_OUTCOMES = new Set(['Wd', 'Nb', 'By', 'Lb']);

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
    needsNewBowler:
      oversToLegal(innings.overs ?? 0) > 0 &&
      oversToLegal(innings.overs ?? 0) % 6 === 0 &&
      oversToLegal(bowlerData?.overs ?? 0) > 0 &&
      oversToLegal(bowlerData?.overs ?? 0) % 6 === 0,
  };
}

// ─── Delivery reducer ─────────────────────────────────────────────────────────

function applyDelivery(prev: ScoringState, event: any): ScoringState {
  const outcome = typeof event === 'string' ? event : (
    event.type === 'wicket' ? 'W' :
      event.type === 'wide' ? 'Wd' :
        event.type === 'noBall' ? 'Nb' :
          String(event.runs)
  );

  const isLegal = LEGAL_OUTCOMES.has(outcome);
  const isExtra = EXTRA_OUTCOMES.has(outcome);
  const isWicket = outcome === 'W';

  // Total runs added to score
  let totalRuns = 0;
  if (typeof event === 'object') {
    totalRuns = event.runs + (isExtra ? 1 : 0);
  } else {
    totalRuns = runsFromOutcome(outcome);
  }

  // Batter runs off the bat
  let batterRuns = 0;
  if (typeof event === 'object') {
    batterRuns = (event.type === 'legal' || event.type === 'wicket') ? event.runs : 0;
  } else {
    batterRuns = (isExtra || isWicket) ? 0 : runsFromOutcome(outcome);
  }

  const newDeliveries = [...prev.currentOverDeliveries, outcome];
  const newBowlerBalls = isLegal ? prev.bowler.ballsThisOver + 1 : prev.bowler.ballsThisOver;
  const overComplete = newBowlerBalls >= 6;

  const updatedStriker: BatterState = {
    ...prev.striker,
    runs: prev.striker.runs + batterRuns,
    balls: isLegal ? prev.striker.balls + 1 : prev.striker.balls,
  };

  const physicalRuns = typeof event === 'object'
    ? event.runs
    : (isExtra ? 0 : runsFromOutcome(outcome));

  // XOR: rotate if exactly one of (odd runs, over-complete) is true
  const runBasedRotation = (physicalRuns % 2 === 1);
  const shouldRotate = runBasedRotation !== overComplete; // XOR

  let nextStriker = shouldRotate ? prev.nonStriker : updatedStriker;
  let nextNonStriker = shouldRotate ? updatedStriker : prev.nonStriker;

  if (isWicket) {
    // New batter placeholder comes on strike (or non-strike if they crossed)
    const newBatterPlaceholder: BatterState = { playerId: -1, name: 'New Batter', runs: 0, balls: 0 };
    // The player who was NOT out keeps their position; new batter takes the dismissed batter's end
    if (shouldRotate) {
      // Striker scored odd runs then got run-out — non-striker is now at striker's end
      nextNonStriker = newBatterPlaceholder;
    } else {
      nextStriker = newBatterPlaceholder;
    }
  }

  return {
    ...prev,
    score: prev.score + totalRuns,
    wickets: isWicket ? prev.wickets + 1 : prev.wickets,
    totalLegalBalls: isLegal ? prev.totalLegalBalls + 1 : prev.totalLegalBalls,
    currentOverDeliveries: overComplete ? [] : newDeliveries,
    striker: nextStriker,
    nonStriker: nextNonStriker,
    bowler: {
      ...prev.bowler,
      runsGiven: prev.bowler.runsGiven + totalRuns,
      wicketsTaken: isWicket ? prev.bowler.wicketsTaken + 1 : prev.bowler.wicketsTaken,
      ballsThisOver: overComplete ? 0 : newBowlerBalls,
      totalLegalBalls: isLegal ? prev.bowler.totalLegalBalls + 1 : prev.bowler.totalLegalBalls,
    },
    needsNewBowler: overComplete,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScoringScreen() {
  const { id } = useLocalSearchParams();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';
  const [scoringState, setScoringState] = useState<ScoringState | null>(null);
  const [history, setHistory] = useState<ScoringState[]>([]);

  const [wicketModalVisible, setWicketModalVisible] = useState(false);
  const [customRunModalVisible, setCustomRunModalVisible] = useState(false);
  const [customRunType, setCustomRunType] = useState('Runs');
  const [customRunInput, setCustomRunInput] = useState('');
  const [showManualRunInput, setShowManualRunInput] = useState(false);
  const [newBowlerModalVisible, setNewBowlerModalVisible] = useState(false);
  const [endInningsModalVisible, setEndInningsModalVisible] = useState(false);
  const [startInningsModalVisible, setStartInningsModalVisible] = useState(false);
  const [selectedNewBowlerId, setSelectedNewBowlerId] = useState<number>(0);
  const [startInningsDetails, setStartInningsDetails] = useState({ strikerId: 0, nonStrikerId: 0, bowlerId: 0 });
  const [startInningsSearch, setStartInningsSearch] = useState('');
  const [newBowlerSearch, setNewBowlerSearch] = useState('');
  const [newBatterSearch, setNewBatterSearch] = useState('');
  const [wicketStep, setWicketStep] = useState(1);
  const [showWicketManualRuns, setShowWicketManualRuns] = useState(false);
  const [wicketManualRunsStr, setWicketManualRunsStr] = useState('');
  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  const [overCompleteAlertVisible, setOverCompleteAlertVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [wicketDetails, setWicketDetails] = useState({
    type: 'Caught',
    runs: 0,
    fielderId: 0,
    playerOutId: 0,
    newBatterId: 0, // selected inline in the wicket modal
  });

  const { data: match, isLoading, refetch } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/matches/${id}`);
      if (!res.ok) throw new Error('Failed to load match');
      return res.json();
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (match && !scoringState) {
      const innings = match.innings?.[match.innings.length - 1];
      if (innings && innings.batting?.length === 0) {
        setStartInningsModalVisible(true);
      } else {
        setScoringState(buildInitialState(match));
      }
    }
  }, [match]);

  useFocusEffect(
    useCallback(() => {
      refetch().then(res => {
        if (res.data) {
          const innings = res.data.innings?.[res.data.innings.length - 1];
          if (innings && innings.batting?.length === 0) {
            setStartInningsModalVisible(true);
          } else {
            setScoringState(buildInitialState(res.data));
            setHistory([]);
          }
        }
      });
    }, [refetch])
  );

  const submitEvent = async (action: string, data: any = null) => {
    try {
      await fetch(`${apiUrl}/matches/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data, scorerId: 'scorer-001' })
      });
    } catch (err) {
      console.error('Failed to submit event', err);
      if (action === 'ball') {
        // Rollback
        setScoringState(history[history.length - 1]);
        setHistory(prev => prev.slice(0, -1));
      }
    }
  };

  const processDelivery = (eventData: any) => {
    setScoringState(prev => {
      if (!prev) return prev;
      setHistory(h => [...h, prev]);
      const next = applyDelivery(prev, eventData);

      const isLegalDelivery = eventData.type === 'legal' || eventData.type === 'wicket'
        || eventData.type === 'bye' || eventData.type === 'legBye';

      const totalLegalBalls = isLegalDelivery ? prev.totalLegalBalls + 1 : prev.totalLegalBalls;
      const totalOvers = match?.rules?.totalOvers || 20;
      const ballsPerOver = match?.rules?.ballsPerOver || 6;
      const oversExhausted = totalLegalBalls >= (totalOvers * ballsPerOver);

      if (oversExhausted) {
        setEndInningsModalVisible(true);
      } else {
        const newBowlerBalls = isLegalDelivery ? prev.bowler.ballsThisOver + 1 : prev.bowler.ballsThisOver;
        if (newBowlerBalls >= 6) {
          setNewBowlerModalVisible(true);
        }
      }

      return next;
    });
    submitEvent('ball', eventData);
  };

  const handleBall = useCallback(
    async (value: string) => {
      if (value === 'UNDO') {
        if (history.length === 0) return;
        setScoringState(history[history.length - 1]);
        setHistory(prev => prev.slice(0, -1));
        submitEvent('undo');
        return;
      }

      if (scoringState && (scoringState.bowler.ballsThisOver >= 6 || scoringState.needsNewBowler)) {
        console.log('needs new bowler',)
        setOverCompleteAlertVisible(true);
        return;
      }

      if (value === 'W') {
        setWicketDetails(prev => ({ ...prev, playerOutId: scoringState?.striker.playerId || 0 }));
        setWicketModalVisible(true);
        return;
      }

      if (value === 'Wd' || value === 'Nb' || value === 'By' || value === 'Lb') {
        setCustomRunType(value);
        setCustomRunInput('0');
        setShowManualRunInput(false);
        setCustomRunModalVisible(true);
        return;
      }

      if (value === 'Custom') {
        setCustomRunType('Runs');
        setCustomRunInput('');
        setShowManualRunInput(false);
        setCustomRunModalVisible(true);
        return;
      }

      // Legal simple runs — no modals needed
      processDelivery({
        type: 'legal',
        runs: parseInt(value, 10) || 0
      });
    },
    [history, id, apiUrl, scoringState],
  );

  const handleStartInningsSubmit = async () => {
    setStartInningsModalVisible(false);
    await submitEvent('start_innings', startInningsDetails);
    queryClient.invalidateQueries({ queryKey: ['match', id] });
  };

  const handleWicketSubmit = async (endInningsAction: boolean = false, overrideNewBatterId?: number) => {
    setWicketModalVisible(false);
    setWicketStep(1);

    const resolvedNewBatterId = overrideNewBatterId || wicketDetails.newBatterId;

    // Resolve the new batter's name from squad data for immediate local display
    const innings = match?.innings?.[match.innings.length - 1];
    const battingTeam = match?.teams?.find((t: any) => t.teamId === innings?.teamId);
    const newBatterPlayer = battingTeam?.players?.find((p: any) => p.playerId === resolvedNewBatterId);

    const finalEvent = {
      type: 'wicket',
      runs: wicketDetails.runs,
      wicket: {
        dismissalType: wicketDetails.type,
        playerOutId: wicketDetails.playerOutId,
        fielderId: wicketDetails.fielderId || undefined,
        newBatterId: endInningsAction ? undefined : (resolvedNewBatterId || undefined),
      },
    };

    setScoringState(prev => {
      if (!prev) return prev;
      setHistory(h => [...h, prev]);
      const next = applyDelivery(prev, finalEvent);

      const totalLegalBalls = prev.totalLegalBalls + 1;
      const totalOvers = match?.rules?.totalOvers || 20;
      const ballsPerOver = match?.rules?.ballsPerOver || 6;
      const oversExhausted = totalLegalBalls >= (totalOvers * ballsPerOver);

      if (endInningsAction || oversExhausted) {
        setEndInningsModalVisible(true);
      } else {
        const newBowlerBalls = prev.bowler.ballsThisOver + 1;
        if (newBowlerBalls >= 6) setNewBowlerModalVisible(true);
      }

      if (endInningsAction || !newBatterPlayer) return next;

      // Patch the placeholder name to the actual player name
      return {
        ...next,
        striker: next.striker.playerId === -1
          ? { playerId: resolvedNewBatterId, name: newBatterPlayer.playerName, runs: 0, balls: 0 }
          : next.striker,
        nonStriker: next.nonStriker.playerId === -1
          ? { playerId: resolvedNewBatterId, name: newBatterPlayer.playerName, runs: 0, balls: 0 }
          : next.nonStriker,
      };
    });

    await submitEvent('ball', finalEvent);
    if (endInningsAction) {
      await submitEvent('end_innings');
    }
  };

  const handleNewBowlerSubmit = (overrideBowlerId?: number) => {
    setNewBowlerModalVisible(false);
    const resolvedBowlerId = overrideBowlerId || selectedNewBowlerId;
    if (!resolvedBowlerId || !scoringState) return;

    // Get bowler name from match data
    const innings = match?.innings?.[match.innings.length - 1];
    const bowlingTeam = match?.teams?.find((t: any) => t.teamId !== innings?.teamId);
    const playerData = bowlingTeam?.players?.find((p: any) => p.playerId === resolvedBowlerId);

    // Update local scoring state immediately
    setScoringState(prev => prev ? {
      ...prev,
      bowler: {
        playerId: resolvedBowlerId,
        name: playerData?.playerName ?? 'New Bowler',
        runsGiven: 0,
        wicketsTaken: 0,
        ballsThisOver: 0,
        totalLegalBalls: 0,
      },
      needsNewBowler: false,
    } : prev);
    // Broadcast to all viewers via the event pipeline
    submitEvent('new_bowler', { bowlerId: resolvedBowlerId });
  };

  const handleCustomRunSubmit = (runStr?: string) => {
    setCustomRunModalVisible(false);

    const runToSubmit = runStr !== undefined ? runStr : customRunInput;

    let typeStr = 'legal';
    if (customRunType === 'Wd') typeStr = 'wide';
    else if (customRunType === 'Nb') typeStr = 'noBall';
    else if (customRunType === 'By') typeStr = 'bye';
    else if (customRunType === 'Lb') typeStr = 'legBye';

    processDelivery({
      type: typeStr,
      runs: parseInt(runToSubmit || '0', 10)
    });
  };

  const handleResetMatch = async () => {
    setIsResetting(true);
    try {
      const res = await fetch(`${apiUrl}/matches/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_match', scorerId: 'scorer-001' })
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['match', id] });
        setResetConfirmVisible(false);
        router.replace(`/match/${id}`);
      }
    } catch (e) {
      console.error('Failed to reset match', e);
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading || (!scoringState && !startInningsModalVisible)) {
    return (
      <View style={styles.centered}>
        <Stack.Screen
          options={{
            title: 'Scoring',
            headerStyle: { backgroundColor: '#000000' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { color: '#ffffff' },
            headerShadowVisible: false,
          }}
        />
        <ActivityIndicator size="large" color={colors.whatsappGreen} />
      </View>
    );
  }

  const {
    teamName = '',
    score = 0,
    wickets = 0,
    totalLegalBalls = 0,
    currentOverDeliveries = [],
    striker = { playerId: 0, name: '', runs: 0, balls: 0 },
    nonStriker = { playerId: 0, name: '', runs: 0, balls: 0 },
    bowler = { playerId: 0, name: '', runsGiven: 0, wicketsTaken: 0, ballsThisOver: 0, totalLegalBalls: 0 }
  } = scoringState || {};

  const isNewBatterSelected = !!wicketDetails.newBatterId && wicketDetails.newBatterId !== 0;
  const isMaxWicketsReached = (wickets + 1) >= (match?.rules?.maxWickets || 10);
  const matchTitle = `${match?.teams?.[0]?.teamName} vs ${match?.teams?.[1]?.teamName}`;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: matchTitle,
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { color: '#ffffff' },
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity onPress={() => setSettingsMenuVisible(true)} style={{ marginRight: 10 }}>
              <MoreVertical size={24} color="#ffffff" />
            </TouchableOpacity>
          )
        }}
      />

      {/* Top Banner (Score & Status) */}
      <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: '#000000' }}>
        <Text style={{ color: '#fff', fontSize: 48, fontWeight: '300' }}>
          {score}<Text style={{ fontSize: 32 }}>/{wickets}</Text>
          <Text style={{ fontSize: 18, color: '#ccc', marginLeft: 8 }}> ({formatOvers(totalLegalBalls)}/{match?.rules?.totalOvers || 20})</Text>
        </Text>
        <Text style={{ color: '#ccc', fontSize: 14, marginTop: 8 }}>
          {match?.toss ? `${match.teams?.find((t: any) => t.teamId === match.toss.wonBy)?.teamName || 'Team'} won the toss and elected to ${match.toss.decision}` : 'Match started'}
        </Text>
        <Text style={{ color: '#aaa', fontSize: 13, marginTop: 16 }}>
          Match ID: {id}
        </Text>
      </View>

      {/* Players Card (WhatsApp style) */}
      <View style={{ backgroundColor: '#222' }}>
        {/* Batters Row */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' }}>
          {/* Striker (Left) */}
          <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#333', padding: 12, flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#00bcd4', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 2 }}>
              <Text style={{ fontSize: 12 }}>🏏</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#00bcd4', fontSize: 16 }} numberOfLines={1}>{striker.name} *</Text>
              <Text style={{ color: '#fff', fontSize: 14, marginTop: 2 }}>{striker.runs}({striker.balls})</Text>
            </View>
          </View>
          {/* Non-Striker (Right) */}
          <View style={{ flex: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 2 }}>
              <Text style={{ fontSize: 12 }}>🏃</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#aaa', fontSize: 16 }} numberOfLines={1}>{nonStriker.name}</Text>
              <Text style={{ color: '#fff', fontSize: 14, marginTop: 2 }}>{nonStriker.runs}({nonStriker.balls})</Text>
            </View>
          </View>
        </View>

        {/* Bowler Row */}
        <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#555', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
              <Text style={{ fontSize: 12 }}>⚾</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 16 }} numberOfLines={1}>{bowler.name}</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>
            {formatOvers(bowler.totalLegalBalls)}-0-{bowler.runsGiven}-{bowler.wicketsTaken}
          </Text>
        </View>
      </View>

      {/* This Over */}
      <View style={[styles.overRow, { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 8, elevation: 0, shadowOpacity: 0 }]}>
        <View style={styles.deliveries}>
          {currentOverDeliveries.length === 0 ? (
            <Text style={styles.overEmpty}>No deliveries yet</Text>
          ) : (
            currentOverDeliveries.map((d, i) => (
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
        {/* Row 1: 0, 1, UNDO */}
        <View style={styles.padRow}>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('0')}><Text style={styles.padBtnText}>0</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('3')}><Text style={styles.padBtnText}>3</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.5} style={[styles.padBtn, styles.padBtnUndo, history.length === 0 && styles.padBtnDisabled]} onPress={() => handleBall('UNDO')} disabled={history.length === 0}><Text style={[styles.padBtnText, { color: '#00bcd4' }, history.length === 0 && styles.padBtnTextDisabled]}>UNDO</Text></TouchableOpacity>
        </View>

        {/* Row 2: 2, 3, 5,7 */}
        <View style={styles.padRow}>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('1')}><Text style={styles.padBtnText}>1</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('4')}><Text style={styles.padBtnText}>4</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.5} style={[styles.padBtn, styles.padBtnCustom]} onPress={() => handleBall('Custom')}><Text style={styles.padBtnText}>5, 7</Text></TouchableOpacity>
        </View>

        {/* Row 3: 4, 6, OUT */}
        <View style={styles.padRow}>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('2')}><Text style={styles.padBtnText}>2</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('6')}><Text style={styles.padBtnText}>6</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.5} style={[styles.padBtn, styles.padBtnWicket]} onPress={() => handleBall('W')}><Text style={[styles.padBtnText, { color: '#ff0000f1' }]}>OUT</Text></TouchableOpacity>
        </View>

        {/* Row 4: WD, NB, BYE, LB */}
        <View style={styles.padRow}>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('Wd')}><Text style={[styles.padBtnText, styles.padBtnTextExtra]}>WD</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('Nb')}><Text style={[styles.padBtnText, styles.padBtnTextExtra]}>NB</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('By')}><Text style={[styles.padBtnText, styles.padBtnTextExtra]}>BYE</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.5} style={styles.padBtn} onPress={() => handleBall('Lb')}><Text style={[styles.padBtnText, styles.padBtnTextExtra]}>LB</Text></TouchableOpacity>
        </View>
      </View>

      {/* Wicket Modal */}
      <Modal visible={wicketModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>🏏 Wicket!</Text>

            {wicketStep === 1 ? (
              <View style={{ width: '100%' }}>
                <Text style={styles.modalLabel}>Dismissal Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15, justifyContent: 'center', width: '100%' }}>
                  {['Caught', 'Bowled', 'Run Out', 'LBW', 'Stumped'].map(wt => (
                    <TouchableOpacity
                      key={wt}
                      style={[styles.runsBtn, wicketDetails.type === wt && styles.runsBtnActive, { flex: 0, minWidth: '30%', paddingHorizontal: 0 }]}
                      onPress={() => setWicketDetails(p => ({ ...p, type: wt }))}
                    >
                      <Text style={[styles.runsBtnText, wicketDetails.type === wt && styles.runsBtnTextActive]}>{wt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {wicketDetails.type === 'Run Out' && (
                  <>
                    <Text style={styles.modalLabel}>Runs Completed</Text>
                    <View style={[styles.runsRow, { flexWrap: 'wrap' }]}>
                      {[0, 1, 2, 3].map(r => (
                        <TouchableOpacity
                          key={r}
                          style={[styles.runsBtn, wicketDetails.runs === r && !showWicketManualRuns && styles.runsBtnActive]}
                          onPress={() => {
                            setWicketDetails(p => ({ ...p, runs: r }));
                            setShowWicketManualRuns(false);
                          }}
                        >
                          <Text style={[styles.runsBtnText, wicketDetails.runs === r && !showWicketManualRuns && styles.runsBtnTextActive]}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[styles.runsBtn, showWicketManualRuns && styles.runsBtnActive]}
                        onPress={() => setShowWicketManualRuns(true)}
                      >
                        <Text style={[styles.runsBtnText, showWicketManualRuns && styles.runsBtnTextActive]}>Other</Text>
                      </TouchableOpacity>
                    </View>

                    {showWicketManualRuns && (
                      <NumericTextInput
                        style={{
                          backgroundColor: colors.surfaceContainerLowest,
                          borderWidth: 1,
                          borderColor: colors.surfaceContainerHighest,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 18,
                          color: colors.onSurface,
                          marginTop: 12
                        }}
                        value={wicketManualRunsStr}
                        onChangeText={(text) => {
                          setWicketManualRunsStr(text);
                          setWicketDetails(p => ({ ...p, runs: parseInt(text || '0', 10) }));
                        }}
                        placeholder="Enter runs manually..."
                        placeholderTextColor={colors.systemGray}
                        autoFocus
                      />
                    )}

                    <Text style={styles.modalLabel}>Who is out?</Text>
                    <View style={styles.runsRow}>
                      <TouchableOpacity
                        style={[styles.runsBtn, wicketDetails.playerOutId === striker.playerId && styles.runsBtnActive, { flex: 1 }]}
                        onPress={() => setWicketDetails(p => ({ ...p, playerOutId: striker.playerId }))}
                      >
                        <Text style={[styles.runsBtnText, wicketDetails.playerOutId === striker.playerId && styles.runsBtnTextActive]}>{striker.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.runsBtn, wicketDetails.playerOutId === nonStriker.playerId && styles.runsBtnActive, { flex: 1 }]}
                        onPress={() => setWicketDetails(p => ({ ...p, playerOutId: nonStriker.playerId }))}
                      >
                        <Text style={[styles.runsBtnText, wicketDetails.playerOutId === nonStriker.playerId && styles.runsBtnTextActive]}>{nonStriker.name}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <View style={[styles.modalActions, { marginTop: 24 }]}>
                  <TouchableOpacity
                    style={styles.modalBtnCancel}
                    onPress={() => {
                      setWicketModalVisible(false);
                      setWicketStep(1);
                    }}
                  >
                    <Text style={styles.modalBtnTextDark}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalBtnSubmit}
                    onPress={() => setWicketStep(2)}
                  >
                    <Text style={styles.modalBtnTextLight}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.searchListContainer, { flexShrink: 1, maxHeight: 400 }]}>
                {isMaxWicketsReached && (
                  <Text style={{ color: colors.error, marginBottom: 12, fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
                    Max wickets reached! You can choose to End Innings.
                  </Text>
                )}

                <View style={{ marginBottom: 12 }}>
                  <SearchBar
                    placeholder="Search next batter..."
                    value={newBatterSearch}
                    onChangeText={setNewBatterSearch}
                  />
                </View>

                <ScrollView style={styles.playerListScrollView} contentContainerStyle={styles.playerListContent}>
                  {(() => {
                    const inn = match?.innings?.[match.innings.length - 1];
                    const battingTeam = match?.teams?.find((t: any) => t.teamId === inn?.teamId);
                    const battedIds = new Set(inn?.batting?.map((b: any) => b.playerId) ?? []);
                    const currentIds = new Set([striker.playerId, nonStriker.playerId]);

                    return battingTeam?.players
                      ?.filter((p: any) => !battedIds.has(p.playerId) && !currentIds.has(p.playerId))
                      ?.filter((p: any) => p.playerName.toLowerCase().includes(newBatterSearch.toLowerCase()))
                      ?.map((p: any) => (
                        <TouchableOpacity
                          key={p.playerId}
                          style={styles.playerRowItem}
                          onPress={() => {
                            setWicketDetails(prev => ({ ...prev, newBatterId: p.playerId }));
                            setNewBatterSearch('');
                            handleWicketSubmit(false, p.playerId);
                          }}
                        >
                          <View style={styles.playerPhotoContainer}>
                            {p.photoUrl ? (
                              <Image source={{ uri: p.photoUrl }} style={styles.playerPhoto} />
                            ) : (
                              <User size={24} color={colors.systemGray} />
                            )}
                          </View>
                          <View style={styles.playerRowInfo}>
                            <Text style={styles.playerRowName}>{p.playerName}</Text>
                            <Text style={styles.playerRowRole}>{p.role || 'Player'}</Text>
                          </View>
                        </TouchableOpacity>
                      )) ?? [];
                  })()}
                </ScrollView>

                <View style={[styles.modalActions, { marginTop: 16 }]}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setWicketStep(1)}>
                    <Text style={styles.modalBtnTextDark}>Back</Text>
                  </TouchableOpacity>

                  {isMaxWicketsReached && (
                    <TouchableOpacity
                      style={[styles.modalBtnSubmit, { backgroundColor: colors.error }]}
                      onPress={() => {
                        handleWicketSubmit(true);
                      }}
                    >
                      <Text style={styles.modalBtnTextLight}>End Innings</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>

      {/* Custom Runs / Extra Modal */}
      <Modal visible={customRunModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {customRunType === 'Wd' ? 'Wide' :
                customRunType === 'Nb' ? 'No Ball' :
                  customRunType === 'By' ? 'Bye' :
                    customRunType === 'Lb' ? 'Leg Bye' : 'Additional Runs'}
            </Text>

            <Text style={styles.modalLabel}>{customRunType === 'Runs' ? 'Select runs:' : 'Additional Runs Run?'}</Text>

            <View style={[styles.runsRow, { flexWrap: 'wrap' }]}>
              {(() => {
                const customRunOptions = (customRunType === 'Nb' || customRunType === 'Wd') ? [0, 1, 2, 3, 4, 6] : customRunType === 'Runs' ? [5, 7] : [1, 2, 3, 4];
                return customRunOptions.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.runsBtn, customRunInput === String(r) && !showManualRunInput && styles.runsBtnActive, { minWidth: '20%' }]}
                    onPress={() => {
                      setCustomRunInput(String(r));
                      setShowManualRunInput(false);
                      handleCustomRunSubmit(String(r));
                    }}
                  >
                    <Text style={[styles.runsBtnText, customRunInput === String(r) && !showManualRunInput && styles.runsBtnTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ));
              })()}
              <TouchableOpacity
                style={[styles.runsBtn, showManualRunInput && styles.runsBtnActive, { minWidth: '25%' }]}
                onPress={() => setShowManualRunInput(true)}
              >
                <Text style={[styles.runsBtnText, showManualRunInput && styles.runsBtnTextActive]}>Other</Text>
              </TouchableOpacity>
            </View>

            {showManualRunInput && (
              <NumericTextInput
                style={{
                  backgroundColor: colors.surfaceContainerLowest,
                  borderWidth: 1,
                  borderColor: colors.surfaceContainerHighest,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 18,
                  color: colors.onSurface,
                  marginTop: 12
                }}
                value={customRunInput}
                onChangeText={setCustomRunInput}
                placeholder="Enter runs manually..."
                placeholderTextColor={colors.systemGray}
                autoFocus
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setCustomRunModalVisible(false)}>
                <Text style={styles.modalBtnTextDark}>Cancel</Text>
              </TouchableOpacity>
              {showManualRunInput && customRunInput.length > 0 && (
                <TouchableOpacity style={styles.modalBtnSubmit} onPress={() => handleCustomRunSubmit()}>
                  <Text style={styles.modalBtnTextLight}>Confirm</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* New Bowler Modal */}
      <Modal visible={newBowlerModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>

            <Text style={styles.modalTitle}>⚾ Over Complete!</Text>
            <Text style={styles.modalLabel}>Who is bowling the next over?</Text>

            <View style={[styles.searchListContainer, { flexShrink: 1, maxHeight: 400 }]}>
              <View style={{ marginBottom: 12 }}>
                <SearchBar
                  placeholder="Search next bowler..."
                  value={newBowlerSearch}
                  onChangeText={setNewBowlerSearch}
                />
              </View>

              <ScrollView style={styles.playerListScrollView} contentContainerStyle={styles.playerListContent}>
                {(() => {
                  const inn = match?.innings?.[match.innings.length - 1];
                  const bowlingTeam = match?.teams?.find((t: any) => t.teamId !== inn?.teamId);

                  return bowlingTeam?.players
                    ?.filter((p: any) => p.playerId !== scoringState?.bowler.playerId)
                    ?.filter((p: any) => p.playerName.toLowerCase().includes(newBowlerSearch.toLowerCase()))
                    ?.map((p: any) => (
                      <TouchableOpacity
                        key={p.playerId}
                        style={styles.playerRowItem}
                        onPress={() => {
                          setSelectedNewBowlerId(p.playerId);
                          setNewBowlerSearch('');
                          handleNewBowlerSubmit(p.playerId);
                        }}
                      >
                        <View style={styles.playerPhotoContainer}>
                          {p.photoUrl ? (
                            <Image source={{ uri: p.photoUrl }} style={styles.playerPhoto} />
                          ) : (
                            <User size={24} color={colors.systemGray} />
                          )}
                        </View>
                        <View style={styles.playerRowInfo}>
                          <Text style={styles.playerRowName}>{p.playerName}</Text>
                          <Text style={styles.playerRowRole}>{p.role || 'Player'}</Text>
                        </View>
                      </TouchableOpacity>
                    )) ?? [];
                })()}
              </ScrollView>

              <View style={[styles.modalActions, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={styles.modalBtnCancel}
                  onPress={() => {
                    // Cancel = undo the delivery that completed the over
                    setNewBowlerModalVisible(false);
                    if (history.length > 0) {
                      setScoringState(history[history.length - 1]);
                      setHistory(prev => prev.slice(0, -1));
                      submitEvent('undo');
                    }
                  }}
                >
                  <Text style={styles.modalBtnTextDark}>Undo Ball</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      {/* Innings Complete Modal */}
      <Modal visible={endInningsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Innings Complete</Text>
            <Text style={styles.modalLabel}>The innings has ended.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSubmit}
                onPress={() => {
                  setEndInningsModalVisible(false);
                  queryClient.invalidateQueries({ queryKey: ['match', id] });
                  setScoringState(null); // Force rebuild from fetched data
                }}
              >
                <Text style={styles.modalBtnTextLight}>Proceed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Start Innings Modal */}
      <Modal visible={startInningsModalVisible} transparent animationType="slide">
        <SafeAreaView style={styles.fullScreenModalOverlay}>
          <View style={styles.fullScreenModalContent}>

            <View style={styles.fullScreenModalHeader}>
              <Text style={styles.fullScreenModalTitle}>Start Innings</Text>
            </View>

            {/* Selected Players Section */}
            <View style={styles.selectedPlayersSection}>
              {(() => {
                const inn = match?.innings?.[match.innings.length - 1];
                const batTeam = match?.teams?.find((t: any) => t.teamId === inn?.teamId);
                const bowlTeam = match?.teams?.find((t: any) => t.teamId !== inn?.teamId);

                const getPlayerName = (team: any, id: number) =>
                  team?.players?.find((p: any) => p.playerId === id)?.playerName || 'Unknown';

                return (
                  <>
                    {startInningsDetails.strikerId > 0 && (
                      <TouchableOpacity
                        style={styles.selectedPlayerChip}
                        onPress={() => setStartInningsDetails(prev => ({ ...prev, strikerId: 0, nonStrikerId: 0, bowlerId: 0 }))}
                      >
                        <Text style={styles.selectedPlayerChipLabel}>Striker</Text>
                        <Text style={styles.selectedPlayerChipName}>{getPlayerName(batTeam, startInningsDetails.strikerId)}</Text>
                      </TouchableOpacity>
                    )}
                    {startInningsDetails.nonStrikerId > 0 && (
                      <TouchableOpacity
                        style={styles.selectedPlayerChip}
                        onPress={() => setStartInningsDetails(prev => ({ ...prev, nonStrikerId: 0, bowlerId: 0 }))}
                      >
                        <Text style={styles.selectedPlayerChipLabel}>Non-Striker</Text>
                        <Text style={styles.selectedPlayerChipName}>{getPlayerName(batTeam, startInningsDetails.nonStrikerId)}</Text>
                      </TouchableOpacity>
                    )}
                    {startInningsDetails.bowlerId > 0 && (
                      <TouchableOpacity
                        style={styles.selectedPlayerChip}
                        onPress={() => setStartInningsDetails(prev => ({ ...prev, bowlerId: 0 }))}
                      >
                        <Text style={styles.selectedPlayerChipLabel}>Bowler</Text>
                        <Text style={styles.selectedPlayerChipName}>{getPlayerName(bowlTeam, startInningsDetails.bowlerId)}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}
            </View>

            {/* Dynamic Search & List Area */}
            {(!startInningsDetails.strikerId || !startInningsDetails.nonStrikerId || !startInningsDetails.bowlerId) ? (
              <View style={styles.searchListContainer}>
                <View style={{ marginBottom: 12 }}>
                  <SearchBar
                    placeholder={`Search ${!startInningsDetails.strikerId ? 'striker' : !startInningsDetails.nonStrikerId ? 'non-striker' : 'bowler'}...`}
                    value={startInningsSearch}
                    onChangeText={setStartInningsSearch}
                  />
                </View>

                <ScrollView style={styles.playerListScrollView} contentContainerStyle={styles.playerListContent}>
                  {(() => {
                    const inn = match?.innings?.[match.innings.length - 1];
                    const batTeam = match?.teams?.find((t: any) => t.teamId === inn?.teamId);
                    const bowlTeam = match?.teams?.find((t: any) => t.teamId !== inn?.teamId);

                    let targetTeam = batTeam;
                    let excludeIds: number[] = [];

                    if (!startInningsDetails.strikerId) {
                      // Selecting Striker
                    } else if (!startInningsDetails.nonStrikerId) {
                      // Selecting Non-Striker
                      excludeIds = [startInningsDetails.strikerId];
                    } else {
                      // Selecting Bowler
                      targetTeam = bowlTeam;
                    }

                    return targetTeam?.players
                      ?.filter((p: any) => !excludeIds.includes(p.playerId))
                      ?.filter((p: any) => p.playerName.toLowerCase().includes(startInningsSearch.toLowerCase()))
                      ?.map((p: any) => (
                        <TouchableOpacity
                          key={p.playerId}
                          style={styles.playerRowItem}
                          onPress={() => {
                            if (!startInningsDetails.strikerId) {
                              setStartInningsDetails(prev => ({ ...prev, strikerId: p.playerId }));
                            } else if (!startInningsDetails.nonStrikerId) {
                              setStartInningsDetails(prev => ({ ...prev, nonStrikerId: p.playerId }));
                            } else {
                              setStartInningsDetails(prev => ({ ...prev, bowlerId: p.playerId }));
                            }
                            setStartInningsSearch('');
                          }}
                        >
                          <View style={styles.playerPhotoContainer}>
                            {p.photoUrl ? (
                              <Image source={{ uri: p.photoUrl }} style={styles.playerPhoto} />
                            ) : (
                              <User size={24} color={colors.systemGray} />
                            )}
                          </View>
                          <View style={styles.playerRowInfo}>
                            <Text style={styles.playerRowName}>{p.playerName}</Text>
                            <Text style={styles.playerRowRole}>{p.role || 'Player'}</Text>
                          </View>
                        </TouchableOpacity>
                      ));
                  })()}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.readyContainer}>
                <Text style={styles.readyText}>Ready to begin the innings!</Text>
              </View>
            )}

            <View style={styles.fullScreenModalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => {
                  setStartInningsModalVisible(false);
                  setStartInningsDetails({ strikerId: 0, nonStrikerId: 0, bowlerId: 0 });
                }}
              >
                <Text style={styles.modalBtnTextDark}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtnSubmit,
                  { flex: 1, marginLeft: 16 },
                  (!startInningsDetails.strikerId || !startInningsDetails.nonStrikerId || !startInningsDetails.bowlerId) && { opacity: 0.5 }
                ]}
                disabled={!startInningsDetails.strikerId || !startInningsDetails.nonStrikerId || !startInningsDetails.bowlerId}
                onPress={handleStartInningsSubmit}
              >
                <Text style={styles.modalBtnTextLight}>Start Scoring</Text>
              </TouchableOpacity>
            </View>

          </View>
        </SafeAreaView>
      </Modal>

      <SettingsMenu
        visible={settingsMenuVisible}
        onClose={() => setSettingsMenuVisible(false)}
        isScorer={true}
        matchStatus={match?.status}
        onEndInnings={() => { setSettingsMenuVisible(false); }}
        onEndMatch={() => { setSettingsMenuVisible(false); }}
        onResetMatch={() => {
          setSettingsMenuVisible(false);
          setResetConfirmVisible(true);
        }}
      />

      <ConfirmationModal
        visible={resetConfirmVisible}
        title="Reset Match"
        message="Are you sure you want to reset this match? All scores, innings, and toss details will be permanently deleted."
        confirmText="Reset"
        isDestructive={true}
        isLoading={isResetting}
        onConfirm={handleResetMatch}
        onCancel={() => setResetConfirmVisible(false)}
      />

      <ConfirmationModal
        visible={overCompleteAlertVisible}
        title="Over Complete"
        message="Previous over completed, select the next bowler."
        confirmText="Select Bowler"
        cancelText="Cancel"
        onConfirm={() => {
          setOverCompleteAlertVisible(false);
          setNewBowlerModalVisible(true);
        }}
        onCancel={() => setOverCompleteAlertVisible(false)}
      />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    paddingHorizontal: 0,
    paddingBottom: 0,
    marginTop: 12,
  },
  padRow: {
    flexDirection: 'row',
  },
  padBtn: {
    flex: 1,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 0.5,
    borderColor: '#333333',
  },
  padBtnWicket: {
    backgroundColor: '#1a0505',
  },
  padBtnCustom: {
    backgroundColor: '#0a0a0a',
  },
  padBtnUndo: {
    backgroundColor: '#050505',
  },
  padBtnDisabled: {
    opacity: 0.3,
  },
  padBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00bcd4',
  },
  padBtnTextExtra: {
    fontSize: 16,
    color: '#e0e0e0',
  },
  padBtnTextLight: {
    color: '#fff',
  },
  padBtnTextDisabled: {
    color: '#555',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.systemGray,
    marginTop: 8,
  },
  pickerContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
  },
  runsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  runsBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  runsBtnActive: {
    borderColor: colors.whatsappGreen,
    backgroundColor: '#dcfce7',
  },
  runsBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  runsBtnTextActive: {
    color: colors.whatsappGreen,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalBtnCancel: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  modalBtnSubmit: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.whatsappGreen,
  },
  modalBtnTextDark: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalBtnTextLight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  fullScreenModalOverlay: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  fullScreenModalContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 24,
  },
  fullScreenModalHeader: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.systemGray,
    marginBottom: 16,
  },
  fullScreenModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onSurface,
  },
  selectedPlayersSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectedPlayerChip: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.whatsappGreen,
  },
  selectedPlayerChipLabel: {
    fontSize: 12,
    color: colors.systemGray,
    marginBottom: 2,
  },
  selectedPlayerChipName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.whatsappGreen,
  },
  searchListContainer: {
    flex: 1,
  },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBox: {
    flex: 1,
    fontSize: 16,
    color: colors.onSurface,
    height: '100%',
  },
  playerListScrollView: {
    flex: 1,
  },
  playerListContent: {
    paddingBottom: 24,
  },
  playerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  playerPhotoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  playerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  playerRowInfo: {
    flex: 1,
  },
  playerRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 4,
  },
  playerRowRole: {
    fontSize: 14,
    color: colors.systemGray,
  },
  readyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.whatsappGreen,
  },
  fullScreenModalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  menuContent: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
    minWidth: 150,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  menuItemTextDestructive: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.error,
  },
});

