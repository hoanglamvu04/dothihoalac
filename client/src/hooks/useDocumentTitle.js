import { useEffect } from 'react';

export function useDocumentTitle(title, description = '') {
  useEffect(() => {
    const fullTitle = title ? `${title} | Đô Thị Hòa Lạc` : 'Đô Thị Hòa Lạc';
    document.title = fullTitle;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);
}
