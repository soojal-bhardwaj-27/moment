import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Switch, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';

export default function SettingsScreen() {
  const { user, friends, circles, feed, logout } = useApp();

  // Settings switches states
  const [notifications, setNotifications] = useState(true);
  const [saveToGallery, setSaveToGallery] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  const acceptedFriends = friends.filter(f => f.status === 'ACCEPTED');
  
  // Count moments sent by current user
  const momentsSentCount = feed.filter(m => m.senderId === user?.id).length;

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Moments?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleUpgradePremium = () => {
    Alert.alert(
      'Upgrade to Moments Premium',
      'Get unlimited circles members (up to 30), custom widget themes, HD uploads, and exclusive custom emoji reactions for only ₹149/month.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Subscribe for ₹149', 
          onPress: () => {
            // Mock subscription upgrade
            Alert.alert('Thank You!', 'You are now a Moments Premium member!');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.name || 'Moments User'}</Text>
          <Text style={styles.profileUsername}>@{user?.username || 'username'}</Text>
          
          {user?.email && <Text style={styles.profileContact}>{user.email}</Text>}
          {user?.phone && <Text style={styles.profileContact}>{user.phone}</Text>}
          
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{user?.plan || 'FREE'} PLAN</Text>
          </View>
        </View>

        {/* Premium Upgrade Banner */}
        <Pressable style={styles.premiumBanner} onPress={handleUpgradePremium}>
          <View style={styles.premiumTextContainer}>
            <Text style={styles.premiumTitle}>✨ Upgrade to Premium</Text>
            <Text style={styles.premiumDesc}>Unlock 30 members/circle, HD photos, custom widget themes & reactions for ₹149/mo.</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#fff" />
        </Pressable>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{acceptedFriends.length}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{circles.length}</Text>
            <Text style={styles.statLabel}>Circles</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{momentsSentCount}</Text>
            <Text style={styles.statLabel}>Moments</Text>
          </View>
        </View>

        {/* Settings Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Feather name="bell" size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceVariant }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Feather name="download" size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Save photos to Gallery</Text>
            </View>
            <Switch
              value={saveToGallery}
              onValueChange={setSaveToGallery}
              trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceVariant }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Feather name="moon" size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceVariant }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRIVACY & ACCOUNT</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Feather name="lock" size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Private Account</Text>
            </View>
            <Switch
              value={isPrivateAccount}
              onValueChange={setIsPrivateAccount}
              trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceVariant }}
            />
          </View>

          <Pressable style={styles.clickableRow} onPress={() => Alert.alert('Widget Settings', 'Configure widget sizes and refresh frequency.')}>
            <View style={styles.settingLabelContainer}>
              <Feather name="grid" size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Widget Settings</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.outline} />
          </Pressable>
        </View>

        {/* Logout button */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={theme.colors.error} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  iconButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.rounding.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    marginBottom: theme.spacing.md,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
  },
  profileName: {
    ...theme.typography.headlineMd,
    color: theme.colors.onSurface,
  },
  profileUsername: {
    ...theme.typography.bodyLg,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  profileContact: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  planBadge: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    borderRadius: theme.rounding.pill,
  },
  planBadgeText: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
    fontSize: 9,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.rounding.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  premiumTextContainer: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  premiumTitle: {
    ...theme.typography.bodyLg,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumDesc: {
    ...theme.typography.bodyMd,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    borderRadius: theme.rounding.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    ...theme.typography.headlineMd,
    color: theme.colors.onSurface,
  },
  statLabel: {
    ...theme.typography.labelCaps,
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.labelCaps,
    color: theme.colors.outline,
    marginBottom: theme.spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  clickableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  settingLabel: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.rounding.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  logoutBtnText: {
    ...theme.typography.bodyLg,
    color: theme.colors.error,
    fontWeight: 'bold',
  },
});
