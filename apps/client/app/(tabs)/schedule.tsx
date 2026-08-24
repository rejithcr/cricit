import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../src/theme';

/**
 * Schedule tab — upcoming matches and fixtures.
 */
export default function ScheduleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Schedule</Text>
      <Text style={styles.subtitle}>Upcoming matches will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: 24,
  },
  title: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: typography.headlineMd.fontWeight,
    color: colors.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.systemGray,
  },
});
