import React from "react";
import styles from "./StepIndicator.module.css";

export default function StepIndicator({
  current = 1,
  total = 5,
  variant = "chip", // "chip" | "plain" | "bar" | "bar+label" | "line" | "topline"
  className = "",
  style = {},
}) {
  const pctRaw = (current / total) * 100;
  const pct = Math.max(0, Math.min(100, pctRaw));

  switch (variant) {
    // switch 문 안에 추가
    case "kids": {
      return (
        <div
          className={`${styles.kidsWrap} ${className}`}
          style={style}
          aria-label={`총 ${total}단계 중 ${current}단계`}
        >
          <div className={styles.kids}>
            {Array.from({ length: total }).map((_, i) => {
              const idx = i + 1;
              const done = idx < current;
              const active = idx === current;
              return (
                <React.Fragment key={idx}>
                  <span
                    className={`${styles.kidDot} ${
                      done ? styles.kidDotDone : ""
                    } ${active ? styles.kidDotActive : ""}`}
                    aria-current={active ? "step" : undefined}
                    aria-label={`${idx}단계 ${
                      done ? "완료" : active ? "현재" : "예정"
                    }`}
                  >
                    {done ? <span className={styles.kidEmoji}>⭐️</span> : idx}
                  </span>
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
          <span className={styles.label}>
            {current}/{total}
          </span>
        </div>
      );
    }

    case "line":
      return (
        <div className={`${styles.lineWrap} ${className}`} style={style}>
          <div
            className={styles.line}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={current}
          >
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      );

    case "topline":
      return (
        <div className={`${styles.topline} ${className}`} style={style}>
          <i style={{ width: `${pct}%` }} />
        </div>
      );

    case "plain":
      return (
        <span
          className={`${styles.step} ${styles.plain} ${className}`}
          style={style}
        >
          {current}/{total}
        </span>
      );

    case "bar":
    case "bar+label":
      return (
        <div className={`${styles.head} ${className}`} style={style}>
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={current}
            aria-label={`진행도 ${current}/${total}`}
          >
            <i style={{ width: `${pct}%` }} />
          </div>
          {variant === "bar+label" && (
            <span className={styles.label}>
              {current}/{total}
            </span>
          )}
        </div>
      );

    default: // "chip"
      return (
        <span
          className={`${styles.step} ${styles.chip} ${className}`}
          style={style}
        >
          {current}/{total}
        </span>
      );
  }
}
