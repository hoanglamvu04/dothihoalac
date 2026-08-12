import { useCallback, useEffect, useState } from 'react';
import { Cloud, ExternalLink, FolderOpen, RefreshCw, Unplug } from 'lucide-react';

import Seo from '../../components/common/Seo';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function GoogleWorkspacePage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminApi.googleWorkspaceStatus());
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const connect = async () => {
    setBusy('connect');

    try {
      if (data?.sharedKthl?.available) {
        await adminApi.googleWorkspaceReuseKthl();
        await adminApi.googleWorkspaceSetup({
          year: new Date().getFullYear(),
        });
        toast.success('Đã dùng kết nối Google Workspace của Kiến Trúc Hòa Lạc và tạo kho nội dung DTHL riêng.');
        await load();
        return;
      }

      const result = await adminApi.googleWorkspaceConnectUrl();
      if (!result?.url) {
        throw new Error('Backend chưa trả về URL kết nối Google.');
      }
      window.location.assign(result.url);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const setup = async () => {
    setBusy('setup');
    try {
      await adminApi.googleWorkspaceSetup({ year: new Date().getFullYear() });
      toast.success('Đã kiểm tra và tạo cấu trúc thư mục nội dung năm hiện tại.');
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Ngắt kết nối Google Workspace khỏi Đô Thị Hòa Lạc?')) return;
    setBusy('disconnect');
    try {
      await adminApi.googleWorkspaceDisconnect();
      toast.success('Đã ngắt kết nối Google Workspace khỏi DTHL. Kết nối KTHL không bị thu hồi.');
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy('');
    }
  };

  if (loading && !data) return <LoadingBlock />;

  const connection = data?.connection;
  const configured = Boolean(data?.configured);
  const sharedKthl = data?.sharedKthl;
  const folderYears = connection?.folderYears || [];
  const currentFolders = folderYears.find((item) => item.year === new Date().getFullYear()) || folderYears[0];
  const usingKthl = connection?.credentialSource === 'kthl_shared';

  return (
    <div>
      <Seo title="Google Workspace quản trị" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Content Studio</p>
          <h1>Google Workspace</h1>
          <p>Kết nối Google Drive và Google Docs để biên tập bài theo quy trình ĐANG SOẠN → CHỜ DUYỆT → ĐÃ XUẤT BẢN như hệ thống Kiến Trúc Hòa Lạc.</p>
        </div>
        <button type="button" className="admin-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> Làm mới
        </button>
      </header>

      {!configured && !sharedKthl?.available ? (
        <div className="admin-alert error">
          Backend chưa có đủ cấu hình Google OAuth. Thiếu: {(data?.missing || []).join(', ') || 'cấu hình Google Workspace'}.
        </div>
      ) : null}

      {!connection?.connected && sharedKthl?.available ? (
        <div className="admin-alert success">
          Đã phát hiện kết nối Google Workspace đang hoạt động của Kiến Trúc Hòa Lạc ({sharedKthl.email || sharedKthl.displayName}). DTHL có thể dùng lại kết nối này mà không cần đăng nhập OAuth lần nữa.
        </div>
      ) : null}

      <div className="admin-workspace-grid">
        <section className="admin-workspace-card">
          <p className="admin-kicker">Kết nối</p>
          <h2>{connection?.connected ? 'Google Workspace đang hoạt động' : 'Chưa kết nối Google Workspace'}</h2>
          <p className="admin-muted">
            {usingKthl
              ? 'DTHL đang dùng credential Google đã được Kiến Trúc Hòa Lạc xác thực. DTHL vẫn có kho thư mục và dữ liệu bài viết riêng.'
              : 'Hệ thống chỉ yêu cầu phạm vi Drive cần cho các tài liệu do Đô Thị Hòa Lạc quản lý; refresh token được mã hóa phía server và không trả về trình duyệt.'}
          </p>

          {connection?.connected ? (
            <div className="admin-workspace-account">
              {connection.picture ? <img src={connection.picture} alt="" /> : <Cloud size={34} />}
              <div>
                <strong>{connection.displayName || connection.email}</strong>
                <small>{connection.email}</small>
                {usingKthl ? <small>Nguồn kết nối: Kiến Trúc Hòa Lạc</small> : null}
              </div>
            </div>
          ) : null}

          <div className="admin-workspace-actions">
            {!connection?.connected ? (
              <button
                type="button"
                className="admin-primary"
                onClick={connect}
                disabled={(!configured && !sharedKthl?.available) || Boolean(busy)}
              >
                <Cloud size={15} />{' '}
                {busy === 'connect'
                  ? 'Đang kết nối…'
                  : sharedKthl?.available
                    ? 'Dùng kết nối KTHL'
                    : 'Kết nối Google'}
              </button>
            ) : (
              <>
                <button type="button" className="admin-primary" onClick={setup} disabled={Boolean(busy)}>
                  <FolderOpen size={15} /> {busy === 'setup' ? 'Đang thiết lập…' : 'Thiết lập thư mục năm nay'}
                </button>
                <button type="button" className="admin-secondary" onClick={disconnect} disabled={Boolean(busy)}>
                  <Unplug size={15} /> Ngắt kết nối
                </button>
              </>
            )}
          </div>
        </section>

        <section className="admin-workspace-card">
          <p className="admin-kicker">Kho nội dung</p>
          <h2>{currentFolders ? `Thư mục năm ${currentFolders.year}` : 'Chưa thiết lập thư mục'}</h2>
          {currentFolders ? (
            <ul className="admin-folder-list">
              {[
                ['Mẫu tài liệu', currentFolders.templateFolderUrl],
                ['01 · Đang soạn', currentFolders.draftFolderUrl],
                ['02 · Chờ duyệt', currentFolders.reviewFolderUrl],
                ['03 · Đã xuất bản', currentFolders.publishedFolderUrl],
                ['99 · Lưu trữ', currentFolders.archiveFolderUrl],
              ].map(([label, url]) => url ? (
                <li key={label}>
                  <a href={url} target="_blank" rel="noreferrer">
                    <span>{label}</span>
                    <ExternalLink size={14} />
                  </a>
                </li>
              ) : null)}
            </ul>
          ) : (
            <p className="admin-muted">Sau khi kết nối, hệ thống sẽ tạo cấu trúc Drive riêng cho DTHL. Nếu dùng kết nối KTHL, credential được dùng chung nhưng thư mục DTHL không trộn với thư mục KTHL.</p>
          )}
        </section>
      </div>
    </div>
  );
}