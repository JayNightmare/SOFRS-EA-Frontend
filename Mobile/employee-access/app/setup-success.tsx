import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';

import { AppColors, AppSpacing, AppBorderRadius, AppFontSizes } from '@/constants/theme';

interface BenefitCardProps {
  icon: React.ReactNode;
  label: string;
  delay: number;
}

function BenefitCard({ icon, label, delay }: BenefitCardProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateX.value = withDelay(delay, withSpring(0));
  }, [delay, opacity, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.benefitCard, animatedStyle]}>
      {icon}
      <Text style={styles.benefitText}>{label}</Text>
    </Animated.View>
  );
}

export default function SetupSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  useEffect(() => {
    checkOpacity.value = withTiming(1, { duration: 400 });
    checkScale.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, [checkOpacity, checkScale]);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + AppSpacing.xxl, paddingBottom: insets.bottom + AppSpacing.lg },
      ]}
    >
      <View style={styles.content}>
        {/* Animated check circle */}
        <Animated.View style={[styles.checkCircle, checkAnimatedStyle]}>
          <View style={styles.glowOuter} />
          <View style={styles.checkInner}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 6L9 17l-5-5"
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          {/* Sparkle dots */}
          <View style={[styles.sparkle, { top: -8, right: 10 }]}>
            <View style={styles.sparkleDot} />
          </View>
          <View style={[styles.sparkle, { top: 15, right: -5 }]}>
            <View style={[styles.sparkleDot, { width: 6, height: 6 }]} />
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Face ID Setup{'\n'}Complete</Text>
        <Text style={styles.subtitle}>
          Your biometric authentication has been securely registered.
        </Text>

        {/* Benefit cards */}
        <View style={styles.benefitsContainer}>
          <BenefitCard
            delay={400}
            icon={
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" fill={AppColors.accent} />
                <Path
                  d="M8 12l3 3 5-5"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            }
            label="Enhanced Account Security"
          />
          <BenefitCard
            delay={600}
            icon={
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" fill={AppColors.accent} opacity={0.8} />
                <Path
                  d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  scale={0.6}
                  translateX={5}
                  translateY={5}
                />
              </Svg>
            }
            label="Faster Login Experience"
          />
        </View>
      </View>

      {/* Bottom actions */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.dashboardButton, pressed && styles.buttonPressed]}
          onPress={() => router.replace('/(dashboard)')}
        >
          <Text style={styles.dashboardButtonText}>Go to Dashboard →</Text>
        </Pressable>

        <Text style={styles.supportText}>
          Having issues? <Text style={styles.supportLink}>Contact Support</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: AppSpacing.lg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppSpacing.xl,
    position: 'relative',
  },
  glowOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  checkInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
  },
  title: {
    fontSize: AppFontSizes.hero,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: AppSpacing.md,
    lineHeight: 48,
  },
  subtitle: {
    fontSize: AppFontSizes.md,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: AppSpacing.xxl,
  },
  benefitsContainer: {
    width: '100%',
    gap: AppSpacing.sm,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: AppBorderRadius.md,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
  },
  benefitText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  footer: {
    alignItems: 'center',
  },
  dashboardButton: {
    backgroundColor: AppColors.accent,
    borderRadius: AppBorderRadius.md,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    width: '100%',
    marginBottom: AppSpacing.md,
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  dashboardButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  supportText: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textMuted,
  },
  supportLink: {
    color: AppColors.accent,
    textDecorationLine: 'underline',
  },
});
