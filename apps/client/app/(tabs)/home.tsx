import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, typography } from '../../src/theme';
import { ShieldCheck, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

/**
 * Home tab — main feed / dashboard.
 */
export default function HomeScreen() {
  const router = useRouter();

  const { data: health, error: healthError, isLoading: isHealthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';
      const res = await fetch(`${apiUrl}/health`);
      if (!res.ok) throw new Error('API responded with ' + res.status);
      return res.json();
    }
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Your cricket feed will appear here.</Text>

      {/* API Health Card */}
      <View style={styles.healthCard}>
        <Text style={styles.cardTitle}>System Status</Text>

        {isHealthLoading ? (
          <ActivityIndicator size="small" color={colors.whatsappGreen} />
        ) : healthError ? (
          <View style={styles.statusRow}>
            <AlertCircle size={20} color={colors.error} />
            <Text style={styles.errorText}>{healthError.message}</Text>
          </View>
        ) : (
          <View>
            <View style={styles.statusRow}>
              <ShieldCheck size={20} color={colors.whatsappGreen} />
              <Text style={styles.successText}>API is Online</Text>
            </View>
            <Text style={styles.healthDetail}>Service: {health?.service}</Text>
          </View>
        )}
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
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100, // accommodate bottom tab
  },
  title: {
    fontSize: typography.largeTitle.fontSize,
    fontWeight: typography.largeTitle.fontWeight,
    color: colors.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.systemGray,
    marginBottom: 24,
  },
  healthCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  cardTitle: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: typography.headlineMd.fontWeight,
    color: colors.onSurface,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  successText: {
    fontSize: typography.bodyLg.fontSize,
    fontWeight: '600',
    color: colors.whatsappGreen,
    marginLeft: 8,
  },
  errorText: {
    fontSize: typography.bodyLg.fontSize,
    fontWeight: '600',
    color: colors.error,
    marginLeft: 8,
  },
  healthDetail: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.systemGray,
    marginBottom: 4,
  },
  cardGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: -24, // offset padding
  }
});
