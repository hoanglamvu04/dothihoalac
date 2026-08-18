import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  FileCheck2,
  Flag,
  History,
  Landmark,
  Link2,
  ListChecks,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import Badge from '../../components/common/Badge';
import FormField from '../../components/common/FormField';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';
import {
  MILESTONE_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  formatProjectInvestment,
  milestoneStatusLabel,
  projectIsDelayed,
  projectPriorityLabel,
  projectStatusLabel,
  projectStatusTone,
  projectTypeLabel,
} from '../../utils/projects';

import './ProjectWorkspacePage.css';

const TABS = [
  ['overview', 'Tổng quan', ClipboardList],
  ['organizations', 'Chủ thể & quy mô', UsersRound],
  ['schedule', 'Pháp lý & thời gian', FileCheck2],
  ['milestones', 'Mốc triển khai', ListChecks],
  ['updates', 'Nhật ký tiến độ', History],
  ['visibility', 'Hiển thị & nguồn', ShieldCheck],
];

const EMPTY_FORM = {
  name: '',
  shortName: '',
  code: '',
  slug: '',
  projectType: 'other',
  status: 'proposed',
  priority: 'normal',
  progressPercent: 0,
  primaryAreaId: '',
  areaIds: [],
  locationText: '',
  latitude: '',
  longitude: '',
  investor: '',
  developer: '',
  managingAuthority: '',
  contractor: '',
  consultant: '',
  totalInvestmentVnd: '',
  fundingSourcesText: '',
  landAreaHa: '',
  lengthKm: '',
  scaleText: '',
  approvalDecisionNo: '',
  approvalDecisionDate: '',
  startDate: '',
  expectedCompletionDate: '',
  completedAt: '',
  description: '',
  objectives: '',
  currentUpdate: '',
  risks: '',
  nextSteps: '',
  milestones: [],
  sourceUrls: [],
  isFeatured: false,
  isPublic: true,
  sortOrder: 0,
};

const EMPTY_UPDATE = {
  updateDate: new Date().toISOString().slice(0, 10),
  title: '',
  summary: '',
  progressPercent: '',
  status: '',
  sourceUrl: '',
};

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function dateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

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

function dateOrNull(value) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function fromItem(item) {
  if (!item) return { ...EMPTY_FORM };

  return {
    ...EMPTY_FORM,
    name: item.name || '',
    shortName: item.shortName || '',
    code: item.code || '',
    slug: item.slug || '',
    projectType: item.projectType || 'other',
    status: item.status || 'proposed',
    priority: item.priority || 'normal',
    progressPercent: Number(item.progressPercent || 0),
    primaryAreaId: idOf(item.primaryAreaId),
    areaIds: Array.isArray(item.areaIds) ? item.areaIds.map(idOf).filter(Boolean) : [],
    locationText: item.locationText || '',
    latitude: item.latitude ?? '',
    longitude: item.longitude ?? '',
    investor: item.investor || '',
    developer: item.developer || '',
    managingAuthority: item.managingAuthority || '',
    contractor: item.contractor || '',
    consultant: item.consultant || '',
    totalInvestmentVnd: item.totalInvestmentVnd ?? '',
    fundingSourcesText: Array.isArray(item.fundingSources) ? item.fundingSources.join('\n') : '',
    landAreaHa: item.landAreaHa ?? '',
    lengthKm: item.lengthKm ?? '',
    scaleText: item.scaleText || '',
    approvalDecisionNo: item.approvalDecisionNo || '',
    approvalDecisionDate: dateInput(item.approvalDecisionDate),
    startDate: dateInput(item.startDate),
    expectedCompletionDate: dateInput(item.expectedCompletionDate),
    completedAt: dateInput(item.completedAt),
    description: item.description || '',
    objectives: item.objectives || '',
    currentUpdate: item.currentUpdate || '',
    risks: item.risks || '',
    nextSteps: item.nextSteps || '',
    milestones: Array.isArray(item.milestones)
      ? item.milestones.map((milestone) => ({
          _id: idOf(milestone._id) || undefined,
          title: milestone.title || '',
          status: milestone.status || 'pending',
          targetDate: dateInput(milestone.targetDate),
          completedAt: dateInput(milestone.completedAt),
          progressPercent: Number(milestone.progressPercent || 0),
          note: milestone.note || '',
        }))
      : [],
    sourceUrls: Array.isArray(item.sourceUrls)
      ? item.sourceUrls.map((source) => ({
          _id: idOf(source._id) || undefined,
          label: source.label || '',
          url: source.url || '',
        }))
      : [],
    isFeatured: Boolean(item.isFeatured),
    isPublic: item.isPublic !== false,
    sortOrder: Number(item.sortOrder || 0),
  };
}

