# CHROME WEB STORE SUBMISSION JUSTIFICATIONS

Copy and paste these sections into the relevant fields in the Chrome Web Store developer console.

---

## SINGLE PURPOSE DESCRIPTION
Messenger CRM is a productivity extension designed to organize Facebook Messenger conversations. It allows users to manage their sales pipeline or social network directly within the Messenger interface by adding custom status tags (Done, Pending, Not Interested), filtering conversations by status, and providing a central dashboard for lead management and conversion tracking.

---

## STORAGE PERMISSION JUSTIFICATION
The 'storage' permission is essential for core functionality. It is used to locally save contact status markers, extracted profile data (names and avatars), and activity logs. This ensures that a user's CRM data is persistent across browser sessions and stays securely on their device without requiring a remote database.

---

## HOST PERMISSION JUSTIFICATION
Host permissions for 'messenger.com' and 'facebook.com' are required to inject the CRM user interface elements (status buttons, filter bar, and modals) directly into the Messaging platform. This access also enables the extension to automatically extract contact metadata from the DOM to populate the user's CRM dashboard for efficient relationship management.

---

## REMOTE CODE JUSTIFICATION
**Are you using remote code?** No.

---

## USER DATA PRIVACY DISCLOSURES

Based on the extension's functionality, you should check/state the following in the Privacy tab:

### 1. What user data do you plan to collect?
Check only the following categories:

*   **Personally identifiable information**: YES (The extension extracts and stores **Names** from Messenger profiles locally to identify contacts in the CRM).
*   **Website content**: YES (The extension extracts and stores **Text** (names) and **Images** (avatar URLs) directly from messenger.com to populate the dashboard).

**All other categories (Health, Financial, Authentication, Personal communications, etc.) should be NO.**
*Note on "Personal communications": Although the extension interacts with Messenger, it DOES NOT read or store the content of messages. It only tracks the "status" of the conversation thread.*

### 2. User Data Disclosures (Certifications)
**You MUST certify all three of these:**
1.  **I do not sell or transfer user data** to third parties, outside of the approved use cases.
2.  **I do not use or transfer user data** for purposes that are unrelated to my item's single purpose.
3.  **I do not use or transfer user data** to determine creditworthiness or for lending purposes.

---

## IMPORTANT NOTES FOR SUBMISSION
- **Remote Code**: Select **NO**.
- **Data Storage**: In your privacy policy, state that all data is stored **locally** on the user's browser (via `chrome.storage.local`) and is never transmitted to an external server.
