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

  const handleRepeat = (entry: FormulaHistoryEntry) => {
    const request = buildRepeatFormulaRequest(entry, brands);
    if (request === null) return;
    setRepeatRequest(request);
    setView('calculator');
  };

  return (
    <div>
      <header className="app-header">
        <div className="app-topbar">
          <span className="app-brand">{t('app.titlePrefix')} <em>{t('app.titleAccent')}</em></span>
          <Nav view={view} onViewChange={setView} isAdmin={isAdmin} />
          <div className="app-topbar__account">
            <LanguageSwitcher />
            <span>{user.email}</span>
            <button className="button button--secondary" onClick={() => signOut(auth)}>{t('account.signOut')}</button>
          </div>
        </div>
      </header>
      <main className="app-main">
        {view === 'calculator' && (
          <FormulaCalculator
            appliedBy={user.email ?? 'unknown'}
            repeatRequest={repeatRequest}
          />
        )}
        <Suspense fallback={null}>
          {view === 'correction' && <ColorCorrectionCalculator />}
          {view === 'bleach' && <BleachCalculator />}
          {view === 'complex' && <ComplexColoringCalculator appliedBy={user.email ?? 'unknown'} />}
          {view === 'history' && <HistoryView onRepeat={handleRepeat} />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'palette' && isAdmin && <PaletteAdminView />}
        </Suspense>
      </main>
    </div>
  );
}
