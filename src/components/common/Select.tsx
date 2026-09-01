import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import clsx from "clsx";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: ReactNode;
  // Plain text used for keyboard typeahead when `label` isn't a bare string (e.g. a
  // shade option whose label is "code tone" — typeahead should still match on the code).
  searchText?: string;
  swatchColor?: string;
}

export interface SelectProps {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

const TYPEAHEAD_RESET_MS = 600;

// A from-scratch listbox replacing the native <select>: the native popup can't be
// restyled to match the app's design (only `<option>` color/background is stylable, and
// only in some browsers), so this renders its own trigger + popup and follows the
// ARIA 1.2 combobox-with-listbox-popup pattern -- the trigger button owns keyboard focus
// and DOM focus the whole time; the active option is tracked with `aria-activedescendant`
// rather than moving focus into the popup, matching how a native <select> keeps focus on
// itself while its (OS-drawn) popup is open.
export function Select({ id, value, options, onChange, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const typeahead = useRef({ text: '', timeout: 0 as number });

  const selectedIndex = options.findIndex(o => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  function openList() {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function toggleOpen() {
    if (open) {
      setOpen(false);
    } else {
      openList();
    }
  }

  function commit(index: number) {
    const option = options[index];
    if (option === undefined) return;
    onChange(option.value);
    setOpen(false);
  }

  function jumpToTypeahead(char: string, autoCommitWhenClosed: boolean) {
    if (options.length === 0) return;
    const buffer = typeahead.current;
    clearTimeout(buffer.timeout);
    buffer.text += char.toLowerCase();
    buffer.timeout = setTimeout(() => { buffer.text = ''; }, TYPEAHEAD_RESET_MS);
    const anchor = buffer.text.length > 1 ? 0 : (activeIndex >= 0 ? activeIndex + 1 : selectedIndex + 1);
    for (let offset = 0; offset < options.length; offset++) {
      const index = (anchor + offset) % options.length;
      const option = options[index];
      const text = (option.searchText ?? (typeof option.label === 'string' ? option.label : '')).toLowerCase();
      if (text.startsWith(buffer.text)) {
        setActiveIndex(index);
        if (autoCommitWhenClosed) commit(index);
        return;
      }
    }
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Enter':
        case ' ':
          e.preventDefault();
          openList();
          return;
        default:
          if (e.key.length === 1) jumpToTypeahead(e.key, true);
          return;
      }
    }
    if (options.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(options.length - 1, i < 0 ? 0 : i + 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(0, i < 0 ? 0 : i - 1));
        return;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        return;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(activeIndex);
        return;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        return;
      case 'Tab':
        setOpen(false);
        return;
      default:
        if (e.key.length === 1) jumpToTypeahead(e.key, false);
    }
  }

  const listboxId = `${id}-listbox`;

  return (
    <div className={clsx('select', open && 'select--open', className)} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="select__trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="select__value">
          {selected?.swatchColor !== undefined && (
            <span className="select__swatch" style={{ backgroundColor: selected.swatchColor }} />
          )}
          <span className="select__value-text">{selected?.label}</span>
        </span>
        <svg className="select__chevron" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul id={listboxId} role="listbox" className="select__popup">
          {options.map((option, index) => (
            // Keyboard selection is handled entirely by the trigger button's onKeyDown
            // (ArrowUp/Down/Enter move `activeIndex` and commit it via aria-activedescendant,
            // see handleTriggerKeyDown above); this li's onClick is the mouse-only path and
            // is never meant to receive keyboard focus itself.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={option.value}
              id={`${listboxId}-option-${index}`}
              role="option"
              data-value={option.value}
              aria-selected={option.value === value}
              ref={el => { optionRefs.current[index] = el; }}
              className={clsx('select__option', index === activeIndex && 'select__option--active', option.value === value && 'select__option--selected')}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              {option.swatchColor !== undefined && (
                <span className="select__swatch" style={{ backgroundColor: option.swatchColor }} />
              )}
              <span className="select__option-label">{option.label}</span>
              {option.value === value && (
                <svg className="select__check" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
