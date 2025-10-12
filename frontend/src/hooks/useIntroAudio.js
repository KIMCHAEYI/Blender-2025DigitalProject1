// 📄 src/hooks/useIntroAudio.js
import { useEffect, useRef } from "react";
import { useVoice } from "../contexts/VoiceContext";
import { AUDIO } from "../tts/AudioManifest.js";

/**
 * 🎧 useIntroAudio
 * - 페이지 진입 시 지정된 오디오 키(audioKey)에 맞는 음성을 1회 자동 재생
 * - onEnded 콜백은 음성 재생 완료 시 호출
 */
export function useIntroAudio(audioKey, onEnded) {
  const { voice, play } = useVoice();
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (!voice || hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    const src = AUDIO[audioKey]?.[voice];
    if (!src) {
      console.warn("❌ 해당 오디오 파일을 찾을 수 없습니다:", audioKey, voice);
      if (onEnded) onEnded();
      return;
    }

    console.log("🎧 자동재생 시도:", src);

    try {
      play({
        src,
        onEnded: () => {
          console.log("✅ 오디오 재생 완료:", audioKey);
          if (onEnded) onEnded();
        },
      });
    } catch (err) {
      console.warn("⚠️ 오디오 재생 중 예외 발생, 콜백 강제 호출:", err);
      if (onEnded) onEnded();
    }

    // ✅ 브라우저 자동재생 차단 대비 (fallback)
    const fallbackTimer = setTimeout(() => {
      console.log("⏰ 자동재생 차단 감지 → 콜백 강제 실행");
      if (onEnded) onEnded();
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, [voice, play, audioKey, onEnded]);
}
