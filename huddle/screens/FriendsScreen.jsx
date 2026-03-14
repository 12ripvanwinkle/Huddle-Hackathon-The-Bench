import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import MemberAvatar from '../components/MemberAvatar';
import { formatDistance } from '../services/huddleService';

const PURPLE = '#534AB7';
const RED = '#E24B4A';
const GREEN = '#1D9E75';
const GRAY = '#AAAAAA';

const FAKE_MEMBERS = [
  { id: '1', name: 'Jordan Kim',   initials: 'JK', status: 'safe',  distance: 42,  role: 'member' },
  { id: '2', name: 'Alex Morales', initials: 'AM', status: 'safe',  distance: 88,  role: 'member' },
  { id: '3', name: 'Taylor Wong',  initials: 'TW', status: 'alert', distance: 214, role: 'member' },
  { id: '4', name: 'Sam Rivera',   initials: 'SR', status: 'safe',  distance: 110, role: 'member' },
  { id: '5', name: 'You',          initials: 'ME', status: 'safe',  distance: 0,   role: 'host'   },
];

const STATUS_FILTERS = ['All', 'Safe', 'Alert', 'Left'];

export default function FriendsScreen() {
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy]             = useState('name');

  const filtered = FAKE_MEMBERS
    .filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        activeFilter === 'All'   ? true :
        activeFilter === 'Safe'  ? m.status === 'safe'  :
        activeFilter === 'Alert' ? m.status === 'alert' :
        activeFilter === 'Left'  ? m.status === 'left'  : true;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'distance') return a.distance - b.distance;
      if (sortBy === 'status') {
        const order = { alert: 0, safe: 1, left: 2 };
        return order[a.status] - order[b.status];
      }
      return a.name.localeCompare(b.name);
    });

  const alertCount = FAKE_MEMBERS.filter(m => m.status === 'alert').length;

  const renderItem = ({ item }) => {
    const isAlert = item.status === 'alert';
    const isLeft  = item.status === 'left';
    const isMe    = item.role === 'host';
    return (
      <View style={[styles.card, isAlert && styles.cardAlert, isLeft && styles.cardLeft]}>
        <MemberAvatar initials={item.initials} status={item.status} size={46} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            {isMe    && <View style={styles.badge}><Text style={styles.badgeText}>👑 Host</Text></View>}
            {isAlert && <View style={[styles.badge, styles.badgeAlert]}><Text style={[styles.badgeText, styles.badgeTextAlert]}>Outside zone</Text></View>}
            {isLeft  && <View style={[styles.badge, styles.badgeLeft]}><Text style={[styles.badgeText, styles.badgeTextLeft]}>Left</Text></View>}
          </View>
          <Text style={[styles.status, { color: isAlert ? RED : isLeft ? GRAY : GREEN }]}>
            {isAlert ? '⚠️ Outside huddle zone' : isLeft ? '👋 Left the session' : item.distance === 0 ? '📍 Your location' : '✅ In zone'}
          </Text>
        </View>
        {item.distance > 0 && (
          <View style={styles.distanceCol}>
            <Text style={[styles.distanceNum, isAlert && { color: RED }]}>{formatDistance(item.distance)}</Text>
            <Text style={styles.distanceLabel}>away</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {alertCount > 0 && (
        <View style={styles.alertSummary}>
          <Text style={styles.alertSummaryText}>⚠️ {alertCount} member{alertCount > 1 ? 's' : ''} outside the huddle zone</Text>
        </View>
      )}
      <TextInput
        style={styles.search}
        placeholder="🔍  Search members..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#AAA"
      />
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {['name', 'distance', 'status'].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
            onPress={() => setSortBy(s)}
          >
            <Text style={[styles.sortText, sortBy === s && styles.sortTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FC', paddingTop: 16, paddingHorizontal: 16 },
  alertSummary: { backgroundColor: '#FEECEC', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 0.5, borderColor: RED },
  alertSummaryText: { color: RED, fontSize: 13, fontWeight: '500', textAlign: 'center' },
  search: { backgroundColor: 'white', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10, borderWidth: 0.5, borderColor: '#E0E0E0', color: '#222' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: '#DDD', backgroundColor: 'white' },
  filterBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: 'white', fontWeight: '500' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sortLabel: { fontSize: 12, color: '#999' },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 0.5, borderColor: '#E0E0E0', backgroundColor: 'white' },
  sortBtnActive: { backgroundColor: '#EEEDFE', borderColor: PURPLE },
  sortText: { fontSize: 12, color: '#666' },
  sortTextActive: { color: PURPLE, fontWeight: '500' },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 0.5, borderColor: '#EBEBEB' },
  cardAlert: { borderColor: RED, backgroundColor: '#FFF8F8' },
  cardLeft: { borderColor: '#DDD', backgroundColor: '#FAFAFA', opacity: 0.7 },
  info: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '500', color: '#222' },
  badge: { backgroundColor: '#EEEDFE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: PURPLE, fontWeight: '500' },
  badgeAlert: { backgroundColor: '#FEECEC' },
  badgeTextAlert: { color: RED },
  badgeLeft: { backgroundColor: '#F0F0F0' },
  badgeTextLeft: { color: GRAY },
  status: { fontSize: 12, marginTop: 3 },
  distanceCol: { alignItems: 'flex-end' },
  distanceNum: { fontSize: 16, fontWeight: '600', color: PURPLE },
  distanceLabel: { fontSize: 11, color: '#999' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#999' },
});