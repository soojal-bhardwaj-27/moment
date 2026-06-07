import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Image, TextInput, ActivityIndicator, ScrollView, Platform, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from '../components/NativeCamera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import Animated, { FadeIn, SlideInDown, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// A selection of high-quality sample photos for web/simulator testing so the feed always looks premium
const CuratedPhotos = [
  'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=600&auto=format&fit=crop&q=80', // Friends laughing
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80', // Concert/Party
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&auto=format&fit=crop&q=80', // Friends eating
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&auto=format&fit=crop&q=80', // Pancakes/Food
  'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&auto=format&fit=crop&q=80', // Sunset/Nature
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop&q=80'  // Coffee/Study
];

export default function CameraScreen() {
  const { user, circles, uploadMoment, isLoading, friends, notifications, markNotificationsAsRead } = useApp();
  const acceptedFriends = friends?.filter(f => f.status === 'ACCEPTED') || [];
  const hasNoFriends = acceptedFriends.length === 0;
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const cameraRef = useRef<any>(null);

  // Sharing flows state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Auto-select first circle when circles load or photo is captured
  useEffect(() => {
    if (circles.length > 0 && !selectedCircleId) {
      setSelectedCircleId(circles[0].id);
    }
  }, [circles, capturedPhoto]);

  if (!permission) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Feather name="camera-off" size={64} color={theme.colors.outline} style={{ marginBottom: theme.spacing.lg }} />
        <Text style={styles.permissionText}>Moments requires camera permissions to share your daily life.</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  function toggleFlash() {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  }

  async function takePicture() {
    try {
      if (Platform.OS === 'web') {
        // Fallback for web testing: use a curated photo
        const randomPhoto = CuratedPhotos[Math.floor(Math.random() * CuratedPhotos.length)];
        setCapturedPhoto(randomPhoto);
        setCapturedBase64(null);
        return;
      }

      if (cameraRef.current) {
        const options = { quality: 0.8, base64: true, skipProcessing: false };
        const photo = await cameraRef.current.takePictureAsync(options);
        console.log('Photo captured locally:', photo.uri);
        setCapturedPhoto(photo.uri);
        setCapturedBase64(photo.base64 || null);
      }
    } catch (err: any) {
      console.error('Failed to take picture:', err);
      // Fallback in case device camera fails/is blocked
      const randomPhoto = CuratedPhotos[Math.floor(Math.random() * CuratedPhotos.length)];
      setCapturedPhoto(randomPhoto);
      setCapturedBase64(null);
    }
  }

  async function handleSend() {
    if (!capturedPhoto || !selectedCircleId) {
      setErrorText('Please select a circle to share to');
      return;
    }
    setIsSending(true);
    setErrorText(null);
    try {
      await uploadMoment(capturedPhoto, selectedCircleId, caption, capturedBase64);
      // Reset state and show camera again
      setCapturedPhoto(null);
      setCapturedBase64(null);
      setCaption('');
      // Navigate to feed so they can see their new moment
      router.push('/feed');
    } catch (err: any) {
      setErrorText(err.message || 'Failed to send moment');
    } finally {
      setIsSending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // PHOTO PREVIEW & SHARING UI
  // ---------------------------------------------------------------------------
  if (capturedPhoto) {
    const selectedCircle = circles.find(c => c.id === selectedCircleId);
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Preview Header */}
        <View style={styles.navBar}>
          <Pressable onPress={() => { setCapturedPhoto(null); setErrorText(null); }} style={styles.iconButton}>
            <Feather name="arrow-left" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>New Moment</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Square Image Preview */}
        <View style={styles.cameraContainer}>
          <Image source={{ uri: capturedPhoto }} style={styles.camera} resizeMode="cover" />
        </View>

        {/* Input & Circle Selection Scroll */}
        <ScrollView style={styles.previewScroll} keyboardShouldPersistTaps="handled">
          {errorText && (
            <Text style={styles.previewError}>{errorText}</Text>
          )}

          <TextInput
            style={styles.captionInput}
            placeholder="Write an optional caption..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={caption}
            onChangeText={setCaption}
            maxLength={100}
          />

          <Text style={styles.sectionLabel}>Select Private Circle</Text>
          {circles.length === 0 ? (
            <View style={styles.noCirclesContainer}>
              <Text style={styles.noCirclesText}>You are not in any circles yet.</Text>
              <Pressable style={styles.createCircleBtn} onPress={() => router.push('/friends')}>
                <Text style={styles.createCircleBtnText}>Create a Circle</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circlesRow}>
              {circles.map(circle => {
                const isSelected = circle.id === selectedCircleId;
                return (
                  <Pressable
                    key={circle.id}
                    onPress={() => setSelectedCircleId(circle.id)}
                    style={[
                      styles.circleBadge,
                      isSelected && styles.circleBadgeSelected
                    ]}
                  >
                    <Feather name="users" size={16} color={isSelected ? '#fff' : theme.colors.primary} />
                    <Text style={[styles.circleBadgeText, isSelected && styles.circleBadgeTextSelected]}>
                      {circle.circleName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </ScrollView>

        {/* Action Button */}
        <View style={styles.previewFooter}>
          <Pressable 
            style={[styles.shareBtn, (!selectedCircleId || isSending) && styles.shareBtnDisabled]} 
            onPress={handleSend}
            disabled={!selectedCircleId || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.shareBtnText}>
                  {selectedCircle ? `Share to ${selectedCircle.circleName}` : 'Share Moment'}
                </Text>
                <Feather name="send" size={18} color="#fff" style={{ marginLeft: theme.spacing.sm }} />
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const inviteAcceptedNotification = notifications.find(n => n.type === 'INVITE_ACCEPTED');

  const handleCreateCircleFromNotification = async (notificationId: string) => {
    await markNotificationsAsRead(notificationId);
    router.push('/friends');
  };

  // ---------------------------------------------------------------------------
  // CAMERA VIEW UI
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {inviteAcceptedNotification && (
        <Animated.View 
          entering={FadeIn.duration(400)} 
          style={styles.notificationBanner}
        >
          <View style={styles.notificationIconBg}>
            <Feather name="bell" size={18} color="#fff" />
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>{inviteAcceptedNotification.title}</Text>
            <Text style={styles.notificationBody}>{inviteAcceptedNotification.body}</Text>
            <View style={styles.notificationActions}>
              <Pressable 
                style={styles.notificationActionBtn} 
                onPress={() => handleCreateCircleFromNotification(inviteAcceptedNotification.id)}
              >
                <Text style={styles.notificationActionText}>Create Circle</Text>
              </Pressable>
              <Pressable 
                style={styles.notificationDismissBtn} 
                onPress={() => markNotificationsAsRead(inviteAcceptedNotification.id)}
              >
                <Text style={styles.notificationDismissText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.push('/friends')} style={styles.iconButton}>
          <Feather name="users" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerLogo}>MOMENTS</Text>
        <Pressable onPress={() => router.push('/settings')} style={styles.iconButton}>
          <Feather name="settings" size={22} color={theme.colors.onSurface} />
        </Pressable>
      </View>

      {/* Camera Viewfinder (Locket Style - Square) */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={facing} flash={flash} ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            {/* Quick action overlay buttons: Flash control */}
            <Pressable onPress={toggleFlash} style={styles.overlayFlashBtn}>
              <Feather name={flash === 'on' ? 'zap' : 'zap-off'} size={20} color="#fff" />
            </Pressable>
          </View>

          {hasNoFriends && (
            <View style={styles.emptyStateOverlay}>
              <View style={styles.emptyStateGlass}>
                <Feather name="users" size={32} color="#fff" style={{ marginBottom: theme.spacing.sm }} />
                <Text style={styles.emptyStateOverlayTitle}>Add Friends to See Moments</Text>
                <Text style={styles.emptyStateOverlayText}>
                  Your widget is empty. Connect with friends to see their photos directly on your Home Screen.
                </Text>
                <Pressable 
                  style={styles.emptyStateOverlayBtn} 
                  onPress={() => router.push('/friends')}
                >
                  <Feather name="gift" size={16} color={theme.colors.primary} />
                  <Text style={styles.emptyStateOverlayBtnText}>Invite Friends</Text>
                </Pressable>
              </View>
            </View>
          )}
        </CameraView>
      </View>

      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>Tap to take a photo. It instantly appears on widgets.</Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        <Pressable onPress={() => router.push('/feed')} style={styles.secondaryButton}>
          <Feather name="clock" size={28} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.controlLabel}>Feed</Text>
        </Pressable>
        
        <Pressable style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </Pressable>
        
        <Pressable onPress={toggleCameraFacing} style={styles.secondaryButton}>
          <Feather name="refresh-cw" size={28} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.controlLabel}>Flip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  iconButton: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.rounding.pill,
  },
  headerTitle: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
  },
  headerLogo: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  cameraContainer: {
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.rounding.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: '#000',
    aspectRatio: 1, // Locket style square camera
    maxHeight: '52%',
    alignSelf: 'center',
    width: width - theme.spacing.md * 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: theme.spacing.md,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  overlayFlashBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  hintText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.sm,
  },
  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  controlLabel: {
    ...theme.typography.labelCaps,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  permissionText: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.rounding.lg,
  },
  permissionButtonText: {
    ...theme.typography.bodyLg,
    color: theme.colors.background,
    fontWeight: 'bold',
  },
  // Preview / Send Flow styles
  previewScroll: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  previewError: {
    color: theme.colors.error,
    ...theme.typography.bodyMd,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  captionInput: {
    backgroundColor: theme.colors.surfaceVariant,
    color: theme.colors.onSurface,
    height: 48,
    borderRadius: theme.rounding.lg,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.bodyLg,
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
  },
  circlesRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  circleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.rounding.pill,
    gap: theme.spacing.xs,
  },
  circleBadgeSelected: {
    backgroundColor: theme.colors.primary,
  },
  circleBadgeText: {
    ...theme.typography.bodyMd,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  circleBadgeTextSelected: {
    color: '#fff',
  },
  noCirclesContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.rounding.lg,
  },
  noCirclesText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
  },
  createCircleBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.rounding.pill,
  },
  createCircleBtnText: {
    ...theme.typography.bodyMd,
    color: '#fff',
    fontWeight: 'bold',
  },
  previewFooter: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  shareBtn: {
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.rounding.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnDisabled: {
    opacity: 0.6,
  },
  shareBtnText: {
    ...theme.typography.bodyLg,
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyStateOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyStateGlass: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.rounding.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    width: '100%',
  },
  emptyStateOverlayTitle: {
    ...theme.typography.bodyLg,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  emptyStateOverlayText: {
    ...theme.typography.bodyMd,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  emptyStateOverlayBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    borderRadius: theme.rounding.pill,
  },
  emptyStateOverlayBtnText: {
    ...theme.typography.bodyMd,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  notificationBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 50,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(18, 18, 22, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: theme.rounding.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  notificationIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...theme.typography.bodyLg,
    fontWeight: 'bold',
    color: '#fff',
  },
  notificationBody: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 18,
  },
  notificationActions: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  notificationActionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.rounding.md,
  },
  notificationActionText: {
    ...theme.typography.labelCaps,
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  notificationDismissBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  notificationDismissText: {
    ...theme.typography.labelCaps,
    fontSize: 10,
    color: theme.colors.outline,
  },
});
