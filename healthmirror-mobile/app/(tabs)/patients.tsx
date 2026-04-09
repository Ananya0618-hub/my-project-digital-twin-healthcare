import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { useState, useEffect } from "react";

export default function Patients() {
  const [treatments, setTreatments] = useState([]);
  const [search, setSearch] = useState("");

  const API = "http://10.68.4.118:3001/api";

  useEffect(() => {
    fetch(`${API}/treatments/${aadhaar}`)
      .then(res => res.json())
      .then(data => setTreatments(data));
  }, []);

  const filtered = treatments.filter(t =>
    t.diagnosis.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patient History 🔍</Text>

      <TextInput
        placeholder="Search diagnosis..."
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />

      <ScrollView>
        {filtered.length === 0 ? (
          <Text>No results found</Text>
        ) : (
          filtered.map((t, i) => (
            <View key={i} style={styles.card}>
              <Text style={{ fontWeight: "bold" }}>{t.diagnosis}</Text>
              <Text>{t.medication}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 8
  },
  card: {
    padding: 10,
    backgroundColor: "#eef2ff",
    marginBottom: 10,
    borderRadius: 8
  }
});