import { useEffect, useState } from 'react';
import Seo from '../../components/common/Seo';
import { LoadingBlock } from '../../components/common/Loading';
import { adminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export default function AdminSecurityPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    adminApi.securitySessions()
      .then(setSessions)
      .catch((error) => toast.error(apiErrorMessage(error)));
  }, []);

  return (
    <div>
      <Seo title="Security Center" />
      <header className="admin-page-head">
        <div>
          <p className="admin-kicker">Security Operations</p>
          <h1>Security Center</h1>
          <p>Theo dõi phiên đăng nhập, thiết bị và hoạt động bảo mật.</p>
        </div>
      </header>
      {!sessions ? <LoadingBlock /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>User</th><th>Device</th><th>IP</th><th>Last active</th></tr></thead>
            <tbody>
              {(sessions.items || []).map((item) => (
                <tr key={item._id}>
                  <td>{item.userId?.email || '-'}</td>
                  <td>{item.device || '-'}</td>
                  <td>{item.ip || '-'}</td>
                  <td>{item.updatedAt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
