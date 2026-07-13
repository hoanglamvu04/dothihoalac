export function parsePagination(query, defaults = {}) {
  const page = Math.max(Number.parseInt(query.page ?? defaults.page ?? '1', 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(query.limit ?? defaults.limit ?? '20', 10) || 20, 1),
    100,
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) };
}
