# CHANGELOG — Nhật ký code, test và bàn giao

**Quy tắc:** nhật ký mới nhất trên cùng; không xóa lịch sử cũ; ghi link PR/commit/CI thật, không điền PASS khi chưa chạy. Mọi PR sửa code/config/workflow phải **cập nhật cùng PR file này + STATUS.md**.

## 2026-11-25 — DTHL-F07 — Sửa tham số lọc từ UI đến API (CI_PASS / MERGED)

- **Nguyên nhân:** `SearchPage.jsx` trước đó chỉ gửi q/area/type/sort/page/limit, bỏ lọt tham số URL cho giá/diện tích/loại/giao dịch BĐS và khoảng ngày; effect không refetch khi chỉ đổi bộ lọc URL.
- **Code:** `client/src/utils/searchQueryParams.mjs` xây dựng whitelist tham số cho API, `SearchPage.jsx` gọi helper và theo dõi searchParams; cải thiện keyboard Escape/Tab, aria-live loading/results, pressed state. Test frontend mới trong `client/tests/searchQueryParams.test.mjs`, cập nhật workflow CI.
- **Trạng thái:** [PR #82](https://github.com/hoanglamvu04/dothihoalac/pull/82) MERGED vào `main` SHA `1718426fd7155cec3a7852343aeb92c4bcf4fd0b`. [DTHL CI 45535697220](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535697220) PASS server 94/94 + 1 skip, frontend 35/35, Mongo 20/20; [Frontend check 45535697131](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535697131) PASS; [Code Notes Gate 45535697177](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535697177) PASS. CI trên `main` sau merge [45535845423](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535845423), [45535845436](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535845436) và [45535845546](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535845546) đều PASS. Chưa staging hay deploy. Không đổi X-HUB/alerts.

## 2026-11-25 — DTHL-F01 — Fair scan & index hardening (CI_PASS / MERGED)

- **Task:** DTHL-F01, [PR #81](https://github.com/hoanglamvu04/dothihoalac/pull/81) **MERGED** vào `main` SHA `cf0d4d58154701401e50936e8df6d721a2728dc1`; vẫn chưa staging/production.
- **Thay đổi:** worker claim nguyên tử từng subscription theo `lastScanAttemptAt` thay vì lấy 80 `lastScannedAt` cũ nhất; độc lập với cursor nội dung để backlog không gây đói lượt quét. Khi bắt đầu quét đánh dấu thời điểm claim; một bộ lọc không được claim hai lần cùng run. Tiếp tục chống trùng đa PM2 bằng lease token, xử lý quá hạn và unique notification key.
- **Schema/release:** thêm field internal `lastScanAttemptAt` và index MongoDB `saved_search_fair_scan_order`; audit và worker **fail-closed** nếu thiếu index. Kiểm tra chính xác số trường/thứ tự key trên unique/partial index để từ chối index sai cấu trúc.
- **Tests:** [Run 45535284175](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535284175) **PASS** backend 94/94 (1 skip khác), frontend 31/31, MongoDB 20/20; [Code Notes Gate](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45535284291) PASS. Đã cập nhật test unit cũ từ 2 lên 3 index sau một CI ban đầu fail.
- **Ảnh hưởng:** có thêm index cần nghiệm thu trên staging; `SAVED_SEARCH_ALERTS_ENABLED=false` vẫn mặc định. Preflight chỉ đọc không chạy DDL và không tự bật worker; X-HUB không thay đổi.
- **Bước tiếp:** chạy CI → xử lý lỗi (nếu có) → review/merge khi PASS → staging index audit/preflight/backup trước khi bật tính năng.

## 2026-11-25 — DTHL-DOC01 — Khởi tạo “LƯU Ý CODE”

- **Phạm vi:** thêm `AGENTS.md`, `luu-y-code/README.md`, `STATUS.md`, `ROADMAP.md`, `HANDOFF.md`, `CHANGELOG.md`; thêm kiểm tra CI Code Notes Gate và bộ test cho điều kiện bắt buộc cập nhật tài liệu.
- **Tác dụng:** ChatGPT khác đọc được bối cảnh, tình trạng thực, kế hoạch và nhiệm vụ tiếp theo từ Git; hạn chế bàn giao đứt đoạn; PR sửa code phải sửa STATUS + CHANGELOG.
- **Chứng cứ code:** commit khởi tạo chính là commit chứa ghi chú này. Xem GitHub History của thư mục và workflow `.github/workflows/code-notes-gate.yml`.
- **Kiểm thử xác minh:** **CI_PASS** trên commit tài liệu `fdc41b44ce1d07d93d4834084a60e05e76ab04be`: [Code Notes Gate](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45533204875) **7/7 test PASS**, xác nhận 2 file trạng thái/nhật ký cùng diff; [DTHL application checks](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45533204899) backend **90 PASS, 1 SKIP**, frontend **31 PASS**, MongoDB E2E **18 PASS**, 0 FAIL. Bằng chứng chỉ trên CI, chưa phải staging.
- **Giới hạn:** CI có thể đánh dấu vi phạm trên PR/push, nhưng để *ngăn merge* bắt buộc phải bật required status check trong branch ruleset/protection của GitHub.

## 2026-11-24/25 — DTHL-P77/P78/P79/P80 — Merge công việc vào main

- **Đã merge:** [PR #80](https://github.com/hoanglamvu04/dothihoalac/pull/80) (deploy thủ công) → [PR #78](https://github.com/hoanglamvu04/dothihoalac/pull/78) (Search P0/P1 + alerts) → [PR #79](https://github.com/hoanglamvu04/dothihoalac/pull/79) (Search/Data Trust/Operations) → [PR #77](https://github.com/hoanglamvu04/dothihoalac/pull/77) (consented WA-002/WA-005).
- **Git SHA tích hợp đã kiểm tra:** `e926774dd62e6e1e22d1238255349f987fc5993b`.
- **Test ở đúng SHA này:** [CI ứng dụng](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45451224478) **SUCCESS** (backend, frontend và MongoDB CI độc lập); [CI frontend](https://github.com/hoanglamvu04/dothihoalac/actions/runs/45451223715) **SUCCESS**.
- **Đã làm khi gộp:** giải quyết xung đột Search V2 ↔ WA-005, giữ consent gate, feature flags mặc định OFF, cấu hình VPS deploy thủ công.
- **Không được hiểu nhầm:** chưa có bằng chứng DB staging/VPS acceptance hay deployment production cho bộ code mới; không tự bật WA-005 hoặc alerts. Lộ trình release trong ROADMAP/R01–R05.

## Mẫu mục ghi nhật ký tiếp theo

```md
## YYYY-MM-DD — DTHL-<TASK_ID> — <Tên công việc>
- Trạng thái: IN_PROGRESS / CODE_DONE / CI_PASS / BLOCKED / STAGING_PASS / PRODUCTION_PASS.
- Thay đổi: file / module và lý do, tránh liệt kê chung chung.
- PR/commit: link cụ thể.
- Test: tên workflow, link run, PASS/FAIL/SKIP, DB/môi trường.
- Rủi ro và rollback: ảnh hưởng hệ thống, cờ bật/tắt.
- Chưa làm / bước tiếp: nêu rõ người/đầu mối nếu đã được xác nhận.
```
