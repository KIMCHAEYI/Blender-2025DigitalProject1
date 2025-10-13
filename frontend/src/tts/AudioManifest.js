// src/tts/AudioManifest.js
export const AUDIO = {
  // 캐릭터 인트로
  "character.start": {
    mongi: "/audio/mongi/몽이가 함께 떠나요!.mp3",
    gree: "/audio/gree/그리가 함께 떠나요!.mp3",
  },

  // STEP 1 (집, 나무, 사람)
  "step1.start_exam": {
    mongi: "/audio/mongi/검사를 시작해 볼까요.mp3",
    gree: "/audio/gree/검사를 시작해 볼까요.mp3",
  },

  "step1.draw_house": {
    mongi: "/audio/mongi/집을 그려주세요!.mp3",
    gree: "/audio/gree/집을 그려주세요!.mp3",
  },

  "step1.draw_tree": {
    mongi: "/audio/mongi/나무를 그려주세요!.mp3",
    gree: "/audio/gree/나무를 그려주세요!.mp3",
  },

   "step1.select_gender": {
    mongi: "/audio/mongi/먼저 그릴 사람의 성별을 선택해 주세요!.mp3",
    gree: "/audio/gree/먼저 그릴 사람의 성별을 선택해 주세요!.mp3",
  },

  "step1.draw_person_male": {
    mongi: "/audio/mongi/남자 사람을 그려주세요.mp3",
    gree: "/audio/gree/남자 사람을 그려주세요.mp3",
  },

  "step1.draw_person_female": {
    mongi: "/audio/mongi/여자 사람을 그려주세요.mp3",
    gree: "/audio/gree/여자 사람을 그려주세요..mp3",
  },
 
  "step1.hint_tool": {
    mongi:
      "/audio/mongi/잘 모르겠다면 물음표를 눌러서 그림 도구 사용법을 확인해 주세요!.mp3",
    gree:
      "/audio/gree/잘 모르겠다면 물음표를 눌러서 그림 도구 사용법을 확인해 주세요!.mp3",
  },

  // STEP 2 (2단계 그림)
  "step2.start": {
    mongi: "/audio/mongi/이제 2단계 그림을 그릴 순서예요!.mp3",
    gree: "/audio/gree/이제 2단계 그림을 그릴 순서예요!.mp3",
  },
  "step2.check_question": {
    mongi:
      "/audio/mongi/2단계 질문을 확인하고 원하는 색깔을 활용해서 그림을 그려주세요!.mp3",
    gree:
      "/audio/gree/2단계 질문을 확인하고 원하는 색깔을 활용해서 그림을 그려주세요!.mp3",
  },

  // 공통 (회전, 분석 중 등)
  "common.ai_analyzing": {
    mongi: "/audio/mongi/AI가 분석 중이에요 잠시만 기다려 주세요!.mp3",
    gree: "/audio/gree/AI가 분석 중이에요 잠시만 기다려 주세요!.mp3",
  },
  "common.rotate_horizontal": {
    mongi: "/audio/mongi/화면을 가로로 돌려주세요.mp3",
    gree: "/audio/gree/화면을 가로로 돌려주세요!.mp3",
  },
  "common.rotate_vertical": {
    mongi: "/audio/mongi/화면을 세로로 돌려주세요.mp3",
    gree: "/audio/gree/화면을 세로로 돌려주세요!.mp3",
  },
};
