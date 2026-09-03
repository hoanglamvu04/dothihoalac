import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleOff,
  FolderTree,
  Layers3,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import { LoadingBlock } from '../../components/common/Loading';
import { taxonomyAdminApi } from '../../api/taxonomy.admin.api';
import { apiErrorMessage } from '../../api/http';
import {
  invalidateTaxonomyCache,
} from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';

import './AdminTaxonomyPage.css';

const tabs = {
  categories: {
    label: 'Danh mục nội dung',
    shortLabel: 'Danh mục',
    icon: FolderTree,
    description: 'Phân luồng nội dung Tin tức, Cộng đồng, Bất động sản và Việc làm.',
  },
  areas: {
    label: 'Khu vực & địa bàn',
    shortLabel: 'Khu vực',
    icon: MapPinned,
    description: 'Quản lý hệ thống địa bàn, khu chức năng, dự án và quan hệ cha - con.',
  },
  tags: {
    label: 'Thẻ chủ đề',
    shortLabel: 'Thẻ chủ đề',
    icon: Tags,
    description: 'Quản lý các nhãn chủ đề dùng để phân loại và khám phá nội dung.',
  },
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
const statusOptions = {
  all: 'Tất cả trạng thái',
  active: 'Đang hoạt động',
  inactive: 'Đã tắt',
};

function emptyForm(type, categoryScope = 'article') {
  if (type === 'categories') {
    return {
      name: '',
      slug: '',
      contentScope: categoryScope === '*' ? 'article' : categoryScope,
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

  return {
    name: '',
    slug: '',
    isActive: true,
  };
}

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('vi');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function parentName(item) {
  if (!item?.parentId) return 'Cấp gốc';
  if (typeof item.parentId === 'object') return item.parentId.name || 'Không xác định';
  return 'Có mục cha';
}

export default function AdminTaxonomyPage() {
  const toast = useToast();
  const [type, setType] = useState('categories');
  const [scopeFilter, setScopeFilter] = useState('*');
  const [areaTypeFilter, setAreaTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [data, setData] = useState({ categories: [], areas: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm('categories', 'article'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [categories, areas, tags] = await Promise.all([
        taxonomyAdminApi.list('categories', { active: 'all' }),
        taxonomyAdminApi.list('areas', { active: 'all' }),
        taxonomyAdminApi.list('tags', { active: 'all' }),
      ]);
      setData({
        categories: Array.isArray(categories) ? categories : [],
        areas: Array.isArray(areas) ? areas : [],
        tags: Array.isArray(tags) ? tags : [],
      });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể tải dữ liệu phân loại.'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setQuery('');
    setStatusFilter('all');
    if (type !== 'categories') setScopeFilter('*');
    if (type !== 'areas') setAreaTypeFilter('all');
  }, [type]);

  const currentItems = data[type] || [];

  const summary = useMemo(() => {
    const active = currentItems.filter((item) => item.isActive).length;
    const inactive = currentItems.length - active;
    const roots = currentItems.filter((item) => !item.parentId).length;
    const children = currentItems.length - roots;
    const usage = type === 'tags'
      ? currentItems.reduce((total, item) => total + Number(item.usageCount || 0), 0)
      : children;

    return {
      total: currentItems.length,
      active,
      inactive,
      roots,
      usage,
    };
  }, [currentItems, type]);

  const tabCounts = useMemo(() => Object.fromEntries(
    Object.keys(tabs).map((key) => [key, data[key]?.length || 0]),
  ), [data]);

  const scopeCounts = useMemo(() => {
    const counts = Object.fromEntries(categoryScopeOrder.map((scope) => [scope, 0]));
    data.categories.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(counts, item.contentScope)) {
        counts[item.contentScope] += 1;
      }
    });
    return counts;
  }, [data.categories]);

  const areaTypeCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(areaTypes).map((value) => [value, 0]));
    data.areas.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(counts, item.areaType)) {
        counts[item.areaType] += 1;
      }
    });
    return counts;
  }, [data.areas]);

  const items = useMemo(() => {
    const term = normalizeText(query);

    return currentItems.filter((item) => {
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;
      if (type === 'categories' && scopeFilter !== '*' && item.contentScope !== scopeFilter) {
        return false;
      }
      if (type === 'areas' && areaTypeFilter !== 'all' && item.areaType !== areaTypeFilter) {
        return false;
      }
      if (!term) return true;

      const haystack = normalizeText([
        item.name,
        item.slug,
        item.description,
        parentName(item),
      ].join(' '));
      return haystack.includes(term);
    });
  }, [areaTypeFilter, currentItems, query, scopeFilter, statusFilter, type]);

  const parentOptions = useMemo(() => {
    if (type === 'categories') {
      return data.categories.filter(
        (item) => item.contentScope === form.contentScope && item.isActive,
      );
    }
    if (type === 'areas') return data.areas.filter((item) => item.isActive);
    return [];
  }, [data.areas, data.categories, form.contentScope, type]);

  const openCreate = () => {
    setSelected({ mode: 'create' });
    setForm(emptyForm(type, scopeFilter));
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      ...emptyForm(type, scopeFilter),
      ...item,
      parentId: item.parentId?._id || item.parentId || '',
    });
  };

  const afterMutation = async () => {
    invalidateTaxonomyCache();
    await load();
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      parentId: form.parentId || null,
    };
    delete payload.slug;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.__v;
    delete payload._id;

    try {
      if (selected?.mode === 'create') {
        await taxonomyAdminApi.create(type, payload);
        toast.success(`Đã thêm ${tabs[type].shortLabel.toLowerCase()}.`);
      } else {
        await taxonomyAdminApi.update(type, selected._id, payload);
        toast.success('Đã cập nhật dữ liệu phân loại.');
      }
      setSelected(null);
      await afterMutation();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể lưu dữ liệu phân loại.'));
    } finally {
      setSaving(false);
    }
  };

  const setItemActive = async (item, nextActive) => {
    const action = nextActive ? 'bật lại' : 'tắt';
    if (!window.confirm(`${action === 'tắt' ? 'Tắt' : 'Bật lại'} “${item.name}”?`)) return;

    try {
      if (nextActive) {
        await taxonomyAdminApi.update(type, item._id, { isActive: true });
      } else {
        await taxonomyAdminApi.deactivate(type, item._id);
      }
      toast.success(nextActive ? 'Đã bật lại mục này.' : 'Đã tắt mục này khỏi public taxonomy.');
      await afterMutation();
    } catch (error) {
      toast.error(apiErrorMessage(error, `Không thể ${action} mục này.`));
    }
  };

  const currentTab = tabs[type];
  const CurrentIcon = currentTab.icon;

  return (
    <main className="taxonomy-admin-page">
      <Seo title="Danh mục và khu vực" />

      <section className="taxonomy-admin-hero">
        <div className="taxonomy-admin-hero__copy">
          <span className="taxonomy-admin-eyebrow">
            <Layers3 size={16} /> Hệ thống phân loại
          </span>
          <h1>Danh mục, khu vực và chủ đề</h1>
          <p>
            Quản lý taxonomy dùng xuyên suốt Tin tức, Cộng đồng, Bất động sản và Việc làm.
            Mục đã tắt sẽ được loại khỏi giao diện công khai sau khi lưu.
          </p>
        </div>
        <div className="taxonomy-admin-hero__actions">
          <button type="button" className="taxonomy-admin-refresh" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'is-spinning' : ''} />
            Làm mới
          </button>
          <button type="button" className="taxonomy-admin-add" onClick={openCreate}>
            <Plus size={18} />
            Thêm {currentTab.shortLabel.toLowerCase()}
          </button>
        </div>
      </section>

      <section className="taxonomy-admin-tabs" aria-label="Loại dữ liệu phân loại">
        {Object.entries(tabs).map(([value, config]) => {
          const Icon = config.icon;
          return (
            <button
              type="button"
              key={value}
              className={type === value ? 'is-active' : ''}
              onClick={() => setType(value)}
            >
              <span className="taxonomy-admin-tabs__icon"><Icon size={20} /></span>
              <span>
                <strong>{config.label}</strong>
                <small>{config.description}</small>
              </span>
              <b>{tabCounts[value] || 0}</b>
            </button>
          );
        })}
      </section>

      <section className="taxonomy-admin-summary">
        <article>
          <span className="is-total"><CurrentIcon size={19} /></span>
          <div><small>Tổng {currentTab.shortLabel.toLowerCase()}</small><strong>{summary.total}</strong></div>
        </article>
        <article>
          <span className="is-active"><CheckCircle2 size={19} /></span>
          <div><small>Đang hoạt động</small><strong>{summary.active}</strong></div>
        </article>
        <article>
          <span className="is-inactive"><CircleOff size={19} /></span>
          <div><small>Đã tắt</small><strong>{summary.inactive}</strong></div>
        </article>
        <article>
          <span className="is-structure"><Layers3 size={19} /></span>
          <div>
            <small>{type === 'tags' ? 'Lượt sử dụng' : 'Mục cấp con'}</small>
            <strong>{summary.usage}</strong>
          </div>
        </article>
      </section>

      <section className="taxonomy-admin-workspace">
        <header className="taxonomy-admin-workspace__header">
          <div>
            <span className="taxonomy-admin-workspace__icon"><CurrentIcon size={20} /></span>
            <div>
              <h2>{currentTab.label}</h2>
              <p>{currentTab.description}</p>
            </div>
          </div>
          <span className="taxonomy-admin-public-note">
            Public chỉ hiển thị mục <b>Hoạt động</b>
          </span>
        </header>

        <div className="taxonomy-admin-toolbar">
          <label className="taxonomy-admin-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Tìm ${currentTab.shortLabel.toLowerCase()} theo tên, slug...`}
            />
          </label>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {Object.entries(statusOptions).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {type === 'areas' ? (
            <select value={areaTypeFilter} onChange={(event) => setAreaTypeFilter(event.target.value)}>
              <option value="all">Tất cả loại khu vực</option>
              {Object.entries(areaTypes).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          ) : null}
        </div>

        {type === 'categories' ? (
          <div className="taxonomy-admin-chips" aria-label="Phạm vi nội dung">
            <button type="button" className={scopeFilter === '*' ? 'is-active' : ''} onClick={() => setScopeFilter('*')}>
              Tất cả <b>{data.categories.length}</b>
            </button>
            {categoryScopeOrder.map((scope) => (
              <button
                type="button"
                key={scope}
                className={scopeFilter === scope ? 'is-active' : ''}
                onClick={() => setScopeFilter(scope)}
              >
                {scopes[scope]} <b>{scopeCounts[scope] || 0}</b>
              </button>
            ))}
          </div>
        ) : null}

        {type === 'areas' ? (
          <div className="taxonomy-admin-chips taxonomy-admin-chips--areas" aria-label="Loại khu vực">
            <button type="button" className={areaTypeFilter === 'all' ? 'is-active' : ''} onClick={() => setAreaTypeFilter('all')}>
              Tất cả <b>{data.areas.length}</b>
            </button>
            {Object.entries(areaTypes).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={areaTypeFilter === value ? 'is-active' : ''}
                onClick={() => setAreaTypeFilter(value)}
              >
                {label} <b>{areaTypeCounts[value] || 0}</b>
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="taxonomy-admin-loading"><LoadingBlock /></div>
        ) : items.length ? (
          <div className="taxonomy-admin-table-wrap">
            <table className="taxonomy-admin-table">
              <thead>
                <tr>
                  <th>Tên & mô tả</th>
                  <th>Cấu trúc</th>
                  <th>{type === 'categories' ? 'Phạm vi' : type === 'areas' ? 'Loại' : 'Sử dụng'}</th>
                  <th>Slug</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className={item.isActive ? '' : 'is-inactive'}>
                    <td className="taxonomy-admin-table__name">
                      <strong>{item.name}</strong>
                      <small>{item.description || 'Chưa có mô tả.'}</small>
                    </td>
                    <td>
                      <span className="taxonomy-admin-parent">{parentName(item)}</span>
                    </td>
                    <td>
                      <span className="taxonomy-admin-kind">
                        {type === 'categories'
                          ? scopes[item.contentScope] || item.contentScope
                          : type === 'areas'
                            ? areaTypes[item.areaType] || item.areaType
                            : `${Number(item.usageCount || 0).toLocaleString('vi-VN')} lượt`}
                      </span>
                      {type === 'categories' ? (
                        <small className="taxonomy-admin-order">Thứ tự: {Number(item.displayOrder || 0)}</small>
                      ) : null}
                    </td>
                    <td><code>{item.slug}</code></td>
                    <td>
                      <Badge tone={item.isActive ? 'success' : 'soft'}>
                        {item.isActive ? 'Hoạt động' : 'Đã tắt'}
                      </Badge>
                    </td>
                    <td><span className="taxonomy-admin-date">{formatDate(item.updatedAt)}</span></td>
                    <td>
                      <div className="taxonomy-admin-actions">
                        <button type="button" className="is-edit" onClick={() => openEdit(item)} title="Sửa">
                          <Pencil size={16} /> <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          className={item.isActive ? 'is-disable' : 'is-enable'}
                          onClick={() => void setItemActive(item, !item.isActive)}
                        >
                          {item.isActive ? <CircleOff size={16} /> : <CheckCircle2 size={16} />}
                          <span>{item.isActive ? 'Tắt' : 'Bật lại'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="taxonomy-admin-empty">
            <EmptyState title={`Không có ${currentTab.shortLabel.toLowerCase()} phù hợp bộ lọc`} />
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={() => !saving && setSelected(null)}
        title={selected?.mode === 'create'
          ? `Thêm ${currentTab.shortLabel.toLowerCase()}`
          : `Sửa ${currentTab.shortLabel.toLowerCase()}`}
      >
        <form className="taxonomy-admin-form stack-form" onSubmit={submit}>
          <div className="taxonomy-admin-form__intro">
            <span><CurrentIcon size={19} /></span>
            <div>
              <strong>{selected?.mode === 'create' ? 'Tạo mục phân loại mới' : form.name || 'Chỉnh sửa mục'}</strong>
              <small>Thay đổi trạng thái sẽ đồng bộ sang các bộ lọc và màn hình public.</small>
            </div>
          </div>

          <div className="form-grid form-grid--2">
            <FormField label="Tên" required>
              <input
                required
                maxLength={type === 'tags' ? 80 : 120}
                value={form.name || ''}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </FormField>
            <FormField label="Slug" hint="Server tự sinh slug khi tạo mới và cập nhật khi đổi tên.">
              <input value={form.slug || 'Tự động tạo từ tên'} readOnly />
            </FormField>
          </div>

          {type === 'categories' ? (
            <>
              <div className="form-grid form-grid--2">
                <FormField label="Phạm vi sử dụng">
                  <select
                    value={form.contentScope || 'article'}
                    onChange={(event) => setForm({ ...form, contentScope: event.target.value, parentId: '' })}
                  >
                    {categoryScopeOrder.map((value) => (
                      <option key={value} value={value}>{scopes[value]}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Danh mục cha">
                  <select value={form.parentId || ''} onChange={(event) => setForm({ ...form, parentId: event.target.value })}>
                    <option value="">Không có — cấp gốc</option>
                    {parentOptions.filter((item) => item._id !== selected?._id).map((item) => (
                      <option key={item._id} value={item._id}>{item.name}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="Thứ tự hiển thị" hint="Số nhỏ hơn được ưu tiên đứng trước.">
                <input
                  type="number"
                  min="0"
                  value={Number(form.displayOrder || 0)}
                  onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })}
                />
              </FormField>
            </>
          ) : null}

          {type === 'areas' ? (
            <div className="form-grid form-grid--2">
              <FormField label="Loại khu vực">
                <select value={form.areaType || 'commune'} onChange={(event) => setForm({ ...form, areaType: event.target.value })}>
                  {Object.entries(areaTypes).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Khu vực cha">
                <select value={form.parentId || ''} onChange={(event) => setForm({ ...form, parentId: event.target.value })}>
                  <option value="">Không có — cấp gốc</option>
                  {parentOptions.filter((item) => item._id !== selected?._id).map((item) => (
                    <option key={item._id} value={item._id}>{item.name} · {areaTypes[item.areaType]}</option>
                  ))}
                </select>
              </FormField>
            </div>
          ) : null}

          {type !== 'tags' ? (
            <FormField label="Mô tả" hint="Mô tả dùng cho quản trị và có thể được tận dụng ở các trang khám phá.">
              <textarea
                rows="4"
                value={form.description || ''}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </FormField>
          ) : null}

          <label className="taxonomy-admin-status-switch">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            <span aria-hidden="true" />
            <div>
              <strong>{form.isActive ? 'Đang hoạt động' : 'Đang tắt'}</strong>
              <small>
                {form.isActive
                  ? 'Mục này được phép xuất hiện ở bộ lọc và giao diện công khai.'
                  : 'Mục này chỉ còn thấy trong quản trị, không xuất hiện ở public taxonomy.'}
              </small>
            </div>
          </label>

          <div className="taxonomy-admin-form__actions">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setSelected(null)}>Hủy</Button>
            <Button type="submit" loading={saving}>Lưu thay đổi</Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
