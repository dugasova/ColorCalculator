// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NumberInput, type NumberInputProps } from "./NumberInput";

afterEach(cleanup);

// A parent that keeps the value, as every screen does, so a typed number comes back down
// as the `value` prop.
function Harness({
  initial,
  onValue,
  ...props
}: Partial<NumberInputProps> & { initial: number | null; onValue?: (n: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="n">Price</label>
      <NumberInput
        id="n"
        value={value}
        onValueChange={n => {
          setValue(n);
          onValue?.(n);
        }}
        {...props}
      />
      <output data-testid="value">{String(value)}</output>
    </>
  );
}

const field = () => screen.getByLabelText("Price") as HTMLInputElement;
const type = (text: string) => fireEvent.change(field(), { target: { value: text } });

describe("NumberInput", () => {
  it("can be cleared and retyped without a 0 sticking in front", () => {
    render(<Harness initial={0} decimals={2} />);

    type("");
    expect(field().value).toBe("");
    type("5");
    expect(field().value).toBe("5");
    expect(screen.getByTestId("value")).toHaveTextContent("5");
  });

  it("takes a decimal comma as well as a point, and keeps a half-typed decimal", () => {
    render(<Harness initial={0} decimals={2} />);

    type("0,");
    expect(field().value).toBe("0.");
    type("0,25");
    expect(field().value).toBe("0.25");
    expect(screen.getByTestId("value")).toHaveTextContent("0.25");
    type("0,256");
    expect(field().value).toBe("0.25"); // no more than two decimals
  });

  it("drops leading zeros and anything that isn't a number", () => {
    render(<Harness initial={0} />);

    type("05");
    expect(field().value).toBe("5");
    type("1a2");
    expect(field().value).toBe("12");
    type("1.5");
    expect(field().value).toBe("15"); // a whole-number field has no separator
  });

  it("restores the minimum when left empty or below it", () => {
    const onValue = vi.fn();
    render(<Harness initial={4} min={1} decimals={1} onValue={onValue} />);

    type("");
    fireEvent.blur(field());
    expect(field().value).toBe("1");
    expect(onValue).toHaveBeenLastCalledWith(1);

    type("0,5");
    fireEvent.blur(field());
    expect(field().value).toBe("1");
  });

  it("caps at the maximum", () => {
    render(<Harness initial={50} max={100} />);

    type("150");
    expect(field().value).toBe("100");
  });

  it("shows an empty field for a null value and a rounded one otherwise", () => {
    render(<Harness initial={null} decimals={2} />);
    expect(field().value).toBe("");

    cleanup();
    render(<Harness initial={8.400000000001} decimals={2} />);
    expect(field().value).toBe("8.4");
  });
});
