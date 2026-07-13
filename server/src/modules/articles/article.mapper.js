export function mapArticleResponse(content, article, body) {
  return {
    ...content,
    article,
    body,
  };
}
