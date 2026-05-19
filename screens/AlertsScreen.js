import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BACKEND_URL } from '../config';

const ENV_LABELS = {
  retail: 'Market',
  office: 'Ofis',
  home: 'Ev',
  warehouse: 'Depo',
  parking: 'Otopark',
};

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
    ' ' + d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

function IncidentRow({ item, onPress }) {
  const isPending = item.status === 'pending';
  return (
    <TouchableOpacity
      style={[styles.card, !isPending && styles.cardReviewed]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, isPending ? styles.dotPending : (item.review_decision === 'confirmed' ? styles.dotConfirmed : styles.dotDismissed)]} />
        <Text style={styles.cardEnv}>{ENV_LABELS[item.environment] || item.environment}</Text>
        <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
      </View>
      <Text style={styles.cardReason} numberOfLines={2}>{item.reason}</Text>
      <View style={styles.cardFooter}>
        {isPending ? (
          <Text style={styles.pendingLabel}>⏳ İnceleme Bekliyor</Text>
        ) : item.review_decision === 'confirmed' ? (
          <Text style={styles.confirmedLabel}>✓ Hırsızlık Onaylandı</Text>
        ) : (
          <Text style={styles.dismissedLabel}>✗ Yanlış Alarm</Text>
        )}
        {isPending && (
          <Text style={styles.reviewCta}>İncele →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AlertsScreen({ navigation }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchIncidents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${BACKEND_URL}/api/incidents`, { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      setIncidents(data);
      setError(null);
    } catch (e) {
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchIncidents();
      const interval = setInterval(() => fetchIncidents(true), 5000);
      return () => clearInterval(interval);
    }, [fetchIncidents])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const pendingCount = incidents.filter(i => i.status === 'pending').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6a5acd" size="large" />
        <Text style={styles.loadingText}>Olaylar yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚡</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSub}>{BACKEND_URL}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchIncidents()}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{incidents.length}</Text>
          <Text style={styles.statLabel}>Toplam Olay</Text>
        </View>
        <View style={[styles.statBox, pendingCount > 0 && styles.statBoxAlert]}>
          <Text style={[styles.statNum, pendingCount > 0 && styles.statNumAlert]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Bekleyen</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{incidents.filter(i => i.review_decision === 'confirmed').length}</Text>
          <Text style={styles.statLabel}>Onaylanan</Text>
        </View>
      </View>

      {incidents.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyText}>Henüz tespit edilen olay yok</Text>
          <Text style={styles.emptySub}>Hırsızlık tespit edildiğinde burada görünecek</Text>
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <IncidentRow
              item={item}
              onPress={() => navigation.navigate('Review', { incident: item })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6a5acd" />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statBoxAlert: { backgroundColor: '#1a0000' },
  statNum: { color: '#fff', fontSize: 22, fontWeight: '700' },
  statNumAlert: { color: '#ff4444' },
  statLabel: { color: '#555', fontSize: 10, marginTop: 2 },

  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardReviewed: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotPending: { backgroundColor: '#f59e0b' },
  dotConfirmed: { backgroundColor: '#ef4444' },
  dotDismissed: { backgroundColor: '#22c55e' },
  cardEnv: { color: '#6a5acd', fontSize: 12, fontWeight: '600', flex: 1 },
  cardTime: { color: '#555', fontSize: 11 },
  cardReason: { color: '#aaa', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pendingLabel: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  confirmedLabel: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  dismissedLabel: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  reviewCta: { color: '#6a5acd', fontSize: 12, fontWeight: '600' },

  loadingText: { color: '#555', marginTop: 12 },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { color: '#ef4444', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  errorSub: { color: '#555', fontSize: 12, marginBottom: 20 },
  retryBtn: { backgroundColor: '#6a5acd', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },

  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySub: { color: '#555', fontSize: 13, textAlign: 'center' },
});
