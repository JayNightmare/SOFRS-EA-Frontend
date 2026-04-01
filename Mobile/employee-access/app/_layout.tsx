import { useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import "react-native-reanimated";

import { UserProvider } from "../contexts/user-context";
import { AppColors } from "@/constants/theme";
import { resolveDeepLinkRoute } from "@/lib/deeplink";

export default function RootLayout() {
	const router = useRouter();
	const lastHandledUrlRef = useRef<{ value: string; at: number } | null>(
		null,
	);

	useEffect(() => {
		let active = true;

		const handleIncomingUrl = (url: string | null | undefined) => {
			if (!url || !active) {
				return;
			}

			const now = Date.now();
			const lastHandled = lastHandledUrlRef.current;
			if (
				lastHandled &&
				lastHandled.value === url &&
				now - lastHandled.at < 1500
			) {
				return;
			}

			const route = resolveDeepLinkRoute(url);
			if (!route) {
				return;
			}

			lastHandledUrlRef.current = {
				value: url,
				at: now,
			};

			router.push(route);
		};

		void Linking.getInitialURL()
			.then((initialUrl) => {
				handleIncomingUrl(initialUrl);
			})
			.catch(() => {
				// Ignore malformed initial URL states.
			});

		const subscription = Linking.addEventListener(
			"url",
			(event) => {
				handleIncomingUrl(event.url);
			},
		);

		return () => {
			active = false;
			subscription.remove();
		};
	}, [router]);

	return (
		<UserProvider>
			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle: {
						backgroundColor:
							AppColors.background,
					},
					animation: "slide_from_right",
				}}
			>
				<Stack.Screen name="index" />
				<Stack.Screen name="identity-verification" />
				<Stack.Screen name="face-setup" />
				<Stack.Screen name="face-scan" />
				<Stack.Screen
					name="scan-qr"
					options={{
						animation: "slide_from_bottom",
					}}
				/>
				<Stack.Screen name="setup-success" />
				<Stack.Screen
					name="(dashboard)"
					options={{
						gestureEnabled: false,
						animation: "fade",
					}}
				/>
				<Stack.Screen
					name="relay-capture"
					options={{
						animation: "slide_from_bottom",
					}}
				/>
			</Stack>
			<StatusBar style="light" />
		</UserProvider>
	);
}
