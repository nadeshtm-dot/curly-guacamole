# Carpe Diem

Your day on one notepad page: personal calendar, office calendar, emails to act on, reminders, and your own tasks, plus a daily note sent as a reminder each morning.

## Why a PWA
One codebase runs on macOS, iPhone and Android with no app-store step:
- **iPhone**: open in Safari, Share, Add to Home Screen. iOS 16.4+ allows notifications for home-screen apps.
- **Android**: open in Chrome, Install app.
- **macOS**: open in Safari (Sonoma+) File > Add to Dock, or Chrome > Install.
If you later want App Store / Play Store builds, the same page can be wrapped with Capacitor.

## Files
- `src/page.html` – the whole app (UI, sample data adapters, daily note).
- `app/` – the installable build (`index.html`, `manifest.json`, `sw.js`, `icon.svg`). Rebuild with `sh build.sh`.
- Run locally: `cd app && python3 -m http.server 8000`, then open http://localhost:8000.

## Connecting Google (calendar, Gmail, Google Tasks)
The app signs in to Google straight from the browser. It needs a free OAuth client ID that you create once:
1. https://console.cloud.google.com/projectcreate: create a project called Carpe Diem.
2. APIs & Services > Library: enable Google Calendar API, Gmail API and Google Tasks API.
3. Google Auth Platform (OAuth consent screen): User type External, app name Carpe Diem, your email. Under Audience, add your Google addresses (personal and work) as test users.
4. Clients > Create client > Web application. Authorized JavaScript origins: `https://nadeshtm-dot.github.io`. Copy the client ID.
5. In Carpe Diem, paste the client ID under Google accounts, Save, then Connect.
Google will warn the app is unverified; that is expected for a personal app in testing. Choose Continue.
Access is read-only. Sign-in lasts about an hour, then tap Connect again.

## Connecting other services
Each source is an adapter in `src/page.html` (search for "Data adapters"). Replace the sample body with:
| Source | Service | What you'd connect |
|---|---|---|
| Personal calendar | Google Calendar API, or iCloud via CalDAV | Google account (OAuth) or an iCloud app-specific password |
| Office calendar | Microsoft Graph `/me/calendarView` (Outlook/Teams) or Google Workspace | Work Microsoft 365 account; IT may need to approve the app |
| Email | Gmail API (starred/unread) or Graph `/me/messages` (flagged) | Same Google / Microsoft sign-ins |
| Reminders | Apple Reminders has no web API: use an iOS Shortcut that posts them, or switch to Google Tasks / Microsoft To Do | Shortcut on iPhone, or Tasks/To Do sign-in |

## Daily reminder
Works now while the app is open. To fire when it is closed on phones, the next step is a small push backend (Web Push) or a Capacitor wrapper with local notifications.
