import { useState } from 'react';
import { mediaUrl } from '../../utils/media';

/** Shared image renderer for populated media or URL strings. */
export default function ContentImage({
  image,
  media,
  alt,
  className = '',
  fallback = null,
  loading = 'lazy',
  ...props
}) {
  const [failed, setFailed] = useState(false);
  const resolvedImage = image || media;
  const src = mediaUrl(resolvedImage);
  if (!src || failed) return fallback;

  return (
    <img
      src={src}
      alt={alt || resolvedImage?.altText || ''}
      loading={loading}
      className={className}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
