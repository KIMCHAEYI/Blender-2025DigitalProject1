import React from "react";
import Button from "./Button";

export default function NextButton({
  enabled,
  onClick,
  children = "다음",
  className = "btn-primary",
  ...rest
}) {
  const buttonClass = `${className} ${enabled ? "" : "disabled"}`;

  return (
    <Button
      className={buttonClass}
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      aria-disabled={!enabled}
      {...rest}
    >
      {children}
    </Button>
  );
}
