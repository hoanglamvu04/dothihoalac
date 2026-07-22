import { Link } from 'react-router-dom';

import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  FilePenLine,
  FileText,
  Home,
  ImagePlus,
  MessageCircle,
  Newspaper,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';

import './CreateHubPage.css';

const options = [
  {
    to: '/dang-bai/cong-dong',
    icon: FilePenLine,
    eyebrow: 'Cộng đồng',
    title: 'Bài viết cộng đồng',
    text:
      'Thảo luận, hỏi đáp, phản ánh, chia sẻ kinh nghiệm hoặc đánh giá địa phương.',
    note:
      'Phù hợp với nội dung trao đổi giữa các thành viên.',
    badge: 'Tự đăng',
    tone: 'community',
  },
  {
    to: '/dang-bai/nha-dat',
    icon: Building2,
    eyebrow: 'Bất động sản',
    title: 'Tin bất động sản',
    text:
      'Đăng tin bán, cho thuê, sang nhượng, cần mua hoặc cần thuê tại Hòa Lạc.',
    note:
      'Cần chuẩn bị giá, diện tích, vị trí và thông tin pháp lý.',
    badge: 'Tự đăng',
    tone: 'property',
  },
  {
    to: '/dang-bai/viec-lam',
    icon: BriefcaseBusiness,
    eyebrow: 'Tuyển dụng',
    title: 'Tin việc làm',
    text:
      'Tuyển dụng nhân sự, thực tập sinh, việc làm thời vụ hoặc việc làm sinh viên.',
    note:
      'Cần có mô tả công việc, địa điểm và cách ứng tuyển.',
    badge: 'Tự đăng',
    tone: 'job',
  },
  {
    to: '/gui-tin',
    icon: Newspaper,
    eyebrow: 'Ban biên tập',
    title: 'Gửi tin địa phương',
    text:
      'Cung cấp sự kiện, hình ảnh, tài liệu hoặc nguồn tin liên quan đến Hòa Lạc.',
    note:
      'Ban biên tập sẽ kiểm tra và biên tập trước khi xuất bản.',
    badge: 'Gửi duyệt',
    tone: 'editorial',
  },
  {
    to: '/tu-van?type=architecture_design',
    icon: Home,
    eyebrow: 'Kiến trúc và xây dựng',
    title: 'Yêu cầu tư vấn kiến trúc',
    text:
      'Tư vấn thiết kế, thi công, cải tạo công trình hoặc ước tính chi phí sơ bộ.',
    note:
      'Yêu cầu được chuyển tới đơn vị phù hợp trong hệ sinh thái XSpace.',
    badge: 'Tư vấn',
    tone: 'architecture',
  },
  {
    to: '/tu-van?type=homestay_search',
    icon: Send,
    eyebrow: 'Lưu trú',
    title: 'Tìm homestay hoặc villa',
    text:
      'Gửi nhu cầu thuê homestay, villa nghỉ dưỡng hoặc địa điểm tổ chức sự kiện.',
    note:
      'Nhu cầu phù hợp sẽ được chuyển tới Mely Space.',
    badge: 'Tư vấn',
    tone: 'homestay',
  },
];

const publishingSteps = [
  {
    number: '01',
    icon: FileText,
    title: 'Chọn loại nội dung',
    description:
      'Chọn đúng nhóm để hệ thống hiển thị biểu mẫu và trường dữ liệu phù hợp.',
  },
  {
    number: '02',
    icon: ImagePlus,
    title: 'Điền thông tin',
    description:
      'Cung cấp tiêu đề, mô tả, hình ảnh, khu vực và thông tin liên hệ cần thiết.',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Kiểm tra và gửi',
    description:
      'Rà soát nội dung, xác nhận thông tin chính xác rồi gửi lên hệ thống.',
  },
  {
    number: '04',
    icon: CheckCircle2,
    title: 'Kiểm duyệt và xuất bản',
    description:
      'Nội dung được kiểm tra trước khi hiển thị công khai trên website.',
  },
];

const postingNotes = [
  'Tiêu đề cần phản ánh đúng nội dung, không viết hoa toàn bộ.',
  'Hình ảnh phải liên quan trực tiếp và không vi phạm bản quyền.',
  'Không đăng thông tin sai sự thật, lừa đảo hoặc quảng cáo rác.',
  'Không công khai giấy tờ cá nhân, mã OTP hoặc thông tin ngân hàng.',
  'Cập nhật hoặc gỡ nội dung khi thông tin không còn chính xác.',
];

