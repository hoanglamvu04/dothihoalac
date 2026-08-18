import { useEffect, useMemo, useState } from 'react';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import { LoadingBlock } from '../../components/common/Loading';
import { taxonomyApi } from '../../api/taxonomy.api';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

const tabs = {
  categories: 'Danh mục',
  areas: 'Khu vực',
  tags: 'Thẻ chủ đề',
};

const areaTypes = {
  district: 'Huyện',
  commune: 'Xã',
  village: 'Thôn',
  urban_area: 'Khu đô thị',
  project: 'Dự án',
  functional_zone: 'Khu chức năng',
};

const scopes = {
  article: 'Tin tức',
  community: 'Cộng đồng',
  property: 'Bất động sản',
  job: 'Việc làm',
  all: 'Dùng chung',
};

const categoryScopeOrder = ['article', 'community', 'property', 'job', 'all'];

const emptyForm = (type, categoryScope = 'article') => {
  if (type === 'categories') {
    return {
      name: '',
      slug: '',
      contentScope: categoryScope,
      parentId: '',
      description: '',
      displayOrder: 0,
      isActive: true,
    };
  }

  if (type === 'areas') {
    return {
      name: '',
      slug: '',
      areaType: 'commune',
      parentId: '',
      description: '',
      isActive: true,
    };
  }

  return { name: '', slug: '', isActive: true };
};

