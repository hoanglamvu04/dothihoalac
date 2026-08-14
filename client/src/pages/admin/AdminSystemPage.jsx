import { useEffect, useState } from 'react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import RichTextEditor from '../../components/forms/RichTextEditor';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

const EMPTY_PAGE = {
  title: '',
  slug: '',
  body: '',
  status: 'draft',
};

export default function AdminSystemPage() {
  const toast = useToast();
  const [tab, setTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [form, setForm] = useState(EMPTY_PAGE);

  const load = async () => {
    setLoading(true);
    try {
      const [nextSettings, nextPages] = await Promise.all([
        adminApi.settings(),
        adminApi.pages(),
      ]);
      setSettings(nextSettings || []);
      setPages(nextPages || []);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveSetting = async (item) => {
    try {
      await adminApi.updateSetting(item.settingKey, {
        value: item.settingValue,
        valueType: item.valueType,
      });
      toast.success(`Đã lưu ${item.settingKey}.`);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const openPage = (item = null) => {
    setSelectedPage(item || { isNew: true });
    setForm(item ? { ...item } : { ...EMPTY_PAGE });
  };

  const submitPage = async (event) => {
    event.preventDefault();

    try {
      if (selectedPage?._id) {
        await adminApi.updatePage(selectedPage._id, form);
      } else {
        await adminApi.createPage(form);
      }

      toast.success('Đã lưu trang tĩnh.');
      setSelectedPage(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div>
      <Seo title="Trang và cấu hình hệ thống" />

      <div className="panel-heading">
        <div>
          <h2>Trang và cấu hình</h2>
          <p>Các thiết lập hệ thống và trang tĩnh có thể quản trị mà không sửa mã nguồn.</p>
        </div>

        {tab === 'pages' ? (
          <Button size="sm" onClick={() => openPage()}>
            Thêm trang
          </Button>
        ) : null}
      </div>

      <div className="filter-tabs">
        <button
          type="button"
          className={tab === 'settings' ? 'is-active' : ''}
          onClick={() => setTab('settings')}
        >
          Cấu hình
        </button>
        <button
          type="button"
          className={tab === 'pages' ? 'is-active' : ''}
          onClick={() => setTab('pages')}
        >
          Trang tĩnh
        </button>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : tab === 'settings' ? (
        <div className="settings-list">
          {settings.length ? (
            settings.map((item, index) => (
              <article className="setting-row" key={item._id || item.settingKey}>
                <div>
                  <strong>{item.settingKey}</strong>
                  <small>Kiểu: {item.valueType}</small>
                </div>

                <input
                  value={
                    typeof item.settingValue === 'object'
                      ? JSON.stringify(item.settingValue)
                      : String(item.settingValue ?? '')
                  }
                  onChange={(event) =>
                    setSettings((current) =>
                      current.map((value, itemIndex) =>
                        itemIndex === index
                          ? { ...value, settingValue: event.target.value }
                          : value,
                      ),
                    )
                  }
                />

                <Button size="sm" variant="outline" onClick={() => saveSetting(item)}>
                  Lưu
                </Button>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>Chưa có cấu hình</h3>
              <p>Các cấu hình hệ thống sẽ xuất hiện tại đây khi được khởi tạo.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Trang</th>
                <th>Slug</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pages.map((item) => (
                <tr key={item._id}>
                  <td><strong>{item.title}</strong></td>
                  <td><code>{item.slug}</code></td>
                  <td>
                    <Badge tone={item.status === 'published' ? 'success' : 'soft'}>
                      {item.status}
                    </Badge>
                  </td>
                  <td>{formatDateTime(item.updatedAt)}</td>
                  <td>
                    <Button size="sm" variant="outline" onClick={() => openPage(item)}>
                      Sửa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(selectedPage)}
        onClose={() => setSelectedPage(null)}
        title="Biên tập trang tĩnh"
      >
        {selectedPage ? (
          <form className="stack-form" onSubmit={submitPage}>
            <div className="form-grid form-grid--2">
              <FormField label="Tiêu đề" required>
                <input
                  required
                  value={form.title || ''}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </FormField>

              <FormField label="Slug">
                <input
                  value={form.slug || ''}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Trạng thái">
              <select
                value={form.status || 'draft'}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Xuất bản</option>
                <option value="hidden">Ẩn</option>
              </select>
            </FormField>

            <RichTextEditor
              value={form.body || ''}
              onChange={(value) => setForm({ ...form, body: value })}
            />

            <Button type="submit">Lưu trang</Button>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
