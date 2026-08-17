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
