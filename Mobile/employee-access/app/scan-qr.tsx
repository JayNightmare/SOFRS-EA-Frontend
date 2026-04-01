import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	SafeAreaView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import {
	CameraView,
	type BarcodeScanningResult,
	useCameraPermissions,
} from "expo-camera";
import { useRouter } from "expo-router";

import {
	AppBorderRadius,
	AppColors,
	AppFontSizes,
	AppSpacing,
} from "@/constants/theme";
import { resolveDeepLinkRoute } from "@/lib/deeplink";

export default function ScanQrScreen() {
	const router = useRouter();
	const [permission, requestPermission] = useCameraPermissions();
	const [scanLocked, setScanLocked] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const handleBarcodeScanned = useCallback(
		(event: BarcodeScanningResult) => {
			if (scanLocked) {
				return;
			}

			setScanLocked(true);
			const route = resolveDeepLinkRoute(event.data);
			if (!route) {
				setErrorMessage(
					"This QR code is not recognized. Scan a SOFRS desktop QR code.",
				);
				return;
			}

			router.push(route);
		},
		[scanLocked, router],
	);

	if (!permission) {
		return (
			<SafeAreaView style={styles.container}>
				<ActivityIndicator
					size="large"
					color={AppColors.accent}
				/>
			</SafeAreaView>
		);
	}

	if (!permission.granted) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.permissionCard}>
					<Text style={styles.title}>
						Camera Access Required
					</Text>
					<Text style={styles.subtitle}>
						Allow camera access to scan the
						desktop QR code.
					</Text>
					<TouchableOpacity
						style={styles.primaryButton}
						onPress={requestPermission}
					>
						<Text
							style={
								styles.primaryButtonText
							}
						>
							Grant Camera Access
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.secondaryButton}
						onPress={() => router.back()}
					>
						<Text
							style={
								styles.secondaryButtonText
							}
						>
							Cancel
						</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>
					Scan Desktop QR
				</Text>
				<Text style={styles.subtitle}>
					Align the QR code inside the frame to
					continue.
				</Text>
			</View>

			<View style={styles.cameraContainer}>
				<CameraView
					style={styles.camera}
					barcodeScannerSettings={{
						barcodeTypes: ["qr"],
					}}
					onBarcodeScanned={
						scanLocked
							? undefined
							: handleBarcodeScanned
					}
				>
					<View style={styles.scanFrame} />
				</CameraView>
			</View>

			<View style={styles.footer}>
				{errorMessage.length > 0 && (
					<Text style={styles.errorText}>
						{errorMessage}
					</Text>
				)}
				{scanLocked ? (
					<TouchableOpacity
						style={styles.primaryButton}
						onPress={() => {
							setErrorMessage("");
							setScanLocked(false);
						}}
					>
						<Text
							style={
								styles.primaryButtonText
							}
						>
							Scan Again
						</Text>
					</TouchableOpacity>
				) : (
					<TouchableOpacity
						style={styles.secondaryButton}
						onPress={() => router.back()}
					>
						<Text
							style={
								styles.secondaryButtonText
							}
						>
							Cancel
						</Text>
					</TouchableOpacity>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: AppColors.background,
	},
	header: {
		paddingHorizontal: AppSpacing.lg,
		paddingTop: AppSpacing.xl,
		paddingBottom: AppSpacing.md,
		alignItems: "center",
	},
	title: {
		fontSize: AppFontSizes.xl,
		fontWeight: "700",
		color: AppColors.textPrimary,
		marginBottom: AppSpacing.xs,
	},
	subtitle: {
		fontSize: AppFontSizes.sm,
		color: AppColors.textSecondary,
		textAlign: "center",
		lineHeight: 20,
	},
	cameraContainer: {
		flex: 1,
		marginHorizontal: AppSpacing.lg,
		borderRadius: AppBorderRadius.lg,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: AppColors.border,
	},
	camera: {
		flex: 1,
	},
	scanFrame: {
		position: "absolute",
		top: "20%",
		left: "15%",
		right: "15%",
		bottom: "20%",
		borderWidth: 2,
		borderRadius: AppBorderRadius.lg,
		borderColor: "rgba(59, 130, 246, 0.65)",
	},
	footer: {
		paddingHorizontal: AppSpacing.lg,
		paddingVertical: AppSpacing.xl,
		gap: AppSpacing.sm,
	},
	errorText: {
		fontSize: AppFontSizes.sm,
		textAlign: "center",
		color: AppColors.error,
	},
	permissionCard: {
		margin: AppSpacing.lg,
		padding: AppSpacing.lg,
		backgroundColor: AppColors.surface,
		borderRadius: AppBorderRadius.lg,
		borderWidth: 1,
		borderColor: AppColors.border,
		gap: AppSpacing.md,
	},
	primaryButton: {
		backgroundColor: AppColors.accent,
		borderRadius: AppBorderRadius.md,
		paddingVertical: AppSpacing.md,
		alignItems: "center",
	},
	primaryButtonText: {
		fontSize: AppFontSizes.md,
		fontWeight: "600",
		color: AppColors.textPrimary,
	},
	secondaryButton: {
		backgroundColor: AppColors.surface,
		borderRadius: AppBorderRadius.md,
		paddingVertical: AppSpacing.md,
		alignItems: "center",
		borderWidth: 1,
		borderColor: AppColors.border,
	},
	secondaryButtonText: {
		fontSize: AppFontSizes.md,
		fontWeight: "600",
		color: AppColors.textSecondary,
	},
});
