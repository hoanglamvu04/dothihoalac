# LƯU Ý CODE — Trung tâm tiến độ & bàn giao Đô Thị Hòa Lạc

> **Nguồn bàn giao chính thức trong GitHub cho ChatGPT, Codex và người phát triển.** Tên thư mục dùng `luu-y-code/` (không dấu, không khoảng trắng) để tiện lệnh Git/Linux/VPS; tên hiển thị là **LƯU Ý CODE**.

## Bắt đầu từ đâu?

| File | Mục đích | Khi nào cập nhật |
| --- | --- | --- |
| [STATUS.md](STATUS.md) | Tình trạng hiện tại: code, CI, release, lỗi, đầu việc đang làm, rủi ro | **MỖI PR sửa code** |
| [ROADMAP.md](ROADMAP.md) | Kế hoạch các sprint, ưu tiên, task ID và điều kiện nghiệm thu | Mỗi khi thay đổi tiến độ, phạm vi, mức độ ưu tiên |
| [CHANGELOG.md](CHANGELOG.md) | Nhật ký thay đổi theo ngày/commit/PR, test và kết quả | **MỖI PR sửa code**; mục mới đặt trên cùng |
| [HANDOFF.md](HANDOFF.md) | Quy trình và hướng dẫn cho ChatGPT khác tiếp tục code | Khi đổi quy trình, công cụ, triển khai, hợp đồng API |
| [`../AGENTS.md`](../AGENTS.md) | Quy tắc ở gốc repo để AI coding agent dễ phát hiện | Khi quy ước chung thay đổi |

## Quy tắc làm việc bắt buộc

1. **Đầu việc mới:** đọc toàn bộ tài liệu trên, mở GitHub kiểm tra `main`, PR, CI, code và môi trường thật. Bổ sung task/đầu mối vào ROADMAP nếu chưa có.
2. **Đang code:** theo dõi một task ID; không xóa lịch sử, không ghi bí mật. Trường hợp làm dở phải ghi rõ lý do và bước tiếp theo.
3. **Cùng một PR code:** cập nhật **STATUS.md + CHANGELOG.md**; sửa ROADMAP/HANDOFF khi liên quan; CI sẽ kiểm tra những file đó xuất hiện trong diff.
4. **Kết thúc công việc:** ghi commit/PR, hạng mục thực sự đã xong, số liệu test và đường dẫn kiểm chứng; tách riêng việc chưa thử staging/production.
5. **Khi phát hiện tài liệu sai:** ưu tiên kiểm chứng code, GitHub Actions và môi trường; cập nhật tài liệu có ngày, không giữ thông tin sai.
6. **Nếu chỉ sửa tài liệu** (không đổi code/config/workflow), được cập nhật tài liệu mà không buộc cập nhật cả hai file.

**Giới hạn thực thi:** GitHub Actions kiểm tra quy tắc trên PR và báo lỗi nếu push `main` thiếu tài liệu. Muốn *chặn* merge bypass thì chủ repository cần bật branch ruleset/protection yêu cầu **Code Notes Gate** PASS; không thể đảm bảo chỉ bằng hướng dẫn viết ở Markdown.

## Cấu trúc mẫu cho mỗi phiên

Trong STATUS: *Ngày, mốc SHA đối chiếu, việc đang làm, bằng chứng, blockers, bước tiếp theo*.  
Trong CHANGELOG: *Thời điểm, task ID, PR/commit, thay đổi, kiểm thử (PASS/FAIL/chưa chạy), rủi ro/rollback*.  
Trong ROADMAP: *Task ID, priority, status, điều kiện nghiệm thu, phụ thuộc*.  

Thư mục này mô tả **tiến độ code và vận hành**, không chứa mật khẩu, dump database, token, user data, thông tin Google/MCP/OAuth bí mật hay liên kết nhạy cảm.
