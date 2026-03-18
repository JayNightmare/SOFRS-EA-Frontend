import { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { useUser } from '@/contexts/user-context';
import { AppColors, AppSpacing, AppBorderRadius, AppFontSizes } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = 260;

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}

function NavItem({ label, icon, active, onPress }: NavItemProps) {
  return (
    <Pressable
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function DashboardLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userData, reset } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarX = useSharedValue(-SIDEBAR_WIDTH);

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    sidebarX.value = withTiming(newState ? 0 : -SIDEBAR_WIDTH, { duration: 250 });
  };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: (sidebarX.value + SIDEBAR_WIDTH) / SIDEBAR_WIDTH * 0.5,
    pointerEvents: sidebarX.value > -SIDEBAR_WIDTH + 10 ? 'auto' : 'none',
  }));

  const handleNavigate = (route: string) => {
    toggleSidebar();
    router.replace(route as any);
  };

  const handleLogout = () => {
    reset();
    router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={toggleSidebar} hitSlop={12}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 12h18M3 6h18M3 18h18"
              stroke={AppColors.textPrimary}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
        <Text style={styles.topBarTitle}>Dashboard</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userData?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.contentArea}>
        <Slot />
      </View>

      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleSidebar} />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          sidebarStyle,
          { paddingTop: insets.top + AppSpacing.lg, paddingBottom: insets.bottom + AppSpacing.lg },
        ]}
      >
        {/* User info */}
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarAvatar}>
            <Text style={styles.sidebarAvatarText}>
              {userData?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.sidebarName}>{userData?.fullName ?? 'User'}</Text>
          <Text style={styles.sidebarRole}>
            {userData?.role === 'employee' ? 'Employee' : 'Visitor'}
          </Text>
        </View>

        <View style={styles.sidebarDivider} />

        {/* Navigation */}
        <Text style={styles.sectionLabel}>GENERAL</Text>
        <NavItem
          label="Overview"
          active={false}
          onPress={() => handleNavigate('/(dashboard)')}
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1"
                stroke={AppColors.textSecondary}
                strokeWidth={1.5}
              />
              <Rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1"
                stroke={AppColors.textSecondary}
                strokeWidth={1.5}
              />
              <Rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1"
                stroke={AppColors.textSecondary}
                strokeWidth={1.5}
              />
              <Rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1"
                stroke={AppColors.textSecondary}
                strokeWidth={1.5}
              />
            </Svg>
          }
        />
        <NavItem
          label="Badge"
          active={false}
          onPress={() => handleNavigate('/(dashboard)/badge')}
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"
                stroke={AppColors.textSecondary}
                strokeWidth={1.5}
                fill="none"
              />
              <Path
                d="M7 10h4M7 14h6"
                stroke={AppColors.textSecondary}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </Svg>
          }
        />

        <View style={{ flex: 1 }} />

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              stroke={AppColors.error}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  topBarTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: AppColors.surface,
    borderRightWidth: 1,
    borderRightColor: AppColors.border,
    paddingHorizontal: AppSpacing.lg,
    zIndex: 20,
  },
  sidebarHeader: {
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  sidebarAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppSpacing.sm,
  },
  sidebarAvatarText: {
    fontSize: AppFontSizes.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sidebarName: {
    fontSize: AppFontSizes.md,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  sidebarRole: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginBottom: AppSpacing.md,
  },
  sectionLabel: {
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
    color: AppColors.textMuted,
    marginBottom: AppSpacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    paddingVertical: AppSpacing.sm + 2,
    paddingHorizontal: AppSpacing.sm,
    borderRadius: AppBorderRadius.sm,
    marginBottom: AppSpacing.xs,
  },
  navItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  navLabel: {
    fontSize: AppFontSizes.sm,
    fontWeight: '500',
    color: AppColors.textSecondary,
  },
  navLabelActive: {
    color: AppColors.accent,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    paddingVertical: AppSpacing.sm + 2,
    paddingHorizontal: AppSpacing.sm,
    borderRadius: AppBorderRadius.sm,
  },
  logoutText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    color: AppColors.error,
  },
});
