import type { ClientHistoryGroup } from "./useHistoryData";
import { useTranslation } from "react-i18next";

interface ClientGroupListProps {
	groups: ClientHistoryGroup[];
	setOpenGroupKey: (key: string) => void;
}


export default function ClientGroupList({ groups, setOpenGroupKey }: ClientGroupListProps) {
	const { t } = useTranslation();
	return (
		<ul className="history__list">
			{groups.map(group => (
				<li key={group.key}>
					<div className="history__client-group">
						<button
							type="button"
							className="history__client-group-summary"
							onClick={() => setOpenGroupKey(group.key)}
							aria-haspopup="dialog"
						>
							<span className="history__client-group-name">{group.displayName}</span>
							<span className="history__client-group-meta">
								{t("history.visitCount", { count: group.entries.length })}
								{group.entries[0].appliedAt &&
									` · ${t("history.lastVisit", { date: group.entries[0].appliedAt.toDate().toLocaleDateString() })}`}
							</span>
							{group.profile !== null && (group.profile.phone !== "" || group.profile.allergyNotes !== "") && (
								<span className="history__client-group-contact">
									{group.profile.phone !== "" && <span>{t("results.clientPhoneLabel")}: {group.profile.phone}</span>}
									{group.profile.allergyNotes !== "" && <span>{t("results.allergyNotesLabel")}: {group.profile.allergyNotes}</span>}
								</span>
							)}
						</button>
					</div>
				</li>
			))}
		</ul>

	)
}
