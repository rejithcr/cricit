import React from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface SettingsMenuProps {
  visible: boolean;
  onClose: () => void;
  isScorer?: boolean;
  matchStatus?: string;
  onStartScoring?: () => void;
  onEndInnings?: () => void;
  onEndMatch?: () => void;
  onResetMatch?: () => void;
  onEditScorecard?: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  visible,
  onClose,
  isScorer = false,
  matchStatus,
  onStartScoring,
  onEndInnings,
  onEndMatch,
  onResetMatch,
  onEditScorecard,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.menuContent}>
        {isScorer && (matchStatus === 'scheduled' || matchStatus === 'live') && onStartScoring && (
          <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onStartScoring(); }}>
            <Text style={styles.menuItemText}>{matchStatus === 'live' ? 'Resume Scoring' : 'Start Scoring'}</Text>
          </TouchableOpacity>
        )}
        {isScorer && (matchStatus === 'live' || matchStatus === 'completed') && onEditScorecard && (
          <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onEditScorecard(); }}>
            <Text style={styles.menuItemText}>Edit Scorecard</Text>
          </TouchableOpacity>
        )}
        {onEndInnings && (
          <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onEndInnings(); }}>
            <Text style={styles.menuItemText}>End Innings</Text>
          </TouchableOpacity>
        )}
        {onEndMatch && (
          <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onEndMatch(); }}>
            <Text style={styles.menuItemText}>End Match</Text>
          </TouchableOpacity>
        )}
        {onResetMatch && (
          <TouchableOpacity style={styles.menuItem} onPress={() => { onClose(); onResetMatch(); }}>
            <Text style={styles.menuItemTextDestructive}>Reset Match</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  menuContent: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
    minWidth: 150,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  menuItemTextDestructive: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.error,
  },
});
