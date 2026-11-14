/**
 * Backend สำหรับเว็บเช็คชื่อคลาส Claude AI (Google Apps Script)
 * วิธีใช้: เปิด Google Sheet > ส่วนขยาย > Apps Script > วางโค้ดนี้ > ทำให้ใช้งานได้ (Deploy) เป็น Web app
 * (โค้ดนี้ผูกกับชีต SHEET_ID ด้านล่างแล้ว จึงสร้างเป็นโปรเจกต์ Apps Script แยกก็ได้)
 *   Execute as: Me | Who has access: Anyone
 * แล้วนำลิงก์ที่ลงท้ายด้วย /exec ไปใส่ใน CONFIG.googleScriptUrl ของ index.html
 *
 * ชีตที่สร้างให้อัตโนมัติ:
 *   Students  : id | name | code | email | group | order
 *   Checkins  : date | studentId | name | code | group | time | timeLocal | status | lateMin | signature
 *   Settings  : key | value
 * และบันทึกสรุปลงชีต "Data" เดิม (timestamp | name | note) ทุกครั้งที่มีคนลงชื่อ
 */
const SHEET_ID = '1DL6RvTzvS_l2pfbwxVoSYBlx_3tlNUidzKAe9T5f4ig'; // Google Sheet ที่ใช้เก็บข้อมูล
const TZ = 'Asia/Bangkok';
const SHEETS = {
  Students: ['id', 'name', 'code', 'email', 'group', 'order'],
  Checkins: ['date', 'studentId', 'name', 'code', 'group', 'time', 'timeLocal', 'status', 'lateMin', 'signature'],
  Settings: ['key', 'value']
};
const SIG_FOLDER = 'Claude AI Attendance Signatures';

function sheet_(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold').setBackground('#c9ecd7');
    sh.setFrozenRows(1);
  }
  return sh;
}
function rows_(name) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const head = SHEETS[name];
  return sh.getRange(2, 1, last - 1, head.length).getDisplayValues().map(function (r, i) {
    const o = { _row: i + 2 };
    head.forEach(function (h, j) { o[h] = r[j]; });
    return o;
  });
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function settings_() {
  const s = { className: 'Claude AI', startTime: '09:00', lateMin: 15 };
  rows_('Settings').forEach(function (r) { if (r.key) s[r.key] = r.key === 'lateMin' ? Number(r.value) : r.value; });
  return s;
}

