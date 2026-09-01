// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '../../i18n';
import { ColorStepCard } from './ColorStepCard';
import type { ColorHistoryStep } from '../../history';

// This project doesn't set vitest's `test.globals: true` (every test file imports
// describe/it/expect explicitly), so @testing-library/react's automatic afterEach
// cleanup -- which relies on detecting a global `afterEach` -- never registers. Without
// this, each test's rendered ColorStepCard stays in the DOM for every test after it in
// this file, and a later test's `screen` queries can match a leftover element from an
// earlier one instead of its own.
afterEach(cleanup);

// The behavior worth testing with a real DOM: the asymmetric override-reset scoping in
// useShadeFormulaState (a same-line target change keeps the additional shade; a brand/line
// change drops it, since the new pool may not have it) and the onChange effect that reports
// the computed step to ComplexColoringCalculator -- neither is observable via
// renderToStaticMarkup (see ColorStepCard.test.tsx), since it never runs effects or fires
// events. This file is the reason jsdom/@testing-library/react exist in this project.

type StepChangeMock = Mock<(step: ColorHistoryStep) => void>;

interface RenderedStep {
  onChange: StepChangeMock;
  onRemove: Mock<() => void>;
}

function renderStep(): RenderedStep {
  const onChange: StepChangeMock = vi.fn();
  const onRemove: Mock<() => void> = vi.fn();
  render(<ColorStepCard stepId="1" onChange={onChange} onRemove={onRemove} />);
  return { onChange, onRemove };
}

// The custom Select (see components/common/Select) has no native <select> "change" event
// to fire -- it opens on a click of its trigger button and commits a value on a click of
// the matching option, identified by the `data-value` the component stamps on each
// <li role="option">. This mirrors how a colorist actually operates it.
function chooseOption(labelText: string, value: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  const option = document.querySelector(`[role="option"][data-value="${value}"]`);
  if (option === null) throw new Error(`No option with value "${value}" in the "${labelText}" dropdown`);
  fireEvent.click(option);
}

function lastStep(onChange: StepChangeMock): ColorHistoryStep {
  return onChange.mock.calls[onChange.mock.calls.length - 1][0];
}

describe('ColorStepCard interaction', () => {
  it('reports the initial step to the parent on mount', () => {
    const { onChange } = renderStep();
    expect(onChange).toHaveBeenCalled();
    expect(lastStep(onChange).brandName).toBe('Generic');
    expect(lastStep(onChange).targetShade.code).toBe('1.0');
    expect(lastStep(onChange).pricePerGram).toBe(0.18);
  });

  it('keeps the additional shade when the target shade changes within the same line', () => {
    const { onChange } = renderStep();
    chooseOption("Additional shade (colorist's discretion)", '2.1');
    expect(lastStep(onChange).additionalShade?.code).toBe('2.1');

    chooseOption('Shade', '2.3');
    expect(lastStep(onChange).targetShade.code).toBe('2.3');
    expect(lastStep(onChange).additionalShade?.code).toBe('2.1');
  });

  it('drops the additional shade when the brand changes -- the new pool may not have it', () => {
    const { onChange } = renderStep();
    chooseOption("Additional shade (colorist's discretion)", '2.1');
    expect(lastStep(onChange).additionalShade?.code).toBe('2.1');

    chooseOption('Brand', 'wella');
    expect(lastStep(onChange).brandName).toBe('Wella');
    expect(lastStep(onChange).additionalShade).toBeNull();
  });

  it('keeps price-per-gram untouched by a brand change, unlike the additional shade', () => {
    const { onChange } = renderStep();
    fireEvent.change(screen.getByLabelText('Price per gram'), { target: { value: '0.25' } });
    expect(lastStep(onChange).pricePerGram).toBe(0.25);

    chooseOption('Brand', 'wella');
    expect(lastStep(onChange).pricePerGram).toBe(0.25);
  });

  it('calls onRemove exactly once when the remove button is clicked', () => {
    const { onRemove } = renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Remove step' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
