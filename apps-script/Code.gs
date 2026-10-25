/**
 * 디지털 수업 데이터 체크인 — Google Apps Script (시트에 바인딩)
 *
 * 배포: 배포 > 새 배포 > 유형 "웹 앱" > 실행: 나 / 액세스: 모든 사용자
 * 배포 URL(…/exec)을 config.js 의 SCRIPT_URL 에 넣습니다.
 *
 * - doPost : 학생 페이지가 보낸 JSON(text/plain) 한 건을 `data` 시트에 한 행으로 추가
 * - doGet  : 전체 행을 JSON 배열로 반환 (?since=YYYY-MM-DD 선택)
 *            ?action=count&date=YYYY-MM-DD&g=3&c=4 → 해당 날짜·학급 응답 수
 *            ?sheet=survey → 시간표 설문(`survey` 탭) 행 반환
 * - POST JSON 에 "sheet":"survey" 가 있으면 `survey` 탭에 기록 (시간표 설문)
 * 시트에 수식이 전혀 필요 없습니다. 요약은 대시보드가 브라우저에서 계산합니다.
 */

var SHEET_NAME = "data";
var SURVEY_SHEET = "survey";
var SURVEY_HEADER = ["ts", "date", "grade", "cls", "num", "focus_best", "focus_worst", "worst_why", "p1_subject", "p1_why",
  "last_subject", "after_lunch_subject", "science_pref", "two_in_row", "wish", "device_id"];
var HEADER = ["ts", "date", "weekday", "period", "grade", "cls", "num", "phase",
  "mood", "energy", "screen_yday", "use_yday", "expect", "confidence_pre",
  "tool", "fun", "difficulty", "help", "confidence_post", "best", "note", "device_id"];

// sheetKey: "survey" → 시간표 설문 탭, 그 외 → data 탭
function headerFor_(sheetKey) { return sheetKey === "survey" ? SURVEY_HEADER : HEADER; }
function getSheet_(sheetKey) {
  var name = sheetKey === "survey" ? SURVEY_SHEET : SHEET_NAME;
  var header = headerFor_(sheetKey);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight("bold");
    // 날짜/번호 열이 자동 변환되지 않도록 전체를 텍스트로 처리하고 싶다면 아래 주석 해제
    // sh.getRange(2, 1, sh.getMaxRows(), HEADER.length).setNumberFormat("@");
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(v, max) {
  if (v === null || v === undefined) return "";
  var s = String(v).replace(/[\r\n\t]+/g, " ").trim();
  if (max && s.length > max) s = s.slice(0, max);
  // 수식 주입 방지
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var body = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    var d = JSON.parse(body);
    var sheetKey = d.sheet === "survey" ? "survey" : "data";
    if (!d.grade || !d.cls || !d.num || (sheetKey === "data" && !d.phase)) return json_({ ok: false, error: "grade/cls/num/phase 가 필요합니다" });
    var now = new Date();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";
    if (!d.ts) d.ts = now.toISOString();
    if (!d.date) d.date = Utilities.formatDate(now, tz, "yyyy-MM-dd");
    if (!d.weekday) d.weekday = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
    var row = headerFor_(sheetKey).map(function (h) { return clean_(d[h], (h === "note" || h === "wish") ? 60 : 200); });
    var sh = getSheet_(sheetKey);
    sh.appendRow(row);
    // date 열을 문자열로 유지 (시트가 날짜로 바꾸지 않게)
    sh.getRange(sh.getLastRow(), 2).setNumberFormat("@");
    return json_({ ok: true, row: sh.getLastRow() - 1 });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function readAll_(sheetKey) {
  var sh = getSheet_(sheetKey);
  var header = headerFor_(sheetKey);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, header.length).getValues();
  var tz = Session.getScriptTimeZone() || "Asia/Seoul";
  return values.map(function (r) {
    var o = {};
    header.forEach(function (h, i) {
      var v = r[i];
      if (v instanceof Date) v = h === "ts" ? v.toISOString() : Utilities.formatDate(v, tz, "yyyy-MM-dd");
      o[h] = v;
    });
    return o;
  });
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    var rows = readAll_(p.sheet === "survey" ? "survey" : "data");
    if (p.action === "count") {
      var n = rows.filter(function (r) {
        return (!p.date || String(r.date) === p.date) && (!p.g || String(r.grade) === String(p.g)) && (!p.c || String(r.cls) === String(p.c));
      }).length;
      return json_({ ok: true, count: n });
    }
    if (p.since) rows = rows.filter(function (r) { return String(r.date) >= p.since; });
    return json_(rows);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** 편집기에서 한 번 실행해 두면 헤더가 만들어지고 권한 승인 창이 뜹니다. */
function setup() {
  getSheet_("data");
  getSheet_("survey");
  Logger.log("준비 완료: '" + SHEET_NAME + "' (" + HEADER.length + "열), '" + SURVEY_SHEET + "' (" + SURVEY_HEADER.length + "열)");
}
