// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { MissingShadesNotice } from "./MissingShadesNotice";

afterEach(cleanup);

describe("MissingShadesNotice", () => {
  it("names the shades that left the palette and hides once dismissed", () => {
    render(<MissingShadesNotice codes={["9P", "1N"]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No longer in the palette: 9P, 1N.");
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows again for the next repeat's fresh list", () => {
    const { rerender } = render(<MissingShadesNotice codes={["9P"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    rerender(<MissingShadesNotice codes={["9P"]} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders nothing with no missing shade", () => {
    const { container } = render(<MissingShadesNotice codes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
