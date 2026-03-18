import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { useUser } from '@/contexts/user-context';
import { AppColors, AppSpacing, AppBorderRadius, AppFontSizes } from '@/constants/theme';

interface InfoRowProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function OverviewScreen() {
  const { userData, faceScanResult } = useUser();
  const captureCount = Object.keys(faceScanResult).length;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
    >
      {/* Welcome banner */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeAvatar}>
          <Text style={styles.welcomeAvatarText}>
            {userData?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View>
          <Text style={styles.welcomeGreeting}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{userData?.fullName ?? 'User'}</Text>
        </View>
      </View>

      {/* Status card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
              stroke={AppColors.success}
              strokeWidth={1.5}
              fill="none"
            />
            <Path
              d="M9.5 12l2 2 3.5-3.5"
              stroke={AppColors.success}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
          <Text style={styles.statusTitle}>Verified & Active</Text>
        </View>
        <Text style={styles.statusDesc}>
          Your biometric profile is active with {captureCount} facial captures registered.
        </Text>
      </View>

      {/* Personal information */}
      <Text style={styles.sectionTitle}>Personal Information</Text>
      <View style={styles.infoCard}>
        <InfoRow
          label="Full Name"
          value={userData?.fullName ?? '—'}
          icon={
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                stroke={AppColors.accent}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </Svg>
          }
        />
        <View style={styles.infoDivider} />
        <InfoRow
          label="Role"
          value={userData?.role === 'employee' ? 'Employee' : 'Visitor'}
          icon={
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Rect
                x="2"
                y="7"
                width="20"
                height="14"
                rx="2"
                stroke={AppColors.accent}
                strokeWidth={1.5}
                fill="none"
              />
              <Path
                d="M16 7V5a4 4 0 00-8 0v2"
                stroke={AppColors.accent}
                strokeWidth={1.5}
                fill="none"
              />
            </Svg>
          }
        />
        <View style={styles.infoDivider} />
        <InfoRow
          label="ID Number"
          value={userData?.idNumber ?? '—'}
          icon={
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"
                stroke={AppColors.accent}
                strokeWidth={1.5}
                fill="none"
              />
              <Path
                d="M7 10h4M7 14h6"
                stroke={AppColors.accent}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </Svg>
          }
        />
        {userData?.companionName && (
          <>
            <View style={styles.infoDivider} />
            <InfoRow
              label="Employee Companion"
              value={userData.companionName}
              icon={
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    stroke={AppColors.accent}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                </Svg>
              }
            />
          </>
        )}
        {userData?.phone && (
          <>
            <View style={styles.infoDivider} />
            <InfoRow
              label="Phone"
              value={userData.phone}
              icon={
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.08 5.18 2 2 0 015.08 3h3a2 2 0 012 1.72c.13.81.36 1.6.68 2.34a2 2 0 01-.45 2.11L8.09 11.4a16 16 0 006.5 6.5l2.23-2.22a2 2 0 012.11-.45c.74.32 1.53.55 2.34.68a2 2 0 011.72 2z"
                    stroke={AppColors.accent}
                    strokeWidth={1.5}
                    fill="none"
                  />
                </Svg>
              }
            />
          </>
        )}
      </View>
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
  },
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    marginBottom: AppSpacing.lg,
  },
  welcomeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeAvatarText: {
    fontSize: AppFontSizes.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  welcomeGreeting: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
  },
  welcomeName: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  statusCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: AppBorderRadius.md,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.xs,
  },
  statusTitle: {
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
    color: AppColors.success,
  },
  statusDesc: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.sm,
  },
  infoCard: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: AppBorderRadius.md,
    padding: AppSpacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: AppFontSizes.xs,
    color: AppColors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginLeft: 52,
  },
});
