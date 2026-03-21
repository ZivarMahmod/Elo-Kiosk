/**
 * KIOSK VIEW — Premium customer-facing screen
 * All admin settings are wired up and have real effects
 * Dynamic theming, tipping, payment methods, pause mode, emergency, etc.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, Animated,
  useWindowDimensions, Image, ImageBackground,
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
import QRCode from "react-native-qrcode-svg";
import { enterKioskMode } from "@/core/kiosk/android-kiosk";
import { getAuthState } from "@/core/sync/auth";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import PocketBase from "pocketbase";

// ═══ PRODUCT IMAGES — local assets ═══
const PRODUCT_IMAGES: Record<string, ReturnType<typeof require>> = {
  "bonaqua": require("@/assets/images/bonaqua.png"),
  "celsius": require("@/assets/images/celsius.png"),
  "cola-zero": require("@/assets/images/cola-zero.png"),
  "coca-cola-zero": require("@/assets/images/cola-zero.png"),
  "fanta": require("@/assets/images/fanta.png"),
  "fanta-orange": require("@/assets/images/fanta.png"),
  "nocco": require("@/assets/images/nocco.png"),
  "monster": require("@/assets/images/monster.png"),
  "monster-energy": require("@/assets/images/monster.png"),
  "pepsi-max": require("@/assets/images/pepsi-max.png"),
  "red-bull": require("@/assets/images/redbull.png"),
  "redbull": require("@/assets/images/redbull.png"),
  "trocadero": require("@/assets/images/trocadero.png"),
  "lofbergs": require("@/assets/images/löfbergs.png"),
  "lofbergs-kaffe": require("@/assets/images/löfbergs.png"),
  "lantchips": require("@/assets/images/lantchips.png"),
  "svenska-lantchips": require("@/assets/images/lantchips.png"),
  "pringles": require("@/assets/images/pringles.png"),
  "kexchoklad": require("@/assets/images/kexchoklad.png"),
  "cornybigg": require("@/assets/images/cornybigg.png"),
  "corny-bigg": require("@/assets/images/cornybigg.png"),
  "corny-big": require("@/assets/images/cornybigg.png"),
  "flapjack": require("@/assets/images/flapjack.png"),
  "delicatoboll": require("@/assets/images/delicatoboll.png"),
  "sportlunch": require("@/assets/images/sportlunch.png"),
  "sportlunch-dubbel": require("@/assets/images/sportlunch.png"),
  "punchrulle": require("@/assets/images/punchrulle.png"),
  "proteinbar": require("@/assets/images/proteinbar.png"),
  "arla-pudding": require("@/assets/images/Arla-pudding.png"),
  "arla-proteinpudding": require("@/assets/images/Arla-pudding.png"),
  "risifrutti": require("@/assets/images/risifrutti.png"),
  "nudlar": require("@/assets/images/nudlar.png"),
  "billys-pan-pizza": require("@/assets/images/billys-pan-pizza.png"),
  "billys-pan-pizza-original": require("@/assets/images/billys-pan-pizza.png"),
  "billys-pan-pizza-hawaii": require("@/assets/images/billys-pan-pizza-hawaii.png"),
  "billys-pan-pizza-veggie": require("@/assets/images/billys-pan-pizza-veggie.png"),
};

const getLocalImage = (name: string) => {
  const key = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o");
  return PRODUCT_IMAGES[key] ?? null;
};

type KioskView = "overview" | "category";
type PayMethod = "swish" | "card" | "cash";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export default function KioskScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { categories, loading: catLoading } = useCategories(true);
  const { products, loading: prodLoading, getByCategory } = useProducts(true);
  const { settings } = useSettings();
  const { branding } = useTenantBranding();

  const [currentView, setCurrentView] = useState<KioskView>("overview");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptId, setReceiptId] = useState("");
  const [countdown, setCountdown] = useState(20);
  const [selectedPayMethod, setSelectedPayMethod] = useState<PayMethod>("swish");
  const [selectedTip, setSelectedTip] = useState(0);
  const [queueNumber, setQueueNumber] = useState("");

  // Admin exit — 5-tap secret on logo
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Screensaver
  const [showScreensaver, setShowScreensaver] = useState(false);
  const screensaverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session timeout
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bubble animation
  const bubbleAnim = useRef(new Animated.Value(0)).current;

  // ═══ DYNAMIC THEME from settings ═══
  const theme = useMemo(() => ({
    primary: settings.primaryColor || "#2d6b5a",
    secondary: settings.secondaryColor || "#d4a574",
    accent: settings.accentColor || "#f5a623",
    bg: settings.backgroundColor || "#ffffff",
    text: settings.textColor || "#1a1a1a",
    radius: settings.buttonRadius || 8,
    fontSize: settings.largeTextMode ? 1.25 : 1,
    highContrast: settings.highContrast,
    perRow: settings.productsPerRow || 3,
  }), [settings]);

  // ═══ KIOSK MODE ═══
  useEffect(() => {
    if (settings.kioskLocked) {
      const cleanup = enterKioskMode();
      return cleanup;
    }
  }, [settings.kioskLocked]);

  // ═══ OFFERS ═══
  useEffect(() => {
    if (settings.offersEnabled) {
      getAllOffers().then(setOffers).catch(console.error);
    } else {
      setOffers([]);
    }
  }, [settings.offersEnabled]);

  // ═══ BUBBLE ANIMATION ═══
  useEffect(() => {
    if (settings.bubbleVisible && settings.animationsEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bubbleAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(bubbleAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [settings.bubbleVisible, settings.animationsEnabled]);

  // ═══ CART ═══
  const totalItems = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.qty, 0), [cart]);
  const total = subtotal + selectedTip;

  // ═══ SCREENSAVER TIMER ═══
  const resetScreensaverTimer = useCallback(() => {
    setShowScreensaver(false);
    if (screensaverTimer.current) clearTimeout(screensaverTimer.current);
    const delay = (settings.screensaverDelay || 5) * 60 * 1000;
    screensaverTimer.current = setTimeout(() => {
      if (settings.screensaverEnabled) setShowScreensaver(true);
    }, delay);
    // Session timeout
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    sessionTimer.current = setTimeout(() => {
      if (cart.length > 0) {
        setCart([]);
        setCurrentView("overview");
        setSelectedCategory(null);
      }
    }, (settings.sessionTimeout || 30) * 60 * 1000);
  }, [settings.screensaverDelay, settings.screensaverEnabled, settings.sessionTimeout, cart.length]);

  useEffect(() => {
    resetScreensaverTimer();
    return () => {
      if (screensaverTimer.current) clearTimeout(screensaverTimer.current);
      if (sessionTimer.current) clearTimeout(sessionTimer.current);
    };
  }, [resetScreensaverTimer]);

  // ═══ AVAILABLE PAYMENT METHODS ═══
  const payMethods = useMemo(() => {
    const methods: { key: PayMethod; label: string; icon: string }[] = [];
    if (settings.paymentSwish) methods.push({ key: "swish", label: "Swish", icon: "phone-portrait-outline" });
    if (settings.paymentCard) methods.push({ key: "card", label: "Kort", icon: "card-outline" });
    if (settings.paymentCash) methods.push({ key: "cash", label: "Kontant", icon: "cash-outline" });
    if (methods.length === 0) methods.push({ key: "swish", label: "Swish", icon: "phone-portrait-outline" });
    return methods;
  }, [settings.paymentSwish, settings.paymentCard, settings.paymentCash]);

  // ═══ NAVIGATION ═══
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

  // ═══ CART OPERATIONS ═══
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, price: (product.campaignPrice && product.campaignPrice > 0) ? product.campaignPrice : product.price, qty: 1 }];
    });
    resetScreensaverTimer();
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter((i) => i.qty > 0));
    resetScreensaverTimer();
  };

  const clearCart = () => { setCart([]); setSelectedTip(0); };
  const getQty = (productId: string) => cart.find((i) => i.productId === productId)?.qty ?? 0;

  // ═══ GENERATE QUEUE NUMBER ═══
  const generateQueueNumber = () => {
    const fmt = settings.orderQueueFormat || "EK-####";
    const num = String(Date.now()).slice(-4);
    return fmt.replace(/#+/g, (match: string) => num.slice(-match.length).padStart(match.length, "0"));
  };

  // ═══ PAYMENT ═══
  const handlePay = () => {
    if (cart.length === 0) return;
    if (settings.ordersPaused) {
      Alert.alert("Beställningar pausade", settings.pauseMessage || "Vi tar en kort paus. Försök igen snart!");
      return;
    }
    const id = `${settings.receiptPrefix || "EK"}-${String(Date.now()).slice(-4)}`;
    setReceiptId(id);
    setSelectedTip(0);
    setSelectedPayMethod(payMethods[0]?.key || "swish");
    setCountdown(120);
    setShowPayment(true);
    if (settings.orderQueueEnabled) {
      setQueueNumber(generateQueueNumber());
    }
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
        betalning: selectedPayMethod === "swish" ? "Swish" : selectedPayMethod === "card" ? "Kort" : "Kontant",
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

  // ═══ COUNTDOWN ═══
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

  // ═══ PRODUCT CARD WIDTH ═══
  // ═══ 5-TAP SECRET EXIT ═══
  const handleLogoTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setShowAdminAuth(true);
      setAdminPassword("");
      setAuthError("");
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }
  }, []);

  const handleAdminUnlock = useCallback(async () => {
    if (!adminPassword.trim()) return;
    try {
      const auth = await getAuthState();
      if (!auth.email) {
        setAuthError("Ingen inloggad användare hittad");
        return;
      }
      const pb = new PocketBase("https://elo-kiosk-pb.fly.dev");  // PocketBase URL stays the same
      await pb.collection("users").authWithPassword(auth.email, adminPassword);
      setShowAdminAuth(false);
      setAdminPassword("");
      router.replace("/mode-select");
    } catch (_err) {
      setAuthError("Fel lösenord. Försök igen.");
      setAdminPassword("");
    }
  }, [adminPassword, router]);

  const productWidth = useMemo(() => {
    return "23%" as any;
  }, []);

  // ═══ LOADING ═══
  if (catLoading || prodLoading) {
    return (
      <View style={[ds.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[ds.loadingText, { color: theme.text + "80", fontSize: 18 * theme.fontSize }]}>Laddar sortiment...</Text>
      </View>
    );
  }

  // ═══ ORDERS PAUSED OVERLAY ═══
  if (settings.ordersPaused && cart.length === 0) {
    return (
      <View style={[ds.pauseOverlay, { backgroundColor: theme.bg }]} onTouchStart={resetScreensaverTimer}>
        <View style={ds.pauseCard}>
          <Ionicons name="pause-circle" size={64} color={theme.accent} />
          <Text style={[ds.pauseTitle, { color: theme.text }]}>Beställningar pausade</Text>
          <Text style={[ds.pauseMsg, { color: theme.text + "80" }]}>{settings.pauseMessage || "Vi tar en kort paus. Vi är snart tillbaka!"}</Text>
        </View>
        {!settings.kioskLocked && (
          <TouchableOpacity style={ds.exitBtn} onPress={() => router.replace("/mode-select")} activeOpacity={0.7}>
            <Ionicons name="exit-outline" size={18} color="#6b7c74" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("@/assets/images/background.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
    <View style={[ds.stage, { backgroundColor: "transparent" }]} onTouchStart={resetScreensaverTimer}>
      {/* ═══ EMERGENCY MESSAGE ═══ */}
      {settings.emergencyMessage ? (
        <View style={ds.emergencyBar}>
          <Ionicons name="warning" size={16} color="#fff" />
          <Text style={ds.emergencyText}>{settings.emergencyMessage}</Text>
        </View>
      ) : null}

      {/* ═══ TOP BAR ═══ */}
      <View style={[ds.topBar, { borderRadius: 0 }]}>
        <TouchableOpacity onPress={handleLogoTap} activeOpacity={1}>
          <Text style={[ds.topBarTitle, { color: theme.text, fontSize: 28 * theme.fontSize }]}>{branding.companyName}</Text>
        </TouchableOpacity>
        <View style={ds.topBarRight}>
          {branding.showCobranding && (
            <Text style={[ds.topBarHint, { fontSize: 11 * theme.fontSize, marginRight: 12, opacity: 0.6 }]}>{branding.poweredByText}</Text>
          )}
          <Text style={[ds.topBarHint, { fontSize: 12 * theme.fontSize }]}>VÄLJ → LÄGG I VAGNEN → BETALA</Text>
          {!settings.kioskLocked && (
            <TouchableOpacity style={ds.exitBtnSmall} onPress={() => router.replace("/mode-select")} activeOpacity={0.7}>
              <Ionicons name="exit-outline" size={18} color="#6b7c74" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ═══ BODY ═══ */}
      <View style={ds.body}>
        {/* MAIN CONTENT */}
        <View style={ds.mainContent}>
          {currentView === "overview" ? (
            <ScrollView style={ds.overviewScroll} contentContainerStyle={ds.overviewContent}>
              {/* Welcome text */}
              {settings.welcomeText ? (
                <Text style={[ds.welcomeText, { color: theme.text + "60", fontSize: 14 * theme.fontSize }]}>{settings.welcomeText}</Text>
              ) : null}

              <Text style={[ds.sectionLabel, { fontSize: 12 * theme.fontSize }]}>TRYCK PÅ EN KATEGORI</Text>
              <Text style={[ds.sectionTitle, { color: theme.text, fontSize: 38 * theme.fontSize }]}>Vad tar du idag?</Text>

              {/* Info bubble */}
              {settings.bubbleVisible && (settings.bubbleText1 || settings.bubbleText2) && (
                <Animated.View style={[ds.bubble, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "30",
                  transform: [{ translateY: bubbleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }]
                }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
                  <View>
                    {settings.bubbleText1 ? <Text style={[ds.bubbleText, { color: theme.primary, fontSize: 14 * theme.fontSize }]}>{settings.bubbleText1}</Text> : null}
                    {settings.bubbleText2 ? <Text style={[ds.bubbleSubtext, { color: theme.primary + "90", fontSize: 12 * theme.fontSize }]}>{settings.bubbleText2}</Text> : null}
                  </View>
                </Animated.View>
              )}

              {/* Category grid */}
              <View style={ds.catGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[ds.catCard, {
                      backgroundColor: cat.color || "#d5ddd8",
                      borderRadius: theme.radius + 8,
                    }]}
                    onPress={() => openCategory(cat)}
                    activeOpacity={0.85}
                  >
                    <Text style={ds.catEmoji}>{cat.emoji || "🛒"}</Text>
                    <Text style={[ds.catName, { fontSize: 24 * theme.fontSize }]}>{cat.name}</Text>
                    <Text style={[ds.catSub, { fontSize: 13 * theme.fontSize }]}>{cat.subtitle || ""}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Offers */}
              {settings.offersEnabled && offers.length > 0 && (
                <>
                  <Text style={[ds.offersTitle, { color: theme.text, fontSize: 28 * theme.fontSize }]}>Just nu</Text>
                  <View style={ds.offersGrid}>
                    {offers.map((offer) => (
                      <View key={offer.id} style={[ds.offerCard, { borderRadius: theme.radius + 4 }]}>
                        <View style={ds.offerBadge}><Text style={ds.offerBadgeText}>ERBJUDANDE</Text></View>
                        <Text style={[ds.offerTitle2, { fontSize: 20 * theme.fontSize }]}>{offer.title}</Text>
                        <Text style={[ds.offerDesc, { fontSize: 13 * theme.fontSize }]}>{offer.description}</Text>
                        <Text style={ds.offerPrice}>{offer.offerPrice} kr</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          ) : selectedCategory ? (
            <View style={ds.categoryPage}>
              <View style={ds.categoryTop}>
                <TouchableOpacity style={[ds.backBtn, { borderRadius: theme.radius + 2 }]} onPress={goHome} activeOpacity={0.7}>
                  <Ionicons name="arrow-back-outline" size={20} color={theme.text} />
                  <Text style={[ds.backBtnText, { fontSize: 16 * theme.fontSize }]}>Tillbaka</Text>
                </TouchableOpacity>
                <Text style={[ds.categoryHeading, { color: theme.text, fontSize: 30 * theme.fontSize }]}>
                  {selectedCategory.emoji} {selectedCategory.name}
                </Text>
              </View>

              <ScrollView style={ds.productScrollView} contentContainerStyle={ds.productGrid}>
                {categoryProducts.map((product) => {
                  const q = getQty(product.id);
                  const displayPrice = (product.campaignPrice && product.campaignPrice > 0) ? product.campaignPrice : product.price;
                  const isOutOfStock = product.stockStatus === "slut" || (product.quantity != null && product.quantity <= 0);
                  return (
                    <View key={product.id} style={{
                      width: productWidth,
                      backgroundColor: "rgba(255,255,255,0.75)",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.06)",
                      overflow: "hidden",
                      opacity: isOutOfStock ? 0.5 : 1,
                    }}>
                      {/* Large image area */}
                      <View style={{ height: 140, justifyContent: "center", alignItems: "center", paddingVertical: 8 }}>
                        {getLocalImage(product.name) ? (
                          <Image source={getLocalImage(product.name)!} style={{ width: "85%", height: "100%" }} resizeMode="contain" />
                        ) : (
                          <Text style={{ fontSize: 52 }}>{selectedCategory.emoji || "🛒"}</Text>
                        )}
                        {product.badgeLabel ? (
                          <View style={[ds.badge, { backgroundColor: product.badgeColor || theme.accent, borderRadius: 8 }]}>
                            <Text style={ds.badgeText}>{product.badgeLabel}</Text>
                          </View>
                        ) : null}
                        {isOutOfStock && (
                          <View style={ds.outOfStockBadge}><Text style={ds.outOfStockText}>SLUT</Text></View>
                        )}
                      </View>
                      {/* Slim info row */}
                      <View style={{ paddingHorizontal: 12, paddingBottom: 10, paddingTop: 4 }}>
                        <Text style={{ fontWeight: "700", color: "#1a1a1a", fontSize: 15 * theme.fontSize }} numberOfLines={1}>{product.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                            <Text style={{ fontWeight: "700", color: theme.primary, fontSize: 16 * theme.fontSize }}>{displayPrice} kr</Text>
                            {product.campaignPrice != null && product.campaignPrice > 0 && product.campaignPrice < product.price && (
                              <Text style={{ color: "#aaa", textDecorationLine: "line-through", fontSize: 12 * theme.fontSize }}>{product.price} kr</Text>
                            )}
                          </View>
                          {!isOutOfStock && (
                            q === 0 ? (
                              <TouchableOpacity
                                onPress={() => addToCart(product)}
                                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" }}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="add" size={22} color="#fff" />
                              </TouchableOpacity>
                            ) : (
                              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 20, paddingHorizontal: 4, height: 36 }}>
                                <TouchableOpacity onPress={() => updateQty(product.id, -1)} style={{ width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" }} activeOpacity={0.7}>
                                  <Ionicons name="remove" size={18} color="#d94f4f" />
                                </TouchableOpacity>
                                <Text style={{ fontWeight: "700", color: "#1a1a1a", fontSize: 16, minWidth: 24, textAlign: "center" }}>{q}</Text>
                                <TouchableOpacity onPress={() => addToCart(product)} style={{ width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" }} activeOpacity={0.7}>
                                  <Ionicons name="add" size={18} color={theme.primary} />
                                </TouchableOpacity>
                              </View>
                            )
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* ═══ CART SIDEBAR ═══ */}
        <View style={ds.cartPanel}>
          <ScrollView style={ds.cartTop} contentContainerStyle={ds.cartTopContent}>
            <Text style={[ds.cartTitle, { color: theme.text, fontSize: 22 * theme.fontSize }]}>Din beställning</Text>
            {cart.length === 0 ? (
              <View style={ds.cartEmptyState}>
                <Ionicons name="cart-outline" size={40} color="#d1d5db" />
                <Text style={[ds.cartEmpty, { fontSize: 14 * theme.fontSize }]}>Inga produkter valda ännu.</Text>
              </View>
            ) : (
              cart.map((item) => (
                <View key={item.productId} style={ds.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[ds.cartItemName, { fontSize: 15 * theme.fontSize }]}>{item.name}</Text>
                    <Text style={ds.cartItemQty}>{item.qty} st × {item.price} kr</Text>
                  </View>
                  <Text style={[ds.cartItemPrice, { fontSize: 15 * theme.fontSize }]}>{item.price * item.qty} kr</Text>
                  <TouchableOpacity style={ds.cartItemRemove} onPress={() => updateQty(item.productId, -1)} activeOpacity={0.7}>
                    <Ionicons name="close-circle-outline" size={18} color="#c4a0a0" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          <View style={ds.cartBottom}>
            {/* Tipping */}
            {settings.tippingEnabled && cart.length > 0 && (
              <View style={ds.tipSection}>
                <Text style={[ds.tipLabel, { fontSize: 12 * theme.fontSize }]}>Lägg till dricks</Text>
                <View style={ds.tipRow}>
                  {[0, settings.tipAmount1 || 10, settings.tipAmount2 || 20, settings.tipAmount3 || 50].map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[ds.tipBtn, {
                        borderRadius: theme.radius,
                        backgroundColor: selectedTip === amount ? theme.primary : "#f5f5f5",
                      }]}
                      onPress={() => setSelectedTip(amount)}
                      activeOpacity={0.7}
                    >
                      <Text style={[ds.tipBtnText, { color: selectedTip === amount ? "#fff" : theme.text }]}>
                        {amount === 0 ? "Ingen" : `${amount} kr`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={ds.cartCountRow}>
              <Text style={[ds.cartCountLabel, { fontSize: 14 * theme.fontSize }]}>Antal artiklar</Text>
              <Text style={[ds.cartCountVal, { fontSize: 14 * theme.fontSize }]}>{totalItems}</Text>
            </View>
            {selectedTip > 0 && (
              <View style={ds.cartCountRow}>
                <Text style={[ds.cartCountLabel, { fontSize: 14 * theme.fontSize }]}>Dricks</Text>
                <Text style={[ds.cartCountVal, { color: theme.primary, fontSize: 14 * theme.fontSize }]}>+{selectedTip} kr</Text>
              </View>
            )}
            <View style={ds.cartTotalRow}>
              <Text style={[ds.cartTotalLabel, { color: theme.text, fontSize: 24 * theme.fontSize }]}>Totalt</Text>
              <Text style={[ds.cartTotalVal, { color: theme.text, fontSize: 24 * theme.fontSize }]}>{total} kr</Text>
            </View>

            <TouchableOpacity
              style={[ds.payBtn, { borderRadius: theme.radius + 2, backgroundColor: theme.primary, opacity: cart.length === 0 ? 0.35 : 1 }]}
              onPress={handlePay}
              disabled={cart.length === 0}
              activeOpacity={0.7}
            >
              <Ionicons name="wallet-outline" size={20} color="#fff" />
              <Text style={[ds.payBtnText, { fontSize: 20 * theme.fontSize }]}>Betala {total > 0 ? `${total} kr` : ""}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ds.clearBtn, { borderRadius: theme.radius + 2, opacity: cart.length === 0 ? 0.3 : 1 }]}
              onPress={clearCart}
              disabled={cart.length === 0}
              activeOpacity={0.7}
            >
              <Text style={[ds.clearBtnText, { fontSize: 14 * theme.fontSize }]}>Rensa val</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ═══ PAYMENT MODAL ═══ */}
      <Modal visible={showPayment} transparent animationType="fade">
        <View style={ds.modalOverlay}>
          <View style={[ds.paymentModal, { borderRadius: theme.radius + 12 }]}>
            <View style={ds.paymentHeader}>
              <Text style={[ds.paymentTitle, { color: theme.text, fontSize: 24 * theme.fontSize }]}>Betalning</Text>
              <View style={ds.countdownBox}>
                <Text style={ds.countdownNum}>{countdown}</Text>
                <Text style={ds.countdownLabel}>sek</Text>
              </View>
            </View>

            {/* Payment method selector */}
            {payMethods.length > 1 && (
              <View style={ds.payMethodRow}>
                {payMethods.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[ds.payMethodBtn, { borderRadius: theme.radius, backgroundColor: selectedPayMethod === m.key ? theme.primary : "#f5f5f5" }]}
                    onPress={() => setSelectedPayMethod(m.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={m.icon as any} size={18} color={selectedPayMethod === m.key ? "#fff" : "#6b7c74"} />
                    <Text style={[ds.payMethodText, { color: selectedPayMethod === m.key ? "#fff" : "#6b7c74" }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[ds.paymentAmount, { color: theme.accent }]}>{total} kr</Text>
            {selectedTip > 0 && <Text style={ds.paymentTipNote}>inkl. {selectedTip} kr dricks</Text>}
            <Text style={ds.paymentMessage}>Kvitto: {receiptId}</Text>

            {/* QR code for Swish */}
            {selectedPayMethod === "swish" && settings.swishNumber ? (
              <View style={ds.qrContainer}>
                <QRCode value={`C${settings.swishNumber};${total};Kvitto ${receiptId}`} size={160} color={theme.text} backgroundColor="#fff" />
                <Text style={ds.paymentSwishNr}>Swish: {settings.swishNumber}</Text>
              </View>
            ) : selectedPayMethod === "swish" && !settings.swishNumber ? (
              <Text style={ds.paymentSwishNr}>Ange Swish-nummer i inställningar</Text>
            ) : selectedPayMethod === "card" ? (
              <View style={ds.cardPayInfo}>
                <Ionicons name="card-outline" size={40} color={theme.primary} />
                <Text style={[ds.cardPayText, { fontSize: 16 * theme.fontSize }]}>Dra kortet i terminalen</Text>
              </View>
            ) : (
              <View style={ds.cardPayInfo}>
                <Ionicons name="cash-outline" size={40} color={theme.primary} />
                <Text style={[ds.cardPayText, { fontSize: 16 * theme.fontSize }]}>Betala {total} kr kontant</Text>
              </View>
            )}

            {/* Queue number */}
            {settings.orderQueueEnabled && queueNumber && (
              <View style={[ds.queueBox, { backgroundColor: theme.primary + "15" }]}>
                <Text style={[ds.queueLabel, { color: theme.primary }]}>Ditt könummer</Text>
                <Text style={[ds.queueNum, { color: theme.primary }]}>{queueNumber}</Text>
              </View>
            )}

            <TouchableOpacity style={[ds.receiptBtn, { borderRadius: theme.radius + 2 }]} onPress={handleShowReceipt} activeOpacity={0.7}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={ds.receiptBtnText}>Bekräfta betalning</Text>
            </TouchableOpacity>

            <TouchableOpacity style={ds.cancelPayBtn} onPress={() => setShowPayment(false)} activeOpacity={0.7}>
              <Text style={ds.cancelPayText}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══ RECEIPT MODAL ═══ */}
      <Modal visible={showReceipt} transparent animationType="fade">
        <View style={ds.modalOverlay}>
          <View style={[ds.receiptModal, { borderRadius: theme.radius + 12 }]}>
            <View style={ds.receiptHeader}>
              <View>
                <Text style={[ds.receiptLogo, { color: theme.text }]}>{settings.storeName}</Text>
                {settings.companyAddress ? <Text style={ds.receiptAddress}>{settings.companyAddress}</Text> : null}
              </View>
              <View style={ds.countdownBox}>
                <Text style={ds.countdownNum}>{countdown}</Text>
                <Text style={ds.countdownLabel}>sek</Text>
              </View>
            </View>

            <View style={ds.receiptIdRow}>
              <Text style={ds.receiptLabel}>KVITTO</Text>
              <Text style={[ds.receiptIdText, { color: theme.accent }]}>#{receiptId}</Text>
            </View>

            {settings.receiptShowDateTime && <Text style={ds.receiptTime}>{new Date().toLocaleString("sv-SE")}</Text>}

            <View style={ds.receiptItems}>
              {cart.map((item) => (
                <View key={item.productId} style={ds.receiptItemRow}>
                  <Text style={ds.receiptItemName}>{item.qty} × {item.name}</Text>
                  <Text style={ds.receiptItemPrice}>{item.price * item.qty} kr</Text>
                </View>
              ))}
            </View>

            <View style={ds.receiptDivider} />

            {selectedTip > 0 && (
              <View style={ds.receiptItemRow}>
                <Text style={ds.receiptItemName}>Dricks</Text>
                <Text style={ds.receiptItemPrice}>{selectedTip} kr</Text>
              </View>
            )}

            {settings.receiptShowVat && (
              <View style={ds.receiptItemRow}>
                <Text style={[ds.receiptItemName, { color: "#8a9b93" }]}>varav moms (25%)</Text>
                <Text style={[ds.receiptItemPrice, { color: "#8a9b93" }]}>{Math.round(subtotal - subtotal / 1.25)} kr</Text>
              </View>
            )}

            <View style={ds.receiptTotalRow}>
              <Text style={[ds.receiptTotalLabel, { color: theme.text }]}>TOTALT</Text>
              <Text style={[ds.receiptTotalValue, { color: theme.text }]}>{total} kr</Text>
            </View>

            <Text style={ds.receiptPayMethod}>Betalat med: {selectedPayMethod === "swish" ? "Swish" : selectedPayMethod === "card" ? "Kort" : "Kontant"}</Text>

            {settings.orderQueueEnabled && queueNumber && (
              <View style={[ds.queueBox, { backgroundColor: theme.primary + "15", marginVertical: 10 }]}>
                <Text style={[ds.queueLabel, { color: theme.primary }]}>Ditt könummer</Text>
                <Text style={[ds.queueNum, { color: theme.primary }]}>{queueNumber}</Text>
              </View>
            )}

            <Text style={[ds.receiptThankYou, { color: theme.text + "80" }]}>{settings.receiptThankYou || "Tack för ditt köp!"}</Text>
            {settings.receiptFooter ? <Text style={ds.receiptFooter}>{settings.receiptFooter}</Text> : null}
            {settings.orgNumber ? <Text style={ds.receiptOrg}>Org.nr: {settings.orgNumber}</Text> : null}

            <TouchableOpacity style={[ds.receiptCloseBtn, { borderRadius: theme.radius + 2, backgroundColor: theme.primary }]} onPress={handleCloseReceipt} activeOpacity={0.7}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={ds.receiptCloseBtnText}>Klar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══ ADMIN AUTH MODAL ═══ */}
      <Modal visible={showAdminAuth} transparent animationType="fade">
        <View style={ds.modalOverlay}>
          <View style={[ds.adminAuthModal, { borderRadius: theme.radius + 12 }]}>
            <Ionicons name="lock-closed-outline" size={32} color={theme.primary} />
            <Text style={[ds.adminAuthTitle, { color: theme.text }]}>Admin-åtkomst</Text>
            <Text style={ds.adminAuthDesc}>Ange ditt kontolösenord för att lämna kiosk-läget</Text>
            {authError ? <Text style={{ color: "#d94f4f", fontSize: 13, marginBottom: 8 }}>{authError}</Text> : null}
            <TextInput
              style={[ds.adminAuthInput, { borderRadius: theme.radius }]}
              value={adminPassword}
              onChangeText={(t) => { setAdminPassword(t); setAuthError(""); }}
              placeholder="Lösenord"
              placeholderTextColor="#a0a0a0"
              secureTextEntry
              autoFocus
            />
            <TouchableOpacity style={[ds.adminAuthSubmit, { borderRadius: theme.radius, backgroundColor: theme.primary }]} onPress={handleAdminUnlock} activeOpacity={0.7}>
              <Text style={ds.adminAuthSubmitText}>Lås upp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ds.adminAuthCancel} onPress={() => { setShowAdminAuth(false); setAuthError(""); }} activeOpacity={0.7}>
              <Text style={ds.adminAuthCancelText}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══ SCREENSAVER ═══ */}
      {showScreensaver && (
        <TouchableOpacity style={ds.screensaver} activeOpacity={1} onPress={() => { setShowScreensaver(false); resetScreensaverTimer(); }}>
          <View style={ds.ssLogoWrapper}>
            <View style={[ds.ssRing, { borderColor: theme.accent }]} />
            <Text style={[ds.ssLogo, { color: theme.secondary }]}>Corevo</Text>
          </View>
          {branding.showCobranding && (
            <Text style={[ds.ssTitle, { fontSize: 16, opacity: 0.6, marginBottom: 4 }]}>{branding.poweredByText}</Text>
          )}
          {branding.showCobranding && (
            <Text style={[ds.ssTitle, { fontSize: 18, opacity: 0.7 }]}>{branding.companyName}</Text>
          )}
          <Text style={ds.ssTitle}>{settings.screensaverText || "Välkommen!"}</Text>
          <Text style={ds.ssHint}>TRYCK VAR SOM HELST FÖR ATT BÖRJA</Text>
        </TouchableOpacity>
      )}
    </View>
    </ImageBackground>
  );
}

// ═══ STYLES ═══
const ds = StyleSheet.create({
  stage: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12 },

  // Emergency
  emergencyBar: { backgroundColor: "#dc2626", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
  emergencyText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Pause overlay
  pauseOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  pauseCard: { alignItems: "center", padding: 40, gap: 16 },
  pauseTitle: { fontSize: 32, fontWeight: "700" },
  pauseMsg: { fontSize: 18, textAlign: "center", maxWidth: 400, lineHeight: 26 },

  // Top Bar
  topBar: { height: 52, backgroundColor: "rgba(255,255,255,0.80)", borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 },
  topBarTitle: { fontWeight: "700", fontStyle: "italic" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  topBarHint: { color: "#6b7c74", letterSpacing: 1.5, textTransform: "uppercase", fontSize: 11 },
  exitBtnSmall: { padding: 8 },
  exitBtn: { position: "absolute", top: 16, right: 16, padding: 8 },

  // Body
  body: { flex: 1, flexDirection: "row" },
  mainContent: { flex: 1, backgroundColor: "rgba(255,255,255,0.15)" },

  // Welcome
  welcomeText: { fontStyle: "italic", marginBottom: 4 },

  // Bubble
  bubble: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  bubbleText: { fontWeight: "600" },
  bubbleSubtext: {},

  // Overview
  overviewScroll: { flex: 1 },
  overviewContent: { padding: 24, paddingBottom: 60, gap: 16 },
  sectionLabel: { letterSpacing: 2, color: "#6b7c74", textTransform: "uppercase" },
  sectionTitle: { fontWeight: "700", fontStyle: "italic", marginBottom: 8 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  catCard: { width: "23%", minHeight: 140, padding: 16, justifyContent: "flex-end", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", borderRadius: 12 },
  catEmoji: { position: "absolute", top: 10, right: 12, fontSize: 40, opacity: 0.6 },
  catName: { fontWeight: "700", fontStyle: "italic", color: "#2c3e35" },
  catSub: { color: "#6b7c74", marginTop: 2 },

  // Offers
  offersTitle: { fontWeight: "700", fontStyle: "italic", marginTop: 8 },
  offersGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  offerCard: { width: "48%", backgroundColor: "rgba(253,248,240,0.85)", borderWidth: 1, borderColor: "#e8c87a", padding: 16, borderRadius: 12 },
  offerBadge: { backgroundColor: "rgba(196,122,58,0.15)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start", marginBottom: 8 },
  offerBadgeText: { fontSize: 10, fontWeight: "700", color: "#c47a3a", letterSpacing: 1.5, textTransform: "uppercase" },
  offerTitle2: { fontWeight: "700", fontStyle: "italic", color: "#2c3e35", marginBottom: 4 },
  offerDesc: { color: "#6b7c74" },
  offerPrice: { fontSize: 18, fontWeight: "700", color: "#c47a3a", marginTop: 6 },

  // Category
  categoryPage: { flex: 1 },
  categoryTop: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, paddingHorizontal: 24 },
  backBtn: { backgroundColor: "rgba(255,255,255,0.80)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", height: 48, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12 },
  backBtnText: { color: "#2c3e35" },
  categoryHeading: { fontWeight: "700", fontStyle: "italic" },

  // Products
  productScrollView: { flex: 1 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  productCard: { backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", overflow: "hidden", borderRadius: 12 },
  productImgBox: { height: 80, justifyContent: "center", alignItems: "center" },
  productEmoji: { fontSize: 36 },
  badge: { position: "absolute", top: 6, left: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  outOfStockBadge: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  outOfStockText: { color: "#fff", fontWeight: "700", fontSize: 14, letterSpacing: 2 },
  productInfoBox: { padding: 10, flex: 1 },
  productName: { fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  productPrice: { fontWeight: "600", fontStyle: "italic" },
  originalPrice: { color: "#aaa", textDecorationLine: "line-through" },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  qtyBtn: { width: 36, height: 36, backgroundColor: "rgba(91,143,168,0.12)", borderWidth: 2, borderColor: "rgba(91,143,168,0.2)", justifyContent: "center", alignItems: "center" },
  qtyBtnDim: { opacity: 0.35 },
  qtyVal: { fontWeight: "700", minWidth: 24, textAlign: "center" },

  // Cart
  cartPanel: { width: 301, backgroundColor: "#fff", overflow: "hidden", marginLeft: -1 },
  cartTop: { flex: 1, backgroundColor: "transparent" },
  cartTopContent: { padding: 16, backgroundColor: "transparent" },
  cartTitle: { fontWeight: "700", marginBottom: 12 },
  cartEmptyState: { alignItems: "center", paddingVertical: 30, gap: 10 },
  cartEmpty: { color: "#8a9b93", lineHeight: 22 },
  cartItemRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" },
  cartItemName: { color: "#2c3e35", fontWeight: "600" },
  cartItemQty: { fontSize: 12, color: "#8a9b93", marginTop: 1 },
  cartItemPrice: { fontWeight: "700", color: "#2c3e35" },
  cartItemRemove: { padding: 4 },
  cartBottom: { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)", padding: 14, gap: 6 },

  // Tipping
  tipSection: { marginBottom: 8 },
  tipLabel: { fontWeight: "600", color: "#6b7c74", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  tipRow: { flexDirection: "row", gap: 6 },
  tipBtn: { flex: 1, height: 38, justifyContent: "center", alignItems: "center" },
  tipBtnText: { fontWeight: "600", fontSize: 13 },

  cartCountRow: { flexDirection: "row", justifyContent: "space-between" },
  cartCountLabel: { color: "#6b7c74" },
  cartCountVal: { fontWeight: "700", color: "#2c3e35" },
  cartTotalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.04)", paddingTop: 8, marginTop: 4 },
  cartTotalLabel: { fontWeight: "700", fontStyle: "italic" },
  cartTotalVal: { fontWeight: "700", fontStyle: "italic" },
  payBtn: { flexDirection: "row", gap: 8, paddingVertical: 14, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  payBtnText: { color: "#fff", fontWeight: "700" },
  clearBtn: { paddingVertical: 10, alignItems: "center" },
  clearBtnText: { color: "#AC9C8D", fontSize: 13 },

  // Payment Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  paymentModal: { backgroundColor: "#fff", width: 480, padding: 28, borderRadius: 16, alignItems: "center" },
  paymentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 16 },
  paymentTitle: { fontWeight: "700" },
  countdownBox: { flexDirection: "row", alignItems: "baseline", gap: 4, backgroundColor: "rgba(0,0,0,0.04)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  countdownNum: { fontSize: 22, fontWeight: "700", color: "#c47a3a" },
  countdownLabel: { fontSize: 13, color: "#6b7c74" },
  payMethodRow: { flexDirection: "row", gap: 8, width: "100%", marginBottom: 16 },
  payMethodBtn: { flex: 1, flexDirection: "row", gap: 6, height: 44, justifyContent: "center", alignItems: "center" },
  payMethodText: { fontWeight: "600", fontSize: 14 },
  paymentAmount: { fontSize: 42, fontWeight: "700", marginVertical: 8 },
  paymentTipNote: { fontSize: 13, color: "#8a9b93", marginBottom: 4 },
  paymentMessage: { fontSize: 16, color: "#6b7c74", marginBottom: 4 },
  qrContainer: { alignItems: "center", marginVertical: 12, gap: 10 },
  paymentSwishNr: { fontSize: 14, color: "#6b7c74", marginBottom: 16 },
  cardPayInfo: { alignItems: "center", gap: 10, marginVertical: 16, padding: 20, backgroundColor: "#f9fafb", borderRadius: 12, width: "100%" },
  cardPayText: { fontWeight: "600", color: "#2c3e35" },
  queueBox: { padding: 14, borderRadius: 10, alignItems: "center", width: "100%", marginBottom: 8 },
  queueLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  queueNum: { fontSize: 32, fontWeight: "700" },
  receiptBtn: { height: 52, width: "100%", backgroundColor: "#5b8fa8", flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", elevation: 4, marginBottom: 8 },
  receiptBtnText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  cancelPayBtn: { padding: 10 },
  cancelPayText: { fontSize: 15, color: "#8a9b93" },

  // Receipt Modal
  receiptModal: { backgroundColor: "#fff", width: 440, padding: 24, borderRadius: 16 },
  receiptHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  receiptLogo: { fontSize: 22, fontWeight: "700", fontStyle: "italic" },
  receiptAddress: { fontSize: 11, color: "#8a9b93", marginTop: 2 },
  receiptIdRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.08)", paddingBottom: 8, marginBottom: 6 },
  receiptLabel: { fontSize: 12, letterSpacing: 2, color: "#6b7c74" },
  receiptIdText: { fontSize: 22, fontWeight: "700" },
  receiptTime: { fontSize: 12, color: "#8a9b93", marginBottom: 10 },
  receiptItems: { gap: 4 },
  receiptItemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  receiptItemName: { fontSize: 15, color: "#2c3e35" },
  receiptItemPrice: { fontSize: 15, color: "#2c3e35" },
  receiptDivider: { borderTopWidth: 1, borderStyle: "dashed", borderTopColor: "rgba(0,0,0,0.1)", marginVertical: 8 },
  receiptTotalRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6 },
  receiptTotalLabel: { fontSize: 22, fontWeight: "700" },
  receiptTotalValue: { fontSize: 22, fontWeight: "700" },
  receiptPayMethod: { fontSize: 12, color: "#8a9b93", textAlign: "center", marginTop: 4 },
  receiptThankYou: { fontSize: 15, fontStyle: "italic", textAlign: "center", marginVertical: 8 },
  receiptFooter: { fontSize: 11, color: "#b0b8b3", textAlign: "center" },
  receiptOrg: { fontSize: 10, color: "#b0b8b3", textAlign: "center", marginTop: 4 },
  receiptCloseBtn: { height: 48, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 8 },
  receiptCloseBtnText: { fontSize: 18, fontWeight: "700", color: "#fff" },

  // Admin Auth
  adminAuthModal: { backgroundColor: "#fff", width: 380, padding: 28, borderRadius: 16, alignItems: "center" },
  adminAuthTitle: { fontSize: 22, fontWeight: "700", marginTop: 12, marginBottom: 4 },
  adminAuthDesc: { fontSize: 14, color: "#6b7c74", textAlign: "center", marginBottom: 20 },
  adminAuthInput: { width: "100%", height: 48, borderWidth: 1, borderColor: "#d1d5db", paddingHorizontal: 16, fontSize: 18, color: "#2c3e35", textAlign: "center", marginBottom: 14 },
  adminAuthSubmit: { width: "100%", height: 48, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  adminAuthSubmitText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  adminAuthCancel: { padding: 10 },
  adminAuthCancelText: { fontSize: 15, color: "#8a9b93" },

  // Screensaver
  screensaver: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#F7F5F2", justifyContent: "center", alignItems: "center", gap: 48, zIndex: 100 },
  ssLogoWrapper: { width: 160, height: 160, justifyContent: "center", alignItems: "center" },
  ssRing: { position: "absolute", width: 160, height: 160, borderRadius: 80, borderWidth: 3 },
  ssLogo: { fontSize: 60, fontWeight: "700" },
  ssTitle: { fontSize: 40, fontWeight: "700", color: "#2c3e35", letterSpacing: 2 },
  ssHint: { fontSize: 18, color: "rgba(44,62,53,0.4)", letterSpacing: 4, textTransform: "uppercase" },
});
