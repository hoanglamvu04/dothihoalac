import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';

import ContentImage from '../content/ContentImage';
import { propertyApi } from '../../api/content.api';
import { contentPath } from '../../utils/content';
import { formatCurrency, formatNumber } from '../../utils/formatters';

function taxonomyValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.slug || value._id || value.id || '';
}

function authorAvatar(item) {
  return (
    item?.authorId?.avatarMediaId ||
    item?.authorId?.profile?.avatarMediaId ||
    item?.author?.avatarMediaId ||
    null
  );
}

function monthlyLoanPayment(principal, years, annualRate) {
  const months = Math.max(Number(years || 0) * 12, 1);
  const monthlyRate = Math.max(Number(annualRate || 0), 0) / 100 / 12;

  if (!principal) return 0;
  if (!monthlyRate) return principal / months;

  const factor = (1 + monthlyRate) ** months;
  return principal * ((monthlyRate * factor) / (factor - 1));
}

function SimilarProperty({ item }) {
  const property = item?.property || {};
  const href = contentPath(item);
  const location = item?.primaryAreaId?.name || property.addressText || 'Hòa Lạc';

  return (
    <article className="property-reference-similar-item">
      <Link
        to={href}
        className="property-reference-similar-item__media"
        aria-label={`Xem ${item.title}`}
      >
        <ContentImage media={item.thumbnailMediaId} alt={item.title} ratio="property" />
      </Link>
      <div>
        <h3><Link to={href}>{item.title}</Link></h3>
        <strong>{formatCurrency(property.price, property.priceUnit)}</strong>
        <span><MapPin size={13} /> {location}</span>
      </div>
    </article>
  );
}

