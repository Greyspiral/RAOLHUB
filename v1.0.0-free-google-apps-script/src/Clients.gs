function upsertClient(input) {
  const data = input || {};
  let firstName = String(data.firstName || data['Jméno'] || '').trim();
  let lastName = String(data.lastName || data['Příjmení'] || '').trim();
  const fullName = String(data.fullName || data['Celé jméno'] || [firstName, lastName].filter(Boolean).join(' ')).trim();
  const email = String(data.email || data['E-mail'] || '').trim();
  const phone = String(data.phone || data['Telefon'] || '').trim();

  if (!fullName && !email && !phone) throw new Error('Client requires at least name, email, or phone.');
  if (fullName && (!firstName || !lastName)) {
    const parsedName = splitFullName_(fullName);
    firstName = firstName || parsedName.firstName;
    lastName = lastName || parsedName.lastName;
  }

  const existing = findClientMatch_({ fullName: fullName, email: email, phone: phone });
  if (existing.match && existing.confidence === 'exact') {
    const updates = {
      'Jméno': firstName || existing.match['Jméno'],
      'Příjmení': lastName || existing.match['Příjmení'],
      'Celé jméno': fullName || existing.match['Celé jméno'],
      'E-mail': email || existing.match['E-mail'],
      'Telefon': phone || existing.match['Telefon'],
      'Datum narození': data.birthDate || data['Datum narození'] || existing.match['Datum narození'],
      'Stav': data.status || data['Stav'] || existing.match['Stav'] || 'Nový kontakt',
      'Služby': mergeServices_(existing.match['Služby'], data.services || data['Služby']),
      'Zdroj': data.source || data['Zdroj'] || existing.match['Zdroj'],
      'Aktualizováno': crmFormatDateTime_(crmNow_())
    };
    updateRecord_('CLIENTS', existing.match._rowNumber, updates);
    return findById_('CLIENTS', 'Client ID', existing.match['Client ID']);
  }

  const clientId = crmUuid_('CLI');
  const now = crmFormatDateTime_(crmNow_());
  const client = {
    'Client ID': clientId,
    'Jméno': firstName,
    'Příjmení': lastName,
    'Celé jméno': fullName || email || phone,
    'E-mail': email,
    'Telefon': phone,
    'Datum narození': data.birthDate || data['Datum narození'] || '',
    'Stav': data.status || data['Stav'] || 'Nový kontakt',
    'Služby': normalizeServices_(data.services || data['Služby'] || '').join(', '),
    'Zdroj': data.source || data['Zdroj'] || 'Ručně',
    'Poslední kontakt': '',
    'Poslední setkání': '',
    'Co jsme řešili naposled': '',
    'Další doporučené setkání': '',
    'Kontaktovat dne': '',
    'Priorita': data.priority || 'Normální',
    'Souhlas se zpracováním': data.consent || data['Souhlas se zpracováním'] || '',
    'Odkaz na kartu': '',
    'Odkaz na složku': '',
    'Poznámka': data.note || '',
    'Vytvořeno': now,
    'Aktualizováno': now
  };

  const folder = ensureClientFolder_(client);
  const card = createClientCard_(client, folder);
  client['Odkaz na kartu'] = card.getUrl();
  client['Odkaz na složku'] = folder.getUrl();
  appendRecord_('CLIENTS', client);
  return client;
}

function findClientMatch_(input) {
  const clients = getRows_('CLIENTS');
  const fullName = crmNormalize_(input.fullName);
  const email = crmNormalize_(input.email);
  const phone = String(input.phone || '').replace(/\D/g, '');

  const exact = clients.find(function(client) {
    return (email && crmNormalize_(client['E-mail']) === email) ||
      (phone && String(client['Telefon']).replace(/\D/g, '') === phone) ||
      (fullName && crmNormalize_(client['Celé jméno']) === fullName);
  });
  if (exact) return { confidence: 'exact', match: exact, candidates: [exact] };

  const candidates = clients.filter(function(client) {
    const name = crmNormalize_(client['Celé jméno']);
    return fullName && (name.indexOf(fullName) !== -1 || fullName.indexOf(name) !== -1);
  });
  return { confidence: candidates.length === 1 ? 'possible' : 'ambiguous', match: candidates[0] || null, candidates: candidates };
}

