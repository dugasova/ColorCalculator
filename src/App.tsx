import { useEffect, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./firebase";
import { PaletteProvider } from "./PaletteContext";
import { usePalette } from "./palette";
import { useIsAdmin } from "./roles";
import FormulaCalculator from "./components/FormulaCalculator/FormulaCalculator";
import { Nav, type AppView } from "./components/Nav/Nav";
import { buildRepeatFormulaRequest, type FormulaHistoryEntry, type RepeatFormulaRequest } from "./history";
import { LanguageSwitcher } from "./components/LanguageSwitcher/LanguageSwitcher";

const LoginForm = lazy(() => import("./components/LoginForm/LoginForm"));
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
const AnalyticsView = lazy(() =>
  import("./components/Analytics/AnalyticsView").then(m => ({ default: m.AnalyticsView }))
);
const PaletteAdminView = lazy(() =>
  import("./components/PaletteAdmin/PaletteAdminView").then(m => ({ default: m.PaletteAdminView }))
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return null;
  }

  if (user === null) {
    return (
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    );
  }

  // The palette catalog (built-in brands plus whatever an admin has added/discontinued)
  // is shared by the calculator, complex-coloring, history-repeat, and admin screens
  // below, so it's subscribed to once here rather than once per consumer.
  return (
    <PaletteProvider>
      <AuthenticatedApp user={user} />
    </PaletteProvider>
  );
}

function AuthenticatedApp({ user }: { user: User }) {
  const { t } = useTranslation();
  const brands = usePalette();
  const isAdmin = useIsAdmin(user.uid);
  const [view, setView] = useState<AppView>('calculator');
  const [repeatRequest, setRepeatRequest] = useState<RepeatFormulaRequest | null>(null);
  // Bumped after a formula/session save finishes showing its "Saved!" confirmation --
  // passed as `key` to whichever calculator is mounted below, forcing React to unmount
  // and remount it from scratch (brand/shade/level state, session-panel client fields,
  // everything) instead of leaving the just-saved client's values in place.
  const [formResetKey, setFormResetKey] = useState(0);

  const handleRepeat = (entry: FormulaHistoryEntry) => {
    const request = buildRepeatFormulaRequest(entry, brands);
    if (request === null) return;
    setRepeatRequest(request);
    setView('calculator');
  };

  const handleFormulaSaved = () => {
    // A stale repeatRequest would otherwise replay itself into the freshly remounted
    // calculator (see useFormulaCalculatorState's apply-on-render effect).
    setRepeatRequest(null);
    setFormResetKey(key => key + 1);
  };

  return (
    <div>
      <a href="#main-content" className="skip-link">{t('app.skipToContent')}</a>
      <header className="app-header">
        <div className="app-topbar">
          <button type="button" className="app-brand" onClick={() => setView('calculator')} aria-label={t('nav.calculator')}><img className="app-brand__mark" src="/favicon.svg" alt="" width="22" height="22" />{t('app.titlePrefix')}<em>{t('app.titleAccent')}</em></button>
          <Nav view={view} onViewChange={setView} isAdmin={isAdmin} />
          <div className="app-topbar__account">
            <LanguageSwitcher />
            <span>{user.email}</span>
            <button className="button button--secondary" onClick={() => signOut(auth)}>{t('account.signOut')}</button>
          </div>
        </div>
      </header>
      <main className="app-main" id="main-content" tabIndex={-1}>
        {view === 'calculator' && (
          <FormulaCalculator
            key={formResetKey}
            appliedBy={user.email ?? 'unknown'}
            repeatRequest={repeatRequest}
            onSaved={handleFormulaSaved}
          />
        )}
        <Suspense fallback={null}>
          {view === 'correction' && <ColorCorrectionCalculator />}
          {view === 'bleach' && <BleachCalculator />}
          {view === 'complex' && <ComplexColoringCalculator key={formResetKey} appliedBy={user.email ?? 'unknown'} onSaved={handleFormulaSaved} />}
          {view === 'history' && <HistoryView onRepeat={handleRepeat} />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'palette' && isAdmin && <PaletteAdminView />}
        </Suspense>
      </main>
    </div>
  );
}
