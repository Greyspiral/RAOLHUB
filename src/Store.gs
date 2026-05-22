function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(CRM.PROPERTY_KEYS.SPREADSHEET_ID);
  if (!id) throw new Error('CRM spreadsheet is not configured. Run setupCrm() first.');
  return SpreadsheetApp.openById(id);
}

function ensureSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(CRM.PROPERTY_KEYS.SPREADSHEET_ID);
  if (existingId) {
    try {
      return SpreadsheetApp.openById(existingId);
    } catch (err) {
      props.deleteProperty(CRM.PROPERTY_KEYS.SPREADSHEET_ID);
    }
  }
  const root = ensureRootFolder_();
  const files = root.getFilesByName(CRM.SPREADSHEET_NAME);
  if (files.hasNext()) {
    const file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }
  const spreadsheet = SpreadsheetApp.create(CRM.SPREADSHEET_NAME);
  const file = DriveApp.getFileById(spreadsheet.getId());
  root.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  return spreadsheet;
}

function ensureAllSheets_(spreadsheet) {
  Object.keys(CRM.SHEETS).forEach(function(key) {
    ensureSheet_(spreadsheet, CRM.SHEETS[key].name, CRM.SHEETS[key].headers);
  });
  const first = spreadsheet.getSheets()[0];
  if (first && first.getName() === 'Sheet1' && spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(first);
  }
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some(function(header, index) { return current[index] !== header; });
  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#17324D').setFontColor('#FFFFFF');
  }
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function getSheet_(sheetKey) {
  const config = CRM.SHEETS[sheetKey];
  if (!config) throw new Error('Unknown sheet key: ' + sheetKey);
  return getSpreadsheet_().getSheetByName(config.name);
}

function getRows_(sheetKey) {
  const config = CRM.SHEETS[sheetKey];
  const sheet = getSheet_(sheetKey);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).filter(function(row) {
    return row.some(function(cell) { return cell !== ''; });
  }).map(function(row, index) {
    const record = { _rowNumber: index + 2 };
    headers.forEach(function(header, col) { record[header] = row[col]; });
    return record;
  });
}

function appendRecord_(sheetKey, record) {
  const config = CRM.SHEETS[sheetKey];
  const sheet = getSheet_(sheetKey);
  const row = config.headers.map(function(header) { return record[header] !== undefined ? record[header] : ''; });
  sheet.appendRow(row);
  return record;
}

function updateRecord_(sheetKey, rowNumber, updates) {
  const config = CRM.SHEETS[sheetKey];
  const sheet = getSheet_(sheetKey);
  const current = sheet.getRange(rowNumber, 1, 1, config.headers.length).getValues()[0];
  config.headers.forEach(function(header, index) {
    if (updates[header] !== undefined) current[index] = updates[header];
  });
  sheet.getRange(rowNumber, 1, 1, config.headers.length).setValues([current]);
  return true;
}

function findById_(sheetKey, idHeader, id) {
  return getRows_(sheetKey).find(function(row) { return String(row[idHeader]) === String(id); }) || null;
}

function seedSettings_() {
  const existing = getRows_('SETTINGS').map(function(row) { return row['Klíč']; });
  const settings = [
    ['followup_after_analysis_days', '30,90,180', 'Výchozí follow-up po analýze techniky.'],
    ['default_task_priority', 'Normální', 'Výchozí priorita úkolů.'],
    ['crm_owner_name', 'Pavel Grepl', 'Hlavní administrátor systému.']
  ];
  settings.forEach(function(item) {
    if (existing.indexOf(item[0]) === -1) {
      appendRecord_('SETTINGS', { 'Klíč': item[0], 'Hodnota': item[1], 'Poznámka': item[2] });
    }
  });
}

function getSetting_(key, fallback) {
  const row = getRows_('SETTINGS').find(function(item) { return item['Klíč'] === key; });
  return row ? row['Hodnota'] : fallback;
}

function seedServiceCatalog_() {
  const rows = getRows_('SERVICES');
  if (rows.length > 0) return;
  CRM.SERVICES.forEach(function(service) {
    appendRecord_('SERVICES', {
      'Service ID': crmUuid_('SVC'),
      'Client ID': '',
      'Služba': service,
      'Stav': 'Katalog',
      'Začátek': '',
      'Konec': '',
      'Cena / poznámka': '',
      'Vytvořeno': crmFormatDateTime_(crmNow_()),
      'Aktualizováno': crmFormatDateTime_(crmNow_())
    });
  });
}
