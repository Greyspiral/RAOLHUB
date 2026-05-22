# Running Academy HUB CRM - Setup

## 1. Vytvoření Apps Script projektu

1. Otevři https://script.google.com.
2. Vytvoř nový projekt.
3. V nastavení projektu zaškrtni zobrazení souboru `appsscript.json`.
4. Zkopíruj obsah lokálního `appsscript.json` do manifestu v Apps Scriptu.
5. Vytvoř soubory podle adresáře `src/` a zkopíruj do nich obsah:
   - `Code.gs`
   - `Config.gs`
   - `Store.gs`
   - `Clients.gs`
   - `DriveDocs.gs`
   - `Calendar.gs`
   - `Telegram.gs`
   - `Forms.gs`
   - `UiApi.gs`
   - `Index.html`

## 2. První setup Google úložiště

1. V Apps Script editoru vyber funkci `setupCrm`.
2. Spusť ji.
3. Povol požadovaná oprávnění.
4. Funkce vytvoří:
   - hlavní Drive složku `Running Academy HUB`
   - CRM Google Sheet
   - složky `Klienti`, `Sablony`, `Formulare`, `Testy a obrazky`, `Exporty`, `Inbox soubory`
   - šablonu klientské karty
   - samostatný Google Calendar `Running Academy HUB CRM`

## 3. Nasazení webové aplikace

1. Klikni na `Deploy` / `Nasadit`.
2. Vyber `Web app`.
3. Execute as: `Me`.
4. Who has access: pro první test `Anyone with the link`; pro ostřejší provoz omez podle účtů.
5. Zkopíruj URL webové aplikace.
6. Spusť v Apps Scriptu:

```js
setWebAppUrl('SEM_VLOZ_WEB_APP_URL')
setUiPin('aspon-6-znaku-tajny-pin')
```

Telegram webhook vyžaduje veřejně dostupnou web app URL. UI proto chrání jednoduchý PIN na úrovni serverových funkcí. Pro ostrý provoz nepoužívej krátký číselný PIN; zvol delší frázi.

## 4. Telegram bot

1. Založ Telegram účet.
2. V Telegramu otevři `@BotFather`.
3. Použij `/newbot` a vytvoř bota.
4. Zkopíruj token.
5. V Apps Scriptu spusť:

```js
setTelegramBotToken('SEM_VLOZ_TELEGRAM_TOKEN')
setTelegramSecret('libovolny-dlouhy-tajny-retezec')
setTelegramWebhook()
```

## 5. Používání Telegramu

Doporučený formát:

```text
Jan Novák - dnes řešena bolest achilovky, kontrola za 14 dní
```

Když je klient nalezen jednoznačně, poznámka se zapíše do historie i klientské karty. Když je shoda nejasná, zpráva skončí v Inboxu.

## 6. Google Forms

Pro každý existující formulář:

1. Otevři cílovou tabulku odpovědí.
2. Přidej Apps Script trigger, který po odeslání formuláře zavolá vlastní mapovací funkci.
3. Pro každý formulář bude potřeba domapovat názvy otázek na pole `upsertClient()`.

Pokud má odpovědní tabulka standardní názvy polí, můžeš rovnou použít obecný handler `onFormSubmit`. Umí číst varianty typu `Jméno a příjmení`, `Jméno`, `Příjmení`, `E-mail`, `Telefon`, `Datum narození`, `Služba/Služby`, `Poznámka`.

Trigger pro odpovědní tabulku lze založit ručně v Apps Scriptu, nebo funkcí:

```js
installFormSubmitTrigger('SPREADSHEET_ID_ODPOVEDI_FORMULARE', 'onFormSubmit')
```

Když má formulář velmi specifické názvy otázek, vytvoř vlastní mapovací funkci:

```js
function onContactFormSubmit(e) {
  const values = e.namedValues;
  upsertClient({
    firstName: values['Jméno'] && values['Jméno'][0],
    lastName: values['Příjmení'] && values['Příjmení'][0],
    email: values['E-mail'] && values['E-mail'][0],
    phone: values['Telefon'] && values['Telefon'][0],
    source: 'Google Form - kontakty'
  });
}
```

## 7. Doporučení k úložišti

Protože už máš rozšířený Google Disk, může systém ukládat dokumenty, obrázky a Plaud přepisy. Ve v1 doporučuji neposílat do systému dlouhé audio archivy automaticky. Když audio do Telegramu pošleš, systém ho uloží do `Inbox soubory`, ale hlavní workflow počítá s Plaud přepisem/summary.

## 8. Bezpečnostní poznámky

- Apps Script poběží pod účtem, který aplikaci nasadí.
- Systém pracuje jen se složkou, kterou si vytvoří/uloží v nastavení, ale OAuth oprávnění Google Apps Scriptu jsou širší. V praxi proto používej samostatnou hlavní složku a nesdílej mimo ni citlivé soubory.
- Fyzioterapeutce dej přístup do webové aplikace a případně do hlavní Drive složky podle toho, co má upravovat.
