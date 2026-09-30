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

/**
 * The initial of whoever wrote a message. As on the Swarm site the row writes no name, so the name and
 * its short address are the avatar's accessible name and show beside it on hover or focus.
 */
export function ProfilePicture({ name, address, color }: ProfilePictureProps) {
  const initial = [...name.trim()][0]?.toUpperCase() ?? '?';
  const author = `${name.trim()} ${shortAddress(address)}`;
  return (
    <span className="profile-picture-anchor">
      <span className="profile-picture" role="img" aria-label={author} style={{ backgroundColor: color }}>
        {initial}
      </span>
      <span className="profile-picture-tooltip" aria-hidden="true">
        {author}
      </span>
    </span>
  );
}
