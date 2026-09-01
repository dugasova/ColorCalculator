// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '../../i18n';
import { SessionDetailsPanel } from './SessionDetailsPanel';

// See ColorStepCard.interaction.test.tsx for why this project needs an explicit
// afterEach(cleanup): it doesn't set vitest's `test.globals: true`.
afterEach(cleanup);

function fillRequiredFieldsAndSave() {
  fireEvent.change(screen.getByLabelText('Client name'), { target: { value: 'Anna K.' } });
  fireEvent.click(screen.getByLabelText('Patch test not required (no new product, no reaction history)'));
  fireEvent.click(screen.getByRole('button', { name: 'Save to history' }));
}

describe('SessionDetailsPanel onSaved', () => {
  it('calls onSaved once the "Saved!" confirmation finishes -- not synchronously with onSave', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onSaved = vi.fn();
    render(
      <SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={onSave} onSaved={onSaved} />
    );

    fillRequiredFieldsAndSave();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    // The "Saved!" confirmation is still showing at this point -- onSaved (which resets
    // the whole calculator) must not fire until that feedback window has run its course.
    expect(onSaved).not.toHaveBeenCalled();

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 2500 });
  });

  it('never throws when onSaved is omitted -- ColorStepCard has no reason to reset a step this way', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={onSave} />);

    fillRequiredFieldsAndSave();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save to history' })).not.toBeDisabled();
    }, { timeout: 2500 });
  });
});
