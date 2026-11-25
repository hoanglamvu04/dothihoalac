# STATUS — Trạng thái thực tế dự án DTHL

**Cập nhật lần đầu:** 2026-11-25 (Asia/Bangkok, UTC+07).  
**Repository:** `hoanglamvu04/dothihoalac`  
**Mốc triển khai code đã đối chiếu trên GitHub:** `main` tại `345404c9ac8cb3980b3b059938767796e2ead41b` sau merge [PR #83](https://github.com/hoanglamvu04/dothihoalac/pull/83); commit tài liệu có thể mới hơn, nên đối chiếu lại `main` khi đọc.  
**Mốc CI PR gần nhất đã xác minh:** F01 [45535284175](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535284175) PASS; F07 [45535697220](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535697220) PASS. CI push `main` commit merge #82 **PASS toàn bộ**: [ứng dụng run 45535845423](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535845423) (server/client/MongoDB), [frontend 45535845436](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535845436), [Code Notes Gate 45535845546](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535845546).
**Trạng thái tổng thể:** F01/F07/F08 `CODE_MERGED` + `CI_PASS`; OPS01 `CODE_MERGED` + `CI_PASS` trên GitHub, **VPS_NOT_RUN**; **STAGING_CHƯA_NGHIỆM_THU**; **PRODUCTION_CHƯA_TRIỂN_KHAI_BẢN_MỚI**.

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
| DTHL-F08 — Bộ lọc chủ động + VPS helper | **MERGED / CI_PASS**, chưa staging/VPS. 41 frontend, 94 backend (1 skip), 20 Mongo E2E, 3 helper tests PASS | [PR #83](https://github.com/hoanglamvu04/dothihoalac/pull/83), [main CI 45572808174](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45572808174) |

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

**F08 / OPS01 — ĐÃ MERGE / CI_PASS:** [PR #83](https://github.com/hoanglamvu04/dothihoalac/pull/83) có chip bộ lọc/xóa từng phần và toàn bộ, validation khoảng giá/diện tích trước API, script `scripts/vps-update.sh` để pull fast-forward/PM2 health/read-only preflight. **Không có chế độ deploy**. Lệnh VPS: [VPS_COMMANDS.md](VPS_COMMANDS.md). [CI ứng dụng main 45572808174](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45572808174) PASS 4/4 jobs, [frontend 45572808311](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45572808311) PASS, [Code Notes Gate 45572808211](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45572808211) PASS. **Không SSH vào VPS, không khởi động lại PM2, chưa nghiệm thu staging**.

**Ưu tiên sau đó:** DTHL-R01 backup/index preflight Mongo staging → DTHL-R02 smoke auth, tìm kiếm, mobile, RBAC → DTHL-R03 đo tải → DTHL-R04 nghiệm thu X-HUB → DTHL-R05 SEO → DTHL-F09/F10 E2E mobile/staging. Chi tiết và tiêu chí nghiệm thu xem [ROADMAP.md](ROADMAP.md).

**Nguyên tắc:** sau mỗi lượt code, người thực hiện **thay thế mốc SHA và thông tin đã kiểm chứng**, không ghi “đã xong” cho công việc đang chờ access hoặc approval.

## DTHL-OPS02 — Báo cáo sức khỏe VPS (2026-11-25)

- Trạng thái: **CODE_DONE / CI_PENDING / VPS_NOT_RUN** trên nhánh `feat/dthl-ops02-vps-health-report-20261125`; chưa merge main, chưa SSH vào VPS.
- Thêm `scripts/vps-health-report.sh` để kiểm tra chỉ đọc PM2 `dothihoalac-api`, local API readiness, public homepage và sitemap HTTP 200, chỉ in mã trạng thái/short SHA (không in response body, cookie, URI DB).
- Thêm `scripts/vps-health-report.test.mjs`; kiểm tra CI còn chờ. Kết quả kiểm tra runtime không xác minh được revision đang deploy, accessibility, nghiệp vụ hoặc MongoDB indexes.
- Lệnh khi đã kéo code: `cd /var/www/dothihoalac && bash scripts/vps-health-report.sh`.
- Ưu tiên tiếp: R01 backup/index preflight → R02 staging auth/mobile/RBAC → R03 latency/rollback → R05 SEO; không bật alerts/X-HUB và không tự deploy.
