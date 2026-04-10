import { API } from "../../constants/api";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { getUser } from "../../utils/userStore";

export default function Add() {
  const [diagnosis, setDiagnosis] = useState("");
  const [medication, setMedication] = useState("");
  const [aadhaar, setAadhaar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getUser();
        setAadhaar(user?.aadhaar || null);
      } catch (err) {
        console.log("LOAD USER ERROR:", err);
        Alert.alert("Error", "Failed to load user ❌");
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  const save = async () => {
    if (!diagnosis.trim() || !medication.trim()) {
      Alert.alert("Error", "Please fill all fields ❌");
      return;
    }

    if (!aadhaar) {
      Alert.alert("Error", "User not loaded ❌");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API}/treatments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aadhaar,
          diagnosis,
          medication,
        }),
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
      console.log("SAVE ERROR:", err);
      Alert.alert("Error", "Network error ❌");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>💊 Add Treatment</Text>
      <Text style={styles.subtitle}>
        Add a new treatment record for the logged-in patient.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Patient Aadhaar</Text>
        {loadingUser ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : (
          <Text style={styles.infoValue}>{aadhaar || "Not available"}</Text>
        )}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>Diagnosis</Text>
        <TextInput
          placeholder="Enter diagnosis"
          placeholderTextColor="#9ca3af"
          value={diagnosis}
          onChangeText={setDiagnosis}
          style={styles.input}
          multiline
        />

        <Text style={styles.fieldLabel}>Medication</Text>
        <TextInput
          placeholder="Enter medication details"
          placeholderTextColor="#9ca3af"
          value={medication}
          onChangeText={setMedication}
          style={[styles.input, styles.textArea]}
          multiline
        />

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? "Saving..." : "Save Treatment"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 14,
    fontSize: 15,
    color: "#111827",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
});