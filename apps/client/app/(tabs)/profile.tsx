import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, ChevronRight, Key, Bell, HelpCircle, Monitor } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services/auth';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fallback initial for the avatar
  const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?';

  async function handleLogout() {
    performLogout();
  }

  async function performLogout() {
    setIsLoggingOut(true);
    const { error } = await authService.signOut();
    setIsLoggingOut(false);
    if (error) {
      if (Platform.OS === 'web') {
        window.alert(error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    }
  }

  function SettingsRow({ 
    icon: Icon, 
    title, 
    iconBgColor, 
    isDestructive = false, 
    showSeparator = true,
    onPress 
  }: { 
    icon: any, 
    title: string, 
    iconBgColor: string, 
    isDestructive?: boolean, 
    showSeparator?: boolean,
    onPress: () => void 
  }) {
    return (
      <View style={styles.rowWrapper}>
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            <Icon size={18} color="#ffffff" strokeWidth={2.5} />
          </View>
          <Text style={[styles.rowTitle, isDestructive && styles.destructiveText]}>{title}</Text>
          <ChevronRight size={20} color="#C5C5C7" />
        </TouchableOpacity>
        {showSeparator && <View style={styles.separator} />}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Settings</Text>

        {/* User Info Cell (WhatsApp style) */}
        <TouchableOpacity style={styles.profileCell} activeOpacity={0.7}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.email?.split('@')[0] || 'User'}</Text>
            <Text style={styles.userStatus}>Available</Text>
          </View>
          <View style={styles.qrCodePlaceholder}>
            <Text style={styles.qrIcon}>📱</Text>
          </View>
        </TouchableOpacity>

        {/* Primary Settings Group */}
        <View style={styles.cardGroup}>
          <SettingsRow icon={Key} title="Account" iconBgColor="#007AFF" onPress={() => {}} />
          <SettingsRow icon={Monitor} title="Linked Devices" iconBgColor="#34C759" onPress={() => {}} />
          <SettingsRow icon={Bell} title="Notifications" iconBgColor="#FF3B30" showSeparator={false} onPress={() => {}} />
        </View>

        {/* Support Group */}
        <View style={styles.cardGroup}>
          <SettingsRow icon={HelpCircle} title="Help" iconBgColor="#007AFF" showSeparator={false} onPress={() => {}} />
        </View>

        {/* Log Out */}
        <View style={styles.cardGroup}>
          <SettingsRow 
            icon={LogOut} 
            title={isLoggingOut ? "Logging out..." : "Log Out"} 
            iconBgColor="#FF3B30" 
            isDestructive 
            showSeparator={false}
            onPress={handleLogout} 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS grouped background color
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  profileCell: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#D1D1D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 15,
    color: '#8E8E93',
  },
  qrCodePlaceholder: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 15,
  },
  qrIcon: {
    fontSize: 14,
  },
  cardGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 24,
    overflow: 'hidden',
  },
  rowWrapper: {
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6, // rounded rectangle like iOS settings
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowTitle: {
    flex: 1,
    fontSize: 17, // standard iOS body size
    color: '#000000',
  },
  destructiveText: {
    color: '#FF3B30',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginLeft: 58, // aligns with text start
  },
});
