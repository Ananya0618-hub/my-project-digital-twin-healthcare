import { API } from "../constants/api";
import { palette, spacing, typography } from "../constants/design";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { setUser } from "../utils/userStore";
import AppInput from "../components/ui/AppInput";
import AppButton from "../components/ui/AppButton";

export default function Login() {
  const [aadhaar, setAadhaar] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    if (!aadhaar || !password) {
      Alert.alert("Error", "Please enter Aadhaar and password ❌");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar, password })
      });

      const data = await res.json();

      if (!res.ok || !data.aadhaar) {
        Alert.alert("Error", data.message || "Login failed ❌");
        return;
      }

      await setUser(data);

      router.replace("/(tabs)");
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      Alert.alert("Error", "Network error ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brandBlock}>
        <Text style={styles.logo}>🏥</Text>
        <Text style={styles.title}>HealthMirror</Text>
        <Text style={styles.subtitle}>Your Digital Twin Healthcare companion</Text>
      </View>

      <View style={styles.form}>
        <AppInput
          label="Aadhaar Number"
          placeholder="12-digit Aadhaar"
          value={aadhaar}
          onChangeText={setAadhaar}
          keyboardType="numeric"
        />

        <AppInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <AppButton label="Login" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.sm }} />

        <Text onPress={() => router.push("/register")} style={styles.link}>
          Don't have an account? <Text style={styles.linkStrong}>Register</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: "center",
    padding: spacing.xl,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: 44,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  form: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
  },
  link: {
    textAlign: "center",
    marginTop: spacing.lg,
    color: palette.ink500,
  },
  linkStrong: {
    color: palette.primary,
    fontWeight: "700",
  },
});
