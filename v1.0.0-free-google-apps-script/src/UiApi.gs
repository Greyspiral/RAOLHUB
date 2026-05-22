function getUiBootData() {
  return {
    setup: getSetupStatus(),
    services: CRM.SERVICES,
    statuses: CRM.STATUSES
  };
}

function getDashboardData(pin) {
  requireUiAccess_(pin);
  const clients = getRows_('CLIENTS');
  const inbox = getRows_('INBOX').filter(function(item) {
    return String(item['Stav']).indexOf('Čeká') === 0;
  });
  const tasks = getRows_('TASKS').filter(function(task) {
    return task['Stav'] !== 'Hotovo' && task['Stav'] !== 'Archiv';
  });
  const today = crmFormatDate_(crmNow_());
  const dueTasks = tasks.filter(function(task) {
    return String(task['Termín'] || '') <= today;
  });
  const contactClients = clients.filter(function(client) {
    const due = String(client['Kontaktovat dne'] || '');
    return due && due <= today;
  });
  return {
    counts: {
      clients: clients.length,
      inbox: inbox.length,
      openTasks: tasks.length,
      dueTasks: dueTasks.length,
      contactClients: contactClients.length
    },
    dueTasks: dueTasks.slice(0, 25),
    inbox: inbox.slice(0, 25),
    contactClients: contactClients.slice(0, 25)
  };
}

function searchClients(query, pin) {
  requireUiAccess_(pin);
  const q = crmNormalize_(query);
  return getRows_('CLIENTS').filter(function(client) {
    if (!q) return true;
    return crmNormalize_([
      client['Celé jméno'],
      client['E-mail'],
      client['Telefon'],
      client['Služby']
    ].join(' ')).indexOf(q) !== -1;
  }).slice(0, 100);
}

function getClientDetail(clientId, pin) {
  requireUiAccess_(pin);
  const client = findById_('CLIENTS', 'Client ID', clientId);
  if (!client) throw new Error('Client not found: ' + clientId);
  return {
    client: client,
    services: getRows_('SERVICES').filter(function(row) { return row['Client ID'] === clientId; }),
    notes: getRows_('NOTES').filter(function(row) { return row['Client ID'] === clientId; }).reverse().slice(0, 50),
    tasks: getRows_('TASKS').filter(function(row) { return row['Client ID'] === clientId; }).reverse().slice(0, 50)
  };
}

function uiCreateClient(form) {
  requireUiAccess_(form && form.pin);
  return upsertClient(form);
}

function uiAddNote(clientId, text, service, pin) {
  requireUiAccess_(pin);
  return addClientNote(clientId, {
    text: text,
    source: 'Web UI',
    author: Session.getActiveUser().getEmail(),
    service: service || ''
  });
}

function uiCreateFollowUp(clientId, title, description, dueDate, pin) {
  requireUiAccess_(pin);
  return createFollowUp(clientId, title, description, dueDate, 'Normální');
}

function getInboxItems(pin) {
  requireUiAccess_(pin);
  return getRows_('INBOX').reverse().slice(0, 100);
}

function uiResolveInboxItem(inboxId, clientId, pin) {
  requireUiAccess_(pin);
  return resolveInboxItem(inboxId, clientId, 'save');
}

function uiArchiveInboxItem(inboxId, pin) {
  requireUiAccess_(pin);
  return resolveInboxItem(inboxId, '', 'archive');
}
