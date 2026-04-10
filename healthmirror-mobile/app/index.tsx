import { useEffect } from "react";
import { useRouter } from "expo-router";
import { setUser } from "../utils/userStore"; 

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.replace("/login"); // 🔥 force login screen
    }, 100);
  }, []);

  return null;
}