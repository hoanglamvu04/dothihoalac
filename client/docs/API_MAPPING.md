# Ánh xạ API

Client gọi server qua `VITE_API_URL`, mặc định là `http://localhost:5000/api/v1`.

- `auth.api.js`: đăng ký, đăng nhập, cookie access/refresh, xác thực và mật khẩu.
- `content.api.js`: tin tức, cộng đồng, bất động sản, việc làm, tìm kiếm và trang hệ thống.
- `interaction.api.js`: bình luận, cảm xúc, lưu bài, theo dõi, thông báo và báo cáo.
- `user.api.js`: hồ sơ, phiên đăng nhập, nội dung cá nhân.
- `taxonomy.api.js`: danh mục, khu vực, thẻ.
- `media.api.js`: tải ảnh và quản lý media.
- `lead.api.js`: yêu cầu tư vấn và lượt chuyển sang thương hiệu thành viên.
- `admin.api.js`: dashboard, kiểm duyệt, người dùng, báo cáo, lead, bài biên tập, taxonomy và cấu hình.

Axios luôn bật `withCredentials`. Khi API trả `401`, interceptor thử gọi `/auth/refresh` một lần rồi lặp lại request ban đầu.
