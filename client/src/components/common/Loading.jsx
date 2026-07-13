export function LoadingBlock({ label = 'Đang tải dữ liệu...' }) {
  return (
    <div className="loading-block" role="status">
      <span className="loading-spinner" />
      <span>{label}</span>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="page-loading" role="status">
      <span className="loading-spinner loading-spinner--large" />
      <strong>Đang tải Đô Thị Hòa Lạc...</strong>
    </div>
  );
}