export default function PropertyDetailReferenceRail({
  item,
  property,
  priceLabel,
  address,
  contactName,
  ownerLabel,
  phoneVisible,
  phoneLoading,
  revealPhone,
  copied,
  onCopyLink,
}) {
  const [loanYears, setLoanYears] = useState(20);
  const [interestRate, setInterestRate] = useState(8.5);
  const [similarItems, setSimilarItems] = useState([]);

  const numericPrice = Number(property?.price || 0);
  const loanPrincipal = numericPrice > 0 ? numericPrice * 0.8 : 0;
  const monthlyPayment = useMemo(
    () => monthlyLoanPayment(loanPrincipal, loanYears, interestRate),
    [interestRate, loanPrincipal, loanYears],
  );

  const areaValue = taxonomyValue(item?.primaryAreaId);
  const avatar = authorAvatar(item);
  const contactPhone = property?.contactPhone;
  const contactEmail = property?.contactEmail;
  const mapQuery = encodeURIComponent(address || 'Hòa Lạc');
  const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  useEffect(() => {
    if (!item?._id) return undefined;

    let active = true;
    const currentId = String(item._id);

    const loadSimilar = async () => {
      const requestPlan = [];

      if (areaValue && property?.propertyType) {
        requestPlan.push({
          limit: 8,
          area: areaValue,
          propertyType: property.propertyType,
        });
      }

      if (areaValue) {
        requestPlan.push({ limit: 8, area: areaValue });
      }

      if (property?.propertyType) {
        requestPlan.push({ limit: 8, propertyType: property.propertyType });
      }

      requestPlan.push({ limit: 10 });

      const collected = [];
      const seen = new Set([currentId]);

      for (const params of requestPlan) {
        if (collected.length >= 4) break;

        try {
          const result = await propertyApi.list(params);
          const source = Array.isArray(result?.items) ? result.items : [];

          source.forEach((candidate) => {
            const candidateId = String(candidate?._id || candidate?.id || '');
            if (!candidateId || seen.has(candidateId)) return;

            seen.add(candidateId);
            collected.push(candidate);
          });
        } catch {
          // Similar listings are supplementary. Continue with the broader
          // fallback query when a narrower request is unavailable.
        }
      }

      if (active) {
        setSimilarItems(collected.slice(0, 4));
      }
    };

    loadSimilar();

    return () => {
      active = false;
    };
  }, [areaValue, item?._id, property?.propertyType]);

  return (
    <aside className="property-detail-reference-rail" aria-label="Thông tin bất động sản">
      <div className="property-detail-reference-rail__inner">
        <section className="property-reference-price-card">
          <span>Giá bán</span>
          <strong>{priceLabel}</strong>
          {numericPrice > 0 && property?.landArea ? (
            <small>
              (~ {formatNumber(numericPrice / Number(property.landArea))} đ/m²)
            </small>
          ) : (
            <small>Theo thông tin người đăng</small>
          )}

          <div className="property-reference-price-card__actions">
            {contactPhone ? (
              phoneVisible ? (
                <a href={`tel:${contactPhone}`} className="is-primary">
                  <Phone size={16} />
                  {contactPhone}
                </a>
              ) : (
                <button
                  type="button"
                  className="is-primary"
                  disabled={phoneLoading}
                  onClick={revealPhone}
                >
                  <Phone size={16} />
                  {phoneLoading ? 'Đang lấy số...' : 'Liên hệ ngay'}
                </button>
              )
            ) : (
              <a href="#property-reference-contact" className="is-primary">
                <Phone size={16} />
                Liên hệ ngay
              </a>
            )}

            <button type="button" onClick={onCopyLink}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Đã sao chép' : 'Sao chép link'}
            </button>
          </div>
        </section>

        <section id="property-reference-contact" className="property-reference-contact-card">
          <div className="property-reference-contact-card__profile">
            <span className="property-reference-contact-card__avatar">
              {avatar ? (
                <ContentImage media={avatar} alt={contactName} />
              ) : (
                <UserRound size={22} />
              )}
            </span>
            <div>
              <strong>{contactName}</strong>
              <small>{ownerLabel}</small>
            </div>
          </div>

          {contactPhone ? (
            <div className="property-reference-contact-card__row">
              <Phone size={15} />
              {phoneVisible ? (
                <a href={`tel:${contactPhone}`}>{contactPhone}</a>
              ) : (
                <button type="button" disabled={phoneLoading} onClick={revealPhone}>
                  {phoneLoading ? 'Đang tải...' : 'Hiện số điện thoại'}
                </button>
              )}
            </div>
          ) : null}

          {contactEmail ? (
            <div className="property-reference-contact-card__row">
              <Mail size={15} />
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </div>
          ) : null}
        </section>

        {numericPrice > 0 && property?.transactionType === 'sale' ? (
          <section className="property-reference-loan-card">
            <header>
              <div>
                <Calculator size={17} />
                <h2>Ước tính khoản vay</h2>
              </div>
              <span>Tham khảo</span>
            </header>

            <div className="property-reference-loan-card__grid">
              <label>
                <span>Giá trị bất động sản</span>
                <strong>{new Intl.NumberFormat('vi-VN').format(Math.round(numericPrice))}</strong>
              </label>
              <label>
                <span>Thời hạn vay</span>
                <select value={loanYears} onChange={(event) => setLoanYears(Number(event.target.value))}>
                  <option value={10}>10 năm</option>
                  <option value={15}>15 năm</option>
                  <option value={20}>20 năm</option>
                  <option value={25}>25 năm</option>
                  <option value={30}>30 năm</option>
                </select>
              </label>
              <label>
                <span>Lãi suất (%/năm)</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={interestRate}
                  onChange={(event) => setInterestRate(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Số tiền vay (80%)</span>
                <strong>{new Intl.NumberFormat('vi-VN').format(Math.round(loanPrincipal))}</strong>
              </label>
            </div>

            <div className="property-reference-loan-card__result">
              <span>Ước tính trả hàng tháng</span>
              <strong>
                {monthlyPayment > 0
                  ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(monthlyPayment)} đ`
                  : '—'}
              </strong>
            </div>
          </section>
        ) : null}

        <section className="property-reference-map-card">
          <header>
            <div><MapPin size={17} /><h2>Vị trí trên bản đồ</h2></div>
            <a href={directionsUrl} target="_blank" rel="noreferrer">
              Xem bản đồ lớn <ExternalLink size={13} />
            </a>
          </header>
          <div className="property-reference-map-card__map">
            <iframe
              title={`Bản đồ ${address}`}
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="property-reference-map-card__address">
            <MapPin size={14} />
            <span>{address}</span>
          </div>
        </section>

        {similarItems.length ? (
          <section className="property-reference-similar-card">
            <header>
              <div><Building2 size={17} /><h2>Bất động sản tương tự</h2></div>
              <Link to="/bat-dong-san">Xem tất cả <ArrowRight size={13} /></Link>
            </header>
            <div className="property-reference-similar-card__list">
              {similarItems.map((similar) => (
                <SimilarProperty key={similar._id || similar.slug} item={similar} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
