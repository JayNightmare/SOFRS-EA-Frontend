import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Ellipse, Line, Path } from 'react-native-svg';

import { useUser } from '@/contexts/user-context';
import { AppColors, AppSpacing, AppBorderRadius, AppFontSizes } from '@/constants/theme';
import { FACE_POSITIONS, POSITION_INSTRUCTIONS, type FaceCapturePosition } from '@/constants/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OVAL_WIDTH = SCREEN_WIDTH * 0.65;
const OVAL_HEIGHT = OVAL_WIDTH * 1.3;

type CaptureStatus = 'waiting' | 'capturing' | 'captured';

interface StatusChipData {
  label: string;
  positive: boolean;
}

function StatusChip({ label, positive }: StatusChipData) {
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: positive ? AppColors.chipGreen : AppColors.chipYellow,
        },
      ]}
    >
      <Text style={{ fontSize: 12, marginRight: 4 }}>{positive ? '✅' : '⏳'}</Text>
      <Text
        style={[
          styles.chipText,
          { color: positive ? AppColors.chipGreenText : AppColors.chipYellowText },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function FaceScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setFaceScanResult } = useUser();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('waiting');
  const [captures, setCaptures] = useState<Record<string, string>>({});
  const [faceDetected, setFaceDetected] = useState(true);
  const [goodLighting, setGoodLighting] = useState(true);
  const [holdStill, setHoldStill] = useState(false);

  const currentPosition = FACE_POSITIONS[currentIndex];
  const progress = (Object.keys(captures).length / FACE_POSITIONS.length) * 100;

  const handleCapture = useCallback(async () => {
    if (captureStatus !== 'waiting' || !cameraRef.current) return;

    setCaptureStatus('capturing');
    setHoldStill(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo?.base64) {
        const newCaptures = { ...captures, [currentPosition]: photo.base64 };
        setCaptures(newCaptures);

        setHoldStill(false);
        setCaptureStatus('captured');

        // Move to next position or finish
        if (currentIndex < FACE_POSITIONS.length - 1) {
          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
            setCaptureStatus('waiting');
          }, 800);
        } else {
          // All captures complete — run stub verification
          setFaceScanResult(newCaptures);
          setTimeout(() => {
            router.replace('/setup-success');
          }, 1000);
        }
      }
    } catch {
      setCaptureStatus('waiting');
      setHoldStill(false);
    }
  }, [captureStatus, captures, currentIndex, currentPosition, router, setFaceScanResult]);

  // Simulate capture for web / no-camera environments
  const handleSimulatedCapture = useCallback(() => {
    if (captureStatus !== 'waiting') return;

    setCaptureStatus('capturing');
    setHoldStill(true);

    const newCaptures = { ...captures, [currentPosition]: `simulated_${currentPosition}_${Date.now()}` };
    setCaptures(newCaptures);

    setTimeout(() => {
      setHoldStill(false);
      setCaptureStatus('captured');

      if (currentIndex < FACE_POSITIONS.length - 1) {
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setCaptureStatus('waiting');
        }, 600);
      } else {
        setFaceScanResult(newCaptures);
        setTimeout(() => {
          router.replace('/setup-success');
        }, 800);
      }
    }, 500);
  }, [captureStatus, captures, currentIndex, currentPosition, router, setFaceScanResult]);

  // Permission handling
  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.centeredContent]}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionDesc}>
          We need camera access to scan your face for biometric authentication.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </Pressable>
        <Pressable style={styles.permissionSkip} onPress={handleSimulatedCapture}>
          <Text style={styles.permissionSkipText}>Continue without camera (demo mode)</Text>
        </Pressable>
      </View>
    );
  }

  const cameraAvailable = Platform.OS !== 'web';

  return (
    <View style={[styles.root, { paddingTop: insets.top + AppSpacing.sm }]}>
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
        <Text style={styles.headerTitle}>Security Setup</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Title */}
      <Text style={styles.title}>Face Scan</Text>
      <Text style={styles.subtitle}>Keep your face within the frame</Text>

      {/* Camera area with oval overlay */}
      <View style={styles.cameraContainer}>
        {cameraAvailable ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />
        ) : (
          <View style={[styles.camera, styles.cameraPlaceholder]}>
            <Text style={styles.cameraPlaceholderText}>Camera Preview</Text>
          </View>
        )}

        {/* Oval guide overlay */}
        <View style={styles.ovalOverlay} pointerEvents="none">
          <Svg width={OVAL_WIDTH + 20} height={OVAL_HEIGHT + 20} viewBox={`0 0 ${OVAL_WIDTH + 20} ${OVAL_HEIGHT + 20}`}>
            <Ellipse
              cx={(OVAL_WIDTH + 20) / 2}
              cy={(OVAL_HEIGHT + 20) / 2}
              rx={OVAL_WIDTH / 2}
              ry={OVAL_HEIGHT / 2}
              stroke={captureStatus === 'captured' ? AppColors.success : AppColors.accent}
              strokeWidth={3}
              fill="none"
              strokeDasharray={captureStatus === 'waiting' ? '8,4' : 'none'}
            />
            {/* Crosshair */}
            <Line
              x1={(OVAL_WIDTH + 20) / 2 - 15}
              y1={(OVAL_HEIGHT + 20) / 2}
              x2={(OVAL_WIDTH + 20) / 2 + 15}
              y2={(OVAL_HEIGHT + 20) / 2}
              stroke={AppColors.accent}
              strokeWidth={1}
              opacity={0.5}
            />
            <Line
              x1={(OVAL_WIDTH + 20) / 2}
              y1={(OVAL_HEIGHT + 20) / 2 - 15}
              x2={(OVAL_WIDTH + 20) / 2}
              y2={(OVAL_HEIGHT + 20) / 2 + 15}
              stroke={AppColors.accent}
              strokeWidth={1}
              opacity={0.5}
            />
          </Svg>
        </View>

        {/* Capture button */}
        <Pressable
          style={[
            styles.captureButton,
            captureStatus !== 'waiting' && styles.captureButtonDisabled,
          ]}
          onPress={cameraAvailable ? handleCapture : handleSimulatedCapture}
          disabled={captureStatus !== 'waiting'}
        >
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path
              d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              fill="none"
            />
            <Path
              d="M12 17a4 4 0 100-8 4 4 0 000 8z"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              fill="none"
            />
          </Svg>
        </Pressable>
      </View>

      {/* Position instruction */}
      <Text style={styles.positionInstruction}>
        {POSITION_INSTRUCTIONS[currentPosition]}
      </Text>

      {/* Progress section */}
      <View style={styles.statusSection}>
        <View style={styles.progressRow}>
          <Text style={styles.statusLabel}>SYSTEM STATUS</Text>
          <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
        </View>
        <Text style={styles.scanningText}>
          {captureStatus === 'capturing'
            ? 'Capturing...'
            : captureStatus === 'captured'
              ? 'Position captured!'
              : `Scanning Biometrics... (${currentIndex + 1}/${FACE_POSITIONS.length})`}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Position indicators */}
        <View style={styles.positionIndicators}>
          {FACE_POSITIONS.map((pos, idx) => (
            <View
              key={pos}
              style={[
                styles.positionDot,
                idx < currentIndex
                  ? styles.positionDotComplete
                  : idx === currentIndex
                    ? styles.positionDotActive
                    : styles.positionDotPending,
              ]}
            >
              <Text style={styles.positionDotText}>
                {pos.charAt(0).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        {/* Status chips */}
        <View style={styles.chipRow}>
          <StatusChip label={goodLighting ? 'Good Lighting' : 'Bad Lighting'} positive={goodLighting} />
          <StatusChip label={faceDetected ? 'Face Detected' : 'No Face'} positive={faceDetected} />
          {holdStill && <StatusChip label="Hold Still" positive={false} />}
        </View>
      </View>

      {/* Cancel button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + AppSpacing.md }]}>
        <Pressable
          style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.8 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.lg,
  },
  headerTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  title: {
    fontSize: AppFontSizes.xxl,
    fontWeight: '700',
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: AppSpacing.md,
  },
  cameraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: OVAL_HEIGHT + 60,
    position: 'relative',
  },
  camera: {
    width: OVAL_WIDTH + 40,
    height: OVAL_HEIGHT + 20,
    borderRadius: OVAL_WIDTH / 2,
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cameraPlaceholderText: {
    color: AppColors.textMuted,
    fontSize: AppFontSizes.sm,
  },
  ovalOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    position: 'absolute',
    bottom: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  positionInstruction: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.accent,
    textAlign: 'center',
    marginVertical: AppSpacing.sm,
  },
  statusSection: {
    paddingHorizontal: AppSpacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.xs,
  },
  statusLabel: {
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
    color: AppColors.accent,
  },
  progressPercent: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: AppColors.accent,
  },
  scanningText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: AppColors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: AppSpacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.accent,
    borderRadius: 3,
  },
  positionIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.md,
  },
  positionDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionDotComplete: {
    backgroundColor: AppColors.success,
  },
  positionDotActive: {
    backgroundColor: AppColors.accent,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  positionDotPending: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  positionDotText: {
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: AppSpacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs + 2,
    borderRadius: AppBorderRadius.full,
  },
  chipText: {
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: AppSpacing.lg,
  },
  cancelButton: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: AppBorderRadius.md,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  permissionTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.sm,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: AppSpacing.lg,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: AppColors.accent,
    borderRadius: AppBorderRadius.md,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.xxl,
    marginBottom: AppSpacing.md,
  },
  permissionButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  permissionSkip: {
    padding: AppSpacing.sm,
  },
  permissionSkipText: {
    fontSize: AppFontSizes.sm,
    color: AppColors.accent,
    textDecorationLine: 'underline',
  },
});
