import {
  useCallback,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Handshake,
  Headphones,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import LeadForm from '../../components/forms/LeadForm';

import { useToast } from '../../context/ToastContext';

import './ContactPage.css';

const CONTACT_INFO = {
  phone: '0966 709 790',
  phoneHref: '0966709790',
  email: 'admin@xspace.vn',
  location: 'Hòa Lạc, Hà Nội',
  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=Hòa+Lạc,+Hà+Nội',
};

const CONTACT_TOPICS = [
  {
    icon: MessageCircle,
    title: 'Góp ý nội dung',
    description:
      'Phản hồi về bài viết, thông tin địa phương, lỗi nội dung hoặc đề xuất chủ đề mới.',
  },
  {
    icon: Handshake,
    title: 'Hợp tác truyền thông',
    description:
      'Kết nối sản xuất nội dung, truyền thông thương hiệu, sự kiện và hoạt động địa phương.',
  },
  {
    icon: Megaphone,
    title: 'Quảng cáo và tài trợ',
    description:
      'Tư vấn bài tài trợ, banner, truyền thông dự án và các hình thức quảng bá phù hợp.',
  },
  {
    icon: Building2,
    title: 'Dịch vụ XSpace',
    description:
      'Kết nối nhu cầu kiến trúc, xây dựng, bất động sản, lưu trú và các dịch vụ trong hệ sinh thái.',
  },
];

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Gửi yêu cầu',
    description:
      'Điền đầy đủ thông tin liên hệ và nội dung cần hỗ trợ.',
  },
  {
    number: '02',
    title: 'Phân loại nhu cầu',
    description:
      'Yêu cầu được chuyển đến bộ phận hoặc thương hiệu phù hợp.',
  },
  {
    number: '03',
    title: 'Liên hệ xác nhận',
    description:
      'Đội ngũ phụ trách liên hệ để làm rõ thông tin khi cần.',
  },
  {
    number: '04',
    title: 'Đề xuất phương án',
    description:
      'Hai bên trao đổi phương án hỗ trợ hoặc hợp tác cụ thể.',
  },
];

const FAQ_ITEMS = [
  {
    question:
      'Tôi có thể gửi tin quy hoạch hoặc thông tin địa phương không?',
    answer:
      'Có. Bạn có thể gửi thông tin qua biểu mẫu liên hệ. Vui lòng cung cấp nguồn, thời gian, địa điểm và tài liệu liên quan để đội ngũ có cơ sở kiểm tra trước khi biên tập.',
  },
  {
    question:
      'Đô Thị Hòa Lạc có nhận đăng bài quảng cáo không?',
    answer:
      'Nền tảng có tiếp nhận nhu cầu truyền thông và bài tài trợ phù hợp với định hướng nội dung. Nội dung quảng cáo cần minh bạch về đơn vị cung cấp và tuân thủ quy định đăng bài.',
  },
  {
    question:
      'Tôi phát hiện bài viết có thông tin chưa chính xác thì làm gì?',
    answer:
      'Hãy gửi đường dẫn bài viết, nội dung cần điều chỉnh và tài liệu đối chiếu. Đội ngũ sẽ kiểm tra và cập nhật khi có đủ căn cứ.',
  },
  {
    question:
      'Bao lâu tôi sẽ nhận được phản hồi?',
    answer:
      'Yêu cầu thông thường được tiếp nhận trong giờ làm việc. Thời gian phản hồi phụ thuộc vào loại yêu cầu, mức độ cần xác minh và đơn vị phụ trách.',
  },
];

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(
      value,
    );

    return;
  }

  const textarea =
    document.createElement('textarea');

  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);

  textarea.focus();
  textarea.select();

  const copied =
    document.execCommand('copy');

  textarea.remove();

  if (!copied) {
    throw new Error(
      'Không thể sao chép nội dung.',
    );
  }
}

