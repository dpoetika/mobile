import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { BACKEND_URL } from '../config';

const ENVIRONMENTS = ['retail', 'office', 'home', 'warehouse', 'parking'];
const ENV_LABELS = {
  retail: 'Market',
  office: 'Ofis',
  home: 'Ev',
  warehouse: 'Depo',
  parking: 'Otopark',
};

export default function LiveFeedScreen() {
  const [status, setStatus] = useState({
    intel: 'Bağlanıyor...',
    danger: false,
    environment: 'retail',
    pending_incidents: 0,
  });
  const [sourceInfo, setSourceInfo] = useState({ type: 'webcam', filename: null, upload_id: 0 });
  const [activeEnv, setActiveEnv] = useState('retail');
  const [envLoading, setEnvLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);

  const webViewRef = useRef(null);
  const lastUploadId = useRef(0);

  const fetchStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${BACKEND_URL}/api/status`, { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      setStatus(data);
      setActiveEnv(data.environment);
    } catch {
      // ignore transient errors
    }
  }, []);

  const fetchSource = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${BACKEND_URL}/api/source`, { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      setSourceInfo(data);

      // Yeni video yüklendiyse WebView'ı yenile
      if (data.upload_id > lastUploadId.current) {
        lastUploadId.current = data.upload_id;
        // Kısa gecikme — backend kaynağı değiştirdikten sonra stream hazır olsun
        setTimeout(() => {
          webViewRef.current?.reload();
          setStreamError(false);
        }, 800);
      }
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      fetchSource();
      const statusInterval = setInterval(fetchStatus, 2000);
      const sourceInterval = setInterval(fetchSource, 3000);
      return () => {
        clearInterval(statusInterval);
        clearInterval(sourceInterval);
      };
    }, [fetchStatus, fetchSource])
  );

  const switchEnv = async (env) => {
    setEnvLoading(true);
    try {
      await fetch(`${BACKEND_URL}/set_env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: env }),
      });
      setActiveEnv(env);
    } catch {
      // ignore
    } finally {
      setEnvLoading(false);
    }
  };

  // Cache-bust parametresi: reload tetiklendiğinde WebView içindeki img
  // de yenilenir; MJPEG stream sürekli olduğu için sonraki frame'den devam eder.
  const streamHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0a; display: flex; align-items: center; justify-content: center; height: 100vh; }
        img { width: 100%; height: 100%; object-fit: contain; }
      </style>
    </head>
    <body>
      <img src="${BACKEND_URL}/video_feed?t=${Date.now()}"
           onerror="this.style.display='none'; document.getElementById('err').style.display='flex';" />
      <div id="err" style="display:none;flex-direction:column;align-items:center;color:#888;font-family:sans-serif;">
        <p style="font-size:16px;margin-bottom:6px;">Kamera akışı bağlanamadı</p>
        <p style="font-size:12px;color:#555;">${BACKEND_URL}</p>
      </div>
    </body>
    </html>
  `;

  const isVideo = sourceInfo.type === 'file';

  return (
    <View style={styles.root}>
      {/* Status Banner */}
      <View style={[styles.banner, status.danger ? styles.bannerDanger : styles.bannerSafe]}>
        <Text style={styles.bannerText} numberOfLines={1}>
          {status.danger ? '⚠ RİSK TESPİT EDİLDİ' : '✓ GÜVENLİ'}
        </Text>
        {status.pending_incidents > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{status.pending_incidents} bekliyor</Text>
          </View>
        )}
      </View>

      {/* Upload Banner — web'den video yüklendiğinde görünür */}
      {isVideo && (
        <View style={styles.uploadBanner}>
          <Text style={styles.uploadIcon}>📹</Text>
          <Text style={styles.uploadText} numberOfLines={1}>
            Video analiz ediliyor: {sourceInfo.filename}
          </Text>
        </View>
      )}

      {/* Video Stream */}
      <View style={styles.streamContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: streamHtml }}
          style={styles.webview}
          scrollEnabled={false}
          onError={() => setStreamError(true)}
          onHttpError={() => setStreamError(true)}
          mediaPlaybackRequiresUserAction={false}
          cacheEnabled={false}
        />
        {streamError && (
          <View style={styles.streamOverlay}>
            <Text style={styles.streamErrorText}>Akış alınamıyor</Text>
            <Text style={styles.streamErrorSub}>{BACKEND_URL}</Text>
            <TouchableOpacity
              style={styles.reloadBtn}
              onPress={() => { setStreamError(false); webViewRef.current?.reload(); }}
            >
              <Text style={styles.reloadBtnText}>Yenile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Intel Message */}
      <View style={styles.intelBox}>
        <Text style={styles.intelLabel}>AI ANALİZ</Text>
        <Text style={styles.intelText} numberOfLines={3}>{status.intel}</Text>
      </View>

      {/* Environment Selector */}
      <View style={styles.envSection}>
        <Text style={styles.envLabel}>
          ORTAM {envLoading ? '(değiştiriliyor...)' : ''}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.envRow}>
          {ENVIRONMENTS.map((env) => (
            <TouchableOpacity
              key={env}
              style={[styles.envBtn, activeEnv === env && styles.envBtnActive]}
              onPress={() => switchEnv(env)}
              disabled={envLoading}
            >
              <Text style={[styles.envBtnText, activeEnv === env && styles.envBtnTextActive]}>
                {ENV_LABELS[env]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerDanger: { backgroundColor: '#7f0000' },
  bannerSafe: { backgroundColor: '#1a3a1a' },
  bannerText: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 },
  badge: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a3a',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a5a',
  },
  uploadIcon: { fontSize: 14 },
  uploadText: { color: '#9090ff', fontSize: 12, flex: 1 },

  streamContainer: { flex: 1, backgroundColor: '#111', position: 'relative' },
  webview: { flex: 1, backgroundColor: '#111' },
  streamOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  streamErrorText: { color: '#888', fontSize: 16 },
  streamErrorSub: { color: '#555', fontSize: 12 },
  reloadBtn: {
    marginTop: 4,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  reloadBtnText: { color: '#aaa', fontWeight: '600' },

  intelBox: {
    backgroundColor: '#161616',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  intelLabel: { color: '#6a5acd', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  intelText: { color: '#ccc', fontSize: 12 },

  envSection: {
    backgroundColor: '#111',
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  envLabel: { color: '#555', fontSize: 10, letterSpacing: 1, marginLeft: 16, marginBottom: 6 },
  envRow: { paddingHorizontal: 12, gap: 8 },
  envBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
  },
  envBtnActive: { backgroundColor: '#6a5acd', borderColor: '#6a5acd' },
  envBtnText: { color: '#888', fontSize: 12 },
  envBtnTextActive: { color: '#fff', fontWeight: '600' },
});
