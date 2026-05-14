/**
 * useKeepAliveAudio — silent looping audio to prevent browser GPS suspension
 *
 * Web browsers suspend GPS (and the entire JS event loop) when a tab is hidden
 * or the screen locks.  Playing a silent looping audio stream keeps the browser
 * audio context alive, which in turn keeps the tab "active" long enough for
 * navigator.geolocation.watchPosition to continue firing on most mobile browsers.
 *
 * ── How it works ─────────────────────────────────────────────────────────────
 *   1. On startAudio() a minimal silent WAV is generated as a data-URI entirely
 *      in memory (no file, no network request).
 *   2. An <audio> element is created, set to loop at volume 0, and play() is
 *      called synchronously within the user-gesture handler (meter start button)
 *      so iOS Safari grants autoplay permission.
 *   3. stopAudio() pauses and destroys the element.
 *
 * ── Platform scope ────────────────────────────────────────────────────────────
 *   Web only.  On native the OS foreground service keeps GPS alive natively;
 *   this hook is a strict no-op on iOS/Android React Native.
 */

import { useCallback, useRef } from "react";
import { Platform } from "react-native";

// ── Build a minimal silent WAV as a data-URI (runs once, lazily) ──────────────
// 8 kHz · 8-bit · mono · 0.5 s  →  44-byte header + 4 000-byte body = 4 044 bytes
// base64 ≈ 5 400 chars — tiny, no perceptible overhead.
function buildSilentWavDataUri(): string {
  const sampleRate = 8000;
  const durationSec = 0.5;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples;           // 1 byte per sample (8-bit)
  const totalSize = 44 + dataSize;

  const buf = new ArrayBuffer(totalSize);
  const v = new DataView(buf);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };

  // RIFF chunk descriptor
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);   // ChunkSize
  writeStr(8, "WAVE");

  // fmt sub-chunk
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);             // Subchunk1Size (PCM = 16)
  v.setUint16(20, 1, true);              // AudioFormat   (PCM = 1)
  v.setUint16(22, 1, true);              // NumChannels   (mono)
  v.setUint32(24, sampleRate, true);     // SampleRate
  v.setUint32(28, sampleRate, true);     // ByteRate      (rate * channels * bitsPerSample/8)
  v.setUint16(32, 1, true);              // BlockAlign    (channels * bitsPerSample/8)
  v.setUint16(34, 8, true);              // BitsPerSample

  // data sub-chunk
  writeStr(36, "data");
  v.setUint32(40, dataSize, true);       // Subchunk2Size

  // Silence: 0x80 = mid-point for unsigned 8-bit PCM
  for (let i = 0; i < numSamples; i++) v.setUint8(44 + i, 0x80);

  // Convert ArrayBuffer → base64
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(binary);
}

// Cached data-URI — built once per session on first call
let cachedDataUri: string | null = null;
function getSilentWavDataUri(): string {
  if (!cachedDataUri) cachedDataUri = buildSilentWavDataUri();
  return cachedDataUri;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useKeepAliveAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startAudio = useCallback(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined" || typeof Audio === "undefined") return;

    try {
      // Re-use existing element if already created (e.g. trip restored on mount)
      if (!audioRef.current) {
        const audio = new Audio(getSilentWavDataUri());
        audio.loop = true;
        audio.volume = 0;
        audio.muted = false;  // muted=false so the browser sees "real" audio output
        audioRef.current = audio;
      }

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked (e.g. page loaded without user gesture).
          // The next user interaction (button tap) will retry via the start() call.
        });
      }
    } catch {
      // Silently ignore — GPS still works; keepalive is best-effort
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (Platform.OS !== "web") return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";       // release the decoded buffer from memory
    } catch { /* ignore */ }
    audioRef.current = null;
  }, []);

  return { startAudio, stopAudio };
}
