import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Modal } from 'react-native';
import { colors } from '../theme';
import { useRouter } from 'expo-router';

interface MatchCardProps {
  match: any;
  currentUserId?: string;
  isLast?: boolean;
}

export function MatchCard({ match, currentUserId }: MatchCardProps) {
  const router = useRouter();

  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'scheduled' || match.status === 'upcoming';
  const isScorer = true //currentUserId != null && match.scorerId === currentUserId;

  const handleCardPress = () => {
    router.push(`/match/${match.matchId}`);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: '#f9f9f9' }]}
      onPress={handleCardPress}
    >
      {/* Header section */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Text style={styles.matchType}>Individual Match</Text>
          <View style={styles.badgesRow}>
            {isScorer && (
              <View style={styles.scorerBadge}>
                <Text style={styles.scorerBadgeText}>Scorer</Text>
              </View>
            )}
            <View style={[styles.badge, isLive ? styles.badgeLive : styles.badgeUpcoming]}>
              <Text style={styles.badgeText}>
                {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.subHeader}>
          {match.date} | {match.ground}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Teams section */}
      <View style={styles.teamsSection}>
        <Text style={styles.teamNameActive}>{match.teams[0]?.teamName}</Text>
        <Text style={styles.teamNameInactive}>{match.teams[1]?.teamName}</Text>
      </View>

      <View style={styles.divider} />

      {/* Footer section */}
      <View style={styles.footerSection}>
        <Text style={styles.statusMessage}>
          {isUpcoming ? `Match scheduled to begin on ${match.date}` : `Match at ${match.ground}`}
        </Text>
        <View style={styles.actionsRow}>
          <Text style={styles.actionText}>Insights</Text>
          <Text style={[styles.actionText, { marginLeft: 16 }]}>Squads</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    // Minimal border without heavy shadow to match screenshot
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  headerSection: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchType: {
    fontSize: 14,
    color: '#9e9e9e',
    fontWeight: '400',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scorerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.whatsappGreen,
  },
  scorerBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  badgeLive: {
    backgroundColor: '#d32f2f', // Red
  },
  badgeUpcoming: {
    backgroundColor: '#f59e0b', // Orange
  },
  badgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  subHeader: {
    fontSize: 13,
    color: '#9e9e9e',
  },
  divider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 12,
  },
  teamsSection: {
    padding: 12,
    paddingVertical: 14,
  },
  teamNameActive: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  teamNameInactive: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  footerSection: {
    padding: 12,
  },
  statusMessage: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  actionText: {
    fontSize: 14,
    color: '#06b6d4',
    fontWeight: '500',
  },
  scoreActionBtn: {
    backgroundColor: colors.whatsappGreen,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreActionText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
    marginTop: 10,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  tossBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  tossBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tossBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  tossBtnTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  modalBtnSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalBtnTextDark: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalBtnTextLight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
