import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useUser } from '@/contexts/user-context';
import { AppColors, AppSpacing, AppBorderRadius, AppFontSizes } from '@/constants/theme';
import type { UserRole } from '@/constants/types';

export default function IdentityVerificationScreen() {
  const { role: rawRole } = useLocalSearchParams<{ role: string }>();
  const initialRole: UserRole = rawRole === 'visitor' ? 'visitor' : 'employee';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUserData } = useUser();

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [companionName, setCompanionName] = useState('');
  const [phone, setPhone] = useState('');

  const isFormValid = () => {
    if (!fullName.trim()) return false;
    if (selectedRole === 'employee' && !idNumber.trim()) return false;
    if (selectedRole === 'visitor' && !companionName.trim()) return false;
    return true;
  };

  const handleContinue = () => {
    if (!isFormValid()) return;

    setUserData({
      role: selectedRole,
      fullName: fullName.trim(),
      idNumber: selectedRole === 'employee' ? idNumber.trim() : `VIS-${Date.now()}`,
      companionName: selectedRole === 'visitor' ? companionName.trim() : undefined,
      phone: selectedRole === 'visitor' && phone.trim() ? phone.trim() : undefined,
    });

    router.push('/face-setup');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + AppSpacing.sm, paddingBottom: insets.bottom + AppSpacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
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
          <Text style={styles.headerTitle}>Identity Verification</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Blue accent line */}
        <View style={styles.accentLine} />

        {/* Shield icon */}
        <View style={styles.shieldWrapper}>
          <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
              fill={AppColors.accent}
              opacity={0.2}
            />
            <Path
              d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
              stroke={AppColors.accent}
              strokeWidth={1.5}
              fill="none"
            />
          </Svg>
        </View>

        <Text style={styles.title}>Verify your identity</Text>
        <Text style={styles.description}>
          Please select your membership status and provide your identification details to proceed
          with the check-in process.
        </Text>

        {/* Role toggle */}
        <Text style={styles.sectionLabel}>ARE YOU AN EXISTING MEMBER?</Text>
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleButton, selectedRole === 'employee' && styles.toggleActive]}
            onPress={() => setSelectedRole('employee')}
          >
            <Text
              style={[
                styles.toggleText,
                selectedRole === 'employee' && styles.toggleTextActive,
              ]}
            >
              Existing Member
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, selectedRole === 'visitor' && styles.toggleActive]}
            onPress={() => setSelectedRole('visitor')}
          >
            <Text
              style={[
                styles.toggleText,
                selectedRole === 'visitor' && styles.toggleTextActive,
              ]}
            >
              New Visitor
            </Text>
          </Pressable>
        </View>

        {/* Form fields */}
        <Text style={styles.inputLabel}>Full Name</Text>
        <View style={styles.inputContainer}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
              stroke={AppColors.textMuted}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </Svg>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={AppColors.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        {selectedRole === 'employee' ? (
          <>
            <Text style={styles.inputLabel}>ID Number (Employee or Visitor)</Text>
            <View style={styles.inputContainer}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"
                  stroke={AppColors.textMuted}
                  strokeWidth={1.5}
                  fill="none"
                />
                <Path
                  d="M7 10h4M7 14h6"
                  stroke={AppColors.textMuted}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </Svg>
              <TextInput
                style={styles.input}
                placeholder="EMP-12345678"
                placeholderTextColor={AppColors.textMuted}
                value={idNumber}
                onChangeText={setIdNumber}
                autoCapitalize="characters"
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.inputLabel}>Employee Companion Name</Text>
            <View style={styles.inputContainer}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                  stroke={AppColors.textMuted}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </Svg>
              <TextInput
                style={styles.input}
                placeholder="Companion's full name"
                placeholderTextColor={AppColors.textMuted}
                value={companionName}
                onChangeText={setCompanionName}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
            <View style={styles.inputContainer}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.08 5.18 2 2 0 015.08 3h3a2 2 0 012 1.72c.13.81.36 1.6.68 2.34a2 2 0 01-.45 2.11L8.09 11.4a16 16 0 006.5 6.5l2.23-2.22a2 2 0 012.11-.45c.74.32 1.53.55 2.34.68a2 2 0 011.72 2z"
                  stroke={AppColors.textMuted}
                  strokeWidth={1.5}
                  fill="none"
                />
              </Svg>
              <TextInput
                style={styles.input}
                placeholder="+44 712 345 6789"
                placeholderTextColor={AppColors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </>
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoIcon}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                  stroke={AppColors.accent}
                  strokeWidth={1.5}
                  fill="none"
                />
                <Path
                  d="M12 16v-4M12 8h.01"
                  stroke={AppColors.accent}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <Text style={styles.infoTitle}>Why verify?</Text>
          </View>
          <Text style={styles.infoText}>
            Verification ensures a secure environment for all employees and authorized visitors
            within the premises.
          </Text>
        </View>

        {/* Continue button */}
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            !isFormValid() && styles.continueButtonDisabled,
            pressed && isFormValid() && styles.buttonPressed,
          ]}
          onPress={handleContinue}
          disabled={!isFormValid()}
        >
          <Text style={styles.continueButtonText}>Continue Verification →</Text>
        </Pressable>

        <Text style={styles.footerText}>
          By clicking continue, you agree to our{' '}
          <Text style={styles.footerLink}>Security Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  accentLine: {
    height: 3,
    backgroundColor: AppColors.accent,
    borderRadius: 2,
    marginBottom: AppSpacing.lg,
  },
  shieldWrapper: {
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  title: {
    fontSize: AppFontSizes.xxl,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.sm,
  },
  description: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    lineHeight: 22,
    marginBottom: AppSpacing.lg,
  },
  sectionLabel: {
    fontSize: AppFontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
    color: AppColors.textSecondary,
    marginBottom: AppSpacing.sm,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: AppBorderRadius.md,
    padding: 4,
    marginBottom: AppSpacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: AppSpacing.sm + 2,
    borderRadius: AppBorderRadius.sm,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: AppColors.accent,
  },
  toggleText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  toggleTextActive: {
    color: AppColors.textPrimary,
  },
  inputLabel: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: AppBorderRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: Platform.OS === 'ios' ? AppSpacing.md : AppSpacing.xs,
    marginBottom: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  input: {
    flex: 1,
    fontSize: AppFontSizes.md,
    color: AppColors.textPrimary,
  },
  infoCard: {
    backgroundColor: AppColors.surfaceLight,
    borderRadius: AppBorderRadius.md,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.xs,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: AppFontSizes.sm,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  infoText: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: AppColors.accent,
    borderRadius: AppBorderRadius.md,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  continueButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  footerText: {
    fontSize: AppFontSizes.sm,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  footerLink: {
    color: AppColors.accent,
    textDecorationLine: 'underline',
  },
});
