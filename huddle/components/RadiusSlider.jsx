import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';

const PURPLE = '#fb7854';
const RADIUS_OPTIONS = [0, 50, 100, 150, 300, 500];

export default function RadiusSlider({ radius, onChange, disabled = false }) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Radius</Text>
        <View style={styles.valueChip}>
          <Text style={styles.valueText}>{radius}m</Text>
        </View>
        {disabled && <Text style={styles.disabledNote}>Set by host</Text>}
      </View>
      <View style={styles.presets}>
        {RADIUS_OPTIONS.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.presetBtn, radius === r && styles.presetBtnActive, disabled && styles.presetBtnDisabled]}
            onPress={() => !disabled && onChange(r)}
            disabled={disabled}
          >
            <Text style={[styles.presetText, radius === r && styles.presetTextActive, disabled && styles.presetTextDisabled]}>
              {r}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {!disabled && (
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={500}
          step={10}
          value={radius}
          onValueChange={onChange}
          minimumTrackTintColor={PURPLE}
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor={PURPLE}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { fontSize: 13, color: '#666', fontWeight: '500' },
  valueChip: { backgroundColor: '#EEEDFE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  valueText: { color: PURPLE, fontSize: 13, fontWeight: '600' },
  disabledNote: { fontSize: 11, color: '#999', fontStyle: 'italic' },
  presets: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: '#DDD', backgroundColor: '#F9F9F9' },
  presetBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  presetBtnDisabled: { backgroundColor: '#F0F0F0', borderColor: '#E0E0E0' },
  presetText: { fontSize: 13, color: '#444' },
  presetTextActive: { color: 'white', fontWeight: '500' },
  presetTextDisabled: { color: '#BBB' },
  slider: { width: '100%', height: 40 },
});
