// Google Apps Script to accept POST requests and append rows to a sheet.
// Deploy as Web App (Execute as: Me, Who has access: Anyone, even anonymous)
// The script reads TARGET_SPREADSHEET_ID from Script Properties. If you want the
// script to auto-configure, set DEFAULT_SPREADSHEET_ID below to your spreadsheet id.

// Optional: a default spreadsheet id to auto-bootstrap Script Properties the first time the script runs.
var DEFAULT_SPREADSHEET_ID = '1weHSbkhbCSjYISUyy-A95wG-7fh6eieWvC4LovgXlpw';

var HEADER_COLUMNS = ['questionId','userAnswer','userAnswerText','correctAnswer','correctAnswerText','timestamp'];

function getTargetSpreadsheetId() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('TARGET_SPREADSHEET_ID') || '';
  if (!id && DEFAULT_SPREADSHEET_ID) {
    props.setProperty('TARGET_SPREADSHEET_ID', DEFAULT_SPREADSHEET_ID);
    id = DEFAULT_SPREADSHEET_ID;
  }
  return id;
}

function ensureAttemptsSheet(ss) {
  var sheet = ss.getSheetByName('attempts');
  if (!sheet) sheet = ss.insertSheet('attempts');
  // Ensure header row exists (compare case-insensitive)
  var lastCol = Math.max(sheet.getLastColumn(), HEADER_COLUMNS.length);
  var firstRow = [];
  if (sheet.getLastRow() > 0) {
    firstRow = sheet.getRange(1,1,1,lastCol).getValues()[0] || [];
  }
  var needsHeader = HEADER_COLUMNS.some(function(h, i) { return String((firstRow[i] || '')).toLowerCase() !== h.toLowerCase(); });
  if (needsHeader) {
    // Insert or overwrite header row
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1,1,1, HEADER_COLUMNS.length).setValues([HEADER_COLUMNS]);
    } else {
      sheet.insertRowBefore(1);
      sheet.getRange(1,1,1, HEADER_COLUMNS.length).setValues([HEADER_COLUMNS]);
    }
  }
  return sheet;
}

function toRow(item) {
  return HEADER_COLUMNS.map(function(col) {
    var v = item[col];
    if (v === undefined || v === null) return '';
    return v;
  });
}

function doPost(e) {
  try {
    var ssId = getTargetSpreadsheetId();
    if (!ssId) {
      return ContentService.createTextOutput(JSON.stringify({error: 'TARGET_SPREADSHEET_ID not set in Script Properties'})).setMimeType(ContentService.MimeType.JSON);
    }
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ensureAttemptsSheet(ss);

    var body = e && e.postData && e.postData.contents ? e.postData.contents : '[]';
    var payload = JSON.parse(body || '[]');
    var items = Array.isArray(payload) ? payload : [payload];
    var rows = items.map(function(it){ return toRow(it); });

    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADER_COLUMNS.length).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({status: 'ok', appended: rows.length})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ssId = getTargetSpreadsheetId() || '';
    var sample = { sheet: null, rows: [] };
    if (ssId) {
      var ss = SpreadsheetApp.openById(ssId);
      var sheet = ss.getSheetByName('attempts');
      if (sheet) {
        sample.sheet = sheet.getName();
        var data = sheet.getDataRange().getValues();
        sample.rows = data.slice(0, Math.min(data.length, 10));
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, spreadsheetId: ssId, sample: sample })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper to set the target spreadsheet id once via the Script Editor's "Project Properties" or run this manually
function setSpreadsheetId(id) {
  if (!id) throw new Error('Provide spreadsheet id');
  PropertiesService.getScriptProperties().setProperty('TARGET_SPREADSHEET_ID', id);
}