export default function CreateHubPage() {
  return (
    <section className="create-hub-page">
      <Seo
        title="Đăng nội dung"
        description="Chọn loại nội dung để đăng bài cộng đồng, bất động sản, việc làm, gửi tin địa phương hoặc yêu cầu tư vấn tại Hòa Lạc."
      />

      <div className="create-hub-container">
        <header className="create-hub-hero">
          <div className="create-hub-hero__content">
            <span className="create-hub-hero__eyebrow">
              <UploadCloud size={17} />
              Đóng góp nội dung
            </span>

            <h1>Bạn muốn đăng gì?</h1>

            <p>
              Chọn đúng loại nội dung để hệ thống áp dụng biểu mẫu,
              dữ liệu bắt buộc và quy trình kiểm duyệt phù hợp.
            </p>

            <div className="create-hub-hero__actions">
              <a
                href="#create-options"
                className="create-hub-primary-action"
              >
                <Sparkles size={18} />
                Chọn loại nội dung
              </a>

              <Link
                to="/quy-dinh-dang-bai"
                className="create-hub-secondary-action"
              >
                <ShieldCheck size={18} />
                Xem quy định đăng bài
              </Link>
            </div>
          </div>

          <div className="create-hub-hero__summary">
            <div className="create-hub-hero__summary-heading">
              <span>
                <UsersRound size={23} />
              </span>

              <div>
                <strong>Trung tâm đăng nội dung</strong>
                <small>Đô Thị Hòa Lạc</small>
              </div>
            </div>

            <div className="create-hub-hero__summary-list">
              <div>
                <CheckCircle2 size={17} />
                <span>Bài cộng đồng và tin đăng cá nhân</span>
              </div>

              <div>
                <CheckCircle2 size={17} />
                <span>Tin gửi Ban biên tập kiểm tra</span>
              </div>

              <div>
                <CheckCircle2 size={17} />
                <span>Yêu cầu tư vấn trong hệ sinh thái XSpace</span>
              </div>
            </div>
          </div>
        </header>

        <section
          id="create-options"
          className="create-options-section"
        >
          <header className="create-section-heading">
            <span>
              <FilePenLine size={22} />
            </span>

            <div>
              <small>Lựa chọn nội dung</small>

              <h2>Chọn nhóm phù hợp với nhu cầu</h2>

              <p>
                Mỗi loại nội dung sử dụng biểu mẫu riêng để bảo đảm thông tin
                được trình bày đầy đủ và dễ kiểm duyệt.
              </p>
            </div>
          </header>

          <div className="create-option-grid">
            {options.map(
              ({
                to,
                icon: Icon,
                eyebrow,
                title,
                text,
                note,
                badge,
                tone,
              }) => (
                <Link
                  key={to}
                  to={to}
                  className={`create-option-card create-option-card--${tone}`}
                >
                  <div className="create-option-card__top">
                    <span className="create-option-card__icon">
                      <Icon size={29} />
                    </span>

                    <span className="create-option-card__badge">
                      {badge}
                    </span>
                  </div>

                  <span className="create-option-card__eyebrow">
                    {eyebrow}
                  </span>

                  <h2>{title}</h2>

                  <p>{text}</p>

                  <div className="create-option-card__note">
                    <MessageCircle size={15} />
                    <span>{note}</span>
                  </div>

                  <div className="create-option-card__action">
                    <span>Tiếp tục</span>
                    <ArrowRight size={18} />
                  </div>
                </Link>
              ),
            )}
          </div>
        </section>

        <section className="create-process-section">
          <header className="create-section-heading">
            <span>
              <Clock3 size={22} />
            </span>

            <div>
              <small>Quy trình xuất bản</small>

              <h2>Nội dung được xử lý như thế nào?</h2>

              <p>
                Tùy từng loại bài, nội dung có thể được xuất bản ngay hoặc
                chuyển sang trạng thái chờ kiểm duyệt.
              </p>
            </div>
          </header>

          <div className="create-process-grid">
            {publishingSteps.map(
              ({
                number,
                icon: StepIcon,
                title,
                description,
              }) => (
                <article key={number}>
                  <div className="create-process-card__top">
                    <span>{number}</span>
                    <StepIcon size={21} />
                  </div>

                  <h3>{title}</h3>

                  <p>{description}</p>
                </article>
              ),
            )}
          </div>
        </section>

        <div className="create-guidance-layout">
          <section className="create-guidance-card">
            <header>
              <span>
                <ShieldCheck size={22} />
              </span>

              <div>
                <small>Trước khi đăng</small>
                <h2>Một số nguyên tắc quan trọng</h2>
              </div>
            </header>

            <ul>
              {postingNotes.map((note) => (
                <li key={note}>
                  <CheckCircle2 size={17} />
                  <span>{note}</span>
                </li>
              ))}
            </ul>

            <Link to="/quy-dinh-dang-bai">
              Xem đầy đủ quy định đăng bài
              <ArrowRight size={17} />
            </Link>
          </section>

          <section className="create-editorial-card">
            <span className="create-editorial-card__icon">
              <Newspaper size={27} />
            </span>

            <small>Bạn có nguồn tin địa phương?</small>

            <h2>
              Gửi thông tin cho Ban biên tập
            </h2>

            <p>
              Sự kiện, hình ảnh, văn bản, thông báo hoặc vấn đề đáng chú ý
              tại Hòa Lạc có thể được gửi để Ban biên tập kiểm tra và xử lý.
            </p>

            <Link to="/gui-tin">
              <Newspaper size={17} />
              Gửi nguồn tin
            </Link>
          </section>
        </div>

        <section className="create-support-section">
          <div>
            <span>
              <MessageCircle size={22} />
            </span>

            <div>
              <strong>Chưa biết nên chọn loại nội dung nào?</strong>

              <p>
                Gửi yêu cầu tới Đô Thị Hòa Lạc để được hướng dẫn tới đúng
                biểu mẫu hoặc bộ phận tiếp nhận.
              </p>
            </div>
          </div>

          <Link to="/lien-he">
            Liên hệ hỗ trợ
            <ArrowRight size={17} />
          </Link>
        </section>
      </div>
    </section>
  );
}