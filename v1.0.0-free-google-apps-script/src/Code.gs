function doGet(e) {
  const page = HtmlService.createTemplateFromFile('Index');
  page.boot = JSON.stringify(getUiBootData());
  return page
    .evaluate()
    .setTitle(CRM.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  return handleTelegramWebhook(e);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupCrm() {
  const props = PropertiesService.getScriptProperties();
  const root = ensureRootFolder_();
  const folders = ensureStandardFolders_(root);
  const spreadsheet = ensureSpreadsheet_();
  ensureAllSheets_(spreadsheet);
  const calendar = ensureCrmCalendar_();
  const template = ensureClientCardTemplate_(folders.Sablony);

  props.setProperties({
    [CRM.PROPERTY_KEYS.ROOT_FOLDER_ID]: root.getId(),
    [CRM.PROPERTY_KEYS.SPREADSHEET_ID]: spreadsheet.getId(),
    [CRM.PROPERTY_KEYS.CALENDAR_ID]: calendar.getId(),
    [CRM.PROPERTY_KEYS.CLIENT_TEMPLATE_DOC_ID]: template.getId()
  }, true);

  seedSettings_();
  seedServiceCatalog_();

  return {
    ok: true,
    rootFolderUrl: root.getUrl(),
    spreadsheetUrl: spreadsheet.getUrl(),
    calendarId: calendar.getId(),
    templateUrl: template.getUrl()
  };
}

function getSetupStatus() {
  const props = PropertiesService.getScriptProperties();
  return {
    rootFolderId: props.getProperty(CRM.PROPERTY_KEYS.ROOT_FOLDER_ID),
    spreadsheetId: props.getProperty(CRM.PROPERTY_KEYS.SPREADSHEET_ID),
    calendarId: props.getProperty(CRM.PROPERTY_KEYS.CALENDAR_ID),
    clientTemplateDocId: props.getProperty(CRM.PROPERTY_KEYS.CLIENT_TEMPLATE_DOC_ID),
    webAppUrl: props.getProperty(CRM.PROPERTY_KEYS.WEB_APP_URL),
    telegramConfigured: Boolean(props.getProperty(CRM.PROPERTY_KEYS.TELEGRAM_BOT_TOKEN))
  };
}

function setWebAppUrl(url) {
  PropertiesService.getScriptProperties().setProperty(CRM.PROPERTY_KEYS.WEB_APP_URL, url);
  return { ok: true, webAppUrl: url };
}

function setUiPin(pin) {
  if (!pin || String(pin).length < 6) throw new Error('UI PIN musí mít alespoň 6 znaků.');
  PropertiesService.getScriptProperties().setProperty(CRM.PROPERTY_KEYS.UI_PIN, String(pin));
  return { ok: true };
}
