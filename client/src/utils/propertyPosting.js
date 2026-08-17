import {
  PRICE_UNITS,
  PROPERTY_TYPES as LEGACY_PROPERTY_TYPES,
} from './constants';

// Bộ đăng tin BĐS cho phép người dùng nhập giá ngắn gọn theo Triệu/Tỷ.
// PropertyEditorPage đang dùng PRICE_UNITS dùng chung, nên mở rộng object tại đây
// để không ảnh hưởng cách lưu dữ liệu chuẩn của các nội dung cũ.
const perM2Label = PRICE_UNITS.per_m2;
const perMonthLabel = PRICE_UNITS.per_month;
const negotiableLabel = PRICE_UNITS.negotiable;

delete PRICE_UNITS.per_m2;
delete PRICE_UNITS.per_month;
delete PRICE_UNITS.negotiable;

PRICE_UNITS.million = 'Triệu';
PRICE_UNITS.billion = 'Tỷ';
PRICE_UNITS.per_m2 = perM2Label;
PRICE_UNITS.per_month = perMonthLabel;
PRICE_UNITS.negotiable = negotiableLabel;

export const PROPERTY_POST_TYPES = {
  house: 'Nhà riêng',
  villa_townhouse: 'Nhà biệt thự, liền kề',
  street_house: 'Nhà mặt phố',
  shophouse: 'Shophouse, nhà phố thương mại',
  project_land: 'Đất nền dự án',
  land: 'Đất',
  farm_resort: 'Trang trại, khu nghỉ dưỡng',
  condotel: 'Condotel',
  warehouse: 'Kho, nhà xưởng',
  other_property: 'Loại BĐS khác',
};

export const PROPERTY_POST_TYPE_OPTIONS = Object.entries(PROPERTY_POST_TYPES).map(
  ([value, label]) => ({ value, label }),
);

export function getPropertyTypeLabel(value, fallback = 'Bất động sản') {
  if (!value) return fallback;
  return PROPERTY_POST_TYPES[value] || LEGACY_PROPERTY_TYPES[value] || fallback;
}
