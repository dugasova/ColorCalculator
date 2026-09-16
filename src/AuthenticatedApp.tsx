import { useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { signOut, type User } from "firebase/auth";
import { auth } from "./firebase";
import { usePalette } from "./palette";
import { useIsAdmin } from "./roles";
import FormulaCalculator from "./components/FormulaCalculator/FormulaCalculator";
import { Nav, type AppView } from "./components/Nav/Nav";
import { buildRepeatFormulaRequest, type FormulaHistoryEntry, type RepeatFormulaRequest } from "./history";
import { LanguageSwitcher } from "./components/LanguageSwitcher/LanguageSwitcher";
import { ThemeSwitcher } from "./components/ThemeSwitcher/ThemeSwitcher";

const HistoryView = lazy(() =>
  import("./components/History/HistoryView").then(m => ({ default: m.HistoryView }))
);
const ColorCorrectionCalculator = lazy(() =>
  import("./components/ColorCorrection/ColorCorrectionCalculator").then(m => ({ default: m.ColorCorrectionCalculator }))
);
const BleachCalculator = lazy(() =>
  import("./components/Bleach/BleachCalculator").then(m => ({ default: m.BleachCalculator }))
);
const ComplexColoringCalculator = lazy(() => import("./components/ComplexColoring/ComplexColoringCalculator"));
const PrePigmentationCalculator = lazy(() =>
  import("./components/PrePigmentation/PrePigmentationCalculator").then(m => ({ default: m.PrePigmentationCalculator }))
);
const AnalyticsView = lazy(() =>
  import("./components/Analytics/AnalyticsView").then(m => ({ default: m.AnalyticsView }))
);
const PaletteAdminView = lazy(() =>
  import("./components/PaletteAdmin/PaletteAdminView").then(m => ({ default: m.PaletteAdminView }))
);
const ChangePasswordModal = lazy(() =>
  import("./components/Account/ChangePasswordModal").then(m => ({ default: m.ChangePasswordModal }))
);
const BrandsIndexPage = lazy(() =>
  import("./components/BrandNotes/BrandsIndexPage").then(m => ({ default: m.BrandsIndexPage }))
);
const BrandCheatSheetPage = lazy(() =>
  import("./components/BrandNotes/BrandCheatSheetPage").then(m => ({ default: m.BrandCheatSheetPage }))
);

export function AuthenticatedApp({ user }: { user: User }) {
  const { t } = useTranslation();
  const brands = usePalette();
  const isAdmin = useIsAdmin(user.uid);
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<AppView>("calculator");
  const [repeatRequest, setRepeatRequest] = useState<RepeatFormulaRequest | null>(null);
  // Bumped after a formula/session save finishes showing its "Saved!" confirmation --
  // passed as `key` to whichever calculator is mounted below, forcing React to unmount
  // and remount it from scratch (brand/shade/level state, session-panel client fields,
  // everything) instead of leaving the just-saved client's values in place.
  const [formResetKey, setFormResetKey] = useState(0);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // The brand cheat sheets (BrandsIndexPage, BrandCheatSheetPage) are real routes, not
  // part of the `view` state switch below -- derives Nav's active tab from the URL
  // instead, so a directly-typed bookmark URL (e.g. /loreal) highlights "Brands" too,
  // not whatever `view` happened to default to.
  const activeView: AppView = location.pathname === "/" ? view : "brands";

  const handleViewChange = (next: AppView) => {
    if (next === "brands") {
      navigate("/brands");
      return;
    }
    navigate("/");
    setView(next);
  };

  const handleRepeat = (entry: FormulaHistoryEntry) => {
    const request = buildRepeatFormulaRequest(entry, brands);
    if (request === null) return;
    setRepeatRequest(request);
    navigate("/");
    setView("calculator");
  };

  const handleFormulaSaved = () => {
    // A stale repeatRequest would otherwise replay itself into the freshly remounted
    // calculator (see useFormulaCalculatorState's apply-on-render effect).
    setRepeatRequest(null);
    setFormResetKey(key => key + 1);
  };

  return (
    <div>
      <a href="#main-content" className="skip-link">{t("app.skipToContent")}</a>
      <header className="app-header">
        <div className="app-topbar">
          <button type="button" className="app-brand" onClick={() => { navigate("/"); setView("calculator"); }} aria-label={t("nav.calculator")}><img className="app-brand__mark" src="/favicon.svg" alt="" width="22" height="22" />{t("app.titlePrefix")}<em>{t("app.titleAccent")}</em></button>
          <Nav view={activeView} onViewChange={handleViewChange} isAdmin={isAdmin} />
          <div className="app-topbar__account">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <span>{user.email}</span>
            <button className="button button--secondary" onClick={() => setIsChangePasswordOpen(true)}>{t("account.changePassword")}</button>
            <button className="button button--secondary" onClick={() => signOut(auth)}>{t("account.signOut")}</button>
          </div>
        </div>
      </header>
      {isChangePasswordOpen && (
        <Suspense fallback={null}>
          <ChangePasswordModal user={user} onClose={() => setIsChangePasswordOpen(false)} />
        </Suspense>
      )}
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/brands" element={<BrandsIndexPage />} />
            <Route path="/:brandId" element={<BrandCheatSheetPage />} />
            <Route
              path="/"
              element={
                <>
                  {view === "calculator" && (
                    <FormulaCalculator
                      key={formResetKey}
                      appliedBy={user.email ?? "unknown"}
                      repeatRequest={repeatRequest}
                      onSaved={handleFormulaSaved}
                    />
                  )}
                  {view === "correction" && <ColorCorrectionCalculator />}
                  {view === "bleach" && <BleachCalculator />}
                  {view === "complex" && <ComplexColoringCalculator key={formResetKey} appliedBy={user.email ?? "unknown"} onSaved={handleFormulaSaved} />}
                  {view === "prepigment" && <PrePigmentationCalculator />}
                  {view === "history" && <HistoryView onRepeat={handleRepeat} isAdmin={isAdmin} currentUserEmail={user.email ?? ""} />}
                  {view === "analytics" && <AnalyticsView isAdmin={isAdmin} currentUserEmail={user.email ?? ""} />}
                  {view === "palette" && isAdmin && <PaletteAdminView />}
                </>
              }
            />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
