// Gate for self sign-up: anyone creating an account gets full access to every
// client's history (Firestore rule is `allow read, write: if request.auth != null`),
// so new accounts require this shared code. This is a light deterrent against casual
// visitors, not real security — it ships in the client bundle and can be read by
// anyone who looks. Change it here if it leaks or when rotating staff.
export const SALON_INVITE_CODE = "SALON_INVITE_CODE";
