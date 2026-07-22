import {
  useCallback,
  useMemo,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  DraftingCompass,
  Hammer,
  Headphones,
  Hotel,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  PartyPopper,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
  Trees,
  UsersRound,
  Wrench,
} from 'lucide-react';

import Seo from '../../components/common/Seo';
import LeadForm from '../../components/forms/LeadForm';

import './LeadPage.css';

const MELY_TYPES = [
  'homestay_search',
  'villa_booking',
  'event_booking',
];

const LEAD_TYPE_CONFIG = {
  architecture_design: {
    brand: 'kientruchoalac',
    brandName: 'Kiến Trúc Hòa Lạc',
    eyebrow: 'Thiết kế kiến trúc',
    title:
      'Tư vấn thiết kế kiến trúc tại Hòa Lạc',
    description:
      'Tiếp nhận nhu cầu thiết kế nhà ở, biệt thự, nhà vườn, homestay, công trình kinh doanh và các không gian phù hợp với điều kiện thực tế tại Hòa Lạc.',
    icon: DraftingCompass,
    serviceName: 'Thiết kế kiến trúc',
  },

  construction: {
    brand: 'kientruchoalac',
    brandName: 'Kiến Trúc Hòa Lạc',
    eyebrow: 'Thi công xây dựng',
    title:
      'Tư vấn thi công công trình tại Hòa Lạc',
    description:
      'Trao đổi nhu cầu thi công mới, hoàn thiện công trình, quản lý tiến độ và lựa chọn phương án xây dựng phù hợp.',
    icon: Hammer,
    serviceName: 'Thi công xây dựng',
  },

  renovation: {
    brand: 'kientruchoalac',
    brandName: 'Kiến Trúc Hòa Lạc',
    eyebrow: 'Cải tạo công trình',
    title:
      'Tư vấn cải tạo và nâng cấp công trình',
    description:
      'Tiếp nhận nhu cầu cải tạo nhà ở, sửa chữa không gian, thay đổi công năng hoặc nâng cấp công trình đang sử dụng.',
    icon: Wrench,
    serviceName: 'Cải tạo công trình',
  },

  cost_estimate: {
    brand: 'kientruchoalac',
    brandName: 'Kiến Trúc Hòa Lạc',
    eyebrow: 'Ước tính chi phí',
    title:
      'Tư vấn dự toán và chi phí xây dựng',
    description:
      'Cung cấp thông tin sơ bộ để đội ngũ đánh giá quy mô, nhu cầu và hỗ trợ ước tính mức đầu tư phù hợp.',
    icon: CircleDollarSign,
    serviceName: 'Dự toán xây dựng',
  },

  homestay_search: {
    brand: 'mely_space',
    brandName: 'Mely Space',
    eyebrow: 'Tìm không gian lưu trú',
    title:
      'Tìm homestay phù hợp tại Hòa Lạc',
    description:
      'Gửi nhu cầu về số người, thời gian lưu trú, ngân sách và tiện ích để Mely Space hỗ trợ tìm không gian phù hợp.',
    icon: BedDouble,
    serviceName: 'Tìm homestay',
  },

  villa_booking: {
    brand: 'mely_space',
    brandName: 'Mely Space',
    eyebrow: 'Đặt villa nghỉ dưỡng',
    title:
      'Tìm villa nghỉ dưỡng phù hợp',
    description:
      'Tiếp nhận nhu cầu thuê villa cho gia đình, nhóm bạn, nghỉ dưỡng cuối tuần hoặc các hoạt động riêng tư.',
    icon: Hotel,
    serviceName: 'Đặt villa',
  },

  event_booking: {
    brand: 'mely_space',
    brandName: 'Mely Space',
    eyebrow: 'Không gian sự kiện',
    title:
      'Tìm không gian tổ chức sự kiện',
    description:
      'Hỗ trợ tìm villa, homestay hoặc không gian phù hợp cho sinh nhật, liên hoan, workshop và hoạt động nhóm.',
    icon: PartyPopper,
    serviceName: 'Không gian sự kiện',
  },
};

