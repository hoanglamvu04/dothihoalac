export function canEditArticle({ userId, permissions = [] }, content) {
  return (
    String(content.authorId) === String(userId) ||
    permissions.includes('edit_article') ||
    permissions.includes('manage_system')
  );
}

export function canPublishArticle({ permissions = [] }) {
  return permissions.includes('publish_article') || permissions.includes('manage_system');
}
