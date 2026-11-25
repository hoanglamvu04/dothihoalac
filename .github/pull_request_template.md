## Bàn giao / Trạng thái code

**Task ID trong [ROADMAP](../luu-y-code/ROADMAP.md):** DTHL-...

**Đã sửa:** Mô tả ngắn và module/tệp chính.

**Tác động / rủi ro:** User-facing, database, bảo mật, X-HUB, môi trường.

### Checklist bắt buộc khi thay code

- [ ] Đã đọc [AGENTS.md](../AGENTS.md) và `luu-y-code/` trước khi sửa.
- [ ] Đã cập nhật `luu-y-code/STATUS.md` cùng PR.
- [ ] Đã cập nhật `luu-y-code/CHANGELOG.md` cùng PR.
- [ ] Đã cập nhật ROADMAP/HANDOFF nếu thay phạm vi hoặc quy trình.
- [ ] Đã chạy test/lint/build liên quan; đính kèm link CI trên **đúng commit SHA**.
- [ ] Nếu liên quan DB: đã đánh giá index, dữ liệu trùng, schema, backup và kế hoạch rollback.
- [ ] Nếu liên quan production: nêu rõ đã/chưa deploy, chưa tự bật feature flag.
- [ ] Nếu liên quan analytics: xác minh consent, quyền truy cập X-HUB và không lộ secret.

**Kết quả kiểm thử:** PR/CI URL; số PASS/FAIL/SKIP, môi trường.

**Chưa nghiệm thu / blocker:** Nêu rõ (không để trống nếu chưa thử staging/production).

**Bước tiếp theo:** Task ID, điều kiện hoàn thành, đầu mối thực hiện nếu đã xác định.