const ARCHITECTURE_FEATURES = [
  {
    icon: DraftingCompass,
    title: 'Tư vấn theo nhu cầu',
    description:
      'Đánh giá loại công trình, diện tích, phong cách và mục tiêu sử dụng.',
  },
  {
    icon: Ruler,
    title: 'Phương án phù hợp',
    description:
      'Đề xuất giải pháp kiến trúc và công năng dựa trên điều kiện thực tế.',
  },
  {
    icon: CircleDollarSign,
    title: 'Cân đối ngân sách',
    description:
      'Hỗ trợ xác định phạm vi đầu tư và các hạng mục cần ưu tiên.',
  },
  {
    icon: Building2,
    title: 'Kết nối triển khai',
    description:
      'Tiếp tục trao đổi về thiết kế, thi công hoặc cải tạo khi phù hợp.',
  },
];

const MELY_FEATURES = [
  {
    icon: BedDouble,
    title: 'Đúng nhu cầu lưu trú',
    description:
      'Lựa chọn theo số khách, thời gian sử dụng và mục đích chuyến đi.',
  },
  {
    icon: Trees,
    title: 'Không gian phù hợp',
    description:
      'Tìm villa, homestay hoặc địa điểm có tiện ích tương ứng.',
  },
  {
    icon: CircleDollarSign,
    title: 'Theo khoảng ngân sách',
    description:
      'Lọc phương án dựa trên mức chi phí dự kiến của khách hàng.',
  },
  {
    icon: CalendarCheck2,
    title: 'Kiểm tra thời gian',
    description:
      'Đối chiếu thời gian cần sử dụng và tình trạng phù hợp của không gian.',
  },
];

const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Gửi nhu cầu',
    description:
      'Cung cấp thông tin cơ bản về nhu cầu, thời gian, ngân sách và cách liên hệ.',
  },
  {
    number: '02',
    title: 'Tiếp nhận và phân loại',
    description:
      'Yêu cầu được chuyển tới Kiến Trúc Hòa Lạc hoặc Mely Space.',
  },
  {
    number: '03',
    title: 'Trao đổi xác nhận',
    description:
      'Đội ngũ phụ trách liên hệ để làm rõ những thông tin cần thiết.',
  },
  {
    number: '04',
    title: 'Đề xuất phương án',
    description:
      'Khách hàng nhận phương án tư vấn hoặc lựa chọn phù hợp để tiếp tục trao đổi.',
  },
];

function getDefaultConfig(isMely) {
  return isMely
    ? LEAD_TYPE_CONFIG.homestay_search
    : LEAD_TYPE_CONFIG.architecture_design;
}

