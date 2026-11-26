# DTHL-SEO02 — 26/11/2026

- 20/20 bài đợt 2 đã viết và lưu Git, tổng 8812 đơn vị đếm theo khoảng trắng (thân bài), 35/100 bản thảo cộng dồn. Tất cả 35 slug đề xuất và tiêu đề khác nhau. Đã đọc lại file Git và kiểm tra metadata, 20 ID, tối thiểu 400 đơn vị/bài, ít nhất 3 H2, nguồn HTTPS và relatedIds hợp lệ.
- Nguồn cập nhật: Quyết định 2512/QĐ-UBND ngày 13/5/2026; HL3–HL6 năm 2024; mốc ký hợp đồng metro số 8 tháng 10/2026; bản tin cao tốc ngày 3/11/2026. Phân biệt mốc đã xảy ra và mục tiêu. Nên rà soát bài 01–03 đợt 1 đã xuất bản để thêm bối cảnh quy hoạch tổng thể 2026 khi biên tập.
- Chủ dự án phản hồi lệnh nhập đợt 1 đã được; chưa kiểm chứng độc lập số bài đã xuất bản và URL trên CMS. Đợt 2 chưa nhập CMS/chưa có URL live hoặc ảnh bìa. Kiểm tra trùng chủ đề và nguồn trước xuất bản.
- Helper import-dot-02.py tái sử dụng luồng API của đợt 1, chỉnh manifest/ID/số lượng/đường dẫn; chưa chạy Python hay API trên VPS, yêu cầu --check trước --publish. Không thay đổi runtime, MongoDB trực tiếp hoặc deploy. Xem VPS_IMPORT.md.

## Lịch sử đợt 1 (trước xác nhận của chủ dự án)

### DTHL-SEO01 — 25/11/2026

- 15/15 bài có nội dung đầy đủ trong Git, status DRAFT_READY_FOR_REVIEW, chưa nhập CMS hoặc xuất bản.
- Kiểm tra cấu trúc metadata qua đọc lại file Git: 15 ID/slug riêng, mỗi bài tối thiểu 400 đơn vị phân tách khoảng trắng và 3 H2, relatedIds hợp lệ trong đợt; tổng 7721 đơn vị.
- Không có quyền SSH/CMS runtime được xác nhận. Không kiểm tra được trùng với toàn bộ danh sách bài production; seed mẫu có chủ đề tương tự. Không cập nhật/ghi đè bài hiện có. Không dùng demo seed hoặc tạo tài khoản.
- Chưa có ảnh bìa được cấp quyền; cần biên tập viên duyệt nguồn, kiểm tra link, đối chiếu thông tin cập nhật, bổ sung ảnh nếu phù hợp, kiểm tra trùng nội dung, rồi nhập CMS qua quy trình hiện có. GSC/CWV chưa đo.
- Không thay backend, frontend, config, DB hoặc deploy. Sau nhập kiểm tra URL thật, sitemap và Search Console. Chỉ đánh dấu PUBLISHED khi có URL thật được kiểm chứng.
