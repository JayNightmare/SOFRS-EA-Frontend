import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';

import { useUser } from '@/contexts/user-context';
import { AppColors, AppSpacing, AppBorderRadius, AppFontSizes } from '@/constants/theme';

/**
 * Simple QR code placeholder using SVG.
 * In production, use `react-native-qrcode-svg` once deps are installed.
 */
function QRCodePlaceholder({ value }: { value: string }) {
  // Generate a deterministic pattern from the value
  const cells = 11;
  const cellSize = 12;
  const size = cells * cellSize;
  const hash = Array.from(value).reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const pattern: boolean[][] = [];
  for (let r = 0; r < cells; r++) {
    pattern[r] = [];
    for (let c = 0; c < cells; c++) {
      // Finder patterns in corners
      const isTopLeft = r < 3 && c < 3;
      const isTopRight = r < 3 && c >= cells - 3;
      const isBottomLeft = r >= cells - 3 && c < 3;

      if (isTopLeft || isTopRight || isBottomLeft) {
        const cornerR = isTopLeft ? r : isBottomLeft ? r - (cells - 3) : r;
        const cornerC = isTopLeft ? c : isTopRight ? c - (cells - 3) : c;
        pattern[r][c] =
          cornerR === 0 || cornerR === 2 || cornerC === 0 || cornerC === 2 || (cornerR === 1 && cornerC === 1);
      } else {
        pattern[r][c] = ((hash * (r + 1) * (c + 1)) % 7) < 3;
      }
    }
  }

  return (
    <View style={qrStyles.container}>
      <View style={qrStyles.background}>
        <Svg width={size} height={size}>
          {pattern.map((row, r) =>
            row.map((filled, c) =>
              filled ? (
                <Rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#000000"
                />
              ) : null,
            ),
          )}
        </Svg>
      </View>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
});

export default function BadgeScreen() {
  const { userData } = useUser();
  const isEmployee = userData?.role === 'employee';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.screenTitle}>Your Badge</Text>
      <Text style={styles.screenSubtitle}>
        Present this badge at security checkpoints
      </Text>

      {/* Wallet card */}
      <View style={styles.walletCard}>
        {/* Top row */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardBrand}>Employee Access</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>
              {isEmployee ? 'EMPLOYEE' : 'VISITOR'}
            </Text>
          </View>
        </View>

        {/* Face photo - 3:2 aspect ratio */}
        <View style={styles.photoContainer}>
          <Image
            source={require('@/designs/face.png')}
            style={styles.photo}
            resizeMode="cover"
          />
        </View>

        {/* Info row */}
        <View style={styles.cardInfoRow}>
          <View style={styles.cardInfoBlock}>
            <Text style={styles.cardInfoLabel}>NAME</Text>
            <Text style={styles.cardInfoValue}>{userData?.fullName ?? '—'}</Text>
          </View>
          <View style={styles.cardInfoBlock}>
            <Text style={styles.cardInfoLabel}>ID NUMBER</Text>
            <Text style={styles.cardInfoValue}>{userData?.idNumber ?? '—'}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* QR Code */}
        <View style={styles.qrSection}>
          <QRCodePlaceholder value={userData?.idNumber ?? 'NO-ID'} />
          <Text style={styles.qrLabel}>Scan to verify identity</Text>
        </View>
      </View>

      <Text style={styles.hint}>
        Tap and hold to add to your digital wallet
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  container: {
    padding: AppSpacing.lg,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.xs,
  },
  screenSubtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    marginBottom: AppSpacing.lg,
    textAlign: 'center',
  },
  walletCard: {
    width: '100%',
    backgroundColor: AppColors.surface,
    borderRadius: AppBorderRadius.xl,
    borderWidth: 1,
    borderColor: AppColors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.lg,
    paddingBottom: AppSpacing.md,
  },
  cardBrand: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  roleChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: AppSpacing.sm + 2,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppBorderRadius.full,
  },
  roleChipText: {
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
    color: AppColors.accent,
    letterSpacing: 0.5,
  },
  photoContainer: {
    marginHorizontal: AppSpacing.lg,
    aspectRatio: 3 / 2,
    borderRadius: AppBorderRadius.md,
    overflow: 'hidden',
    backgroundColor: AppColors.background,
    marginBottom: AppSpacing.md,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  cardInfoRow: {
    flexDirection: 'row',
    paddingHorizontal: AppSpacing.lg,
    gap: AppSpacing.lg,
    marginBottom: AppSpacing.md,
  },
  cardInfoBlock: {
    flex: 1,
  },
  cardInfoLabel: {
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
    color: AppColors.textMuted,
    marginBottom: 2,
  },
  cardInfoValue: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginHorizontal: AppSpacing.lg,
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: AppSpacing.lg,
  },
  qrLabel: {
    fontSize: AppFontSizes.xs,
    color: AppColors.textMuted,
    marginTop: AppSpacing.sm,
  },
  hint: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textMuted,
    marginTop: AppSpacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
