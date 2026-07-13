import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Reply, Trash2 } from 'lucide-react';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import Pagination from '../common/Pagination';
import { LoadingBlock } from '../common/Loading';
import { commentApi } from '../../api/interaction.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatRelativeTime } from '../../utils/formatters';

export default function CommentsSection({ contentId, allowComments = true, acceptedCommentId, onAcceptAnswer, isQuestionOwner = false }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await commentApi.list(contentId, { page, limit: 20, sort: 'oldest' });
      setItems(result.items || []);
      setMeta(result.meta || { page, totalPages: 1 });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [contentId, page]);

  useEffect(() => { load(); }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) return toast.info('Bạn cần đăng nhập để bình luận.');
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await commentApi.create(contentId, { body: body.trim(), parentId: replyTo?._id || null });
      setBody('');
      setReplyTo(null);
      toast.success('Đã đăng bình luận.');
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
      toast.success('Đã xóa bình luận.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (!allowComments) return <div className="comments-disabled">Bình luận đã được tắt cho nội dung này.</div>;

  return (
    <section className="comments-section" id="binh-luan">
      <h2><MessageCircle size={22} /> Bình luận</h2>
      <form className="comment-form" onSubmit={submit}>
        {replyTo ? <div className="replying-to">Đang trả lời <strong>{replyTo.userId?.displayName || 'thành viên'}</strong><button type="button" onClick={() => setReplyTo(null)}>Hủy</button></div> : null}
        <textarea rows="3" value={body} onChange={(event) => setBody(event.target.value)} placeholder={isAuthenticated ? 'Chia sẻ ý kiến của bạn...' : 'Đăng nhập để bình luận'} disabled={!isAuthenticated} maxLength={5000} />
        <div><small>{body.length}/5000</small><Button type="submit" size="sm" loading={submitting} disabled={!isAuthenticated || !body.trim()}>Đăng bình luận</Button></div>
      </form>
      {loading ? <LoadingBlock /> : error ? <ErrorState error={error} onRetry={load} compact /> : items.length === 0 ? <EmptyState title="Chưa có bình luận" description="Hãy là người đầu tiên chia sẻ ý kiến." /> : (
        <div className="comment-list">
          {items.map((comment) => {
            const isAccepted = String(acceptedCommentId || '') === String(comment._id);
            return (
              <article className={`comment ${isAccepted ? 'comment--accepted' : ''}`} key={comment._id}>
                <Avatar name={comment.userId?.displayName} size="sm" />
                <div className="comment__body">
                  <header><strong>{comment.userId?.displayName || 'Thành viên'}</strong><span>{formatRelativeTime(comment.createdAt)}</span>{isAccepted ? <b>Câu trả lời được chọn</b> : null}</header>
                  <p>{comment.body}</p>
                  <footer>
                    <button type="button" onClick={() => setReplyTo(comment)}><Reply size={15} /> Trả lời</button>
                    {isQuestionOwner && onAcceptAnswer && !isAccepted ? <button type="button" onClick={() => onAcceptAnswer(comment._id)}>Chọn câu trả lời</button> : null}
                    {String(user?.id) === String(comment.userId?._id || comment.userId) ? <button type="button" onClick={() => remove(comment)}><Trash2 size={15} /> Xóa</button> : null}
                  </footer>
                  {comment.replies?.length ? <div className="comment-replies">{comment.replies.map((reply) => <article className="comment comment--reply" key={reply._id}><Avatar name={reply.userId?.displayName} size="xs" /><div className="comment__body"><header><strong>{reply.userId?.displayName || 'Thành viên'}</strong><span>{formatRelativeTime(reply.createdAt)}</span></header><p>{reply.body}</p></div></article>)}</div> : null}
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
