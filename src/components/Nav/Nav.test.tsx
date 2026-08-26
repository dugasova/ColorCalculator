import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '../../i18n';
import { Nav } from './Nav';

describe('Nav', () => {
  it('renders all three tabs and marks the active view as selected', () => {
    const html = renderToStaticMarkup(<Nav view="correction" onViewChange={() => {}} />);

    expect(html).toContain('role="tablist"');
    expect(html).toContain('Calculator');
    expect(html).toContain('Correction');
    expect(html).toContain('History');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  });
});
