import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import type { LangCode } from "@/constants/translations";

const LANG_LOCALE: Record<LangCode, string> = {
  he: "he-IL",
  en: "en-US",
  ar: "ar-IL",
  ru: "ru-RU",
};

/**
 * How long silence must persist (after the last detected speech) before we
 * auto-stop and fire the result.  Matches Waze-like "say it once" UX.
 */
const SILENCE_TIMEOUT_MS = 1200;

/**
 * Hard cap: if the user taps the mic but never says anything, abort after
 * this many ms so the mic doesn't stay on indefinitely.
 */
const MAX_WAIT_MS = 8000;

export type VoiceState = "idle" | "listening" | "done" | "error" | "unsupported";

export interface UseVoiceInputReturn {
  voiceState: VoiceState;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
}

export function useVoiceInput(
  lang: LangCode,
  onResult: (text: string) => void,
  onInterim?: (text: string) => void,
): UseVoiceInputReturn {
  const stateRef       = useRef<VoiceState>("idle");
  const [voiceState, setVoiceStateRaw] = useState<VoiceState>("idle");
  const recognitionRef = useRef<unknown>(null);
  const silenceTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTextRef   = useRef<string>("");

  const setVoiceState = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setVoiceStateRaw(s);
  }, []);

  const clearTimer = useCallback(() => {
    if (silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null; }
  }, []);

  const armTimer = useCallback((ms: number) => {
    clearTimer();
    silenceTimer.current = setTimeout(() => {
      if (recognitionRef.current) {
        (recognitionRef.current as { stop: () => void }).stop();
      }
    }, ms);
  }, [clearTimer]);

  const win =
    Platform.OS === "web" && typeof window !== "undefined"
      ? (window as unknown as Record<string, unknown>)
      : null;

  const isSupported = !!(win && (win.SpeechRecognition || win.webkitSpeechRecognition));

  const stopListening = useCallback(() => {
    clearTimer();
    if (recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      recognitionRef.current = null;
    }
    setVoiceState("idle");
  }, [setVoiceState, clearTimer]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setVoiceState("unsupported");
      setTimeout(() => setVoiceState("idle"), 2000);
      return;
    }

    // Tear down any existing session
    clearTimer();
    if (recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      recognitionRef.current = null;
    }
    finalTextRef.current = "";

    const w = window as unknown as Record<string, unknown>;
    const SR =
      (w.SpeechRecognition as new () => unknown) ||
      (w.webkitSpeechRecognition as new () => unknown);

    const rec = new SR() as {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      stop: () => void;
      onstart: (() => void) | null;
      onresult: ((e: {
        resultIndex: number;
        results: {
          length: number;
          [k: number]: { isFinal: boolean; [k: number]: { transcript: string } };
        };
      }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };

    // continuous=true  → we decide when to stop (via silence timer)
    // interimResults=true → we get incremental events to reset the timer
    rec.lang            = LANG_LOCALE[lang];
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setVoiceState("listening");
      finalTextRef.current = "";
      // Safety net: if user never speaks, stop after MAX_WAIT_MS
      armTimer(MAX_WAIT_MS);
    };

    rec.onresult = (event) => {
      // Any detected activity → reset the 1.2-second silence window
      armTimer(SILENCE_TIMEOUT_MS);

      // Separate final vs interim segments from this event batch
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTextRef.current += event.results[i][0].transcript;
        } else {
          interimChunk += event.results[i][0].transcript;
        }
      }

      // Fire interim callback with best current transcription so words
      // appear on screen instantly while the user is still speaking.
      const liveText = (finalTextRef.current + interimChunk).trim();
      if (liveText && onInterim) onInterim(liveText);
    };

    rec.onerror = () => {
      clearTimer();
      setVoiceState("error");
      setTimeout(() => setVoiceState("idle"), 2000);
    };

    rec.onend = () => {
      clearTimer();
      recognitionRef.current = null;

      const text = finalTextRef.current.trim();
      finalTextRef.current = "";

      if (text) {
        // Good result — show "done" tick briefly, then return to idle
        setVoiceState("done");
        onResult(text);
        setTimeout(() => setVoiceState("idle"), 1500);
      } else if (stateRef.current === "listening") {
        // Silence only (no speech detected) — go quietly back to idle
        setVoiceState("idle");
      }
      // If state was already "idle" (manual stop via stopListening), do nothing
    };

    recognitionRef.current = rec;
    rec.start();
  }, [isSupported, lang, onResult, onInterim, setVoiceState, clearTimer, armTimer]);

  return { voiceState, isSupported, startListening, stopListening };
}