function payloadFromForm(form) {
  return {
    name: form.name.trim(),
    shortName: form.shortName.trim(),
    code: form.code.trim(),
    slug: form.slug.trim(),
    projectType: form.projectType,
    status: form.status,
    priority: form.priority,
    progressPercent: Math.min(100, Math.max(0, Number(form.progressPercent || 0))),
    primaryAreaId: form.primaryAreaId || null,
    areaIds: form.areaIds.filter(Boolean),
    locationText: form.locationText.trim(),
    latitude: numberOrNull(form.latitude),
    longitude: numberOrNull(form.longitude),
    investor: form.investor.trim(),
    developer: form.developer.trim(),
    managingAuthority: form.managingAuthority.trim(),
    contractor: form.contractor.trim(),
    consultant: form.consultant.trim(),
    totalInvestmentVnd: numberOrNull(form.totalInvestmentVnd),
    fundingSources: form.fundingSourcesText
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean),
    landAreaHa: numberOrNull(form.landAreaHa),
    lengthKm: numberOrNull(form.lengthKm),
    scaleText: form.scaleText.trim(),
    approvalDecisionNo: form.approvalDecisionNo.trim(),
    approvalDecisionDate: dateOrNull(form.approvalDecisionDate),
    startDate: dateOrNull(form.startDate),
    expectedCompletionDate: dateOrNull(form.expectedCompletionDate),
    completedAt: dateOrNull(form.completedAt),
    description: form.description.trim(),
    objectives: form.objectives.trim(),
    currentUpdate: form.currentUpdate.trim(),
    risks: form.risks.trim(),
    nextSteps: form.nextSteps.trim(),
    milestones: form.milestones
      .filter((item) => item.title.trim())
      .map((item) => ({
        ...(item._id ? { _id: item._id } : {}),
        title: item.title.trim(),
        status: item.status,
        targetDate: dateOrNull(item.targetDate),
        completedAt: dateOrNull(item.completedAt),
        progressPercent: Math.min(100, Math.max(0, Number(item.progressPercent || 0))),
        note: item.note.trim(),
      })),
    sourceUrls: form.sourceUrls
      .filter((item) => item.url.trim())
      .map((item) => ({
        ...(item._id ? { _id: item._id } : {}),
        label: item.label.trim(),
        url: item.url.trim(),
      })),
    isFeatured: Boolean(form.isFeatured),
    isPublic: Boolean(form.isPublic),
    sortOrder: Number(form.sortOrder || 0),
  };
}

function ProjectSummary({ item, form }) {
  const delayed = projectIsDelayed({ ...item, ...form });
  const progress = Math.min(100, Math.max(0, Number(form.progressPercent || 0)));

  return (
    <aside className="project-workspace-summary">
      <div className="project-workspace-summary__top">
        <span>{form.code || 'MÃ TỰ ĐỘNG'}</span>
        {form.isFeatured ? <Star size={15} fill="currentColor" /> : null}
      </div>
      <h2>{form.name || 'Dự án mới'}</h2>
      <p>{projectTypeLabel(form.projectType)}</p>

      <div className="project-workspace-progress">
        <div>
          <strong>{Math.round(progress)}%</strong>
          <Badge tone={projectStatusTone(form.status)}>{projectStatusLabel(form.status)}</Badge>
        </div>
        <i><b style={{ width: `${progress}%` }} /></i>
      </div>

      <dl>
        <div>
          <dt>Ưu tiên</dt>
          <dd>{projectPriorityLabel(form.priority)}</dd>
        </div>
        <div>
          <dt>Hoàn thành dự kiến</dt>
          <dd className={delayed ? 'is-delayed' : ''}>{dateLabel(form.expectedCompletionDate)}</dd>
        </div>
        <div>
          <dt>Tổng mức đầu tư</dt>
          <dd>{formatProjectInvestment(form.totalInvestmentVnd)}</dd>
        </div>
        <div>
          <dt>Mốc triển khai</dt>
          <dd>{form.milestones.length}</dd>
        </div>
        <div>
          <dt>Hiển thị</dt>
          <dd>{form.isPublic ? 'Công khai' : 'Nội bộ'}</dd>
        </div>
      </dl>

      {delayed ? (
        <div className="project-workspace-warning">
          <AlertTriangle size={16} />
          Dự án đã qua mốc hoàn thành dự kiến và chưa ở trạng thái hoàn thành.
        </div>
      ) : null}

      {item?.updatedAt ? (
        <small>Cập nhật hệ thống gần nhất: {dateLabel(item.updatedAt)}</small>
      ) : null}
    </aside>
  );
}

