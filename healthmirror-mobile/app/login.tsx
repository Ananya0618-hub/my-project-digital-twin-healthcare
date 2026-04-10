import { API } from "../constants/api";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { setUser } from "../utils/userStore";

export default function Login() {
  const [aadhaar, setAadhaar] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();
  //const API = "http://10.68.7.207:3001/api";

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ aadhaar, password })
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (!res.ok || !data.aadhaar) {
        Alert.alert("Error", data.message || "Login failed ❌");
        return;
      }

      await setUser(data);

      Alert.alert("Success", "Login successful ✅");
      router.replace("/(tabs)");
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      Alert.alert("Error", "Network error ❌");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏥 HealthMirror</Text>

      <TextInput
        placeholder="Aadhaar"
        value={aadhaar}
        onChangeText={setAadhaar}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <Text onPress={() => router.push("/register")} style={styles.link}>
        Register
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, textAlign: "center", marginBottom: 20 },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  button: {
    backgroundColor: "#2E86DE",
    padding: 15,
    borderRadius: 10
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold"
  },
  link: {
    textAlign: "center",
    marginTop: 10
  }
});