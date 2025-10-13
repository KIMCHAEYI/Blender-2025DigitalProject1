// src/contexts/VoiceContext.jsx
import React, { createContext, useContext, useRef, useState, useEffect } from "react";

const VoiceContext = createContext();

export function VoiceProvider({ children }) {
  const [voice, setVoice] = useState(() => sessionStorage.getItem("voice") || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const lastSrcRef = useRef(null);

  useEffect(() => {
    if (voice) sessionStorage.setItem("voice", voice);
    else sessionStorage.removeItem("voice");
  }, [voice]);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const play = ({ src, onEnded }) => {
    stop(); // ✅ 항상 기존 오디오 먼저 중지
    if (!src) return;

    if (lastSrcRef.current === src && isPlaying) {
      console.log("⚠️ 이미 같은 오디오가 재생 중:", src);
      return;
    }

    try {
      const safeSrc = encodeURI(src);
      const audio = new Audio(safeSrc);
      
      audioRef.current = audio;
      lastSrcRef.current = src;
      setIsPlaying(true);

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        if (onEnded) onEnded();
      });

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("⚠️ 오디오 자동재생 차단됨:", err);
          setIsPlaying(false);
        });
      }
    } catch (err) {
      console.error("❌ 오디오 재생 중 오류:", err);
      setIsPlaying(false);
    }

    return () => stop();
  };

  return (
    <VoiceContext.Provider value={{ voice, setVoice, play, stop, isPlaying }}>
      {children}
    </VoiceContext.Provider>
  );
}

export const useVoice = () => useContext(VoiceContext);

export function unlockAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    if (ctx.state === "running") {
      console.log("🔓 오디오 컨텍스트 이미 활성화됨");
      return;
    }

    ctx.resume().then(() => {
      console.log("🔓 오디오 컨텍스트 활성화 완료 — 자동재생 허용됨");
    });
  } catch (err) {
    console.warn("⚠️ 오디오 컨텍스트 활성화 실패:", err);
  }
}
