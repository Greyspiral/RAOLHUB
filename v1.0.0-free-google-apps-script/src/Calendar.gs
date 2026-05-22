function ensureCrmCalendar_() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty(CRM.PROPERTY_KEYS.CALENDAR_ID);
  if (existingId) {
    const existing = CalendarApp.getCalendarById(existingId);
    if (existing) return existing;
  }
  const calendars = CalendarApp.getCalendarsByName(CRM.CALENDAR_NAME);
  if (calendars.length > 0) return calendars[0];
  return CalendarApp.createCalendar(CRM.CALENDAR_NAME, {
    summary: 'Schůzky, kontroly a follow-upy pro Running Academy HUB CRM',
    timeZone: CRM.TIMEZONE
  });
}

function createCalendarFollowUp_(task) {
  const calendar = ensureCrmCalendar_();
  const due = task['Termín'] ? new Date(task['Termín']) : crmNow_();
  const title = task['Název'] || 'CRM follow-up';
  const description = task['Popis'] || '';
  const event = calendar.createAllDayEvent(title, due, { description: description });
  return event.getId();
}
