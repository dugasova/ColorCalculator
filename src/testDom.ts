import { fireEvent, screen } from "@testing-library/react";

// DOM helpers shared by the jsdom component tests.

// Picks an option in the custom Select (components/common/Select). It has no native
// <select> "change" event to fire: it opens on a click of its trigger button and commits
// a value on a click of the matching option, identified by the `data-value` the component
// stamps on each <li role="option">. This mirrors how a colorist actually operates it.
export function chooseOption(labelText: string, value: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  const option = document.querySelector(`[role="option"][data-value="${value}"]`);
  if (option === null) throw new Error(`No option with value "${value}" in the "${labelText}" dropdown`);
  fireEvent.click(option);
}