function addClientNote(clientId, payload) {
  const client = findById_('CLIENTS', 'Client ID', clientId);
  if (!client) throw new Error('Client not found: ' + clientId);
  const now = crmNow_();
  const note = {
    'Note ID': crmUuid_('NOTE'),
    'Client ID': clientId,
    'Datum': crmFormatDateTime_(payload.date || now),
    'Typ': payload.type || 'Poznámka',
    'Zdroj': payload.source || 'CRM',
    'Autor': payload.author || '',
    'Shrnutí': payload.summary || payload.text || '',
    'Detail': payload.detail || '',
    'Služba': payload.service || '',
    'Přílohy': payload.attachments || '',
    'Vytvořeno': crmFormatDateTime_(now)
  };
  appendRecord_('NOTES', note);
  appendClientCardNote_(clientId, {
    date: now,
    type: note['Typ'],
    source: note['Zdroj'],
    author: note['Autor'],
    summary: note['Shrnutí'],
    detail: note['Detail'],
    attachments: note['Přílohy']
  });
  updateRecord_('CLIENTS', client._rowNumber, {
    'Poslední kontakt': crmFormatDate_(now),
    'Co jsme řešili naposled': note['Shrnutí'],
    'Aktualizováno': crmFormatDateTime_(now)
  });
  return note;
}

function createFollowUp(clientId, title, description, dueDate, priority) {
  const client = findById_('CLIENTS', 'Client ID', clientId);
  const task = {
    'Task ID': crmUuid_('TASK'),
    'Client ID': clientId,
    'Název': title || 'Kontaktovat klienta',
    'Popis': description || '',
    'Termín': crmFormatDate_(dueDate || crmNow_()),
    'Stav': 'Otevřeno',
    'Priorita': priority || getSetting_('default_task_priority', 'Normální'),
    'Calendar Event ID': '',
    'Vytvořeno': crmFormatDateTime_(crmNow_()),
    'Aktualizováno': crmFormatDateTime_(crmNow_())
  };
  task['Calendar Event ID'] = createCalendarFollowUp_(task);
  appendRecord_('TASKS', task);
  if (client) {
    const existingDue = client['Kontaktovat dne'] ? String(client['Kontaktovat dne']) : '';
    if (!existingDue || task['Termín'] < existingDue) {
      updateRecord_('CLIENTS', client._rowNumber, {
        'Kontaktovat dne': task['Termín'],
        'Aktualizováno': crmFormatDateTime_(crmNow_())
      });
    }
  }
  return task;
}

function createAnalysisFollowUps(clientId, baseDate) {
  const days = String(getSetting_('followup_after_analysis_days', '30,90,180')).split(',').map(function(value) {
    return Number(value.trim());
  }).filter(Boolean);
  return days.map(function(day) {
    const due = new Date(baseDate || crmNow_());
    due.setDate(due.getDate() + day);
    return createFollowUp(clientId, 'Follow-up po analýze (' + day + ' dní)', 'Ozvat se klientovi po analýze techniky běhu.', due, 'Normální');
  });
}

function addServiceToClient(clientId, serviceName, status, note) {
  const client = findById_('CLIENTS', 'Client ID', clientId);
  if (!client) throw new Error('Client not found: ' + clientId);
  const now = crmFormatDateTime_(crmNow_());
  const record = {
    'Service ID': crmUuid_('SVC'),
    'Client ID': clientId,
    'Služba': serviceName,
    'Stav': status || 'Aktivní',
    'Začátek': crmFormatDate_(crmNow_()),
    'Konec': '',
    'Cena / poznámka': note || '',
    'Vytvořeno': now,
    'Aktualizováno': now
  };
  appendRecord_('SERVICES', record);
  updateRecord_('CLIENTS', client._rowNumber, {
    'Služby': mergeServices_(client['Služby'], serviceName),
    'Aktualizováno': now
  });
  return record;
}

function mergeServices_(existing, incoming) {
  return normalizeServices_([existing, incoming].filter(Boolean).join(', ')).join(', ');
}

function normalizeServices_(value) {
  if (Array.isArray(value)) value = value.join(',');
  const raw = String(value || '').split(/[,;\n]/).map(function(item) { return item.trim(); }).filter(Boolean);
  const seen = {};
  return raw.filter(function(item) {
    const key = crmNormalize_(item);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function splitFullName_(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1]
  };
}
