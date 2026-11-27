import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent } from "react";

export interface ClampedNumberTextOptions {
  min: number;
  max?: number;
  // Digits allowed after the decimal separator: 0 (the default) for whole numbers, 2 for
  // a price per gram.
  decimals?: number;
}

function formatValue(value: number | null, decimals: number): string {
  if (value === null) return "";
  return decimals > 0 ? String(Number(value.toFixed(decimals))) : String(value);
}

// What the colorist typed, cleaned up: digits only, or for a decimal field digits with one
// separator -- a comma (the Ukrainian keyboard's) reads as a point -- and no more fraction
// digits than allowed. Leading zeros go ("05" -> "5", but "0.5" stays).
function sanitize(raw: string, decimals: number): string {
  if (decimals === 0) return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const cleaned = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  const fraction = rest.join("").slice(0, decimals);
  const wholeDigits = whole.replace(/^0+(?=\d)/, "");
  return rest.length > 0 ? `${wholeDigits}.${fraction}` : wholeDigits;
}

// Backs a text-typed numeric <input> with a local string buffer instead of binding `value`
// directly to a number. A plain `type="number"` input bound to a number prop turns a
// cleared field into 0 on the spot (the browser then shows "0", and the next digit lands
// after it: "05"), and rejects a decimal comma outright -- so a price could never be
// retyped. Here the field holds whatever is being typed; every valid number is reported as
// it is typed, and leaving the field empty or below `min` restores `min`.
export function useClampedNumberText(
  value: number | null,
  onChange: (value: number) => void,
  { min, max, decimals = 0 }: ClampedNumberTextOptions,
) {
  const [text, setText] = useState(formatValue(value, decimals));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(formatValue(value, decimals));
    }
  }, [value, decimals]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const sanitized = sanitize(e.target.value, decimals);
    if (sanitized === "" || sanitized === ".") {
      setText(sanitized);
      return;
    }
    const typed = Number(sanitized);
    const clamped = max !== undefined ? Math.min(max, typed) : typed;
    setText(clamped !== typed ? formatValue(clamped, decimals) : sanitized);
    lastEmitted.current = clamped;
    onChange(clamped);
  }

  function handleFocus(e: FocusEvent<HTMLInputElement>) {
    e.target.select();
  }

  function handleBlur() {
    if (text === "" || text === "." || Number(text) < min) {
      setText(formatValue(min, decimals));
      lastEmitted.current = min;
      onChange(min);
    } else {
      setText(formatValue(Number(text), decimals));
    }
  }

  return {
    text,
    inputProps: {
      type: "text" as const,
      inputMode: decimals > 0 ? ("decimal" as const) : ("numeric" as const),
      ...(decimals === 0 && { pattern: "[0-9]*" }),
      value: text,
      onFocus: handleFocus,
      onChange: handleChange,
      onBlur: handleBlur,
      // `type="text"` above (see comment) forfeits the native <input type="number">
      // spinbutton role/min/max/now exposed to assistive tech -- restore it explicitly
      // so screen readers still announce this as a bounded number field.
      role: "spinbutton" as const,
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": value ?? undefined,
    },
  };
}
