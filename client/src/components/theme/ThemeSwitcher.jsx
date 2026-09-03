import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

import {
  readSiteTheme,
  setSiteTheme,
  subscribeSiteTheme,
} from '../../theme/siteTheme';

import './ThemeSwitcher.css';

function useCurrentTheme() {
  const [theme, setTheme] = useState(readSiteTheme);

  useEffect(() => subscribeSiteTheme(setTheme), []);

  const selectTheme = (nextTheme) => {
    const applied = setSiteTheme(nextTheme);
    setTheme(applied);
  };

  return [theme, selectTheme];
}

export function DesktopThemeToggle() {
  const [theme, selectTheme] = useCurrentTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      className="dthl-theme-toggle"
      aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      title={dark ? 'Giao diện sáng' : 'Giao diện tối'}
      onClick={() => selectTheme(dark ? 'light' : 'dark')}
    >
      <span aria-hidden="true">
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </span>
      <strong>{dark ? 'Sáng' : 'Tối'}</strong>
    </button>
  );
}

export function MobileThemePicker() {
  const [theme, selectTheme] = useCurrentTheme();

  return (
    <section className="dthl-mobile-theme-picker" aria-label="Cài đặt giao diện">
      <div className="dthl-mobile-theme-picker__heading">
        <span>
          {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
        </span>
        <div>
          <strong>Giao diện</strong>
          <small>Chọn chế độ hiển thị trên thiết bị này.</small>
        </div>
      </div>

      <div className="dthl-mobile-theme-picker__options" role="group" aria-label="Chế độ giao diện">
        <button
          type="button"
          className={theme === 'light' ? 'is-active' : ''}
          aria-pressed={theme === 'light'}
          onClick={() => selectTheme('light')}
        >
          <Sun size={16} />
          Sáng
        </button>
        <button
          type="button"
          className={theme === 'dark' ? 'is-active' : ''}
          aria-pressed={theme === 'dark'}
          onClick={() => selectTheme('dark')}
        >
          <Moon size={16} />
          Tối
        </button>
      </div>
    </section>
  );
}
