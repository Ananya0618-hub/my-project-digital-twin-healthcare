import { API } from "../../constants/api";
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../utils/userStore";
import { palette, spacing, typography } from "../../constants/design";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";

type Treatment = {
  _id: string;
  diagnosis: string;
  medication: string;
};

export default function History() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [aadhaar, setAadhaar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async (currentAadhaar?: string | null) => {
    const finalAadhaar = currentAadhaar || aadhaar;

    if (!finalAadhaar) {
      setLoading(false);
      Alert.alert("Error", "User not loaded ❌");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API}/treatments/${finalAadhaar}`);
      const data = await res.json();
      setTreatments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("HISTORY ERROR:", err);
      Alert.alert("Error", "Failed to load history ❌");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    Alert.alert("Delete Treatment", "Are you sure you want to delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${API}/treatments/${id}`, { method: "DELETE" });
            fetchData();
          } catch (err) {
            console.log("DELETE ERROR:", err);
            Alert.alert("Error", "Failed to delete record ❌");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    const loadUserAndData = async () => {
      const user = await getUser();
      const userAadhaar = user?.aadhaar || null;
      setAadhaar(userAadhaar);
      await fetchData(userAadhaar);
    };

    loadUserAndData();
  }, []);

  const renderItem = ({ item }: { item: Treatment }) => (
    <AppCard style={{ marginBottom: spacing.md }}>
      <View style={styles.cardHeader}>
        <Ionicons name="medkit-outline" size={18} color={palette.primary} />
        <Text style={styles.cardTitle}>Treatment Record</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Diagnosis</Text>
        <Text style={styles.value}>{item.diagnosis}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Medication</Text>
        <Text style={styles.value}>{item.medication}</Text>
      </View>

      <AppButton label="Delete" variant="danger" onPress={() => deleteItem(item._id)} style={{ marginTop: spacing.sm }} />
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 Treatment History</Text>
      <Text style={styles.subtitle}>{aadhaar ? `Aadhaar: ${aadhaar}` : "Loading user..."}</Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.emptyText}>Loading history...</Text>
        </View>
      ) : treatments.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>No treatment history found</Text>
          <Text style={styles.emptyText}>Your saved treatment records will appear here.</Text>
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
    fontSize: 17,
    fontWeight: "700",
    color: palette.ink700,
  },
  infoRow: {
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
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.ink900,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: palette.ink500,
    textAlign: "center",
    marginTop: 8,
  },
});
