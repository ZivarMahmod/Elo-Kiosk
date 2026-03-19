/**
 * KIOSK VIEW — Customer-facing screen
 * 1920x1080 landscape layout based on existing kiosk app
 *
 * Layout:
 * +------------------------------------------+
 * | TOP BAR (52px) - Store name + hint       |
 * +------------------------+-----------------+
 * | MAIN CONTENT           | CART SIDEBAR    |
 * | (Categories/Products)  | (380px)         |
 * +------------------------+-----------------+
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { getAllOffers } from "@/core/database/offers";
import { createReceipt } from "@/core/database/receipts";
import type { Offer } from "@/core/types/offer";
import type { Product } from "@/core/types/product";
import type { Category } from "@/core/types/category";

type KioskView = "overview" | "category";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export default function KioskScreen() {
  const router = useRouter();
  const { categories, loading: catLoading } = useCategories(true);
  const { products, loading: prodLoading, getByCategory } = useProducts(true);
  const { settings } = useSettings();

  const [currentView, setCurrentView] = useState<KioskView>("overview");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptId, setReceiptId] = useState("");
  const [countdown, setCountdown] = useState(15);

  // Screensaver
  const [showScreensaver, setShowScreensaver] = useState(false);
  const screensaverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load offers
  useEffect(() => {
    if (settings.offersEnabled) {
      getAllOffers().then(setOffers).catch(console.error);
    }
  }, [settings.offersEnabled]);

  // Cart calculations
  const totalItems = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);
  const total = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.qty, 0), [cart]);

  // Screensaver timer
  const resetScreensaverTimer = useCallback(() => {
    setShowScreensaver(false);
    if (screensaverTimer.current) clearTimeout(screensaverTimer.current);
    const delay = (settings.screensaverDelay || 5) * 60 * 1000;
    screensaverTimer.current = setTimeout(() => {
      if (settings.screensaverEnabled) setShowScreensaver(true);
    }, delay);
  }, [settings.screensaverDelay, settings.screensaverEnabled]);

  useEffect(() => {
    resetScreensaverTimer();
    return () => { if (screensaverTimer.current) clearTimeout(screensaverTimer.current); };
  }, [resetScreensaverTimer]);

  // Navigation
  const openCategory = async (cat: Category) => {
    setSelectedCategory(cat);
    const prods = await getByCategory(cat.id);
    setCategoryProducts(prods);
    setCurrentView("category");
    resetScreensaverTimer();
  };

  const goHome = () => {
    setCurrentView("overview");
    setSelectedCategory(null);
    resetScreensaverTimer();
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.campaignPrice ?? product.price, qty: 1 }];
    });
    resetScreensaverTimer();
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => i.productId === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter((i) => i.qty > 0);
    });
    resetScreensaverTimer();
  };

  const clearCart = () => setCart([]);

  const getQty = (productId: string) => cart.find((i) => i.productId === productId)?.qty ?? 0;

  // Payment
  const handlePay = () => {
    if (total <= 0) return;
    const id = `${settings.receiptPrefix || "EK"}-${String(Date.now()).slice(-4)}`;
    setReceiptId(id);
    setCountdown(15);
    setShowPayment(true);
    resetScreensaverTimer();
  };

  const handleShowReceipt = async () => {
    const now = new Date();
    try {
      await createReceipt({
        kvittoNummer: receiptId,
        datum: now.toISOString().split("T")[0],
        tid: now.toTimeString().slice(0, 5),
        items: cart.map((item) => ({
          namn: item.name,
          antal: item.qty,
          prisStyck: item.price,
          prisTotal: item.price * item.qty,
        })),
        total,
        status: "ej_registrerad",
        tagged: false,
        betalning: "Swish",
      });
    } catch (err) {
      console.error("[Kiosk] Receipt error:", err);
    }
    setShowPayment(false);
    setShowReceipt(true);
    setCountdown(15);
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    clearCart();
    goHome();
  };

  // Countdown
  useEffect(() => {
    if (!showPayment && !showReceipt) return;
    if (countdown <= 0) {
      if (showPayment) setShowPayment(false);
      if (showReceipt) handleCloseReceipt();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, showPayment, showReceipt]);

  // Loading
  if (catLoading || prodLoading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#2c3e35" />
        <Text style={s.loadingText}>Laddar sortiment...</Text>
      </View>
    );
  }

  return (
    <View style={s.stage} onTouchStart={resetScreensaverTimer}>
      {/* TOP BAR */}
      <View style={s.topBar}>
        <Text style={s.topBarTitle}>{settings.storeName || "Elo Kiosk"}</Text>
        <View style={s.topBarRight}>
          <Text style={s.topBarHint}>VÄLJ &rarr; LÄGG I VAGNEN &rarr; BETALA</Text>
          <TouchableOpacity
            style={s.exitBtn}
            onPress={() => router.replace("/mode-select")}
          >
            <Ionicons name="exit-outline" size={18} color="#6b7c74" />
          </TouchableOpacity>
        </View>
      </View>

      {/* BODY */}
      <View style={s.body}>
        {/* MAIN */}
        <View style={s.mainContent}>
          {currentView === "overview" ? (
            <ScrollView style={s.overviewScroll} contentContainerStyle={s.overviewContent}>
              <Text style={s.sectionLabel}>TRYCK PÅ EN KATEGORI</Text>
              <Text style={s.sectionTitle}>Vad tar du idag?</Text>

              <View style={s.catGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catCard, { backgroundColor: cat.color || "#d5ddd8" }]}
                    onPress={() => openCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.catEmoji}>{cat.emoji || "\uD83D\uDED2"}</Text>
                    <Text style={s.catName}>{cat.name}</Text>
                    <Text style={s.catSub}>{cat.subtitle || ""}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Offers */}
              {settings.offersEnabled && offers.length > 0 && (
                <>
                  <Text style={s.offersTitle}>Just nu</Text>
                  <View style={s.offersGrid}>
                    {offers.map((offer) => (
                      <View key={offer.id} style={s.offerCard}>
                        <View style={s.offerInfo}>
                          <Text style={s.offerLabel}>ERBJUDANDE</Text>
                          <Text style={s.offerTitle2}>{offer.title}</Text>
                          <Text style={s.offerDesc}>{offer.description}</Text>
                          <Text style={s.offerPrice}>{offer.offerPrice} kr</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          ) : selectedCategory ? (
            <View style={s.categoryPage}>
              <View style={s.categoryTop}>
                <TouchableOpacity style={s.backBtn} onPress={goHome}>
                  <Text style={s.backBtnText}>&larr; Tillbaka</Text>
                </TouchableOpacity>
                <Text style={s.categoryHeading}>
                  {selectedCategory.emoji} {selectedCategory.name}
                </Text>
              </View>

              <ScrollView style={s.productScrollView} contentContainerStyle={s.productGrid}>
                {categoryProducts.map((product) => {
                  const q = getQty(product.id);
                  const displayPrice = product.campaignPrice ?? product.price;
                  return (
                    <View key={product.id} style={s.productCard}>
                      <View style={s.productImgBox}>
                        <Text style={s.productEmoji}>{selectedCategory.emoji || "\uD83D\uDED2"}</Text>
                        {product.badgeLabel ? (
                          <View style={[s.badge, { backgroundColor: product.badgeColor || "#f5a623" }]}>
                            <Text style={s.badgeText}>{product.badgeLabel}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={s.productInfoBox}>
                        <Text style={s.productName}>{product.name}</Text>
                        <View style={s.priceRow}>
                          <Text style={s.productPrice}>{displayPrice} kr</Text>
                          {product.campaignPrice != null && product.campaignPrice < product.price && (
                            <Text style={s.originalPrice}>{product.price} kr</Text>
                          )}
                        </View>
                        <View style={s.qtyRow}>
                          <TouchableOpacity
                            style={[s.qtyBtn, q === 0 && s.qtyBtnDim]}
                            onPress={() => updateQty(product.id, -1)}
                          >
                            <Text style={s.qtyBtnText}>&minus;</Text>
                          </TouchableOpacity>
                          <Text style={s.qtyVal}>{q}</Text>
                          <TouchableOpacity
                            style={s.qtyBtn}
                            onPress={() => addToCart(product)}
                          >
                            <Text style={s.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* CART SIDEBAR */}
        <View style={s.cartPanel}>
          <ScrollView style={s.cartTop} contentContainerStyle={s.cartTopContent}>
            <Text style={s.cartTitle}>Valda varor</Text>
            {cart.length === 0 ? (
              <Text style={s.cartEmpty}>Inga produkter valda ännu.</Text>
            ) : (
              cart.map((item) => (
                <View key={item.productId} style={s.cartItemRow}>
                  <Text style={s.cartItemName}>{item.qty} x {item.name}</Text>
                  <Text style={s.cartItemPrice}>{item.price * item.qty} kr</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={s.cartBottom}>
            <View style={s.cartCountRow}>
              <Text style={s.cartCountLabel}>Antal artiklar</Text>
              <Text style={s.cartCountVal}>{totalItems}</Text>
            </View>
            <View style={s.cartTotalRow}>
              <Text style={s.cartTotalLabel}>Totalt</Text>
              <Text style={s.cartTotalVal}>{total} kr</Text>
            </View>

            <TouchableOpacity
              style={[s.payBtn, total <= 0 && s.payBtnDisabled]}
              onPress={handlePay}
              disabled={total <= 0}
            >
              <Text style={s.payBtnText}>Betala med Swish</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.clearBtn, total <= 0 && { opacity: 0.3 }]}
              onPress={clearCart}
              disabled={total <= 0}
            >
              <Text style={s.clearBtnText}>Rensa val</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* PAYMENT MODAL */}
      <Modal visible={showPayment} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.paymentModal}>
            <View style={s.paymentHeader}>
              <Text style={s.paymentTitle}>Betala med Swish</Text>
              <View style={s.countdownBox}>
                <Text style={s.countdownNum}>{countdown}</Text>
                <Text style={s.countdownLabel}>sek</Text>
              </View>
            </View>

            <Text style={s.paymentAmount}>{total} kr</Text>
            <Text style={s.paymentMessage}>Kvitto: {receiptId}</Text>
            {settings.swishNumber ? (
              <Text style={s.paymentSwishNr}>Swish: {settings.swishNumber}</Text>
            ) : null}

            <TouchableOpacity style={s.receiptBtn} onPress={handleShowReceipt}>
              <Text style={s.receiptBtnText}>Visa kvitto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelPayBtn} onPress={() => setShowPayment(false)}>
              <Text style={s.cancelPayText}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RECEIPT MODAL */}
      <Modal visible={showReceipt} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.receiptModal}>
            <View style={s.receiptHeader}>
              <Text style={s.receiptLogo}>{settings.storeName}</Text>
              <View style={s.countdownBox}>
                <Text style={s.countdownNum}>{countdown}</Text>
                <Text style={s.countdownLabel}>sek</Text>
              </View>
            </View>

            <View style={s.receiptIdRow}>
              <Text style={s.receiptLabel}>KVITTO</Text>
              <Text style={s.receiptIdText}>#{receiptId}</Text>
            </View>

            <Text style={s.receiptTime}>{new Date().toLocaleString("sv-SE")}</Text>

            <View style={s.receiptItems}>
              {cart.map((item) => (
                <View key={item.productId} style={s.receiptItemRow}>
                  <Text style={s.receiptItemName}>{item.qty} x {item.name}</Text>
                  <Text style={s.receiptItemPrice}>{item.price * item.qty} kr</Text>
                </View>
              ))}
            </View>

            <View style={s.receiptDivider} />

            <View style={s.receiptTotalRow}>
              <Text style={s.receiptTotalLabel}>TOTALT</Text>
              <Text style={s.receiptTotalValue}>{total} kr</Text>
            </View>

            <Text style={s.receiptThankYou}>{settings.receiptThankYou}</Text>

            <TouchableOpacity style={s.receiptCloseBtn} onPress={handleCloseReceipt}>
              <Text style={s.receiptCloseBtnText}>Stäng & klar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SCREENSAVER */}
      {showScreensaver && (
        <TouchableOpacity
          style={s.screensaver}
          activeOpacity={1}
          onPress={() => { setShowScreensaver(false); resetScreensaverTimer(); }}
        >
          <View style={s.ssLogoWrapper}>
            <View style={s.ssRing} />
            <Text style={s.ssLogo}>EK</Text>
          </View>
          <Text style={s.ssTitle}>{settings.screensaverText || "Välkommen!"}</Text>
          <Text style={s.ssHint}>TRYCK VAR SOM HELST FÖR ATT BÖRJA</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  stage: { flex: 1, backgroundColor: "#e8f0ec" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f7f4" },
  loadingText: { marginTop: 12, color: "#6b7c74", fontSize: 18 },

  // Top Bar
  topBar: { height: 52, backgroundColor: "rgba(255,255,255,0.7)", borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 28 },
  topBarTitle: { fontSize: 32, fontStyle: "italic", color: "#2c3e35" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  topBarHint: { fontSize: 13, color: "#6b7c74", letterSpacing: 2, textTransform: "uppercase" },
  exitBtn: { padding: 8 },

  // Body
  body: { flex: 1, flexDirection: "row" },
  mainContent: { flex: 1 },

  // Overview
  overviewScroll: { flex: 1 },
  overviewContent: { padding: 28, paddingBottom: 60, gap: 20 },
  sectionLabel: { fontSize: 13, letterSpacing: 2, color: "#6b7c74", textTransform: "uppercase" },
  sectionTitle: { fontSize: 42, fontStyle: "italic", color: "#2c3e35", marginBottom: 8 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  catCard: { width: "23%", minHeight: 160, borderRadius: 18, padding: 18, justifyContent: "flex-end", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", elevation: 3 },
  catEmoji: { position: "absolute", top: 12, right: 14, fontSize: 44, opacity: 0.6 },
  catName: { fontSize: 28, fontStyle: "italic", color: "#2c3e35" },
  catSub: { fontSize: 15, color: "#6b7c74", marginTop: 2 },

  // Offers
  offersTitle: { fontSize: 32, fontStyle: "italic", color: "#2c3e35", marginTop: 8 },
  offersGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  offerCard: { width: "48%", backgroundColor: "#fdf8f0", borderWidth: 1, borderColor: "#e8c87a", borderRadius: 14, padding: 16 },
  offerInfo: { flex: 1 },
  offerLabel: { fontSize: 11, letterSpacing: 1.5, color: "#c47a3a", textTransform: "uppercase", marginBottom: 4 },
  offerTitle2: { fontSize: 22, fontStyle: "italic", color: "#2c3e35", marginBottom: 4 },
  offerDesc: { fontSize: 14, color: "#6b7c74" },
  offerPrice: { fontSize: 18, fontWeight: "700", color: "#c47a3a", marginTop: 6 },

  // Category
  categoryPage: { flex: 1 },
  categoryTop: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, paddingHorizontal: 28 },
  backBtn: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", borderRadius: 12, height: 56, width: 160, justifyContent: "center", alignItems: "center", elevation: 2 },
  backBtnText: { fontSize: 20, color: "#2c3e35" },
  categoryHeading: { fontSize: 36, fontStyle: "italic", color: "#2c3e35" },

  // Products
  productScrollView: { flex: 1 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 28, paddingBottom: 24 },
  productCard: { width: "19%", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", borderRadius: 14, overflow: "hidden", elevation: 3 },
  productImgBox: { height: 90, justifyContent: "center", alignItems: "center", backgroundColor: "#f8faf9" },
  productEmoji: { fontSize: 40 },
  badge: { position: "absolute", top: 6, left: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  productInfoBox: { padding: 10, flex: 1 },
  productName: { fontSize: 17, fontWeight: "700", color: "#2c3e35" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  productPrice: { fontSize: 16, fontStyle: "italic", color: "#c47a3a" },
  originalPrice: { fontSize: 13, color: "#aaa", textDecorationLine: "line-through" },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  qtyBtn: { width: 38, height: 38, backgroundColor: "rgba(91,143,168,0.12)", borderWidth: 2, borderColor: "rgba(91,143,168,0.3)", borderRadius: 8, justifyContent: "center", alignItems: "center" },
  qtyBtnDim: { opacity: 0.35 },
  qtyBtnText: { fontSize: 22, color: "#5b8fa8", fontWeight: "700" },
  qtyVal: { fontSize: 20, fontWeight: "700", color: "#2c3e35", minWidth: 28, textAlign: "center" },

  // Cart
  cartPanel: { width: 340, backgroundColor: "rgba(255,255,255,0.75)", borderLeftWidth: 1, borderLeftColor: "rgba(0,0,0,0.06)" },
  cartTop: { flex: 1 },
  cartTopContent: { padding: 16 },
  cartTitle: { fontSize: 24, fontStyle: "italic", color: "#2c3e35", marginBottom: 14 },
  cartEmpty: { fontSize: 16, color: "#8a9b93", lineHeight: 24 },
  cartItemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.08)", borderStyle: "dashed" },
  cartItemName: { fontSize: 17, color: "#2c3e35", flex: 1 },
  cartItemPrice: { fontSize: 17, color: "#6b7c74" },
  cartBottom: { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)", padding: 14, gap: 10 },
  cartCountRow: { flexDirection: "row", justifyContent: "space-between" },
  cartCountLabel: { fontSize: 16, color: "#6b7c74" },
  cartCountVal: { fontSize: 16, fontWeight: "700", color: "#2c3e35" },
  cartTotalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.08)", paddingTop: 10 },
  cartTotalLabel: { fontSize: 26, fontStyle: "italic", fontWeight: "700", color: "#2c3e35" },
  cartTotalVal: { fontSize: 26, fontStyle: "italic", fontWeight: "700", color: "#2c3e35" },
  payBtn: { backgroundColor: "#72383D", borderRadius: 12, paddingVertical: 14, alignItems: "center", elevation: 4 },
  payBtnDisabled: { opacity: 0.35 },
  payBtnText: { color: "#EFE9E1", fontSize: 22, fontWeight: "700" },
  clearBtn: { borderWidth: 1, borderColor: "#D1C7BD", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  clearBtnText: { color: "#AC9C8D", fontSize: 16 },

  // Payment Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  paymentModal: { backgroundColor: "#fff", borderRadius: 22, width: 500, padding: 28, elevation: 10, alignItems: "center" },
  paymentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 16 },
  paymentTitle: { fontSize: 26, fontStyle: "italic", color: "#2c3e35" },
  countdownBox: { flexDirection: "row", alignItems: "baseline", gap: 4, backgroundColor: "rgba(0,0,0,0.04)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  countdownNum: { fontSize: 24, fontWeight: "700", color: "#c47a3a" },
  countdownLabel: { fontSize: 14, color: "#6b7c74" },
  paymentAmount: { fontSize: 44, fontWeight: "700", color: "#c47a3a", marginVertical: 12 },
  paymentMessage: { fontSize: 18, color: "#6b7c74", marginBottom: 4 },
  paymentSwishNr: { fontSize: 16, color: "#6b7c74", marginBottom: 20 },
  receiptBtn: { height: 56, width: "100%", backgroundColor: "#5b8fa8", borderRadius: 12, justifyContent: "center", alignItems: "center", elevation: 4, marginBottom: 10 },
  receiptBtnText: { fontSize: 22, fontWeight: "700", color: "#fff" },
  cancelPayBtn: { padding: 10 },
  cancelPayText: { fontSize: 16, color: "#8a9b93" },

  // Receipt Modal
  receiptModal: { backgroundColor: "#fff", borderRadius: 22, width: 480, padding: 28, elevation: 10 },
  receiptHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  receiptLogo: { fontSize: 24, fontStyle: "italic", color: "#2c3e35" },
  receiptIdRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.08)", paddingBottom: 10, marginBottom: 8 },
  receiptLabel: { fontSize: 14, letterSpacing: 2, color: "#6b7c74" },
  receiptIdText: { fontSize: 26, fontWeight: "700", color: "#c47a3a" },
  receiptTime: { fontSize: 14, color: "#6b7c74", marginBottom: 12 },
  receiptItems: { gap: 4 },
  receiptItemRow: { flexDirection: "row", justifyContent: "space-between" },
  receiptItemName: { fontSize: 18, color: "#2c3e35" },
  receiptItemPrice: { fontSize: 18, color: "#2c3e35" },
  receiptDivider: { borderTopWidth: 1, borderStyle: "dashed", borderTopColor: "rgba(0,0,0,0.1)", marginVertical: 12 },
  receiptTotalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  receiptTotalLabel: { fontSize: 24, fontWeight: "700", color: "#2c3e35" },
  receiptTotalValue: { fontSize: 24, fontWeight: "700", color: "#2c3e35" },
  receiptThankYou: { fontSize: 16, fontStyle: "italic", color: "#6b7c74", textAlign: "center", marginVertical: 12 },
  receiptCloseBtn: { height: 52, backgroundColor: "#5b8fa8", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  receiptCloseBtnText: { fontSize: 20, fontWeight: "700", color: "#fff" },

  // Screensaver
  screensaver: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#322D29", justifyContent: "center", alignItems: "center", gap: 48, zIndex: 100 },
  ssLogoWrapper: { width: 160, height: 160, justifyContent: "center", alignItems: "center" },
  ssRing: { position: "absolute", width: 160, height: 160, borderRadius: 80, borderWidth: 3, borderColor: "#C9A84C" },
  ssLogo: { fontSize: 60, fontWeight: "700", color: "#ac9c8d" },
  ssTitle: { fontSize: 40, fontWeight: "700", color: "#EFE9E1", letterSpacing: 2 },
  ssHint: { fontSize: 20, color: "rgba(239,233,225,0.5)", letterSpacing: 4, textTransform: "uppercase" },
});
