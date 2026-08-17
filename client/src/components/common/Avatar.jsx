import { useEffect, useState } from 'react';
import { initials } from '../../utils/formatters';
import { mediaUrl } from '../../utils/media';

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const url = mediaUrl(src);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [url]);

  return (
    <span className={`avatar avatar--${size} ${className}`.trim()} aria-label={name || 'Thành viên'}>
      {url && !imageFailed ? (
        <img
          src={url}
          alt={name || 'Ảnh đại diện'}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}
