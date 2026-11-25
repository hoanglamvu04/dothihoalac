# STATUS — Trạng thái thực tế dự án DTHL

**Cập nhật lần đầu:** 2026-11-25 (Asia/Bangkok, UTC+07).  
**Repository:** `hoanglamvu04/dothihoalac`  
**Mốc GitHub đã đối chiếu:** `main` tại `e926774dd62e6e1e22d1238255349f987fc5993b` (**trước khi commit bộ tài liệu này**; kiểm tra `main` mới nhất khi đọc).  
**Mốc CI tài liệu và ứng dụng gần nhất đã xác minh:** `f6b03318f926e65cc274120b1aa19e4ad10b5046` ([application CI](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45533350948), [Code Notes Gate](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45533350892)); **mốc mới F01 đang chờ CI**.
**Trạng thái tổng thể:** `CODE_MERGED` + `CI_PASS`; **STAGING_CHƯA_NGHIỆM_THU**; **PRODUCTION_CHƯA_TRIỂN_KHAI_BẢN_MỚI**.

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

**Đang phát triển 2026-11-25: DTHL-F01** — xử lý fairness/starvation của job quét tìm kiếm đã lưu. Branch `feat/dthl-f01-fair-saved-search-worker-20261125`; trạng thái `IN_PROGRESS / CI_PENDING` cho đến khi kiểm thử chính thức trên GitHub. Cơ chế mới: claim nguyên tử theo `lastScanAttemptAt`, tối đa 80 lượt riêng biệt/run và index `saved_search_fair_scan_order` để tránh worker quét lặp cùng 80 subscription khi backlog dày. API người dùng không lộ timestamp nội bộ. **Chưa merge, chưa staging hay deploy** theo mốc tạo bản ghi này.

**Cổng phát hành mới:** cần 3 index MongoDB tồn tại vật lý trước khi bật worker (2 unique cũ + `saved_search_fair_scan_order`). Công cụ audit chỉ đọc sẽ FAIL nếu thiếu index mới. Không tự tạo/repair index production.

**Ưu tiên sau đó:** Hoàn tất CI F01 → DTHL-R01 → DTHL-R02 → DTHL-R03 → DTHL-R04 → DTHL-R05 → DTHL-F02. Chi tiết và tiêu chí nghiệm thu xem [ROADMAP.md](ROADMAP.md).

**Nguyên tắc:** sau mỗi lượt code, người thực hiện **thay thế mốc SHA và thông tin đã kiểm chứng**, không ghi “đã xong” cho công việc đang chờ access hoặc approval.
