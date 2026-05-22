function onFormSubmit(e) {
  return handleGoogleFormSubmit(e, 'Google Form');
}

function handleGoogleFormSubmit(e, sourceName) {
  const namedValues = e && e.namedValues ? e.namedValues : {};
  const payload = mapFormValuesToClient_(namedValues);
  payload.source = sourceName || 'Google Form';
  const client = upsertClient(payload);

  const detail = Object.keys(namedValues).map(function(key) {
    return key + ': ' + valueFromNamedValues_(namedValues, [key]);
  }).join('\n');

  addClientNote(client['Client ID'], {
    type: 'Formulář',
    source: payload.source,
    summary: 'Vyplněn formulář: ' + payload.source,
    detail: detail
  });

  return client;
}

function mapFormValuesToClient_(namedValues) {
  const fullName = valueFromNamedValues_(namedValues, ['Jméno a příjmení', 'Jmeno a prijmeni', 'Celé jméno', 'Cele jmeno']);
  const firstName = valueFromNamedValues_(namedValues, ['Jméno', 'Jmeno', 'Křestní jméno', 'Krestni jmeno']);
  const lastName = valueFromNamedValues_(namedValues, ['Příjmení', 'Prijmeni']);
  const email = valueFromNamedValues_(namedValues, ['E-mail', 'Email', 'Mail']);
  const phone = valueFromNamedValues_(namedValues, ['Telefon', 'Telefonní číslo', 'Telefonni cislo']);
  const birthDate = valueFromNamedValues_(namedValues, ['Datum narození', 'Datum narozeni']);
  const services = valueFromNamedValues_(namedValues, ['Služba', 'Sluzba', 'Služby', 'Sluzby', 'O co máte zájem?', 'O co mate zajem?']);
  const note = valueFromNamedValues_(namedValues, ['Poznámka', 'Poznamka', 'Zpráva', 'Zprava', 'Cíl', 'Cil']);

  return {
    fullName: fullName,
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: phone,
    birthDate: birthDate,
    services: services,
    note: note,
    consent: valueFromNamedValues_(namedValues, ['Souhlas', 'Souhlas se zpracováním', 'Souhlas se zpracovanim'])
  };
}

function valueFromNamedValues_(namedValues, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    var alias = aliases[i];
    if (namedValues[alias] !== undefined) {
      var value = namedValues[alias];
      if (Array.isArray(value)) return value.join(', ').trim();
      return String(value || '').trim();
    }
  }
  return '';
}

function installFormSubmitTrigger(formSpreadsheetId, functionName) {
  const ss = SpreadsheetApp.openById(formSpreadsheetId);
  const handler = functionName || 'onFormSubmit';
  ScriptApp.newTrigger(handler).forSpreadsheet(ss).onFormSubmit().create();
  return { ok: true, spreadsheetId: formSpreadsheetId, handler: handler };
}
