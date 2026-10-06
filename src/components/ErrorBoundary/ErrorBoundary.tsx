import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "../../i18n";
import "./ErrorBoundary.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// A render error anywhere below this boundary used to blank the whole page -- React
// unmounts the entire tree on an uncaught error with no boundary to stop it. Catching it
// here instead shows a reload button and, for whoever investigates, the raw error
// message. No hooks in a class component, so i18n.t is called directly rather than
// through useTranslation.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info);
  }

  render() {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }

    return (
      <div className="calculator" role="alert">
        <h1 className="calculator__title">{i18n.t("app.crashTitle")}</h1>
        <p>{i18n.t("app.crashBody")}</p>
        <button type="button" className="button" onClick={() => window.location.reload()}>
          {i18n.t("app.crashReload")}
        </button>
        <pre className="error-boundary__details">{error.message}</pre>
      </div>
    );
  }
}
