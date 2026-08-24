import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, typography } from '../../src/theme';
import { AlertCircle } from 'lucide-react-native';
import { MatchCard } from '../../src/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';

export default function MyCricketScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const { data: matches, error: matchesError, isLoading: isMatchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';
      const res = await fetch(`${apiUrl}/matches`);
      if (!res.ok) throw new Error('API responded with ' + res.status);
      return res.json();
    }
  });

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>My Cricket</Text>
      
      {isMatchesLoading ? (
        <ActivityIndicator size="large" color={colors.whatsappGreen} style={{ marginTop: 20 }} />
      ) : matchesError ? (
        <View style={styles.statusRow}>
          <AlertCircle size={20} color={colors.error} />
          <Text style={styles.errorText}>{matchesError.message}</Text>
        </View>
      ) : (
        <View style={styles.matchesList}>
          {matches?.map((match: any) => (
            <MatchCard 
              key={match.matchId} 
              match={match} 
              currentUserId={user?.id}
            />
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
    padding: 12,
    paddingBottom: 100, // accommodate bottom tab
  },
  title: {
    fontSize: typography.largeTitle.fontSize,
    fontWeight: typography.largeTitle.fontWeight,
    color: colors.onSurface,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: typography.bodyLg.fontSize,
    fontWeight: '600',
    color: colors.error,
    marginLeft: 8,
  },
  matchesList: {
    gap: 12, // Native margin gap for separated cards
  }
});
