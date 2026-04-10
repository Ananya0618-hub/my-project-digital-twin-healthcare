import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { getUser, clearUser } from "../../utils/userStore";

export default function Dashboard() {
  const [aadhaar, setAadhaar] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      if (user) {
        setAadhaar(user.aadhaar || "");
        setName(user.name || "Patient");
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    await clearUser();
    router.replace("/login");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.welcome}>Welcome</Text>
        <Text style={styles.name}>{name || "HealthMirror User"}</Text>
        <Text style={styles.aadhaarLabel}>Aadhaar</Text>
        <Text style={styles.aadhaarValue}>{aadhaar || "Loading..."}</Text>
      </View>

      <Text style={styles.sectionTitle}>Health Summary</Text>


      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lab Reports</Text>
        <Text style={styles.cardValue}>Available</Text>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/patients")}>
        <Text style={styles.actionButtonText}>View Treatments</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/history")}>
        <Text style={styles.actionButtonText}>View History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(tabs)/add")}>
        <Text style={styles.actionButtonText}>Add Treatment</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.secondaryButton]}
        onPress={() => Alert.alert("Coming Soon", "Profile and Digital Twin summary can be added next.")}
      >
        <Text style={styles.secondaryButtonText}>Digital Twin Summary</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: "#2563eb",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  welcome: {
    fontSize: 14,
    color: "#dbeafe",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 4,
    marginBottom: 12,
  },
  aadhaarLabel: {
    fontSize: 12,
    color: "#dbeafe",
  },
  aadhaarValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1f2937",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  actionButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#e0ecff",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 10,
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

