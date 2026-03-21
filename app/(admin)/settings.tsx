/**
 * Admin Settings page — ALL 60+ settings from admin portal
 * 9 sections: Butiksinformation, Betalning, Utseende/Tema, Kiosk-display,
 * Drift, Ljud & Tillganglighet, Funktioner, Kvittodesign, Sakerhet
 */

import { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "@/hooks/useSettings";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import type { KioskSettings, OpeningHours } from "@/core/types/settings";

const DAY_LABELS: Record<string, string> = {
  mon: "Måndag", tue: "Tisdag", wed: "Onsdag", thu: "Torsdag",
  fri: "Fredag", sat: "Lördag", sun: "Söndag",
};
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const FONTS = ["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins"];

type SettingsTab = "store" | "payment" | "theme" | "kiosk" | "hours" | "advanced" | "branding";
const TABS: { key: SettingsTab; label: string; icon: string }[] = [
  { key: "store", label: "Butik", icon: "storefront-outline" },
  { key: "branding", label: "Varumärke", icon: "ribbon-outline" },
  { key: "payment", label: "Betalning", icon: "card-outline" },
  { key: "theme", label: "Utseende", icon: "color-palette-outline" },
  { key: "kiosk", label: "Kiosk", icon: "tv-outline" },
  { key: "hours", label: "Drift", icon: "time-outline" },
  { key: "advanced", label: "Avancerat", icon: "settings-outline" },
];

export default function SettingsPage() {
  const { settings, loading, save, refresh } = useSettings();
  const { branding, update: updateBranding } = useTenantBranding();
  const [form, setForm] = useState<KioskSettings>(settings);
  const [brandingForm, setBrandingForm] = useState(branding);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("store");

  // Sync form when settings finish loading
  useEffect(() => {
    if (!loading) setForm(settings);
  }, [loading]);

  // Sync branding form
  useEffect(() => {
    setBrandingForm(branding);
  }, [branding]);

  const update = useCallback((key: keyof KioskSettings, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateHours = useCallback((day: string, field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: { ...prev.openingHours[day], [field]: value },
      },
    }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(form);
      Alert.alert("Sparat", "Alla inställningar har sparats.");
    } catch (err) {
      Alert.alert("Fel", "Kunde inte spara inställningar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="settings-outline" size={24} color="#6b7c74" />
        <View>
          <Text style={styles.title}>Inställningar</Text>
          <Text style={styles.subtitle}>Konfigurera din kiosk — alla ändringar sparas lokalt</Text>
        </View>
      </View>

      {/* Tab navigation */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? "#2d6b5a" : "#8a9b93"} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══ 1. BUTIKSINFORMATION ═══ */}
      {activeTab === "store" && (
      <>
      <Section icon="storefront-outline" title="Butiksinformation">
        <Row label="Butiksnamn">
          <Input value={form.storeName} onChange={(v) => update("storeName", v)} placeholder="Corevo Kiosk" />
        </Row>
        <Row label="Undertitel">
          <Input value={form.storeSubtitle} onChange={(v) => update("storeSubtitle", v)} placeholder="Hemmets bästa hörna" />
        </Row>
        <Row label="Företagsadress">
          <Input value={form.companyAddress} onChange={(v) => update("companyAddress", v)} placeholder="Storgatan 1, 123 45 Stad" />
        </Row>
        <Row label="Organisationsnummer">
          <Input value={form.orgNumber} onChange={(v) => update("orgNumber", v)} placeholder="XXXXXX-XXXX" />
        </Row>
        <Row label="Momsregistreringsnummer">
          <Input value={form.vatNumber} onChange={(v) => update("vatNumber", v)} placeholder="SE123456789001" />
        </Row>
        <Row label="Logotyp URL">
          <Input value={form.logoUrl} onChange={(v) => update("logoUrl", v)} placeholder="https://..." />
        </Row>
      </Section>

      </>
      )}

      {/* ═══ 2. BETALNING ═══ */}
      {activeTab === "payment" && (
      <>
      <Section icon="card-outline" title="Betalning">
        <Row label="Swish-nummer">
          <Input value={form.swishNumber} onChange={(v) => update("swishNumber", v)} placeholder="07XXXXXXXX" />
        </Row>
        <Row label="Kvittoprefix">
          <Input value={form.receiptPrefix} onChange={(v) => update("receiptPrefix", v)} placeholder="CR" />
        </Row>
        <Hint text="T.ex. CR ger kvitto CR-0001" />
        <Text style={styles.subLabel}>Betalmetoder aktiverade</Text>
        <SwitchRow label="Swish" value={form.paymentSwish} onChange={(v) => update("paymentSwish", v)} />
        <SwitchRow label="Kort" value={form.paymentCard} onChange={(v) => update("paymentCard", v)} />
        <SwitchRow label="Kontant" value={form.paymentCash} onChange={(v) => update("paymentCash", v)} />
        <SwitchRow label="QR" value={form.paymentQR} onChange={(v) => update("paymentQR", v)} />
      </Section>

      </>
      )}

      {/* ═══ 3. UTSEENDE / TEMA ═══ */}
      {activeTab === "theme" && (
      <>
      <Section icon="color-palette-outline" title="Utseende / Tema">
        <ColorRow label="Primärfärg" value={form.primaryColor} onChange={(v) => update("primaryColor", v)} />
        <ColorRow label="Sekundärfärg" value={form.secondaryColor} onChange={(v) => update("secondaryColor", v)} />
        <ColorRow label="Accentfärg" value={form.accentColor} onChange={(v) => update("accentColor", v)} />
        <ColorRow label="Bakgrundsfärg" value={form.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
        <ColorRow label="Textfärg" value={form.textColor} onChange={(v) => update("textColor", v)} />

        <Row label={`Knappradie: ${form.buttonRadius}px`}>
          <SliderRow value={form.buttonRadius} min={0} max={20} onChange={(v) => update("buttonRadius", v)} />
        </Row>

        <Text style={styles.subLabel}>Typsnitt</Text>
        <View style={styles.radioGroup}>
          {FONTS.map((f) => (
            <RadioBtn key={f} label={f} selected={form.fontFamily === f} onPress={() => update("fontFamily", f)} />
          ))}
        </View>

        <Text style={styles.subLabel}>Produktkortsstil</Text>
        <View style={styles.radioGroup}>
          {["style1", "style2", "style3"].map((s, i) => (
            <RadioBtn key={s} label={`Stil ${i + 1}`} selected={form.productCardStyle === s} onPress={() => update("productCardStyle", s)} />
          ))}
        </View>

        <Text style={styles.subLabel}>Produkter per rad</Text>
        <View style={styles.radioGroup}>
          {[2, 3, 4].map((n) => (
            <RadioBtn key={n} label={String(n)} selected={form.productsPerRow === n} onPress={() => update("productsPerRow", n)} />
          ))}
        </View>

        <Text style={styles.subLabel}>Temaläge</Text>
        <View style={styles.radioGroup}>
          {([["light", "Ljust"], ["dark", "Mörkt"], ["auto", "Auto"]] as const).map(([v, l]) => (
            <RadioBtn key={v} label={l} selected={form.themeMode === v} onPress={() => update("themeMode", v)} />
          ))}
        </View>

        <SwitchRow label="Animationer" hint="Aktivera/avaktivera UI-animationer" value={form.animationsEnabled} onChange={(v) => update("animationsEnabled", v)} />
      </Section>

      </>
      )}

      {/* ═══ 4. KIOSK-DISPLAY ═══ */}
      {activeTab === "kiosk" && (
      <>
      <Section icon="tv-outline" title="Kiosk-display">
        <Row label="Välkomsttext">
          <Input value={form.welcomeText} onChange={(v) => update("welcomeText", v)} placeholder="Välkommen till vår kiosk!" multiline />
        </Row>
        <Row label="Bubbla text rad 1">
          <Input value={form.bubbleText1} onChange={(v) => update("bubbleText1", v)} placeholder="Välkommen!" />
        </Row>
        <Row label="Bubbla text rad 2">
          <Input value={form.bubbleText2} onChange={(v) => update("bubbleText2", v)} placeholder="Bläddra bland produkterna" />
        </Row>
        <SwitchRow label="Visa bubbla" hint="Informationsbubbla på kiosken" value={form.bubbleVisible} onChange={(v) => update("bubbleVisible", v)} />
        <SwitchRow label="Visa välj-knapp" hint="Kategori-väljaren på kiosken" value={form.selectButtonVisible} onChange={(v) => update("selectButtonVisible", v)} />

        <View style={styles.divider} />
        <SwitchRow label="Skärmsläckare aktiverad" value={form.screensaverEnabled} onChange={(v) => update("screensaverEnabled", v)} />
        {form.screensaverEnabled && (
          <>
            <Row label={`Fördröjning: ${form.screensaverDelay} min`}>
              <SliderRow value={form.screensaverDelay} min={1} max={30} onChange={(v) => update("screensaverDelay", v)} />
            </Row>
            <Row label="Skärmsläckartext">
              <Input value={form.screensaverText} onChange={(v) => update("screensaverText", v)} placeholder="Välkommen!" />
            </Row>
          </>
        )}
      </Section>

      </>
      )}

      {/* ═══ 5. DRIFT ═══ */}
      {activeTab === "hours" && (
      <>
      <Section icon="time-outline" title="Drift">
        <Text style={styles.subLabel}>Öppettider</Text>
        {DAY_KEYS.map((day) => {
          const h = form.openingHours?.[day] || { from: "08:00", to: "18:00", closed: false };
          return (
            <View key={day} style={styles.hoursRow}>
              <Text style={styles.dayLabel}>{DAY_LABELS[day]}</Text>
              <View style={styles.closedToggle}>
                <Switch value={h.closed} onValueChange={(v) => updateHours(day, "closed", v)} trackColor={{ false: "#d1d5db", true: "#dc262640" }} thumbColor={h.closed ? "#dc2626" : "#fff"} />
                <Text style={styles.closedText}>Stängt</Text>
              </View>
              {!h.closed && (
                <>
                  <TextInput style={styles.timeInput} value={h.from} onChangeText={(v) => updateHours(day, "from", v)} placeholder="08:00" />
                  <Text style={styles.timeDash}>-</Text>
                  <TextInput style={styles.timeInput} value={h.to} onChangeText={(v) => updateHours(day, "to", v)} placeholder="18:00" />
                </>
              )}
            </View>
          );
        })}

        <Row label="Automatisk omstart-tid">
          <Input value={form.autoRestartTime} onChange={(v) => update("autoRestartTime", v)} placeholder="03:00" />
        </Row>
        <Hint text="Kiosken startas om automatiskt vid denna tid" />

        <View style={styles.divider} />
        <SwitchRow label="Pausa beställningar" hint="Stänger av beställningar tillfälligt" value={form.ordersPaused} onChange={(v) => update("ordersPaused", v)} />
        {form.ordersPaused && (
          <Row label="Pausmeddelande">
            <Input value={form.pauseMessage} onChange={(v) => update("pauseMessage", v)} placeholder="Vi tar en kort paus..." multiline />
          </Row>
        )}

        <View style={styles.divider} />
        <Row label="Nödmeddelande">
          <Input value={form.emergencyMessage} onChange={(v) => update("emergencyMessage", v)} placeholder="Nödmeddelande som visas på kiosken..." multiline />
        </Row>
      </Section>

      </>
      )}

      {/* ═══ 6-9: ADVANCED TAB ═══ */}
      {activeTab === "advanced" && (
      <>
      {/* ═══ 6. LJUD & TILLGÄNGLIGHET ═══ */}
      <Section icon="volume-high-outline" title="Ljud & Tillgänglighet">
        <SwitchRow label="Ljudeffekter" hint="Spela ljud vid interaktioner" value={form.soundEffects} onChange={(v) => update("soundEffects", v)} />
        {form.soundEffects && (
          <Row label={`Volym: ${form.soundVolume}%`}>
            <SliderRow value={form.soundVolume} min={0} max={100} onChange={(v) => update("soundVolume", v)} />
          </Row>
        )}
        <SwitchRow label="Stor text-läge" hint="Ökar textstorleken på kiosken" value={form.largeTextMode} onChange={(v) => update("largeTextMode", v)} />
        <SwitchRow label="Hög kontrast" hint="Ökad kontrast för bättre läsbarhet" value={form.highContrast} onChange={(v) => update("highContrast", v)} />
      </Section>

      {/* ═══ 7. FUNKTIONER ═══ */}
      <Section icon="toggle-outline" title="Funktioner">
        <SwitchRow label="Erbjudanden" hint="Visa erbjudanden på kiosken" value={form.offersEnabled} onChange={(v) => update("offersEnabled", v)} />
        <SwitchRow label="Kundönskningar" hint="Tillåt kunder skicka önskemål" value={form.wishesEnabled} onChange={(v) => update("wishesEnabled", v)} />
        <SwitchRow label="Kiosk låst läge" hint="Lås kiosken i helskärm" value={form.kioskLocked} onChange={(v) => update("kioskLocked", v)} />

        <View style={styles.divider} />
        <SwitchRow label="Dricks-funktion" hint="Låt kunder lämna dricks" value={form.tippingEnabled} onChange={(v) => update("tippingEnabled", v)} />
        {form.tippingEnabled && (
          <View style={styles.tipRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Belopp 1</Text>
              <TextInput style={styles.miniInput} value={String(form.tipAmount1)} onChangeText={(v) => update("tipAmount1", Number(v) || 0)} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Belopp 2</Text>
              <TextInput style={styles.miniInput} value={String(form.tipAmount2)} onChangeText={(v) => update("tipAmount2", Number(v) || 0)} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Belopp 3</Text>
              <TextInput style={styles.miniInput} value={String(form.tipAmount3)} onChangeText={(v) => update("tipAmount3", Number(v) || 0)} keyboardType="numeric" />
            </View>
          </View>
        )}

        <View style={styles.divider} />
        <SwitchRow label="Orderkönummer" hint="Visa könummer efter beställning" value={form.orderQueueEnabled} onChange={(v) => update("orderQueueEnabled", v)} />
        {form.orderQueueEnabled && (
          <>
            <Row label="Könummerformat">
              <Input value={form.orderQueueFormat} onChange={(v) => update("orderQueueFormat", v)} placeholder="CR-####" />
            </Row>
            <Hint text="Använd # för siffror, t.ex. CR-#### ger CR-0001" />
          </>
        )}
      </Section>

      {/* ═══ 8. KVITTODESIGN ═══ */}
      <Section icon="print-outline" title="Kvittodesign">
        <Row label="Logotyp URL">
          <Input value={form.receiptLogoUrl} onChange={(v) => update("receiptLogoUrl", v)} placeholder="https://..." />
        </Row>
        <Row label="Tack-meddelande">
          <Input value={form.receiptThankYou} onChange={(v) => update("receiptThankYou", v)} placeholder="Tack för ditt köp!" multiline />
        </Row>
        <Row label="Sidfot text">
          <Input value={form.receiptFooter} onChange={(v) => update("receiptFooter", v)} placeholder="Valfri text längst ner" multiline />
        </Row>
        <SwitchRow label="Visa ordernummer" value={form.receiptShowOrderNumber} onChange={(v) => update("receiptShowOrderNumber", v)} />
        <SwitchRow label="Visa datum/tid" value={form.receiptShowDateTime} onChange={(v) => update("receiptShowDateTime", v)} />
        <SwitchRow label="Visa moms-uppdelning" value={form.receiptShowVat} onChange={(v) => update("receiptShowVat", v)} />
        <Row label={`Teckenstorlek: ${form.receiptFontSize}pt`}>
          <SliderRow value={form.receiptFontSize} min={8} max={16} onChange={(v) => update("receiptFontSize", v)} />
        </Row>
        <Text style={styles.subLabel}>Pappersbredd</Text>
        <View style={styles.radioGroup}>
          {(["58mm", "80mm"] as const).map((w) => (
            <RadioBtn key={w} label={w} selected={form.receiptPaperWidth === w} onPress={() => update("receiptPaperWidth", w)} />
          ))}
        </View>
      </Section>

      {/* ═══ 9. SÄKERHET ═══ */}
      <Section icon="shield-outline" title="Säkerhet">
        <Row label="Kiosklösenord">
          <Input value={form.kioskPassword} onChange={(v) => update("kioskPassword", v)} placeholder="Lösenord för att avsluta kiosk-läge" secureTextEntry />
        </Row>
        <Hint text="Krävs för att lämna kiosk-läget" />
        <Row label={`Sessionstimeout: ${form.sessionTimeout} min`}>
          <SliderRow value={form.sessionTimeout} min={5} max={120} onChange={(v) => update("sessionTimeout", v)} />
        </Row>
        <Hint text="Återställ kiosken efter inaktivitet" />
      </Section>

      </>
      )}

      {/* ═══ VARUMÄRKE ═══ */}
      {activeTab === "branding" && (
      <>
      <Section icon="ribbon-outline" title="Varumärke">
        <SwitchRow
          label="Visa 'Powered by Corevo'"
          hint="Visar co-branding text i kiosken, login och screensaver"
          value={brandingForm.showCobranding}
          onChange={(v) => setBrandingForm((prev) => ({ ...prev, showCobranding: v }))}
        />
        <Row label="Anpassad text">
          <Input
            value={brandingForm.poweredByText}
            onChange={(v) => setBrandingForm((prev) => ({ ...prev, poweredByText: v }))}
            placeholder="Powered by Corevo"
          />
        </Row>
        <Hint text="Texten som visas i kiosken och på login-skärmarna" />

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }, { marginTop: 16 }]}
          onPress={async () => {
            setSaving(true);
            try {
              await updateBranding(brandingForm);
              Alert.alert("Sparat", "Varumärkesinställningar har sparats till PocketBase.");
            } catch (err) {
              Alert.alert("Fel", "Kunde inte spara varumärkesinställningar. Kontrollera att tenants-kollektionen finns i PocketBase.");
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {saving ? "Sparar..." : "Spara varumärke"}
          </Text>
        </TouchableOpacity>
      </Section>
      </>
      )}

      {/* ═══ SAVE BUTTON ═══ */}
      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>
          {saving ? "Sparar..." : "Spara alla inställningar"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══ HELPER COMPONENTS ═══

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color="#6b7c74" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Input({ value, onChange, placeholder, multiline, secureTextEntry }: {
  value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; secureTextEntry?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && { height: 60, textAlignVertical: "top" }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#a0a0a0"
      multiline={multiline}
      secureTextEntry={secureTextEntry}
    />
  );
}

function SwitchRow({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.switchLabel}>{label}</Text>
        {hint ? <Text style={styles.switchHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#d1d5db", true: "#2d6b5a40" }}
        thumbColor={value ? "#2d6b5a" : "#f4f3f4"}
      />
    </View>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.colorRow}>
      <View style={[styles.colorSwatch, { backgroundColor: value }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.colorLabel}>{label}</Text>
        <TextInput style={styles.colorInput} value={value} onChangeText={onChange} placeholder="#000000" />
      </View>
    </View>
  );
}

function RadioBtn({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.radioBtn, selected && styles.radioBtnSelected]} onPress={onPress}>
      <Text style={[styles.radioBtnText, selected && styles.radioBtnTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SliderRow({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.sliderRow}>
      <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={styles.sliderBtn}>
        <Text style={styles.sliderBtnText}>-</Text>
      </TouchableOpacity>
      <Text style={styles.sliderValue}>{value}</Text>
      <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={styles.sliderBtn}>
        <Text style={styles.sliderBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function Hint({ text }: { text: string }) {
  return <Text style={styles.hint}>{text}</Text>;
}

// ═══ STYLES ═══

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, gap: 16, maxWidth: 700 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#2c3e35" },
  subtitle: { fontSize: 14, color: "#6b7c74" },

  tabRow: { flexDirection: "row", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: "#f0f0f0" },
  tabActive: { backgroundColor: "#e8f5ee" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#8a9b93" },
  tabTextActive: { color: "#2d6b5a" },

  section: { backgroundColor: "#fff", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#f0f0f0" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: "#2c3e35" },

  row: { marginBottom: 12 },
  rowLabel: { fontSize: 13, fontWeight: "600", color: "#6b7c74", marginBottom: 4 },
  input: { height: 42, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#2c3e35" },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  switchLabel: { fontSize: 14, fontWeight: "600", color: "#2c3e35" },
  switchHint: { fontSize: 12, color: "#8a9b93", marginTop: 1 },

  colorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  colorSwatch: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  colorLabel: { fontSize: 13, fontWeight: "600", color: "#6b7c74" },
  colorInput: { height: 32, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingHorizontal: 8, fontSize: 13, color: "#2c3e35", marginTop: 2 },

  radioGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  radioBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#f9fafb" },
  radioBtnSelected: { backgroundColor: "#e8f5ee", borderColor: "#2d6b5a" },
  radioBtnText: { fontSize: 13, color: "#6b7c74" },
  radioBtnTextSelected: { color: "#2d6b5a", fontWeight: "600" },

  sliderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sliderBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  sliderBtnText: { fontSize: 20, fontWeight: "700", color: "#2c3e35" },
  sliderValue: { fontSize: 16, fontWeight: "600", color: "#2c3e35", minWidth: 40, textAlign: "center" },

  subLabel: { fontSize: 13, fontWeight: "600", color: "#6b7c74", marginTop: 8, marginBottom: 6 },
  hint: { fontSize: 11, color: "#8a9b93", marginTop: -4, marginBottom: 8 },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 8 },

  hoursRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  dayLabel: { width: 70, fontSize: 13, fontWeight: "600", color: "#2c3e35" },
  closedToggle: { flexDirection: "row", alignItems: "center", gap: 4, width: 100 },
  closedText: { fontSize: 12, color: "#8a9b93" },
  timeInput: { width: 70, height: 34, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingHorizontal: 8, fontSize: 13, color: "#2c3e35", textAlign: "center" },
  timeDash: { fontSize: 14, color: "#8a9b93" },

  tipRow: { flexDirection: "row", gap: 12, marginVertical: 8 },
  miniLabel: { fontSize: 12, color: "#6b7c74", marginBottom: 4 },
  miniInput: { height: 38, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingHorizontal: 10, fontSize: 14, color: "#2c3e35", textAlign: "center" },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    backgroundColor: "#2d6b5a",
    borderRadius: 12,
    marginTop: 8,
  },
  saveButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
