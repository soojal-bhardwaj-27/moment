import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { theme } from '../../theme';
import { router } from 'expo-router';

export default function SuccessScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🎉</Text>
        </View>
        
        <Animated.Text entering={SlideInUp.duration(600).delay(200)} style={styles.title}>
          Widget Installed!
        </Animated.Text>
        
        <Animated.Text entering={SlideInUp.duration(600).delay(300)} style={styles.description}>
          You're all set! Now you can start receiving moments directly on your Home Screen.
        </Animated.Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(600).delay(500)} style={styles.footer}>
        <Pressable style={styles.button} onPress={() => router.replace('/camera')}>
          <Text style={styles.buttonText}>Send a Moment</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    ...theme.typography.headlineMd,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xl * 1.5,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.rounding.lg,
    alignItems: 'center',
  },
  buttonText: {
    ...theme.typography.bodyLg,
    color: theme.colors.background,
    fontWeight: '700',
  },
});
