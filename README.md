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

## Connecting Microsoft (Outlook calendar, mail, To Do)
Works with a work/school account or a personal Outlook.com account. Register the app once:
1. https://entra.microsoft.com > Applications > App registrations > New registration. Name: Carpe Diem.
2. Supported account types: accounts in any organizational directory and personal Microsoft accounts.
3. Redirect URI: platform **Single-page application (SPA)**, URL `https://nadeshtm-dot.github.io/curly-guacamole/`. Register.
4. Copy the Application (client) ID from the Overview page.
5. In Carpe Diem, paste it under Microsoft account, Save, then Connect.
Permissions requested (read-only, delegated): Calendars.Read, Mail.Read, Tasks.Read, User.Read, offline_access. Some companies require IT approval for these.
Microsoft stays signed in for about a day before asking again.

## Headlines (CNN and The Star)
`.github/workflows/news.yml` runs `scripts/fetch-news.mjs` every hour. It reads the CNN and The Star (Malaysia) RSS feeds and writes `news.json`, which the app shows as headlines with a one-line brief from each story's summary. If a feed goes stale it falls back to Google News results for that site (headline only). Run it by hand from the repo's Actions tab: Refresh news, Run workflow.

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
