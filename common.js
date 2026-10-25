/* 디지털 수업 데이터 체크인 — 공통 로직 (스키마 · 저장 · 예시 데이터) */
(function () {
  const CFG = window.APP_CONFIG || {};
  const DEMO = !CFG.SCRIPT_URL;

  // 시트 헤더 순서 (Apps Script Code.gs 와 반드시 동일)
  const HEADER = ["ts", "date", "weekday", "period", "grade", "cls", "num", "phase",
    "mood", "energy", "screen_yday", "use_yday", "expect", "confidence_pre",
    "tool", "fun", "difficulty", "help", "confidence_post", "best", "note", "device_id"];

  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  const SCREEN_LABELS = ["안 썼어", "1시간보다 적게", "1~2시간", "2~3시간", "3시간 이상"];
  const USE_OPTIONS = ["게임", "영상(유튜브 등)", "공부·학습 앱", "친구와 대화(메신저)", "만들기(코딩·그림·영상 제작)", "AI와 대화", "안 썼어"];
  const TOOLS = ["캔바", "바이브코딩(AI로 앱 만들기)", "챗봇·AI 도구", "태블릿 학습 앱", "코딩(엔트리·스크래치)", "검색·자료 조사", "발표·공유 도구", "기타"];
  const BEST_OPTIONS = ["직접 만들기", "친구와 함께", "AI 도구 써 보기", "새로운 기능 배우기", "발표·공유", "게임·퀴즈"];

  // ---------- 유틸 ----------
  const pad = (n) => String(n).padStart(2, "0");
  function todayStr(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function weekdayOf(d) { return WEEKDAYS[d.getDay()]; }
  function uid() {
    return "d" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function deviceId() {
    let id = null;
    try { id = localStorage.getItem("dcc_device"); if (!id) { id = uid(); localStorage.setItem("dcc_device", id); } } catch (e) { id = id || "d-nostorage"; }
    return id;
  }
  function lsGet(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  // ---------- 비속어 마스킹 (가벼운 필터) ----------
  const BAD = ["씨발", "시발", "ㅅㅂ", "ㅆㅂ", "병신", "ㅄ", "개새", "존나", "ㅈㄴ", "지랄", "닥쳐", "꺼져", "미친", "fuck", "shit", "bitch"];
  function cleanNote(s) {
    let t = String(s || "").slice(0, 60);
    BAD.forEach((w) => { const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); t = t.replace(re, (m) => "*".repeat(m.length)); });
    return t.trim();
  }

  // ---------- 저장 / 조회 ----------
  function blankRow() { const r = {}; HEADER.forEach((h) => (r[h] = "")); return r; }

  async function submit(partial) {
    const now = new Date();
    const row = Object.assign(blankRow(), partial, {
      ts: now.toISOString(), date: todayStr(now), weekday: weekdayOf(now), device_id: deviceId()
    });
    if (row.note) row.note = cleanNote(row.note);
    if (DEMO) {
      const rows = lsGet("dcc_rows", []); rows.push(row); lsSet("dcc_rows", rows);
      await new Promise((r) => setTimeout(r, 350));
      return { ok: true, demo: true, row };
    }
    const res = await fetch(CFG.SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(row) });
    const json = await res.json().catch(() => ({ ok: res.ok }));
    if (!json.ok) throw new Error(json.error || "저장 실패");
    return json;
  }

  async function fetchAll(opts = {}) {
    if (DEMO) {
      const local = lsGet("dcc_rows", []);
      const demo = opts.noDemo ? [] : demoRows();
      return { rows: demo.concat(local), demo: true };
    }
    const url = CFG.SCRIPT_URL + (opts.since ? `?since=${opts.since}` : "");
    const res = await fetch(url);
    const json = await res.json();
    return { rows: Array.isArray(json) ? json : (json.rows || []), demo: false };
  }

  async function count(date, grade, cls) {
    if (DEMO) {
      const all = demoRows().concat(lsGet("dcc_rows", []));
      return all.filter((r) => r.date === date && String(r.grade) === String(grade) && String(r.cls) === String(cls)).length;
    }
    const url = `${CFG.SCRIPT_URL}?action=count&date=${date}&g=${grade}&c=${cls}`;
    const res = await fetch(url); const j = await res.json(); return j.count || 0;
  }

  // ---------- 예시 데이터 (미리보기 모드) ----------
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp15(x) { return Math.max(1, Math.min(5, Math.round(x))); }
  let _demoCache = null;
  function demoRows() {
    if (_demoCache) return _demoCache;
    const rnd = mulberry32(20261025);
    const rows = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // 최근 4주의 평일 중 학급별 2일/주 수업
    const days = [];
    for (let i = 27; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); if (d.getDay() >= 1 && d.getDay() <= 5) days.push(d); }
    const toolByGrade = {
      1: ["태블릿 학습 앱", "캔바", "게임"], 2: ["태블릿 학습 앱", "캔바", "코딩(엔트리·스크래치)"],
      3: ["캔바", "코딩(엔트리·스크래치)", "검색·자료 조사"], 4: ["코딩(엔트리·스크래치)", "캔바", "챗봇·AI 도구"],
      5: ["바이브코딩(AI로 앱 만들기)", "챗봇·AI 도구", "발표·공유 도구"], 6: ["바이브코딩(AI로 앱 만들기)", "챗봇·AI 도구", "검색·자료 조사"]
    };
    for (let g = 1; g <= 6; g++) {
      for (let c = 1; c <= 2; c++) {
        const classDays = days.filter((d) => d.getDay() === ((g + c) % 5) + 1 || d.getDay() === ((g + c + 2) % 5) + 1);
        const n = 20 + Math.floor(rnd() * 5);
        const period = ((g + c) % 5) + 1;
        const studentTrait = Array.from({ length: n }, () => ({ screen: rnd(), skill: rnd() - 0.5, mood: rnd() - 0.5 }));
        classDays.forEach((d, di) => {
          const tool = toolByGrade[g][di % 3] === "게임" ? "게임·퀴즈" : toolByGrade[g][di % 3];
          const toolName = TOOLS.includes(tool) ? tool : "태블릿 학습 앱";
          const date = todayStr(d), wd = weekdayOf(d);
          const isMon = d.getDay() === 1, isFri = d.getDay() === 5;
          for (let s = 1; s <= n; s++) {
            if (rnd() < 0.08) continue; // 결석/미응답
            const tr = studentTrait[s - 1];
            const dev = `demo-${g}-${c}-${s}`;
            // 학년이 높을수록 기기 사용시간 증가
            const screenBase = 0.35 + g * 0.32 + (tr.screen - 0.5) * 2.4 + (d.getDay() === 1 ? 0.4 : 0);
            const screen_yday = Math.max(0, Math.min(4, Math.round(screenBase + (rnd() - 0.5) * 1.4)));
            const uses = [];
            if (screen_yday === 0) uses.push("안 썼어");
            else {
              if (rnd() < 0.45 + g * 0.04) uses.push("게임");
              if (rnd() < 0.7) uses.push("영상(유튜브 등)");
              if (rnd() < 0.25 + g * 0.03) uses.push("공부·학습 앱");
              if (rnd() < 0.05 + g * 0.1) uses.push("친구와 대화(메신저)");
              if (rnd() < 0.15 + tr.skill * 0.2) uses.push("만들기(코딩·그림·영상 제작)");
              if (rnd() < 0.05 + g * 0.05) uses.push("AI와 대화");
              if (!uses.length) uses.push("영상(유튜브 등)");
            }
            const mood = clamp15(3.9 - g * 0.08 + tr.mood * 1.6 + (isMon ? -0.35 : 0) + (isFri ? 0.25 : 0) + (rnd() - 0.5) * 1.4);
            const energy = clamp15(3.7 - g * 0.05 + tr.mood + (isMon ? -0.3 : 0) - (screen_yday >= 3 ? 0.4 : 0) + (rnd() - 0.5) * 1.4);
            const expect = clamp15(4.3 - g * 0.12 + (rnd() - 0.5) * 1.3);
            const confidence_pre = clamp15(2.6 + g * 0.18 + tr.skill * 1.8 + (screen_yday >= 3 ? 0.25 : 0) + (rnd() - 0.5) * 1.2);
            rows.push(Object.assign(blankRow(), {
              ts: new Date(d.getTime() + (8 + period) * 3600e3 + s * 4000).toISOString(), date, weekday: wd, period,
              grade: g, cls: c, num: s, phase: "before", mood, energy, screen_yday, use_yday: uses.join(";"), expect, confidence_pre, device_id: dev
            }));
            if (rnd() < 0.1) continue; // 체크아웃 누락
            const fun = clamp15(4.2 - g * 0.1 + tr.mood * 0.6 + (toolName.startsWith("바이브") ? 0.3 : 0) + (rnd() - 0.5) * 1.3);
            const difficulty = clamp15(2.3 + (toolName.startsWith("바이브") || toolName.startsWith("코딩") ? 0.8 : 0) - tr.skill * 1.2 + (g <= 2 ? 0.3 : 0) + (rnd() - 0.5) * 1.3);
            const help = clamp15(2.2 + g * 0.3 + tr.skill * 1.6 + (screen_yday >= 3 ? 0.15 : 0) - (difficulty - 3) * 0.3 + (rnd() - 0.5) * 1.2);
            const confidence_post = clamp15(confidence_pre + 0.45 + (fun - 3) * 0.15 - (difficulty - 3) * 0.1 + (rnd() - 0.5) * 0.9);
            const bestWeights = g <= 2 ? [3, 3, 1.5, 1.5, 1, 3] : g <= 4 ? [3, 2.5, 2, 2, 1.5, 2] : [3, 2, 3, 2.5, 2, 1];
            if (toolName.startsWith("챗봇") || toolName.startsWith("바이브")) bestWeights[2] += 2;
            const tot = bestWeights.reduce((a, b) => a + b, 0); let r = rnd() * tot, bi = 0;
            while (r > bestWeights[bi]) { r -= bestWeights[bi]; bi++; }
            rows.push(Object.assign(blankRow(), {
              ts: new Date(d.getTime() + (8 + period) * 3600e3 + 2400e3 + s * 4000).toISOString(), date, weekday: wd, period,
              grade: g, cls: c, num: s, phase: "after", tool: toolName, fun, difficulty, help, confidence_post, best: BEST_OPTIONS[bi], note: "", device_id: dev
            }));
          }
        });
      }
    }
    _demoCache = rows;
    return rows;
  }

  // ---------- 시간표 설문 (survey 탭) ----------
  const SURVEY_HEADER = ["ts", "date", "grade", "cls", "num", "focus_best", "focus_worst", "worst_why", "p1_subject", "p1_why",
    "last_subject", "after_lunch_subject", "science_pref", "two_in_row", "wish", "device_id"];
  const SUBJECTS = ["국어", "수학", "사회", "과학", "영어", "체육", "음악", "미술", "도덕", "실과", "창체(자율·동아리)"];
  const WORST_WHY = ["졸려서", "배고파서", "점심 먹고 나른해서", "지쳐서(체력)", "재미없는 과목이라서", "모르겠어"];
  const P1_WHY = ["머리가 맑을 때 해야 해서", "좋아하는 과목이라 아침에 하고 싶어서", "어려운 과목은 빨리 끝내고 싶어서", "몸을 움직여 잠을 깨고 싶어서", "기타"];
  const BLOCK_OPTIONS = ["두 교시 연속", "한 교시씩", "상관없어"];
  // 부산 실제 시간표 (NEIS 시간표 분석, 3~6학년 1반 1주): 과목이 1·2교시에 놓이는 비율(%)
  const BUSAN_P12 = { "국어": 59, "영어": 49, "수학": 42, "체육": 41, "과학": 37, "도덕": 28, "음악": 22, "사회": 21, "미술": 17, "실과": 15 };
  const BUSAN_SCIENCE_BLOCK = 9; // 과학 연속 2교시 블록 비율(%)

  function blankSurvey() { const r = {}; SURVEY_HEADER.forEach((h) => (r[h] = "")); return r; }
  async function submitSurvey(partial) {
    const now = new Date();
    const row = Object.assign(blankSurvey(), partial, { ts: now.toISOString(), date: todayStr(now), device_id: deviceId() });
    if (row.wish) row.wish = cleanNote(row.wish);
    if (DEMO) {
      const rows = lsGet("dcc_survey", []); rows.push(row); lsSet("dcc_survey", rows);
      await new Promise((r) => setTimeout(r, 350));
      return { ok: true, demo: true, row };
    }
    const res = await fetch(CFG.SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ sheet: "survey" }, row)) });
    const json = await res.json().catch(() => ({ ok: res.ok }));
    if (!json.ok) throw new Error(json.error || "저장 실패");
    return json;
  }
  async function fetchSurvey(opts = {}) {
    if (DEMO) return { rows: (opts.noDemo ? [] : demoSurvey()).concat(lsGet("dcc_survey", [])), demo: true };
    const res = await fetch(CFG.SCRIPT_URL + "?sheet=survey"); const json = await res.json();
    return { rows: Array.isArray(json) ? json : (json.rows || []), demo: false };
  }
  let _surveyCache = null;
  function demoSurvey() {
    if (_surveyCache) return _surveyCache;
    const rnd = mulberry32(20261101);
    const pick = (weights, list) => { const tot = weights.reduce((a, b) => a + b, 0); let r = rnd() * tot, i = 0; while (r > weights[i] && i < weights.length - 1) { r -= weights[i]; i++; } return list[i]; };
    const rows = [];
    const d = new Date(); d.setDate(d.getDate() - 3); const date = todayStr(d);
    for (let g = 3; g <= 6; g++) {
      const n = 36 + Math.floor(rnd() * 4);
      for (let s = 1; s <= n; s++) {
        const sub = g >= 5 ? SUBJECTS : SUBJECTS.filter((x) => x !== "실과");
        const w = (base) => sub.map((x) => base[x] || 1);
        // 1교시 희망: 체육 > 수학 > 과학
        const p1 = pick(w({ "체육": 9, "수학": 6, "과학": 5, "영어": 2.5, "국어": 2.5, "미술": 2, "음악": 1.5, "사회": 1.2, "창체(자율·동아리)": 2, "실과": 1.5, "도덕": 0.8 }), sub);
        const p1_why = pick(p1 === "체육" ? [1, 2, 0.5, 6, 0.5] : p1 === "수학" ? [5, 1.5, 4, 0.3, 0.5] : [3, 3, 1.5, 0.5, 0.7], P1_WHY);
        const worst = pick([2.5, 1, 1, 1.5, 6, 3], [1, 2, 3, 4, 5, 6]);
        const worst_why = pick(worst === 5 ? [1, 0.5, 7, 1.5, 1, 0.5] : worst === 1 ? [7, 2, 0.2, 0.5, 1, 0.5] : worst === 4 ? [0.5, 6, 0.3, 1.5, 1, 0.7] : [1, 1, 0.5, 4, 2, 1], WORST_WHY);
        let best = pick([3, 5, 4, 2, 0.5, 0.5], [1, 2, 3, 4, 5, 6]); if (best === worst) best = best === 1 ? 2 : 1;
        rows.push(Object.assign(blankSurvey(), {
          ts: new Date(d.getTime() + 10 * 3600e3 + s * 5000).toISOString(), date, grade: g, cls: 1 + (s % 2), num: s,
          focus_best: best, focus_worst: worst, worst_why, p1_subject: p1, p1_why,
          last_subject: pick(w({ "체육": 5, "미술": 5, "음악": 4, "창체(자율·동아리)": 4, "과학": 2.5, "실과": 2, "사회": 1, "국어": 0.8, "수학": 0.5, "영어": 1, "도덕": 1 }), sub),
          after_lunch_subject: pick(w({ "체육": 6, "미술": 4, "음악": 4, "과학": 3, "창체(자율·동아리)": 3, "실과": 2, "영어": 1.5, "사회": 1, "국어": 0.7, "수학": 0.5, "도덕": 1 }), sub),
          science_pref: pick([1, 2, 5, 5, 1.5, 0.8], [1, 2, 3, 4, 5, 6]),
          two_in_row: pick([6, 2.5, 1.5], BLOCK_OPTIONS), wish: "", device_id: `demo-s-${g}-${s}`
        }));
      }
    }
    _surveyCache = rows; return rows;
  }

  // ---------- CSV ----------
  function toCSV(rows, header = HEADER) {
    const esc = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return "﻿" + header.join(",") + "\n" + rows.map((r) => header.map((h) => esc(r[h])).join(",")).join("\n");
  }

  window.DCC = { CFG, DEMO, HEADER, WEEKDAYS, SCREEN_LABELS, USE_OPTIONS, TOOLS, BEST_OPTIONS,
    SURVEY_HEADER, SUBJECTS, WORST_WHY, P1_WHY, BLOCK_OPTIONS, BUSAN_P12, BUSAN_SCIENCE_BLOCK,
    todayStr, weekdayOf, deviceId, lsGet, lsSet, cleanNote, submit, fetchAll, count, demoRows, toCSV, submitSurvey, fetchSurvey, demoSurvey };
  if (DEMO) document.addEventListener("DOMContentLoaded", () => document.body.classList.add("demo"));
})();
