import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Dashboard() {
  const [aadhaar, setAadhaar] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const data = await AsyncStorage.getItem("user");
      if (data) {
        const user = JSON.parse(data);
        setAadhaar(user.aadhaar);
      }
    };

    loadUser();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏥 HealthMirror</Text>

      <Text style={styles.label}>Aadhaar Number</Text>
      <Text style={styles.value}>{aadhaar || "Loading..."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, textAlign: "center" },
  label: { marginTop: 20, color: "gray" },
  value: { fontSize: 18, fontWeight: "bold" }
});