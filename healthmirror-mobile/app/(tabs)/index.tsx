import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { API } from "../../constants/api";
import { getUser, clearUser } from "../../utils/userStore";
import { palette, radius, spacing, typography, shadow } from "../../constants/design";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";

type PatientProfile = {
  name?: string;
  mobile?: string;
  email?: string;
  address?: string;
  dob?: string;
};

export default function Dashboard() {
  const [aadhaar, setAadhaar] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      if (user) {
        setAadhaar(user.aadhaar || "");
        setName(user.name || "Patient");

        try {
          const res = await fetch(`${API}/patients/${user.aadhaar}`);
          if (res.ok) {
            const data = await res.json();
            setProfile(data);
          }
        } catch (err) {
          console.log("PROFILE FETCH ERROR:", err);
        }
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
        <Text style={styles.welcome}>Welcome back</Text>
        <Text style={styles.name}>{name || "HealthMirror User"}</Text>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.aadhaarLabel}>Aadhaar</Text>
            <Text style={styles.aadhaarValue}>{aadhaar || "Loading..."}</Text>
          </View>
        </View>
      </View>

      {profile && (profile.mobile || profile.email || profile.address || profile.dob) && (
        <>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <AppCard style={{ marginBottom: spacing.lg }}>
            {profile.dob ? <ProfileRow icon="calendar-outline" label="Date of Birth" value={profile.dob} /> : null}
            {profile.mobile ? <ProfileRow icon="call-outline" label="Mobile" value={profile.mobile} /> : null}
            {profile.email ? <ProfileRow icon="mail-outline" label="Email" value={profile.email} /> : null}
            {profile.address ? <ProfileRow icon="location-outline" label="Address" value={profile.address} last /> : null}
          </AppCard>
        </>
      )}

      <Text style={styles.sectionTitle}>Health Summary</Text>

      <AppCard style={{ marginBottom: spacing.lg }}>
        <Text style={styles.cardLabel}>Lab Reports</Text>
        <Text style={styles.cardValue}>Available</Text>
      </AppCard>

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <AppButton
        label="View Treatments"
        icon={<Ionicons name="people-outline" size={18} color={palette.white} />}
        onPress={() => router.push("/(tabs)/patients")}
        style={{ marginBottom: spacing.md }}
      />

      <AppButton
        label="View History"
        icon={<Ionicons name="time-outline" size={18} color={palette.white} />}
        onPress={() => router.push("/(tabs)/history")}
        style={{ marginBottom: spacing.md }}
      />

      <AppButton
        label="Add Treatment"
        icon={<Ionicons name="add-circle-outline" size={18} color={palette.white} />}
        onPress={() => router.push("/(tabs)/add")}
        style={{ marginBottom: spacing.md }}
      />

      <AppButton
        label="Digital Twin Summary"
        variant="secondary"
        icon={<Ionicons name="body-outline" size={18} color={palette.primary} />}
        onPress={() => Alert.alert("Coming Soon", "Profile and Digital Twin summary can be added next.")}
        style={{ marginBottom: spacing.md }}
      />

      <AppButton label="Logout" variant="danger" onPress={handleLogout} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.profileRow, last && { marginBottom: 0 }]}>
      <Ionicons name={icon} size={18} color={palette.primary} style={{ marginTop: 2 }} />
      <View style={{ marginLeft: spacing.sm, flex: 1 }}>
        <Text style={styles.profileLabel}>{label}</Text>
        <Text style={styles.profileValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: palette.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.floating,
  },
  welcome: {
    fontSize: 14,
    color: palette.primarySoft,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: palette.white,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  aadhaarLabel: {
    fontSize: 12,
    color: palette.primarySoft,
  },
  aadhaarValue: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.white,
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  cardLabel: {
    ...typography.label,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.ink900,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  profileLabel: {
    ...typography.label,
    marginBottom: 2,
  },
  profileValue: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.ink900,
  },
});
