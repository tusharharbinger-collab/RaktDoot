import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView, Platform
} from 'react-native';
import { updateDriverProfile, storeAuth, getStoredAuth } from '../services/api';

const TEXTS = {
  en: {
    title: 'Vehicle Profile Setup',
    subtitle: 'Configure your active vehicle for blood delivery tracking',
    firstTimeNote: 'Please enter your vehicle details to start accepting deliveries.',
    vehicleTypeLabel: 'VEHICLE TYPE',
    twoWheeler: 'Two Wheeler',
    twoWheelerSub: 'Bike / Scooter / Motorcycle',
    fourWheeler: 'Four Wheeler',
    fourWheelerSub: 'Van / Car / Blood Ambulance',
    plateLabel: 'VEHICLE REGISTRATION NUMBER',
    platePlaceholder: 'e.g. MH 12 AB 1234',
    plateHint: 'Official RTO license plate number',
    phoneLabel: 'DRIVER CONTACT PHONE',
    phonePlaceholder: '+91 98765 43210',
    nameLabel: 'DRIVER FULL NAME',
    saveBtn: 'Save Vehicle Profile',
    savingBtn: 'Saving Profile...',
    successTitle: 'Profile Updated!',
    successMsg: 'Your vehicle profile is now active and visible to managers and admins.',
    dispatchNotice: 'ℹ️ Dispatch Managers and Administrators use this information to allocate blood emergency requests based on your vehicle capacity.',
    close: 'Close',
  },
  mr: {
    title: 'वाहन माहिती नोंदणी',
    subtitle: 'रक्त वितरण ट्रॅकिंगसाठी वाहनाची माहिती प्रविष्ट करा',
    firstTimeNote: 'वितरण सुरू करण्यासाठी कृपया वाहनाचा तपशील भरा.',
    vehicleTypeLabel: 'वाहनाचा प्रकार',
    twoWheeler: 'दुचाकी (Two Wheeler)',
    twoWheelerSub: 'बाईक / स्कूटर / मोटारसायकल',
    fourWheeler: 'चारचाकी (Four Wheeler)',
    fourWheelerSub: 'व्हॅन / कार / रक्तपेढी रुग्णवाहिका',
    plateLabel: 'वाहन क्रमांक (RTO NUMBER)',
    platePlaceholder: 'उदा. MH 12 AB 1234',
    plateHint: 'अधिकृत RTO नोंदणी क्रमांक',
    phoneLabel: 'चालकाचा संपर्क क्रमांक',
    phonePlaceholder: '+91 98765 43210',
    nameLabel: 'चालकाचे पूर्ण नाव',
    saveBtn: 'वाहन माहिती जतन करा',
    savingBtn: 'जतन करत आहे...',
    successTitle: 'माहिती अद्ययावत झाली!',
    successMsg: 'तुमची वाहन माहिती यशस्वीरीत्या व्यवस्थापक व ॲडमिनसाठी सक्रिय झाली आहे.',
    dispatchNotice: 'ℹ️ व्यवस्थापक या माहितीच्या आधारे योग्य वाहनानुसार रक्त वितरणाचे काम सोपवतात.',
    close: 'बंद करा',
  }
};

