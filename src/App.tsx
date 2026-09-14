import { useEffect, useState, lazy, Suspense } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";
import { PaletteProvider } from "./PaletteContext";
import { AuthenticatedApp } from "./AuthenticatedApp";

const LoginForm = lazy(() => import("./components/LoginForm/LoginForm"));
const VerifyEmailScreen = lazy(() =>
  import("./components/VerifyEmail/VerifyEmailScreen").then(m => ({ default: m.VerifyEmailScreen }))
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Bumped after VerifyEmailScreen's `reload(user)` call resolves -- `reload` mutates
  // the existing `User` object in place rather than replacing it, so re-setting `user`
  // to the same reference wouldn't make React re-render; this forces a re-render that
  // then reads the now-fresh `user.emailVerified` off that same mutated object.
  const [, setRefreshTick] = useState(0);

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

  // Firestore rules require a verified email for every salon-data read/write (see
  // firestore.rules' `isSignedIn()`) -- this mirrors that same invariant client-side so
  // an unverified account sees an explanatory screen instead of a wall of permission
  // errors from every subscription AuthenticatedApp would otherwise open.
  if (!user.emailVerified) {
    return (
      <Suspense fallback={null}>
        <VerifyEmailScreen user={user} onRefreshed={() => setRefreshTick(t => t + 1)} />
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
