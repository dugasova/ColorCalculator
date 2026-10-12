import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  approveAccessRequest,
  rejectAccessRequest,
  subscribeToPendingAccessRequests,
  type AccessRequest,
} from "../../accessRequests";
import { trackEvent } from "../../productAnalytics";
import "../FormulaCalculator/FormulaCalculator.css";
import "./TeamView.css";

// Admin-only screen (see AuthenticatedApp's `view === "team" && isAdmin` gate, mirroring
// Palette/Orders) listing every still-pending src/accessRequests.ts request, oldest
// first, with an approve/decline action for each. A request's row disappears on its own
// once acted on -- approve deletes the document, decline flips its status to "rejected"
// (no longer "pending") -- so there's no local list mutation here, only the live
// subscription's own next snapshot.
export function TeamView() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => subscribeToPendingAccessRequests(setRequests, err => {
    console.error(err);
    setLoadError(true);
  }), []);

  const handleDecide = async (uid: string, decision: "approve" | "reject") => {
    setBusyUid(uid);
    setActionError(null);
    try {
      await (decision === "approve" ? approveAccessRequest(uid) : rejectAccessRequest(uid));
      trackEvent(decision === "approve" ? "access_approved" : "access_rejected");
    } catch (err) {
      console.error(err);
      setActionError(t("team.actionError"));
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="calculator">
      <h1 className="calculator__title">{t("team.title")}</h1>
      <p className="calculator__subtitle">{t("team.subtitle")}</p>

      {loadError && <p className="warning" role="alert">{t("team.loadError")}</p>}
      {actionError && <p className="warning" role="alert">{actionError}</p>}

      {!loadError && requests.length === 0 && <p>{t("team.empty")}</p>}

      {requests.length > 0 && (
        <ul className="team__list">
          {requests.map(request => (
            <li key={request.id} className="team__item">
              <span>{request.email}</span>
              {request.requestedAt !== null && (
                <span>{t("team.requestedAt", { date: request.requestedAt.toDate().toLocaleDateString() })}</span>
              )}
              <button
                type="button"
                className="button"
                disabled={busyUid !== null}
                onClick={() => void handleDecide(request.id, "approve")}
              >
                {t("team.approve")}
              </button>
              <button
                type="button"
                className="button button--secondary"
                disabled={busyUid !== null}
                onClick={() => void handleDecide(request.id, "reject")}
              >
                {t("team.reject")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