export default function AdminTaxonomyPage() {
  const toast = useToast();
  const [type, setType] = useState('categories');
  const [categoryScope, setCategoryScope] = useState('article');
  const [data, setData] = useState({ categories: [], areas: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm('categories', 'article'));

  const load = () => {
    setLoading(true);
    Promise.all([
      taxonomyApi.categories({ active: 'all' }),
      taxonomyApi.areas({ active: 'all' }),
      taxonomyApi.tags({ active: 'all' }),
    ])
      .then(([categories, areas, tags]) => setData({ categories, areas, tags }))
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const scopeCounts = useMemo(() => {
    const counts = Object.fromEntries(categoryScopeOrder.map((scope) => [scope, 0]));
    data.categories.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(counts, item.contentScope)) {
        counts[item.contentScope] += 1;
      }
    });
    return counts;
  }, [data.categories]);

  const items = useMemo(() => {
    if (type === 'categories') {
      return data.categories.filter((item) => item.contentScope === categoryScope);
    }
    return data[type] || [];
  }, [data, type, categoryScope]);

  const openCreate = () => {
    setSelected({ mode: 'create' });
    setForm(emptyForm(type, categoryScope));
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      ...emptyForm(type, categoryScope),
      ...item,
      parentId: item.parentId?._id || item.parentId || '',
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form, parentId: form.parentId || null };
    delete payload.slug;

    try {
      if (selected?.mode === 'create') {
        await adminApi.createTaxonomy(type, payload);
      } else {
        await adminApi.updateTaxonomy(type, selected._id, payload);
      }
      toast.success('Đã lưu dữ liệu phân loại.');
      setSelected(null);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const deactivate = async (item) => {
    if (!window.confirm(`Ngừng hoạt động “${item.name}”?`)) return;

    try {
      await adminApi.removeTaxonomy(type, item._id);
      toast.success('Đã ngừng hoạt động mục này.');
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const parentOptions = useMemo(() => {
    if (type === 'categories') {
      return data.categories.filter((item) => item.contentScope === form.contentScope);
    }
    if (type === 'areas') return data.areas;
    return [];
  }, [data.areas, data.categories, form.contentScope, type]);

  return (
    <div>
      <Seo title="Danh mục và khu vực" />

      <div className="panel-heading">
        <div>
          <h2>Danh mục, khu vực và thẻ</h2>
          <p>
            Danh mục được tách riêng theo từng loại nội dung để Tin tức, Cộng đồng,
            Bất động sản và Việc làm không bị trộn lẫn.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Thêm {tabs[type].toLowerCase()}
        </Button>
      </div>

      <div className="filter-tabs">
        {Object.entries(tabs).map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={type === value ? 'is-active' : ''}
            onClick={() => setType(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {type === 'categories' ? (
        <>
          <div className="filter-tabs" aria-label="Phạm vi danh mục">
            {categoryScopeOrder.map((scope) => (
              <button
                type="button"
                key={scope}
                className={categoryScope === scope ? 'is-active' : ''}
                onClick={() => setCategoryScope(scope)}
              >
                {scopes[scope]} ({scopeCounts[scope] || 0})
              </button>
            ))}
          </div>
          <p className="form-hint">
            Tin tức chỉ dùng danh mục thuộc phạm vi “Tin tức”. Các địa danh như Hòa
            Lạc, Hạ Bằng hoặc Khu Công nghệ cao nên quản lý ở Khu vực; các chủ đề cụ
            thể nên dùng Thẻ chủ đề.
          </p>
        </>
      ) : null}

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Phạm vi / loại</th>
                <th>Slug</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </td>
                  <td>
                    {type === 'categories'
                      ? scopes[item.contentScope]
                      : type === 'areas'
                        ? areaTypes[item.areaType]
                        : 'Thẻ chủ đề'}
                  </td>
                  <td>
                    <code>{item.slug}</code>
                  </td>
                  <td>
                    <Badge tone={item.isActive ? 'success' : 'soft'}>
                      {item.isActive ? 'Hoạt động' : 'Đã tắt'}
                    </Badge>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                        Sửa
                      </Button>
                      {item.isActive ? (
                        <Button size="sm" variant="ghost" onClick={() => deactivate(item)}>
                          Tắt
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={`Chưa có ${tabs[type].toLowerCase()} trong nhóm này`} />
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={
          selected?.mode === 'create'
            ? `Thêm ${tabs[type].toLowerCase()}`
            : `Sửa ${tabs[type].toLowerCase()}`
        }
      >
        <form className="stack-form" onSubmit={submit}>
          <div className="form-grid form-grid--2">
            <FormField label="Tên" required>
              <input
                required
                value={form.name || ''}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </FormField>
            <FormField
              label="Slug"
              hint="Slug được server tạo từ tên khi thêm mới và giữ ổn định khi chỉnh sửa."
            >
              <input value={form.slug || 'Tự động tạo từ tên'} readOnly />
            </FormField>
          </div>

          {type === 'categories' ? (
            <>
              <div className="form-grid form-grid--2">
                <FormField label="Phạm vi">
                  <select
                    value={form.contentScope}
                    onChange={(event) =>
                      setForm({ ...form, contentScope: event.target.value, parentId: '' })
                    }
                  >
                    {categoryScopeOrder.map((value) => (
                      <option key={value} value={value}>
                        {scopes[value]}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Danh mục cha">
                  <select
                    value={form.parentId || ''}
                    onChange={(event) => setForm({ ...form, parentId: event.target.value })}
                  >
                    <option value="">Không có</option>
                    {parentOptions
                      .filter((item) => item._id !== selected?._id)
                      .map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </FormField>
              </div>
              <FormField label="Thứ tự">
                <input
                  type="number"
                  value={form.displayOrder || 0}
                  onChange={(event) =>
                    setForm({ ...form, displayOrder: Number(event.target.value) })
                  }
                />
              </FormField>
            </>
          ) : null}

          {type === 'areas' ? (
            <div className="form-grid form-grid--2">
              <FormField label="Loại khu vực">
                <select
                  value={form.areaType}
                  onChange={(event) => setForm({ ...form, areaType: event.target.value })}
                >
                  {Object.entries(areaTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Khu vực cha">
                <select
                  value={form.parentId || ''}
                  onChange={(event) => setForm({ ...form, parentId: event.target.value })}
                >
                  <option value="">Không có</option>
                  {parentOptions
                    .filter((item) => item._id !== selected?._id)
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </FormField>
            </div>
          ) : null}

          {type !== 'tags' ? (
            <FormField label="Mô tả">
              <textarea
                rows="4"
                value={form.description || ''}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </FormField>
          ) : null}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            <span>Đang hoạt động</span>
          </label>

          <Button type="submit">Lưu dữ liệu</Button>
        </form>
      </Modal>
    </div>
  );
}
