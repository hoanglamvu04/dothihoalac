import { propertyApi } from '../api/content.api';

const DEFAULT_PROPERTY_PAGE_SIZE = 8;
const PAGING_GUARD = Symbol.for('dthl.property-marketplace-paging');

// Keep explicit limits from widgets/callers, but make the full marketplace
// genuinely paginated instead of receiving the API's larger default page.
if (!propertyApi[PAGING_GUARD]) {
  const list = propertyApi.list;

  propertyApi.list = (params = {}, config = {}) =>
    list(
      {
        limit: DEFAULT_PROPERTY_PAGE_SIZE,
        ...params,
      },
      config,
    );

  Object.defineProperty(propertyApi, PAGING_GUARD, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}
