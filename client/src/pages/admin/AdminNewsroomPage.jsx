import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Play,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

import { adminApi } from '../../api/admin.api';
import { useToast } from '../../context/ToastContext';
import { apiErrorMessage } from '../../api/http';
import './AdminNewsroomPage.css';

const STATUS_LABELS = {
  discovered: 'Mới phát hiện',
  researching: 'Đang nghiên cứu',
  researched: 'Đã nghiên cứu',
  monitor: 'Theo dõi',
  ignored: 'Bỏ qua',
  writing: 'Đang viết',
  drafted: 'Đã viết nháp',
  fact_check: 'Fact check',
  needs_revision: 'Cần sửa',
  pending_review: 'Chờ duyệt',
  published: 'Đã xuất bản',
  error: 'Lỗi',
};

const TASK_LABELS = {
  SCOUT: 'Săn tin · Google Search',
  RESEARCH: 'Nghiên cứu · Search + URL Context',
  EDITOR: 'Tổng biên tập AI',
  WRITE: 'Phóng viên AI',
  FACT_CHECK: 'Fact check AI',
  CREATE_PENDING_REVIEW: 'Tạo bài chờ duyệt',
};

const TASK_STATUS_LABELS = {
  queued: 'Đang chờ worker',
  running: 'Đang xử lý',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
};

function scoreClass(score) {
  if (score >= 8) return 'is-high';
  if (score >= 5) return 'is-medium';
  return 'is-low';
}

function statusCount(overview, key) {
  return Number(overview?.statusCounts?.[key] || 0);
}

function elapsedLabel(task) {
  const startRaw = task?.lockedAt || task?.createdAt;
  if (!startRaw) return '—';

  const start = new Date(startRaw).getTime();
  const end = task?.finishedAt
    ? new Date(task.finishedAt).getTime()
    : Date.now();

  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  if (seconds < 60) return `${seconds} giây`;

  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  if (minutes < 60) return `${minutes} phút ${remain} giây`;

  const hours = Math.floor(minutes / 60);
  return `${hours} giờ ${minutes % 60} phút`;
}

function taskResultSummary(task) {
  const result = task?.result;
  if (!result || typeof result !== 'object') return '';

  if (task.type === 'SCOUT') {
    return [
      `${Number(result.candidates || 0)} candidate`,
      `${Number(result.stories || 0)} story`,
      `${Number(result.researchQueued || 0)} đưa vào nghiên cứu`,
    ].join(' · ');
  }

  if (task.type === 'EDITOR') {
    return [result.decision, result.reason].filter(Boolean).join(' · ');
  }

  if (task.type === 'WRITE') {
    return result.title || '';
  }

  if (task.type === 'FACT_CHECK') {
    return [
      result.STATUS,
      result.FACT_SCORE !== undefined ? `Fact ${result.FACT_SCORE}` : '',
      result.ORIGINALITY_SCORE !== undefined ? `Originality ${result.ORIGINALITY_SCORE}` : '',
      result.EDITORIAL_SCORE !== undefined ? `Editorial ${result.EDITORIAL_SCORE}` : '',
    ].filter(Boolean).join(' · ');
  }

  if (task.type === 'CREATE_PENDING_REVIEW') {
    return result.contentId
      ? `CMS ${result.contentId} · ${result.status || 'pending_review'}`
      : '';
  }

  return [result.storyCode, result.status].filter(Boolean).join(' · ');
}

function runningDescription(task) {
  if (!task) return '';

  if (task.status === 'queued') {
    return 'Task đã nằm trong MongoDB và đang chờ worker backend nhận. Bình thường worker nhận trong vài giây.';
  }

  switch (task.type) {
    case 'SCOUT':
      return 'Gemini đang chạy các truy vấn Google Search và sau đó gom/chống trùng candidate. Bước này thường lâu nhất của lượt săn tin.';
    case 'RESEARCH':
      return 'Gemini đang đọc sâu story bằng Google Search và URL Context để tạo Research Packet.';
    case 'EDITOR':
      return 'Tổng biên tập AI đang quyết định IGNORE / MONITOR / WRITE và tạo Article Brief.';
    case 'WRITE':
      return 'Phóng viên AI đang viết draft từ Research Packet và Article Brief.';
    case 'FACT_CHECK':
      return 'AI đang đối chiếu lại nguồn, dữ kiện, logic và tính nguyên bản trước khi chuyển bài sang chờ duyệt.';
    case 'CREATE_PENDING_REVIEW':
      return 'Backend đang tạo bài pending_review trong CMS DTHL.';
    default:
      return 'Worker backend đang xử lý task Newsroom AI.';
  }
}

