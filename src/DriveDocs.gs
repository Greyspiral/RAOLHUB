function ensureRootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(CRM.PROPERTY_KEYS.ROOT_FOLDER_ID);
  if (existingId) {
    try {
      return DriveApp.getFolderById(existingId);
    } catch (err) {
      props.deleteProperty(CRM.PROPERTY_KEYS.ROOT_FOLDER_ID);
    }
  }
  const folders = DriveApp.getFoldersByName(CRM.ROOT_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(CRM.ROOT_FOLDER_NAME);
}

function ensureStandardFolders_(root) {
  const result = {};
  CRM.FOLDERS.forEach(function(name) {
    result[name] = ensureChildFolder_(root, name);
  });
  return result;
}

function ensureChildFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function getStandardFolder_(name) {
  const root = ensureRootFolder_();
  return ensureChildFolder_(root, name);
}

function ensureClientFolder_(client) {
  const clientsFolder = getStandardFolder_('Klienti');
  const folderName = safeFileName_(client['Příjmení'] + ' ' + client['Jméno'] + ' - ' + client['Client ID']);
  return ensureChildFolder_(clientsFolder, folderName);
}

function ensureClientCardTemplate_(templatesFolder) {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(CRM.PROPERTY_KEYS.CLIENT_TEMPLATE_DOC_ID);
  if (existingId) {
    try {
      return DriveApp.getFileById(existingId);
    } catch (err) {
      props.deleteProperty(CRM.PROPERTY_KEYS.CLIENT_TEMPLATE_DOC_ID);
    }
  }
  const files = templatesFolder.getFilesByName(CRM.CLIENT_CARD_TEMPLATE_NAME);
  if (files.hasNext()) return files.next();

  const doc = DocumentApp.create(CRM.CLIENT_CARD_TEMPLATE_NAME);
  const body = doc.getBody();
  body.clear();
  body.appendParagraph('Klientská karta').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('{{FULL_NAME}}').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Client ID: {{CLIENT_ID}}');
  body.appendParagraph('Kontakt: {{EMAIL}} | {{PHONE}}');
  body.appendParagraph('Služby: {{SERVICES}}');
  body.appendParagraph('Stav: {{STATUS}}');
  body.appendParagraph('Profil').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Zde doplň anamnézu, cíle, omezení, kontext a profil klienta.');
  body.appendParagraph('Historie kontaktů a poznámky').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Nové záznamy bude systém přidávat pod tuto sekci.');
  body.appendParagraph('Testy a přílohy').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Odkazy na testy, obrázky a soubory.');
  body.appendParagraph('Follow-up').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Další doporučený kontakt nebo setkání.');
  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  templatesFolder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  return file;
}

function createClientCard_(client, folder) {
  const templateId = PropertiesService.getScriptProperties().getProperty(CRM.PROPERTY_KEYS.CLIENT_TEMPLATE_DOC_ID);
  const template = templateId ? DriveApp.getFileById(templateId) : ensureClientCardTemplate_(getStandardFolder_('Sablony'));
  const cardName = safeFileName_('Klientská karta - ' + client['Celé jméno'] + ' - ' + client['Client ID']);
  const copy = template.makeCopy(cardName, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  body.replaceText('\\{\\{FULL_NAME\\}\\}', client['Celé jméno'] || '');
  body.replaceText('\\{\\{CLIENT_ID\\}\\}', client['Client ID'] || '');
  body.replaceText('\\{\\{EMAIL\\}\\}', client['E-mail'] || '');
  body.replaceText('\\{\\{PHONE\\}\\}', client['Telefon'] || '');
  body.replaceText('\\{\\{SERVICES\\}\\}', client['Služby'] || '');
  body.replaceText('\\{\\{STATUS\\}\\}', client['Stav'] || '');
  doc.saveAndClose();
  return copy;
}

function appendClientCardNote_(clientId, note) {
  const client = findById_('CLIENTS', 'Client ID', clientId);
  if (!client || !client['Odkaz na kartu']) return false;
  const docId = extractDriveId_(client['Odkaz na kartu']);
  if (!docId) return false;
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  body.appendParagraph('');
  body.appendParagraph(crmFormatDateTime_(note.date || crmNow_()) + ' - ' + (note.type || 'Poznámka'))
    .setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph('Zdroj: ' + (note.source || 'CRM') + (note.author ? ' | Autor: ' + note.author : ''));
  if (note.summary) body.appendParagraph(note.summary).setBold(false);
  if (note.detail) body.appendParagraph(note.detail);
  if (note.attachments) body.appendParagraph('Přílohy: ' + note.attachments);
  doc.saveAndClose();
  return true;
}

function saveTelegramFileToInbox_(fileBlob, filename) {
  const folder = getStandardFolder_('Inbox soubory');
  const file = folder.createFile(fileBlob).setName(safeFileName_(filename));
  return file.getUrl();
}

function safeFileName_(value) {
  return String(value || 'bez-nazvu').replace(/[\\/:*?"<>|#%{}~&]/g, '-').replace(/\s+/g, ' ').trim();
}

function extractDriveId_(urlOrId) {
  const value = String(urlOrId || '');
  const match = value.match(/[-\w]{25,}/);
  return match ? match[0] : '';
}
