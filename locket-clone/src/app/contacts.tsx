import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import * as Contacts from 'expo-contacts';

interface MockContact {
  id: string;
  name: string;
  phone: string;
  isOnMoments: boolean;
  username?: string;
  status?: 'ADD' | 'ADDED' | 'INVITE' | 'INVITED';
}

const INITIAL_CONTACTS: MockContact[] = [
  { id: '1', name: 'Chris Evans', phone: '+1 (555) 019-2834', isOnMoments: true, username: 'chrisevans', status: 'ADD' },
  { id: '2', name: 'Jessica Alba', phone: '+1 (555) 012-9843', isOnMoments: true, username: 'jessalba', status: 'ADD' },
  { id: '3', name: 'Robert Downey Jr.', phone: '+1 (555) 014-4932', isOnMoments: true, username: 'rdj', status: 'ADDED' },
  { id: '4', name: 'Uncle Bob', phone: '+1 (555) 016-8345', isOnMoments: false, status: 'INVITE' },
  { id: '5', name: 'Emma Watson', phone: '+1 (555) 018-2943', isOnMoments: false, status: 'INVITE' },
  { id: '6', name: 'Mom', phone: '+1 (555) 011-2321', isOnMoments: false, status: 'INVITE' },
  { id: '7', name: 'Dave Logan', phone: '+1 (555) 013-5432', isOnMoments: false, status: 'INVITE' },
];

export default function ContactsScreen() {
  const { createInvite, sendFriendRequest } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [contacts, setContacts] = useState<MockContact[]>(INITIAL_CONTACTS);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });

        if (data && data.length > 0) {
          const mapped: MockContact[] = data.map((contact, index) => {
            const phoneStr = contact.phoneNumbers && contact.phoneNumbers[0]
              ? contact.phoneNumbers[0].number || ''
              : '';
            
            // Randomly simulate whether the contact is already registered on Moments
            const isOnMoments = index % 3 === 0 && phoneStr !== '';
            const normalizedName = contact.name || 'Unnamed Contact';
            
            return {
              id: contact.id || String(index),
              name: normalizedName,
              phone: phoneStr || 'No phone number',
              isOnMoments,
              username: isOnMoments ? normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '') : undefined,
              status: isOnMoments ? 'ADD' : 'INVITE'
            };
          });
          setContacts(mapped);
        } else {
          // If device contacts list is empty (common in emulators), fall back to initial mocks
          console.log('[Contacts] No contacts found on device. Loading mock contacts list.');
          setContacts(INITIAL_CONTACTS);
        }
      } else {
        Alert.alert(
          'Permission Denied',
          'Moments needs access to your contacts to show who is on the app. Falling back to demo mode.',
          [{ text: 'OK' }]
        );
        setContacts(INITIAL_CONTACTS);
      }
    } catch (err) {
      console.error('[Contacts] Error accessing device contacts:', err);
      setContacts(INITIAL_CONTACTS);
    } finally {
      setIsSyncing(false);
      setHasSynced(true);
    }
  };

  const handleAddContact = async (contact: MockContact) => {
    if (!contact.username) return;
    setActionLoadingId(contact.id);
    try {
      await sendFriendRequest(contact.username);
      setContacts(prev =>
        prev.map(c => (c.id === contact.id ? { ...c, status: 'ADDED' } : c))
      );
      Alert.alert('Success', `Friend request sent to @${contact.username}!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInviteContact = async (contact: MockContact) => {
    setActionLoadingId(contact.id);
    try {
      const invite = await createInvite('sms');
      const message = `📸 Join me on Moments!\n\nSee my photos directly on your home screen widget and share your daily moments privately.\n\nDownload here:\n${invite.inviteLink}`;
      
      await Share.share({
        message,
        title: 'Moments Invite',
      });

      setContacts(prev =>
        prev.map(c => (c.id === contact.id ? { ...c, status: 'INVITED' } : c))
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate invite');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Sync Contacts</Text>
        <View style={{ width: 44 }} />
      </View>

      {!hasSynced ? (
        // Sync State Prompter
        <View style={styles.syncPromptContainer}>
          <View style={styles.syncIconContainer}>
            <Feather name="users" size={60} color={theme.colors.primary} />
          </View>
          <Text style={styles.syncTitle}>Find Your Friends</Text>
          <Text style={styles.syncDescription}>
            Sync your contact list to see who is already sharing moments on the app and send invitations to those who aren't.
          </Text>

          <Pressable 
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]} 
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="refresh-cw" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.syncButtonText}>Sync Contact List</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.privacyNote}>We never store your contacts on our servers.</Text>
        </View>
      ) : (
        // Contacts List View
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.listContainer}>
          {contacts.filter(c => c.isOnMoments).length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Friends on Moments</Text>
              {contacts.filter(c => c.isOnMoments).map(contact => (
                <View key={contact.id} style={styles.contactRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactDetail}>@{contact.username}</Text>
                  </View>
                  {contact.status === 'ADDED' ? (
                    <View style={styles.addedBadge}>
                      <Feather name="check" size={12} color={theme.colors.primary} />
                      <Text style={styles.addedText}>Sent</Text>
                    </View>
                  ) : (
                    <Pressable 
                      style={styles.actionButton} 
                      onPress={() => handleAddContact(contact)}
                      disabled={actionLoadingId === contact.id}
                    >
                      {actionLoadingId === contact.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.actionButtonText}>Add</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              ))}
            </>
          )}

          <Text style={[styles.sectionLabel, { marginTop: theme.spacing.xl }]}>Invite to Moments</Text>
          {contacts.filter(c => !c.isOnMoments).map(contact => (
            <View key={contact.id} style={styles.contactRow}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.avatarText, { color: theme.colors.outline }]}>{contact.name.charAt(0)}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactDetail}>{contact.phone}</Text>
              </View>
              <Pressable 
                style={[
                  styles.actionButton, 
                  { backgroundColor: contact.status === 'INVITED' ? theme.colors.surfaceVariant : theme.colors.primary }
                ]} 
                onPress={() => handleInviteContact(contact)}
                disabled={actionLoadingId === contact.id}
              >
                {actionLoadingId === contact.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[
                    styles.actionButtonText, 
                    contact.status === 'INVITED' && { color: theme.colors.onSurfaceVariant }
                  ]}>
                    {contact.status === 'INVITED' ? 'Invited' : 'Invite'}
                  </Text>
                )}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
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
  syncPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  syncIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  syncTitle: {
    ...theme.typography.headlineMd,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  syncDescription: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  syncButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 14,
    borderRadius: theme.rounding.lg,
    width: '100%',
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    ...theme.typography.bodyLg,
    color: '#fff',
    fontWeight: 'bold',
  },
  privacyNote: {
    ...theme.typography.bodyMd,
    color: theme.colors.outline,
    marginTop: theme.spacing.md,
    fontSize: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  listContainer: {
    padding: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  contactInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  contactName: {
    ...theme.typography.bodyLg,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  contactDetail: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.rounding.pill,
    minWidth: 72,
    alignItems: 'center',
  },
  actionButtonText: {
    ...theme.typography.bodyMd,
    color: '#fff',
    fontWeight: 'bold',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.rounding.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addedText: {
    ...theme.typography.bodyMd,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
