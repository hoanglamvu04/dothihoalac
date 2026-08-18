import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  EyeOff,
  FolderKanban,
  MapPin,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  formatProjectInvestment,
  projectIsDelayed,
  projectPriorityLabel,
  projectStatusLabel,
  projectStatusTone,
  projectTypeLabel,
} from '../../utils/projects';

import './AdminProjectsPage.css';

function dateLabel(value) {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function shortUpdated(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AdminProjectsPage() {
  const toast = useToast();
  const { areas = [] } = useTaxonomy();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [area, setArea] = useState('');
  const [visibility, setVisibility] = useState('');
  const [sort, setSort] = useState('updated');
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    adminApi.projects({
      page,
      limit: 25,
      q: appliedQuery || undefined,
      status: status || undefined,
      type: type || undefined,
      priority: priority || undefined,
      area: area || undefined,
      visibility: visibility || undefined,
      sort,
    })
      .then((result) => {
        if (!active) return;
        setItems(result.items || []);
        setMeta(result.meta || {});
      })
      .catch((error) => {
        if (active) toast.error(apiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedQuery, area, page, priority, reloadKey, sort, status, toast, type, visibility]);

  const summary = meta?.summary || {};
  const activeFilters = Boolean(appliedQuery || status || type || priority || area || visibility);

  const statCards = useMemo(() => [
    ['Tổng dự án', summary.total, FolderKanban, 'Tất cả hồ sơ đang quản lý'],
    ['Đang hoạt động', summary.active, Activity, 'Từ đề xuất tới triển khai'],
    ['Đang thi công', summary.construction, CalendarClock, 'Các dự án ở giai đoạn thi công'],
    ['Chậm mốc', summary.delayed, AlertTriangle, 'Đã quá ngày dự kiến hoàn thành'],
    ['Hoàn thành', summary.completed, CheckCircle2, 'Dự án đã đóng tiến độ'],
    ['Tổng vốn theo dõi', formatProjectInvestment(summary.totalInvestmentVnd), CircleDollarSign, 'Tổng mức đầu tư đã nhập'],
  ], [summary]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  };

  const clearFilters = () => {
    setQuery('');
    setAppliedQuery('');
    setStatus('');
    setType('');
    setPriority('');
    setArea('');
    setVisibility('');
    setSort('updated');
    setPage(1);
  };

  const removeProject = async (item) => {
    const id = String(item?._id || '');
    if (!id || deletingId) return;

    const accepted = window.confirm(
      `Xóa dự án “${item.name}” khỏi Project Tracker?\n\nDự án sẽ bị ẩn khỏi Admin và khỏi các khối công khai trên website.`,
    );
    if (!accepted) return;

    setDeletingId(id);
    try {
      await adminApi.deleteProject(id);
      toast.success('Đã xóa dự án.');
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else setReloadKey((current) => current + 1);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="admin-projects-page">
      <Seo title="Project Tracker · Quản trị" />

      <header className="admin-page-head admin-projects-head">
        <div>
          <p className="admin-kicker">DTHL Project Operations</p>
          <h1>Project Tracker</h1>
          <p>
            Quản lý vòng đời dự án Hòa Lạc từ chủ trương, pháp lý, vốn, mốc tiến độ,
            nhà đầu tư, nhà thầu tới dữ liệu hiển thị công khai trên trang tin.
          </p>
        </div>
        <Link className="admin-primary" to="/quan-tri/du-an/moi">
          <Plus size={16} /> Thêm dự án
        </Link>
      </header>

      <section className="admin-project-stats" aria-label="Tổng quan dự án">
        {statCards.map(([label, value, Icon, note]) => (
          <article key={label}>
            <span><Icon size={19} /></span>
            <div>
              <strong>{typeof value === 'number' ? Number(value || 0).toLocaleString('vi-VN') : value}</strong>
              <b>{label}</b>
              <small>{note}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-project-toolbar" aria-label="Bộ lọc Project Tracker">
        <form onSubmit={submitSearch} className="admin-project-search">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên dự án, mã dự án, chủ đầu tư, địa điểm..."
          />
          <button type="submit">Tìm</button>
        </form>

        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          {PROJECT_STATUSES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>

        <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
          <option value="">Tất cả loại dự án</option>
          {PROJECT_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>

        <select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }}>
          <option value="">Mọi mức ưu tiên</option>
          {PROJECT_PRIORITIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>

        <select value={area} onChange={(event) => { setArea(event.target.value); setPage(1); }}>
          <option value="">Mọi khu vực</option>
          {areas.map((item) => (
            <option value={item.slug || item._id} key={item._id || item.slug}>{item.name}</option>
          ))}
        </select>

        <select value={visibility} onChange={(event) => { setVisibility(event.target.value); setPage(1); }}>
          <option value="">Mọi chế độ hiển thị</option>
          <option value="public">Công khai</option>
          <option value="private">Nội bộ</option>
        </select>

        <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
          <option value="updated">Mới cập nhật</option>
          <option value="progress">Tiến độ cao → thấp</option>
          <option value="deadline">Mốc hoàn thành gần nhất</option>
          <option value="investment">Tổng vốn cao → thấp</option>
          <option value="name">Tên A → Z</option>
        </select>

        <button type="button" className="admin-project-refresh" onClick={() => setReloadKey((value) => value + 1)}>
          <RefreshCw size={16} />
        </button>

        {activeFilters ? (
          <button type="button" className="admin-project-clear" onClick={clearFilters}>Xóa lọc</button>
        ) : null}
      </section>

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <>
          <div className="admin-project-table" role="table" aria-label="Danh sách dự án">
            <div className="admin-project-table__head" role="row">
              <span>Dự án</span>
              <span>Phân loại</span>
              <span>Tiến độ</span>
              <span>Mốc & vốn</span>
              <span>Hiển thị</span>
              <span>Thao tác</span>
            </div>

            {items.map((item) => {
              const delayed = projectIsDelayed(item);
              const progress = Math.round(Number(item.progressPercent || 0));

              return (
                <article className="admin-project-row" key={item._id} role="row">
                  <div className="admin-project-row__identity">
                    <div className="admin-project-row__code">
                      <span>{item.code || 'CHƯA MÃ'}</span>
                      {item.isFeatured ? <Star size={13} fill="currentColor" /> : null}
                    </div>
                    <Link to={`/quan-tri/du-an/${item._id}`}>{item.name}</Link>
                    <small>
                      <MapPin size={12} />
                      {item.primaryAreaId?.name || item.locationText || 'Chưa gắn khu vực'}
                    </small>
                    <em>Cập nhật {shortUpdated(item.updatedAt)}</em>
                  </div>

                  <div className="admin-project-row__classify">
                    <Badge tone={projectStatusTone(item.status)}>{projectStatusLabel(item.status)}</Badge>
                    <span>{projectTypeLabel(item.projectType)}</span>
                    <small>Ưu tiên: {projectPriorityLabel(item.priority)}</small>
                  </div>

                  <div className="admin-project-row__progress">
                    <div>
                      <strong>{progress}%</strong>
                      {delayed ? <span><AlertTriangle size={13} /> Quá mốc</span> : null}
                    </div>
                    <i><b style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></i>
                    <small>{item.currentUpdate || 'Chưa có ghi chú tiến độ mới.'}</small>
                  </div>

                  <div className="admin-project-row__finance">
                    <span><CalendarClock size={14} /> {dateLabel(item.expectedCompletionDate)}</span>
                    <span><CircleDollarSign size={14} /> {formatProjectInvestment(item.totalInvestmentVnd)}</span>
                  </div>

                  <div className="admin-project-row__visibility">
                    <span className={item.isPublic ? 'is-public' : ''}>
                      {item.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
                      {item.isPublic ? 'Công khai' : 'Nội bộ'}
                    </span>
                    {item.isFeatured ? <small><Star size={12} fill="currentColor" /> Nổi bật</small> : null}
                  </div>

                  <div className="admin-project-row__actions">
                    <Link to={`/quan-tri/du-an/${item._id}`} title="Mở Project Workspace">
                      <PencilLine size={16} />
                    </Link>
                    <button
                      type="button"
                      title="Xóa dự án"
                      disabled={deletingId === String(item._id)}
                      onClick={() => removeProject(item)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="admin-project-pagination">
            <span>
              {Number(meta.total || 0).toLocaleString('vi-VN')} dự án · Trang {Number(meta.page || 1)}/{Number(meta.totalPages || 1)}
            </span>
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        </>
      ) : (
        <EmptyState
          title="Chưa có dự án phù hợp"
          description="Tạo dự án đầu tiên hoặc thay đổi bộ lọc để tiếp tục quản lý Project Tracker."
        />
      )}
    </div>
  );
}
