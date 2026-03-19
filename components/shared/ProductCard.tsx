/**
 * Shared product card component
 */

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Product } from "@/core/types/product";
import { Badge } from "./Badge";

interface Props {
  product: Product;
  emoji?: string;
  qty?: number;
  onAdd?: () => void;
  onRemove?: () => void;
}

export function ProductCard({ product, emoji, qty = 0, onAdd, onRemove }: Props) {
  const displayPrice = product.campaignPrice ?? product.price;
  const hasCampaign = product.campaignPrice != null && product.campaignPrice < product.price;

  return (
    <View style={styles.card}>
      <View style={styles.imageBox}>
        <Text style={styles.emoji}>{emoji || "\uD83D\uDED2"}</Text>
        {product.badgeLabel ? (
          <Badge label={product.badgeLabel} color={product.badgeColor} />
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{displayPrice} kr</Text>
          {hasCampaign && (
            <Text style={styles.originalPrice}>{product.price} kr</Text>
          )}
        </View>
        {onAdd && onRemove && (
          <View style={styles.qtyRow}>
            <TouchableOpacity style={[styles.qtyBtn, qty === 0 && { opacity: 0.3 }]} onPress={onRemove}>
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyVal}>{qty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={onAdd}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", elevation: 2 },
  imageBox: { height: 90, justifyContent: "center", alignItems: "center", backgroundColor: "#f8faf9" },
  emoji: { fontSize: 40 },
  info: { padding: 10 },
  name: { fontSize: 16, fontWeight: "700", color: "#2c3e35" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  price: { fontSize: 15, fontStyle: "italic", color: "#c47a3a" },
  originalPrice: { fontSize: 12, color: "#aaa", textDecorationLine: "line-through" },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  qtyBtn: { width: 34, height: 34, backgroundColor: "rgba(91,143,168,0.12)", borderRadius: 8, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 20, fontWeight: "700", color: "#5b8fa8" },
  qtyVal: { fontSize: 18, fontWeight: "700", color: "#2c3e35" },
});
