import { API } from "../../constants/api";
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../utils/userStore";
import { palette, spacing, typography } from "../../constants/design";
import AppCard from "../../components/ui/AppCard";

type Treatment = {
  _id: string;
  diagnosis: string;
  medication: string;
};

export default function Patients() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [aadhaar, setAadhaar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const user = await getUser();
        const userAadhaar = user?.aadhaar || null;

        if (!userAadhaar) {
          Alert.alert("Error", "User not found ❌");
          return;
        }

        setAadhaar(userAadhaar);

        const res = await fetch(`${API}/treatments/${userAadhaar}`);
        const data = await res.json();
        setTreatments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.log("PATIENTS ERROR:", err);
        Alert.alert("Error", "Failed to load treatments ❌");
      } finally {
        setLoading(false);
      }
    };

    loadTreatments();
  }, []);

  const renderItem = ({ item }: { item: Treatment }) => (
    <AppCard style={{ marginBottom: spacing.md }}>
      <View style={styles.cardHeader}>
        <Ionicons name="document-text-outline" size={18} color={palette.primary} />
        <Text style={styles.cardTitle}>Treatment Record</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Diagnosis</Text>
        <Text style={styles.value}>{item.diagnosis}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Medication</Text>
        <Text style={styles.value}>{item.medication}</Text>
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Patient Treatments</Text>
      <Text style={styles.subtitle}>{aadhaar ? `Aadhaar: ${aadhaar}` : "Loading user..."}</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.emptyText}>Loading treatments...</Text>
        </View>
      ) : treatments.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>No treatments found</Text>
          <Text style={styles.emptyText}>Your treatment records will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={treatments}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: 24,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.ink700,
  },
  row: {
    marginBottom: 10,
  },
  label: {
    ...typography.label,
    marginBottom: 3,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.ink900,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.ink900,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: palette.ink500,
    textAlign: "center",
  },
});
