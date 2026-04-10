import { API } from "../../constants/api";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { getUser } from "../../utils/userStore";

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

      console.log("HISTORY:", data);
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
            await fetch(`${API}/treatments/${id}`, {
              method: "DELETE",
            });

            Alert.alert("Deleted ✅");
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
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

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteItem(item._id)}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 Treatment History</Text>
      <Text style={styles.subtitle}>
        {aadhaar ? `Aadhaar: ${aadhaar}` : "Loading user..."}
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.emptyText}>Loading history...</Text>
        </View>
      ) : treatments.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>No treatment history found</Text>
          <Text style={styles.emptyText}>
            Your saved treatment records will appear here.
          </Text>
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
    backgroundColor: "#f4f7fb",
    padding: 16,
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
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1f2937",
  },
  infoRow: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 3,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  deleteBtn: {
    marginTop: 8,
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
});