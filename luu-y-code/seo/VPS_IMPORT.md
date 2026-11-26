# DTHL-SEO01 — Nhập bài bằng CMS API

Đây là helper quản trị, không sửa runtime hoặc database trực tiếp. Dùng Python 3, Git, HTTPS tới api.dothihoalac.vn và tài khoản CMS có quyền tạo/xuất bản bài. Mật khẩu nhập ẩn, không lưu vào file, không đăng nhập bằng demo seed. Dữ liệu SEO đang ở branch `content/seo-dthl-01-20261125`. Không cần checkout branch, build, PM2 reload hay deploy. Trước đăng cần xác nhận nguồn, bài gần trùng và quyền ảnh; hiện bài chưa có ảnh bìa. Slug được CMS tự tạo theo tiêu đề, helper in URL thực tế. Meta description trên web dùng logic SEO hiện hành từ nội dung/sapo, không có trường meta riêng qua API tạo bài.

```bash
cd /var/www/dothihoalac && git fetch origin content/seo-dthl-01-20261125 && tmp=$(mktemp -d) && git archive FETCH_HEAD luu-y-code/seo | tar -x -C "$tmp" && python3 "$tmp/luu-y-code/seo/import-dot-01.py" --check && python3 "$tmp/luu-y-code/seo/import-dot-01.py" --publish --only 01
```

Bỏ `--only 01` để nhập cả đợt; bỏ `--publish` để tạo nháp. Script quét bài tồn tại, bỏ qua trùng ID/title/slug, in gợi ý bài cùng chủ đề, yêu cầu người dùng xác nhận IMPORT/PUBLISH. Không cập nhật bài cũ; lỗi HTTP dừng, không tự retry POST. Không chạy nhiều lượt đồng thời. Nếu bài đã tạo nháp, duyệt và xuất bản từ CMS thay vì chạy lại importer. Kiểm tra danh sách tin tức và URL public thực. Sitemap chạy refresh theo workflow hiện hành; không khẳng định đã index.

Kiểm thử: chưa thực thi script trên VPS hoặc API thật; `--check` xác thực nội dung offline trước lần chạy. Nếu lỗi, gửi output đã bỏ dữ liệu nhạy cảm. Không dùng seed demo hoặc reset DB để xử lý.
