# Đô Thị Hòa Lạc API Server

Backend chính thức cho dự án **dothihoalac.vn**, thuộc hệ sinh thái XSpace - Media Space.

## Công nghệ

- Node.js 20+
- Express 5
- MongoDB + Mongoose
- JWT access/refresh token qua `httpOnly cookie`
- Zod validation
- Multer + Sharp cho upload ảnh
- Pino cho logging
- Node test runner + Supertest

## 1. Cài đặt

```bash
cd server
npm install
cp .env.example .env
```

Trên Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và thay các secret, MongoDB URI, SMTP và SMS provider khi cần.

## 2. Chạy MongoDB

Mặc định local:

```env
MONGO_URI=mongodb://127.0.0.1:27017/dothihoalac
```

Có thể thay bằng MongoDB Atlas. Không commit `.env` lên Git.

## 3. Seed dữ liệu nền

Lệnh seed tạo:

- role và permission;
- tài khoản quản trị đầu tiên;
- chuyên mục tin tức nền;
- khu vực Hòa Lạc ban đầu.

```bash
npm run seed
```

Thông tin admin lấy từ:

```env
ADMIN_EMAIL=admin@dothihoalac.vn
ADMIN_PASSWORD=change_me_admin_password
```

Hãy đổi mật khẩu trước khi chạy ở môi trường thật.

## 4. Chạy server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Health check:

```text
GET http://localhost:5000/api/v1/health
```

## 5. Chạy kiểm thử và kiểm tra code

```bash
npm test
npm run lint
npm run format
```

## 6. Cấu trúc chính

```text
server/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── constants/
│   ├── middlewares/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── contents/
│   │   ├── articles/
│   │   ├── community/
│   │   ├── properties/
│   │   ├── jobs/
│   │   ├── taxonomy/
│   │   ├── media/
│   │   ├── comments/
│   │   ├── reactions/
│   │   ├── bookmarks/
│   │   ├── follows/
│   │   ├── notifications/
│   │   ├── reports/
│   │   ├── moderation/
│   │   ├── search/
│   │   ├── leads/
│   │   └── system/
│   ├── services/
│   ├── jobs/
│   ├── routes/
│   ├── utils/
│   ├── seeds/
│   └── templates/emails/
├── tests/
├── uploads/
├── logs/
├── docs/
├── .env.example
├── package.json
└── README.md
```

## 7. Chuẩn response

Thành công:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Lỗi:

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ.",
  "code": "VALIDATION_ERROR",
  "errors": [],
  "requestId": "..."
}
```

## 8. Auth cookie

Server sử dụng hai cookie:

- `dthl_access`: access token ngắn hạn;
- `dthl_refresh`: refresh token dài hạn.

Frontend cần bật:

```js
axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true,
});
```

Không lưu JWT vào `localStorage`.

## 9. Luồng nội dung

```text
draft
→ pending_review
→ approved
→ published
```

Các nhánh bổ sung:

```text
pending_review → needs_revision → pending_review
pending_review → rejected
published → hidden → published
published → archived
published → expired
```

## 10. Upload ảnh

Development lưu ảnh vào `server/uploads` và trả URL `/uploads/...`.

Ảnh được:

- kiểm tra MIME;
- giới hạn dung lượng;
- tự xoay theo metadata;
- resize tối đa;
- chuyển WebP;
- lưu metadata trong collection `media`.

Production nên thay adapter local bằng Cloudinary, S3 hoặc dịch vụ tương đương.

## 11. Email và SMS

Nếu chưa cấu hình SMTP hoặc SMS, server vẫn chạy. Trong development, mã xác thực/token thử nghiệm được trả trong response khi:

```env
EXPOSE_DEV_TOKENS=true
```

Tuyệt đối đặt thành `false` trong production.

## 12. Scheduler

Scheduler chạy định kỳ để:

- xuất bản bài đã lên lịch;
- hết hạn tin bất động sản;
- hết hạn tin việc làm;
- dọn token cũ;
- dọn media đã đánh dấu xóa.

Có thể tắt bằng:

```env
SCHEDULER_ENABLED=false
```

## 13. Các nhóm API

| Prefix                          | Chức năng                                   |
| ------------------------------- | ------------------------------------------- |
| `/api/v1/auth`                  | Đăng ký, đăng nhập, xác thực, quên mật khẩu |
| `/api/v1/users`                 | Hồ sơ, session, bài của tôi                 |
| `/api/v1/articles`              | Tin tức và gửi tin tòa soạn                 |
| `/api/v1/community`             | Bài cộng đồng                               |
| `/api/v1/properties`            | Tin bất động sản                            |
| `/api/v1/jobs`                  | Tin việc làm                                |
| `/api/v1/taxonomy`              | Chuyên mục, thẻ, khu vực                    |
| `/api/v1/media`                 | Upload và quản lý media                     |
| `/api/v1/contents/:id/comments` | Bình luận                                   |
| `/api/v1/reactions`             | Cảm xúc                                     |
| `/api/v1/bookmarks`             | Lưu bài                                     |
| `/api/v1/follows`               | Theo dõi                                    |
| `/api/v1/notifications`         | Thông báo                                   |
| `/api/v1/reports`               | Báo cáo vi phạm                             |
| `/api/v1/search`                | Tìm kiếm                                    |
| `/api/v1/leads`                 | Lead Kiến Trúc Hòa Lạc/Mely Space           |
| `/api/v1/admin`                 | Kiểm duyệt và quản trị                      |

Xem chi tiết tại `docs/API.md`.

## 14. Lưu ý production

Trước khi deploy:

1. Đổi toàn bộ JWT secret và mật khẩu admin.
2. Đặt `NODE_ENV=production`.
3. Đặt `COOKIE_SECURE=true`.
4. Cấu hình domain cookie và CORS chính xác.
5. Dùng HTTPS.
6. Dùng storage cloud thay local upload.
7. Cấu hình SMTP/SMS thật.
8. Bật backup MongoDB.
9. Dùng process manager hoặc container orchestration.
10. Thiết lập giám sát log và cảnh báo lỗi.

## Dữ liệu seed phát triển

Bộ seed mới tạo đầy đủ dữ liệu mẫu cho tài khoản, phân quyền, taxonomy, tin tức, cộng đồng, bất động sản, việc làm, tương tác, thông báo, kiểm duyệt, lead và cấu hình hệ thống.

```bash
# Seed idempotent: chạy lại không tạo dữ liệu trùng
npm run seed

# Chỉ seed dữ liệu lõi: quyền, vai trò, admin và taxonomy
npm run seed:core

# Xóa toàn bộ dữ liệu trong database development rồi seed lại
npm run seed:reset
```

`seed:reset` bị chặn hoàn toàn khi `NODE_ENV=production`.

Mật khẩu mặc định cho các tài khoản demo là `Demo@123456`. Có thể thay bằng biến môi trường:

```env
SEED_USER_PASSWORD=MatKhauDemoManhCuaBan
```
