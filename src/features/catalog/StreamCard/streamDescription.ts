const AGENDA_MARKER = '- ';

/** An agenda line split at its first colon or dash, so the part before it can be set in bold. */
export interface AgendaItem {
  lead: string | null;
  text: string;
}

/** A description as a card lays it out: its plain lines first, then its agenda. */
export interface DescriptionParts {
  paragraphs: string[];
  agenda: AgendaItem[];
}

// The lead keeps its separator, a colon as written and a dash with a space before it.
const AGENDA_LEAD = /^(.+?)\s*([:—])\s*(.+)$/;

function agendaItem(line: string): AgendaItem {
  const found = line.match(AGENDA_LEAD);
  if (!found) {
    return { lead: null, text: line };
  }
  const [, lead, separator, text] = found;
  return { lead: separator === ':' ? `${lead}:` : `${lead} ${separator}`, text };
}

/** Reads a description the way msrs-client does: each non-empty line a paragraph, a line starting "- " an agenda item. */
export function parseDescription(description: string | undefined): DescriptionParts {
  const parts: DescriptionParts = { paragraphs: [], agenda: [] };
  for (const line of (description ?? '').split('\n').map((raw) => raw.trim())) {
    if (line.startsWith(AGENDA_MARKER)) {
      parts.agenda.push(agendaItem(line.slice(AGENDA_MARKER.length).trim()));
    } else if (line) {
      parts.paragraphs.push(line);
    }
  }
  return parts;
}
