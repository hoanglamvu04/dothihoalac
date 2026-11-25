# CHANGELOG — Nhật ký code, test và bàn giao

**Quy tắc:** nhật ký mới nhất trên cùng; không xóa lịch sử cũ; ghi link PR/commit/CI thật, không điền PASS khi chưa chạy. Mọi PR sửa code/config/workflow phải **cập nhật cùng PR file này + STATUS.md**.

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
