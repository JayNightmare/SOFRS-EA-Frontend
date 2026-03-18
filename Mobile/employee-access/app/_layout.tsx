import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { UserProvider } from "../contexts/user-context";
import { AppColors } from "@/constants/theme";

export default function RootLayout() {
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
				<Stack.Screen name="setup-success" />
				<Stack.Screen
					name="(dashboard)"
					options={{
						gestureEnabled: false,
						animation: "fade",
					}}
				/>
			</Stack>
			<StatusBar style="light" />
		</UserProvider>
	);
}
