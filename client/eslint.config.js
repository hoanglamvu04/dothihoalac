import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Các editor cộng đồng hiện dùng ref snapshot để xác định trạng thái dirty.
    // Runtime hiện tại ổn định; React Compiler chưa chứng minh được invariant này.
    files: [
      'src/pages/create/CommunityEditorPage.jsx',
      'src/pages/create/JobEditorPage.jsx',
      'src/pages/create/NewsTipPage.jsx',
    ],
    rules: {
      'react-hooks/refs': 'off',
    },
  },
  {
    // Hai trang chi tiết có callback memoization thủ công đang hoạt động ổn định.
    // Giữ exception cục bộ thay vì tắt compiler lint trên toàn frontend.
    files: [
      'src/pages/public/CommunityDetailPage.jsx',
      'src/pages/public/PropertyDetailPage.jsx',
    ],
    rules: {
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
];
