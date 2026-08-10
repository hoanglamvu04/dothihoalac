import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
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

function scoreClass(score) {
  if (score >= 8) return 'is-high';
  if (score >= 5) return 'is-medium';
  return 'is-low';
}

function statusCount(overview, key) {
  return Number(overview?.statusCounts?.[key] || 0);
}

export default function AdminNewsroomPage() {
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [stories, setStories] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [nextOverview, nextStories] = await Promise.all([
        adminApi.newsroomOverview(),
        adminApi.newsroomStories({
          ...(status ? { status } : {}),
          ...(keyword.trim() ? { q: keyword.trim() } : {}),
          limit: 50,
        }),
      ]);
      setOverview(nextOverview);
      setStories(nextStories.items || []);
      setMeta(nextStories.meta || null);
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
    const timer = window.setInterval(() => load({ silent: true }), 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const queueCount = Number(overview?.tasks?.queued || 0) + Number(overview?.tasks?.running || 0);
  const readyCount = statusCount(overview, 'pending_review');
  const revisionCount = statusCount(overview, 'needs_revision') + statusCount(overview, 'error');

  const modelSummary = useMemo(() => {
    const values = Object.values(overview?.models || {}).filter(Boolean);
    return [...new Set(values)].join(' · ');
  }, [overview]);

  const triggerScout = async () => {
    setBusy('scout');
    try {
      await adminApi.triggerNewsroomScout();
      toast.success('Đã đưa lượt săn tin vào hàng đợi.');
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
            disabled={busy === 'scout' || !overview?.enabled || !overview?.geminiConfigured}
          >
            <Radar size={18} /> {busy === 'scout' ? 'Đang xếp hàng...' : 'Săn tin ngay'}
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
      </div>

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
                  Chưa có story phù hợp. Bấm “Săn tin ngay” để tạo lượt Scout đầu tiên.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
