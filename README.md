# Running Academy HUB CRM - Google Apps Script V1

Free/low-cost CRM for a running coaching team. The system runs inside Google Apps Script and uses Google Sheets, Docs, Drive, Calendar, Forms, and Telegram.

## What This Project Contains

- Google Apps Script backend for clients, services, notes, files, follow-ups, and inbox processing.
- Mobile-friendly HTML Service UI.
- Telegram webhook handler for fast notes and files.
- One-time setup routine that creates the CRM spreadsheet, Drive folders, document templates, and CRM calendar.

## Deployment Summary

1. Create a new Google Apps Script project.
2. Copy all files from `src/` into Apps Script, preserving file names.
3. Copy `appsscript.json` into the project manifest.
4. Run `setupCrm()` once from Apps Script.
5. Deploy as a web app.
6. Add the deployed web app URL to Telegram using `setTelegramWebhook()`.

See [docs/SETUP.md](docs/SETUP.md) for exact steps.