export default function LeadPage({
  type: fixedType,
}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const type =
    fixedType ||
    params.get('type') ||
    'architecture_design';

  const source =
    params.get('source') || null;

  const isMely =
    MELY_TYPES.includes(type);

  const config = useMemo(
    () =>
      LEAD_TYPE_CONFIG[type] ||
      getDefaultConfig(isMely),
    [isMely, type],
  );

  const features = isMely
    ? MELY_FEATURES
    : ARCHITECTURE_FEATURES;

  const ServiceIcon = config.icon;

  const handleBack = useCallback(() => {
    const historyIndex =
      window.history.state?.idx;

    if (
      typeof historyIndex === 'number' &&
      historyIndex > 0
    ) {
      navigate(-1);
      return;
    }

    navigate('/');
  }, [navigate]);

  return (
    <section className="lead-page">
      <Seo
        title={config.title}
        description={config.description}
      />

      <div className="lead-page-container">
        <nav className="lead-page-breadcrumb">
          <button
            type="button"
            onClick={handleBack}
          >
            <ArrowLeft size={17} />
            Quay lại
          </button>

          <span>/</span>

          <Link to="/">
            Trang chủ
          </Link>

          <span>/</span>

          <span>
            Yêu cầu tư vấn
          </span>
        </nav>

        <header className="lead-page-hero">
          <div className="lead-page-hero__content">
            <span className="lead-page-hero__eyebrow">
              <Sparkles size={17} />
              {config.eyebrow}
            </span>

            <h1>{config.title}</h1>

            <p>{config.description}</p>

            <div className="lead-page-hero__actions">
              <a
                href="#lead-request-form"
                className="lead-page-primary-action"
              >
                <MessageCircle size={18} />
                Gửi yêu cầu tư vấn
              </a>

              <Link
                to="/lien-he"
                className="lead-page-secondary-action"
              >
                <Headphones size={18} />
                Liên hệ hỗ trợ
              </Link>
            </div>
          </div>

          <div className="lead-page-hero__summary">
            <div className="lead-page-hero__summary-heading">
              <span>
                <ServiceIcon size={25} />
              </span>

              <div>
                <strong>
                  {config.serviceName}
                </strong>

                <small>
                  Tiếp nhận bởi{' '}
                  {config.brandName}
                </small>
              </div>
            </div>

            <div className="lead-page-hero__summary-list">
              <div>
                <CheckCircle2 size={17} />

                <span>
                  Tiếp nhận nhu cầu trực tiếp
                </span>
              </div>

              <div>
                <CheckCircle2 size={17} />

                <span>
                  Phân loại theo thông tin cung cấp
                </span>
              </div>

              <div>
                <CheckCircle2 size={17} />

                <span>
                  Liên hệ xác nhận trước khi tư vấn
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="lead-page-features">
          {features.map((feature) => {
            const FeatureIcon =
              feature.icon;

            return (
              <article key={feature.title}>
                <span>
                  <FeatureIcon size={22} />
                </span>

                <div>
                  <h2>
                    {feature.title}
                  </h2>

                  <p>
                    {feature.description}
                  </p>
                </div>
              </article>
            );
          })}
        </section>

        <div className="lead-page-layout">
          <main className="lead-page-main">
            <section
              id="lead-request-form"
              className="lead-page-form-card"
            >
              <header className="lead-page-form-card__heading">
                <span>
                  <ServiceIcon size={23} />
                </span>

                <div>
                  <small>
                    Biểu mẫu yêu cầu
                  </small>

                  <h2>
                    Cung cấp thông tin nhu cầu
                  </h2>

                  <p>
                    Điền các thông tin cần thiết để đội ngũ phụ trách có cơ sở
                    liên hệ và tư vấn chính xác.
                  </p>
                </div>
              </header>

              <div className="lead-page-form-card__notice">
                <ShieldCheck size={19} />

                <p>
                  Thông tin liên hệ được sử dụng để xử lý yêu cầu bạn chủ động
                  gửi và không tự động hiển thị công khai trên website.
                </p>
              </div>

              {source ? (
                <div className="lead-page-source-notice">
                  <Info size={18} />

                  <div>
                    <strong>
                      Yêu cầu được gửi từ một nội dung trên website
                    </strong>

                    <p>
                      Hệ thống sẽ đính kèm nội dung nguồn để đội ngũ phụ trách
                      hiểu rõ nhu cầu liên quan.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="lead-page-form-card__body">
                <LeadForm
                  presetType={type}
                  assignedBrand={config.brand}
                  sourceContentId={source}
                />
              </div>
            </section>
          </main>

          <aside className="lead-page-sidebar">
            <div className="lead-page-sidebar__content">
              <section className="lead-page-sidebar-card lead-page-brand-card">
                <span className="lead-page-brand-card__icon">
                  {isMely ? (
                    <Hotel size={27} />
                  ) : (
                    <DraftingCompass
                      size={27}
                    />
                  )}
                </span>

                <small>
                  Đơn vị tiếp nhận
                </small>

                <h2>
                  {config.brandName}
                </h2>

                <p>
                  {isMely
                    ? 'Nền tảng hỗ trợ tìm homestay, villa nghỉ dưỡng và không gian tổ chức sự kiện tại Hòa Lạc.'
                    : 'Đơn vị tiếp nhận nhu cầu thiết kế, thi công, cải tạo và tư vấn chi phí xây dựng tại Hòa Lạc.'}
                </p>

                <Link to="/lien-he">
                  Tìm hiểu thêm
                  <ArrowRight size={17} />
                </Link>
              </section>

              <section className="lead-page-sidebar-card">
                <div className="lead-page-sidebar-heading">
                  <Info size={20} />

                  <div>
                    <h2>
                      Thông tin nên chuẩn bị
                    </h2>

                    <p>
                      Dữ liệu giúp quá trình tư vấn thuận lợi hơn.
                    </p>
                  </div>
                </div>

                <ul className="lead-page-checklist">
                  {isMely ? (
                    <>
                      <li>
                        Ngày nhận và ngày trả phòng dự kiến.
                      </li>

                      <li>
                        Số lượng người lớn và trẻ em.
                      </li>

                      <li>
                        Mục đích lưu trú hoặc tổ chức sự kiện.
                      </li>

                      <li>
                        Khoảng ngân sách dự kiến.
                      </li>

                      <li>
                        Các tiện ích hoặc yêu cầu đặc biệt.
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        Loại công trình và mục đích sử dụng.
                      </li>

                      <li>
                        Địa điểm hoặc khu vực xây dựng.
                      </li>

                      <li>
                        Diện tích đất và quy mô dự kiến.
                      </li>

                      <li>
                        Phong cách hoặc nhu cầu công năng.
                      </li>

                      <li>
                        Khoảng ngân sách dự kiến.
                      </li>
                    </>
                  )}
                </ul>
              </section>

              <section className="lead-page-sidebar-card">
                <div className="lead-page-sidebar-heading">
                  <ShieldCheck size={20} />

                  <div>
                    <h2>
                      Nguyên tắc tiếp nhận
                    </h2>

                    <p>
                      Yêu cầu được xử lý theo thông tin thực tế.
                    </p>
                  </div>
                </div>

                <div className="lead-page-principles">
                  <div>
                    <CheckCircle2 size={17} />

                    <span>
                      Bảo mật thông tin liên hệ
                    </span>
                  </div>

                  <div>
                    <UsersRound size={17} />

                    <span>
                      Chuyển đúng đơn vị phụ trách
                    </span>
                  </div>

                  <div>
                    <MessageCircle size={17} />

                    <span>
                      Xác nhận nhu cầu trước khi tư vấn
                    </span>
                  </div>
                </div>
              </section>

              <section className="lead-page-sidebar-card">
                <div className="lead-page-sidebar-heading">
                  <Phone size={20} />

                  <div>
                    <h2>
                      Liên hệ trực tiếp
                    </h2>

                    <p>
                      Sử dụng khi cần trao đổi nhanh.
                    </p>
                  </div>
                </div>

                <div className="lead-page-contact-list">
                  <a href="tel:0966709790">
                    <Phone size={17} />

                    <span>
                      <small>Hotline</small>

                      <strong>
                        0966 709 790
                      </strong>
                    </span>
                  </a>

                  <a href="mailto:admin@xspace.vn">
                    <Mail size={17} />

                    <span>
                      <small>Email</small>

                      <strong>
                        admin@xspace.vn
                      </strong>
                    </span>
                  </a>

                  <div>
                    <MapPin size={17} />

                    <span>
                      <small>
                        Khu vực hoạt động
                      </small>

                      <strong>
                        Hòa Lạc, Hà Nội
                      </strong>
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>

        <section className="lead-page-process">
          <header className="lead-page-section-heading">
            <span>
              <CalendarCheck2 size={22} />
            </span>

            <div>
              <small>
                Quy trình tiếp nhận
              </small>

              <h2>
                Yêu cầu được xử lý như thế nào?
              </h2>

              <p>
                Quy trình có thể được điều chỉnh tùy loại dịch vụ và mức độ chi
                tiết của nhu cầu.
              </p>
            </div>
          </header>

          <div className="lead-page-process__grid">
            {PROCESS_STEPS.map(
              (step) => (
                <article key={step.number}>
                  <span>
                    {step.number}
                  </span>

                  <h3>
                    {step.title}
                  </h3>

                  <p>
                    {step.description}
                  </p>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="lead-page-support">
          <div>
            <span>
              <Headphones size={22} />
            </span>

            <div>
              <strong>
                Chưa xác định đúng loại yêu cầu?
              </strong>

              <p>
                Gửi thông tin chung tới Đô Thị Hòa Lạc để được hướng dẫn đến
                đúng đơn vị hoặc biểu mẫu phù hợp.
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