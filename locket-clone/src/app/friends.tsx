import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, FlatList, Pressable, ActivityIndicator, ScrollView, Modal, Alert, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';

export default function FriendsAndCirclesScreen() {
  const { user, friends, circles, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, deleteFriend, createCircle, deleteCircle, addCircleMember, isLoading, createInvite } = useApp();
  const [inviteCodeText, setInviteCodeText] = useState<string | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'FRIENDS' | 'CIRCLES'>('FRIENDS');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    const fetchInviteCode = async () => {
      try {
        const invite = await createInvite('copy');
        setInviteCodeText(invite.inviteCode);
      } catch (err) {
        console.error('Failed to pre-fetch invite code:', err);
      }
    };
    fetchInviteCode();
  }, []);

  const handleCopyCode = () => {
    if (inviteCodeText) {
      Clipboard.setString(inviteCodeText);
      Alert.alert('Copied!', 'Invite code copied to clipboard. Share it with your friends!');
    }
  };

  // Input states
  const [friendSearch, setFriendSearch] = useState('');
  const [circleNameInput, setCircleNameInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Circle Member Modal State
  const [selectedCircleForAdd, setSelectedCircleForAdd] = useState<any | null>(null);

  // Filter requests vs accepted friends
  const pendingRequests = friends.filter(f => f.status === 'PENDING');
  const acceptedFriends = friends.filter(f => f.status === 'ACCEPTED');

  const handleAddFriend = async () => {
    const trimmedSearch = friendSearch.trim();
    if (!trimmedSearch) return;
    setFeedbackMsg(null);
    try {
      await sendFriendRequest(trimmedSearch);
      setFeedbackMsg({ text: `Friend request sent to @${trimmedSearch}!`, isError: false });
      setFriendSearch('');
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to send request', isError: true });
    }
  };

  const handleShareInvite = async (platform: string) => {
    setInviteLoading(true);
    try {
      const invite = await createInvite(platform);
      const message = `📸 Join me on Moments!\n\nSee my photos directly on your home screen widget and share your daily moments privately.\n\nDownload here:\n${invite.inviteLink}`;
      
      const { Share } = require('react-native');
      await Share.share({
        message,
        title: 'Moments Invite'
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate invitation link');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    setFeedbackMsg(null);
    try {
      await acceptFriendRequest(friendshipId);
      setFeedbackMsg({ text: 'Friend request accepted!', isError: false });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to accept', isError: true });
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    setFeedbackMsg(null);
    try {
      await rejectFriendRequest(friendshipId);
      setFeedbackMsg({ text: 'Friend request rejected.', isError: false });
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to reject friend request', isError: true });
    }
  };

  const handleDeleteCircle = (circleId: string, circleName: string) => {
    Alert.alert(
      'Delete Circle',
      `Are you sure you want to delete the circle "${circleName}"? All shared photos in this circle will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCircle(circleId);
              setFeedbackMsg({ text: `Circle "${circleName}" deleted successfully!`, isError: false });
            } catch (err: any) {
              setFeedbackMsg({ text: err.message || 'Failed to delete circle', isError: true });
            }
          }
        }
      ]
    );
  };

  const handleDeleteFriend = (friendId: string, username: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove @${username} as a friend? You will also be removed from each other's circles.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFriend(friendId);
              setFeedbackMsg({ text: `Removed @${username} from your friends list.`, isError: false });
            } catch (err: any) {
              setFeedbackMsg({ text: err.message || 'Failed to remove friend', isError: true });
            }
          }
        }
      ]
    );
  };

  const handleCreateCircle = async () => {
    if (!circleNameInput) return;
    setFeedbackMsg(null);
    try {
      await createCircle(circleNameInput);
      setFeedbackMsg({ text: `Circle "${circleNameInput}" created successfully!`, isError: false });
      setCircleNameInput('');
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to create circle', isError: true });
    }
  };

  const handleAddMember = async (friendId: string) => {
    if (!selectedCircleForAdd) return;
    setFeedbackMsg(null);
    try {
      await addCircleMember(selectedCircleForAdd.id, friendId);
      setFeedbackMsg({ text: 'Friend added to circle!', isError: false });
      setSelectedCircleForAdd(null); // Close modal
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Failed to add member', isError: true });
    }
  };

  const renderFriendItem = ({ item }: { item: typeof friends[0] }) => (
    <View style={styles.rowItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.rowDetails}>
        <Text style={styles.rowTitle}>@{item.username}</Text>
        {item.name && <Text style={styles.rowSubtitle}>{item.name}</Text>}
      </View>
      
      {item.status === 'PENDING' ? (
        item.isOutgoing ? (
          <View style={styles.pendingOutgoingBadge}>
            <Text style={styles.pendingOutgoingText}>Sent</Text>
          </View>
        ) : (
          <View style={styles.requestActionsRow}>
            <Pressable style={styles.actionBtnAccept} onPress={() => handleAcceptRequest(item.friendshipId)}>
              <Text style={styles.actionBtnAcceptText}>Accept</Text>
            </Pressable>
            <Pressable style={styles.actionBtnReject} onPress={() => handleRejectRequest(item.friendshipId)}>
              <Text style={styles.actionBtnRejectText}>Reject</Text>
            </Pressable>
          </View>
        )
      ) : (
        <View style={styles.friendBadgeRow}>
          <View style={styles.friendBadge}>
            <Feather name="check" size={14} color={theme.colors.primary} />
            <Text style={styles.friendBadgeText}>Friend</Text>
          </View>
          <Pressable 
            style={styles.deleteFriendBtn} 
            onPress={() => handleDeleteFriend(item.friendId, item.username)}
          >
            <Feather name="user-x" size={15} color={theme.colors.error} />
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Circles & Friends</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Custom Sliding Tab Control */}
      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tabBtn, activeTab === 'FRIENDS' && styles.tabBtnActive]} 
          onPress={() => { setActiveTab('FRIENDS'); setFeedbackMsg(null); }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'FRIENDS' && styles.tabBtnTextActive]}>Friends</Text>
        </Pressable>
        <Pressable 
          style={[styles.tabBtn, activeTab === 'CIRCLES' && styles.tabBtnActive]} 
          onPress={() => { setActiveTab('CIRCLES'); setFeedbackMsg(null); }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'CIRCLES' && styles.tabBtnTextActive]}>Private Circles</Text>
        </Pressable>
      </View>

      {feedbackMsg && (
        <View style={[styles.feedbackBanner, feedbackMsg.isError ? styles.feedbackError : styles.feedbackSuccess]}>
          <Feather 
            name={feedbackMsg.isError ? 'alert-circle' : 'check-circle'} 
            size={18} 
            color={feedbackMsg.isError ? theme.colors.error : theme.colors.primary} 
          />
          <Text style={[styles.feedbackText, feedbackMsg.isError ? { color: theme.colors.error } : { color: theme.colors.primary }]}>
            {feedbackMsg.text}
          </Text>
        </View>
      )}

      {/* TAB 1: FRIENDS TAB */}
      {activeTab === 'FRIENDS' && (
        <View style={{ flex: 1 }}>
          {/* Add Friend search input */}
          <View style={styles.searchContainer}>
            <Text style={styles.sectionLabel}>Add Friends</Text>
            <View style={styles.searchInputWrapper}>
              <Feather name="user-plus" size={18} color={theme.colors.onSurfaceVariant} />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter friend's username..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={friendSearch}
                onChangeText={setFriendSearch}
                autoCapitalize="none"
              />
              <Pressable style={styles.inputAddBtn} onPress={handleAddFriend}>
                <Text style={styles.inputAddBtnText}>Send</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listScrollContainer}>
            {/* VIRAL INVITATION CARD */}
            <View style={styles.inviteCard}>
              <View style={styles.inviteCardHeader}>
                <View style={styles.inviteCardIconBg}>
                  <Feather name="gift" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteCardTitle}>Invite Friends to Moments</Text>
                  <Text style={styles.inviteCardDesc}>Send an invite link to auto-connect as best friends on signup!</Text>
                </View>
                {inviteLoading && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginLeft: 8 }} />}
              </View>

              {inviteCodeText && (
                <View style={styles.inviteCodeDisplayContainer}>
                  <Text style={styles.inviteCodeLabel}>YOUR INVITE CODE</Text>
                  <View style={styles.inviteCodeRow}>
                    <Text style={styles.inviteCodeValue}>{inviteCodeText}</Text>
                    <Pressable style={styles.inviteCodeCopyBtn} onPress={handleCopyCode}>
                      <Feather name="copy" size={14} color={theme.colors.primary} />
                      <Text style={styles.inviteCodeCopyText}>Copy</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.inviteButtonsRow}>
                <Pressable 
                  style={[styles.inviteShareBtn, { backgroundColor: '#25D366' }]} 
                  onPress={() => handleShareInvite('whatsapp')}
                  disabled={inviteLoading}
                >
                  <Feather name="message-circle" size={16} color="#fff" />
                  <Text style={styles.inviteShareBtnText}>WhatsApp</Text>
                </Pressable>
                
                <Pressable 
                  style={[styles.inviteShareBtn, { backgroundColor: theme.colors.primary }]} 
                  onPress={() => handleShareInvite('sms')}
                  disabled={inviteLoading}
                >
                  <Feather name="share-2" size={16} color="#fff" />
                  <Text style={styles.inviteShareBtnText}>Share Invite</Text>
                </Pressable>
              </View>
              
              <Pressable style={styles.contactsSyncLink} onPress={() => router.push('/contacts')}>
                <Feather name="users" size={14} color={theme.colors.primary} />
                <Text style={styles.contactsSyncLinkText}>Sync Contacts to Find Friends</Text>
                <Feather name="chevron-right" size={14} color={theme.colors.primary} />
              </Pressable>
            </View>

            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Pending Requests ({pendingRequests.length})</Text>
                {pendingRequests.map(item => (
                  <View key={item.friendshipId}>
                    {renderFriendItem({ item })}
                  </View>
                ))}
              </View>
            )}

            {/* Friends List Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Friends ({acceptedFriends.length})</Text>
              {acceptedFriends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="users" size={48} color={theme.colors.outline} />
                  <Text style={styles.emptyStateText}>No friends added yet.</Text>
                  <Text style={styles.emptyStateSub}>Search and add by username to connect!</Text>
                </View>
              ) : (
                acceptedFriends.map(item => (
                  <View key={item.friendshipId}>
                    {renderFriendItem({ item })}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* TAB 2: CIRCLES TAB */}
      {activeTab === 'CIRCLES' && (
        <View style={{ flex: 1 }}>
          {/* Create Circle input */}
          <View style={styles.searchContainer}>
            <Text style={styles.sectionLabel}>Create Circle</Text>
            <View style={styles.searchInputWrapper}>
              <Feather name="plus-circle" size={18} color={theme.colors.onSurfaceVariant} />
              <TextInput
                style={styles.searchInput}
                placeholder="Circle Name (e.g. Family, Partner)..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={circleNameInput}
                onChangeText={setCircleNameInput}
              />
              <Pressable style={styles.inputAddBtn} onPress={handleCreateCircle}>
                <Text style={styles.inputAddBtnText}>Create</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listScrollContainer}>
            <Text style={styles.sectionLabel}>Your Circles ({circles.length})</Text>
            {circles.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="grid" size={48} color={theme.colors.outline} />
                <Text style={styles.emptyStateText}>No private circles created.</Text>
                <Text style={styles.emptyStateSub}>Create a circle to partition your sharing groups!</Text>
              </View>
            ) : (
              circles.map(circle => (
                <View key={circle.id} style={styles.circleCard}>
                  <View style={styles.circleCardHeader}>
                    <View style={styles.circleInfo}>
                      <Text style={styles.circleCardTitle}>
                        {circle.ownerId === user?.id ? circle.circleName : `${circle.owner.username}'s ${circle.circleName}`}
                      </Text>
                      <Text style={styles.circleOwnerLabel}>
                        {circle.ownerId === user?.id ? 'Owned' : `Owned by @${circle.owner.username}`}
                      </Text>
                    </View>
                    <View style={styles.circleActionsRow}>
                      <Pressable style={styles.addMemberBtn} onPress={() => setSelectedCircleForAdd(circle)}>
                        <Feather name="user-plus" size={16} color="#fff" />
                        <Text style={styles.addMemberBtnText}>Add</Text>
                      </Pressable>
                      {circle.ownerId === user?.id && circle.circleName !== 'Best Friends' && (
                        <Pressable 
                          style={styles.deleteCircleBtn} 
                          onPress={() => handleDeleteCircle(circle.id, circle.circleName)}
                        >
                          <Feather name="trash-2" size={15} color={theme.colors.error} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View style={styles.circleMembersRow}>
                    {circle.members.map(member => (
                      <View key={member.id} style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {member.user.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                    <Text style={styles.circleMembersCount}>
                      {circle.members.length} member{circle.members.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* SELECT FRIEND TO ADD TO CIRCLE MODAL */}
      <Modal
        visible={selectedCircleForAdd !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCircleForAdd(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to {selectedCircleForAdd?.circleName}</Text>
              <Pressable onPress={() => setSelectedCircleForAdd(null)}>
                <Feather name="x" size={24} color={theme.colors.onSurface} />
              </Pressable>
            </View>

            {acceptedFriends.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>Add some friends first to invite them!</Text>
              </View>
            ) : (
              <FlatList
                data={acceptedFriends}
                keyExtractor={(item) => item.friendId}
                contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
                renderItem={({ item }) => {
                  const isAlreadyMember = selectedCircleForAdd?.members.some((m: any) => m.userId === item.friendId);
                  return (
                    <View style={styles.modalRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.modalRowName}>@{item.username}</Text>
                      
                      {isAlreadyMember ? (
                        <Text style={styles.alreadyMemberText}>Joined</Text>
                      ) : (
                        <Pressable style={styles.actionBtnAccept} onPress={() => handleAddMember(item.friendId)}>
                          <Text style={styles.actionBtnAcceptText}>Add</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.rounding.lg,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.rounding.md,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  tabBtnText: {
    ...theme.typography.bodyMd,
    fontWeight: 'bold',
    color: theme.colors.onSurfaceVariant,
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.rounding.lg,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
  },
  inputAddBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.rounding.md,
  },
  inputAddBtnText: {
    ...theme.typography.bodyMd,
    color: '#fff',
    fontWeight: 'bold',
  },
  listScrollContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.xs,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rowDetails: {
    flex: 1,
  },
  rowTitle: {
    ...theme.typography.bodyLg,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  rowSubtitle: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
  },
  actionBtnAccept: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.rounding.pill,
  },
  actionBtnAcceptText: {
    ...theme.typography.bodyMd,
    color: '#fff',
    fontWeight: 'bold',
  },
  pendingOutgoingBadge: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.rounding.pill,
  },
  pendingOutgoingText: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.rounding.pill,
    gap: 4,
  },
  friendBadgeText: {
    ...theme.typography.bodyMd,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  emptyState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
    marginTop: theme.spacing.sm,
  },
  emptyStateSub: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.rounding.lg,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  feedbackError: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
  },
  feedbackText: {
    ...theme.typography.bodyMd,
    fontWeight: '600',
    flex: 1,
  },
  // Circle Tab Styles
  circleCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    borderRadius: theme.rounding.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  circleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  circleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  circleCardTitle: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
  },
  circleOwnerLabel: {
    ...theme.typography.labelCaps,
    fontSize: 8,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    color: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addMemberBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.rounding.pill,
    gap: 4,
  },
  addMemberBtnText: {
    ...theme.typography.labelCaps,
    color: '#fff',
    fontSize: 10,
  },
  circleMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  circleMembersCount: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginLeft: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.rounding.xl,
    borderTopRightRadius: theme.rounding.xl,
    padding: theme.spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
  },
  modalEmpty: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  modalEmptyText: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  modalRowName: {
    flex: 1,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
  },
  alreadyMemberText: {
    ...theme.typography.bodyMd,
    color: theme.colors.outline,
    fontWeight: 'bold',
  },
  inviteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.rounding.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inviteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  inviteCardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteCardTitle: {
    ...theme.typography.bodyLg,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  inviteCardDesc: {
    ...theme.typography.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  inviteButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  inviteShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: theme.rounding.md,
  },
  inviteShareBtnText: {
    ...theme.typography.bodyMd,
    fontWeight: 'bold',
    color: '#fff',
  },
  contactsSyncLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
  },
  contactsSyncLinkText: {
    flex: 1,
    ...theme.typography.bodyMd,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  inviteCodeDisplayContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: theme.rounding.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  inviteCodeLabel: {
    ...theme.typography.labelCaps,
    fontSize: 9,
    color: theme.colors.outline,
    marginBottom: 6,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCodeValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: '#fff',
    letterSpacing: 2,
  },
  inviteCodeCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.rounding.pill,
  },
  inviteCodeCopyText: {
    ...theme.typography.bodyMd,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnReject: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderColor: 'rgba(186, 26, 26, 0.2)',
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.rounding.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnRejectText: {
    ...theme.typography.bodyMd,
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  circleActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteCircleBtn: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
  friendBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteFriendBtn: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
});
