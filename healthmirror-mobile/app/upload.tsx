// app/upload.tsx
import { View, Text, Button } from "react-native";

export default function Upload() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Upload Aadhaar Photo 📸</Text>
      <Button title="Upload Image" onPress={() => alert("Coming soon")} />
    </View>
  );
}