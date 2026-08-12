import { memo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { mediaUrl } from '../../utils/media';

function ContentImage({
  media,
  alt = '',
  ratio = 'wide',
  className = '',
}) {
  const url = mediaUrl(media);
  const isPriority = ratio === 'hero';

  return (
    <div
      className={`content-image content-image--${ratio} ${className}`.trim()}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          loading={isPriority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={isPriority ? 'high' : 'auto'}
        />
      ) : (
        <div className="content-image__placeholder">
          <ImageIcon size={30} />
          <span>Đô Thị Hòa Lạc</span>
        </div>
      )}
    </div>
  );
}

export default memo(ContentImage);
