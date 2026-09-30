import { describe, expect, it } from 'vitest';

import { parseDescription } from '../src/features/catalog/StreamCard/streamDescription';

describe('a stream description on its card', () => {
  it('reads each line as a paragraph, and a line starting "- " as an agenda item', () => {
    const parts = parseDescription(
      'Monthly call.\n\nThis month:\n- Core Development Updates: Bee 2.8.2\n- In Focus: TBD\n- Open Space',
    );

    expect(parts.paragraphs).toEqual(['Monthly call.', 'This month:']);
    expect(parts.agenda).toEqual([
      { lead: 'Core Development Updates:', text: 'Bee 2.8.2' },
      { lead: 'In Focus:', text: 'TBD' },
      { lead: null, text: 'Open Space' },
    ]);
  });

  it('takes a dash as the end of an agenda item lead too', () => {
    expect(parseDescription('- Keynote — Opening words').agenda).toEqual([
      { lead: 'Keynote —', text: 'Opening words' },
    ]);
  });

  it('has nothing to show for a stream without a description', () => {
    expect(parseDescription(undefined)).toEqual({ paragraphs: [], agenda: [] });
    expect(parseDescription('  \n ')).toEqual({ paragraphs: [], agenda: [] });
  });
});
