/**
 * What a card shows when there is no picture: no thumbnail, no frame decoded yet, or an announced
 * broadcast with nothing to decode. Drawn here rather than shipped as an image, so a list of such
 * cards costs no download at all.
 */
export function PreviewPlaceholder() {
  return (
    <div className="stream-card-placeholder" aria-hidden="true">
      <svg width="48" height="54" viewBox="0 0 48 54" fill="none">
        <path d="M24 2 45 14v26L24 52 3 40V14L24 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M24 16 35 22.5v13L24 42l-11-6.5v-13L24 16Z" fill="currentColor" opacity="0.5" />
      </svg>
    </div>
  );
}
