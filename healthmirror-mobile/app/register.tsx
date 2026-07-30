import { API } from "../constants/api";
import { palette, spacing, typography } from "../constants/design";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { setUser } from "../utils/userStore";
import AppInput from "../components/ui/AppInput";
import AppButton from "../components/ui/AppButton";

export default function Register() {
  const [aadhaar, setAadhaar] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name ❌");
      return;
    }
    if (aadhaar.length !== 12) {
      Alert.alert("Error", "Aadhaar must be 12 digits ❌");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please choose a password ❌");
      return;
    }
    if (mobile && mobile.length !== 10) {
      Alert.alert("Error", "Mobile number must be 10 digits ❌");
      return;
    }

    try {
      setLoading(true);
      console.log("API URL:", API);

      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar, password, name, mobile, email, address, dob })
      });

      const data = await res.json();

      if (!res.ok || data.message?.includes("❌")) {
        Alert.alert("Error", data.message || "Registration failed ❌");
        return;
      }

      await setUser({ aadhaar, name });

      Alert.alert("Success", "Registered successfully ✅");
      router.replace("/login");
    } catch (err) {
      console.log(err);
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <Text style={styles.logo}>📝</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join HealthMirror in a couple of steps</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formSectionLabel}>Personal Details</Text>

          <AppInput label="Full Name" placeholder="Your name" value={name} onChangeText={setName} />

          <AppInput
            label="Date of Birth"
            placeholder="DD/MM/YYYY"
            value={dob}
            onChangeText={setDob}
          />

          <AppInput
            label="Mobile Number"
            placeholder="10-digit mobile"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="numeric"
            maxLength={10}
          />

          <AppInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <AppInput
            label="Address"
            placeholder="Your address"
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <Text style={styles.formSectionLabel}>Account</Text>

          <AppInput
            label="Aadhaar Number"
            placeholder="12-digit Aadhaar"
            value={aadhaar}
            onChangeText={setAadhaar}
            keyboardType="numeric"
            maxLength={12}
          />

          <AppInput
            label="Password"
            placeholder="Choose a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <AppButton label="Register" onPress={handleRegister} loading={loading} style={{ marginTop: spacing.sm }} />

          <Text onPress={() => router.push("/login")} style={styles.link}>
            Already have an account? <Text style={styles.linkStrong}>Login</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: 40,
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
  formSectionLabel: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
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