function doGet(e) {
  try {
    const date = (e.parameter.date || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'));
    const students = rows_('Students').filter(function (r) { return r.id; }).map(function (r) {
      return { id: r.id, name: r.name, code: r.code, email: r.email, group: r.group, order: Number(r.order) || 0 };
    });
    const checkins = {};
    rows_('Checkins').forEach(function (r) {
      if (r.date === date && r.studentId) {
        checkins[r.studentId] = { studentId: r.studentId, name: r.name, code: r.code, group: r.group, time: r.time, sig: sigOut_(r.signature), approved: true };
      }
    });
    return json_({ ok: true, settings: settings_(), students: students, checkins: checkins });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const b = JSON.parse(e.postData.contents);
    switch (b.action) {
      case 'setSettings': setSettings_(b.data); break;
      case 'setStudent': upsert_('Students', 'id', b.id, Object.assign({ id: b.id }, b.data)); break;
      case 'delStudent': deleteWhere_('Students', function (r) { return r.id === b.id; }); break;
      case 'setCheckin': setCheckin_(b.date, b.id, b.data); break;
      case 'delCheckin': {
        const old = rows_('Checkins').filter(function (r) { return r.date === b.date && r.studentId === b.id; })[0];
        const dataSh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Data');
        if (old && dataSh) removeDataRow_(dataSh, b.date, old.name);
        deleteWhere_('Checkins', function (r) { return r.date === b.date && r.studentId === b.id; });
        break;
      }
      default: throw new Error('unknown action');
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function upsert_(name, keyField, key, obj) {
  const sh = sheet_(name);
  const head = SHEETS[name];
  // ใส่ ' นำหน้าข้อความ เพื่อไม่ให้ชีตแปลงเป็นวันที่/ตัวเลขเอง (เช่น 09:00, 001)
  const values = head.map(function (h) { const v = obj[h]; return v === undefined || v === null ? '' : (typeof v === 'string' && v !== '' ? "'" + v : v); });
  const found = rows_(name).filter(function (r) { return String(r[keyField]) === String(key); })[0];
  if (found) sh.getRange(found._row, 1, 1, head.length).setValues([values]);
  else sh.appendRow(values);
}
function deleteWhere_(name, pred) {
  const sh = sheet_(name);
  rows_(name).filter(pred).map(function (r) { return r._row; }).sort(function (a, b) { return b - a; })
    .forEach(function (row) { sh.deleteRow(row); });
}
function setSettings_(data) {
  Object.keys(data).forEach(function (k) { upsert_('Settings', 'key', k, { key: k, value: data[k] }); });
}
function setCheckin_(date, id, d) {
  const s = settings_();
  const parts = s.startTime.split(':');
  const start = new Date(date + 'T' + ('0' + parts[0]).slice(-2) + ':' + ('0' + parts[1]).slice(-2) + ':00+07:00');
  const t = new Date(d.time);
  const late = Math.round((t - start) / 60000);
  const isLate = late > Number(s.lateMin || 0);
  deleteWhere_('Checkins', function (r) { return r.date === date && r.studentId === id; });
  // แถวสรุปในชีต Data (รูปแบบเดิมของชีต: timestamp | name | note)
  const dataSh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Data');
  if (dataSh) {
    const stamp = Utilities.formatDate(t, TZ, 'dd/MM/yyyy HH:mm');
    removeDataRow_(dataSh, date, d.name);
    dataSh.appendRow([stamp, d.name, isLate ? 'สาย' : 'มา']);
  }
  sheet_('Checkins').appendRow([
    "'" + date, "'" + id, d.name, "'" + (d.code || ''), d.group, "'" + d.time,
    Utilities.formatDate(t, TZ, 'HH:mm:ss'),
    isLate ? 'สาย' : 'มาเรียน', isLate ? late : '',
    sigIn_(d.sig, date + '_' + id)
  ]);
}
// ลบแถวในชีต Data ของคนนี้ในวันนี้ (กันซ้ำเมื่อเซ็นใหม่ หรือเมื่อกดยกเลิก)
function removeDataRow_(sh, date, name) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const p = date.split('-'); // yyyy-MM-dd -> dd/MM/yyyy
  const dayPrefix = p[2] + '/' + p[1] + '/' + p[0];
  const vals = sh.getRange(2, 1, last - 1, 2).getDisplayValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]).indexOf(dayPrefix) === 0 && String(vals[i][1]).trim() === String(name).trim()) sh.deleteRow(i + 2);
  }
}
// ลายเซ็น: เก็บในเซลล์ถ้าไม่ยาวเกิน ไม่งั้นบันทึกเป็นไฟล์ PNG ใน Google Drive แล้วเก็บลิงก์
function sigIn_(dataUrl, name) {
  if (!dataUrl) return '';
  if (dataUrl.length < 45000) return dataUrl;
  const bytes = Utilities.base64Decode(dataUrl.split(',')[1]);
  const it = DriveApp.getFoldersByName(SIG_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(SIG_FOLDER);
  const file = folder.createFile(Utilities.newBlob(bytes, 'image/png', name + '.png'));
  return 'drive:' + file.getId();
}
function sigOut_(v) {
  if (!v) return '';
  if (v.indexOf('drive:') !== 0) return v;
  try {
    const blob = DriveApp.getFileById(v.slice(6)).getBlob();
    return 'data:image/png;base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) { return ''; }
}
