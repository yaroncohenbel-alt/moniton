/**
 * Admin TOTP setup + verification flow.
 *
 * Step 1: Show QR code to scan with Google Authenticator (first time only).
 * Step 2: Enter 6-digit code to verify and receive session token.
 *
 * Used inside the admin PIN overlay — after PIN 1809 is entered,
 * this component handles the second factor.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ADMIN_TOKEN_KEY = "@taximeter_admin_session_v1";

interface Props {
  onSuccess: () => void;
  onDismiss: () => void;
}

type Step = "loading" | "scan-qr" | "enter-code" | "error";

export function AdminTotpSetup({ onSuccess, onDismiss }: Props) {
  const [step, setStep] = useState<Step>("loading");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/taxi/admin/totp/setup");
        const data = await res.json() as { alreadySetup: boolean; qrDataUrl?: string; secret?: string };
        if (data.alreadySetup) {
          setStep("enter-code");
        } else {
          setQrUrl(data.qrDataUrl ?? null);
          setSecret(data.secret ?? null);
          setStep("scan-qr");
        }
      } catch {
        setStep("error");
      }
    })();
  }, []);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/taxi/admin/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      if (!res.ok) {
        setErrorMsg("קוד שגוי — נסה שוב");
        setCode("");
        setVerifying(false);
        return;
      }
      const data = await res.json() as { sessionToken: string };
      await AsyncStorage.setItem(ADMIN_TOKEN_KEY, data.sessionToken);
      onSuccess();
    } catch {
      setErrorMsg("שגיאת רשת — נסה שוב");
      setVerifying(false);
    }
  }, [code, onSuccess]);

  return (
    <View style={s.backdrop}>
      <View style={s.sheet}>
        <View style={s.shieldIcon}>
          <Feather name="shield" size={26} color="#FFD60A" />
        </View>
        <Text style={s.title}>אימות דו-שלבי</Text>

        {step === "loading" && (
          <ActivityIndicator color="#FFD60A" style={{ marginVertical: 24 }} />
        )}

        {step === "error" && (
          <>
            <Text style={s.sub}>לא ניתן לטעון את הגדרות ה-TOTP</Text>
            <TouchableOpacity style={s.cancelBtn} onPress={onDismiss}>
              <Text style={s.cancelText}>סגור</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "scan-qr" && (
          <>
            <Text style={s.sub}>סרוק עם Google Authenticator</Text>
            {qrUrl && (
              <View style={s.qrWrap}>
                <Image
                  source={{ uri: qrUrl }}
                  style={s.qr}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Manual setup key — shown clearly for same-phone users */}
            {secret && (
              <View style={s.secretBox}>
                <View style={s.secretHeader}>
                  <Feather name="key" size={13} color="#FFD60A" />
                  <Text style={s.secretLabel}>מפתח הגדרה ידנית</Text>
                </View>
                <Text style={s.secretKey} selectable>{secret}</Text>
                <Text style={s.secretHint}>
                  באותו טלפון: פתח Google Authenticator ← + ← הזן מפתח ← הדבק
                </Text>
              </View>
            )}

            <Text style={s.note}>לאחר הסריקה או ההזנה הידנית, הזן את הקוד שמוצג</Text>
            <TouchableOpacity
              style={s.nextBtn}
              onPress={() => setStep("enter-code")}
              activeOpacity={0.85}
            >
              <Text style={s.nextBtnText}>המשך לאימות</Text>
              <Feather name="arrow-left" size={16} color="#0D0D0D" />
            </TouchableOpacity>
          </>
        )}

        {step === "enter-code" && (
          <>
            <Text style={s.sub}>הזן קוד 6 ספרות מ-Google Authenticator</Text>

            {/* Always show secret key so user can add manually on same phone */}
            {secret && (
              <View style={s.secretBox}>
                <View style={s.secretHeader}>
                  <Feather name="key" size={13} color="#FFD60A" />
                  <Text style={s.secretLabel}>מפתח ידני — Google Authenticator</Text>
                </View>
                <Text style={s.secretKey} selectable>{secret}</Text>
                <Text style={s.secretHint}>
                  פתח Google Authenticator ← + ← הזן מפתח ← הדבק את המפתח
                </Text>
              </View>
            )}

            <TextInput
              style={s.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="• • • • • •"
              placeholderTextColor="#404040"
              textAlign="center"
              autoFocus
            />
            {errorMsg ? <Text style={s.error}>{errorMsg}</Text> : null}
            <TouchableOpacity
              style={[s.nextBtn, (code.length < 6 || verifying) && s.nextBtnDisabled]}
              onPress={handleVerify}
              disabled={code.length < 6 || verifying}
              activeOpacity={0.85}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="#0D0D0D" />
              ) : (
                <>
                  <Text style={s.nextBtnText}>אמת</Text>
                  <Feather name="check" size={16} color="#0D0D0D" />
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={s.cancelBtn} onPress={onDismiss}>
          <Text style={s.cancelText}>ביטול</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export async function getAdminSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem(ADMIN_TOKEN_KEY);
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  sheet: {
    backgroundColor: "#111111",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 28,
    alignItems: "center",
    width: 320,
    gap: 12,
  },
  shieldIcon: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: "#FFD60A15", borderWidth: 1, borderColor: "#FFD60A44",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { color: "#808080", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  qrWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
  },
  qr: { width: 180, height: 180 },
  note: { color: "#606060", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  codeInput: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2E2E2E",
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 8,
    paddingVertical: Platform.OS === "ios" ? 16 : 12,
    width: "100%",
    marginVertical: 4,
  },
  error: { color: "#FF453A", fontSize: 12, fontFamily: "Inter_500Medium" },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#FFD60A", borderRadius: 14, paddingVertical: 16, width: "100%",
  },
  nextBtnDisabled: { opacity: 0.3 },
  nextBtnText: { color: "#0D0D0D", fontSize: 16, fontFamily: "Inter_700Bold" },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 20 },
  cancelText: { color: "#505050", fontSize: 14, fontFamily: "Inter_500Medium" },

  secretBox: {
    width: "100%",
    backgroundColor: "#0D0D0D",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFD60A33",
    padding: 14,
    gap: 8,
  },
  secretHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secretLabel: {
    color: "#FFD60A",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  secretKey: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: 6,
  },
  secretHint: {
    color: "#505050",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
});
