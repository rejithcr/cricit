import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

/**
 * Stack layout for the (auth) route group.
 * Screens here are shown when the user is NOT authenticated.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surfaceContainerLow },
      }}
    />
  );
}
