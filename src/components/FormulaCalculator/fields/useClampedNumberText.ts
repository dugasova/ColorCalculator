import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent } from "react";

export interface ClampedNumberTextOptions {
  min: number;
  max?: number;
}

// Backs a text-typed numeric <input> with a local string buffer instead of binding `value`
// directly to a number. A plain `type="number"` input bound to a number prop re-renders on
// every keystroke and can briefly show artifacts like "040" when typing over a leading zero
// (e.g. the default 0/60) before the parent's re-render catches up. Selecting all text on
// focus, sanitizing to digits-only, and stripping leading zeros synchronously in the change
// handler avoids that regardless of how slow the parent's re-render is.
export function useClampedNumberText(value: number, onChange: (value: number) => void, { min, max }: ClampedNumberTextOptions) {
  const [text, setText] = useState(String(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(String(value));
    }
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    if (digitsOnly === '') {
      setText('');
      return;
    }
    const clamped = max !== undefined ? Math.min(max, Number(digitsOnly)) : Number(digitsOnly);
    setText(String(clamped));
    lastEmitted.current = clamped;
    onChange(clamped);
  }

  function handleFocus(e: FocusEvent<HTMLInputElement>) {
    e.target.select();
  }

  function handleBlur() {
    if (text === '' || Number(text) < min) {
      setText(String(min));
      lastEmitted.current = min;
      onChange(min);
    }
  }

  return {
    text,
    inputProps: {
      type: 'text' as const,
      inputMode: 'numeric' as const,
      pattern: '[0-9]*',
      value: text,
      onFocus: handleFocus,
      onChange: handleChange,
      onBlur: handleBlur,
    },
  };
}
