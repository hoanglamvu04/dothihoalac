import { useCallback } from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  FileQuestion,
  Home,
  MapPin,
  MessageCircle,
  Newspaper,
  Search,
  ShieldAlert,
} from 'lucide-react';

import Seo from '../../components/common/Seo';

import './NotFoundPage.css';

const QUICK_LINKS = [
  {
    title: 'Trang chủ',
    description:
      'Quay về trang tổng quan Đô Thị Hòa Lạc.',
    to: '/',
    icon: Home,
  },
  {
    title: 'Tin tức',
    description:
      'Theo dõi tin tức, quy hoạch và hạ tầng.',
    to: '/tin-tuc',
    icon: Newspaper,
  },
  {
    title: 'Cộng đồng',
    description:
      'Hỏi đáp và trao đổi thông tin địa phương.',
    to: '/cong-dong',
    icon: MessageCircle,
  },
  {
    title: 'Nhà đất',
    description:
      'Tìm kiếm tin mua bán và cho thuê bất động sản.',
    to: '/nha-dat',
    icon: Building2,
  },
  {
    title: 'Việc làm',
    description:
      'Khám phá các cơ hội tuyển dụng tại Hòa Lạc.',
    to: '/viec-lam',
    icon: BriefcaseBusiness,
  },
];

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoBack = useCallback(() => {
    /*
     * idx là vị trí hiện tại trong lịch sử
     * do React Router quản lý.
     *
     * Nếu không có trang trước trong website,
     * tự động chuyển người dùng về trang chủ.
     */
    const historyIndex =
      window.history.state?.idx;

    if (
      typeof historyIndex === 'number' &&
      historyIndex > 0
    ) {
      navigate(-1);
      return;
    }

    navigate('/', {
      replace: true,
    });
  }, [navigate]);

  const currentPath =
    `${location.pathname}${location.search}${location.hash}`;

  return (
    <section className="not-found-page">
      <Seo
        title="Không tìm thấy trang"
        description="Đường dẫn bạn đang truy cập không tồn tại, đã thay đổi hoặc nội dung đã được gỡ."
      />

      <div className="not-found-page__container">
        <div className="not-found-card">
          <div className="not-found-card__visual">
            <span className="not-found-card__status">
              404
            </span>

            <div className="not-found-card__icon">
              <FileQuestion size={58} />
            </div>

            <span className="not-found-card__decor not-found-card__decor--one" />

            <span className="not-found-card__decor not-found-card__decor--two" />
          </div>

          <div className="not-found-card__content">
            <span className="not-found-card__eyebrow">
              <ShieldAlert size={17} />
              Không tìm thấy nội dung
            </span>

            <h1>
              Trang bạn đang tìm không tồn tại
            </h1>

            <p>
              Đường dẫn có thể đã thay đổi,
              nội dung đã được gỡ hoặc địa chỉ
              được nhập chưa chính xác.
            </p>

            <div className="not-found-path">
              <MapPin size={17} />

              <div>
                <span>
                  Đường dẫn hiện tại
                </span>

                <code>
                  {currentPath}
                </code>
              </div>
            </div>

            <div className="not-found-actions">
              <button
                type="button"
                className="not-found-back-button"
                onClick={handleGoBack}
              >
                <ArrowLeft size={18} />
                Quay lại trang trước
              </button>

              <Link
                className="not-found-home-button"
                to="/"
              >
                <Home size={18} />
                Về trang chủ
              </Link>
            </div>

            <div className="not-found-help">
              <Search size={17} />

              <p>
                Bạn có thể quay lại trang trước,
                về trang chủ hoặc chọn một chuyên
                mục bên dưới để tiếp tục.
              </p>
            </div>
          </div>
        </div>

        <section className="not-found-navigation">
          <header className="not-found-navigation__heading">
            <div>
              <span>
                <Home size={20} />
              </span>

              <div>
                <small>
                  Khám phá nội dung
                </small>

                <h2>
                  Tiếp tục từ một chuyên mục khác
                </h2>

                <p>
                  Các đường dẫn phổ biến trên
                  Đô Thị Hòa Lạc.
                </p>
              </div>
            </div>

            <Link to="/">
              Xem trang chủ
              <ArrowRight size={17} />
            </Link>
          </header>

          <div className="not-found-navigation__grid">
            {QUICK_LINKS.map((item) => {
              const ItemIcon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="not-found-navigation__item"
                >
                  <span>
                    <ItemIcon size={23} />
                  </span>

                  <div>
                    <h3>
                      {item.title}
                    </h3>

                    <p>
                      {item.description}
                    </p>
                  </div>

                  <ArrowRight
                    className="not-found-navigation__arrow"
                    size={18}
                  />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="not-found-contact">
          <div>
            <MessageCircle size={22} />

            <div>
              <strong>
                Bạn cho rằng đây là một liên kết bị lỗi?
              </strong>

              <p>
                Hãy gửi thông tin cho Đô Thị Hòa Lạc
                để đội ngũ kiểm tra và điều chỉnh.
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