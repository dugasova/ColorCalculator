import type { InputHTMLAttributes } from "react";
import { useClampedNumberText } from "./useClampedNumberText";

export interface NumberInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "min" | "max"
> {
  // Null shows an empty field (e.g. a service price with nothing to suggest yet).
  value: number | null;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  // Digits after the decimal separator: 2 for prices, 1 for a markup, 0 for grams/minutes.
  decimals?: number;
}

// A numeric field that can be cleared and retyped, and takes a decimal comma: see
// useClampedNumberText for why a bare `type="number"` bound to a number can't.
export function NumberInput({ value, onValueChange, min = 0, max, decimals = 0, ...rest }: NumberInputProps) {
  const { inputProps } = useClampedNumberText(value, onValueChange, { min, max, decimals });
  return <input {...rest} {...inputProps} />;
}
