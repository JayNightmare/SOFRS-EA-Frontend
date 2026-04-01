import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";

import { FingerprintAnimation } from "@/components/FingerprintAnimation";
import {
	AppColors,
	AppSpacing,
	AppBorderRadius,
	AppFontSizes,
} from "@/constants/theme";
import type { UserRole } from "@/constants/types";

export default function WelcomeScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const handleNavigate = (role: UserRole) => {
		router.push({
			pathname: "/identity-verification",
			params: { role },
		});
	};

	return (
		<ScrollView
			style={styles.root}
			contentContainerStyle={[
				styles.container,
				{
					paddingTop: insets.top + AppSpacing.xl,
					paddingBottom:
						insets.bottom + AppSpacing.lg,
				},
			]}
		>
			{/* Fingerprint Animation */}
			<View style={styles.fingerprintWrapper}>
				<FingerprintAnimation />
			</View>

			{/* Title */}
			<Text style={styles.title}>Welcome</Text>
			<Text style={styles.subtitle}>
				Secure biometric access for everyone
			</Text>

			{/* Identity Verified Card */}
			<View style={styles.verifiedCard}>
				<Svg
					width={28}
					height={28}
					viewBox="0 0 24 24"
					fill="none"
				>
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
					<Path
						d="M9.5 12l2 2 3.5-3.5"
						stroke={AppColors.accent}
						strokeWidth={1.5}
						strokeLinecap="round"
						strokeLinejoin="round"
						fill="none"
					/>
				</Svg>
				<Text style={styles.verifiedText}>
					IDENTITY VERIFIED
				</Text>
			</View>

			{/* Spacer */}
			<View style={{ flex: 1, minHeight: AppSpacing.xl }} />

			{/* Action Buttons */}
			<Pressable
				style={({ pressed }) => [
					styles.primaryButton,
					pressed && styles.buttonPressed,
				]}
				onPress={() => handleNavigate("employee")}
			>
				<Text style={styles.primaryButtonText}>
					Employee Access
				</Text>
				<Svg
					width={20}
					height={20}
					viewBox="0 0 24 24"
					fill="none"
				>
					<Path
						d="M9 18l6-6-6-6"
						stroke="#FFFFFF"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</Svg>
			</Pressable>

			<Pressable
				style={({ pressed }) => [
					styles.secondaryButton,
					pressed && styles.buttonPressed,
				]}
				onPress={() => handleNavigate("visitor")}
			>
				<Text style={styles.secondaryButtonText}>
					Visitor Check-in
				</Text>
				<Svg
					width={24}
					height={24}
					viewBox="0 0 24 24"
					fill="none"
				>
					<Path
						d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"
						stroke={AppColors.textSecondary}
						strokeWidth={1.5}
						fill="none"
					/>
					<Path
						d="M20 21v-2c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2"
						stroke={AppColors.textSecondary}
						strokeWidth={1.5}
						fill="none"
					/>
					<Path
						d="M13 7h-2M12 6v2"
						stroke={AppColors.textSecondary}
						strokeWidth={1.5}
						strokeLinecap="round"
					/>
					<Path
						d="M8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3z"
						stroke={AppColors.textSecondary}
						strokeWidth={1.5}
						fill="none"
						opacity={0.5}
					/>
				</Svg>
			</Pressable>

			<Pressable
				style={({ pressed }) => [
					styles.tertiaryButton,
					pressed && styles.buttonPressed,
				]}
				onPress={() => router.push("/scan-qr")}
			>
				<Text style={styles.tertiaryButtonText}>
					Scan Desktop QR
				</Text>
			</Pressable>

			{/* Footer */}
			<Text style={styles.footerText}>
				By continuing, you agree to our{" "}
				<Text style={styles.footerLink}>
					Security Policies
				</Text>
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
		flexGrow: 1,
		alignItems: "center",
		paddingHorizontal: AppSpacing.lg,
	},
	fingerprintWrapper: {
		marginTop: AppSpacing.xxl,
		marginBottom: AppSpacing.lg,
	},
	title: {
		fontSize: AppFontSizes.hero,
		fontWeight: "700",
		color: AppColors.textPrimary,
		marginBottom: AppSpacing.sm,
	},
	subtitle: {
		fontSize: AppFontSizes.md,
		color: AppColors.textSecondary,
		marginBottom: AppSpacing.xxl,
	},
	verifiedCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: AppSpacing.sm,
		backgroundColor: AppColors.surface,
		borderWidth: 1,
		borderColor: AppColors.border,
		borderRadius: AppBorderRadius.lg,
		paddingVertical: AppSpacing.xl,
		paddingHorizontal: AppSpacing.xxl,
		width: "100%",
	},
	verifiedText: {
		fontSize: AppFontSizes.xs,
		fontWeight: "600",
		letterSpacing: 2,
		color: AppColors.accent,
	},
	primaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: AppColors.accent,
		borderRadius: AppBorderRadius.md,
		paddingVertical: AppSpacing.md,
		paddingHorizontal: AppSpacing.lg,
		width: "100%",
		marginBottom: AppSpacing.sm,
	},
	secondaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: AppColors.surface,
		borderWidth: 1,
		borderColor: AppColors.border,
		borderRadius: AppBorderRadius.md,
		paddingVertical: AppSpacing.md,
		paddingHorizontal: AppSpacing.lg,
		width: "100%",
		marginBottom: AppSpacing.md,
	},
	buttonPressed: {
		opacity: 0.8,
		transform: [{ scale: 0.98 }],
	},
	primaryButtonText: {
		fontSize: AppFontSizes.md,
		fontWeight: "600",
		color: AppColors.textPrimary,
	},
	secondaryButtonText: {
		fontSize: AppFontSizes.md,
		fontWeight: "600",
		color: AppColors.textSecondary,
	},
	tertiaryButton: {
		width: "100%",
		alignItems: "center",
		borderRadius: AppBorderRadius.md,
		borderWidth: 1,
		borderColor: AppColors.borderLight,
		paddingVertical: AppSpacing.md,
		marginBottom: AppSpacing.md,
	},
	tertiaryButtonText: {
		fontSize: AppFontSizes.sm,
		fontWeight: "600",
		color: AppColors.textSecondary,
	},
	footerText: {
		fontSize: AppFontSizes.sm,
		color: AppColors.textMuted,
		fontStyle: "italic",
		textAlign: "center",
	},
	footerLink: {
		color: AppColors.accent,
		fontStyle: "italic",
	},
});
