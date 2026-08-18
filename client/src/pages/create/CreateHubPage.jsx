import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FilePenLine,
  Newspaper,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';

import './CreateHubPage.css';

const options = [
  {
    to: '/studio/cong-dong',
    icon: FilePenLine,
    eyebrow: 'Cộng đồng',
    title: 'Bài viết cộng đồng',
    text: 'Thảo luận, hỏi đáp, phản ánh, chia sẻ kinh nghiệm hoặc cập nhật đời sống địa phương.',
    note: 'Tạo bản nháp trên máy chủ ngay khi bắt đầu.',
    badge: 'Content Studio',
    tone: 'community',
  },
  {
    to: '/studio/bat-dong-san',
    icon: Building2,
    eyebrow: 'Bất động sản',
    title: 'Tin bất động sản',
    text: 'Đăng bán, cho thuê, sang nhượng, cần mua hoặc cần thuê tại khu vực Hòa Lạc.',
    note: 'Quy trình 3 bước: thông tin, hình ảnh, hạng tin và gửi duyệt.',
    badge: 'Content Studio',
    tone: 'property',
  },
  {
    to: '/studio/viec-lam',
    icon: BriefcaseBusiness,
    eyebrow: 'Tuyển dụng',
    title: 'Tin việc làm',
    text: 'Tuyển nhân sự, thực tập sinh, việc làm thời vụ, sinh viên, xây dựng hoặc dịch vụ.',
    note: 'Có mẫu mô tả, quyền lợi và cách ứng tuyển để nhập nhanh.',
    badge: 'Content Studio',
    tone: 'job',
  },
  {
    to: '/gui-tin',
    icon: Newspaper,
    eyebrow: 'Ban biên tập',
    title: 'Gửi tin địa phương',
    text: 'Cung cấp sự kiện, hình ảnh, tài liệu hoặc nguồn tin để Ban biên tập kiểm tra và biên tập.',
    note: 'Đây là nguồn tin gửi tòa soạn, không phải bài tự xuất bản.',
    badge: 'Gửi biên tập',
    tone: 'editorial',
  },
];

const publishingSteps = [
  ['01', 'Chọn loại nội dung', 'Mỗi nhóm sử dụng đúng biểu mẫu và dữ liệu chuyên biệt.'],
  ['02', 'Soạn & tự lưu', 'Bản nháp có ID thật trên máy chủ; localStorage chỉ giữ bản khôi phục dự phòng.'],
  ['03', 'Xem trước', 'Kiểm tra cách nội dung hiển thị trước khi chuyển sang kiểm duyệt.'],
  ['04', 'Gửi duyệt & xuất bản', 'Quản trị viên duyệt, yêu cầu sửa hoặc từ chối; lịch sử trạng thái được giữ lại.'],
];

export default function CreateHubPage() {
  return (
    <section className="create-hub-page">
      <Seo
        title="Đăng nội dung"
        description="Tạo bài cộng đồng, tin bất động sản, việc làm hoặc gửi nguồn tin cho Ban biên tập Đô Thị Hòa Lạc."
      />

      <div className="create-hub-container">
        <header className="create-hub-hero">
          <div className="create-hub-hero__content">
            <span className="create-hub-hero__eyebrow">
              <UploadCloud size={17} />
              DTHL Content Studio
            </span>
            <h1>Bạn muốn đăng nội dung gì?</h1>
            <p>
              Chọn đúng loại nội dung. Hệ thống sẽ tạo bản nháp trên máy chủ, tự lưu khi soạn,
              cho xem trước rồi mới chuyển sang bước kiểm duyệt.
            </p>

            <div className="create-hub-hero__actions">
              <a href="#create-options" className="create-hub-primary-action">
                <Sparkles size={18} /> Chọn loại nội dung
              </a>
              <Link to="/quy-dinh-dang-bai" className="create-hub-secondary-action">
                <ShieldCheck size={18} /> Xem quy định đăng bài
              </Link>
            </div>
          </div>

          <div className="create-hub-hero__summary">
            <div className="create-hub-hero__summary-heading">
              <span><UsersRound size={23} /></span>
              <div>
                <strong>Một quy trình thống nhất</strong>
                <small>Draft → Preview → Review → Publish</small>
              </div>
            </div>
            <div className="create-hub-hero__summary-list">
              <div><CheckCircle2 size={17} /><span>URL editor dùng ID nội dung thật</span></div>
              <div><CheckCircle2 size={17} /><span>Khôi phục được sau khi tải lại hoặc đổi thiết bị</span></div>
              <div><CheckCircle2 size={17} /><span>Yêu cầu sửa của quản trị viên hiển thị ngay trong Studio</span></div>
            </div>
          </div>
        </header>

        <section id="create-options" className="create-options-section">
          <header className="create-section-heading">
            <span><FilePenLine size={22} /></span>
            <div>
              <small>Lựa chọn nội dung</small>
              <h2>Chọn nhóm phù hợp</h2>
              <p>
                Khu vực này chỉ dành cho nội dung xuất bản. Các yêu cầu tư vấn kiến trúc,
                xây dựng hoặc lưu trú được xử lý riêng tại khu vực tư vấn.
              </p>
            </div>
          </header>

          <div className="create-option-grid">
            {options.map(({ to, icon: Icon, eyebrow, title, text, note, badge, tone }) => (
              <Link key={to} to={to} className={`create-option-card create-option-card--${tone}`}>
                <div className="create-option-card__top">
                  <span className="create-option-card__icon"><Icon size={29} /></span>
                  <span className="create-option-card__badge">{badge}</span>
                </div>
                <span className="create-option-card__eyebrow">{eyebrow}</span>
                <h2>{title}</h2>
                <p>{text}</p>
                <div className="create-option-card__note">
                  <CheckCircle2 size={15} />
                  <span>{note}</span>
                </div>
                <div className="create-option-card__action">
                  <span>Tiếp tục</span>
                  <ArrowRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="create-process-section">
          <header className="create-section-heading">
            <span><ShieldCheck size={22} /></span>
            <div>
              <small>Quy trình xuất bản</small>
              <h2>Một luồng chung cho mọi nội dung</h2>
              <p>Người dùng không cần đoán mỗi loại bài hoạt động theo cách nào.</p>
            </div>
          </header>

          <div className="create-process-grid">
            {publishingSteps.map(([number, title, description]) => (
              <article key={number}>
                <div className="create-process-card__top"><span>{number}</span><CheckCircle2 size={21} /></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="create-process-section">
          <header className="create-section-heading">
            <span><BriefcaseBusiness size={22} /></span>
            <div>
              <small>Nhu cầu dịch vụ</small>
              <h2>Cần tư vấn thay vì đăng nội dung?</h2>
              <p>Yêu cầu kiến trúc, dự toán, homestay hoặc villa không đi qua hàng chờ bài viết.</p>
            </div>
          </header>
          <div className="create-hub-hero__actions">
            <Link to="/tu-van" className="create-hub-secondary-action">Mở trung tâm tư vấn <ArrowRight size={17} /></Link>
          </div>
        </section>
      </div>
    </section>
  );
}
