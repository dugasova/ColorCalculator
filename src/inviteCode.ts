// Gate for self sign-up: the invite form requires this shared code before calling
// Firebase Auth's createUser. This is a light deterrent against casual visitors, not
// the real security boundary -- it ships in the client bundle and can be read by
// anyone who looks, and nothing stops a visitor from calling the Auth API directly and
// skipping it. The actual boundary is firestore.rules' `isMember()`: a new account,
// invite code or not, can't read or write any salon data until an admin creates a
// `users/{uid}` document for it (see that file's comment, and src/roles.ts). Change
// this code here if it leaks or when rotating staff -- that only affects who bothers
// signing up, not who can act once signed up.
export const SALON_INVITE_CODE = "482026";
