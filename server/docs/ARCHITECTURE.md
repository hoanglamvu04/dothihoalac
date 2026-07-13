# Kiến trúc backend

## Module-first

Mỗi nghiệp vụ được đặt trong một module riêng. Route chỉ ghép middleware và controller. Controller nhận request và trả response. Service xử lý nghiệp vụ. Model chịu trách nhiệm schema, index và validation dữ liệu.

## Content core

`contents` lưu phần chung của mọi loại nội dung. Dữ liệu dài nằm trong `contentbodies`. Dữ liệu riêng nằm trong:

- `articles`;
- `communityposts`;
- `propertylistings`;
- `jobposts`.

Mỗi `Content` chỉ gắn với đúng một bản ghi chuyên biệt tương ứng `contentType`.

## Auth

- access token ngắn hạn;
- refresh token dài hạn;
- cả hai nằm trong httpOnly cookie;
- refresh token được băm trong `usersessions`;
- hỗ trợ thu hồi từng session hoặc toàn bộ session.

## Phân quyền

RBAC gồm:

- `roles`;
- `permissions`;
- `userroles`;
- `rolepermissions`.

Middleware có hai lớp:

- `requireRole`;
- `requirePermission`.

## Soft delete

Content, comment, media và user quan trọng không xóa cứng ngay. Trường `deletedAt` và trạng thái được dùng để lưu lịch sử kiểm duyệt.

## Lead hệ sinh thái

`leadrequests` tiếp nhận nhu cầu có sự đồng ý rõ ràng của người dùng. `assignedBrand` điều phối sang Kiến Trúc Hòa Lạc, Mely Space, Media Space hoặc XSpace. `referralevents` dùng đo lượt chuyển giữa các website.
