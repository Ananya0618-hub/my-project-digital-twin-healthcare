import { API } from "../../constants/api";
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { getUser } from "../../utils/userStore";
import { palette, spacing, typography } from "../../constants/design";
import AppCard from "../../components/ui/AppCard";
import AppInput from "../../components/ui/AppInput";
import AppButton from "../../components/ui/AppButton";

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar, diagnosis, medication }),
      });

      const data = await res.json();

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
      <Text style={styles.subtitle}>Add a new treatment record for the logged-in patient.</Text>

      <AppCard soft style={{ marginBottom: spacing.lg }}>
        <Text style={styles.infoLabel}>Patient Aadhaar</Text>
        {loadingUser ? (
          <ActivityIndicator size="small" color={palette.primary} />
        ) : (
          <Text style={styles.infoValue}>{aadhaar || "Not available"}</Text>
        )}
      </AppCard>

      <AppCard>
        <AppInput
          label="Diagnosis"
          placeholder="Enter diagnosis"
          value={diagnosis}
          onChangeText={setDiagnosis}
          multiline
        />

        <AppInput
          label="Medication"
          placeholder="Enter medication details"
          value={medication}
          onChangeText={setMedication}
          multiline
          style={{ minHeight: 100, textAlignVertical: "top" }}
        />

        <AppButton
          label={saving ? "Saving..." : "Save Treatment"}
          onPress={save}
          loading={saving}
          style={{ marginTop: spacing.sm }}
        />
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 30,
  },
  title: {
    ...typography.h1,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  infoLabel: {
    ...typography.label,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.ink900,
  },
});
