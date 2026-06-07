import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { theme } from '../../theme';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Premium floating cards mock photos representing real moments
const FLOATING_MOMENTS = [
  { 
    id: '1', 
    sender: 'Sarah', 
    emoji: '❤️', 
    rotation: '-6deg', 
    left: 20, 
    top: 60,
    image: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=300&auto=format&fit=crop&q=80'
  },
  { 
    id: '2', 
    sender: 'Alex', 
    emoji: '🔥', 
    rotation: '8deg', 
    right: 20, 
    top: 40,
    image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300&auto=format&fit=crop&q=80'
  },
  { 
    id: '3', 
    sender: 'Emma', 
    emoji: '😂', 
    rotation: '-3deg', 
    left: '38%', 
    top: 150,
    image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=300&auto=format&fit=crop&q=80'
  }
];

export default function StartScreen() {
  const { user, isSessionLoaded, register, login, verify, isLoading, error, pendingInviteCode } = useApp();
  const [screenState, setScreenState] = useState<'SPLASH' | 'AUTH_DASHBOARD' | 'OTP' | 'SUCCESS'>('SPLASH');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Input states
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (pendingInviteCode) {
      setInviteCode(pendingInviteCode);
    }
  }, [pendingInviteCode]);
  
  // Internal state
  const [targetUserId, setTargetUserId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Reanimated values for floating moments drift effect
  const driftY = useSharedValue(0);

  // Start floating animation
  useEffect(() => {
    driftY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2500 }),
        withTiming(0, { duration: 2500 })
      ),
      -1,
      true
    );
  }, []);

  // Hook declarations defined unconditionally at top level to obey the Rules of Hooks
  const driftStyle0 = useAnimatedStyle(() => ({
    transform: [{ translateY: driftY.value }]
  }));
  const driftStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: driftY.value + 4 }]
  }));
  const driftStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: driftY.value + 8 }]
  }));

  const getDriftStyle = (index: number) => {
    if (index === 0) return driftStyle0;
    if (index === 1) return driftStyle1;
    return driftStyle2;
  };

  // Redirect or transition to Auth Dashboard when session loading completes
  useEffect(() => {
    if (isSessionLoaded) {
      if (user) {
        router.replace('/camera');
      } else {
        const timer = setTimeout(() => {
          setScreenState('AUTH_DASHBOARD');
        }, 1500); // 1.5 seconds on splash to look premium, then show login
        return () => clearTimeout(timer);
      }
    }
  }, [isSessionLoaded, user]);

  const handleAuthSubmit = async () => {
    setLocalError(null);
    const trimmedUsername = username.trim();
    if (authMode === 'REGISTER') {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const trimmedPhone = phone.trim();
      if (!trimmedUsername || !trimmedEmail || !trimmedName) {
        setLocalError('Please fill in username, name and email');
        return;
      }
      try {
        const newUser = await register(trimmedUsername, trimmedName, trimmedEmail, trimmedPhone, undefined, inviteCode);
        setTargetUserId(newUser.id);
        setScreenState('OTP');
      } catch (err: any) {
        setLocalError(err.message || 'Registration failed');
      }
    } else {
      if (!trimmedUsername) {
        setLocalError('Please enter your username, email or phone to login');
        return;
      }
      try {
        const { user: loggedInUser, otpCode } = await login(trimmedUsername);
        setTargetUserId(loggedInUser.id);
        console.log(`[Moments OTP] Mock Code is ${otpCode}`);
        setScreenState('OTP');
      } catch (err: any) {
        setLocalError(err.message || 'Login failed');
      }
    }
  };

  const handleVerifyOtp = async () => {
    setLocalError(null);
    if (!otp) {
      setLocalError('Please enter the verification code');
      return;
    }
    try {
      await verify(targetUserId, otp);
      setScreenState('SUCCESS');
    } catch (err: any) {
      setLocalError(err.message || 'Invalid code. Try "123456"');
    }
  };

  // 1. SPLASH SCREEN STATE
  if (screenState === 'SPLASH') {
    return (
      <View style={styles.splashContainer}>
        <Animated.View entering={FadeIn.duration(1000)} exiting={FadeOut.duration(800)} style={styles.splashContent}>
          <View style={styles.splashIconBg}>
            <Feather name="aperture" size={80} color={theme.colors.background} />
          </View>
          <Text style={styles.splashLogo}>MOMENTS</Text>
          <Text style={styles.splashTagline}>Share moments, not followers.</Text>
        </Animated.View>
      </View>
    );
  }

  // 2. STITCH SIGN IN & SIGN UP DASHBOARD
  if (screenState === 'AUTH_DASHBOARD') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            
            {/* STITCH HEADER */}
            <View style={styles.dashboardHeader}>
              <View style={styles.headerTitleRow}>
                <Feather name="aperture" size={24} color={theme.colors.primary} />
                <Text style={styles.headerLogo}>MOMENTS</Text>
              </View>
              <Text style={styles.headerTagline}>Share moments, not followers.</Text>
            </View>

            {/* FLOATING PHOTO CARDS ANIMATION */}
            <View style={styles.floatingContainer}>
              {FLOATING_MOMENTS.map((item, index) => (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.floatingCard,
                    {
                      transform: [{ rotate: item.rotation }],
                      left: item.left as any,
                      right: item.right as any,
                      top: item.top
                    },
                    getDriftStyle(index)
                  ]}
                  entering={FadeIn.duration(800).delay(index * 200)}
                >
                  <Image source={{ uri: item.image }} style={styles.floatingCardImg} />
                  <View style={styles.floatingCardFooter}>
                    <Text style={styles.floatingCardSender}>{item.sender}</Text>
                    <Text style={styles.floatingCardEmoji}>{item.emoji}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>

            {/* DUAL MODE AUTHENTICATION CONTAINER */}
            <View style={styles.authContainer}>
              {/* Tab Selector */}
              <View style={styles.authTabContainer}>
                <Pressable
                  style={[styles.authTab, authMode === 'LOGIN' && styles.authTabActive]}
                  onPress={() => { setAuthMode('LOGIN'); setLocalError(null); }}
                >
                  <Text style={[styles.authTabText, authMode === 'LOGIN' && styles.authTabTextActive]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.authTab, authMode === 'REGISTER' && styles.authTabActive]}
                  onPress={() => { setAuthMode('REGISTER'); setLocalError(null); }}
                >
                  <Text style={[styles.authTabText, authMode === 'REGISTER' && styles.authTabTextActive]}>
                    Sign Up
                  </Text>
                </Pressable>
              </View>

              {localError && (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={16} color={theme.colors.error} />
                  <Text style={styles.errorText}>{localError}</Text>
                </View>
              )}

              {/* Form Inputs */}
              <View style={styles.formFields}>
                {authMode === 'REGISTER' ? (
                  <>
                    <View style={styles.inputFieldWrapper}>
                      <Feather name="user" size={16} color={theme.colors.onSurfaceVariant} style={styles.inputFieldIcon} />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Choose Username"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        autoCapitalize="none"
                        value={username}
                        onChangeText={setUsername}
                      />
                    </View>

                    <View style={styles.inputFieldWrapper}>
                      <Feather name="edit-2" size={16} color={theme.colors.onSurfaceVariant} style={styles.inputFieldIcon} />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Full Name"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        value={name}
                        onChangeText={setName}
                      />
                    </View>

                    <View style={styles.inputFieldWrapper}>
                      <Feather name="mail" size={16} color={theme.colors.onSurfaceVariant} style={styles.inputFieldIcon} />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Email Address"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>

                    <View style={styles.inputFieldWrapper}>
                      <Feather name="phone" size={16} color={theme.colors.onSurfaceVariant} style={styles.inputFieldIcon} />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Phone Number (Optional)"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                      />
                    </View>

                    <View style={styles.inputFieldWrapper}>
                      <Feather name="gift" size={16} color={theme.colors.onSurfaceVariant} style={styles.inputFieldIcon} />
                      <TextInput
                        style={styles.formInput}
                        placeholder="Invite Code (Optional)"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        autoCapitalize="characters"
                        value={inviteCode}
                        onChangeText={setInviteCode}
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.inputFieldWrapper}>
                    <Feather name="user" size={16} color={theme.colors.onSurfaceVariant} style={styles.inputFieldIcon} />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Username, Email, or Phone"
                      placeholderTextColor={theme.colors.onSurfaceVariant}
                      autoCapitalize="none"
                      value={username}
                      onChangeText={setUsername}
                    />
                  </View>
                )}

                <Pressable style={styles.dashboardBtn} onPress={handleAuthSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.dashboardBtnText}>
                        {authMode === 'LOGIN' ? 'Verify Identity' : 'Create Account'}
                      </Text>
                      <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* SOCIAL BUTTONS */}
                <View style={styles.socialButtonsContainer}>
                  <Pressable style={styles.socialBtn} onPress={() => console.log('Google Login')}>
                    <Feather name="chrome" size={18} color={theme.colors.onSurface} />
                    <Text style={styles.socialBtnLabel}>Google</Text>
                  </Pressable>
                  <Pressable style={styles.socialBtn} onPress={() => console.log('OTP Login')}>
                    <Feather name="smartphone" size={18} color={theme.colors.onSurface} />
                    <Text style={styles.socialBtnLabel}>Phone OTP</Text>
                  </Pressable>
                </View>
              </View>

            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // 3. OTP VERIFICATION STATE
  if (screenState === 'OTP') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.authHeader}>
            <Text style={styles.authTitle}>Verify Code</Text>
            <Text style={styles.authSubtitle}>We sent a code to your device. Enter "123456" for instant demo verification.</Text>
          </View>

          <View style={styles.form}>
            {localError && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={styles.errorText}>{localError}</Text>
              </View>
            )}

            <View style={styles.inputFieldWrapper}>
              <Feather name="key" size={18} color={theme.colors.onSurfaceVariant} style={styles.inputFieldIcon} />
              <TextInput
                style={[styles.formInput, styles.otpText]}
                placeholder="000000"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
            </View>

            <Pressable style={[styles.dashboardBtn, { marginTop: theme.spacing.md }]} onPress={handleVerifyOtp} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.dashboardBtnText}>Verify OTP</Text>
              )}
            </Pressable>

            <Pressable style={styles.backButton} onPress={() => setScreenState('AUTH_DASHBOARD')}>
              <Text style={styles.backButtonText}>Back to sign in</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // 4. SUCCESS STATE
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.successContent}>
        <View style={styles.successIconBg}>
          <Feather name="check-circle" size={64} color={theme.colors.primary} />
        </View>
        
        <Text style={styles.successTitle}>Successfully Connected!</Text>
        <Text style={styles.successDesc}>
          To receive shared moments from friends directly, install the Moments widget on your device:
        </Text>

        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsItem}>1. Long press empty space on your home screen.</Text>
          <Text style={styles.instructionsItem}>2. Tap the '+' icon in the top corner.</Text>
          <Text style={styles.instructionsItem}>3. Search for 'Moments' and choose widget size.</Text>
        </View>
      </View>

      <View style={styles.successFooter}>
        <Pressable style={styles.dashboardBtn} onPress={() => router.replace('/camera')}>
          <Text style={styles.dashboardBtnText}>Open Moments Camera</Text>
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
  scrollContainer: {
    paddingBottom: theme.spacing.xl,
  },
  // Splash styles
  splashContainer: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  splashIconBg: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  splashLogo: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 48,
    color: '#fff',
    letterSpacing: 2,
    marginBottom: theme.spacing.xs,
  },
  splashTagline: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  // Stitch Dashboard Header styles
  dashboardHeader: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  headerLogo: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  headerTagline: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: '500',
  },
  // Floating cards animation wrapper
  floatingContainer: {
    height: 250,
    position: 'relative',
    marginVertical: theme.spacing.md,
  },
  floatingCard: {
    position: 'absolute',
    width: 110,
    height: 135,
    backgroundColor: '#fff',
    borderRadius: theme.rounding.md,
    padding: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  floatingCardImg: {
    width: '100%',
    height: 94,
    borderRadius: 6,
  },
  floatingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  floatingCardSender: {
    ...theme.typography.labelCaps,
    fontSize: 9,
    color: theme.colors.onSurface,
  },
  floatingCardEmoji: {
    fontSize: 12,
  },
  // Auth container
  authContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.rounding.xl,
    padding: theme.spacing.lg,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  authTabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceVariant,
    padding: 3,
    borderRadius: theme.rounding.lg,
    marginBottom: theme.spacing.lg,
  },
  authTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.rounding.md,
  },
  authTabActive: {
    backgroundColor: theme.colors.primary,
  },
  authTabText: {
    ...theme.typography.bodyMd,
    fontWeight: 'bold',
    color: theme.colors.onSurfaceVariant,
  },
  authTabTextActive: {
    color: '#fff',
  },
  formFields: {
    gap: theme.spacing.md,
  },
  inputFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.rounding.lg,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    gap: theme.spacing.sm,
  },
  inputFieldIcon: {
    marginRight: 2,
  },
  formInput: {
    flex: 1,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
  },
  otpText: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 6,
  },
  dashboardBtn: {
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.rounding.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardBtnText: {
    ...theme.typography.bodyLg,
    color: '#fff',
    fontWeight: 'bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.surfaceVariant,
  },
  dividerText: {
    ...theme.typography.labelCaps,
    fontSize: 9,
    color: theme.colors.outline,
    marginHorizontal: theme.spacing.sm,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.rounding.lg,
    gap: theme.spacing.sm,
  },
  socialBtnLabel: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  // General auth header
  authHeader: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl * 1.5,
    paddingBottom: theme.spacing.lg,
  },
  authTitle: {
    ...theme.typography.displayLg,
    color: theme.colors.onSurface,
  },
  authSubtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.xs,
  },
  form: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    padding: theme.spacing.md,
    borderRadius: theme.rounding.lg,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.bodyMd,
    color: theme.colors.error,
    flex: 1,
  },
  backButton: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  backButtonText: {
    ...theme.typography.bodyLg,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // Success styles
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  successIconBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  successTitle: {
    ...theme.typography.headlineMd,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  successDesc: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  instructionsBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.rounding.lg,
    width: '100%',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  instructionsItem: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
  successFooter: {
    padding: theme.spacing.lg,
  },
});
