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

## Connecting real data
Each source is an adapter in `src/page.html` (search for "Data adapters"). Replace the sample body with:
| Source | Service | What you'd connect |
|---|---|---|
| Personal calendar | Google Calendar API, or iCloud via CalDAV | Google account (OAuth) or an iCloud app-specific password |
| Office calendar | Microsoft Graph `/me/calendarView` (Outlook/Teams) or Google Workspace | Work Microsoft 365 account; IT may need to approve the app |
| Email | Gmail API (starred/unread) or Graph `/me/messages` (flagged) | Same Google / Microsoft sign-ins |
| Reminders | Apple Reminders has no web API: use an iOS Shortcut that posts them, or switch to Google Tasks / Microsoft To Do | Shortcut on iPhone, or Tasks/To Do sign-in |

## Daily reminder
Works now while the app is open. To fire when it is closed on phones, the next step is a small push backend (Web Push) or a Capacitor wrapper with local notifications.
