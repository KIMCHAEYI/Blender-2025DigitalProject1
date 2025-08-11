import React from "react";
import Button from "./Button";

export default function NextButton({
  enabled,
  onClick,
  children = "다음",
  className = "btn-primary",
  ...rest
}) {
  return (
    <Button
      type="primary"
      className={className}
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      aria-disabled={!enabled}
      {...rest}
    >
      {children}
    </Button>
  );
}
