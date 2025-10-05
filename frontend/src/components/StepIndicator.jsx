import React from "react";
import styles from "./StepIndicator.module.css";

/**
 * StepIndicator
 * 진행 단계 표시 컴포넌트
 * variant="kids" : 아동 친화형 (이모지/애니메이션 포함)
 */
export default function StepIndicator({
  current = 1,
  total = 5,
  variant = "kids",
  className = "",
  style = {},
}) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100));

  // 아동용 스텝 아이콘
  const STEP_ICONS = ["😀", "🎂", "🚻", "🔐", "👆"];

  if (variant === "kids") {
    return (
      <div
        className={`${styles.kidsWrap} ${className}`}
        style={style}
        aria-label={`총 ${total}단계 중 ${current}단계`}
      >
        <div className={styles.kids}>
          {Array.from({ length: total }, (_, i) => {
            const idx = i + 1;
            const done = idx < current;
            const active = idx === current;
            const icon = STEP_ICONS[i] || idx;

            return (
              <React.Fragment key={idx}>
                {/* 단계 점 표시 */}
                <span
                  className={`${styles.kidDot} 
                    ${done ? styles.kidDotDone : ""} 
                    ${active ? styles.kidDotActive : ""}`}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${idx}단계 ${
                    done ? "완료" : active ? "현재" : "예정"
                  }`}
                >
                  <span className={styles.kidEmoji}>{done ? "⭐️" : icon}</span>
                </span>

                {/* 연결선 */}
                {idx < total && (
                  <span
                    className={`${styles.connectorKids} ${
                      done ? styles.connectorKidsDone : ""
                    }`}
                    aria-hidden
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 단계 라벨 */}
        <span className={styles.label}>
          {current}/{total}
        </span>
      </div>
    );
  }

  return (
    <span
      className={`${styles.step} ${styles.chip} ${className}`}
      style={style}
    >
      {current}/{total}
    </span>
  );
}
