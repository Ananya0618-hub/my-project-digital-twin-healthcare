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

export default function Register() {
  const [aadhaar, setAadhaar] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const router = useRouter();
  const API = "http://10.68.4.118:3001/api";

  const handleRegister = async () => {
    if (aadhaar.length !== 12) {
      Alert.alert("Error", "Aadhaar must be 12 digits ❌");
      return;
    }

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          aadhaar,   // ✅ matches backend
          password,
          name
        })
      });

      const data = await res.json();
      console.log("REGISTER RESPONSE:", data);

      if (data.message?.includes("❌")) {
        Alert.alert("Error", data.message);
      } else {
        Alert.alert("Success", "Registered successfully ✅");

        router.replace("/login");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Network error ❌");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 Register</Text>

      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        placeholder="Aadhaar (12 digits)"
        value={aadhaar}
        onChangeText={setAadhaar}
        keyboardType="numeric"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
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
  }
});