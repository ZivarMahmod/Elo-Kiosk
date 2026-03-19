/**
 * Shared category card component
 */

import { Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Category } from "@/core/types/category";

interface Props {
  category: Category;
  onPress?: () => void;
}

export function CategoryCard({ category, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: category.color || "#d5ddd8" }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.emoji}>{category.emoji || "\uD83D\uDCC1"}</Text>
      <Text style={styles.name}>{category.name}</Text>
      {category.subtitle ? <Text style={styles.subtitle}>{category.subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 140,
    borderRadius: 16,
    padding: 16,
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    elevation: 2,
  },
  emoji: { position: "absolute", top: 10, right: 12, fontSize: 36, opacity: 0.6 },
  name: { fontSize: 20, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 13, color: "#4a5a52", marginTop: 2 },
});