export default function ContactPage() {
  const toast = useToast();

  const [copiedField, setCopiedField] =
    useState('');

  const handleCopy = useCallback(
    async (field, value, message) => {
      try {
        await copyText(value);

        setCopiedField(field);
        toast.success(message);

        window.setTimeout(() => {
          setCopiedField((current) =>
            current === field
              ? ''
              : current,
          );
        }, 1800);
      } catch {
        toast.error(
          'Không thể sao chép thông tin.',
        );
      }
    },
    [toast],
  );

  return (
    <section className="contact-page">
      <Seo
        title="Liên hệ Đô Thị Hòa Lạc"
        description="Gửi góp ý nội dung, đề xuất hợp tác truyền thông, yêu cầu quảng cáo hoặc kết nối dịch vụ trong hệ sinh thái XSpace."
      />

      <div className="contact-page__container">
        <header className="contact-hero">
          <div className="contact-hero__content">
            <span className="contact-hero__eyebrow">
              <MessageCircle size={17} />
              Kết nối với chúng tôi
            </span>

            <h1>
              Liên hệ Đô Thị Hòa Lạc
            </h1>

            <p>
              Gửi góp ý, cung cấp thông
              tin địa phương, đề xuất hợp
              tác truyền thông hoặc kết
              nối dịch vụ trong hệ sinh
              thái XSpace.
            </p>

            <div className="contact-hero__actions">
              <a
                href={`tel:${CONTACT_INFO.phoneHref}`}
                className="contact-primary-button"
              >
                <Phone size={18} />
                Gọi {CONTACT_INFO.phone}
              </a>

              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="contact-secondary-button"
              >
                <Mail size={18} />
                Gửi email
              </a>
            </div>
          </div>

          <div className="contact-hero__summary">
            <div className="contact-hero__summary-heading">
              <span>
                <Headphones size={22} />
              </span>

              <div>
                <strong>
                  Bộ phận tiếp nhận
                </strong>

                <small>
                  Media Space – Hệ sinh
                  thái XSpace
                </small>
              </div>
            </div>

            <div className="contact-hero__summary-list">
              <div>
                <CheckCircle2 size={17} />

                <span>
                  Góp ý và phản ánh nội
                  dung
                </span>
              </div>

              <div>
                <CheckCircle2 size={17} />

                <span>
                  Hợp tác truyền thông và
                  quảng cáo
                </span>
              </div>

              <div>
                <CheckCircle2 size={17} />

                <span>
                  Kết nối dịch vụ tại Hòa
                  Lạc
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="contact-quick-info">
          <article>
            <span>
              <MapPin size={22} />
            </span>

            <div>
              <small>Địa bàn hoạt động</small>

              <strong>
                {CONTACT_INFO.location}
              </strong>

              <a
                href={CONTACT_INFO.mapUrl}
                target="_blank"
                rel="noreferrer"
              >
                Xem trên bản đồ
                <ArrowRight size={15} />
              </a>
            </div>
          </article>

          <article>
            <span>
              <Mail size={22} />
            </span>

            <div>
              <small>Email liên hệ</small>

              <strong>
                {CONTACT_INFO.email}
              </strong>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'email',
                    CONTACT_INFO.email,
                    'Đã sao chép địa chỉ email.',
                  )
                }
              >
                {copiedField ===
                'email' ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}

                {copiedField === 'email'
                  ? 'Đã sao chép'
                  : 'Sao chép email'}
              </button>
            </div>
          </article>

          <article>
            <span>
              <Phone size={22} />
            </span>

            <div>
              <small>Hotline</small>

              <strong>
                {CONTACT_INFO.phone}
              </strong>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'phone',
                    CONTACT_INFO.phone,
                    'Đã sao chép số điện thoại.',
                  )
                }
              >
                {copiedField ===
                'phone' ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}

                {copiedField === 'phone'
                  ? 'Đã sao chép'
                  : 'Sao chép số'}
              </button>
            </div>
          </article>

          <article>
            <span>
              <Clock3 size={22} />
            </span>

            <div>
              <small>Thời gian tiếp nhận</small>

              <strong>
                Thứ Hai – Thứ Bảy
              </strong>

              <p>
                08:00 – 17:30
              </p>
            </div>
          </article>
        </section>

        <section className="contact-topics-section">
          <div className="contact-section-heading">
            <span>
              <Sparkles size={21} />
            </span>

            <div>
              <span>Phạm vi tiếp nhận</span>

              <h2>
                Bạn đang cần hỗ trợ nội
                dung nào?
              </h2>

              <p>
                Chọn đúng nhóm nhu cầu sẽ
                giúp yêu cầu được chuyển
                đến đơn vị phụ trách nhanh
                hơn.
              </p>
            </div>
          </div>

          <div className="contact-topics-grid">
            {CONTACT_TOPICS.map(
              (topic) => {
                const TopicIcon =
                  topic.icon;

                return (
                  <article
                    key={topic.title}
                  >
                    <span>
                      <TopicIcon
                        size={23}
                      />
                    </span>

                    <h3>
                      {topic.title}
                    </h3>

                    <p>
                      {topic.description}
                    </p>
                  </article>
                );
              },
            )}
          </div>
        </section>

        <div className="contact-main-layout">
          <main className="contact-form-section">
            <div className="contact-form-card">
              <div className="contact-form-card__heading">
                <span>
                  <Send size={22} />
                </span>

                <div>
                  <span>
                    Biểu mẫu liên hệ
                  </span>

                  <h2>
                    Gửi yêu cầu tới Media
                    Space
                  </h2>

                  <p>
                    Cung cấp đầy đủ thông
                    tin để đội ngũ có thể
                    phân loại và phản hồi
                    chính xác.
                  </p>
                </div>
              </div>

              <div className="contact-form-card__notice">
                <ShieldCheck size={18} />

                <p>
                  Thông tin liên hệ chỉ
                  được sử dụng để xử lý
                  yêu cầu bạn chủ động gửi.
                </p>
              </div>

              <div className="contact-form-card__body">
                <LeadForm
                  presetType="partnership"
                  assignedBrand="media_space"
                />
              </div>
            </div>
          </main>

          <aside className="contact-sidebar">
            <div className="contact-sidebar__content">
              <section className="contact-sidebar-card contact-business-card">
                <span>
                  <Handshake size={24} />
                </span>

                <small>
                  Hợp tác cùng chúng tôi
                </small>

                <h2>
                  Đồng hành phát triển hệ
                  sinh thái thông tin Hòa
                  Lạc
                </h2>

                <p>
                  Media Space tiếp nhận đề
                  xuất hợp tác từ doanh
                  nghiệp, tổ chức, đơn vị
                  dịch vụ và cộng tác viên
                  nội dung.
                </p>

                <a
                  href={`mailto:${CONTACT_INFO.email}?subject=${encodeURIComponent(
                    'Đề xuất hợp tác cùng Đô Thị Hòa Lạc',
                  )}`}
                >
                  Gửi đề xuất hợp tác
                  <ArrowRight size={17} />
                </a>
              </section>

              <section className="contact-sidebar-card">
                <div className="contact-sidebar-heading">
                  <FileText size={19} />

                  <div>
                    <h2>
                      Khi gửi phản ánh
                    </h2>

                    <p>
                      Nên cung cấp đủ dữ
                      liệu để hỗ trợ kiểm
                      tra.
                    </p>
                  </div>
                </div>

                <ul className="contact-checklist">
                  <li>
                    Đường dẫn bài viết hoặc
                    nội dung liên quan.
                  </li>

                  <li>
                    Mô tả cụ thể thông tin
                    cần điều chỉnh.
                  </li>

                  <li>
                    Nguồn hoặc tài liệu đối
                    chiếu.
                  </li>

                  <li>
                    Thông tin liên hệ để xác
                    nhận khi cần.
                  </li>
                </ul>
              </section>

              <section className="contact-sidebar-card">
                <div className="contact-sidebar-heading">
                  <BadgeCheck size={19} />

                  <div>
                    <h2>
                      Nguyên tắc tiếp nhận
                    </h2>

                    <p>
                      Mọi yêu cầu được xem
                      xét theo nội dung thực
                      tế.
                    </p>
                  </div>
                </div>

                <div className="contact-principles">
                  <div>
                    <ShieldCheck
                      size={17}
                    />

                    <span>
                      Bảo mật thông tin liên
                      hệ
                    </span>
                  </div>

                  <div>
                    <UsersRound size={17} />

                    <span>
                      Chuyển đúng bộ phận
                      phụ trách
                    </span>
                  </div>

                  <div>
                    <CheckCircle2
                      size={17}
                    />

                    <span>
                      Phản hồi trên cơ sở
                      thông tin xác minh
                    </span>
                  </div>
                </div>
              </section>

              <section className="contact-sidebar-card contact-policy-card">
                <ShieldCheck size={21} />

                <h2>
                  Quy định và chính sách
                </h2>

                <p>
                  Xem các nguyên tắc áp
                  dụng khi đăng bài và sử
                  dụng nền tảng.
                </p>

                <div>
                  <Link to="/quy-dinh-dang-bai">
                    Quy định đăng bài
                  </Link>

                  <Link to="/chinh-sach-quyen-rieng-tu">
                    Chính sách riêng tư
                  </Link>

                  <Link to="/dieu-khoan-su-dung">
                    Điều khoản sử dụng
                  </Link>
                </div>
              </section>
            </div>
          </aside>
        </div>

        <section className="contact-process-section">
          <div className="contact-section-heading">
            <span>
              <Clock3 size={21} />
            </span>

            <div>
              <span>Quy trình tiếp nhận</span>

              <h2>
                Yêu cầu được xử lý như thế
                nào?
              </h2>

              <p>
                Quy trình có thể thay đổi
                tùy theo tính chất và mức
                độ cần xác minh của từng
                yêu cầu.
              </p>
            </div>
          </div>

          <div className="contact-process-grid">
            {PROCESS_STEPS.map(
              (step) => (
                <article
                  key={step.number}
                >
                  <span>
                    {step.number}
                  </span>

                  <h3>{step.title}</h3>

                  <p>
                    {step.description}
                  </p>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="contact-faq-section">
          <div className="contact-section-heading">
            <span>
              <MessageCircle
                size={21}
              />
            </span>

            <div>
              <span>Câu hỏi thường gặp</span>

              <h2>
                Một số thông tin trước khi
                liên hệ
              </h2>
            </div>
          </div>

          <div className="contact-faq-list">
            {FAQ_ITEMS.map(
              (item, index) => (
                <details
                  key={item.question}
                  open={index === 0}
                >
                  <summary>
                    <span>
                      {item.question}
                    </span>

                    <span className="contact-faq-toggle">
                      +
                    </span>
                  </summary>

                  <p>{item.answer}</p>
                </details>
              ),
            )}
          </div>
        </section>
      </div>
    </section>
  );
}