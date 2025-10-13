import { useEffect } from "react";
import { useVoice } from "../../contexts/VoiceContext.jsx";
import { AUDIO } from "../../tts/AudioManifest.js";

/**
 * <TTSPlayer audioKey="step1.draw_house" onEnded={()=>setReady(true)} />
 * - 페이지 진입 시 자동 재생
 * - 캐릭터(voice)에 따라 mp3 분기
 * - 캐릭터 선택 전에는 재생하지 않음
 */
export default function TTSPlayer({ audioKey, onEnded, autoplay = true }) {
  const { voice, play } = useVoice();

  useEffect(() => {
    //  캐릭터가 선택되지 않았거나 자동 재생이 꺼져 있으면 실행 안 함
    if (!autoplay || !voice) return;
    const map = AUDIO[audioKey];
    if (!map) return;

    const src = map[voice] || map.gree;
    const cleanup = play({ src, onEnded });
    return cleanup;
  }, [audioKey, voice]);

  return null;
}
