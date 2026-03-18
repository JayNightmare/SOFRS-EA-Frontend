import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { AppColors } from '@/constants/theme';

const SIZE = 120;

/**
 * Animated fingerprint icon with a scanning line that
 * moves up and down continuously.
 */
export function FingerprintAnimation() {
  const scanY = useSharedValue(0);

  useEffect(() => {
    scanY.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scanY]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: scanY.value * (SIZE - 4),
  }));

  return (
    <View style={styles.container}>
      {/* Background glow circle */}
      <View style={styles.glowCircle} />

      {/* Fingerprint SVG */}
      <Svg width={SIZE} height={SIZE} viewBox="0 0 120 120" fill="none">
        <Defs>
          <LinearGradient id="fpGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={AppColors.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={AppColors.accentDark} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {/* Simplified fingerprint ridges */}
        <Path
          d="M60 20 C30 20, 20 45, 20 60 C20 80, 35 100, 60 100"
          stroke="url(#fpGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M60 20 C90 20, 100 45, 100 60 C100 80, 85 100, 60 100"
          stroke="url(#fpGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M60 30 C38 30, 30 50, 30 60 C30 75, 40 92, 60 92"
          stroke="url(#fpGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M60 30 C82 30, 90 50, 90 60 C90 75, 80 92, 60 92"
          stroke="url(#fpGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M60 40 C45 40, 40 52, 40 60 C40 72, 48 84, 60 84"
          stroke="url(#fpGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M60 40 C75 40, 80 52, 80 60 C80 72, 72 84, 60 84"
          stroke="url(#fpGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M60 50 C52 50, 50 55, 50 60 C50 68, 54 76, 60 76"
          stroke="url(#fpGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M60 50 C68 50, 70 55, 70 60 C70 68, 66 76, 60 76"
          stroke="url(#fpGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Center dot */}
        <Circle cx="60" cy="60" r="3" fill={AppColors.accent} />
      </Svg>

      {/* Animated scan line */}
      <Animated.View style={[styles.scanLine, scanLineStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE + 40,
    height: SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: SIZE + 40,
    height: SIZE + 40,
    borderRadius: (SIZE + 40) / 2,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  scanLine: {
    position: 'absolute',
    left: 20,
    width: SIZE,
    height: 2,
    backgroundColor: AppColors.accent,
    opacity: 0.7,
    borderRadius: 1,
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
