# DTHL — Sprint 4–6: Search Intelligence, Data Trust & Release Matrix

**Nhánh:** feat/dthl-sprint4-6-discovery-data-trust-20261125  
**PR:** #79 (Draft), phụ thuộc PR #78 (Draft)  
**Phạm vi:** DTHL (không gộp WA-002/WA-005, PR #77)  
**Môi trường đã kiểm thử:** GitHub Actions + MongoDB 7 CI cô lập. **Chưa** kiểm thử với MongoDB staging/VPS hay production thật.

## Hạng mục đã triển khai trên nhánh (cần nghiệm thu staging trước khi release)

- **Search V2**: /api/v1/search/suggest với từ khóa tiếng Việt có/không dấu, từ viết tắt và sửa lỗi đánh máy phạm vi từ điển; gợi ý chỉ từ nội dung public/published và taxonomy area active. Typeahead frontend debounce 200ms + hủy request cũ. API giới hạn 90 request/phút/IP, tối đa 8 gợi ý và Mongo maxTimeMS=2.5s, cache HTTP 15s.
- **Lọc nâng cao**: theo ngày xuất bản 7/30/90 ngày; đối với BĐS: giá tổng VND, diện tích đất, loại tài sản/giao dịch, thứ tự giá hoặc lượt xem. Truy vấn $lookup/$facet theo điều kiện Mongo, không dùng ID-list cắt cụt để làm sai tổng/phân trang. Loại trừ tin private, chưa duyệt, đã xóa, đã bán/thuê, hết hạn.
- **Search ranking**: giữ text relevance khi có index, thêm mới nhất/phổ biến và sort giá. Đây là heuristic/ranking rules chứ chưa phải learning-to-rank AI.
- **Không có kết quả**: hiển thị gợi ý sửa lỗi/keyword thay thế, không trả về riêng tư.
- **Gợi ý cá nhân chủ động**: chỉ khi người dùng bấm "Xem gợi ý" trong Tìm kiếm đã lưu. Sử dụng tối đa 3 bộ lọc đã lưu của chính tài khoản, loại tin trùng và chỉ trả nội dung công khai. Không tạo hồ sơ theo dõi ngầm hay gửi tới bên thứ ba. Không phải semantic AI recommendation.
- **Data Trust V2**: gợi ý các bài BĐS gần trùng bằng tương đồng tiêu đề, loại hình, ảnh đại diện đã lưu, khu vực, diện tích, giá và số liên hệ. Phân biệt căn/phòng có mã khác nhau; điểm chỉ dùng hỗ trợ duyệt, **không tự ẩn/xóa/chặn bài**. Không truy xuất hoặc gửi ảnh để làm perceptual hash. Chấm điểm *đầy đủ thông tin*, không đánh đồng với xác minh pháp lý hay độ tin cậy của người đăng.
- **BĐS tương tự**: endpoint /api/v1/properties/:slug/related chỉ dùng tin đang published/public, còn hiệu lực, chưa bán/thuê; xếp theo khu vực/loại hình/diện tích/giá và chỉ xuất các trường public, không xuất số liên hệ/PII.
- **Trung tâm thông báo**: lọc loại saved_search_match theo từng tài khoản, nhóm thông báo theo ngày, bật/tắt qua NotificationPreference thực. Server validate danh sách loại thông báo/giá trị boolean và chỉ $set trường được cho phép; tránh mass assignment và chỉnh tài khoản khác.
- **Data-quality dashboard**: GET /api/v1/admin/system/discovery-overview dành riêng cho MANAGE_SYSTEM. Thống kê tổng số nội dung công khai, thiếu ảnh/khu vực/tóm tắt, các khu vực có nội dung mới, active saved-searches, notification count (7/30/90 ngày). Không trả truy vấn cá nhân, email, GPS, IP hay dữ liệu WA.
- **Khu vực & SEO**: tái sử dụng trang /khu-vuc/:slug đã có canonical/JSON-LD/BreadcrumbList và nội dung theo khu vực; tìm kiếm động tiếp tục noindex. Chưa tự tạo nội dung SEO từ dữ liệu không được xác minh.
- **Hiệu năng**: giới hạn lượng truy vấn, các API autocomplete/related có cache công khai TTL ngắn, Mongo queries bounded, có đơn vị giá cụ thể; frontend debounce; dùng các index hiện hữu, cần EXPLAIN trên staging trước tối ưu index bổ sung.

## Nghiệm thu dựa trên 25 hạng mục trước đó

| # | Công việc | Tình trạng |
|---|---|---|
| 1 | Mongo staging index/backup | **BLOCKED: chưa có truy cập staging** |
| 2 | Search correctness | CI unit + Mongo E2E chạy, staging còn thiếu |
| 3 | Cross-account isolation | CI Mongo E2E chạy, staging còn thiếu |
| 4 | Alert idempotency | CI Mongo E2E chạy, chưa bật production |
| 5 | High-load / PM2 perf | Lease CI, **chưa kiểm thử tải thực tế** |
| 6 | Security review | RBAC/PII test CI, **chưa audit pen-test** |
| 7 | Merge PR #78 | **BLOCKED** bởi nghiệm thu staging |
| 8 | VPS rollout/rollback | **BLOCKED** bởi quyền truy cập & release gate |
| 9 | Autocomplete | Code + CI |
| 10 | Ranking rules V2 | Code + CI; chưa ML model |
| 11 | Advanced search filters | Code + CI |
| 12 | Spell hint | Code + CI (từ điển hạn chế) |
| 13 | Zero-results suggestions | Code + CI |
| 14 | Personalization | Code + CI, chỉ on-demand từ bộ lọc user chọn |
| 15 | Duplicate detection | Heuristic code + CI; chưa perceptual hash |
| 16 | Completeness score / risk | Code + CI, không xác minh pháp lý |
| 17 | Related properties | Code + CI |
| 18 | Topic/area follows | PR #78 saved-searches + trang area, trong code |
| 19 | Notification center | Code + CI |
| 20 | Area hub | Existing site + PR #78, cần UX acceptance |
| 21 | Quality dashboard | Code + CI, admin RBAC |
| 22 | Search behavior analytics | **BLOCKED: consent/WA-002/WA-005 PR #77 chưa nghiệm thu** |
| 23 | SEO area | Trang khu vực hiện có canonical + structured data; cần audit live crawler |
| 24 | Performance + cache | Bounded queries/TTL code + CI; chưa load test VPS |
| 25 | X-HUB integration | **BLOCKED**: giữ PR #77 riêng, cần X-HUB duyệt DB/power |

**Không được diễn giải CI PASS là website đã triển khai production, hoặc 25/25 đã hoàn thành vận hành.**

## Release checklist — cần làm trên staging trước khi merge/deploy

1. Tạo bản sao MongoDB staging từ dữ liệu phù hợp, che thông tin cá nhân khi dùng cho QA; kiểm tra backup/restore có thể hoàn nguyên.
2. Pull code PR #78 trên staging (không deploy production). Trong \`server\`, chạy \`node scripts/verify-discovery-indexes.mjs\` và \`node scripts/preflight-discovery-release.mjs\` trong chế độ chỉ đọc. PASS nghĩa có đủ unique indexes và 0 duplicate groups.
3. Test tài khoản A/B, quyền quản trị, chức năng lưu/tạm dừng/bật lại bộ lọc, thông báo không trùng, opt-out, API chỉ xuất public. Giữ \`SAVED_SEARCH_ALERTS_ENABLED=false\` cho tới khi gate PASS.
4. Smoke test tìm kiếm, typeahead, giá/diện tích, khu vực, kết quả không có tin, 404/422, SEO schema/canonical, responsive mobile, quản trị chất lượng nội dung.
5. EXPLAIN trên dữ liệu staging và kiểm tra latency/pagination tối đa; bổ sung index bằng change plan riêng nếu cần, không tự chạy migration làm thay đổi production.
6. Kiểm tra WA-002/WA-005 theo PR #77, dữ liệu consent và secret chỉ server-side; chỉ bật khi đã được X-HUB nghiệm thu.
7. Khi mọi gate đạt, merge PR #78 trước, sau đó rebase/retarget PR #79, chạy lại toàn bộ CI và staging E2E rồi mới được merge PR #79. Rollout theo từng flag kèm giám sát log/metrics và quy trình rollback.

Các API hiện tại chỉ dùng MongoDB truy vấn nội bộ; **không tự gửi sự kiện tracking mới sang X-HUB**. Tham chiếu checklist P0/P1 cũ: \`docs/PHASE_1_2_SEARCH_DISCOVERY_ALERTS.md\`.

## F07 — Client search filter request (2026-11-25)

Khắc phục UI có bộ lọc nâng cao nhưng request tìm kiếm thiếu các query params. Frontend gửi whitelist `days` và trường giá/diện tích/loại/giao dịch BĐS đúng tab; thay URL chỉ filters phải tải kết quả mới. Unit test frontend xác minh chuyển URL sang API, còn staging E2E vẫn cần kiểm tra với dữ liệu thật. Không thay đổi analytics X-HUB hay dữ liệu production.
