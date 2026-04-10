import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";
import { useState, useEffect } from "react";
import { getUser } from "../../utils/userStore";

export default function Add() {
  const [diagnosis, setDiagnosis] = useState("");
  const [medication, setMedication] = useState("");
  const [aadhaar, setAadhaar] = useState<string | null>(null);

  const API = "http://10.68.4.118:3001/api";

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      setAadhaar(user?.aadhaar || null);
    };

    loadUser();
  }, []);

  const save = async () => {
    if (!diagnosis || !medication) {
      Alert.alert("Error", "Please fill all fields ❌");
      return;
    }

    if (!aadhaar) {
      Alert.alert("Error", "User not loaded ❌");
      return;
    }

    try {
      const res = await fetch(`${API}/treatments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          aadhaar,
          diagnosis,
          medication
        })
      });

      const data = await res.json();
      console.log("SAVE RESPONSE:", data);

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to save treatment ❌");
        return;
      }

      Alert.alert("Success", "Treatment saved ✅");
      setDiagnosis("");
      setMedication("");
    } catch (err) {
      console.log("ERROR:", err);
      Alert.alert("Error", "Network error ❌");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💊 Add Treatment</Text>

      <TextInput
        placeholder="Diagnosis"
        value={diagnosis}
        onChangeText={setDiagnosis}
        style={styles.input}
      />

      <TextInput
        placeholder="Medication"
        value={medication}
        onChangeText={setMedication}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
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