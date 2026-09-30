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
import type { FavoriteFormulaRecipe } from "./favoriteFormulas";
import { LanguageSwitcher } from "./components/LanguageSwitcher/LanguageSwitcher";
import { ThemeSwitcher } from "./components/ThemeSwitcher/ThemeSwitcher";
import { AccountMenu } from "./components/AccountMenu/AccountMenu";
import { useNativeBackButton } from "./nativeBackButton";
import { useOnlineStatus } from "./useOnlineStatus";

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
const OrderListView = lazy(() =>
  import("./components/OrderList/OrderListView").then(m => ({ default: m.OrderListView }))
);
const ChangePasswordModal = lazy(() =>
  import("./components/Account/ChangePasswordModal").then(m => ({ default: m.ChangePasswordModal }))
);
const ReferenceIndexPage = lazy(() =>
  import("./components/Reference/ReferenceIndexPage").then(m => ({ default: m.ReferenceIndexPage }))
);
const BrandCheatSheetPage = lazy(() =>
  import("./components/BrandNotes/BrandCheatSheetPage").then(m => ({ default: m.BrandCheatSheetPage }))
);
const GuideCheatSheetPage = lazy(() =>
  import("./components/Guides/GuideCheatSheetPage").then(m => ({ default: m.GuideCheatSheetPage }))
);
const FavoritesPage = lazy(() =>
  import("./components/FormulaCalculator/FavoritesPage").then(m => ({ default: m.FavoritesPage }))
);

export function AuthenticatedApp({ user }: { user: User }) {
  const { t } = useTranslation();
  const brands = usePalette();
  const isAdmin = useIsAdmin(user.uid);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<AppView>("calculator");
  const [repeatRequest, setRepeatRequest] = useState<RepeatFormulaRequest | null>(null);
  const [favoriteRequest, setFavoriteRequest] = useState<FavoriteFormulaRecipe | null>(null);
  // Bumped after a formula/session save finishes showing its "Saved!" confirmation --
  // passed as `key` to whichever calculator is mounted below, forcing React to unmount
  // and remount it from scratch (brand/shade/level state, session-panel client fields,
  // everything) instead of leaving the just-saved client's values in place.
  const [formResetKey, setFormResetKey] = useState(0);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // The brand cheat sheets and technique guides (ReferenceIndexPage, BrandCheatSheetPage,
  // GuideCheatSheetPage) are real routes, not part of the `view` state switch below --
  // derives Nav's active tab from the URL instead, so a directly-typed bookmark URL
  // (e.g. /loreal or /guides/resistant-gray) highlights the "Reference" tab too, not
  // whatever `view` happened to default to. Every non-"/" pathname belongs to this one
  // combined reference tab -- there's no other route-backed (as opposed to `view`-state)
  // screen in the app.
  const activeView: AppView = location.pathname === "/" ? view : "reference";

  // One step of Android back-button/swipe navigation: leave a brand cheat-sheet route,
  // else return from a non-calculator tab to the calculator, else (already home) hand
  // back `false` so useNativeBackButton lets the app actually exit. See nativeBackButton.ts.
  useNativeBackButton(() => {
    if (location.pathname !== "/") {
      navigate("/");
      return true;
    }
    if (view !== "calculator") {
      setView("calculator");
      return true;
    }
    return false;
  });

  const handleViewChange = (next: AppView) => {
    if (next === "reference") {
      navigate("/reference");
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

  // Mirrors handleRepeat above: FavoritesPage only picks which recipe, the actual
  // insertion into the live calculator form happens back on "/" (see
  // FormulaCalculator's favoriteRequest prop + useFormulaCalculatorState's replay).
  const handleApplyFavorite = (recipe: FavoriteFormulaRecipe) => {
    setFavoriteRequest(recipe);
    navigate("/");
    setView("calculator");
  };

  const handleFormulaSaved = () => {
    // A stale repeatRequest/favoriteRequest would otherwise replay itself into the
    // freshly remounted calculator (see useFormulaCalculatorState's apply-on-render effect).
    setRepeatRequest(null);
    setFavoriteRequest(null);
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
            <AccountMenu
              email={user.email}
              onChangePassword={() => setIsChangePasswordOpen(true)}
              onSignOut={() => signOut(auth)}
            />
          </div>
        </div>
      </header>
      {!isOnline && <p className="offline-banner" role="status">{t("app.offlineBanner")}</p>}
      {isChangePasswordOpen && (
        <Suspense fallback={null}>
          <ChangePasswordModal user={user} onClose={() => setIsChangePasswordOpen(false)} />
        </Suspense>
      )}
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/reference" element={<ReferenceIndexPage />} />
            <Route path="/guides/:guideId" element={<GuideCheatSheetPage />} />
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
                      favoriteRequest={favoriteRequest}
                      onSaved={handleFormulaSaved}
                    />
                  )}
                  {view === "correction" && <ColorCorrectionCalculator />}
                  {view === "bleach" && <BleachCalculator />}
                  {view === "complex" && <ComplexColoringCalculator key={formResetKey} appliedBy={user.email ?? "unknown"} onSaved={handleFormulaSaved} />}
                  {view === "prepigment" && <PrePigmentationCalculator />}
                  {view === "history" && <HistoryView onRepeat={handleRepeat} isAdmin={isAdmin} currentUserEmail={user.email ?? ""} />}
                  {view === "analytics" && <AnalyticsView isAdmin={isAdmin} currentUserEmail={user.email ?? ""} />}
                  {view === "favorites" && <FavoritesPage appliedBy={user.email ?? "unknown"} brands={brands} onApply={handleApplyFavorite} />}
                  {view === "palette" && isAdmin && <PaletteAdminView />}
                  {view === "orders" && isAdmin && <OrderListView />}
                </>
              }
            />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
