import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ImagePlus,
  Palette,
  Save,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { mediaApi } from '../../api/media.api';
import { apiErrorMessage } from '../../api/http';
import { mediaUrl } from '../../utils/media';
import { useToast } from '../../context/ToastContext';
import { useBranding } from '../../context/BrandingContext';

import './AdminBrandingPage.css';

const ASSIGNMENT_FALLBACKS = {
  markLogoId: 'builtin-mark',
  headerLogoId: 'builtin-header',
  footerLogoId: 'builtin-footer',
  faviconLogoId: 'builtin-mark',
};

const HEADER_SIZE_FIELDS = [
  ['desktopWidth', 'Desktop rộng'],
  ['desktopHeight', 'Desktop cao'],
  ['tabletWidth', 'Tablet rộng'],
  ['tabletHeight', 'Tablet cao'],
  ['mobileWidth', 'Mobile rộng'],
  ['mobileHeight', 'Mobile cao'],
  ['smallMobileWidth', 'Mobile nhỏ rộng'],
  ['smallMobileHeight', 'Mobile nhỏ cao'],
];

const FOOTER_SIZE_FIELDS = [
  ['desktopWidth', 'Desktop rộng'],
  ['desktopHeight', 'Desktop cao'],
  ['tabletWidth', 'Tablet rộng'],
  ['tabletHeight', 'Tablet cao'],
  ['mobileWidth', 'Mobile rộng'],
  ['mobileHeight', 'Mobile cao'],
];

