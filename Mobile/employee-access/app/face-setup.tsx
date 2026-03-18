import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppColors, AppSpacing, AppBorderRadius, AppFontSizes } from '@/constants/theme';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColor: string;
}

function FeatureCard({ icon, title, description, bgColor }: FeatureCardProps) {
  return (
    <View style={[styles.featureCard, { backgroundColor: bgColor }]}>
      <View style={styles.featureIcon}>{icon}</View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

export default function FaceSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + AppSpacing.sm, paddingBottom: insets.bottom + AppSpacing.lg },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 18l-6-6 6-6"
              stroke={AppColors.textPrimary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Text style={styles.headerTitle}>Face Setup</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Hero image */}
      <View style={styles.heroContainer}>
        <Image
          source={require('@/designs/face.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>Set Up Face ID</Text>
      <Text style={styles.description}>
        Experience a more secure and faster way to unlock your device and authenticate payments with
        biometrics.
      </Text>

      {/* Feature cards */}
      <FeatureCard
        bgColor={AppColors.surface}
        icon={
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
              stroke={AppColors.accent}
              strokeWidth={1.5}
              fill="none"
            />
            <Path
              d="M9.5 12l2 2 3.5-3.5"
              stroke={AppColors.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        }
        title="Secure & Encrypted"
        description="Your biometric data is stored locally on the device's secure enclave."
      />

      <FeatureCard
        bgColor={AppColors.surface}
        icon={
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
              stroke="#A78BFA"
              strokeWidth={1.5}
              fill="none"
            />
            <Path
              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
              stroke="#A78BFA"
              strokeWidth={1.5}
              fill="none"
            />
          </Svg>
        }
        title="Privacy First"
        description="Face ID doesn't share your scan with apps or sync it to the cloud."
      />

      <FeatureCard
        bgColor={AppColors.surface}
        icon={
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
              stroke="#FBBF24"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        }
        title="Instant Access"
        description="Unlock apps, confirm transactions, and sign in instantly."
      />

      {/* Start Scan button */}
      <Pressable
        style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
        onPress={() => router.push('/face-scan')}
      >
        <Text style={styles.startButtonText}>Start Scan</Text>
      </Pressable>

      <Text style={styles.learnMore}>LEARN MORE ABOUT FACE ID AND PRIVACY...</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: AppSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AppSpacing.md,
  },
  headerTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  heroContainer: {
    borderRadius: AppBorderRadius.lg,
    overflow: 'hidden',
    marginBottom: AppSpacing.lg,
    backgroundColor: AppColors.surface,
    height: 220,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: AppFontSizes.xxl,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: AppSpacing.sm,
  },
  description: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: AppSpacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: AppSpacing.sm,
    gap: AppSpacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: AppFontSizes.xs,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  startButton: {
    backgroundColor: AppColors.accent,
    borderRadius: AppBorderRadius.md,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.sm,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  startButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  learnMore: {
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginBottom: AppSpacing.lg,
  },
});
