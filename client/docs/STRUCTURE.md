# Cấu trúc source

```text
src/
├── api/          # Client gọi API theo module
├── app/          # Router và composition toàn ứng dụng
├── assets/       # Logo và minh họa nội bộ
├── components/
│   ├── auth/     # Route guard
│   ├── common/   # Button, modal, pagination, SEO...
│   ├── content/  # Card, bình luận, reaction, nội dung bài
│   ├── forms/    # Editor, upload, taxonomy, lead
│   └── layout/   # Header, footer, account/admin layout
├── context/      # Auth, taxonomy, toast
├── hooks/        # Hook danh sách, debounce, title
├── pages/
│   ├── public/
│   ├── auth/
│   ├── create/
│   ├── account/
│   └── admin/
├── styles/       # Token, reset, global, component, page, responsive
└── utils/        # Constant, format, media, validate, storage
```

Các page được tải bằng `React.lazy`, giúp tách bundle theo route. Toàn bộ component dùng `.jsx`; các module tiện ích dùng `.js`.
