import { useId } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { toggleTheme, useTheme } from "../../theme";
import "./ThemeSwitcher.css";

// A single color-drop glyph -- a developer/color drop, the app's own domain, doubling as
// a day/night symbol -- split solid/hollow down the middle instead of swapping in a
// separate sun and moon icon. `theme-switcher__icon--dark` (ThemeSwitcher.css) mirrors it
// horizontally so the solid half flips sides on toggle, rather than redrawing two shapes.
const DROP_PATH = "M12 2.69l6.35 6.35A9 9 0 1 1 5.65 9.04z";

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const theme = useTheme();
  const clipId = useId();

  return (
    <button
      type="button"
      className="theme-switcher button button--secondary"
      onClick={toggleTheme}
      aria-label={t(theme === "dark" ? "theme.switchToLight" : "theme.switchToDark")}
      title={t(theme === "dark" ? "theme.switchToLight" : "theme.switchToDark")}
    >
      <svg
        className={clsx("theme-switcher__icon", theme === "dark" && "theme-switcher__icon--dark")}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={DROP_PATH} />
          </clipPath>
        </defs>
        <path d={DROP_PATH} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <g clipPath={`url(#${clipId})`}>
          <rect x="12" y="0" width="12" height="24" fill="currentColor" />
        </g>
      </svg>
    </button>
  );
}