export default function VehicleProfileModal({
  visible,
  onClose,
  user,
  onSaveSuccess,
  serverUrl,
  token,
  lang = 'en',
}) {
  const t = TEXTS[lang] || TEXTS.en;

  const [vehicleType, setVehicleType] = useState('two_wheeler');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [plateFocused, setPlateFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  useEffect(() => {
    if (user) {
      setVehicleType(user.vehicle_type || 'two_wheeler');
      setVehicleNumber(user.vehicle_number || '');
      setPhone(user.phone || '');
      setName(user.name || '');
    }
  }, [user, visible]);

  const handleSave = async () => {
    const cleanPlate = (vehicleNumber || '').trim().toUpperCase();
    if (!cleanPlate) {
      Alert.alert(
        lang === 'mr' ? 'आवश्यक' : 'Required',
        lang === 'mr' ? 'कृपया वाहन क्रमांक प्रविष्ट करा (उदा. MH 12 AB 1234).' : 'Please enter your vehicle registration number (e.g. MH 12 AB 1234).'
      );
      return;
    }

    try {
      setSaving(true);
      const updatedUser = await updateDriverProfile(serverUrl, token, {
        vehicle_type: vehicleType,
        vehicle_number: cleanPlate,
        phone: (phone || '').trim() || null,
        name: (name || '').trim() || user?.name,
      });

      // Update stored session so reload keeps new vehicle info
      try {
        const stored = await getStoredAuth();
        if (stored?.token) {
          await storeAuth({
            token: stored.token,
            user: {
              ...stored.user,
              ...updatedUser,
            },
          });
        }
      } catch (_) {}

      Alert.alert(t.successTitle, t.successMsg, [
        {
          text: 'OK',
          onPress: () => {
            if (onSaveSuccess) onSaveSuccess(updatedUser);
            if (onClose) onClose();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Could not update vehicle profile.');
    } finally {
      setSaving(false);
    }
  };

  const isMandatoryFirstTime = !user?.vehicle_number;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={isMandatoryFirstTime ? () => {} : onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Text style={styles.badgeIcon}>🛵 / 🚐</Text>
                <Text style={styles.badgeText}>DRIVER FLEET PROFILE</Text>
              </View>
              <Text style={styles.title}>{t.title}</Text>
              <Text style={styles.subtitle}>{t.subtitle}</Text>
            </View>
            {!isMandatoryFirstTime && (
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {isMandatoryFirstTime && (
              <View style={styles.firstTimeBanner}>
                <Text style={styles.firstTimeIcon}>⚡</Text>
                <Text style={styles.firstTimeText}>{t.firstTimeNote}</Text>
              </View>
            )}

            {/* 1. Vehicle Type Selector */}
            <Text style={styles.sectionLabel}>{t.vehicleTypeLabel} *</Text>
            <View style={styles.typesRow}>
              <TouchableOpacity
                style={[
                  styles.typeCard,
                  vehicleType === 'two_wheeler' && styles.typeCardActive,
                ]}
                onPress={() => setVehicleType('two_wheeler')}
                activeOpacity={0.8}
              >
                <View style={[styles.typeIconWrap, vehicleType === 'two_wheeler' && styles.typeIconWrapActive]}>
                  <Text style={styles.typeIcon}>🛵</Text>
                </View>
                <Text style={[styles.typeTitle, vehicleType === 'two_wheeler' && styles.typeTitleActive]}>
                  {t.twoWheeler}
                </Text>
                <Text style={styles.typeSub}>{t.twoWheelerSub}</Text>
                {vehicleType === 'two_wheeler' && (
                  <View style={styles.checkPill}>
                    <Text style={styles.checkPillText}>✓ Selected</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  vehicleType === 'four_wheeler' && styles.typeCardActive,
                ]}
                onPress={() => setVehicleType('four_wheeler')}
                activeOpacity={0.8}
              >
                <View style={[styles.typeIconWrap, vehicleType === 'four_wheeler' && styles.typeIconWrapActive]}>
                  <Text style={styles.typeIcon}>🚐</Text>
                </View>
                <Text style={[styles.typeTitle, vehicleType === 'four_wheeler' && styles.typeTitleActive]}>
                  {t.fourWheeler}
                </Text>
                <Text style={styles.typeSub}>{t.fourWheelerSub}</Text>
                {vehicleType === 'four_wheeler' && (
                  <View style={styles.checkPill}>
                    <Text style={styles.checkPillText}>✓ Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* 2. Vehicle Registration Number */}
            <Text style={styles.sectionLabel}>{t.plateLabel} *</Text>
            <View style={[styles.inputBox, plateFocused && styles.inputBoxFocused]}>
              <Text style={styles.inputPrefix}>🇮🇳 IND</Text>
              <TextInput
                style={styles.plateInput}
                placeholder={t.platePlaceholder}
                placeholderTextColor="#64748b"
                value={vehicleNumber}
                onChangeText={(val) => setVehicleNumber(val.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={15}
                onFocus={() => setPlateFocused(true)}
                onBlur={() => setPlateFocused(false)}
              />
            </View>
            <Text style={styles.inputHint}>{t.plateHint}</Text>

            {/* 3. Driver Contact Phone */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>{t.phoneLabel}</Text>
            <View style={[styles.inputBox, phoneFocused && styles.inputBoxFocused]}>
              <Text style={styles.iconPrefix}>📞</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t.phonePlaceholder}
                placeholderTextColor="#64748b"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCorrect={false}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
              />
            </View>

            {/* 4. Driver Full Name */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>{t.nameLabel}</Text>
            <View style={[styles.inputBox, nameFocused && styles.inputBoxFocused]}>
              <Text style={styles.iconPrefix}>👤</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Full Name"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
                autoCorrect={false}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            {/* Notice */}
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{t.dispatchNotice}</Text>
            </View>
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>✓ {t.saveBtn}</Text>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: '#0d111d',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#f87171',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#94a3b8',
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
    flexShrink: 1,
  },
  bodyContent: {
    padding: 20,
  },
  firstTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  firstTimeIcon: {
    fontSize: 18,
  },
  firstTimeText: {
    flex: 1,
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  typesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  typeCardActive: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeIconWrapActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  typeIcon: {
    fontSize: 24,
  },
  typeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    textAlign: 'center',
  },
  typeTitleActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  typeSub: {
    fontSize: 9.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  checkPill: {
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  checkPillText: {
    color: '#fca5a5',
    fontSize: 10,
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06080e',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputBoxFocused: {
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  inputPrefix: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    marginRight: 10,
    letterSpacing: 0.5,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  iconPrefix: {
    fontSize: 16,
    marginRight: 10,
  },
  plateInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 10,
  },
  inputHint: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 4,
    marginLeft: 4,
  },
  noticeBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
    borderRadius: 10,
    padding: 10,
    marginTop: 18,
  },
  noticeText: {
    fontSize: 11,
    color: '#93c5fd',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  saveBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
