function setTelegramBotToken(token) {
  PropertiesService.getScriptProperties().setProperty(CRM.PROPERTY_KEYS.TELEGRAM_BOT_TOKEN, token);
  return { ok: true };
}

function setTelegramSecret(secret) {
  PropertiesService.getScriptProperties().setProperty(CRM.PROPERTY_KEYS.TELEGRAM_SECRET, secret);
  return { ok: true };
}

function setTelegramWebhook() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty(CRM.PROPERTY_KEYS.TELEGRAM_BOT_TOKEN);
  const webAppUrl = props.getProperty(CRM.PROPERTY_KEYS.WEB_APP_URL);
  const secret = props.getProperty(CRM.PROPERTY_KEYS.TELEGRAM_SECRET) || Utilities.getUuid();
  if (!token) throw new Error('Telegram bot token is missing. Run setTelegramBotToken(token).');
  if (!webAppUrl) throw new Error('Web app URL is missing. Run setWebAppUrl(url).');
  props.setProperty(CRM.PROPERTY_KEYS.TELEGRAM_SECRET, secret);
  const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      url: webAppUrl + '?secret=' + encodeURIComponent(secret),
      allowed_updates: ['message']
    }),
    muteHttpExceptions: true
  });
  return JSON.parse(response.getContentText());
}

function handleTelegramWebhook(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const expectedSecret = props.getProperty(CRM.PROPERTY_KEYS.TELEGRAM_SECRET);
    if (expectedSecret && (!e.parameter || e.parameter.secret !== expectedSecret)) {
      return crmJson_({ ok: false, error: 'Invalid secret' });
    }
    const update = JSON.parse(e.postData.contents || '{}');
    const result = processTelegramUpdate_(update);
    return crmJson_({ ok: true, result: result });
  } catch (err) {
    return crmJson_({ ok: false, error: err.message });
  }
}

function processTelegramUpdate_(update) {
  const message = update.message || update.edited_message;
  if (!message) return { ignored: true };

  const sender = message.from ? [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') : '';
  const text = message.text || message.caption || '';
  const parsed = parseTelegramText_(text);
  const attachmentUrls = collectTelegramAttachments_(message);
  const match = parsed.clientName ? findClientMatch_({ fullName: parsed.clientName }) : { confidence: 'ambiguous', candidates: [] };

  if (match.confidence === 'exact') {
    const note = addClientNote(match.match['Client ID'], {
      text: parsed.body || text,
      source: 'Telegram',
      author: sender,
      type: parsed.type || 'Poznámka',
      service: parsed.service || '',
      attachments: attachmentUrls.join('\n')
    });
    if (parsed.followUpDate) {
      createFollowUp(match.match['Client ID'], 'Follow-up z Telegramu', parsed.body || text, parsed.followUpDate, 'Normální');
    }
    return { status: 'saved', clientId: match.match['Client ID'], noteId: note['Note ID'] };
  }

  const inbox = createInboxItem_({
    source: 'Telegram',
    sender: sender,
    text: text,
    suggestedClient: parsed.clientName,
    clientId: match.candidates && match.candidates.length === 1 ? match.candidates[0]['Client ID'] : '',
    status: match.candidates && match.candidates.length ? 'Čeká na potvrzení' : 'Čeká na přiřazení',
    reason: match.candidates && match.candidates.length ? 'Nejasná shoda klienta' : 'Klient nenalezen',
    attachments: attachmentUrls.join('\n')
  });
  return { status: 'inbox', inboxId: inbox['Inbox ID'] };
}

function parseTelegramText_(text) {
  const result = { clientName: '', body: text || '', type: 'Poznámka', service: '', followUpDate: null };
  const value = String(text || '').trim();
  const parts = value.split(/\s+-\s+|\s+:\s+/);
  if (parts.length > 1) {
    result.clientName = parts[0].trim();
    result.body = parts.slice(1).join(' - ').trim();
  }
  const lower = crmNormalize_(value);
  if (lower.indexOf('plaud') !== -1 || lower.indexOf('summary') !== -1 || lower.indexOf('anamneza') !== -1) result.type = 'Anamnéza / summary';
  CRM.SERVICES.forEach(function(service) {
    if (lower.indexOf(crmNormalize_(service)) !== -1) result.service = service;
  });
  const daysMatch = lower.match(/(?:za|kontrola za|follow-up za)\s+(\d{1,3})\s+d/);
  if (daysMatch) {
    const due = crmNow_();
    due.setDate(due.getDate() + Number(daysMatch[1]));
    result.followUpDate = due;
  }
  return result;
}

function collectTelegramAttachments_(message) {
  const urls = [];
  if (message.document) urls.push(downloadTelegramFile_(message.document.file_id, message.document.file_name || 'telegram-document'));
  if (message.photo && message.photo.length) {
    const photo = message.photo[message.photo.length - 1];
    urls.push(downloadTelegramFile_(photo.file_id, 'telegram-photo-' + photo.file_unique_id + '.jpg'));
  }
  if (message.voice) urls.push(downloadTelegramFile_(message.voice.file_id, 'telegram-voice-' + message.voice.file_unique_id + '.ogg'));
  if (message.audio) urls.push(downloadTelegramFile_(message.audio.file_id, message.audio.file_name || 'telegram-audio'));
  return urls.filter(Boolean);
}

function downloadTelegramFile_(fileId, filename) {
  const token = PropertiesService.getScriptProperties().getProperty(CRM.PROPERTY_KEYS.TELEGRAM_BOT_TOKEN);
  if (!token || !fileId) return '';
  const meta = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getFile?file_id=' + encodeURIComponent(fileId), {
    muteHttpExceptions: true
  });
  const parsed = JSON.parse(meta.getContentText());
  if (!parsed.ok || !parsed.result || !parsed.result.file_path) return '';
  const fileResponse = UrlFetchApp.fetch('https://api.telegram.org/file/bot' + token + '/' + parsed.result.file_path, {
    muteHttpExceptions: true
  });
  const blob = fileResponse.getBlob().setName(filename);
  return saveTelegramFileToInbox_(blob, filename);
}

function createInboxItem_(data) {
  const now = crmFormatDateTime_(crmNow_());
  const item = {
    'Inbox ID': crmUuid_('INB'),
    'Datum': now,
    'Zdroj': data.source || 'CRM',
    'Odesílatel': data.sender || '',
    'Text': data.text || '',
    'Navržený klient': data.suggestedClient || '',
    'Client ID': data.clientId || '',
    'Stav': data.status || 'Čeká na zpracování',
    'Důvod': data.reason || '',
    'Přílohy': data.attachments || '',
    'Vytvořeno': now,
    'Aktualizováno': now
  };
  appendRecord_('INBOX', item);
  return item;
}

function resolveInboxItem(inboxId, clientId, action) {
  const item = findById_('INBOX', 'Inbox ID', inboxId);
  if (!item) throw new Error('Inbox item not found: ' + inboxId);
  if (action === 'archive') {
    updateRecord_('INBOX', item._rowNumber, { 'Stav': 'Archiv', 'Aktualizováno': crmFormatDateTime_(crmNow_()) });
    return { ok: true, status: 'Archiv' };
  }
  const note = addClientNote(clientId || item['Client ID'], {
    text: item['Text'],
    source: item['Zdroj'],
    author: item['Odesílatel'],
    attachments: item['Přílohy']
  });
  updateRecord_('INBOX', item._rowNumber, {
    'Client ID': clientId || item['Client ID'],
    'Stav': 'Zpracováno',
    'Aktualizováno': crmFormatDateTime_(crmNow_())
  });
  return { ok: true, noteId: note['Note ID'] };
}
