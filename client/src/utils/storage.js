const KEYS = {
  recentSearches: 'dthl_recent_searches',
};

export function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.recentSearches) || '[]');
  } catch {
    return [];
  }
}

export function saveRecentSearch(term) {
  const clean = String(term || '').trim();
  if (!clean) return;
  const items = [clean, ...getRecentSearches().filter((item) => item !== clean)].slice(0, 8);
  localStorage.setItem(KEYS.recentSearches, JSON.stringify(items));
}
