import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Reply,
  Send,
  Trash2,
  X,
} from 'lucide-react';

import Avatar from '../common/Avatar';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import Pagination from '../common/Pagination';
import { LoadingBlock } from '../common/Loading';
import ReportModal from './ReportModal';

import {
  commentApi,
  reactionApi,
} from '../../api/interaction.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatRelativeTime } from '../../utils/formatters';

import './CommentsSection.css';

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function profileAvatar(user) {
  return (
    user?.profile?.avatarMediaId ||
    user?.avatarMediaId ||
    null
  );
}

function displayName(user) {
  return (
    user?.displayName ||
    user?.username ||
    'Thành viên'
  );
}

function profilePath(user) {
  return user?.username
    ? `/thanh-vien/${encodeURIComponent(user.username)}`
    : '';
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Hàng đầu' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
];

export default function CommentsSection({
  contentId,
  allowComments = true,
  acceptedCommentId,
  onAcceptAnswer,
  isQuestionOwner = false,
  acceptLoadingId = '',
  variant = 'default',
  postAuthorName = '',
}) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const composerRef = useRef(null);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(
    variant === 'thread' ? 'popular' : 'oldest',
  );
  const [sortOpen, setSortOpen] = useState(false);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyLabel, setReplyLabel] = useState('');
  const [replyAnchorId, setReplyAnchorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [menuId, setMenuId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [reportTarget, setReportTarget] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await commentApi.list(contentId, {
        page,
        limit: 20,
        sort,
      });

      setItems(result.items || []);
      setMeta(result.meta || { page, totalPages: 1 });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [contentId, page, sort]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!menuId && !sortOpen) return undefined;

    const closeMenus = (event) => {
      if (event.target?.closest?.('.thread-comment__menu-wrap')) return;
      if (event.target?.closest?.('.thread-comments__sort-wrap')) return;
      setMenuId('');
      setSortOpen(false);
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuId('');
        setSortOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenus);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuId, sortOpen]);

  const updateComment = useCallback((commentId, updater) => {
    setItems((current) =>
      current.map((root) => {
        if (idOf(root) === String(commentId)) {
          return updater(root);
        }

        if (!Array.isArray(root.replies) || !root.replies.length) {
          return root;
        }

        return {
          ...root,
          replies: root.replies.map((reply) =>
            idOf(reply) === String(commentId)
              ? updater(reply)
              : reply,
          ),
        };
      }),
    );
  }, []);

  const requireLogin = useCallback(() => {
    if (isAuthenticated) return true;
    toast.info('Bạn cần đăng nhập để thực hiện thao tác này.');
    return false;
  }, [isAuthenticated, toast]);

  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        composerRef.current?.focus();
      });
    });
  }, []);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
    setReplyLabel('');
    setReplyAnchorId('');
  }, []);

  const startReply = useCallback(
    (rootComment, targetUser, anchorComment = rootComment) => {
      if (!requireLogin()) return;

      setReplyTo(rootComment);
      setReplyLabel(displayName(targetUser));
      setReplyAnchorId(idOf(anchorComment));
      setMenuId('');
      focusComposer();
    },
    [focusComposer, requireLogin],
  );

  const submit = async (event) => {
    event.preventDefault();

    if (!requireLogin()) return;
    if (!body.trim()) return;

    setSubmitting(true);

    try {
      await commentApi.create(contentId, {
        body: body.trim(),
        parentId: replyTo?._id || null,
      });

      const wasReply = Boolean(replyTo);
      setBody('');
      cancelReply();
      toast.success(wasReply ? 'Đã trả lời bình luận.' : 'Đã đăng bình luận.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (comment) => {
    if (!window.confirm('Xóa bình luận này?')) return;

    try {
      await commentApi.remove(comment._id);
      setMenuId('');
      toast.success('Đã xóa bình luận.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const beginEdit = (comment) => {
    setEditingId(idOf(comment));
    setEditBody(comment.body || '');
    setMenuId('');
  };

  const saveEdit = async (comment) => {
    const nextBody = editBody.trim();
    if (!nextBody || savingEdit) return;

    setSavingEdit(true);

    try {
      await commentApi.update(comment._id, nextBody);
      updateComment(comment._id, (current) => ({
        ...current,
        body: nextBody,
        editedAt: new Date().toISOString(),
      }));
      setEditingId('');
      setEditBody('');
      toast.success('Đã sửa bình luận.');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const react = async (comment) => {
    if (!requireLogin()) return;

    const active = Boolean(comment.viewerReaction);

    try {
      if (active) {
        await reactionApi.remove('comment', comment._id);
      } else {
        await reactionApi.put('comment', comment._id, 'like');
      }

      updateComment(comment._id, (current) => ({
        ...current,
        viewerReaction: active ? null : 'like',
        reactionCount: Math.max(
          0,
          Number(current.reactionCount || 0) + (active ? -1 : 1),
        ),
      }));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không thể cập nhật tương tác.'));
    }
  };

  const copyCommentLink = async (comment) => {
    const url = `${window.location.href.split('#')[0]}#comment-${comment._id}`;

    try {
      await navigator.clipboard.writeText(url);
      setMenuId('');
      toast.success('Đã sao chép liên kết bình luận.');
    } catch {
      toast.error('Không thể sao chép liên kết bình luận.');
    }
  };

  const renderInlineReplyComposer = (commentId) => {
    if (variant !== 'thread' || replyAnchorId !== String(commentId)) {
      return null;
    }

    return (
      <form className="thread-inline-reply-composer" onSubmit={submit}>
        <Avatar
          src={profileAvatar(user)}
          name={displayName(user)}
          size="xs"
        />

        <div className="thread-inline-reply-composer__field">
          <div className="thread-inline-reply-composer__label">
            <span>
              Trả lời <strong>{replyLabel || 'thành viên'}</strong>
            </span>
            <button
              type="button"
              aria-label="Hủy trả lời"
              onClick={cancelReply}
            >
              <X size={14} />
            </button>
          </div>

          <textarea
            ref={composerRef}
            rows="1"
            value={body}
            maxLength={5000}
            disabled={!isAuthenticated}
            placeholder={`Trả lời ${replyLabel || 'bình luận'}...`}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>

        <button
          type="submit"
          className="thread-inline-reply-composer__send"
          aria-label="Gửi trả lời"
          disabled={!isAuthenticated || !body.trim() || submitting}
        >
          <Send size={17} />
        </button>
      </form>
    );
  };

  const renderThreadComment = (
    comment,
    { isReply = false, rootComment = comment } = {},
  ) => {
    const commentId = idOf(comment);
    const author = comment.userId || {};
    const name = displayName(author);
    const href = profilePath(author);
    const isOwn = idOf(user) === idOf(author);
    const isAccepted = String(acceptedCommentId || '') === commentId;
    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    const hasReplies = !isReply && replies.length > 0;
    const isEditing = editingId === commentId;

    return (
      <article
        id={`comment-${commentId}`}
        className={[
          'thread-comment',
          isReply ? 'thread-comment--reply' : 'thread-comment--root',
          isAccepted ? 'is-accepted' : '',
          hasReplies ? 'has-replies' : '',
          replyAnchorId === commentId ? 'is-replying' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        key={commentId}
      >
        <div className="thread-comment__rail">
          <Avatar
            src={profileAvatar(author)}
            name={name}
            size={isReply ? 'xs' : 'sm'}
          />
        </div>

        <div className="thread-comment__content">
          <header className="thread-comment__header">
            <div className="thread-comment__identity">
              {href ? (
                <Link to={href}>{name}</Link>
              ) : (
                <strong>{name}</strong>
              )}

              <span>{formatRelativeTime(comment.createdAt)}</span>
              {comment.editedAt ? <span>· Đã sửa</span> : null}
              {isAccepted ? (
                <span className="thread-comment__accepted">
                  <CheckCircle2 size={14} />
                  Hữu ích
                </span>
              ) : null}
            </div>

            <div className="thread-comment__menu-wrap">
              <button
                type="button"
                className="thread-comment__menu-trigger"
                aria-label="Tùy chọn bình luận"
                aria-expanded={menuId === commentId}
                onClick={() =>
                  setMenuId((current) =>
                    current === commentId ? '' : commentId,
                  )
                }
              >
                <MoreHorizontal size={19} />
              </button>

              {menuId === commentId ? (
                <div className="thread-comment__menu" role="menu">
                  <button
                    type="button"
                    onClick={() => startReply(rootComment, author, comment)}
                  >
                    <Reply size={18} />
                    Trả lời
                  </button>

                  <button
                    type="button"
                    onClick={() => copyCommentLink(comment)}
                  >
                    <Copy size={18} />
                    Sao chép liên kết
                  </button>

                  {isOwn ? (
                    <>
                      <button
                        type="button"
                        onClick={() => beginEdit(comment)}
                      >
                        <Pencil size={18} />
                        Chỉnh sửa
                      </button>

                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => remove(comment)}
                      >
                        <Trash2 size={18} />
                        Xóa
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => {
                        setMenuId('');
                        setReportTarget(commentId);
                      }}
                    >
                      <Flag size={18} />
                      Báo cáo
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </header>

          {isEditing ? (
            <div className="thread-comment__edit">
              <textarea
                rows="3"
                value={editBody}
                maxLength={5000}
                onChange={(event) => setEditBody(event.target.value)}
              />
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId('');
                    setEditBody('');
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="is-primary"
                  disabled={!editBody.trim() || savingEdit}
                  onClick={() => saveEdit(comment)}
                >
                  {savingEdit ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          ) : (
            <p className="thread-comment__text">{comment.body}</p>
          )}

          <footer className="thread-comment__actions">
            <button
              type="button"
              className={comment.viewerReaction ? 'is-active' : ''}
              aria-label="Thích bình luận"
              onClick={() => react(comment)}
            >
              <Heart
                size={19}
                fill={comment.viewerReaction ? 'currentColor' : 'none'}
              />
              {Number(comment.reactionCount || 0) > 0 ? (
                <span>{Number(comment.reactionCount).toLocaleString('vi-VN')}</span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label="Trả lời bình luận"
              onClick={() => startReply(rootComment, author, comment)}
            >
              <MessageCircle size={19} />
              {hasReplies ? <span>{replies.length}</span> : null}
            </button>

            <button
              type="button"
              aria-label="Sao chép liên kết bình luận"
              onClick={() => copyCommentLink(comment)}
            >
              <Send size={19} />
            </button>

            {isQuestionOwner &&
            onAcceptAnswer &&
            !isAccepted &&
            !isReply ? (
              <button
                type="button"
                className="thread-comment__accept"
                disabled={String(acceptLoadingId || '') === commentId}
                onClick={() => onAcceptAnswer(comment._id)}
              >
                <CheckCircle2 size={18} />
                Chọn hữu ích
              </button>
            ) : null}
          </footer>

          {renderInlineReplyComposer(commentId)}

          {hasReplies ? (
            <div className="thread-comment__replies">
              {replies.map((reply) =>
                renderThreadComment(reply, {
                  isReply: true,
                  rootComment,
                }),
              )}
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  if (!allowComments) {
    return (
      <div className="comments-disabled">
        Bình luận đã được tắt cho nội dung này.
      </div>
    );
  }

  if (variant === 'thread') {
    const sortLabel =
      SORT_OPTIONS.find((item) => item.value === sort)?.label || 'Hàng đầu';
    const total = Number(
      meta.total ?? meta.totalItems ?? meta.totalCount ?? items.length,
    );

    return (
      <section className="comments-section comments-section--thread" id="binh-luan">
        <div className="thread-comments__toolbar">
          <div className="thread-comments__sort-wrap">
            <button
              type="button"
              className="thread-comments__sort"
              aria-expanded={sortOpen}
              onClick={() => setSortOpen((value) => !value)}
            >
              {sortLabel}
              <ChevronDown size={16} />
            </button>

            {sortOpen ? (
              <div className="thread-comments__sort-menu">
                {SORT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={sort === option.value ? 'is-active' : ''}
                    onClick={() => {
                      setSort(option.value);
                      setPage(1);
                      setSortOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <span>{total.toLocaleString('vi-VN')} phản hồi</span>
        </div>

        {!replyTo ? (
          <form className="thread-comment-composer" onSubmit={submit}>
            <Avatar
              src={profileAvatar(user)}
              name={displayName(user)}
              size="sm"
            />

            <div className="thread-comment-composer__field">
              <textarea
                ref={composerRef}
                rows="1"
                value={body}
                maxLength={5000}
                disabled={!isAuthenticated}
                placeholder={
                  isAuthenticated
                    ? `Trả lời ${postAuthorName || 'bài viết'}...`
                    : 'Đăng nhập để trả lời'
                }
                onChange={(event) => setBody(event.target.value)}
              />
            </div>

            <button
              type="submit"
              className="thread-comment-composer__send"
              aria-label="Đăng phản hồi"
              disabled={!isAuthenticated || !body.trim() || submitting}
            >
              <Send size={19} />
            </button>
          </form>
        ) : null}

        {loading ? (
          <div className="thread-comments__state">
            <LoadingBlock />
          </div>
        ) : error ? (
          <div className="thread-comments__state">
            <ErrorState error={error} onRetry={load} compact />
          </div>
        ) : items.length === 0 ? (
          <div className="thread-comments__empty">
            <MessageCircle size={25} />
            <strong>Chưa có phản hồi</strong>
            <span>Hãy là người đầu tiên tham gia cuộc trò chuyện.</span>
          </div>
        ) : (
          <div className="thread-comment-list">
            {items.map((comment) => renderThreadComment(comment))}
          </div>
        )}

        {Number(meta.totalPages || 1) > 1 ? (
          <div className="thread-comments__pagination">
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        ) : null}

        <ReportModal
          open={Boolean(reportTarget)}
          onClose={() => setReportTarget('')}
          targetType="comment"
          targetId={reportTarget}
        />
      </section>
    );
  }

  return (
    <section className="comments-section" id="binh-luan">
      <h2>
        <MessageCircle size={22} /> Bình luận
      </h2>

      <form className="comment-form" onSubmit={submit}>
        {replyTo ? (
          <div className="replying-to">
            Đang trả lời <strong>{replyLabel || 'thành viên'}</strong>
            <button type="button" onClick={cancelReply}>
              Hủy
            </button>
          </div>
        ) : null}

        <textarea
          rows="3"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            isAuthenticated
              ? 'Chia sẻ ý kiến của bạn...'
              : 'Đăng nhập để bình luận'
          }
          disabled={!isAuthenticated}
          maxLength={5000}
        />

        <div>
          <small>{body.length}/5000</small>
          <Button
            type="submit"
            size="sm"
            loading={submitting}
            disabled={!isAuthenticated || !body.trim()}
          >
            Đăng bình luận
          </Button>
        </div>
      </form>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={load} compact />
      ) : items.length === 0 ? (
        <EmptyState
          title="Chưa có bình luận"
          description="Hãy là người đầu tiên chia sẻ ý kiến."
        />
      ) : (
        <div className="comment-list">
          {items.map((comment) => {
            const isAccepted =
              String(acceptedCommentId || '') === String(comment._id);
            const author = comment.userId || {};
            const name = displayName(author);

            return (
              <article
                className={`comment ${isAccepted ? 'comment--accepted' : ''}`}
                key={comment._id}
              >
                <Avatar
                  src={profileAvatar(author)}
                  name={name}
                  size="sm"
                />

                <div className="comment__body">
                  <header>
                    <strong>{name}</strong>
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                    {isAccepted ? <b>Câu trả lời được chọn</b> : null}
                  </header>
                  <p>{comment.body}</p>
                  <footer>
                    <button
                      type="button"
                      onClick={() => startReply(comment, author, comment)}
                    >
                      <Reply size={15} /> Trả lời
                    </button>
                    {isQuestionOwner && onAcceptAnswer && !isAccepted ? (
                      <button
                        type="button"
                        onClick={() => onAcceptAnswer(comment._id)}
                      >
                        Chọn câu trả lời
                      </button>
                    ) : null}
                    {idOf(user) === idOf(author) ? (
                      <button type="button" onClick={() => remove(comment)}>
                        <Trash2 size={15} /> Xóa
                      </button>
                    ) : null}
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination meta={meta} onPageChange={setPage} />
    </section>
  );
}
