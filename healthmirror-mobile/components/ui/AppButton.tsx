import { ActivityIndicator, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { palette, radius, spacing } from "../../constants/design";

type Variant = "primary" | "secondary" | "danger" | "outline";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
};

export default function AppButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  icon,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles[variant].container,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? palette.primary : palette.white} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, variantStyles[variant].label]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});

const variantStyles: Record<Variant, { container: ViewStyle; label: { color: string } }> = {
  primary: {
    container: { backgroundColor: palette.primary },
    label: { color: palette.white },
  },
  secondary: {
    container: { backgroundColor: palette.primarySoft },
    label: { color: palette.primary },
  },
  danger: {
    container: { backgroundColor: palette.danger },
    label: { color: palette.white },
  },
  outline: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: palette.primary,
    },
    label: { color: palette.primary },
  },
};
