import { useTranslation } from "react-i18next";

export interface QtyStepperProps {
  id: string;
  label: string;
  // The field's text as typed: a blank or invalid value is the caller's to interpret.
  value: string;
  // The quantity the buttons step from.
  quantity: number;
  onChange: (value: string) => void;
}

// A whole-number quantity with − / + buttons around a field styled like the app's own
// inputs, so an order is adjusted with a tap instead of typing on a phone.
export function QtyStepper({ id, label, value, quantity, onChange }: QtyStepperProps) {
  const { t } = useTranslation();
  return (
    <div className="qty-stepper">
      <button
        type="button"
        className="qty-stepper__button"
        aria-label={t("orders.decrease", { label })}
        disabled={quantity <= 0}
        onClick={() => onChange(String(Math.max(0, quantity - 1)))}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        className="qty-stepper__input"
        aria-label={t("orders.qtyFor", { label })}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button
        type="button"
        className="qty-stepper__button"
        aria-label={t("orders.increase", { label })}
        onClick={() => onChange(String(quantity + 1))}
      >
        +
      </button>
    </div>
  );
}
