import { parseDescription } from './streamDescription';

/** A card's description: its lines as paragraphs, then its agenda with each item's lead in bold. */
export function CardDescription({ description }: { description: string | undefined }) {
  const { paragraphs, agenda } = parseDescription(description);
  if (paragraphs.length === 0 && agenda.length === 0) {
    return null;
  }

  return (
    <div className="stream-card-description">
      {paragraphs.map((paragraph, i) => (
        <p key={`p-${i}`}>{paragraph}</p>
      ))}
      {agenda.length > 0 && (
        <ul className="stream-card-agenda">
          {agenda.map(({ lead, text }, i) => (
            <li key={`a-${i}`}>
              {lead && <strong>{lead}</strong>} {text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
