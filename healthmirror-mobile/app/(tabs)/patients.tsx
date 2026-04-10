import { View, Text, FlatList, StyleSheet, Alert } from "react-native";
import { useEffect, useState } from "react";
import { getUser } from "../../utils/userStore";

export default function Patients() {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [aadhaar, setAadhaar] = useState<string | null>(null);

  const API = "http://10.68.4.118:3001/api";

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
        setTreatments(data);
      } catch (err) {
        console.log("PATIENTS ERROR:", err);
        Alert.alert("Error", "Failed to load treatments ❌");
      }
    };

    loadTreatments();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Patient Treatments</Text>

      <Text style={styles.subtitle}>Aadhaar: {aadhaar || "Not loaded"}</Text>

      <FlatList
        data={treatments}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.label}>Diagnosis: {item.diagnosis}</Text>
            <Text style={styles.label}>Medication: {item.medication}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No treatments found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10
  },
  subtitle: {
    marginBottom: 15,
    color: "#555"
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10
  },
  label: {
    fontSize: 16
  }
});