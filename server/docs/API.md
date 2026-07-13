# API Reference

Base URL local: `http://localhost:5000/api/v1`

## Auth

| Method | Endpoint                     |     Auth | Mô tả                    |
| ------ | ---------------------------- | -------: | ------------------------ |
| POST   | `/auth/register`             |    Không | Đăng ký                  |
| POST   | `/auth/login`                |    Không | Đăng nhập                |
| POST   | `/auth/logout`               | Tùy chọn | Đăng xuất phiên hiện tại |
| POST   | `/auth/logout-all`           |       Có | Thu hồi mọi phiên        |
| POST   | `/auth/refresh`              |   Cookie | Làm mới token            |
| GET    | `/auth/me`                   |       Có | Người dùng hiện tại      |
| POST   | `/auth/verify-email/request` |       Có | Gửi mã email             |
| POST   | `/auth/verify-email/confirm` |       Có | Xác nhận email           |
| POST   | `/auth/phone/request-otp`    |       Có | Gửi OTP điện thoại       |
| POST   | `/auth/phone/confirm-otp`    |       Có | Xác nhận điện thoại      |
| POST   | `/auth/forgot-password`      |    Không | Quên mật khẩu            |
| POST   | `/auth/reset-password`       |    Không | Đặt lại mật khẩu         |
| PATCH  | `/auth/change-password`      |       Có | Đổi mật khẩu             |

## Người dùng

| Method    | Endpoint                 | Mô tả              |
| --------- | ------------------------ | ------------------ |
| GET       | `/users/:username`       | Hồ sơ công khai    |
| GET/PATCH | `/users/me/profile`      | Xem/cập nhật hồ sơ |
| PATCH     | `/users/me/username`     | Đổi username       |
| GET       | `/users/me/sessions`     | Phiên đăng nhập    |
| DELETE    | `/users/me/sessions/:id` | Thu hồi phiên      |
| GET       | `/users/me/posts`        | Bài của tôi        |
| GET       | `/users/me/listings`     | Tin BĐS của tôi    |
| GET       | `/users/me/bookmarks`    | Nội dung đã lưu    |
| GET       | `/users/me/reports`      | Báo cáo đã gửi     |

## Tin tức

- `GET /articles`
- `GET /articles/:slug`
- `POST /articles/tips`
- `GET/POST/PATCH /admin/articles`

## Cộng đồng

- `GET /community`
- `POST /community`
- `GET /community/:slug`
- `PATCH /community/:id`
- `DELETE /community/:id`
- `POST /community/:id/submit`
- `POST /community/:id/accept-answer`

## Bất động sản

- `GET /properties`
- `POST /properties`
- `GET /properties/:slug`
- `PATCH /properties/:id`
- `POST /properties/:id/submit`
- `POST /properties/:id/renew`
- `POST /properties/:id/mark-sold`
- `POST /properties/:id/mark-rented`
- `POST /properties/:id/contact-events`

## Việc làm

- `GET /jobs`
- `POST /jobs`
- `GET /jobs/:slug`
- `PATCH /jobs/:id`
- `POST /jobs/:id/submit`

## Tương tác

- `GET/POST /contents/:contentId/comments`
- `PATCH/DELETE /comments/:id`
- `PUT/DELETE /reactions/:targetType/:targetId`
- `PUT/DELETE /bookmarks/:contentId`
- `GET /follows`
- `PUT/DELETE /follows/:targetType/:targetId`
- `POST /reports`

## Thông báo

- `GET /notifications`
- `GET /notifications/unread-count`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `DELETE /notifications/:id`
- `GET/PATCH /notification-preferences`

## Lead

- `POST /leads`
- `POST /leads/referrals`

## Admin

- `GET /admin/dashboard`
- `GET /admin/moderation/queue`
- `POST /admin/contents/:id/approve`
- `POST /admin/contents/:id/request-revision`
- `POST /admin/contents/:id/reject`
- `POST /admin/contents/:id/hide`
- `POST /admin/contents/:id/restore`
- `GET /admin/users`
- `PATCH /admin/users/:id/status`
- `GET /admin/reports`
- `PATCH /admin/reports/:id`
- `GET/PATCH /admin/leads`
- `/admin/taxonomy/*`
- `/admin/system/*`
