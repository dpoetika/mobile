import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { BACKEND_URL } from '../config';

const ENV_LABELS = {
  retail: 'Market',
  office: 'Ofis',
  home: 'Ev',
  warehouse: 'Depo',
  parking: 'Otopark',
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('tr-TR');
}

export default function ReviewScreen({ route, navigation }) {
  const { incident: initialIncident } = route.params;
  const [incident, setIncident] = useState(initialIncident);
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isReviewed = incident.status !== 'pending';

  const handleDecision = (decision) => {
    const label = decision === 'confirmed' ? 'Hırsızlık Onayla' : 'Yanlış Alarm';
    const message = decision === 'confirmed'
      ? 'Bu olayı gerçek hırsızlık olarak onaylamak istiyor musunuz? Kayıt altına alınacak.'
      : 'Bu olayı yanlış alarm olarak işaretlemek istiyor musunuz?';

    Alert.alert(label, message, [
      { text: 'İptal', style: 'cancel' },
      {
        text: label,
        style: decision === 'confirmed' ? 'destructive' : 'default',
        onPress: () => submitDecision(decision),
      },
    ]);
  };

  const submitDecision = async (decision) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/incidents/${incident.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (data.success) {
        setIncident(data.incident);
        Alert.alert(
          'Kaydedildi',
          decision === 'confirmed' ? 'Hırsızlık olayı onaylandı.' : 'Yanlış alarm olarak işaretlendi.',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Hata', data.error || 'İşlem başarısız');
      }
    } catch {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const snapshotUrl = `${BACKEND_URL}/api/snapshots/${incident.snapshot_filename}`;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Snapshot */}
      <View style={styles.imageContainer}>
        {!imageError ? (
          <Image
            source={{ uri: snapshotUrl }}
            style={styles.snapshot}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderIcon}>📷</Text>
            <Text style={styles.imagePlaceholderText}>Görüntü yüklenemedi</Text>
          </View>
        )}
        {isReviewed && (
          <View style={[
            styles.reviewedBanner,
            incident.review_decision === 'confirmed' ? styles.reviewedBannerConfirmed : styles.reviewedBannerDismissed,
          ]}>
            <Text style={styles.reviewedBannerText}>
              {incident.review_decision === 'confirmed' ? '⚠ HIRSIZLIK ONAYLANDI' : '✓ YANLIŞ ALARM'}
            </Text>
          </View>
        )}
      </View>

      {/* Incident Details */}
      <View style={styles.detailsCard}>
        <DetailRow label="Ortam" value={ENV_LABELS[incident.environment] || incident.environment} />
        <DetailRow label="Tespit Zamanı" value={formatDate(incident.timestamp)} />
        <DetailRow label="Durum" value={
          incident.status === 'pending' ? 'İnceleme Bekliyor' :
          incident.review_decision === 'confirmed' ? 'Hırsızlık Onaylandı' : 'Yanlış Alarm'
        } />
        {incident.reviewed_at && (
          <DetailRow label="İnceleme Zamanı" value={formatDate(incident.reviewed_at)} />
        )}
      </View>

      {/* AI Reason */}
      <View style={styles.reasonCard}>
        <Text style={styles.reasonLabel}>AI ANALİZ SONUCU</Text>
        <Text style={styles.reasonText}>{incident.reason}</Text>
      </View>

      {/* Action Buttons */}
      {!isReviewed ? (
        <View style={styles.actions}>
          <Text style={styles.actionsTitle}>Bu görüntüyü inceleyerek karar verin:</Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnConfirm, submitting && styles.btnDisabled]}
            onPress={() => handleDecision('confirmed')}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnIcon}>🚨</Text>
                <Text style={styles.btnText}>Hırsızlık Onayla</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnDismiss, submitting && styles.btnDisabled]}
            onPress={() => handleDecision('dismissed')}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnIcon}>✓</Text>
                <Text style={styles.btnText}>Yanlış Alarm</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.alreadyReviewed}>
          <Text style={styles.alreadyReviewedText}>Bu olay incelendi</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Listeye Dön</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { paddingBottom: 40 },

  imageContainer: { position: 'relative', backgroundColor: '#111', aspectRatio: 16 / 9 },
  snapshot: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 16 / 9,
  },
  imagePlaceholderIcon: { fontSize: 40, marginBottom: 8 },
  imagePlaceholderText: { color: '#555' },
  reviewedBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    alignItems: 'center',
  },
  reviewedBannerConfirmed: { backgroundColor: 'rgba(127,0,0,0.85)' },
  reviewedBannerDismissed: { backgroundColor: 'rgba(0,80,0,0.85)' },
  reviewedBannerText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  detailsCard: {
    backgroundColor: '#161616',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  detailLabel: { color: '#666', fontSize: 13 },
  detailValue: { color: '#ccc', fontSize: 13, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  reasonCard: {
    backgroundColor: '#161616',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  reasonLabel: { color: '#6a5acd', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  reasonText: { color: '#bbb', fontSize: 14, lineHeight: 20 },

  actions: { margin: 16, gap: 12 },
  actionsTitle: { color: '#666', fontSize: 13, textAlign: 'center', marginBottom: 4 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  btnConfirm: { backgroundColor: '#7f0000' },
  btnDismiss: { backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#22c55e' },
  btnDisabled: { opacity: 0.5 },
  btnIcon: { fontSize: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  alreadyReviewed: { margin: 16, alignItems: 'center', gap: 12 },
  alreadyReviewedText: { color: '#666', fontSize: 14 },
  backBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  backBtnText: { color: '#6a5acd', fontWeight: '600' },
});
