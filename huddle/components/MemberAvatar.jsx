import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PURPLE = '#534AB7';
const RED = '#E24B4A';
const GREEN = '#1D9E75';
const GRAY = '#AAAAAA';

export default function MemberAvatar({ initials, status = 'safe', size = 40 }) {
  const bgColor = {
    safe: PURPLE,
    alert: RED,
    left: GRAY,
  }[status] || PURPLE;

  return (
    <View style={[styles.avatar, {
      width: size, height: size,
      borderRadius: size / 2,
      backgroundColor: bgColor,
    }]}>
      <Text style={[styles.initials, { fontSize: size * 0.32 }]}>
        {initials}
      </Text>
      <View style={[styles.dot, {
        backgroundColor: status === 'safe' ? GREEN : status === 'alert' ? RED : GRAY,
        width: size * 0.28, height: size * 0.28,
        borderRadius: size * 0.14,
        bottom: 0, right: 0,
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  initials: { color: 'white', fontWeight: '600' },
  dot: { position: 'absolute', borderWidth: 1.5, borderColor: 'white' },
});