import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, typography } from '../../src/theme';
import { User, QrCode, PlayCircle, BarChart3, Trophy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { MatchCard } from '../../src/components/MatchCard';

/**
 * Home tab — main feed / dashboard.
 */
export default function HomeScreen() {
  const router = useRouter();

  // Mock player data for UI
  const player = {
    name: 'Rohit Sharma',
    role: 'Top Order Batter',
    stats: {
      matches: 245,
      runs: 10792,
      average: 48.8,
      strikeRate: 139.5,
      highScore: 264
    }
  };

  // Mock recent match
  const recentMatch = {
    matchId: 'mock-1',
    status: 'completed',
    date: '2026-08-22',
    ground: 'M. Chinnaswamy Stadium, Bengaluru',
    teams: [
      { teamName: 'Mumbai Indians' },
      { teamName: 'Royal Challengers Bangalore' }
    ]
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      
      {/* Header Area */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.playerName}>{player.name}</Text>
        </View>
        <TouchableOpacity style={styles.avatarContainer}>
          <User color={colors.onPrimary} size={28} />
        </TouchableOpacity>
      </View>

      {/* Career Highlights Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeaderRow}>
          <Trophy size={20} color={colors.whatsappGreen} />
          <Text style={styles.statsTitle}>Career Highlights</Text>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Matches</Text>
            <Text style={styles.statValue}>{player.stats.matches}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Runs</Text>
            <Text style={styles.statValue}>{player.stats.runs}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>{player.stats.average}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Strike Rate</Text>
            <Text style={styles.statValue}>{player.stats.strikeRate}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn}>
          <View style={[styles.iconContainer, { backgroundColor: colors.secondaryFixed }]}>
            <PlayCircle color={colors.secondary} size={24} />
          </View>
          <Text style={styles.actionText}>Start Match</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryFixed }]}>
            <QrCode color={colors.primary} size={24} />
          </View>
          <Text style={styles.actionText}>Scan Code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tertiaryFixed }]}>
            <BarChart3 color={colors.tertiary} size={24} />
          </View>
          <Text style={styles.actionText}>Practice</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Matches */}
      <View style={styles.recentHeader}>
        <Text style={styles.sectionTitle}>Recent Matches</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.matchCardContainer}>
        <MatchCard match={recentMatch} />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 100, // accommodate bottom tab
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: {
    fontSize: typography.bodyLg.fontSize,
    color: colors.systemGray,
    marginBottom: 4,
  },
  playerName: {
    fontSize: typography.headlineLg.fontSize,
    fontWeight: typography.headlineLg.fontWeight,
    color: colors.onSurface,
  },
  avatarContainer: {
    backgroundColor: colors.whatsappGreen,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.whatsappGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: typography.bodyLgSemibold.fontSize,
    fontWeight: typography.bodyLgSemibold.fontWeight,
    color: colors.onSurface,
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 20,
  },
  statItem: {
    width: '45%',
  },
  statLabel: {
    fontSize: typography.labelSm.fontSize,
    color: colors.systemGray,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: typography.headlineMd.fontWeight,
    color: colors.onSurface,
  },
  sectionTitle: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '500',
    color: colors.onSurface,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '600',
    color: colors.whatsappGreen,
  },
  matchCardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  }
});
