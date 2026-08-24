import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../theme';
import { useRouter } from 'expo-router';

interface MatchCardProps {
  match: any;
  isLast?: boolean;
}

export function MatchCard({ match }: MatchCardProps) {
  const router = useRouter();
  
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';

  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: '#f9f9f9' }]}
      onPress={() => router.push(`/match/${match.matchId}`)}
    >
      {/* Header section */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Text style={styles.matchType}>Individual Match</Text>
          <View style={[styles.badge, isLive ? styles.badgeLive : styles.badgeUpcoming]}>
            <Text style={styles.badgeText}>
              {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
            </Text>
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
  },
  actionText: {
    fontSize: 14,
    color: '#06b6d4', // Cyan
    fontWeight: '500',
  },
});
