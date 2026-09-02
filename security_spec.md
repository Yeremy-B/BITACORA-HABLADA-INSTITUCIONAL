# Security Specification: Fortress Security Model

## 1. Data Invariants
- **Catch-All Default Deny**: All unspecified paths are closed by default (`match /{document=**} { allow read, write: if false; }`).
- **User Isolation**: A user can only read and write documents inside their own subcollection `/users/{userId}/**` where `request.auth.uid == userId`.
- **Institutional Domain Isolation**: Documents in `/reports/{reportId}` must have an `orgDomain` matching the authenticated user's email domain (`request.auth.token.email.split('@')[1]`).
- **Immutability & Integrity**: `authorUid`, `orgDomain`, and `createdAt` cannot be altered after creation.
- **Payload Bound Limits**: Strings (titles, content, folios) and arrays (tags) are strictly bounded in size to prevent Denial-of-Wallet attacks.
- **Document ID Hardening**: Document IDs must conform to `isValidId()` (alphanumeric, hyphens, underscores, max length 128).

## 2. Dirty Dozen Attack Payloads
1. **Unauthenticated Write**: Attempting to write without `request.auth`. -> `PERMISSION_DENIED`
2. **Cross-Tenant Read**: User from `empresa-a.com` reading `/reports/{reportId}` from `empresa-b.com`. -> `PERMISSION_DENIED`
3. **Cross-Tenant Write**: User from `empresa-a.com` forging `orgDomain: "empresa-b.com"`. -> `PERMISSION_DENIED`
4. **Author UID Spoofing**: User `UID_A` creating a report with `authorUid: "UID_B"`. -> `PERMISSION_DENIED`
5. **ID Poisoning / Oversized ID**: Creating a doc with 2KB junk character string ID. -> `PERMISSION_DENIED`
6. **Cross-User Private Notes Injection**: User A writing to `/users/UserB/notes/note1`. -> `PERMISSION_DENIED`
7. **Ghost Field / Shadow Injection**: Writing an unvalidated field `isAdmin: true` into a report. -> `PERMISSION_DENIED`
8. **Immutability Violation**: Modifying `orgDomain` or `authorUid` in an update payload. -> `PERMISSION_DENIED`
9. **Unbounded Payload Flood**: Sending a note body > 100,000 characters. -> `PERMISSION_DENIED`
10. **Tag Array Flooding**: Injecting an array with 1,000 strings. -> `PERMISSION_DENIED`
11. **Malicious Delete**: User B deleting User A's institutional report. -> `PERMISSION_DENIED`
12. **Catch-All Bypass**: Direct read/write access to root collections or unintended paths. -> `PERMISSION_DENIED`