export default function AdminNewsroomPage() {
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [stories, setStories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [nextOverview, nextStories, nextTasks] = await Promise.all([
        adminApi.newsroomOverview(),
        adminApi.newsroomStories({
          ...(status ? { status } : {}),
          ...(keyword.trim() ? { q: keyword.trim() } : {}),
          limit: 50,
        }),
        adminApi.newsroomTasks({ limit: 12 }),
      ]);
      setOverview(nextOverview);
      setStories(nextStories.items || []);
      setMeta(nextStories.meta || null);
      setTasks(nextTasks.items || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không tải được Newsroom AI.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [keyword, status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), 3000);
    return () => window.clearInterval(timer);
  }, [load]);

  const queueCount = Number(overview?.tasks?.queued || 0) + Number(overview?.tasks?.running || 0);
  const readyCount = statusCount(overview, 'pending_review');
  const revisionCount = statusCount(overview, 'needs_revision') + statusCount(overview, 'error');

  const modelSummary = useMemo(() => {
    const values = Object.values(overview?.models || {}).filter(Boolean);
    return [...new Set(values)].join(' · ');
  }, [overview]);

  const activeTasks = useMemo(
    () => tasks.filter((task) => ['queued', 'running'].includes(task.status)),
    [tasks],
  );

  const activeTask = useMemo(
    () => activeTasks.find((task) => task.status === 'running') || activeTasks[0] || null,
    [activeTasks],
  );

  const hasActiveScout = activeTasks.some((task) => task.type === 'SCOUT');

  const queuedTooLong = Boolean(
    activeTask?.status === 'queued' &&
    activeTask?.createdAt &&
    Date.now() - new Date(activeTask.createdAt).getTime() > 30000,
  );

  const triggerScout = async () => {
    setBusy('scout');
    try {
      await adminApi.triggerNewsroomScout();
      toast.success('Đã đưa lượt săn tin vào hàng đợi. Newsroom sẽ tự chạy ở backend.');
      await load({ silent: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không khởi động được lượt săn tin.'));
    } finally {
      setBusy('');
    }
  };

  const runStory = async (story) => {
    setBusy(String(story._id));
    try {
      await adminApi.runNewsroomStory(story._id);
      toast.success('Đã đưa bước tiếp theo vào hàng đợi.');
      await load({ silent: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không chạy tiếp được story.'));
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="newsroom-admin">
      <header className="newsroom-admin__header">
        <div>
          <span className="newsroom-admin__eyebrow"><Sparkles size={15} /> NEWSROOM AI · GEMINI</span>
          <h1>Săn tin & biên tập AI</h1>
          <p>
            Google Search → Scout → Research + URL Context → Tổng biên tập → Writer → Fact Check → bài chờ duyệt.
          </p>
        </div>
        <div className="newsroom-admin__actions">
          <button type="button" className="newsroom-btn newsroom-btn--ghost" onClick={() => load()} disabled={loading}>
            <RefreshCw size={17} /> Làm mới
          </button>
          <button
            type="button"
            className="newsroom-btn newsroom-btn--primary"
            onClick={triggerScout}
            disabled={busy === 'scout' || hasActiveScout || !overview?.enabled || !overview?.geminiConfigured}
          >
            <Radar size={18} />
            {hasActiveScout
              ? 'Scout đang chạy...'
              : busy === 'scout'
                ? 'Đang xếp hàng...'
                : 'Săn tin ngay'}
          </button>
        </div>
      </header>

      {!overview?.geminiConfigured || !overview?.enabled ? (
        <div className="newsroom-admin__notice">
          <Bot size={20} />
          <div>
            <strong>Newsroom AI chưa chạy.</strong>
            <span>
              Backend cần GEMINI_API_KEY và NEWSROOM_AI_ENABLED=true. API key chỉ đặt trong server/.env, không đưa sang frontend.
            </span>
          </div>
        </div>
      ) : null}

      <div className="newsroom-admin__stats">
        <article><span>Story đã phát hiện</span><strong>{meta?.total ?? stories.length}</strong></article>
        <article><span>Đang chạy / chờ</span><strong>{queueCount}</strong></article>
        <article><span>Chờ con người duyệt</span><strong>{readyCount}</strong></article>
        <article><span>Cần xử lý lại</span><strong>{revisionCount}</strong></article>
      </div>

      <div className="newsroom-admin__configline">
        <span>Scout mỗi {overview?.scoutIntervalMinutes || '—'} phút</span>
        <span>Worker {overview?.workerIntervalSeconds || '—'} giây</span>
        <span title={modelSummary}>Model: {modelSummary || '—'}</span>
        <span>Tự cập nhật tiến trình mỗi 3 giây</span>
      </div>

      <section className="newsroom-task-monitor">
        <div className="newsroom-task-monitor__head">
          <div>
            <span>TIẾN TRÌNH BACKEND</span>
            <strong>{activeTask ? TASK_LABELS[activeTask.type] || activeTask.type : 'Không có task đang chạy'}</strong>
          </div>
          {activeTask ? (
            <span className={`newsroom-task-status is-${activeTask.status}`}>
              {TASK_STATUS_LABELS[activeTask.status] || activeTask.status}
            </span>
          ) : (
            <span className="newsroom-task-status is-idle">Rảnh</span>
          )}
        </div>

        {activeTask ? (
          <div className="newsroom-task-monitor__active">
            <div className="newsroom-task-monitor__copy">
              <p>{runningDescription(activeTask)}</p>
              <span>
                <Clock3 size={14} /> {elapsedLabel(activeTask)} · lần thử {activeTask.attempts || 0}/{activeTask.maxAttempts || 3}
              </span>
              {queuedTooLong ? (
                <div className="newsroom-task-monitor__warning">
                  <AlertTriangle size={15} />
                  Task đã chờ hơn 30 giây mà chưa được worker nhận. Sau khi pull bản mới hãy restart backend để worker Newsroom khởi động với ENV hiện tại.
                </div>
              ) : null}
            </div>
            <div className={`newsroom-task-progress is-${activeTask.status}`} aria-label={TASK_STATUS_LABELS[activeTask.status]}>
              <i />
            </div>
          </div>
        ) : (
          <p className="newsroom-task-monitor__idle">
            Worker không có task đang chạy. Bấm “Săn tin ngay” để tạo một lượt Scout mới.
          </p>
        )}

        <div className="newsroom-task-history">
          {tasks.slice(0, 6).map((task) => (
            <article key={task._id} className={`is-${task.status}`}>
              <div>
                <strong>{TASK_LABELS[task.type] || task.type}</strong>
                <span>{TASK_STATUS_LABELS[task.status] || task.status} · {elapsedLabel(task)}</span>
              </div>
              <p>
                {task.error
                  ? task.error
                  : taskResultSummary(task) || (task.status === 'running' ? runningDescription(task) : 'Chưa có kết quả.')}
              </p>
            </article>
          ))}
          {!tasks.length ? <span className="newsroom-muted">Chưa có lịch sử task.</span> : null}
        </div>
      </section>

      <div className="newsroom-admin__toolbar">
        <div className="newsroom-admin__filters">
          {[
            ['', 'Tất cả'],
            ['discovered', 'Mới'],
            ['researching', 'Nghiên cứu'],
            ['writing', 'Đang viết'],
            ['fact_check', 'Fact check'],
            ['pending_review', 'Chờ duyệt'],
            ['needs_revision', 'Cần sửa'],
            ['monitor', 'Theo dõi'],
          ].map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              className={status === value ? 'is-active' : ''}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="newsroom-admin__search">
          <Search size={17} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm story, địa điểm, mã AI..."
          />
        </label>
      </div>

      <div className="newsroom-admin__table-wrap">
        <table className="newsroom-admin__table">
          <thead>
            <tr>
              <th>Story</th>
              <th>Điểm</th>
              <th>Nguồn</th>
              <th>AI quyết định</th>
              <th>Trạng thái</th>
              <th>Website</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => (
              <tr key={story._id}>
                <td className="newsroom-story-cell">
                  <small>{story.storyCode}</small>
                  <strong>{story.headline}</strong>
                  <p>{story.eventSummary || story.whyItMatters || 'Chưa có tóm tắt.'}</p>
                  <span>{story.location || 'Chưa rõ địa điểm'}</span>
                </td>
                <td>
                  <div className={`newsroom-score ${scoreClass(story.freshnessScore)}`}>
                    <b>{story.freshnessScore ?? 0}</b><span>Mới</span>
                  </div>
                  <div className={`newsroom-score ${scoreClass(story.importanceScore)}`}>
                    <b>{story.importanceScore ?? 0}</b><span>Quan trọng</span>
                  </div>
                </td>
                <td>
                  <strong>{story.sources?.length || 0}</strong>
                  <span className="newsroom-muted"> nguồn</span>
                </td>
                <td>
                  <span className={`newsroom-decision is-${String(story.editorDecision || story.recommendation || 'monitor').toLowerCase()}`}>
                    {story.editorDecision || story.recommendation || 'MONITOR'}
                  </span>
                </td>
                <td>
                  <span className={`newsroom-status is-${story.status}`}>
                    {STATUS_LABELS[story.status] || story.status}
                  </span>
                  {story.factCheck ? (
                    <small className="newsroom-fact-scores">
                      F {story.factCheck.FACT_SCORE ?? '—'} · O {story.factCheck.ORIGINALITY_SCORE ?? '—'} · E {story.factCheck.EDITORIAL_SCORE ?? '—'}
                    </small>
                  ) : null}
                </td>
                <td>
                  {story.cmsContentId ? (
                    <a
                      href={`/quan-tri/bai-viet/${story.cmsContentId}/sua`}
                      target="_blank"
                      rel="noreferrer"
                      className="newsroom-link"
                    >
                      <CheckCircle2 size={15} /> pending_review <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span className="newsroom-muted">Chưa tạo bài</span>
                  )}
                </td>
                <td>
                  {!story.cmsContentId && !['ignored'].includes(story.status) ? (
                    <button
                      type="button"
                      className="newsroom-run-btn"
                      onClick={() => runStory(story)}
                      disabled={busy === String(story._id)}
                    >
                      <Play size={15} /> {busy === String(story._id) ? 'Đang xếp...' : 'Chạy tiếp'}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}

            {!loading && !stories.length ? (
              <tr>
                <td colSpan="7" className="newsroom-admin__empty">
                  Chưa có story phù hợp. Nếu Scout đang chạy, story sẽ tự xuất hiện ở đây ngay sau khi Gemini hoàn tất bước gom/chống trùng.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
