/**
 * What a thumbnail shows when there is no picture: no image, no frame decoded yet, or an announced
 * broadcast with nothing to decode. msrs-client's default, a black frame with a camera in orange,
 * drawn here rather than shipped as an image, so a list of such cards costs no download at all.
 */
export function PreviewPlaceholder() {
  return (
    <div className="stream-thumbnail-placeholder" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    </div>
  );
}
