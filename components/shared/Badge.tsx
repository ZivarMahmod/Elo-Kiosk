/**
 * Badge component used by both kiosk and admin
 */

import { View, Text, StyleSheet } from "react-native";

interface Props {
  label: string;
  color?: string;
  textColor?: string;
}

export function Badge({ label, color = "#f5a623", textColor = "#fff" }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
});
