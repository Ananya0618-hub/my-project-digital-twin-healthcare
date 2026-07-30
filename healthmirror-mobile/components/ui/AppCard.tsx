import { View, StyleSheet, ViewStyle } from "react-native";
import { palette, radius, spacing, shadow } from "../../constants/design";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  soft?: boolean; // borderless, subtle background variant
};

export default function AppCard({ children, style, soft = false }: Props) {
  return (
    <View style={[soft ? styles.soft : styles.card, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.card,
  },
  soft: {
    backgroundColor: palette.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
