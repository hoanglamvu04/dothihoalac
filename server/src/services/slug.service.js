import slugify from 'slugify';

export function createSlugBase(value) {
  return (
    slugify(String(value || 'noi-dung'), { lower: true, strict: true, locale: 'vi', trim: true }) ||
    'noi-dung'
  );
}

export async function createUniqueSlug(model, value, { excludeId, field = 'slug' } = {}) {
  const base = createSlugBase(value);
  let candidate = base;
  let counter = 1;
  while (
    await model.exists({ [field]: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
  ) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}