function LogoSelect({
  label,
  description,
  value,
  assets,
  onChange,
}) {
  const selected = assets.find((asset) => String(asset.id) === String(value));

  return (
    <label className="brand-assignment-card">
      <span className="brand-assignment-card__copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>

      <span className="brand-assignment-card__preview">
        {selected?.url ? (
          <img src={selected.url} alt="" />
        ) : (
          <ImagePlus size={22} />
        )}
      </span>

      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SizeEditor({
  title,
  description,
  fields,
  values,
  onChange,
}) {
  return (
    <section className="brand-size-editor">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="brand-size-editor__grid">
        {fields.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <div>
              <input
                type="number"
                min="20"
                max="600"
                value={values?.[key] ?? ''}
                onChange={(event) => onChange(key, event.target.value)}
              />
              <small>px</small>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

export default function AdminBrandingPage() {
  const toast = useToast();
  const { refreshBranding } = useBranding();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminApi.branding();
      setForm(data);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const assets = form?.assets || [];

  const selectedAssets = useMemo(() => {
    const map = new Map(assets.map((asset) => [String(asset.id), asset]));
    return {
      header: map.get(String(form?.assignments?.headerLogoId || '')),
      footer: map.get(String(form?.assignments?.footerLogoId || '')),
      favicon: map.get(String(form?.assignments?.faviconLogoId || '')),
      mark: map.get(String(form?.assignments?.markLogoId || '')),
    };
  }, [assets, form?.assignments]);

  const updateAssignment = (key, value) => {
    setForm((current) => ({
      ...current,
      assignments: {
        ...current.assignments,
        [key]: value,
      },
    }));
  };

  const updateSize = (group, key, value) => {
    setForm((current) => ({
      ...current,
      sizes: {
        ...current.sizes,
        [group]: {
          ...current.sizes[group],
          [key]: value === '' ? '' : Number(value),
        },
      },
    }));
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const media = await mediaApi.uploadImage(
        file,
        `Logo thương hiệu ${form?.siteName || 'Đô Thị Hòa Lạc'}`,
        'branding',
      );

      const url = mediaUrl(media);
      if (!url) {
        throw new Error('Không lấy được URL ảnh vừa tải lên.');
      }

      const id = String(media?._id || media?.id || `brand-${Date.now()}`);
      const nextAsset = {
        id,
        mediaId: String(media?._id || media?.id || ''),
        name: file.name.replace(/\.[^.]+$/, '') || 'Logo thương hiệu',
        url,
        altText: media?.altText || form?.siteName || 'Đô Thị Hòa Lạc',
        source: 'media',
        width: media?.width || null,
        height: media?.height || null,
      };

      setForm((current) => ({
        ...current,
        assets: [
          ...(current.assets || []).filter((asset) => String(asset.id) !== id),
          nextAsset,
        ],
      }));

      toast.success('Đã tải logo lên kho thương hiệu. Bấm “Lưu thay đổi” để áp dụng.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const removeAsset = (asset) => {
    if (asset.source === 'builtin') return;

    setForm((current) => {
      const assignments = { ...current.assignments };

      Object.entries(assignments).forEach(([key, value]) => {
        if (String(value) === String(asset.id)) {
          assignments[key] = ASSIGNMENT_FALLBACKS[key];
        }
      });

      return {
        ...current,
        assignments,
        assets: current.assets.filter((item) => String(item.id) !== String(asset.id)),
      };
    });
  };

  const renameAsset = (id, name) => {
    setForm((current) => ({
      ...current,
      assets: current.assets.map((asset) =>
        String(asset.id) === String(id)
          ? { ...asset, name }
          : asset,
      ),
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await adminApi.updateBranding(form);
      setForm(saved);
      await refreshBranding();
      toast.success('Đã cập nhật thương hiệu trên website.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div>
        <Seo title="Quản lý thương hiệu" />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="admin-branding-page">
      <Seo title="Quản lý thương hiệu" />

      <div className="panel-heading admin-branding-heading">
        <div>
          <div className="admin-branding-heading__eyebrow">
            <Palette size={16} />
            Brand Control
          </div>
          <h2>Quản lý thương hiệu</h2>
          <p>
            Thay logo, favicon và kích thước hiển thị mà không cần sửa mã nguồn.
          </p>
        </div>

        <Button onClick={save} disabled={saving || uploading}>
          <Save size={17} />
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>

      <section className="brand-panel brand-panel--identity">
        <div className="brand-panel__heading">
          <div>
            <h3>Nhận diện cơ bản</h3>
            <p>Tên thương hiệu dùng trong admin và nội dung mô tả.</p>
          </div>
        </div>

        <div className="brand-identity-grid">
          <label>
            <span>Tên thương hiệu</span>
            <input
              value={form.siteName || ''}
              onChange={(event) => setForm({ ...form, siteName: event.target.value })}
            />
          </label>

          <label>
            <span>Tagline</span>
            <input
              value={form.tagline || ''}
              onChange={(event) => setForm({ ...form, tagline: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="brand-panel">
        <div className="brand-panel__heading">
          <div>
            <h3>Kho logo thương hiệu</h3>
            <p>
              Tải logo PNG, JPG, WebP hoặc AVIF. Ảnh được lưu qua Media Library hiện tại.
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              className="brand-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={handleUpload}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={16} />
              {uploading ? 'Đang tải...' : 'Tải logo mới'}
            </Button>
          </div>
        </div>

        <div className="brand-assets-grid">
          {assets.map((asset) => (
            <article className="brand-asset-card" key={asset.id}>
              <div className="brand-asset-card__image">
                <img src={asset.url} alt={asset.altText || asset.name} />
              </div>

              <div className="brand-asset-card__body">
                <input
                  value={asset.name || ''}
                  disabled={asset.source === 'builtin'}
                  onChange={(event) => renameAsset(asset.id, event.target.value)}
                />
                <small>
                  {asset.source === 'builtin' ? 'Logo mặc định trong source' : 'Media Library'}
                  {asset.width && asset.height ? ` · ${asset.width}×${asset.height}px` : ''}
                </small>
              </div>

              {asset.source !== 'builtin' ? (
                <button
                  type="button"
                  className="brand-asset-card__remove"
                  onClick={() => removeAsset(asset)}
                  title="Gỡ khỏi kho thương hiệu"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="brand-panel">
        <div className="brand-panel__heading">
          <div>
            <h3>Logo đang sử dụng</h3>
            <p>Mỗi vị trí có thể dùng một logo khác nhau từ kho phía trên.</p>
          </div>
        </div>

        <div className="brand-assignments-grid">
          <LogoSelect
            label="Header"
            description="Logo chính ở đầu website."
            value={form.assignments.headerLogoId}
            assets={assets}
            onChange={(value) => updateAssignment('headerLogoId', value)}
          />
          <LogoSelect
            label="Footer"
            description="Logo ở chân trang."
            value={form.assignments.footerLogoId}
            assets={assets}
            onChange={(value) => updateAssignment('footerLogoId', value)}
          />
          <LogoSelect
            label="Favicon"
            description="Biểu tượng trên tab trình duyệt."
            value={form.assignments.faviconLogoId}
            assets={assets}
            onChange={(value) => updateAssignment('faviconLogoId', value)}
          />
          <LogoSelect
            label="Logo biểu tượng"
            description="Dùng cho admin và các vị trí logo vuông."
            value={form.assignments.markLogoId}
            assets={assets}
            onChange={(value) => updateAssignment('markLogoId', value)}
          />
        </div>
      </section>

      <section className="brand-panel">
        <div className="brand-panel__heading">
          <div>
            <h3>Kích thước hiển thị</h3>
            <p>Điều chỉnh theo breakpoint, lưu theo pixel.</p>
          </div>
        </div>

        <div className="brand-size-stack">
          <SizeEditor
            title="Header"
            description="Kích thước khung logo ở đầu trang."
            fields={HEADER_SIZE_FIELDS}
            values={form.sizes.header}
            onChange={(key, value) => updateSize('header', key, value)}
          />
          <SizeEditor
            title="Footer"
            description="Kích thước logo ở chân trang."
            fields={FOOTER_SIZE_FIELDS}
            values={form.sizes.footer}
            onChange={(key, value) => updateSize('footer', key, value)}
          />
        </div>
      </section>

      <section className="brand-panel brand-panel--preview">
        <div className="brand-panel__heading">
          <div>
            <h3>Xem trước nhanh</h3>
            <p>Preview dùng kích thước desktop hiện tại.</p>
          </div>
        </div>

        <div className="brand-preview-grid">
          <div className="brand-preview-card brand-preview-card--light">
            <span>Header</span>
            {selectedAssets.header?.url ? (
              <img
                src={selectedAssets.header.url}
                alt=""
                style={{
                  width: `${form.sizes.header.desktopWidth}px`,
                  height: `${form.sizes.header.desktopHeight}px`,
                }}
              />
            ) : null}
          </div>

          <div className="brand-preview-card brand-preview-card--dark">
            <span>Footer</span>
            {selectedAssets.footer?.url ? (
              <img
                src={selectedAssets.footer.url}
                alt=""
                style={{
                  width: `${form.sizes.footer.desktopWidth}px`,
                  height: `${form.sizes.footer.desktopHeight}px`,
                }}
              />
            ) : null}
          </div>

          <div className="brand-preview-card brand-preview-card--favicon">
            <span>Favicon / Mark</span>
            <div>
              {selectedAssets.favicon?.url ? (
                <img src={selectedAssets.favicon.url} alt="" />
              ) : null}
              {selectedAssets.mark?.url ? (
                <img src={selectedAssets.mark.url} alt="" />
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
