import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { palette, radius, spacing, typography } from "../../constants/design";

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export default function AppInput({ label, error, style, ...rest }: Props) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={palette.ink300}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    marginBottom: 6,
  },
  input: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    fontSize: 15,
    color: palette.ink900,
  },
  inputError: {
    borderColor: palette.danger,
  },
  error: {
    color: palette.danger,
    fontSize: 12,
    marginTop: 4,
  },
});
