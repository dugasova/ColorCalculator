// Loaded once per test file via vite.config.ts's `test.setupFiles` -- extends Vitest's
// `expect` with jest-dom matchers (toBeDisabled, toBeVisible, toHaveTextContent, ...) and
// augments the `Assertion<T>` type so they type-check. The `/vitest` subpath (rather than
// the bare package) is what wires the matchers into Vitest's own `expect`, not Jest's.
import '@testing-library/jest-dom/vitest';
