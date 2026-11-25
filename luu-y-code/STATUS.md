# STATUS — Trạng thái thực tế dự án DTHL

**Cập nhật lần đầu:** 2026-11-25 (Asia/Bangkok, UTC+07).  
**Repository:** `hoanglamvu04/dothihoalac`  
**Mốc GitHub đối chiếu:** `main` tại `0353d9666a13b6b167f40273f033a23801d5d732` trước đợt F08 (kiểm tra lại `main` khi đọc).  
**Mốc CI PR gần nhất đã xác minh:** F01 [45535284175](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535284175) PASS; F07 [45535697220](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535697220) PASS. CI push `main` commit merge #82 **PASS toàn bộ**: [ứng dụng run 45535845423](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535845423) (server/client/MongoDB), [frontend 45535845436](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535845436), [Code Notes Gate 45535845546](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535845546).
**Trạng thái tổng thể:** F01/F07 `CODE_MERGED` + `CI_PASS`; F08 `CODE_DONE / CI_PENDING` trên nhánh chưa merge; **STAGING_CHƯA_NGHIỆM_THU**; **PRODUCTION_CHƯA_TRIỂN_KHAI_BẢN_MỚI**.

## 1. Bằng chứng có thể kiểm tra

| Hạng mục | Tình trạng đã xác minh | Tham chiếu |
| --- | --- | --- |
| PR #80 — deployment chạy thủ công | **MERGED** vào `main` | [PR #80](https://github.com/hoanglamvu04/dothihoalac/pull/80) |
| PR #78 — tìm kiếm P0/P1, saved searches, alerts | **MERGED** vào `main` | [PR #78](https://github.com/hoanglamvu04/dothihoalac/pull/78) |
| PR #79 — Search V2, Data Trust V2, dashboard | **MERGED** vào `main` | [PR #79](https://github.com/hoanglamvu04/dothihoalac/pull/79) |
| PR #77 — WA-002/WA-005 consent-gated analytics | **MERGED**, giữ mặc định OFF | [PR #77](https://github.com/hoanglamvu04/dothihoalac/pull/77) |
| CI ứng dụng trên `main` sau cả 4 PR | **SUCCESS** (server/client/MongoDB E2E) | [Run 45451224478](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45451224478) |
| CI frontend trên `main` | **SUCCESS** | [Run 45451223715](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45451223715) |
| Triển khai VPS từ commit trên | **CHƯA thực hiện trong các lượt merge**; cần kiểm tra riêng trạng thái môi trường thực | [Deploy workflow](https://github.com/hoanglamvu04/dothihoalac/actions/workflows/deploy-api.yml) |
| DTHL-DOC01 — Code Notes Gate & tài liệu bàn giao | **CI_PASS**: 7/7 test, kiểm tra đủ STATUS + CHANGELOG | [Run 45533204875](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45533204875) |
| DTHL-DOC01 — ứng dụng không bị ảnh hưởng | **CI_PASS** trên mốc `fdc41b4`: backend 90 PASS/1 SKIP; frontend 31 PASS; Mongo E2E 18 PASS | [Run 45533204899](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45533204899) |
| DTHL-F08 — Bộ lọc chủ động + VPS helper | **CODE_DONE / CI_PENDING** trên branch `feat/dthl-f08-search-chips-vps-ops-20261125`; CI/PR chưa xác minh tại thời điểm ghi | [Nhật ký](CHANGELOG.md) |

## 2. Thành phần đã có code trong main

- **Nền tảng:** CMS/CRM/đăng nhập/role hiện hành (không tự nhận đã kiểm thử production trong đợt nâng cấp này).
- **Search & Discovery:** tiếng Việt không dấu/có dấu, alias, tìm theo khu vực, autocomplete, lỗi gõ phạm vi từ điển, bộ lọc giá/diện tích/thời gian, xếp hạng theo quy tắc, tìm kiếm đã lưu.
- **Notifications:** inbox, ưu tiên quyền riêng tư, saved-search alerts có dedupe và database lease. Đợt F01 bổ sung phân lượt công bằng theo thời điểm nhận quét; cần 2 index unique và 1 index xếp lịch trên DB thực trước khi bật worker.
- **Data Trust & Recommendations:** cảnh báo gần trùng dạng heuristic, phân biệt căn khác mã, điểm đủ thông tin (không phải xác minh pháp lý), bài viết/BĐS liên quan theo các quy tắc có sẵn.
- **Operations:** dashboard chất lượng dữ liệu theo quyền quản trị, giới hạn API, SEO/trang khu vực sẵn có.
- **X-HUB:** code WA-002/WA-005 dùng consent/feature flags; chưa có nghiệm thu nguồn X-HUB thực tế để kích hoạt.

## 3. Cổng phát hành và cấu hình

- `.github/workflows/deploy-api.yml`: chỉ `workflow_dispatch` với xác nhận `DEPLOY_DTHL`; **push `main` không tự deploy full-stack**.
- Mặc định ở `server/.env.example`: `SAVED_SEARCH_ALERTS_ENABLED=false`, `XHUB_WEB_ANALYTICS_ENABLED=false`, `XHUB_ANALYTICS_PULL_ENABLED=false`.
- **Không suy ra giá trị .env đang chạy trên VPS** từ file .env.example. Cần kiểm tra nguồn cài đặt thật trước thao tác production.
- Các workflow lịch/monitor/backup của repo vẫn có thể hoạt động độc lập với deploy full-stack.

## 4. BLOCKERS cần giải quyết

| ID | Vấn đề | Hậu quả / việc cần |
| --- | --- | --- |
| DTHL-R01 | Chưa có bằng chứng backup/restore và preflight MongoDB staging thật | Không bật alerts/migration nếu index/dữ liệu trùng chưa được xác nhận |
| DTHL-R02 | Chưa chạy smoke/E2E trên VPS staging với tài khoản A/B, quyền Admin, mobile | CI pass không chứng minh môi trường thực pass |
| DTHL-R03 | Chưa load test/EXPLAIN query tại staging và kiểm tra rollback | Có rủi ro latency/index, chưa đủ release gate |
| DTHL-R04 | X-HUB chưa nghiệm thu org/workspace/source, consent, secrets/issuer/host | Không bật WA-002/WA-005 |
| DTHL-R05 | Chưa kiểm tra SEO/crawler và hành vi sau triển khai trên public domain | Chưa khẳng định performance/SEO production đạt |

## 5. Mục đang thực hiện và bước tiếp theo

**DTHL-DOC01** — Thiết lập thư mục `luu-y-code/`, `AGENTS.md`, CI Code Notes Gate để tất cả ChatGPT tiếp tục dùng và cập nhật cùng code. Trạng thái: **CI_PASS** (đã xác minh run `45533204875` + `45533204899` trên SHA `fdc41b4`). Mọi PR đổi code cần cập nhật STATUS + CHANGELOG; chủ repo vẫn cần đặt check thành **required** trong Branch Rulesets để chặn merge khi có vi phạm.

**F01 — CODE_MERGED / CI_PASS:** [PR #81](https://github.com/hoanglamvu04/dothihoalac/pull/81) đã merge vào `main` tại `cf0d4d58154701401e50936e8df6d721a2728dc1`; [CI PR 45535284175](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535284175) backend 94 PASS/1 SKIP, frontend 31 PASS, Mongo E2E 20 PASS. Chưa nghiệm thu staging hoặc deploy.

**F07 — CODE_MERGED / CI_PASS:** [PR #82](https://github.com/hoanglamvu04/dothihoalac/pull/82) merge SHA `1718426fd7155cec3a7852343aeb92c4bcf4fd0b`. Đã sửa bộ lọc `days`, loại/giao dịch BĐS, giá/diện tích được gửi tới API, refetch khi URL đổi; bổ sung a11y keyboard/aria-live. [CI PR 45535697220](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535697220) backend 94 PASS/1 SKIP, frontend 35 PASS, Mongo 20 PASS. **Chưa thử staging hoặc deploy VPS**.

**Cổng phát hành mới:** cần 3 index MongoDB tồn tại vật lý trước khi bật worker (2 unique cũ + `saved_search_fair_scan_order`). Công cụ audit chỉ đọc sẽ FAIL nếu thiếu index mới. Không tự tạo/repair index production.

**F08 — đang phát triển:** Trang tìm kiếm có chip các bộ lọc đã áp dụng, xóa từng/bỏ toàn bộ mà vẫn giữ từ khóa và khu vực; kiểm tra giá/diện tích ngược và số không hợp lệ trước khi gọi API. Thêm script `scripts/vps-update.sh` chỉ để pull fast-forward, kiểm tra PM2/API và MongoDB preflight read-only; **không có chế độ deploy**. Lệnh VPS chuẩn tại [VPS_COMMANDS.md](VPS_COMMANDS.md). Test frontend/unit và GitHub Actions đang chờ kết quả.

**Ưu tiên sau đó:** CI/merge F08 → DTHL-R01 backup/index preflight trên staging → DTHL-R02 smoke auth, tìm kiếm, mobile, RBAC → DTHL-R03 đo tải → DTHL-R04 nghiệm thu X-HUB → DTHL-R05 SEO → DTHL-F09/F10. Chi tiết và tiêu chí nghiệm thu xem [ROADMAP.md](ROADMAP.md).

**Nguyên tắc:** sau mỗi lượt code, người thực hiện **thay thế mốc SHA và thông tin đã kiểm chứng**, không ghi “đã xong” cho công việc đang chờ access hoặc approval.
