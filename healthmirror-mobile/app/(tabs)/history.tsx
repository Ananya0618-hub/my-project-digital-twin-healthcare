import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert
} from "react-native";
import { useEffect, useState } from "react";
import { getUser } from "../../utils/userStore";

export default function History() {
  const [treatments, setTreatments] = useState([]);

  const API = "http://10.68.4.118:3001/api";

  const user = getUser();
  const aadhaar = user?.aadhaar; // 

  const fetchData = async () => {
    try {
      const res = await fetch(`${API}/treatments/${aadhaar}`);
      const data = await res.json();

      console.log("HISTORY:", data);

      setTreatments(data);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to load ❌");
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`${API}/treatments/${id}`, {
        method: "DELETE"
      });

      Alert.alert("Deleted ✅");

      fetchData();
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.label}>Diagnosis</Text>
      <Text style={styles.value}>{item.diagnosis}</Text>

      <Text style={styles.label}>Medication</Text>
      <Text style={styles.value}>{item.medication}</Text>

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

      {treatments.length === 0 ? (
        <Text>No data found</Text>
      ) : (
        <FlatList
          data={treatments}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },

  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10
  },

  label: { color: "gray" },
  value: { fontWeight: "bold", marginBottom: 5 },

  deleteBtn: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 8,
    marginTop: 10
  },

  deleteText: {
    color: "white",
    textAlign: "center"
  }
});