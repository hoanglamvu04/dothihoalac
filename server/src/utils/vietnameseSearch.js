// Shared, deterministic Vietnamese search normalization. No user input is
// interpolated as regular-expression syntax.
const GROUPS = Object.freeze({
  a: 'aàáạảãâầấậẩẫăằắặẳẵ',
  e: 'eèéẹẻẽêềếệểễ',
  i: 'iìíịỉĩ',
  o: 'oòóọỏõôồốộổỗơờớợởỡ',
  u: 'uùúụủũưừứựửữ',
  y: 'yỳýỵỷỹ',
  d: 'dđ',
});

const ALIASES = new Map([
  ['bds', 'bat dong san'],
  ['nha dat', 'bat dong san'],
  ['dhqg', 'dai hoc quoc gia'],
  ['kcn', 'khu cong nghiep'],
  ['kdt', 'khu do thi'],
  ['qhoach', 'quy hoach'],
]);

export function foldVietnamese(value = '') {
  return String(value).toLocaleLowerCase('vi-VN')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSearchQuery(value = '') {
  const folded = foldVietnamese(value);
  return ALIASES.get(folded) || folded;
}

// Synonym variants stay within the same bounded regex; none is free-form user regex.
const SYNONYM_VARIANTS = new Map([
  ['bat dong san', ['bat dong san', 'nha dat', 'bds']],
  ['dai hoc quoc gia', ['dai hoc quoc gia', 'dhqg']],
  ['khu cong nghiep', ['khu cong nghiep', 'kcn']],
  ['khu do thi', ['khu do thi', 'kdt']],
  ['quy hoach', ['quy hoach', 'qhoach']],
]);

export function vietnameseSearchRegex(value = '') {
  const folded = normalizeSearchQuery(value).slice(0, 100);
  if (!folded) return null;
  const variants = SYNONYM_VARIANTS.get(folded) || [folded];
  const patterns = variants.map((variant) => {
    const terms = variant.split(' ').slice(0, 10);
    return terms.map((term) =>
      [...term].map((character) => {
        const group = GROUPS[character];
        return group ? '[' + group + ']' : character;
      }).join(''),
    ).join('\\s+');
  });
  return new RegExp(patterns.length > 1 ? '(?:' + patterns.join('|') + ')' : patterns[0], 'i');
}

export function normalizedTitleTokens(value = '') {
  return [...new Set(foldVietnamese(value).split(' ').filter((token) => token.length >= 2))].slice(0, 32);
}

export function tokenSimilarity(a, b) {
  const first = new Set(normalizedTitleTokens(a));
  const second = new Set(normalizedTitleTokens(b));
  if (!first.size || !second.size) return 0;
  let common = 0;
  for (const token of first) if (second.has(token)) common += 1;
  return common / (first.size + second.size - common);
}
