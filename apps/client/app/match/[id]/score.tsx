import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Picker as SelectPicker } from '@react-native-picker/picker';
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

  // XOR: rotate if exactly one of (odd runs, over-complete) is true
  const runBasedRotation = !isWicket && !isExtra && (totalRuns % 2 === 1);
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
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScoringScreen() {
  const { id } = useLocalSearchParams();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';
  const [scoringState, setScoringState] = useState<ScoringState | null>(null);
  const [history, setHistory] = useState<ScoringState[]>([]);
  
  const [wicketModalVisible, setWicketModalVisible] = useState(false);
  const [extraModalVisible, setExtraModalVisible] = useState(false);
  const [pendingExtraType, setPendingExtraType] = useState('');
  const [newBatterModalVisible, setNewBatterModalVisible] = useState(false);
  const [newBowlerModalVisible, setNewBowlerModalVisible] = useState(false);
  // Pending event: we collect the wicket/over-complete state and wait for player selection
  const [pendingWicketEvent, setPendingWicketEvent] = useState<any>(null);
  const [selectedNewBatterId, setSelectedNewBatterId] = useState<number>(0);
  const [selectedNewBowlerId, setSelectedNewBowlerId] = useState<number>(0);
  
  const [wicketDetails, setWicketDetails] = useState({
    type: 'Caught',
    runs: 0,
    fielderId: 0,
    playerOutId: 0,
  });
  const [extraRuns, setExtraRuns] = useState(0);

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
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
      
      // After applying, check if the over just completed — if so prompt new bowler
      const isLegalDelivery = eventData.type === 'legal' || eventData.type === 'wicket'
        || eventData.type === 'bye' || eventData.type === 'legBye';
      const newBowlerBalls = isLegalDelivery ? prev.bowler.ballsThisOver + 1 : prev.bowler.ballsThisOver;
      if (newBowlerBalls >= 6) {
        setNewBowlerModalVisible(true);
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
      
      if (value === 'W') {
        setWicketDetails(prev => ({ ...prev, playerOutId: scoringState?.striker.playerId || 0 }));
        setWicketModalVisible(true);
        return;
      }
      
      if (value === 'Wd' || value === 'Nb') {
        setPendingExtraType(value);
        setExtraRuns(0);
        setExtraModalVisible(true);
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

  const handleWicketSubmit = () => {
    setWicketModalVisible(false);
    const eventData = {
      type: 'wicket',
      runs: wicketDetails.runs,
      wicket: {
        dismissalType: wicketDetails.type,
        playerOutId: wicketDetails.playerOutId,
        fielderId: wicketDetails.fielderId || undefined
      }
    };
    // Save pending event then ask for new batter
    setPendingWicketEvent(eventData);
    setSelectedNewBatterId(0);
    setNewBatterModalVisible(true);
  };

  const handleNewBatterSubmit = () => {
    setNewBatterModalVisible(false);
    if (!pendingWicketEvent) return;
    const finalEvent = selectedNewBatterId
      ? { ...pendingWicketEvent, wicket: { ...pendingWicketEvent.wicket, newBatterId: selectedNewBatterId } }
      : pendingWicketEvent;
    processDelivery(finalEvent);
    setPendingWicketEvent(null);
  };

  const handleNewBowlerSubmit = () => {
    setNewBowlerModalVisible(false);
    if (!selectedNewBowlerId || !scoringState) return;
    // Get bowler name from match data
    const innings = match?.innings?.[match.innings.length - 1];
    const bowlingTeam = match?.teams?.find((t: any) => t.teamId !== innings?.teamId);
    const playerData = bowlingTeam?.players?.find((p: any) => p.playerId === selectedNewBowlerId);
    // Update local scoring state immediately
    setScoringState(prev => prev ? {
      ...prev,
      bowler: {
        playerId: selectedNewBowlerId,
        name: playerData?.playerName ?? 'New Bowler',
        runsGiven: 0,
        wicketsTaken: 0,
        ballsThisOver: 0,
        totalLegalBalls: 0,
      }
    } : prev);
    // Broadcast to all viewers via the event pipeline
    submitEvent('new_bowler', { bowlerId: selectedNewBowlerId });
  };

  const handleExtraSubmit = () => {
    setExtraModalVisible(false);
    processDelivery({
      type: pendingExtraType === 'Wd' ? 'wide' : 'noBall',
      runs: extraRuns
    });
  };

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
      
      {/* Wicket Modal */}
      <Modal visible={wicketModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Wicket Details</Text>
            
            <Text style={styles.modalLabel}>Dismissal Type</Text>
            <View style={styles.pickerContainer}>
              <SelectPicker
                selectedValue={wicketDetails.type}
                onValueChange={(val: any) => setWicketDetails(p => ({...p, type: val}))}
              >
                <SelectPicker.Item label="Caught" value="Caught" />
                <SelectPicker.Item label="Bowled" value="Bowled" />
                <SelectPicker.Item label="Run Out" value="Run Out" />
                <SelectPicker.Item label="LBW" value="LBW" />
                <SelectPicker.Item label="Stumped" value="Stumped" />
              </SelectPicker>
            </View>

            {wicketDetails.type === 'Run Out' && (
              <>
                <Text style={styles.modalLabel}>Runs Completed</Text>
                <View style={styles.runsRow}>
                  {[0, 1, 2, 3].map(r => (
                    <TouchableOpacity 
                      key={r} 
                      style={[styles.runsBtn, wicketDetails.runs === r && styles.runsBtnActive]}
                      onPress={() => setWicketDetails(p => ({...p, runs: r}))}
                    >
                      <Text style={[styles.runsBtnText, wicketDetails.runs === r && styles.runsBtnTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.modalLabel}>Who is out?</Text>
                <View style={styles.runsRow}>
                  <TouchableOpacity 
                    style={[styles.runsBtn, wicketDetails.playerOutId === striker.playerId && styles.runsBtnActive, { flex: 1 }]}
                    onPress={() => setWicketDetails(p => ({...p, playerOutId: striker.playerId}))}
                  >
                    <Text style={[styles.runsBtnText, wicketDetails.playerOutId === striker.playerId && styles.runsBtnTextActive]}>{striker.name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.runsBtn, wicketDetails.playerOutId === nonStriker.playerId && styles.runsBtnActive, { flex: 1 }]}
                    onPress={() => setWicketDetails(p => ({...p, playerOutId: nonStriker.playerId}))}
                  >
                    <Text style={[styles.runsBtnText, wicketDetails.playerOutId === nonStriker.playerId && styles.runsBtnTextActive]}>{nonStriker.name}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setWicketModalVisible(false)}>
                <Text style={styles.modalBtnTextDark}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleWicketSubmit}>
                <Text style={styles.modalBtnTextLight}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Extra Modal */}
      <Modal visible={extraModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{pendingExtraType === 'Wd' ? 'Wide' : 'No Ball'}</Text>
            
            <Text style={styles.modalLabel}>Additional Runs Run?</Text>
            <View style={styles.runsRow}>
              {[0, 1, 2, 3, 4].map(r => (
                <TouchableOpacity 
                  key={r} 
                  style={[styles.runsBtn, extraRuns === r && styles.runsBtnActive]}
                  onPress={() => setExtraRuns(r)}
                >
                  <Text style={[styles.runsBtnText, extraRuns === r && styles.runsBtnTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setExtraModalVisible(false)}>
                <Text style={styles.modalBtnTextDark}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleExtraSubmit}>
                <Text style={styles.modalBtnTextLight}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Batter Modal — shown after a wicket, before delivery is submitted */}
      <Modal visible={newBatterModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🏏 New Batter</Text>
            <Text style={styles.modalLabel}>Who is coming in to bat?</Text>
            <View style={styles.pickerContainer}>
              <SelectPicker
                selectedValue={selectedNewBatterId}
                onValueChange={(val: any) => setSelectedNewBatterId(Number(val))}
              >
                <SelectPicker.Item label="Select batter..." value={0} />
                {(() => {
                  const innings = match?.innings?.[match.innings.length - 1];
                  const battingTeam = match?.teams?.find((t: any) => t.teamId === innings?.teamId);
                  const dismissedIds = new Set(innings?.batting?.filter((b: any) => b.out).map((b: any) => b.playerId) ?? []);
                  const currentIds = new Set([scoringState?.striker.playerId, scoringState?.nonStriker.playerId]);
                  return battingTeam?.players
                    ?.filter((p: any) => !dismissedIds.has(p.playerId) && !currentIds.has(p.playerId))
                    ?.map((p: any) => <SelectPicker.Item key={p.playerId} label={p.playerName} value={p.playerId} />) ?? [];
                })()}
              </SelectPicker>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setNewBatterModalVisible(false); handleNewBatterSubmit(); }}>
                <Text style={styles.modalBtnTextDark}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, !selectedNewBatterId && { opacity: 0.5 }]}
                onPress={handleNewBatterSubmit}
                disabled={!selectedNewBatterId}
              >
                <Text style={styles.modalBtnTextLight}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Bowler Modal — shown after an over is complete */}
      <Modal visible={newBowlerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚾ Over Complete!</Text>
            <Text style={styles.modalLabel}>Who is bowling the next over?</Text>
            <View style={styles.pickerContainer}>
              <SelectPicker
                selectedValue={selectedNewBowlerId}
                onValueChange={(val: any) => setSelectedNewBowlerId(Number(val))}
              >
                <SelectPicker.Item label="Select bowler..." value={0} />
                {(() => {
                  const innings = match?.innings?.[match.innings.length - 1];
                  const bowlingTeam = match?.teams?.find((t: any) => t.teamId !== innings?.teamId);
                  return bowlingTeam?.players
                    ?.filter((p: any) => p.playerId !== scoringState?.bowler.playerId)
                    ?.map((p: any) => <SelectPicker.Item key={p.playerId} label={p.playerName} value={p.playerId} />) ?? [];
                })()}
              </SelectPicker>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setNewBowlerModalVisible(false)}>
                <Text style={styles.modalBtnTextDark}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, !selectedNewBowlerId && { opacity: 0.5 }]}
                onPress={handleNewBowlerSubmit}
                disabled={!selectedNewBowlerId}
              >
                <Text style={styles.modalBtnTextLight}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
});
