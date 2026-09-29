import './ProfilePicture.scss';

/**
 * The last six hex digits of an address, which tell apart two people who chose the same name. The name
 * alone proves nothing: anyone can take any name.
 */
export function shortAddress(address: string): string {
  const digits = address.replace(/^0x/, '').slice(-6).toLowerCase();
  return `${digits.slice(0, 3)}:${digits.slice(3)}`;
}

interface ProfilePictureProps {
  name: string;
  address: string;
  color: string;
}

/** Decorative: the name it stands for is written beside it. */
export function ProfilePicture({ name, address, color }: ProfilePictureProps) {
  const initial = [...name.trim()][0]?.toUpperCase() ?? '?';
  return (
    <span
      className="profile-picture"
      aria-hidden="true"
      title={`${name.trim()} ${shortAddress(address)}`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}
