import { useState } from "react";
import { createEmployee, createVisitor, ApiError } from "@/lib/api";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { useUser } from "@/contexts/user-context";
import {
	AppColors,
	AppSpacing,
	AppBorderRadius,
	AppFontSizes,
} from "@/constants/theme";
import type { UserRole } from "@/constants/types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toOptionalValue = (value: string): string | undefined => {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

export default function IdentityVerificationScreen() {
	const { role: rawRole } = useLocalSearchParams<{ role: string }>();
	const initialRole: UserRole =
		rawRole === "visitor" ? "visitor" : "employee";
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { setUserData, setRecordId } = useUser();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
	const [fullName, setFullName] = useState("");
	const [gender, setGender] = useState("");
	const [dob, setDob] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");

	const isDateFormatValid = (): boolean => {
		const value = dob.trim();
		return value.length === 0 || ISO_DATE_PATTERN.test(value);
	};

	const isFormValid = (): boolean => {
		return fullName.trim().length > 0 && isDateFormatValid();
	};

	const handleContinue = async () => {
		if (!fullName.trim()) {
			setError("Full name is required.");
			return;
		}

		if (!isDateFormatValid()) {
			setError("Date of birth must use YYYY-MM-DD format.");
			return;
		}

		setError(null);
		setIsSubmitting(true);

		try {
			const fullNameTrim = fullName.trim();
			const payload = {
				fullName: fullNameTrim,
				gender: toOptionalValue(gender),
				DoB: toOptionalValue(dob),
				email: toOptionalValue(email),
				Phone: toOptionalValue(phone),
			};

			const created =
				selectedRole === "employee"
					? await createEmployee(payload)
					: await createVisitor(payload);

			setRecordId(created.id);
			setUserData({
				role: selectedRole,
				fullName: created.fullName,
				idNumber: created.id,
				gender: payload.gender,
				DoB: payload.DoB,
				email: payload.email,
				phone: payload.Phone,
			});

			router.push("/face-setup");
		} catch (err) {
			const msg =
				err instanceof ApiError
					? err.message
					: "Cannot reach server";
			setError(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<KeyboardAvoidingView
			style={styles.root}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView
				contentContainerStyle={[
					styles.container,
					{
						paddingTop:
							insets.top +
							AppSpacing.sm,
						paddingBottom:
							insets.bottom +
							AppSpacing.lg,
					},
				]}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.header}>
					<Pressable
						onPress={() => router.back()}
						hitSlop={12}
					>
						<Svg
							width={24}
							height={24}
							viewBox="0 0 24 24"
							fill="none"
						>
							<Path
								d="M15 18l-6-6 6-6"
								stroke={
									AppColors.textPrimary
								}
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</Svg>
					</Pressable>
					<Text style={styles.headerTitle}>
						Identity Verification
					</Text>
					<View style={{ width: 24 }} />
				</View>

				<View style={styles.accentLine} />

				<View style={styles.shieldWrapper}>
					<Svg
						width={36}
						height={36}
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
							stroke={
								AppColors.accent
							}
							strokeWidth={1.5}
							fill="none"
						/>
					</Svg>
				</View>

				<Text style={styles.title}>
					Verify your identity
				</Text>
				<Text style={styles.description}>
					Select your role and provide profile
					details to create a record before face
					capture.
				</Text>

				<Text style={styles.sectionLabel}>
					SELECT ROLE
				</Text>
				<View style={styles.toggleContainer}>
					<Pressable
						style={[
							styles.toggleButton,
							selectedRole ===
								"employee" &&
								styles.toggleActive,
						]}
						onPress={() =>
							setSelectedRole(
								"employee",
							)
						}
					>
						<Text
							style={[
								styles.toggleText,
								selectedRole ===
									"employee" &&
									styles.toggleTextActive,
							]}
						>
							Employee
						</Text>
					</Pressable>
					<Pressable
						style={[
							styles.toggleButton,
							selectedRole ===
								"visitor" &&
								styles.toggleActive,
						]}
						onPress={() =>
							setSelectedRole(
								"visitor",
							)
						}
					>
						<Text
							style={[
								styles.toggleText,
								selectedRole ===
									"visitor" &&
									styles.toggleTextActive,
							]}
						>
							Visitor
						</Text>
					</Pressable>
				</View>

				<Text style={styles.inputLabel}>Full Name</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="John Doe"
						placeholderTextColor={
							AppColors.textMuted
						}
						value={fullName}
						onChangeText={setFullName}
						autoCapitalize="words"
					/>
				</View>

				<Text style={styles.inputLabel}>
					Gender (Optional)
				</Text>
				<View style={styles.toggleContainer}>
					<Pressable
						style={[
							styles.toggleButton,
							gender === "male" &&
								styles.toggleActive,
						]}
						onPress={() =>
							setGender(
								gender ===
									"male"
									? ""
									: "male",
							)
						}
					>
						<Text
							style={[
								styles.toggleText,
								gender ===
									"male" &&
									styles.toggleTextActive,
							]}
						>
							Male
						</Text>
					</Pressable>
					<Pressable
						style={[
							styles.toggleButton,
							gender === "female" &&
								styles.toggleActive,
						]}
						onPress={() =>
							setGender(
								gender ===
									"female"
									? ""
									: "female",
							)
						}
					>
						<Text
							style={[
								styles.toggleText,
								gender ===
									"female" &&
									styles.toggleTextActive,
							]}
						>
							Female
						</Text>
					</Pressable>
					<Pressable
						style={[
							styles.toggleButton,
							gender === "other" &&
								styles.toggleActive,
						]}
						onPress={() =>
							setGender(
								gender ===
									"other"
									? ""
									: "other",
							)
						}
					>
						<Text
							style={[
								styles.toggleText,
								gender ===
									"other" &&
									styles.toggleTextActive,
							]}
						>
							Other
						</Text>
					</Pressable>
				</View>

				<Text style={styles.inputLabel}>
					Date of Birth (Optional)
				</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="YYYY-MM-DD"
						placeholderTextColor={
							AppColors.textMuted
						}
						value={dob}
						onChangeText={setDob}
						autoCapitalize="none"
						autoCorrect={false}
					/>
				</View>

				<Text style={styles.inputLabel}>
					Email (Optional)
				</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="user@example.com"
						placeholderTextColor={
							AppColors.textMuted
						}
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="email-address"
					/>
				</View>

				<Text style={styles.inputLabel}>
					Phone (Optional)
				</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="+1 555 000 0000"
						placeholderTextColor={
							AppColors.textMuted
						}
						value={phone}
						onChangeText={setPhone}
						keyboardType="phone-pad"
					/>
				</View>

				{error ? (
					<View
						style={[
							styles.infoCard,
							{
								borderColor:
									AppColors.error ??
									"#dc2626",
								marginBottom:
									AppSpacing.md,
							},
						]}
					>
						<Text
							style={[
								styles.infoTitle,
								{
									color:
										AppColors.error ??
										"#dc2626",
								},
							]}
						>
							{error}
						</Text>
					</View>
				) : null}

				<View style={styles.infoCard}>
					<View style={styles.infoCardHeader}>
						<View style={styles.infoIcon}>
							<Svg
								width={18}
								height={18}
								viewBox="0 0 24 24"
								fill="none"
							>
								<Path
									d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
									stroke={
										AppColors.accent
									}
									strokeWidth={
										1.5
									}
									fill="none"
								/>
								<Path
									d="M12 16v-4M12 8h.01"
									stroke={
										AppColors.accent
									}
									strokeWidth={
										1.5
									}
									strokeLinecap="round"
								/>
							</Svg>
						</View>
						<Text style={styles.infoTitle}>
							Why verify?
						</Text>
					</View>
					<Text style={styles.infoText}>
						Verification ensures a secure
						environment for employees and
						authorized visitors.
					</Text>
				</View>

				<Pressable
					style={({ pressed }) => [
						styles.continueButton,
						(!isFormValid() ||
							isSubmitting) &&
							styles.continueButtonDisabled,
						pressed &&
							isFormValid() &&
							!isSubmitting &&
							styles.buttonPressed,
					]}
					onPress={handleContinue}
					disabled={
						!isFormValid() || isSubmitting
					}
				>
					<Text style={styles.continueButtonText}>
						{isSubmitting
							? "Creating..."
							: "Continue Verification →"}
					</Text>
				</Pressable>

				<Text style={styles.footerText}>
					By clicking continue, you agree to our{" "}
					<Text style={styles.footerLink}>
						Security Policy
					</Text>
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
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: AppSpacing.md,
	},
	headerTitle: {
		fontSize: AppFontSizes.md,
		fontWeight: "600",
		color: AppColors.textPrimary,
	},
	accentLine: {
		height: 3,
		backgroundColor: AppColors.accent,
		borderRadius: 2,
		marginBottom: AppSpacing.lg,
	},
	shieldWrapper: {
		alignItems: "center",
		marginBottom: AppSpacing.md,
	},
	title: {
		fontSize: AppFontSizes.xxl,
		fontWeight: "700",
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
		fontWeight: "700",
		letterSpacing: 1,
		color: AppColors.textSecondary,
		marginBottom: AppSpacing.sm,
	},
	toggleContainer: {
		flexDirection: "row",
		backgroundColor: AppColors.surface,
		borderRadius: AppBorderRadius.md,
		padding: 4,
		marginBottom: AppSpacing.lg,
	},
	toggleButton: {
		flex: 1,
		paddingVertical: AppSpacing.sm + 2,
		borderRadius: AppBorderRadius.sm,
		alignItems: "center",
	},
	toggleActive: {
		backgroundColor: AppColors.accent,
	},
	toggleText: {
		fontSize: AppFontSizes.sm,
		fontWeight: "600",
		color: AppColors.textSecondary,
	},
	toggleTextActive: {
		color: AppColors.textPrimary,
	},
	inputLabel: {
		fontSize: AppFontSizes.sm,
		fontWeight: "600",
		color: AppColors.textPrimary,
		marginBottom: AppSpacing.xs,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: AppColors.surface,
		borderWidth: 1,
		borderColor: AppColors.border,
		borderRadius: AppBorderRadius.md,
		paddingHorizontal: AppSpacing.md,
		paddingVertical:
			Platform.OS === "ios" ? AppSpacing.md : AppSpacing.xs,
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
		flexDirection: "row",
		alignItems: "center",
		gap: AppSpacing.sm,
		marginBottom: AppSpacing.xs,
	},
	infoIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "rgba(59, 130, 246, 0.15)",
		alignItems: "center",
		justifyContent: "center",
	},
	infoTitle: {
		fontSize: AppFontSizes.sm,
		fontWeight: "700",
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
		alignItems: "center",
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
		fontWeight: "600",
		color: AppColors.textPrimary,
	},
	footerText: {
		fontSize: AppFontSizes.sm,
		color: AppColors.textMuted,
		textAlign: "center",
	},
	footerLink: {
		color: AppColors.accent,
		textDecorationLine: "underline",
	},
});
