# Hướng dẫn bắt buộc cho AI/ChatGPT/Codex làm việc với DTHL

**Đây là quy ước làm việc trong repository `hoanglamvu04/dothihoalac`.** Thư mục chuẩn quản lý tiến độ là [`luu-y-code/`](luu-y-code/README.md) (tên hiển thị: **LƯU Ý CODE**).

## Trước khi sửa code

1. Đọc lần lượt [README](luu-y-code/README.md), [STATUS](luu-y-code/STATUS.md), [ROADMAP](luu-y-code/ROADMAP.md), [HANDOFF](luu-y-code/HANDOFF.md), [VPS_COMMANDS](luu-y-code/VPS_COMMANDS.md) và các mục mới nhất của [CHANGELOG](luu-y-code/CHANGELOG.md).
2. Kiểm tra `main`, PR đang mở, CI, tài liệu và source thực tế; **không coi STATUS là dữ liệu chạy thời gian thực**. Xác minh thông tin có thể đã đổi từ ngày ghi nhận.
3. Chọn đúng task ID trong ROADMAP hoặc tạo task ID mới; ghi rõ điều kiện hoàn thành, rủi ro và thành phần bị ảnh hưởng trước khi bắt đầu.
4. Không ghi secrets, API key, token, dữ liệu người dùng hay thông tin nhạy cảm vào commit/tài liệu/log.

## Trong và sau mỗi thay đổi

- Giữ nguyên CMS, CRM, login, RBAC và các tích hợp đang hoạt động trừ khi nhiệm vụ yêu cầu.
- Khi một PR có thay đổi dưới `client/`, `server/`, `scripts/`, `.github/workflows/` hoặc cấu hình root: **phải cập nhật trong cùng PR cả `luu-y-code/STATUS.md` và `luu-y-code/CHANGELOG.md`**. Workflow **Code Notes Gate** kiểm tra quy tắc này.
- Sửa `luu-y-code/ROADMAP.md` khi thay đổi kế hoạch/phạm vi/ưu tiên; sửa `luu-y-code/HANDOFF.md` khi quy trình, lệnh chạy, cấu hình hay điểm bàn giao thay đổi.
- Ghi đúng trạng thái `TODO`, `IN_PROGRESS`, `CODE_DONE`, `CI_PASS`, `BLOCKED`, `STAGING_PASS`, `PRODUCTION_PASS`; **CI_PASS không đồng nghĩa đã deploy**. Cung cấp commit, PR và link CI làm chứng cứ.
- Chạy/đọc CI phù hợp rồi cập nhật nhật ký kết quả **thực tế**. Không tự suy đoán PASS.
- Khi hoàn thành, bàn giao ngắn gọn: đã thay đổi gì, commit/PR, test thực tế, phần chưa xong, và chính xác bước tiếp theo.

## Cổng an toàn môi trường

- `main` **không tự deploy VPS**: workflow `.github/workflows/deploy-api.yml` chỉ chạy thủ công. **Không tự kích hoạt** khi người dùng chỉ yêu cầu push code.
- Đường dẫn VPS được xác nhận từ workflow: `/var/www/dothihoalac`. Xem `luu-y-code/VPS_COMMANDS.md`; script `scripts/vps-update.sh` chỉ có pull/diagnostics/preflight, tuyệt đối không reload/deploy.
- Luồng saved-search alerts phải qua preflight MongoDB/staging trước khi bật `SAVED_SEARCH_ALERTS_ENABLED`.
- WA-002/WA-005 X-HUB phải có consent hợp lệ, nghiệm thu nguồn và secret cấu hình server; giữ cờ tính năng mặc định tắt nếu chưa đủ điều kiện.
- Không đánh dấu nghiệm thu staging hoặc production nếu chưa có bằng chứng trên môi trường tương ứng.

## Dành cho ChatGPT phiên khác

Khi nhận yêu cầu mới, **mở `AGENTS.md` và toàn bộ `luu-y-code/` trước, rồi mới code**. Các file này là tài liệu bàn giao do repository lưu giữ, không phải bộ nhớ cá nhân của phiên chat trước. Nếu tài liệu mâu thuẫn với source/CI hiện hành, kiểm tra và sửa tài liệu thay vì làm theo thông tin lỗi thời.
