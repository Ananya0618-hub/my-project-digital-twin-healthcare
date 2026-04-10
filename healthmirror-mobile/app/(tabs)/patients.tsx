import { API } from "../../constants/api";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
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
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Treatment Record</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Diagnosis</Text>
        <Text style={styles.value}>{item.diagnosis}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Medication</Text>
        <Text style={styles.value}>{item.medication}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Patient Treatments</Text>

      <Text style={styles.subtitle}>
        {aadhaar ? `Aadhaar: ${aadhaar}` : "Loading user..."}
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.emptyText}>Loading treatments...</Text>
        </View>
      ) : treatments.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>No treatments found</Text>
          <Text style={styles.emptyText}>
            Your treatment records will appear here.
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 10,
  },
  row: {
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
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});

