import { useRef, useState } from 'react';
import { ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import Button from '../common/Button';
import FormField from '../common/FormField';
import { mediaApi } from '../../api/media.api';
import { mediaUrl } from '../../utils/media';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function MediaUploader({ value, onChange, label = 'Ảnh đại diện', required = false }) {
  const [loading, setLoading] = useState(false);
  const [altText, setAltText] = useState('');
  const toast = useToast();
  const replaceInputRef = useRef(null);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Vui lòng chọn tệp ảnh.');
    setLoading(true);
    try {
      const media = await mediaApi.uploadImage(file, altText);
      onChange(media);
      toast.success('Đã tải ảnh lên.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (value?._id) {
      try { await mediaApi.remove(value._id); } catch { /* ảnh có thể đang được sử dụng */ }
    }
    onChange(null);
  };

  return (
    <FormField label={label} required={required} hint="JPG, PNG hoặc WebP. Server sẽ tối ưu ảnh sang WebP.">
      <div className="media-uploader">
        {value ? (
          <div className="media-uploader__preview">
            <img src={mediaUrl(value)} alt={value.altText || altText || 'Ảnh đã tải lên'} />
            <button type="button" onClick={remove} aria-label="Xóa ảnh"><Trash2 size={18} /></button>
          </div>
        ) : (
          <label className="media-uploader__drop">
            {loading ? <span className="loading-spinner" /> : <UploadCloud size={30} />}
            <strong>{loading ? 'Đang tải ảnh...' : 'Chọn ảnh từ máy'}</strong>
            <small>Nhấn để tải một ảnh lên</small>
            <input type="file" accept="image/*" onChange={upload} disabled={loading} />
          </label>
        )}
        <div className="media-uploader__alt"><ImagePlus size={17} /><input value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Mô tả ảnh cho SEO và trợ năng" maxLength={300} /></div>
        {value ? <Button variant="outline" size="sm" onClick={() => replaceInputRef.current?.click()}>Thay ảnh</Button> : null}
        <input ref={replaceInputRef} className="visually-hidden" type="file" accept="image/*" onChange={upload} />
      </div>
    </FormField>
  );
}
