# DTHL – Hai đợt nâng cấp tìm kiếm, chất lượng và khám phá nội dung

Phạm vi: `hoanglamvu04/dothihoalac`. Nhánh này xuất phát từ `main` và không bao gồm WA-002/WA-005 (PR #77).

## Đợt 1 – Chất lượng lõi (P0)

- Tìm kiếm chung: chuẩn hóa dấu tiếng Việt, một số từ viết tắt địa phương, từ khóa tới 100 ký tự; dùng MongoDB text index khi có kết quả, regex tiếng Việt đã giới hạn/escape để làm fallback; sắp xếp mới nhất hoặc mức khớp text. Giữ bộ lọc loại nội dung, khu vực và user/area.
- Hàng chờ kiểm duyệt: cảnh báo tiêu đề gần trùng (token/Jaccard), tiêu đề ngắn, mô tả thiếu, quá nhiều liên kết. Chỉ so dữ liệu công khai, đã xuất bản trong cửa sổ tối đa 120 ngày và hàng chờ có quyền tương ứng. **Cảnh báo không tự duyệt, từ chối hoặc xóa bài**.
- Giữ nguyên RBAC, CMS, authentication, cấu hình production và hệ thống lead. Không thêm AI bên thứ ba hoặc gọi dịch vụ bên ngoài.

## Đợt 2 – Khám phá & quay lại (P1)

- `GET /api/v1/articles/:slug/related`: điểm dựa trên cùng chuyên mục/khu vực, thẻ, độ tương đồng tiêu đề và độ mới, tối đa 8 gợi ý; chỉ bài published/public. Giao diện chi tiết bài dùng gợi ý API, fallback sang danh sách hiện có nếu lỗi.
- Lưu tìm kiếm có đăng nhập tại `GET/POST /api/v1/saved-searches` và `PATCH/DELETE /api/v1/saved-searches/:id`: người dùng tự chủ động theo dõi hoặc hủy theo dõi tối đa 20 bộ lọc (từ khóa, loại nội dung, khu vực). Không tạo subscription ngầm từ lịch sử tìm kiếm.
- Job nền (khi `SCHEDULER_ENABLED=true`) chạy cùng chu kỳ bảo trì 5 phút, kiểm tra nội dung mới **đã xuất bản và công khai**; gửi thông báo **trong tài khoản**, không gửi SMS/email/push. Sử dụng cursor thời gian + ID và khóa unique `recipientId + dedupeKey` để chống gửi trùng khi retry. Người dùng có thể tạm dừng, bật lại, xóa bộ lọc.
- Trang khu vực: có thêm việc làm được gắn vào khu vực, nút theo dõi tin mới; trang tìm kiếm hỗ trợ lọc chỉ theo khu vực và lưu các bộ lọc. Tài khoản có mục “Tìm kiếm đã lưu”.

## Quyền riêng tư & vận hành

- Saved searches chỉ trả về cho chính tài khoản đã đăng nhập, không công khai truy vấn cá nhân.
- Notification không chứa email, số điện thoại hay thông tin form; chỉ tiêu đề bài và đường dẫn nội bộ.
- Data model mới: MongoDB `savedsearches`; `notifications` bổ sung `dedupeKey` và index unique một phần. Kiểm tra việc build index trên MongoDB staging, đặc biệt dữ liệu cũ; rollback phải giữ dữ liệu trước khi đổi schema.
- Không tự triển khai VPS, không thay đổi nginx/PM2 hay secret. Sau khi review và CI PASS, cần thử nghiệm tìm kiếm tiếng Việt, tài khoản A/B, quyền kiểm duyệt, thông báo 1 lần, tạm dừng và reactivation trên staging.
- Đây là heuristic/rule-based v1, **chưa** bao gồm AI semantic search, spell correction tổng quát, perceptual image hash, cảnh báo giá nhà đất, email digest hay tối ưu hoá ML. Các bước đó cần dữ liệu và nghiệm thu riêng.

## API & kiểm tra

- Test: `cd server && npm test && npm run lint`.
- Frontend: `cd client && npm run lint && npm run build`.
- API public có thể gọi với keyword hoặc khu vực: `/api/v1/search?q=hoa+lac&type=article`, `/api/v1/search?area=thach-that&type=property`.
- API related: `/api/v1/articles/:slug/related`.
- API saved search: body `{ "query":"Hòa Lạc", "contentType":"property", "area":"thach-that" }`; để theo dõi toàn khu vực dùng `{ "area":"thach-that" }`.
- Sau khi tạo subscription, `lastScannedAt` lấy thời điểm tạo: không gửi lại nội dung cũ.


## Nghiệm thu MongoDB thực, gate staging (CI 2026-11-24)

Bổ sung job **MongoDB saved-search acceptance (isolated DB)** trên GitHub Actions:
- MongoDB 7.0 container riêng, database \`dthl_pr78_ci\`, không dùng dữ liệu production; chỉ chạy khi \`NODE_ENV=test\`, \`DTHL_MONGO_E2E=true\` và URI localhost đúng tên CI.
- Kết nối hai user test qua JWT thật: kiểm tra tạo và tìm kiếm trùng, quyền A/B cho GET/PATCH/DELETE, bật/tạm dừng, thông báo in-app.
- Tạo nội dung published/private/pending/ngoài khu vực/tin cũ. Chỉ bài phù hợp và công khai được thông báo.
- Gửi cùng một tin khớp nhiều bộ lọc: MongoDB partial unique index chống gửi lặp sau retry. Hai tài khoản nhận thông báo độc lập. Người dùng có thể tắt notification preference.
- Kiểm tra index compound \`saved_search_per_user_unique\` và partial \`unique_notification_dedupe\` trên database thực.
- Job CI chạy lệnh kiểm tra index **chỉ đọc** để chứng minh quy trình nghiệm thu có thể dùng lại.

### Lệnh kiểm tra index trên staging/VPS (chỉ đọc)

Trong thư mục \`server\` đã có \`.env\` của môi trường cần kiểm tra:

\`\`\`bash
node scripts/verify-discovery-indexes.mjs
\`\`\`

Script chỉ kết nối và truy vấn danh sách index. Nó **không chạy migration**, không tạo index, không sửa schema, không tiết lộ URL kết nối hay dữ liệu cá nhân trong output. \`status: PASS\` nghĩa là hai index cần thiết đã tồn tại; \`FAIL\` nghĩa là chưa đủ điều kiện nghiệm thu. Cần tạo index đúng quy trình bảo trì **sau khi sao lưu và kiểm tra dữ liệu trùng**, không tự tạo trong script.

**Phân biệt rõ:** MongoDB 7 CI hoàn toàn đã được kiểm thử; MongoDB trên VPS/staging thực tế chưa được kiểm tra bằng kết nối trong ChatGPT. Giữ PR ở Draft cho đến khi nghiệm thu staging riêng.
