// src/hooks/useIntroAudio.js
import { useEffect, useRef } from "react";
import { useVoice } from "../contexts/VoiceContext";
import { AUDIO } from "../tts/AudioManifest.js";

/**
 * 🎧 useIntroAudio
 * - 페이지 진입 시 지정된 오디오 키(audioKey)에 맞는 음성을 1회 자동 재생
 * - onEnded 콜백은 음성 재생 완료 시 호출
 * @param {string} audioKey - AUDIO 매니페스트 키 (예: "step1.draw_house")
 * @param {function} onEnded - 재생 종료 후 실행할 콜백
 */
export function useIntroAudio(audioKey, onEnded) {
  const { voice, play } = useVoice();
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    // 🔒 이미 재생되었거나 캐릭터 미선택 시 무시
    if (!voice || hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    // 🔍 오디오 파일 경로 가져오기
    const src = AUDIO[audioKey]?.[voice];
    if (!src) {
      console.warn("❌ 해당 오디오 파일을 찾을 수 없습니다:", audioKey, voice);
      if (onEnded) onEnded();
      return;
    }

    console.log("🎧 자동재생 시도:", src);

    // 🎵 음성 재생
    play({
      src,
      onEnded: () => {
        console.log("✅ 오디오 재생 완료:", audioKey);
        if (onEnded) onEnded();
      },
    });
  }, [voice, play, audioKey, onEnded]);
}
