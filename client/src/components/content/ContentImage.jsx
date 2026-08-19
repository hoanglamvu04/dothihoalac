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
  decoding = 'async',
  width,
  height,
  fetchPriority,
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

  const intrinsicWidth =
    width ||
    (Number(resolvedImage?.width) > 0 ? Number(resolvedImage.width) : undefined);
  const intrinsicHeight =
    height ||
    (Number(resolvedImage?.height) > 0 ? Number(resolvedImage.height) : undefined);

  return (
    <img
      src={src}
      alt={alt || resolvedImage?.altText || ''}
      loading={loading}
      decoding={decoding}
      width={intrinsicWidth}
      height={intrinsicHeight}
      fetchPriority={fetchPriority || (loading === 'eager' ? 'high' : undefined)}
      className={classes}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