export default function ProjectWorkspacePage() {
  const { id } = useParams();
  const creating = !id || id === 'moi';
  const navigate = useNavigate();
  const toast = useToast();
  const { areas = [] } = useTaxonomy();
  const [item, setItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(!creating);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updateForm, setUpdateForm] = useState({ ...EMPTY_UPDATE });
  const [postingUpdate, setPostingUpdate] = useState(false);

  useEffect(() => {
    if (creating) {
      setItem(null);
      setForm({ ...EMPTY_FORM });
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    adminApi.projectDetail(id)
      .then((result) => {
        if (!active) return;
        setItem(result);
        setForm(fromItem(result));
        setUpdateForm({
          ...EMPTY_UPDATE,
          progressPercent: String(result?.progressPercent ?? ''),
          status: result?.status || '',
        });
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
  }, [creating, id, toast]);

  const apply = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectedAreaSet = useMemo(() => new Set(form.areaIds), [form.areaIds]);

  const toggleArea = (areaId) => {
    setForm((current) => ({
      ...current,
      areaIds: current.areaIds.includes(areaId)
        ? current.areaIds.filter((value) => value !== areaId)
        : [...current.areaIds, areaId],
    }));
  };

  const updateMilestone = (index, key, value) => {
    setForm((current) => ({
      ...current,
      milestones: current.milestones.map((milestone, currentIndex) => (
        currentIndex === index ? { ...milestone, [key]: value } : milestone
      )),
    }));
  };

  const addMilestone = () => {
    setForm((current) => ({
      ...current,
      milestones: [
        ...current.milestones,
        {
          title: '',
          status: 'pending',
          targetDate: '',
          completedAt: '',
          progressPercent: 0,
          note: '',
        },
      ],
    }));
  };

  const removeMilestone = (index) => {
    setForm((current) => ({
      ...current,
      milestones: current.milestones.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const updateSource = (index, key, value) => {
    setForm((current) => ({
      ...current,
      sourceUrls: current.sourceUrls.map((source, currentIndex) => (
        currentIndex === index ? { ...source, [key]: value } : source
      )),
    }));
  };

  const addSource = () => {
    setForm((current) => ({
      ...current,
      sourceUrls: [...current.sourceUrls, { label: '', url: '' }],
    }));
  };

  const removeSource = (index) => {
    setForm((current) => ({
      ...current,
      sourceUrls: current.sourceUrls.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const save = async (event) => {
    event?.preventDefault?.();
    if (saving) return;

    if (form.name.trim().length < 3) {
      toast.error('Tên dự án cần tối thiểu 3 ký tự.');
      setTab('overview');
      return;
    }

    setSaving(true);
    try {
      const payload = payloadFromForm(form);
      const result = creating
        ? await adminApi.createProject(payload)
        : await adminApi.updateProject(id, payload);

      setItem(result);
      setForm(fromItem(result));
      toast.success(creating ? 'Đã tạo dự án trong Project Tracker.' : 'Đã lưu toàn bộ dữ liệu dự án.');

      if (creating) {
        navigate(`/quan-tri/du-an/${result._id}`, { replace: true });
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async () => {
    if (creating || deleting) return;
    const accepted = window.confirm(
      `Xóa dự án “${item?.name || form.name}”?\n\nDự án sẽ biến mất khỏi Project Tracker và các khối công khai.`,
    );
    if (!accepted) return;

    setDeleting(true);
    try {
      await adminApi.deleteProject(id);
      toast.success('Đã xóa dự án.');
      navigate('/quan-tri/du-an', { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setDeleting(false);
    }
  };

  const postUpdate = async (event) => {
    event.preventDefault();
    if (creating || postingUpdate || !updateForm.title.trim()) return;

    setPostingUpdate(true);
    try {
      const result = await adminApi.addProjectUpdate(id, {
        updateDate: dateOrNull(updateForm.updateDate),
        title: updateForm.title.trim(),
        summary: updateForm.summary.trim(),
        progressPercent: updateForm.progressPercent === '' ? null : Number(updateForm.progressPercent),
        status: updateForm.status || null,
        sourceUrl: updateForm.sourceUrl.trim(),
      });

      setItem(result);
      setForm(fromItem(result));
      setUpdateForm({
        ...EMPTY_UPDATE,
        progressPercent: String(result?.progressPercent ?? ''),
        status: result?.status || '',
      });
      toast.success('Đã ghi nhận bản cập nhật tiến độ.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPostingUpdate(false);
    }
  };

  const deleteProgressUpdate = async (updateId) => {
    if (creating || !updateId) return;
    if (!window.confirm('Xóa bản cập nhật tiến độ này?')) return;

    try {
      const result = await adminApi.deleteProjectUpdate(id, updateId);
      setItem(result);
      setForm(fromItem(result));
      toast.success('Đã xóa bản cập nhật.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <main className="project-workspace-page">
      <Seo title={`${creating ? 'Dự án mới' : form.name || 'Project Tracker'} · Quản trị`} />

      <header className="project-workspace-hero">
        <div>
          <Link to="/quan-tri/du-an" className="project-workspace-back">
            <ArrowLeft size={15} /> Project Tracker
          </Link>
          <p className="admin-kicker">Project Workspace</p>
          <h1>{creating ? 'Thêm dự án mới' : form.name}</h1>
          <p>
            Hồ sơ vận hành tập trung cho tiến độ, chủ thể thực hiện, pháp lý, vốn, mốc triển khai,
            rủi ro, nguồn kiểm chứng và dữ liệu được phép xuất hiện trên website.
          </p>
        </div>

        <div className="project-workspace-hero__actions">
          {!creating ? (
            <button type="button" className="admin-secondary project-delete-button" onClick={removeProject} disabled={deleting || saving}>
              <Trash2 size={15} /> {deleting ? 'Đang xóa…' : 'Xóa dự án'}
            </button>
          ) : null}
          <button type="button" className="admin-primary" onClick={save} disabled={saving || deleting}>
            <Save size={15} /> {saving ? 'Đang lưu…' : creating ? 'Tạo dự án' : 'Lưu toàn bộ'}
          </button>
        </div>
      </header>

      <nav className="project-workspace-tabs" aria-label="Khu vực quản lý dự án">
        {TABS.map(([value, label, Icon]) => (
          <button
            type="button"
            key={value}
            className={tab === value ? 'is-active' : ''}
            onClick={() => setTab(value)}
          >
            <Icon size={16} /> {label}
            {value === 'milestones' && form.milestones.length ? <b>{form.milestones.length}</b> : null}
            {value === 'updates' && item?.updates?.length ? <b>{item.updates.length}</b> : null}
          </button>
        ))}
      </nav>

      <div className="project-workspace-layout">
        <form className="project-workspace-main" onSubmit={save}>
          {tab === 'overview' ? (
            <section className="project-workspace-card">
              <header>
                <ClipboardList size={19} />
                <div>
                  <h2>Thông tin lõi</h2>
                  <p>Những trường dùng để định danh, phân loại, xếp ưu tiên và theo dõi tiến độ tổng thể.</p>
                </div>
              </header>

              <div className="form-grid form-grid--2">
                <FormField label="Tên dự án" required>
                  <input value={form.name} onChange={(event) => apply('name', event.target.value)} placeholder="Ví dụ: Tuyến đường Vành đai 5 đoạn qua Hòa Lạc" />
                </FormField>
                <FormField label="Tên ngắn / tên gọi phổ biến">
                  <input value={form.shortName} onChange={(event) => apply('shortName', event.target.value)} placeholder="Vành đai 5 - Hòa Lạc" />
                </FormField>
                <FormField label="Mã dự án">
                  <input value={form.code} onChange={(event) => apply('code', event.target.value)} placeholder="Để trống để hệ thống tự sinh" />
                </FormField>
                <FormField label="Slug">
                  <input value={form.slug} onChange={(event) => apply('slug', event.target.value)} placeholder="Tự sinh từ tên nếu để trống" />
                </FormField>
                <FormField label="Loại dự án">
                  <select value={form.projectType} onChange={(event) => apply('projectType', event.target.value)}>
                    {PROJECT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </FormField>
                <FormField label="Trạng thái">
                  <select value={form.status} onChange={(event) => apply('status', event.target.value)}>
                    {PROJECT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </FormField>
                <FormField label="Mức ưu tiên">
                  <select value={form.priority} onChange={(event) => apply('priority', event.target.value)}>
                    {PROJECT_PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </FormField>
                <FormField label={`Tiến độ tổng thể · ${Math.round(Number(form.progressPercent || 0))}%`}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={form.progressPercent}
                    onChange={(event) => apply('progressPercent', Number(event.target.value))}
                  />
                </FormField>
              </div>

              <div className="form-grid form-grid--2 project-workspace-space-top">
                <FormField label="Khu vực chính">
                  <select value={form.primaryAreaId} onChange={(event) => apply('primaryAreaId', event.target.value)}>
                    <option value="">Chưa xác định</option>
                    {areas.map((areaItem) => (
                      <option key={areaItem._id || areaItem.slug} value={idOf(areaItem)}>{areaItem.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Địa điểm / phạm vi tuyến">
                  <input value={form.locationText} onChange={(event) => apply('locationText', event.target.value)} placeholder="Xã, khu CNC, tuyến đường, điểm đầu - điểm cuối..." />
                </FormField>
                <FormField label="Vĩ độ">
                  <input type="number" step="any" value={form.latitude} onChange={(event) => apply('latitude', event.target.value)} />
                </FormField>
                <FormField label="Kinh độ">
                  <input type="number" step="any" value={form.longitude} onChange={(event) => apply('longitude', event.target.value)} />
                </FormField>
              </div>

              <div className="project-area-selector">
                <span>Khu vực liên quan</span>
                <div>
                  {areas.map((areaItem) => {
                    const areaId = idOf(areaItem);
                    return (
                      <label key={areaId} className={selectedAreaSet.has(areaId) ? 'is-selected' : ''}>
                        <input type="checkbox" checked={selectedAreaSet.has(areaId)} onChange={() => toggleArea(areaId)} />
                        {areaItem.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <FormField label="Mô tả dự án">
                <textarea rows={6} value={form.description} onChange={(event) => apply('description', event.target.value)} placeholder="Mô tả khách quan về phạm vi và hiện trạng dự án..." />
              </FormField>
              <FormField label="Mục tiêu / ý nghĩa">
                <textarea rows={5} value={form.objectives} onChange={(event) => apply('objectives', event.target.value)} placeholder="Mục tiêu đầu tư, kết nối, tác động kỳ vọng..." />
              </FormField>
            </section>
          ) : null}

          {tab === 'organizations' ? (
            <section className="project-workspace-card">
              <header>
                <Building2 size={19} />
                <div>
                  <h2>Chủ thể, vốn và quy mô</h2>
                  <p>Quản lý đơn vị chịu trách nhiệm, chủ đầu tư, nhà thầu và các thông số vật lý - tài chính.</p>
                </div>
              </header>

              <div className="form-grid form-grid--2">
                <FormField label="Chủ đầu tư">
                  <input value={form.investor} onChange={(event) => apply('investor', event.target.value)} />
                </FormField>
                <FormField label="Đơn vị phát triển / triển khai">
                  <input value={form.developer} onChange={(event) => apply('developer', event.target.value)} />
                </FormField>
                <FormField label="Cơ quan quản lý / phê duyệt">
                  <input value={form.managingAuthority} onChange={(event) => apply('managingAuthority', event.target.value)} />
                </FormField>
                <FormField label="Nhà thầu chính / liên danh">
                  <input value={form.contractor} onChange={(event) => apply('contractor', event.target.value)} />
                </FormField>
                <FormField label="Đơn vị tư vấn">
                  <input value={form.consultant} onChange={(event) => apply('consultant', event.target.value)} />
                </FormField>
                <FormField label="Tổng mức đầu tư (VND)">
                  <input type="number" min="0" step="1000000" value={form.totalInvestmentVnd} onChange={(event) => apply('totalInvestmentVnd', event.target.value)} placeholder="Ví dụ 18200000000000" />
                </FormField>
                <FormField label="Diện tích (ha)">
                  <input type="number" min="0" step="0.01" value={form.landAreaHa} onChange={(event) => apply('landAreaHa', event.target.value)} />
                </FormField>
                <FormField label="Chiều dài tuyến (km)">
                  <input type="number" min="0" step="0.01" value={form.lengthKm} onChange={(event) => apply('lengthKm', event.target.value)} />
                </FormField>
              </div>

              <FormField label="Nguồn vốn · mỗi dòng một nguồn">
                <textarea rows={4} value={form.fundingSourcesText} onChange={(event) => apply('fundingSourcesText', event.target.value)} placeholder={'Ngân sách Trung ương\nNgân sách thành phố\nPPP'} />
              </FormField>

              <FormField label="Quy mô / hạng mục chính">
                <textarea rows={7} value={form.scaleText} onChange={(event) => apply('scaleText', event.target.value)} placeholder="Số km, số làn, số khối nhà, diện tích sàn, các hạng mục kỹ thuật..." />
              </FormField>
            </section>
          ) : null}

          {tab === 'schedule' ? (
            <section className="project-workspace-card">
              <header>
                <Landmark size={19} />
                <div>
                  <h2>Pháp lý, lịch triển khai và điều hành</h2>
                  <p>Gắn quyết định, mốc thời gian chính và thông tin điều hành để phát hiện dự án chậm tiến độ.</p>
                </div>
              </header>

              <div className="form-grid form-grid--2">
                <FormField label="Số quyết định / văn bản phê duyệt">
                  <input value={form.approvalDecisionNo} onChange={(event) => apply('approvalDecisionNo', event.target.value)} />
                </FormField>
                <FormField label="Ngày quyết định">
                  <input type="date" value={form.approvalDecisionDate} onChange={(event) => apply('approvalDecisionDate', event.target.value)} />
                </FormField>
                <FormField label="Ngày khởi công / bắt đầu">
                  <input type="date" value={form.startDate} onChange={(event) => apply('startDate', event.target.value)} />
                </FormField>
                <FormField label="Hoàn thành dự kiến">
                  <input type="date" value={form.expectedCompletionDate} onChange={(event) => apply('expectedCompletionDate', event.target.value)} />
                </FormField>
                <FormField label="Ngày hoàn thành thực tế">
                  <input type="date" value={form.completedAt} onChange={(event) => apply('completedAt', event.target.value)} />
                </FormField>
              </div>

              <FormField label="Cập nhật hiện tại">
                <textarea rows={5} value={form.currentUpdate} onChange={(event) => apply('currentUpdate', event.target.value)} placeholder="Tóm tắt trạng thái mới nhất có thể dùng ở các box theo dõi dự án." />
              </FormField>
              <FormField label="Rủi ro / điểm nghẽn · chỉ dùng nội bộ">
                <textarea rows={5} value={form.risks} onChange={(event) => apply('risks', event.target.value)} placeholder="GPMB, vốn, thủ tục, nhà thầu, vật liệu, điều chỉnh thiết kế..." />
              </FormField>
              <FormField label="Bước tiếp theo">
                <textarea rows={5} value={form.nextSteps} onChange={(event) => apply('nextSteps', event.target.value)} placeholder="Mốc hành động tiếp theo cần theo dõi." />
              </FormField>
            </section>
          ) : null}

          {tab === 'milestones' ? (
            <section className="project-workspace-card">
              <header className="project-workspace-card__action-head">
                <div>
                  <ListChecks size={19} />
                  <div>
                    <h2>Mốc triển khai</h2>
                    <p>Tách dự án thành các mốc có deadline, trạng thái và % hoàn thành riêng.</p>
                  </div>
                </div>
                <button type="button" onClick={addMilestone}><Plus size={15} /> Thêm mốc</button>
              </header>

              <div className="project-milestone-list">
                {form.milestones.length ? form.milestones.map((milestone, index) => (
                  <article key={milestone._id || `milestone-${index}`}>
                    <div className="project-milestone-number">{String(index + 1).padStart(2, '0')}</div>
                    <div className="project-milestone-fields">
                      <FormField label="Tên mốc">
                        <input value={milestone.title} onChange={(event) => updateMilestone(index, 'title', event.target.value)} placeholder="Ví dụ: Hoàn tất giải phóng mặt bằng" />
                      </FormField>
                      <div className="form-grid form-grid--3">
                        <FormField label="Trạng thái">
                          <select value={milestone.status} onChange={(event) => updateMilestone(index, 'status', event.target.value)}>
                            {MILESTONE_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </FormField>
                        <FormField label="Hạn mục tiêu">
                          <input type="date" value={milestone.targetDate} onChange={(event) => updateMilestone(index, 'targetDate', event.target.value)} />
                        </FormField>
                        <FormField label="Ngày hoàn thành">
                          <input type="date" value={milestone.completedAt} onChange={(event) => updateMilestone(index, 'completedAt', event.target.value)} />
                        </FormField>
                      </div>
                      <FormField label={`Tiến độ mốc · ${Math.round(Number(milestone.progressPercent || 0))}%`}>
                        <input type="range" min="0" max="100" value={milestone.progressPercent} onChange={(event) => updateMilestone(index, 'progressPercent', Number(event.target.value))} />
                      </FormField>
                      <FormField label="Ghi chú">
                        <textarea rows={3} value={milestone.note} onChange={(event) => updateMilestone(index, 'note', event.target.value)} />
                      </FormField>
                    </div>
                    <button type="button" className="project-milestone-remove" onClick={() => removeMilestone(index)} title="Xóa mốc">
                      <Trash2 size={16} />
                    </button>
                  </article>
                )) : (
                  <div className="project-workspace-empty">
                    <ListChecks size={28} />
                    <strong>Chưa có mốc triển khai</strong>
                    <span>Thêm các checkpoint như phê duyệt, GPMB, đấu thầu, thi công, nghiệm thu.</span>
                    <button type="button" onClick={addMilestone}><Plus size={15} /> Thêm mốc đầu tiên</button>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {tab === 'updates' ? (
            <section className="project-workspace-card">
              <header>
                <History size={19} />
                <div>
                  <h2>Nhật ký tiến độ</h2>
                  <p>Mỗi lần có thông tin mới, ghi thành một bản cập nhật có ngày, nguồn, % và trạng thái tại thời điểm đó.</p>
                </div>
              </header>

              {creating ? (
                <div className="project-workspace-empty">
                  <History size={28} />
                  <strong>Hãy tạo dự án trước</strong>
                  <span>Sau khi lưu dự án lần đầu, bạn có thể ghi nhật ký tiến độ độc lập tại đây.</span>
                </div>
              ) : (
                <>
                  <div className="project-update-composer">
                    <h3>Ghi cập nhật mới</h3>
                    <div className="form-grid form-grid--3">
                      <FormField label="Ngày cập nhật">
                        <input type="date" value={updateForm.updateDate} onChange={(event) => setUpdateForm((current) => ({ ...current, updateDate: event.target.value }))} />
                      </FormField>
                      <FormField label="Tiến độ sau cập nhật (%)">
                        <input type="number" min="0" max="100" value={updateForm.progressPercent} onChange={(event) => setUpdateForm((current) => ({ ...current, progressPercent: event.target.value }))} />
                      </FormField>
                      <FormField label="Trạng thái sau cập nhật">
                        <select value={updateForm.status} onChange={(event) => setUpdateForm((current) => ({ ...current, status: event.target.value }))}>
                          <option value="">Giữ nguyên trạng thái</option>
                          {PROJECT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </FormField>
                    </div>
                    <FormField label="Tiêu đề cập nhật" required>
                      <input value={updateForm.title} onChange={(event) => setUpdateForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Hoàn thành 70% GPMB đoạn qua Hạ Bằng" />
                    </FormField>
                    <FormField label="Nội dung cập nhật">
                      <textarea rows={5} value={updateForm.summary} onChange={(event) => setUpdateForm((current) => ({ ...current, summary: event.target.value }))} />
                    </FormField>
                    <FormField label="URL nguồn kiểm chứng">
                      <input type="url" value={updateForm.sourceUrl} onChange={(event) => setUpdateForm((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://..." />
                    </FormField>
                    <button type="button" className="admin-primary project-post-update" onClick={postUpdate} disabled={postingUpdate || !updateForm.title.trim()}>
                      <Plus size={15} /> {postingUpdate ? 'Đang ghi…' : 'Ghi vào nhật ký'}
                    </button>
                  </div>

                  <div className="project-update-timeline">
                    {(item?.updates || []).length ? item.updates.map((update) => (
                      <article key={update._id}>
                        <span className="project-update-dot" />
                        <div className="project-update-card">
                          <header>
                            <div>
                              <time>{dateLabel(update.updateDate || update.createdAt)}</time>
                              <h3>{update.title}</h3>
                            </div>
                            <button type="button" onClick={() => deleteProgressUpdate(update._id)} title="Xóa cập nhật">
                              <Trash2 size={14} />
                            </button>
                          </header>
                          {update.summary ? <p>{update.summary}</p> : null}
                          <footer>
                            {update.progressPercent !== null && update.progressPercent !== undefined ? <span>{update.progressPercent}%</span> : null}
                            {update.status ? <Badge tone={projectStatusTone(update.status)}>{projectStatusLabel(update.status)}</Badge> : null}
                            {update.createdBy ? <span> bởi {update.createdBy.displayName || update.createdBy.username}</span> : null}
                            {update.sourceUrl ? (
                              <a href={update.sourceUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={13} /> Nguồn
                              </a>
                            ) : null}
                          </footer>
                        </div>
                      </article>
                    )) : (
                      <div className="project-workspace-empty project-workspace-empty--compact">
                        <History size={24} />
                        <strong>Chưa có lịch sử cập nhật</strong>
                        <span>Bản cập nhật đầu tiên sẽ tạo dấu mốc lịch sử cho dự án.</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          ) : null}

          {tab === 'visibility' ? (
            <section className="project-workspace-card">
              <header>
                <ShieldCheck size={19} />
                <div>
                  <h2>Hiển thị công khai & nguồn kiểm chứng</h2>
                  <p>Kiểm soát dự án nào được xuất hiện trên các khối tin công khai và lưu nguồn gốc dữ liệu.</p>
                </div>
              </header>

              <div className="project-visibility-options">
                <label className={form.isPublic ? 'is-active' : ''}>
                  <input type="checkbox" checked={form.isPublic} onChange={(event) => apply('isPublic', event.target.checked)} />
                  <span><ShieldCheck size={18} /></span>
                  <div>
                    <strong>Công khai trên website</strong>
                    <small>Cho phép Project Tracker cấp dữ liệu cho các box Dự án & tiến độ.</small>
                  </div>
                </label>
                <label className={form.isFeatured ? 'is-active' : ''}>
                  <input type="checkbox" checked={form.isFeatured} onChange={(event) => apply('isFeatured', event.target.checked)} />
                  <span><Star size={18} /></span>
                  <div>
                    <strong>Dự án nổi bật</strong>
                    <small>Ưu tiên dự án này trong các danh sách công khai và dashboard.</small>
                  </div>
                </label>
              </div>

              <FormField label="Thứ tự ưu tiên hiển thị">
                <input type="number" value={form.sortOrder} onChange={(event) => apply('sortOrder', event.target.value)} />
              </FormField>

              <div className="project-source-head">
                <div>
                  <Link2 size={17} />
                  <div>
                    <h3>Nguồn tham chiếu</h3>
                    <p>Văn bản, website cơ quan, hồ sơ dự án hoặc nguồn dữ liệu dùng để kiểm chứng.</p>
                  </div>
                </div>
                <button type="button" onClick={addSource}><Plus size={15} /> Thêm nguồn</button>
              </div>

              <div className="project-source-list">
                {form.sourceUrls.map((source, index) => (
                  <div key={source._id || `source-${index}`}>
                    <input value={source.label} onChange={(event) => updateSource(index, 'label', event.target.value)} placeholder="Tên nguồn / văn bản" />
                    <input type="url" value={source.url} onChange={(event) => updateSource(index, 'url', event.target.value)} placeholder="https://..." />
                    <button type="button" onClick={() => removeSource(index)} title="Xóa nguồn"><Trash2 size={15} /></button>
                  </div>
                ))}
                {!form.sourceUrls.length ? <p>Chưa có nguồn tham chiếu.</p> : null}
              </div>
            </section>
          ) : null}

          <div className="project-workspace-savebar">
            <span>
              {creating ? 'Dự án chưa được lưu.' : `Mã ${item?.code || form.code} · ${form.milestones.length} mốc · ${(item?.updates || []).length} cập nhật`}
            </span>
            <button type="submit" className="admin-primary" disabled={saving || deleting}>
              <Save size={15} /> {saving ? 'Đang lưu…' : creating ? 'Tạo dự án' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>

        <ProjectSummary item={item} form={form} />
      </div>
    </main>
  );
}
