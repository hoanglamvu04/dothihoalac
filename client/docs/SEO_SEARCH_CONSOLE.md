# SEO Technical V2 & Google Search Console

## 1. Sitemap production

Frontend build tạo sitemap động từ API production và xuất:

- `https://dothihoalac.vn/sitemap.xml` — sitemap URL set tổng hợp
- `https://dothihoalac.vn/sitemap-pages.xml`
- `https://dothihoalac.vn/sitemap-areas.xml`
- `https://dothihoalac.vn/sitemap-news.xml`
- `https://dothihoalac.vn/sitemap-community.xml`
- `https://dothihoalac.vn/sitemap-properties.xml`
- `https://dothihoalac.vn/sitemap-jobs.xml`
- `https://dothihoalac.vn/sitemap-status.json` — số lượng URL đã sinh ở build gần nhất

Production hiện triển khai qua VPS: script client/deploy.sh dùng `SITEMAP_SOURCE_API=http://127.0.0.1:5000/api/v1` làm nguồn dữ liệu động, tách biệt với `VITE_API_URL` của trình duyệt. CI có thể bật `SITEMAP_SKIP_DYNAMIC_FETCH=true` để kiểm tra cấu trúc sitemap tĩnh mà không phụ thuộc API công khai.

`verify-sitemap.mjs` xác minh sitemap là một `urlset` XML hợp lệ và có các URL tĩnh/khu vực lõi. Muốn bắt buộc có URL động trên VPS, đặt `SEO_SITEMAP_STRICT=true` (lưu ý mục Việc làm có thể chưa có bài).

## 2. Xác minh Google Search Console

1. Mở Google Search Console và thêm property `https://dothihoalac.vn/`.
2. Chọn phương thức **HTML tag**.
3. Google cung cấp thẻ dạng:
   `<meta name="google-site-verification" content="ABC..." />`
4. Chỉ lấy phần token `ABC...`.
5. Trong cấu hình biến môi trường build frontend trên VPS, thêm:
   `VITE_GOOGLE_SITE_VERIFICATION=ABC...`
6. Build/triển khai lại frontend VPS.
7. View Source trang chủ và xác nhận thẻ `google-site-verification` có đúng token.
8. Quay lại Search Console và bấm Verify.

## 3. Submit sitemap

Trong Search Console > Sitemaps, submit duy nhất:

`https://dothihoalac.vn/sitemap.xml`

Google đọc trực tiếp toàn bộ URL từ sitemap tổng hợp. Các file sitemap con giữ lại cho việc kiểm tra thủ công.

## 4. Checklist sau deploy

- `/robots.txt` trả HTTP 200 và trỏ tới `/sitemap.xml`.
- `/sitemap.xml` là `<urlset>` tổng hợp từ URL tĩnh và các URL động; không phải `<sitemapindex>`.
- `/sitemap-status.json` có `news`, `community`, `properties`, `jobs` lớn hơn 0.
- URL chi tiết có canonical dạng một-slug, không canonical về alias `/nha-dat` hoặc route `/:id/:slug`.
- `/tim-kiem`, auth, tài khoản, studio và admin có `noindex`/không được crawl.
- 404 và khu vực không tồn tại có `noindex`.
- Các trang `/khu-vuc/...` có title chuẩn, canonical riêng, `CollectionPage`, `Place` và breadcrumb schema.
- Tin tức có `NewsArticle`, việc làm có `JobPosting`, BĐS có `RealEstateListing`.
- Sitewide JSON-LD có `Organization` và `WebSite` + `SearchAction`.

## 5. URL khu vực SEO lõi

Các khu vực lõi luôn có mặt trong sitemap kể cả khi taxonomy API tạm lỗi:

- `/khu-vuc/hoa-lac`
- `/khu-vuc/ha-bang`
- `/khu-vuc/phu-cat`
- `/khu-vuc/thach-that`
- `/khu-vuc/tay-phuong`
- `/khu-vuc/yen-xuan`

Các khu vực active khác từ taxonomy API cũng được thêm tự động.
