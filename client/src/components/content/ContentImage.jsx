import { useState } from 'react';
import { mediaUrl } from '../../utils/media';

/** Shared image renderer for populated media or URL strings. */
export default function ContentImage({
  image,
  media,
  alt,
  className = '',
  ratio = '',
  fallback = null,
  loading = 'lazy',
  ...props
}) {
  const [failed, setFailed] = useState(false);
  const resolvedImage = image || media;
  const src = mediaUrl(resolvedImage);
  if (!src || failed) return fallback;

  const classes = [
    className,
    ratio ? `content-image--${ratio}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <img
      src={src}
      alt={alt || resolvedImage?.altText || ''}
      loading={loading}
      className={classes}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
