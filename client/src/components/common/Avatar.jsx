import { initials } from '../../utils/formatters';
import { mediaUrl } from '../../utils/media';

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const url = mediaUrl(src);
  return (
    <span className={`avatar avatar--${size} ${className}`.trim()} aria-label={name || 'Thành viên'}>
      {url ? <img src={url} alt={name || 'Ảnh đại diện'} /> : <span>{initials(name)}</span>}
    </span>
  );
}
