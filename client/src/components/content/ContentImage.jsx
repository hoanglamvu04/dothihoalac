import { useState } from 'react';
import { mediaUrl } from '../../utils/media';

const RESPONSIVE_WIDTHS = [320, 480, 640, 960, 1280, 1600];

function cloudinaryVariant(url, width) {
  const value = String(url || '');

  if (!value.includes('res.cloudinary.com') || !value.includes('/upload/')) {
    return value;
  }

  return value.replace(
    '/upload/',
    `/upload/f_auto,q_auto:eco,c_limit,w_${width}/`,
  );
}

function responsiveSourceSet(url) {
  if (!String(url || '').includes('res.cloudinary.com')) return undefined;

  return RESPONSIVE_WIDTHS
    .map((width) => `${cloudinaryVariant(url, width)} ${width}w`)
    .join(', ');
}

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
  srcSet,
  sizes = '(max-width: 720px) 100vw, (max-width: 1200px) 50vw, 640px',
  ...props
}) {
  const [failed, setFailed] = useState(false);
  const resolvedImage = image || media;
  const originalSrc = mediaUrl(resolvedImage);
  if (!originalSrc || failed) return fallback;

  const responsiveSet = srcSet || responsiveSourceSet(originalSrc);
  const src = responsiveSet
    ? cloudinaryVariant(originalSrc, 1280)
    : originalSrc;

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
      srcSet={responsiveSet}
      sizes={responsiveSet ? sizes : undefined}
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
