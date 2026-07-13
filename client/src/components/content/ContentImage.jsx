import { Image as ImageIcon } from 'lucide-react';
import { mediaUrl } from '../../utils/media';

export default function ContentImage({ media, alt = '', ratio = 'wide', className = '' }) {
  const url = mediaUrl(media);
  return (
    <div className={`content-image content-image--${ratio} ${className}`.trim()}>
      {url ? <img src={url} alt={alt} loading="lazy" /> : <div className="content-image__placeholder"><ImageIcon size={30} /><span>Đô Thị Hòa Lạc</span></div>}
    </div>
  );
}
