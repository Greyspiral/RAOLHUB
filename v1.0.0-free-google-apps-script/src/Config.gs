var CRM = {
  APP_NAME: 'Running Academy HUB CRM',
  ROOT_FOLDER_NAME: 'Running Academy HUB',
  SPREADSHEET_NAME: 'Running Academy HUB CRM',
  CALENDAR_NAME: 'Running Academy HUB CRM',
  CLIENT_CARD_TEMPLATE_NAME: 'Sablona - Klientská karta',
  TIMEZONE: 'Europe/Prague',
  PROPERTY_KEYS: {
    ROOT_FOLDER_ID: 'RAH_ROOT_FOLDER_ID',
    SPREADSHEET_ID: 'RAH_SPREADSHEET_ID',
    CALENDAR_ID: 'RAH_CALENDAR_ID',
    CLIENT_TEMPLATE_DOC_ID: 'RAH_CLIENT_TEMPLATE_DOC_ID',
    TELEGRAM_BOT_TOKEN: 'RAH_TELEGRAM_BOT_TOKEN',
    TELEGRAM_SECRET: 'RAH_TELEGRAM_SECRET',
    WEB_APP_URL: 'RAH_WEB_APP_URL',
    UI_PIN: 'RAH_UI_PIN'
  },
  FOLDERS: ['Klienti', 'Sablony', 'Formulare', 'Testy a obrazky', 'Exporty', 'Inbox soubory'],
  SERVICES: [
    'analýza techniky běhu',
    'tréninkový plán pro běžce',
    'individuální trénink pro běžce',
    'testování kondice',
    'fyzioterapie pro běžce',
    'běžecká konzultace',
    'silový trénink pro běžce',
    'voucher',
    'online přednáška'
  ],
  STATUSES: [
    'Nový kontakt',
    'Domlouvá se termín',
    'Aktivní',
    'Čeká na vyhodnocení',
    'Follow-up',
    'Pauza',
    'Archiv'
  ],
  SHEETS: {
    CLIENTS: {
      name: 'Klienti',
      headers: [
        'Client ID', 'Jméno', 'Příjmení', 'Celé jméno', 'E-mail', 'Telefon',
        'Datum narození', 'Stav', 'Služby', 'Zdroj', 'Poslední kontakt',
        'Poslední setkání', 'Co jsme řešili naposled', 'Další doporučené setkání',
        'Kontaktovat dne', 'Priorita', 'Souhlas se zpracováním',
        'Odkaz na kartu', 'Odkaz na složku', 'Poznámka', 'Vytvořeno', 'Aktualizováno'
      ]
    },
    SERVICES: {
      name: 'Služby',
      headers: [
        'Service ID', 'Client ID', 'Služba', 'Stav', 'Začátek', 'Konec',
        'Cena / poznámka', 'Vytvořeno', 'Aktualizováno'
      ]
    },
    NOTES: {
      name: 'Historie',
      headers: [
        'Note ID', 'Client ID', 'Datum', 'Typ', 'Zdroj', 'Autor',
        'Shrnutí', 'Detail', 'Služba', 'Přílohy', 'Vytvořeno'
      ]
    },
    TASKS: {
      name: 'Follow-upy',
      headers: [
        'Task ID', 'Client ID', 'Název', 'Popis', 'Termín', 'Stav',
        'Priorita', 'Calendar Event ID', 'Vytvořeno', 'Aktualizováno'
      ]
    },
    INBOX: {
      name: 'Inbox',
      headers: [
        'Inbox ID', 'Datum', 'Zdroj', 'Odesílatel', 'Text', 'Navržený klient',
        'Client ID', 'Stav', 'Důvod', 'Přílohy', 'Vytvořeno', 'Aktualizováno'
      ]
    },
    SETTINGS: {
      name: 'Nastavení',
      headers: ['Klíč', 'Hodnota', 'Poznámka']
    }
  }
};

function crmNow_() {
  return new Date();
}

function crmUuid_(prefix) {
  return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function crmFormatDate_(date) {
  if (!date) return '';
  return Utilities.formatDate(new Date(date), CRM.TIMEZONE, 'yyyy-MM-dd');
}

function crmFormatDateTime_(date) {
  if (!date) return '';
  return Utilities.formatDate(new Date(date), CRM.TIMEZONE, 'yyyy-MM-dd HH:mm');
}

function crmNormalize_(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function crmJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function requireUiAccess_(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty(CRM.PROPERTY_KEYS.UI_PIN);
  if (!expected) return true;
  if (String(pin || '') !== expected) throw new Error('Neplatný UI PIN.');
  return true;
}
