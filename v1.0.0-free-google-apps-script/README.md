# Running Academy HUB CRM - Google Apps Script V1

Free/low-cost CRM for a running coaching team. The system runs inside Google Apps Script and uses Google Sheets, Docs, Drive, Calendar, Forms, and Telegram.

## What This Project Contains

- Google Apps Script backend for clients, services, notes, files, follow-ups, and inbox processing.
- Mobile-friendly HTML Service UI.
- Telegram webhook handler for fast notes and files.
- One-time setup routine that creates the CRM spreadsheet, Drive folders, document templates, and CRM calendar.

## Files

- `appsscript.json` - Apps Script manifest and OAuth scopes.
- `src/Code.gs` - web app entrypoints and setup.
- `src/Config.gs` - constants, sheet schemas, service list.
- `src/Store.gs` - Google Sheets database helpers.
- `src/Clients.gs` - client/service/note/follow-up logic.
- `src/DriveDocs.gs` - Drive folders and Google Docs cards/templates.
- `src/Calendar.gs` - CRM calendar integration.
- `src/Telegram.gs` - Telegram webhook and message parsing.
- `src/UiApi.gs` - functions called from the HTML UI.
- `src/Index.html` - mobile web UI.
- `docs/SETUP.md` - deployment and operating guide.

## Deployment Summary

1. Create a new Google Apps Script project.
2. Copy all files from `src/` into Apps Script, preserving file names.
3. Copy `appsscript.json` into the project manifest.
4. Run `setupCrm()` once from Apps Script.
5. Deploy as a web app.
6. Add the deployed web app URL to Telegram using `setTelegramWebhook()`.

See [docs/SETUP.md](docs/SETUP.md) for exact steps.
