import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, typography } from '../../theme';

interface ScorecardModalsProps {
  type: 'batter' | 'bowler' | 'extras' | 'total' | null;
  data: any;
  squadMembers?: any[];
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const ScorecardModals: React.FC<ScorecardModalsProps> = ({ type, data, squadMembers = [], visible, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (visible && data) {
      setFormData({ ...data });
    }
  }, [visible, data]);

  const updateField = (field: string, value: string) => {
    const num = parseInt(value, 10);
    setFormData((prev: any) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  const updatePlayer = (playerId: number, playerName: string) => {
    setFormData((prev: any) => ({ ...prev, playerId, playerName }));
  };

  if (!visible || !type) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Edit {type}</Text>

          <ScrollView style={styles.scrollArea}>
            {/* Player Selection for Batter/Bowler */}
            {(type === 'batter' || type === 'bowler') && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Player</Text>
                <View style={styles.playerList}>
                  {squadMembers.map(p => (
                    <TouchableOpacity
                      key={p.playerId}
                      style={[styles.playerChip, formData.playerId === p.playerId && styles.playerChipActive]}
                      onPress={() => updatePlayer(p.playerId, p.playerName)}
                    >
                      <Text style={[styles.playerChipText, formData.playerId === p.playerId && styles.playerChipTextActive]}>
                        {p.playerName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Batter Fields */}
            {type === 'batter' && (
              <>
                <Field label="Runs" value={formData.runs} onChange={(val) => updateField('runs', val)} />
                <Field label="Balls" value={formData.balls} onChange={(val) => updateField('balls', val)} />
                <Field label="Fours" value={formData.fours} onChange={(val) => updateField('fours', val)} />
                <Field label="Sixes" value={formData.sixes} onChange={(val) => updateField('sixes', val)} />
              </>
            )}

            {/* Bowler Fields */}
            {type === 'bowler' && (
              <>
                <Field label="Overs" value={formData.overs} onChange={(val) => updateField('overs', val)} />
                <Field label="Maidens" value={formData.maidens} onChange={(val) => updateField('maidens', val)} />
                <Field label="Runs" value={formData.runs} onChange={(val) => updateField('runs', val)} />
                <Field label="Wickets" value={formData.wickets} onChange={(val) => updateField('wickets', val)} />
                <Field label="Wides" value={formData.wides} onChange={(val) => updateField('wides', val)} />
                <Field label="No Balls" value={formData.noBalls} onChange={(val) => updateField('noBalls', val)} />
              </>
            )}

            {/* Extras Fields */}
            {type === 'extras' && (
              <>
                <Field label="Byes" value={formData.byes} onChange={(val) => updateField('byes', val)} />
                <Field label="Leg Byes" value={formData.legByes} onChange={(val) => updateField('legByes', val)} />
                <Field label="Wides" value={formData.wides} onChange={(val) => updateField('wides', val)} />
                <Field label="No Balls" value={formData.noBalls} onChange={(val) => updateField('noBalls', val)} />
              </>
            )}

            {/* Total Fields */}
            {type === 'total' && (
              <>
                <Field label="Score" value={formData.score} onChange={(val) => updateField('score', val)} />
                <Field label="Wickets" value={formData.wickets} onChange={(val) => updateField('wickets', val)} />
                <Field label="Overs" value={formData.overs} onChange={(val) => updateField('overs', val)} />
              </>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => {
              if (type === 'extras') {
                formData.total = (formData.byes || 0) + (formData.legByes || 0) + (formData.wides || 0) + (formData.noBalls || 0);
              }
              onSave(formData);
            }}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Field = ({ label, value, onChange }: any) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      keyboardType="number-pad"
      value={String(value || 0)}
      onChangeText={onChange}
    />
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 24,
    maxHeight: '80%',
  },
  title: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  scrollArea: {
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.systemGray,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surfaceContainerHighest,
    color: colors.onSurface,
    padding: 12,
    borderRadius: 8,
    fontSize: typography.bodyLg.fontSize,
  },
  playerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playerChipActive: {
    backgroundColor: colors.whatsappGreen,
  },
  playerChipText: {
    color: colors.onSurface,
    fontSize: typography.labelSm.fontSize,
  },
  playerChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    padding: 12,
  },
  cancelText: {
    color: colors.onSurface,
    fontSize: typography.bodyMd.fontSize,
  },
  saveBtn: {
    backgroundColor: colors.whatsappGreen,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  saveText: {
    color: '#fff',
    fontSize: typography.bodyMd.fontSize,
    fontWeight: 'bold',
  },
});
