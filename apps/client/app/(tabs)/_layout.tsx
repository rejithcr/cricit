import { Tabs, Redirect } from 'expo-router';
import { Home, Calendar, Tv, BarChart2, User } from 'lucide-react-native';
import { colors, typography } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.whatsappGreen,
        tabBarInactiveTintColor: colors.systemGray,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 8,
          minHeight: 64,
        },
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          fontWeight: typography.caption.fontWeight,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide index from tabs directly, redirect from it
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-cricket"
        options={{
          title: 'My Cricket',
          tabBarIcon: ({ color }) => <Tv size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <BarChart2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
