# DTHL — Upload ảnh khi đăng bài (production runbook)

## Luồng mới

- Clipboard JPG/PNG/WebP/GIF/AVIF được chuẩn hóa thành File có tên.
- Ảnh lớn (trừ GIF động) được tối ưu kích thước/WebP trên trình duyệt trước khi gửi.
- Frontend luôn gửi `multipart/form-data` đến `POST /api/v1/media/images` bằng Axios với cookie phiên đăng nhập.
- Server xác thực người dùng, Multer kiểm tra MIME và dung lượng, Cloudinary lưu trữ và MongoDB lưu Media ID/URL.
- Chỉ dùng Media ID + URL HTTPS thực khi lưu HTML. Không lưu `blob:` hoặc `data:` vào nội dung cuối cùng.
- Bài cộng đồng vẫn dùng ảnh xem trước tạm thời; khi bấm Đăng, hệ thống tải từng ảnh lên Cloudinary rồi mới gửi nội dung. Nếu một ảnh lỗi, không được đóng hộp đăng bài hoặc báo đăng thành công.
- Ảnh bất động sản được tải tuần tự; một ảnh lỗi không làm mất những ảnh đã upload.

## Kiểm tra cấu hình trên VPS (không thay cả vhost)

Với Nginx, trong `server {}` của **api.dothihoalac.vn** hoặc nơi proxy route `/api/v1/media/`, bảo đảm:

```nginx
client_max_body_size 15m;

location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 10s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
}
```

**Không dán nguyên location này nếu vhost đã có routing, TLS hoặc proxy riêng.** Chỉ bổ sung các timeout/body-size vào cấu hình đúng đang hoạt động. Chạy `sudo nginx -t && sudo systemctl reload nginx` sau khi kiểm tra. Với Cloudflare/WAF hoặc reverse proxy khác cũng kiểm tra giới hạn request body và timeout tương ứng.

Trong `server/.env` production, xác minh (không commit secret):

- `NODE_ENV=production`
- `UPLOAD_PROVIDER=cloudinary`
- `CLOUDINARY_URL` hợp lệ
- `MAX_IMAGE_SIZE_MB=10`
- `COOKIE_SECURE=true` và CORS cho `https://dothihoalac.vn`.

## Cách xác định lỗi thật trên web

Mở DevTools → Network → lọc `media/images` rồi dán ảnh 1 MB và 6 MB bằng Ctrl+V. Kiểm tra:

- 201 + JSON có `data._id` và `data.secureUrl`: upload thực thành công.
- 401: cookie/access token hoặc refresh thất bại.
- 403: CORS, WAF hoặc quyền.
- 413: giới hạn request body của proxy/Nginx hoặc server.
- 415: loại MIME không hợp lệ.
- 429: rate limit.
- 500: xem PM2 logs, requestId và lỗi Cloudinary/MongoDB.
- 502/503/504: reverse proxy hoặc upstream không phản hồi.
- CORS/ERR_NETWORK: so sánh Request URL, HTTPS và Access-Control-Allow-Origin.

Kiểm thử lần lượt: dán ảnh chụp màn hình PNG, JPG tải từ máy, kéo thả WEBP, ảnh >10 MB, chọn 3 ảnh (ảnh thứ hai lỗi), lưu nháp, đăng bài cộng đồng, tải lại trang sau đăng, xem ảnh trong bài đã xuất bản. Kiểm tra trên desktop và điện thoại.

## An toàn triển khai

Chạy `npm --prefix client run check` và `npm --prefix server test` trước khi merge. Deploy theo workflow hiện tại và theo dõi Network/PM2. Không thay đổi secret, xóa DB, reset dữ liệu hoặc chạy deploy production trong bước kiểm thử pull request.
