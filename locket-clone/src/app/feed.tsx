import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, FlatList, Pressable, Image, ActivityIndicator, Modal, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import { router } from 'expo-router';
import { useApp, Moment } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

const EMOJIS = ['❤️', '😂', '🔥', '😍', '😮', '👍'];

export default function FeedScreen() {
  const { feed, isLoading, refreshAll, reactToMoment } = useApp();
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);

  useEffect(() => {
    refreshAll();
  }, []);

  // Group reactions by emoji to count them
  const getReactionCounts = (moment: Moment) => {
    const counts: { [emoji: string]: number } = {};
    moment.reactions.forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  };

  const handleReact = async (emoji: string) => {
    if (!selectedMoment) return;
    try {
      await reactToMoment(selectedMoment.id, emoji);
      // Re-fetch current selected moment details from the updated feed list
      const updated = feed.find(m => m.id === selectedMoment.id);
      if (updated) {
        setSelectedMoment(updated);
      }
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const renderItem = ({ item, index }: { item: Moment; index: number }) => {
    const counts = getReactionCounts(item);
    const reactionEmojis = Object.keys(counts);

    return (
      <Pressable onPress={() => setSelectedMoment(item)} style={styles.momentCard}>
        <Image source={{ uri: item.photoUrl }} style={styles.momentImage} resizeMode="cover" />
        <View style={styles.cardInfo}>
          <Text style={styles.senderName}>{item.sender.username}</Text>
          <Text style={styles.circleName}>{item.circle?.circleName || 'Circle'}</Text>
        </View>
        
        {/* Reaction badge overlays */}
        {reactionEmojis.length > 0 && (
          <View style={styles.cardReactionsBadge}>
            {reactionEmojis.slice(0, 3).map(emoji => (
              <Text key={emoji} style={styles.reactionMiniEmoji}>{emoji}</Text>
            ))}
            <Text style={styles.reactionMiniCount}>
              {item.reactions.length}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Moments Feed</Text>
        <Pressable onPress={refreshAll} style={styles.iconButton}>
          <Feather name="refresh-cw" size={20} color={theme.colors.onSurface} />
        </Pressable>
      </View>

      {isLoading && feed.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : feed.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="image" size={64} color={theme.colors.outline} style={{ marginBottom: theme.spacing.md }} />
          <Text style={styles.emptyText}>No moments shared yet.</Text>
          <Text style={styles.emptySubtext}>Share your first moment to your circle or invite friends to join!</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContainer}
          onRefresh={refreshAll}
          refreshing={isLoading}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* DETAIL MODAL (FULL SCREEN) */}
      <Modal
        visible={selectedMoment !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedMoment(null)}
      >
        {selectedMoment && (
          <View style={styles.modalContainer}>
            {/* Modal Image Background */}
            <Image source={{ uri: selectedMoment.photoUrl }} style={styles.modalImage} resizeMode="cover" />
            
            {/* Gradient Overlay for Top Controls */}
            <SafeAreaView style={styles.modalHeaderSafeArea} edges={['top']}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setSelectedMoment(null)} style={styles.modalCloseBtn}>
                  <Feather name="x" size={28} color="#fff" />
                </Pressable>
                
                <View style={styles.modalSenderInfo}>
                  <Text style={styles.modalSenderName}>{selectedMoment.sender.username}</Text>
                  <Text style={styles.modalCircleName}>in {selectedMoment.circle.circleName}</Text>
                </View>

                <View style={{ width: 40 }} />
              </View>
            </SafeAreaView>

            {/* Bottom Section: Caption, Reactions and Emoji bar */}
            <View style={styles.modalBottomContainer}>
              {selectedMoment.caption && (
                <View style={styles.modalCaptionContainer}>
                  <Text style={styles.modalCaption}>{selectedMoment.caption}</Text>
                </View>
              )}

              {/* Existing Reactions */}
              {selectedMoment.reactions.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalReactionsList}>
                  {Object.entries(getReactionCounts(selectedMoment)).map(([emoji, count]) => (
                    <View key={emoji} style={styles.modalReactionBadge}>
                      <Text style={styles.modalReactionEmoji}>{emoji}</Text>
                      <Text style={styles.modalReactionCount}>{count}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Reaction Bar */}
              <View style={styles.modalReactionPicker}>
                {EMOJIS.map(emoji => (
                  <Pressable key={emoji} style={styles.modalEmojiBtn} onPress={() => handleReact(emoji)}>
                    <Text style={styles.modalEmojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
      </Modal>
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.headlineSm,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
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
  listContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl * 2,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  momentCard: {
    width: (width - theme.spacing.md * 3) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.rounding.lg,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  momentImage: {
    width: '100%',
    aspectRatio: 1, // Locket style square
  },
  cardInfo: {
    padding: theme.spacing.sm,
  },
  senderName: {
    ...theme.typography.bodyMd,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  circleName: {
    ...theme.typography.labelCaps,
    fontSize: 9,
    color: theme.colors.primary,
    marginTop: 2,
  },
  cardReactionsBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm + 32,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.rounding.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reactionMiniEmoji: {
    fontSize: 10,
  },
  reactionMiniCount: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  // Modal Detail styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  modalImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
  },
  modalHeaderSafeArea: {
    backgroundColor: 'transparent',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSenderInfo: {
    alignItems: 'center',
  },
  modalSenderName: {
    ...theme.typography.headlineSm,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalCircleName: {
    ...theme.typography.labelCaps,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  modalBottomContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  modalCaptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.rounding.md,
  },
  modalCaption: {
    ...theme.typography.bodyLg,
    color: '#fff',
    textAlign: 'center',
  },
  modalReactionsList: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  modalReactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.rounding.pill,
    gap: 4,
  },
  modalReactionEmoji: {
    fontSize: 16,
  },
  modalReactionCount: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalReactionPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalEmojiBtn: {
    padding: theme.spacing.xs,
  },
  modalEmojiText: {
    fontSize: 28,
  },
});
