# ROADMAP — Kế hoạch phát triển và nghiệm thu DTHL

**Định hướng:** triển khai theo task ID, không đánh đồng hoàn thành mã nguồn/CI với hoàn thành nghiệm thu/production.  
**Ngày lập:** 2026-11-25.

## Nhãn trạng thái chuẩn

- `TODO`: chưa bắt đầu
- `IN_PROGRESS`: đang sửa code/thử nghiệm
- `CODE_DONE`: code đã commit, test/merge có thể đang chờ
- `CI_PASS`: kiểm thử tự động đạt trên đúng SHA
- `BLOCKED`: thiếu quyền truy cập, dữ liệu, phụ thuộc hoặc approval
- `STAGING_PASS`: có bằng chứng test staging thực
- `PRODUCTION_PASS`: đã kiểm chứng bản triển khai production, có log/monitor/smoke evidence

Mọi task có thể có nhiều nhãn; ví dụ code `CI_PASS` nhưng phát hành vẫn `BLOCKED`.

## Mốc A — Đã gộp code, chưa nghiệm thu môi trường

| ID | Việc | Hiện trạng | Điều kiện nghiệm thu còn thiếu |
| --- | --- | --- | --- |
| DTHL-P78 | Search P0/P1 + saved-search alerts | CODE_MERGED, CI_PASS | Chạy index/duplicate preflight trên staging |
| DTHL-P79 | Search V2 + Data Trust + Dashboard | CODE_MERGED, CI_PASS | Test UI, RBAC, latency và dữ liệu staging |
| DTHL-P77 | WA-002/WA-005 tích hợp X-HUB | CODE_MERGED, CI_PASS; FEATURE_OFF | Consent, nguồn/tenant/workspace X-HUB, staging pull |
| DTHL-P80 | Production deploy thủ công | CODE_MERGED, CI_PASS | Xác nhận quy trình phát hành, rollback thực |

## Mốc B — Release gates (làm trước khi bật tính năng)

| ID | Priority | Trạng thái | Các bước & điều kiện hoàn thành |
| --- | --- | --- | --- |
| DTHL-R01 | P0 | BLOCKED | Backup + kiểm chứng restore, chạy `cd server && node scripts/preflight-discovery-release.mjs` trên staging; cần **2 unique index + 1 fair-scan scheduler index** và 0 nhóm trùng. Index mới chỉ được tạo sau quy trình bảo trì có thẩm định; công cụ preflight không ghi dữ liệu |
| DTHL-R02 | P0 | BLOCKED | Staging smoke: auth, CMS, CRM, search có dấu/không dấu, gợi ý, filter-only, admin RBAC, user A/B isolation, saved search, notification opt-out và không trùng |
| DTHL-R03 | P0 | BLOCKED | Benchmark/truy vấn EXPLAIN trên staging, responsive, giới hạn API, kiểm tra kế hoạch rollback và quan sát sau nâng cấp |
| DTHL-R04 | P0 | BLOCKED | Ký duyệt WA-002/WA-005: nguồn X-HUB, secret server-side, consent (kể cả DNT/GPC), rate-limit, retention 90 ngày, pull 7/30/90, tenant scope đúng |
| DTHL-R05 | P1 | TODO | SEO live: canonical, sitemap, indexability trang vùng, structured data hợp lệ, tránh URL lọc động được index; đo Core Web Vitals |

## Mốc C — Việc cải tiến tiếp sau nghiệm thu

| ID | Priority | Trạng thái | Đích & tiêu chí chấp nhận |
| --- | --- | --- | --- |
| DTHL-F01 | P1 | IN_PROGRESS / CI_PENDING | Bổ sung lượt claim công bằng theo `lastScanAttemptAt` độc lập cursor, atomic lease đa worker, index xếp lịch + fail-closed. Test MongoDB >80 bộ lọc, tranh chấp claim, tạm dừng/resume và thiếu index. Đợi CI đúng SHA và staging release gate trước khi coi đã phát hành |
| DTHL-F02 | P1 | TODO | QA / accessibility: keyboard navigation, aria-live, focus, empty-state/slow network, lỗi mạng frontend |
| DTHL-F03 | P1 | TODO | Dashboard vận hành: cảnh báo lỗi và độ trễ tổng hợp, không để lộ người dùng/truy vấn riêng tư |
| DTHL-F04 | P2 | TODO | Trùng ảnh nâng cao: **chỉ sau khi có quyền xử lý ảnh và mẫu dữ liệu đánh giá**; metric false-positive/false-negative, không chặn tự động |
| DTHL-F05 | P2 | TODO | Search ML/language ranking: thử nghiệm offline trước, không hứa hẹn thuật toán AI khi mới chỉ có heuristic |
| DTHL-F06 | P2 | TODO | Analytics phát triển dựa trên consent hợp lệ và dữ liệu WA-005 đã được nghiệm thu |

## Mốc D — Quy trình tài liệu cho mọi phiên

| ID | Priority | Trạng thái | Tiêu chí |
| --- | --- | --- | --- |
| DTHL-DOC01 | P0 | CI_PASS | Có `AGENTS.md`, thư mục `luu-y-code/`, Code Notes Gate trên PR/push và test **7/7 PASS** tại [run 45533204875](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45533204875) |
| DTHL-DOC02 | P1 | TODO | Chủ repo bật GitHub Branch Protection/Ruleset yêu cầu **Code Notes Gate** pass trước khi merge để không ai bỏ qua |
| DTHL-DOC03 | P1 | TODO | Sau mỗi sprint kiểm tra link/chứng cứ trong STATUS không lỗi thời, bàn giao tới AI mới theo HANDOFF |

### Khi nhận task mới

Giữ task ID cũ nếu là tiếp tục cùng phạm vi. Nếu mới, tạo `DTHL-F07` ... trong bảng, mô tả acceptance criteria và phụ thuộc, ghi vào CHANGELOG; cập nhật STATUS khi bắt đầu/kết thúc.
