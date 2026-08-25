import { useState } from 'react';
import { avatarSrc } from '../services/people';

export default function Avatar({ person, size = 30, style }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!person) return null;
  const src = !imgFailed && avatarSrc(person);

  if (src) {
    return (
      <img
        src={src} alt={person.name} title={person.name} onError={() => setImgFailed(true)}
        className="avatar" style={{ width: size, height: size, objectFit: 'cover', ...style }}
      />
    );
  }

  return (
    <div
      className="avatar"
      title={person.name}
      style={{ width: size, height: size, background: person.color, fontSize: size * 0.38, ...style }}
    >
      {person.initials}
    </div>
  );
}
