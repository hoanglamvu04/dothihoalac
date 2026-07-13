import { useEffect, useState } from 'react';
import Seo from '../../components/common/Seo';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import MediaUploader from '../../components/forms/MediaUploader';
import { LoadingBlock } from '../../components/common/Loading';
import { userApi } from '../../api/user.api';
import { apiErrorMessage } from '../../api/http';
import { useAuth } from '../../context/AuthContext';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useToast } from '../../context/ToastContext';

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth(); const { areas } = useTaxonomy(); const toast = useToast();
  const [form, setForm] = useState(null); const [username, setUsername] = useState(user?.username || ''); const [loading, setLoading] = useState(false);
  useEffect(() => { userApi.myProfile().then((profile) => setForm({ displayName: user?.displayName || '', fullName: profile?.fullName || '', bio: profile?.bio || '', occupation: profile?.occupation || '', areaId: profile?.areaId?._id || '', website: profile?.website || '', publicProfile: profile?.publicProfile !== false, avatarMediaId: profile?.avatarMediaId || null, coverMediaId: profile?.coverMediaId || null })); }, [user?.displayName]);
  if (!form) return <LoadingBlock />;
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => { event.preventDefault(); setLoading(true); try { await userApi.updateProfile({ ...form, areaId: form.areaId || null, avatarMediaId: form.avatarMediaId?._id || null, coverMediaId: form.coverMediaId?._id || null }); await refreshUser(); toast.success('Đã cập nhật hồ sơ.'); } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); } };
  const changeUsername = async () => { setLoading(true); try { await userApi.changeUsername(username); await refreshUser(); toast.success('Đã đổi tên người dùng.'); } catch (error) { toast.error(apiErrorMessage(error)); } finally { setLoading(false); } };
  return <div><Seo title="Cài đặt hồ sơ" /><h2>Hồ sơ cá nhân</h2><form className="stack-form" onSubmit={save}><div className="form-grid form-grid--2"><MediaUploader label="Ảnh đại diện" value={form.avatarMediaId} onChange={(value) => change('avatarMediaId', value)} /><MediaUploader label="Ảnh bìa" value={form.coverMediaId} onChange={(value) => change('coverMediaId', value)} /></div><div className="form-grid form-grid--2"><FormField label="Tên hiển thị" required><input value={form.displayName} onChange={(event) => change('displayName', event.target.value)} required /></FormField><FormField label="Họ và tên"><input value={form.fullName} onChange={(event) => change('fullName', event.target.value)} /></FormField><FormField label="Nghề nghiệp"><input value={form.occupation} onChange={(event) => change('occupation', event.target.value)} /></FormField><FormField label="Khu vực"><select value={form.areaId} onChange={(event) => change('areaId', event.target.value)}><option value="">Chưa chọn</option>{areas.map((area) => <option key={area._id} value={area._id}>{area.name}</option>)}</select></FormField></div><FormField label="Giới thiệu"><textarea rows="5" value={form.bio} onChange={(event) => change('bio', event.target.value)} maxLength={500} /></FormField><FormField label="Website"><input type="url" value={form.website} onChange={(event) => change('website', event.target.value)} /></FormField><label className="checkbox-row"><input type="checkbox" checked={form.publicProfile} onChange={(event) => change('publicProfile', event.target.checked)} /><span>Cho phép hiển thị hồ sơ công khai.</span></label><Button type="submit" loading={loading}>Lưu hồ sơ</Button></form><hr className="section-divider" /><h2>Đổi tên người dùng</h2><div className="inline-form"><input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} /><Button variant="outline" loading={loading} onClick={changeUsername}>Đổi tên</Button></div><p className="form-note">Tên người dùng có giới hạn thời gian đổi theo cấu hình server.</p></div>;
}
