import { Stack, useRouter, useSegments, usePathname, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { colors } from '../src/theme';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  const previousSessionRef = useRef(session);

  useEffect(() => {
    if (isLoading) return;

    const wasLoggedIn = previousSessionRef.current != null;
    previousSessionRef.current = session;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // If the user is not signed in and the initial segment is not anything in the auth group.
      if (wasLoggedIn) {
        // The user just logged out. We shouldn't redirect them back to the page they logged out from.
        router.replace('/(auth)/login');
      } else {
        // We capture where they were trying to go on initial load so we can redirect them back after login.
        let returnTo = pathname;
        // Reconstruct the full path with query params if any exist
        const queryString = new URLSearchParams(params as any).toString();
        if (queryString) {
          returnTo += `?${queryString}`;
        }

        if (returnTo && returnTo !== '/') {
          router.replace(`/(auth)/login?returnTo=${encodeURIComponent(returnTo)}`);
        } else {
          router.replace('/(auth)/login');
        }
      }
    } else if (session && inAuthGroup) {
      // If the user is signed in and is currently inside the auth group.
      // We check if there's a returnTo param in the global search params.
      const currentReturnTo = params.returnTo as string | undefined;
      
      if (currentReturnTo) {
        // useGlobalSearchParams might return the decoded string
        router.replace(currentReturnTo as any);
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [session, isLoading, segments, pathname, params]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surfaceContainerLow },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="match/[id]"
        options={{
          headerShown: true,
          headerBackTitle: 'Back',
          headerTintColor: colors.whatsappGreen,
          headerStyle: {
            backgroundColor: colors.surfaceContainerLowest,
          },
          headerTitleStyle: {
            color: colors.onSurface,
            fontSize: 16,
            fontWeight: '600',
          },
          headerShadowVisible: true,
        }}
      />
      <Stack.Screen
        name="match/[id]/score"
        options={{
          headerShown: true,
          headerBackTitle: 'Back',
          headerTintColor: colors.whatsappGreen,
          headerStyle: {
            backgroundColor: colors.surfaceContainerLowest,
          },
          headerTitleStyle: {
            color: colors.onSurface,
            fontSize: 16,
            fontWeight: '600',
          },
          headerShadowVisible: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <RootLayoutNav />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
