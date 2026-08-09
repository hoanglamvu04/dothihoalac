import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  CloudCog,
  ExternalLink,
  FolderKanban,
  Link2,
  RefreshCw,
  Unplug,
} from 'lucide-react';
import Seo from '../../components/common/Seo';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

const currentYear = new Date().getFullYear();

const folderLabels = {
  yearFolderId: 'Thư mục năm',
  templateFolderId: '00_MẪU',
  draftFolderId: '01_ĐANG_SOẠN',
  reviewFolderId: '02_CHỜ_DUYỆT',
  publishedFolderId: '03_ĐÃ_XUẤT_BẢN',
  archiveFolderId: '99_LƯU_TRỮ',
};

export default function GoogleWorkspacePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [status, setStatus] = useState(null);
  const [folders, setFolders] = useState(null);
  const [year, setYear] = useState(currentYear);

  const loadStatus = useCallback(async () => {
    const result = await adminApi.googleWorkspaceStatus();
    setStatus(result);
    const suggestedYear = result?.connection?.folderYears?.[0]?.year || currentYear;
    setYear((value) => value || suggestedYear);
    return result;
  }, []);

  const loadFolders = useCallback(async (selectedYear = year) => {
    const result = await adminApi.googleWorkspaceFolders(selectedYear);
    setFolders(result);
    return result;
  }, [year]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const result = await loadStatus();
        if (active && result?.connected) {
          await loadFolders(result?.connection?.folderYears?.[0]?.year || currentYear).catch(() => null);
        }
      } catch (error) {
        if (active) toast.error(apiErrorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadFolders, loadStatus, toast]);

  const connect = async () => {
    setWorking('connect');
    try {
      const result = await adminApi.connectGoogleWorkspace();
      if (!result?.authorizationUrl) throw new Error('Backend chưa trả về đường dẫn Google OAuth.');
      window.location.href = result.authorizationUrl;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setWorking('');
    }
  };

  const setup = async () => {
    setWorking('setup');
    try {
      const result = await adminApi.setupGoogleWorkspace(year);
      setFolders(result);
      await loadStatus();
      toast.success(`Đã chuẩn bị kho Google Drive cho năm ${year}.`);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setWorking('');
    }
  };

  const refresh = async () => {
    setWorking('refresh');
    try {
      const result = await loadStatus();
      if (result?.connected) await loadFolders(year).catch(() => null);
      toast.success('Đã kiểm tra lại Google Workspace.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setWorking('');
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Ngắt kết nối Google Workspace khỏi Đô Thị Hòa Lạc? Tài liệu trên Drive sẽ không bị xóa.')) return;
    setWorking('disconnect');
    try {
      await adminApi.disconnectGoogleWorkspace();
      setFolders(null);
      await loadStatus();
      toast.success('Đã ngắt kết nối Google Workspace.');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setWorking('');
    }
  };

  if (loading) {
    return (
      <div className="admin-workspace-card">
        <p className="admin-editor-kicker">Google Workspace</p>
        <h1>Đang kiểm tra kết nối…</h1>
      </div>
    );
  }

  const configured = Boolean(status?.configured);
  const connected = Boolean(status?.connected);
  const connection = status?.connection || {};
  const folderData = folders?.folders || folders || {};

  return (
    <section>
      <Seo title="Google Workspace · Quản trị" />

      <div className="admin-articles-hero">
        <div>
          <small>KTHL technology · DTHL Content Studio</small>
          <h1>Google Docs trở thành phòng soạn bài chính.</h1>
          <p>
            Kết nối tài khoản Google Workspace, tự tạo kho nội dung theo năm và mở từng bài viết bằng Google Docs. Khi biên tập xong, Admin có thể đồng bộ nội dung về website rồi duyệt hoặc xuất bản.
          </p>
        </div>
        <div className="admin-articles-actions">
          <button type="button" className="admin-action-secondary" onClick={refresh} disabled={Boolean(working)}>
            <RefreshCw size={15} /> Kiểm tra lại
          </button>
          {!connected ? (
            <button type="button" className="admin-action-primary" onClick={connect} disabled={!configured || Boolean(working)}>
              <Link2 size={15} /> Kết nối Google
            </button>
          ) : (
            <button type="button" className="admin-action-secondary" onClick={disconnect} disabled={Boolean(working)}>
              <Unplug size={15} /> Ngắt kết nối
            </button>
          )}
        </div>
      </div>

      <div className="admin-workspace-grid">
        <article className="admin-workspace-card">
          <p className="admin-editor-kicker">01 · Kết nối tài khoản</p>
          <h2>Trạng thái Google Workspace</h2>
          <p className="form-note">
            Hệ thống dùng OAuth 2.0 và chỉ lưu refresh token đã mã hóa ở server. Token không được trả về trình duyệt.
          </p>

          {!configured ? (
            <div className="alert alert--warning">
              Backend chưa đủ biến môi trường Google OAuth. Hãy cấu hình các biến GOOGLE_* trong server rồi tải lại trang.
            </div>
          ) : connected ? (
            <div className="admin-workspace-account">
              {connection.picture ? (
                <img src={connection.picture} alt="" />
              ) : (
                <span className="admin-workspace-account-placeholder">G</span>
              )}
              <div>
                <strong>{connection.displayName || 'Google Workspace'}</strong>
                <div className="form-note">{connection.email}</div>
                <div className="admin-doc-state is-linked"><CheckCircle2 size={12} /> Đã kết nối</div>
              </div>
            </div>
          ) : (
            <div className="admin-workspace-account">
              <span className="admin-workspace-account-placeholder">G</span>
              <div>
                <strong>Chưa kết nối tài khoản Google</strong>
                <div className="form-note">Bấm “Kết nối Google” để cấp quyền tạo và đọc tài liệu do DTHL Content Studio quản lý.</div>
              </div>
            </div>
          )}
        </article>

        <article className="admin-workspace-card admin-workspace-card--dark">
          <p className="admin-editor-kicker" style={{ color: '#86efac' }}>02 · Quy trình biên tập</p>
          <h2>Drive được tổ chức như một newsroom.</h2>
          <p style={{ color: 'rgba(255,255,255,.62)', lineHeight: 1.7 }}>
            Mỗi năm có các vùng Mẫu → Đang soạn → Chờ duyệt → Đã xuất bản → Lưu trữ. Bài viết được gắn mã DTHL để liên kết ổn định giữa MongoDB và Google Drive.
          </p>
          <div className="admin-google-badge"><CloudCog size={13} /> DTHL Content Studio</div>
        </article>
      </div>

      <article className="admin-workspace-card" style={{ marginTop: 18 }}>
        <div className="panel-heading">
          <div>
            <p className="admin-editor-kicker">03 · Kho nội dung</p>
            <h2>Cấu trúc Google Drive theo năm</h2>
          </div>
          <div className="admin-articles-actions">
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button type="button" className="admin-action-primary" onClick={setup} disabled={!connected || Boolean(working)}>
              <FolderKanban size={15} /> Chuẩn bị thư mục
            </button>
          </div>
        </div>

        {connected ? (
          <div className="admin-workspace-folder-list">
            <div className="admin-workspace-folder">
              <span>Kho gốc</span>
              <strong>{connection.rootFolderName || 'DTHL - NỘI DUNG WEBSITE'}</strong>
            </div>
            {Object.entries(folderLabels).map(([key, label]) => (
              <div key={key} className="admin-workspace-folder">
                <span>{label}</span>
                <strong>{folderData[key] || 'Chưa tạo / chưa đồng bộ'}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="form-note">Kết nối Google Workspace trước khi tạo cấu trúc thư mục.</p>
        )}

        {connection.rootFolderId && (
          <a
            className="admin-action-secondary"
            style={{ marginTop: 14 }}
            href={`https://drive.google.com/drive/folders/${connection.rootFolderId}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} /> Mở kho nội dung trên Drive
          </a>
        )}
      </article>
    </section>
  );
}
