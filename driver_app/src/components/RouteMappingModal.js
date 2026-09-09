import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';

export default function RouteMappingModal({
  visible,
  onClose,
  driverLocation,
  destination,
  homeLocation,
  remainingDistanceKm,
}) {
  if (!visible || !destination) return null;

  const handleOpenGps = () => {
    const lat = destination.destination_lat || destination.lat;
    const lng = destination.destination_lng || destination.lng;
    const name = destination.destination_name || destination.name || 'Destination';
    if (!lat || !lng) return;

    const latLng = `${lat},${lng}`;
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latLng}`,
    });

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latLng}`);
    });
  };

  const destName = destination.destination_name || destination.name || 'Delivery Destination';
  const destAddress = destination.destination_address || destination.address || 'No physical address specified';
  const destRadius = destination.destination_radius_m || destination.radius_m || 500;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <Text style={styles.iconBadgeText}>🗺️</Text>
              </View>
              <View>
                <Text style={styles.headerSubtitle}>LIVE TRANSIT ROUTE MAPPING</Text>
                <Text style={styles.headerTitle}>Driver ➔ Destination</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} bounces={false}>
            {/* Live Distance Callout */}
            <View style={styles.metricBanner}>
              <View>
                <Text style={styles.metricLabel}>STRAIGHT-LINE DISTANCE</Text>
                <Text style={styles.metricValue}>
                  {remainingDistanceKm ? `${remainingDistanceKm} km` : 'Calculating...'}
                </Text>
              </View>
              <View style={styles.geofencePill}>
                <Text style={styles.geofencePillText}>🎯 Geofence: {destRadius}m</Text>
              </View>
            </View>

            {/* Route Waypoints Visualization */}
            <View style={styles.timeline}>
              {/* Point 1: Home Base */}
              <View style={styles.timelineStep}>
                <View style={styles.stepIndicatorCol}>
                  <View style={[styles.stepDot, { backgroundColor: '#f59e0b' }]}>
                    <Text style={styles.stepDotText}>🏥</Text>
                  </View>
                  <View style={styles.stepLine} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, { color: '#f59e0b' }]}>ORIGIN · BLOOD DONATION BUILDING</Text>
                  <Text style={styles.stepTitle}>{homeLocation?.name || 'Jankalyan Blood Centre (Home Base)'}</Text>
                  <Text style={styles.stepSub}>{homeLocation?.address || 'Central Blood Bank & Dispatch HQ'}</Text>
                </View>
              </View>

              {/* Point 2: Current Vehicle GPS */}
              <View style={styles.timelineStep}>
                <View style={styles.stepIndicatorCol}>
                  <View style={[styles.stepDot, { backgroundColor: '#10b981' }]}>
                    <Text style={styles.stepDotText}>🚚</Text>
                  </View>
                  <View style={[styles.stepLine, { borderColor: '#38bdf8' }]} />
                </View>
                <View style={styles.stepContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.stepLabel, { color: '#10b981' }]}>CURRENT VEHICLE LOCATION</Text>
                    <View style={styles.livePulseDot} />
                  </View>
                  <Text style={styles.stepTitle}>
                    {driverLocation?.address || 'Live Hardware GPS Locked'}
                  </Text>
                  <Text style={styles.stepCoords}>
                    {driverLocation?.lat?.toFixed(4)}, {driverLocation?.lng?.toFixed(4)} · Speed: {Math.round(driverLocation?.speed || 0)} km/h
                  </Text>
                </View>
              </View>

              {/* Point 3: Destination */}
              <View style={styles.timelineStep}>
                <View style={styles.stepIndicatorCol}>
                  <View style={[styles.stepDot, { backgroundColor: '#ef4444' }]}>
                    <Text style={styles.stepDotText}>📍</Text>
                  </View>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, { color: '#ef4444' }]}>TARGET DESTINATION</Text>
                  <Text style={styles.stepTitle}>{destName}</Text>
                  <Text style={styles.stepSub}>{destAddress}</Text>
                </View>
              </View>
            </View>

            {/* Note banner */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                ℹ️ Live mapping stays active on manager console & driver app until you click
                "Mark Delivery Complete".
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.navBtn} onPress={handleOpenGps} activeOpacity={0.85}>
              <Text style={styles.navBtnText}>🧭 Open Google Maps Navigation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.dismissBtnText}>Close Route Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    overflow: 'hidden',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.25)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeText: {
    fontSize: 20,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    padding: 18,
    maxHeight: 380,
  },
  metricBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#38bdf8',
    marginTop: 2,
  },
  geofencePill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  geofencePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f87171',
  },
  timeline: {
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    gap: 12,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 32,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontSize: 13,
  },
  stepLine: {
    width: 2,
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#475569',
    marginVertical: 4,
    minHeight: 28,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  stepSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  stepCoords: {
    fontSize: 10.5,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 3,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  infoBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 11,
    color: '#34d399',
    lineHeight: 16,
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 10,
  },
  navBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13.5,
  },
  dismissBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12.5,
  },
});
