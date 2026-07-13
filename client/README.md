# Client Đô Thị Hòa Lạc

Frontend React + Vite, toàn bộ component dùng JSX. Client được viết để làm việc với bộ server Node.js + Express + MongoDB đã bàn giao trước đó.

## 1. Yêu cầu

- Node.js 20 trở lên.
- Server chạy ở `http://localhost:5000`.
- MongoDB đã kết nối và server đã chạy seed.

## 2. Cài đặt

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

Trên macOS/Linux:

```bash
cp .env.example .env
```

Mở `http://localhost:5173`.

## 3. Cấu hình server cần khớp

Trong `.env` của server:

```env
CLIENT_URL=http://localhost:5173
APP_URL=http://localhost:5173
```

Cookie xác thực được gửi bằng `withCredentials: true`.

## 4. Các phân hệ đã có giao diện

- Trang chủ tổng hợp.
- Tin tức, chi tiết tin.
- Cộng đồng, chi tiết bài cộng đồng.
- Bất động sản, bộ lọc, chi tiết tin.
- Việc làm, chi tiết tin.
- Tìm kiếm, trang khu vực, hồ sơ công khai.
- Đăng ký, đăng nhập, quên mật khẩu, đặt lại mật khẩu.
- Xác thực email, số điện thoại.
- Hồ sơ tài khoản, bảo mật, phiên đăng nhập.
- Thông báo, bài đã lưu, bài của tôi, tin BĐS của tôi, báo cáo.
- Đăng bài cộng đồng, đăng BĐS, đăng việc làm, gửi tin cho Ban biên tập.
- Form tư vấn Kiến Trúc Hòa Lạc và Mely Space.
- Dashboard quản trị, kiểm duyệt, bài báo, người dùng, báo cáo, lead, taxonomy và hệ thống.

## 5. Lưu ý tương thích với server hiện tại

Server hiện chưa có endpoint lấy chi tiết bản nháp theo ID. Vì vậy:

- Client tạo bài mới, gửi duyệt và quản lý trạng thái đầy đủ.
- Khi sửa bản nháp từ danh sách, client dùng dữ liệu đang có trong lịch sử điều hướng; nội dung HTML cũ có thể không tải lại được sau khi refresh trang.
- Nên bổ sung sau các endpoint như `GET /users/me/posts/:id` và `GET /admin/articles/:id` để chỉnh sửa bản nháp hoàn chỉnh.

## 6. Build

```bash
npm run lint
npm run build
npm run preview
```

Thư mục build là `dist`.
