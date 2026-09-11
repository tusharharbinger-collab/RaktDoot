import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView, Image, Platform
} from 'react-native';
import { ISSUE_TYPES, SEVERITIES } from '../config/constants';

const MODAL_TEXTS = {
  en: {
    title: 'Report Breakdown / Issue',
    gpsPrefix: 'Attached GPS:',
    waitingGps: 'Waiting for GPS...',
    category: 'Select Incident Category',
    severity: 'Severity Level',
    cameraSection: 'Incident Photo (Live Camera / Evidence)',
    openCamera: 'Open Camera',
    browseGallery: 'Browse Files',
    photoAttached: 'Photo Attached & Ready to Upload',
    removePhoto: 'Remove',
    details: 'Incident Details & Instructions',
    placeholder: 'e.g. Engine overheated near Kalanagar Flyover, vehicle cannot move...',
    requiredAlert: 'Please enter a brief description of the incident.',
    submitBtn: 'Transmit Live Alert to Dispatch',
  },
  mr: {
    title: 'बिघाड / आणीबाणी नोंदवा',
    gpsPrefix: 'संलग्न GPS:',
    waitingGps: 'GPS शोधत आहे...',
    category: 'तक्रार प्रकार निवडा',
    severity: 'गंभीरता पातळी',
    cameraSection: 'घटनेचा फोटो (थेट कॅमेरा / पुरावा)',
    openCamera: 'कॅमेरा सुरू करा',
    browseGallery: 'फोटो निवडा',
    photoAttached: 'फोटो जोडला गेला आहे',
    removePhoto: 'हटवा',
    details: 'तपशील आणि सूचना',
    placeholder: 'उदा. कलानगर पुलाजवळ इंजिन बंद पडले, गाडी पुढे जाऊ शकत नाही...',
    requiredAlert: 'कृपया घटनेचे संक्षिप्त वर्णन प्रविष्ट करा.',
    submitBtn: 'नियंत्रण कक्षास थेट अलर्ट पाठवा',
  }
};

export default function ReportIssueModal({
  visible,
  onClose,
  onSubmit,
  currentLocation,
  lang = 'en',
}) {
  const t = MODAL_TEXTS[lang] || MODAL_TEXTS.en;
  const [selectedType, setSelectedType] = useState(ISSUE_TYPES[0].id);
  const [selectedSeverity, setSelectedSeverity] = useState('high');
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePickImage = (fromCamera = false) => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (fromCamera) {
        input.capture = 'environment';
      }
      input.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (file) {
          if (file.size > 8 * 1024 * 1024) {
            Alert.alert('File size limit', 'Image must be under 8MB.');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            setImageBase64(reader.result);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert('Camera Access', 'Photo capture is available in browser / web view.');
    }
  };

  const handleClose = () => {
    setImageBase64(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert(t.category, t.requiredAlert);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        type: selectedType,
        severity: selectedSeverity,
        description: description.trim(),
        lat: currentLocation?.lat || 0,
        lng: currentLocation?.lng || 0,
        address: currentLocation?.address || '',
        image_base64: imageBase64 || null,
      });
      setDescription('');
      setImageBase64(null);
      onClose();
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
              <Text style={styles.title}>{t.title}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* GPS Location Tag */}
            <View style={styles.locationTag}>
              <Text style={styles.locationText}>
                {t.gpsPrefix} {currentLocation ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : t.waitingGps}
              </Text>
              {currentLocation?.address ? (
                <Text style={styles.addressSubtext} numberOfLines={1}>
                  {currentLocation.address}
                </Text>
              ) : null}
            </View>

            {/* Issue Category */}
            <Text style={styles.sectionLabel}>{t.category}</Text>
            <View style={styles.typesGrid}>
              {ISSUE_TYPES.map(type => {
                const isSelected = selectedType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeBtn, isSelected && styles.typeBtnActive]}
                    onPress={() => setSelectedType(type.id)}
                  >
                    <View style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: isSelected ? '#ef4444' : '#64748b',
                      marginBottom: 6
                    }} />
                    <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]} numberOfLines={1}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Severity Level */}
            <Text style={styles.sectionLabel}>{t.severity}</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map(sev => {
                const isSelected = selectedSeverity === sev.id;
                return (
                  <TouchableOpacity
                    key={sev.id}
                    style={[
                      styles.sevBtn,
                      isSelected && { borderColor: sev.color, backgroundColor: `${sev.color}22` },
                    ]}
                    onPress={() => setSelectedSeverity(sev.id)}
                  >
                    <View style={[styles.sevDot, { backgroundColor: sev.color }]} />
                    <Text style={[styles.sevLabel, isSelected && { color: sev.color, fontWeight: '700' }]}>
                      {sev.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Camera / Photo Capture Section */}
            <Text style={styles.sectionLabel}>{t.cameraSection}</Text>
            {imageBase64 ? (
              <View style={styles.previewCard}>
                <Image source={{ uri: imageBase64 }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.previewOverlay}>
                  <Text style={styles.previewStatus}>{t.photoAttached}</Text>
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setImageBase64(null)}>
                    <Text style={styles.removePhotoText}>{t.removePhoto}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={[styles.cameraActionBtn, styles.cameraActionBtnPrimary]}
                  onPress={() => handlePickImage(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cameraIconCircle}>
                    <View style={styles.cameraIconInner} />
                  </View>
                  <Text style={styles.cameraActionBtnPrimaryText}>{t.openCamera}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cameraActionBtn}
                  onPress={() => handlePickImage(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cameraActionBtnSecondaryText}>{t.browseGallery}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Description Input */}
            <Text style={styles.sectionLabel}>{t.details}</Text>
            <TextInput
              style={styles.textArea}
              placeholder={t.placeholder}
              placeholderTextColor="#64748b"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              autoComplete="off"
              importantForAutofill="no"
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>{t.submitBtn}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#161822',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    maxHeight: 520,
  },
  locationTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 14,
  },
  locationText: {
    color: '#34d399',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  addressSubtext: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 8,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  typeBtn: {
    width: '48%',
    backgroundColor: '#0f111a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
  typeLabelActive: {
    color: '#fca5a5',
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  sevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f111a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
  },
  sevDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sevLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  cameraActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f111a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  cameraActionBtnPrimary: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  cameraIconCircle: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#60a5fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#60a5fa',
  },
  cameraActionBtnPrimaryText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraActionBtnSecondaryText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  previewCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    marginBottom: 14,
    backgroundColor: '#0a0c14',
  },
  previewImage: {
    width: '100%',
    height: 130,
  },
  previewOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewStatus: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '600',
  },
  removePhotoBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removePhotoText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: '#0f111a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: 12,
    color: '#f8fafc',
    fontSize: 13,
    minHeight: 65,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  submitBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});

