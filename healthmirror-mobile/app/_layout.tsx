import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* 🔐 Auth Screens FIRST */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />

      {/* 📱 Main App */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
