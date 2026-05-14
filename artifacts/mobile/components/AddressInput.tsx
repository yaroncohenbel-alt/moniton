import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { AddressSuggestion } from "@/hooks/useAddressSearch";
import { useTranslation } from "@/contexts/LanguageContext";
import { useVoiceInput, type VoiceState } from "@/hooks/useVoiceInput";

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  onClear?: () => void;
  suggestions: AddressSuggestion[];
  searching: boolean;
  icon: "navigation" | "map-pin";
  iconColor: string;
  placeholder?: string;
  onIconPress?: () => void;
  iconLoading?: boolean;
  editable?: boolean;
  /** When true the suggestion dropdown opens ABOVE the input (avoids keyboard) */
  dropdownAbove?: boolean;
}

function MicButton({
  voiceState,
  isSupported,
  onPress,
}: {
  voiceState: VoiceState;
  isSupported: boolean;
  onPress: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (voiceState === "listening") {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      loopRef.current = null;
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [voiceState, pulseAnim]);

  if (!isSupported) return null;

  const iconName =
    voiceState === "done" ? "check-circle" :
    voiceState === "error" ? "alert-circle" :
    "mic";

  const iconColor =
    voiceState === "listening" ? "#FF3B30" :
    voiceState === "done" ? "#34C759" :
    voiceState === "error" ? "#FF9500" :
    "#505050";

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.65}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Feather name={iconName} size={18} color={iconColor} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export function AddressInput({
  label,
  value,
  onChange,
  onSelect,
  onClear,
  suggestions,
  searching,
  icon,
  iconColor,
  placeholder,
  onIconPress,
  iconLoading = false,
  editable = true,
  dropdownAbove = false,
}: AddressInputProps) {
  const { t, isRTL, lang } = useTranslation();
  const align = isRTL ? "right" : ("left" as const);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const wrapperRef = useRef<View>(null);

  const handleVoiceResult = useCallback(
    (transcript: string) => {
      onChange(transcript);
      // Show the autocomplete dropdown with the transcribed text as the query.
      // The user must tap a suggestion to confirm — the transcript is never
      // auto-set as the final address.
      setFocused(true);
      inputRef.current?.focus();
    },
    [onChange]
  );

  // Real-time interim callback: update the TextInput value as the user speaks
  // so words appear on screen instantly and the search runs in the background.
  // Do NOT open the dropdown here — it must only appear after voice is done,
  // to prevent the layout from shifting during recognition and accidentally
  // registering a tap on the first suggestion item.
  const handleInterim = useCallback(
    (text: string) => {
      onChange(text);
    },
    [onChange]
  );

  const { voiceState, isSupported, startListening, stopListening } =
    useVoiceInput(lang, handleVoiceResult, handleInterim);

  const handleMicPress = useCallback(() => {
    if (voiceState === "listening") stopListening();
    else if (voiceState === "idle") startListening();
  }, [voiceState, startListening, stopListening]);

  // Never show the dropdown while voice recognition is active — opening it
  // during recognition causes layout shifts that can register as accidental
  // taps on the first suggestion.  It opens immediately once voice is done.
  const showDropdown =
    voiceState !== "listening" &&
    focused &&
    (suggestions.length > 0 || searching);

  // ── Web: when dropdownAbove is true and the dropdown shows, scroll the
  //   wrapper into view so the dropdown (rendered above the input in the
  //   column-reverse layout) is visible above the soft keyboard.
  useEffect(() => {
    if (!showDropdown || !dropdownAbove || Platform.OS !== "web") return;
    const timer = setTimeout(() => {
      // On React Native Web, View refs return the underlying DOM element.
      const node = wrapperRef.current as unknown as HTMLElement | null;
      if (node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [showDropdown, dropdownAbove]);

  const dropdownContent = (
    <>
      {searching && suggestions.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FFD60A" />
          <Text style={styles.searchingText}>{t.searchingAddresses}</Text>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => String(item.place_id)}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          nestedScrollEnabled={true}
          style={styles.dropdownList}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.dropdownItem,
                index === suggestions.length - 1 && styles.dropdownItemLast,
              ]}
              onPress={() => {
                onSelect(item);
                setFocused(false);
              }}
              activeOpacity={0.65}
            >
              <Feather name="map-pin" size={15} color="#FFD60A88" />
              <View style={[styles.dropdownTextCol, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.dropdownShort, { textAlign: align }]} numberOfLines={1}>
                  {item.short_name}
                </Text>
                {!!item.secondary_text && (
                  <Text style={[styles.dropdownFull, { textAlign: align }]} numberOfLines={1}>
                    {item.secondary_text}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </>
  );

  const dropdownEl = showDropdown ? (
    <View style={[
      styles.dropdown,
      dropdownAbove ? styles.dropdownAboveGap : styles.dropdownBelowGap,
    ]}>
      {dropdownContent}
    </View>
  ) : null;

  return (
    <View
      ref={wrapperRef}
      style={[
        styles.wrapper,
        // Raise stacking context when showing so dropdown isn't hidden behind
        // the other AddressInput's background.
        showDropdown && { zIndex: 200 },
      ]}
    >
      <Text style={[styles.label, { textAlign: align }]}>{label}</Text>

      {voiceState === "listening" && (
        <View style={styles.listeningBanner}>
          <Feather name="mic" size={13} color="#FF3B30" />
          <Text style={styles.listeningText}>{t.voiceListening}</Text>
        </View>
      )}
      {voiceState === "unsupported" && (
        <View style={styles.listeningBanner}>
          <Text style={[styles.listeningText, { color: "#FF9500" }]}>{t.voiceNotSupported}</Text>
        </View>
      )}
      {voiceState === "error" && (
        <View style={styles.listeningBanner}>
          <Text style={[styles.listeningText, { color: "#FF9500" }]}>{t.voiceError}</Text>
        </View>
      )}

      {/*
        dropdownAbove=true  →  column-reverse wrapper:
          JSX order [inputRow, dropdownEl] renders visually as
          [dropdown above the input][inputRow]
          The wrapper gets zIndex: 200 so it floats above the origin input card.

        dropdownAbove=false → normal column: dropdown appears below the input.
      */}
      <View style={[
        dropdownAbove ? styles.inputAndDropAbove : undefined,
        showDropdown && dropdownAbove && styles.inputAndDropAboveActive,
      ]}>
        <View
          style={[
            styles.inputRow,
            focused && styles.inputRowFocused,
            voiceState === "listening" && styles.inputRowListening,
          ]}
        >
          {/* Right cluster: icon then mic */}
          <View style={styles.rightCluster}>
            {iconLoading ? (
              <ActivityIndicator size="small" color={iconColor} />
            ) : onIconPress ? (
              <TouchableOpacity
                onPress={onIconPress}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                activeOpacity={0.6}
              >
                <Feather name={icon} size={18} color={iconColor} />
              </TouchableOpacity>
            ) : (
              <Feather name={icon} size={18} color={iconColor} />
            )}
            <MicButton
              voiceState={voiceState}
              isSupported={isSupported}
              onPress={handleMicPress}
            />
          </View>

          <TextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#505050"
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            editable={editable}
            textAlign="right"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />

          {searching && (
            <ActivityIndicator size="small" color="#FFD60A" />
          )}
          {!searching && value.length > 0 && onClear && (
            <TouchableOpacity
              onPress={onClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x-circle" size={17} color="#505050" />
            </TouchableOpacity>
          )}
        </View>

        {dropdownEl}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    // zIndex set inline when dropdown is open
  },
  label: {
    color: "#A0A0A0",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  listeningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  listeningText: {
    color: "#FF3B30",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#282828",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 15 : 11,
    gap: 10,
  },
  inputRowFocused: {
    borderColor: "#FFD60A66",
    backgroundColor: "#212121",
  },
  inputRowListening: {
    borderColor: "#FF3B3066",
    backgroundColor: "#1F1414",
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "center",
    paddingVertical: 0,
    writingDirection: "rtl",
    overflow: "hidden",
  },
  // column-reverse: JSX [inputRow, dropdown] → visual [dropdown ↑][inputRow]
  inputAndDropAbove: {
    flexDirection: "column-reverse",
  },
  // When active (dropdown open + above mode), raise above sibling inputs
  inputAndDropAboveActive: {
    zIndex: 200,
  },
  dropdown: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    overflow: "hidden",
    maxHeight: 260,
    // Appear on top of other stacked elements
    zIndex: 200,
    ...Platform.select({ android: { elevation: 8 } }),
  },
  dropdownList: {
    flexGrow: 0,
  },
  dropdownBelowGap: {
    marginTop: 5,
  },
  dropdownAboveGap: {
    marginBottom: 5,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  searchingText: {
    color: "#808080",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dropdownItemLast: {},
  dropdownTextCol: {
    flex: 1,
    gap: 2,
  },
  dropdownShort: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  dropdownFull: {
    color: "#686868",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#252525",
    marginHorizontal: 12,
  },
});
