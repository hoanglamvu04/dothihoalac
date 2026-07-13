# Bản đồ route client

## Công khai

- `/` – Trang chủ.
- `/tin-tuc`, `/tin-tuc/:slug` – Danh sách và chi tiết tin tức.
- `/cong-dong`, `/cong-dong/:slug` – Bảng tin và chi tiết cộng đồng.
- `/nha-dat`, `/nha-dat/:slug` – Bất động sản.
- `/viec-lam`, `/viec-lam/:slug` – Việc làm.
- `/tim-kiem` – Tìm kiếm toàn hệ thống.
- `/khu-vuc/:slug` – Trang tổng hợp khu vực.
- `/thanh-vien/:username` – Hồ sơ công khai.
- `/lien-he`, `/gioi-thieu`, `/dieu-khoan-su-dung`, `/chinh-sach-quyen-rieng-tu`.

## Xác thực và đăng nội dung

- `/dang-nhap`, `/dang-ky`, `/quen-mat-khau`, `/dat-lai-mat-khau/:token`.
- `/xac-thuc-email`, `/xac-thuc-so-dien-thoai`.
- `/dang-bai`, `/dang-bai/cong-dong`, `/dang-bai/nha-dat`, `/dang-bai/viec-lam`.
- `/gui-tin` – Gửi thông tin cho Ban biên tập.

## Tài khoản

- `/tai-khoan` cùng các route con: hồ sơ, bảo mật, phiên đăng nhập, thông báo, bài viết, tin nhà đất, nội dung đã lưu và báo cáo.

## Quản trị

- `/quan-tri` cùng các route con: kiểm duyệt, bài viết, người dùng, báo cáo, khách hàng tiềm năng, phân loại, hệ thống và nhật ký.
