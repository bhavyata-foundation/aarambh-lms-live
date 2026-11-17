/*
 * hpc-card.js — Student Progress Report (HPC card), laid out exactly like the
 * Excel "Student_Report" sheet. Sections collapse to a header and open on hover
 * (or on tap); printing / downloading always shows every section open.
 *
 * Needs js/hpc-master.js (window.HPC) to be loaded first.
 *
 * HPCCard.render({
 *   schoolName, className, academicYear, reportDate: "YYYY-MM-DD",
 *   student: { name, roll, gender, joined: "YYYY-MM-DD" },
 *   pre:  { "C-1.1": "B"|"P"|"A", ... },      // Pre-Test levels (may be empty)
 *   term: { "C-1.1": "B"|"P"|"A", ... },      // Term 1 levels
 *   attendance: null,                          // empty state until data exists
 *   rounds: null                               // empty state until data exists
 * })
 * Levels shown are B / P / A only. Children are never ranked.
 */
(function (root) {
  "use strict";
  var H = root.HPC;
  if (!H) throw new Error("hpc-card.js needs js/hpc-master.js loaded first (window.HPC).");

  var LVC = { B: { bg: "#FCE3E1", fg: "#9B1C1C" }, P: { bg: "#FFF1CC", fg: "#7A5300" }, A: { bg: "#DDF2E5", fg: "#1E6B46" } };
  var LVN = { B: "Beginner", P: "Proficient", A: "Advanced" };
  var RANK = { B: 1, P: 2, A: 3 };
  var BANDC = {
    "Very Strong": { bg: "#1B5E20", fg: "#FFFFFF" },
    "Strong": { bg: "#A9D18E", fg: "#1B5E20" },
    "Developing": { bg: "#FFD966", fg: "#5D4037" },
    "Needs Intervention": { bg: "#F4A6A0", fg: "#7F0000" }
  };
  var DOM_ICON = { D1: "💪", D2: "🗣️", D3: "🧠", D4: "🌿", D5: "😊", D6: "🎨" };
  var KOSHA_ICON = { K1: "💪", K2: "💗", K3: "🧠", K4: "🗣️", K5: "🌟" };
  var NAVY = "#1d9e75", LIGHT = "#e1f5ee", HEAD = "#cdeee0", GREEN = "#2E7D32";

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function f0(x) { return x === null || x === undefined || isNaN(x) ? "–" : String(Math.round(x)); }
  function sgn(x) { return (x >= 0 ? "+" : "") + Math.round(x); }
  function f2(x) { return x === null || x === undefined || isNaN(x) ? "–" : x.toFixed(2); }

  var ALL_IDS = Object.keys(H.competencies).sort(function (a, b) {
    if (a[0] !== b[0]) return a[0] === "V" ? 1 : (b[0] === "V" ? -1 : 0);
    var pa = a.replace(/[^0-9.]/g, "").split(".").map(Number), pb = b.replace(/[^0-9.]/g, "").split(".").map(Number);
    return (pa[0] - pb[0]) || (pa[1] - pb[1]);
  });

  function counts(levels, ids) {
    var c = { B: 0, P: 0, A: 0 };
    ids.forEach(function (id) { var l = levels && levels[id]; if (RANK[l]) c[l]++; });
    return c;
  }
  function scoreOf(levels, ids) { var c = counts(levels, ids); return H.score(c.B, c.P, c.A); }
  function levelOfScore(sc) { return sc === null || sc === undefined ? null : (sc >= 250 ? "A" : (sc >= 150 ? "P" : "B")); }
  function bandOf(sc) { return sc === null || sc === undefined ? null : H.band(sc); }
  function changeOf(a, b) { return (a === null || b === null || a === undefined || b === undefined) ? null : b - a; }

  function lvl(l) {
    if (!RANK[l]) return '<span class="hpc-na">–</span>';
    return '<span class="hpc-lvl" style="background:' + LVC[l].bg + ';color:' + LVC[l].fg + '">' + l + "</span>";
  }
  function band(b) {
    if (!b || !BANDC[b]) return '<span class="hpc-na">–</span>';
    return '<span class="hpc-band" style="background:' + BANDC[b].bg + ';color:' + BANDC[b].fg + '">' + esc(b) + "</span>";
  }
  function arrow(d) {
    if (d === null || d === undefined) return '<span class="hpc-na">–</span>';
    if (d > 0) return '<b class="hpc-up">↑</b>';
    if (d < 0) return '<b class="hpc-down">↓</b>';
    return '<b class="hpc-same">→</b>';
  }
  function moveText(a, b) {
    if (!RANK[a] || !RANK[b]) return "";
    return RANK[b] > RANK[a] ? "↑" : RANK[b] < RANK[a] ? "↓" : "→";
  }

  // ---------- competency status and review note (wording as in the Excel) ----------
  function status(pre, term) {
    if (!RANK[term]) return ["Not assessed", ""];
    if (!RANK[pre]) return ["New this term", term === "B" ? "Assessed this term only — at Beginner; needs focused support." : "Assessed this term only."];
    if (RANK[term] < RANK[pre]) return ["Slipped", "Slipped since the Pre-Test — review with guided practice."];
    if (RANK[term] > RANK[pre]) {
      if (term === "A") return ["Prominent", "Moved up to Advanced — offer enrichment and peer-helper tasks."];
      return ["Improved", "Improved to Proficient – reinforce so it becomes Advanced."];
    }
    if (term === "A") return ["Prominent", "Secure at Advanced — offer enrichment and leadership roles."];
    if (term === "P") return ["On track", "Steady at Proficient — add challenge to move towards Advanced."];
    return ["Needs support", "Still at Beginner — needs focused one-to-one or small-group support."];
  }
  var STATUS_C = {
    "Prominent": { bg: "#2E7D32", fg: "#FFFFFF" }, "Improved": { bg: "#C8E6C9", fg: "#1B5E20" },
    "On track": { bg: "#FFF1CC", fg: "#7A5300" }, "Needs support": { bg: "#F4A6A0", fg: "#7F0000" },
    "Slipped": { bg: "#F4A6A0", fg: "#7F0000" }, "New this term": { bg: "#e1f5ee", fg: "#0f6e56" },
    "Not assessed": { bg: "#F1F3F1", fg: "#5b6b62" }
  };
  function statusPill(s) {
    var c = STATUS_C[s] || STATUS_C["Not assessed"];
    return '<span class="hpc-band" style="background:' + c.bg + ';color:' + c.fg + '">' + esc(s) + "</span>";
  }

  // ---------- domain / kosha review note, same wording as the Excel ----------
  function domainNote(change, bandName) {
    var pts = change === null ? "" : (change >= 0 ? "Improved by " + Math.round(change) + " points. " : "Down by " + Math.round(-change) + " points. ");
    var tail = {
      "Very Strong": "Secure at Advanced – offer enrichment and leadership tasks.",
      "Strong": "Secure at Proficient – encourage towards Advanced-level tasks.",
      "Developing": "Mixed levels – continue guided practice and reinforcement.",
      "Needs Intervention": "Mostly Beginner – needs small-group / one-to-one support."
    }[bandName] || "";
    return pts + tail;
  }

  // ---------- the whole report's numbers ----------
  function build(data) {
    var pre = data.pre || {}, term = data.term || {};
    var ids = ALL_IDS.filter(function (id) { return RANK[pre[id]] || RANK[term[id]]; });
    var termIds = ids.filter(function (id) { return RANK[term[id]]; });
    var preIds = ids.filter(function (id) { return RANK[pre[id]]; });

    var preSc = preIds.length ? scoreOf(pre, preIds) : null;
    var termSc = termIds.length ? scoreOf(term, termIds) : null;
    var growth = (preSc !== null && termSc !== null) ? termSc - preSc : null;
    var tc = counts(term, termIds), pc = counts(pre, preIds);
    var ready = termIds.length ? (tc.P + tc.A) / termIds.length * 100 : null;
    var norm = (preSc !== null && termSc !== null && preSc < 300) ? (termSc - preSc) / (300 - preSc) : null;
    var months = data.student && data.student.joined ? Math.round((new Date(data.reportDate) - new Date(data.student.joined)) / 86400000) / 30.44 : null;
    var perMonth = (growth !== null && months > 0) ? growth / months : null;

    var rows = ids.map(function (id) {
      var i = H.info(id), c = H.competencies[id];
      var st = status(pre[id], term[id]);
      return { id: id, text: c.text, cg: i.cg || c.cg || "", dom: i.domain, kosha: i.kosha, param: i.param,
               pre: pre[id] || null, term: term[id] || null, status: st[0], note: st[1] };
    });
    var improved = rows.filter(function (r) { return RANK[r.pre] && RANK[r.term] && RANK[r.term] > RANK[r.pre]; }).length;
    var same = rows.filter(function (r) { return RANK[r.pre] && RANK[r.term] && RANK[r.term] === RANK[r.pre]; }).length;
    var slipped = rows.filter(function (r) { return RANK[r.pre] && RANK[r.term] && RANK[r.term] < RANK[r.pre]; }).length;

    function groupIds(key, code) { return ids.filter(function (id) { return H.info(id)[key] === code; }); }

    var domains = Object.keys(H.domains).sort().map(function (code) {
      var dids = groupIds("domain", code), tids = dids.filter(function (id) { return RANK[term[id]]; });
      if (!dids.length) return null;
      var ps = scoreOf(pre, dids.filter(function (id) { return RANK[pre[id]]; })), ts = tids.length ? scoreOf(term, tids) : null;
      var d = counts(term, tids), dLvlPre = levelOfScore(ps), dLvlTerm = levelOfScore(ts), chg = changeOf(ps, ts);
      return { code: code, name: H.domains[code].name, short: H.domains[code].short || H.domains[code].name,
               comps: dids.length, b: d.B, p: d.P, a: d.A, pre: ps, term: ts, change: chg,
               lvl: { pre: dLvlPre, term: dLvlTerm }, band: bandOf(ts) };
    }).filter(Boolean);

    var koshas = Object.keys(H.koshas).sort().map(function (k) {
      var kids = groupIds("kosha", k), tids = kids.filter(function (id) { return RANK[term[id]]; });
      if (!kids.length) return null;
      var ps = scoreOf(pre, kids.filter(function (id) { return RANK[pre[id]]; })), ts = tids.length ? scoreOf(term, tids) : null;
      var d = counts(term, tids);
      return { code: k, name: H.koshas[k].name, cgs: H.koshas[k].cgs || "", comps: kids.length,
               b: d.B, p: d.P, a: d.A, pre: ps, term: ts, change: changeOf(ps, ts), lvl: { pre: levelOfScore(ps), term: levelOfScore(ts) }, band: bandOf(ts) };
    }).filter(Boolean);

    var params = Object.keys(H.params).map(function (p) {
      var pids = ids.filter(function (id) { return H.info(id).param === p; }), tids = pids.filter(function (id) { return RANK[term[id]]; });
      if (!tids.length) return null;
      var ts = scoreOf(term, tids);
      return { code: p, name: H.params[p].name, term: ts, next: H.nextStep(p, bandOf(ts)),
               needs: tids.filter(function (id) { return term[id] === "B"; }) };
    }).filter(Boolean);

    var byTerm = domains.filter(function (d) { return d.term !== null; }).sort(function (a, b) { return b.term - a.term; });
    var strongest = byTerm[0], weakest = byTerm[byTerm.length - 1];
    var weakParams = params.slice().sort(function (a, b) { return a.term - b.term; }).slice(0, 3);
    var first = ((data.student && data.student.name) || "").split(" ")[0];

    var overall = termSc === null ? "" :
      first + " is " + (growth !== null && growth > 0 ? "developing steadily" : "at " + LVN[levelOfScore(termSc)]) +
      " (score " + f0(termSc) + (growth !== null ? ", " + sgn(growth) + " since Pre-Test" : "") + "). " +
      (strongest ? "Strongest domain: " + strongest.name + ". " : "") +
      (weakParams.length ? "Needs support in: " + weakParams.map(function (p) { return p.name; }).join(", ") + "." : "");

    return { ids: ids, termIds: termIds, preIds: preIds, rows: rows, domains: domains, koshas: koshas, params: params,
             preSc: preSc, termSc: termSc, growth: growth, perMonth: perMonth, norm: norm, ready: ready,
             tc: tc, pc: pc, improved: improved, same: same, slipped: slipped,
             strongest: strongest, weakest: weakest, weakParams: weakParams, overall: overall, months: months };
  }

  // ---------- summary cards (the six from the Excel overview row) ----------
  function sumCard(label, value, sub) {
    return '<div class="hpc-sum"><div class="hpc-sum-l">' + esc(label) + '</div><div class="hpc-sum-v">' + value +
           '</div><div class="hpc-sum-s">' + sub + "</div></div>";
  }
  function lvlBig(sc) {
    var l = levelOfScore(sc);
    return l ? '<span class="hpc-sum-lvl" style="background:' + LVC[l].bg + ';color:' + LVC[l].fg + '">' + l + "</span>" : '<span class="hpc-na">–</span>';
  }
  function pill(text) { return text ? '<span class="hpc-pill">' + esc(text) + "</span>" : ""; }
  function summaryCards(R) {
    var na = '<span class="hpc-na">–</span>', m = function (t) { return '<span class="hpc-muted">' + t + "</span>"; };
    return '<div class="hpc-sumgrid">' + [
      sumCard("Score · Pre-Test", R.preSc === null ? na : f0(R.preSc),
              R.preSc === null ? m("no Pre-Test marks") : pill(bandOf(R.preSc)) + " " + lvlBig(R.preSc)),
      sumCard("Score · Term 1", R.termSc === null ? na : f0(R.termSc),
              R.termSc === null ? m("no Term marks yet") : pill(bandOf(R.termSc)) + " " + lvlBig(R.termSc)),
      sumCard("Growth", R.growth === null ? na : sgn(R.growth),
              R.growth === null ? m("needs Pre-Test and Term") : m("points" + (R.perMonth === null ? "" : " · " + (R.perMonth >= 0 ? "+" : "") + R.perMonth.toFixed(1) + " per month"))),
      sumCard("Overall level", lvlBig(R.termSc),
              m(levelOfScore(R.preSc) ? "was " + levelOfScore(R.preSc) + " at Pre-Test" : "no Pre-Test to compare")),
      sumCard("Readiness (P + A)", R.ready === null ? na : Math.round(R.ready) + "%",
              R.ready === null ? m("no Term marks yet") : pill(H.readinessBand(R.ready))),
      sumCard("Normalised gain", R.norm === null ? na : f2(R.norm),
              R.norm === null ? m("needs Pre-Test") : pill(H.gainBand(R.norm)))
    ].join("") + "</div>";
  }

  // ---------- one collapsible section ----------
  function section(id, num, title, summary, body, openByDefault) {
    return '<section class="hpc-sec' + (openByDefault ? " hpc-open" : "") + '" id="' + id + '">' +
      '<div class="hpc-sec-head" role="button" tabindex="0" ' +
      'onclick="this.parentNode.classList.toggle(\'hpc-open\')" ' +
      'onkeydown="if(event.key===\'Enter\')this.parentNode.classList.toggle(\'hpc-open\')">' +
      '<span class="hpc-sec-t">' + num + " · " + esc(title) + "</span>" +
      '<span class="hpc-sec-sum">' + summary + "</span>" +
      '<span class="hpc-hint"><span class="hpc-h-open">click to open ▾</span><span class="hpc-h-close">click to close ▴</span></span>' +
      "</div>" +
      '<div class="hpc-sec-body">' + body + "</div></section>";
  }

  // ---------- body of each section, laid out like the Excel sheet ----------
  function overviewBody(R, D) {
    var glance = [
      ["At a glance", "Of " + R.termIds.length + " competencies at end of term:  <span class=\"hpc-dot\" style=\"background:#E9A23B\"></span> " + R.tc.A + " Advanced  •  " + R.tc.P + " Proficient  •  " + R.tc.B + " Beginner"],
      ["Movement since baseline", "↑ Improved in " + R.improved + "  •  → Same level in " + R.same + "  •  ↓ Slipped in " + R.slipped],
      ["Strongest / weakest domain", R.strongest && R.weakest ? "💪 " + esc(R.strongest.short) + "     🎯 " + esc(R.weakest.short) : "–"],
      ["Strongest / weakest kosha", (function () { var k = R.koshas.slice().filter(function (x) { return x.term !== null; }).sort(function (a, b) { return b.term - a.term; });
                                       return k.length ? "💪 " + esc(k[0].name) + "     🎯 " + esc(k[k.length - 1].name) : "–"; })()],
      ["Teacher's overview (auto)", esc(R.overall) || "–"]
    ];
    return '<div class="hpc-glance">' + glance.map(function (g) {
      return '<div class="hpc-gl"><b>' + g[0] + "</b><span>" + g[1] + "</span></div>";
    }).join("") + "</div>";
  }

  function competencyBody(R) {
    // the Excel-style competency table (screen and print)
    var head = '<tr><th>No.</th><th>ID</th><th class="l">Competency</th><th>CG</th><th class="l">Domain</th><th>Pre-Test</th><th>Term 1</th><th>Change</th><th>Status</th><th class="l">Review note</th></tr>';
    var body = R.rows.map(function (r, n) {
      var dom = r.dom && H.domains[r.dom] ? H.domains[r.dom].short : "";
      var ch = moveText(r.pre, r.term);
      return "<tr><td>" + (n + 1) + "</td><td><b>" + esc(r.id) + '</b></td><td class="l">' + esc(r.text) + "</td><td>" + esc(r.cg) +
        '</td><td class="l">' + esc(dom) + "</td><td>" + lvl(r.pre) + "</td><td>" + lvl(r.term) + "</td><td>" +
        (ch ? '<b class="' + (ch === "↑" ? "hpc-up" : ch === "↓" ? "hpc-down" : "hpc-same") + '">' + ch + "</b>" : '<span class="hpc-na">–</span>') +
        "</td><td>" + statusPill(r.status) + '</td><td class="l hpc-note">' + esc(r.note) + "</td></tr>";
    }).join("");
    return '<div class="hpc-tablewrap"><table class="hpc-t hpc-comp"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>" +
      '<div class="hpc-total">Total: ' + R.termIds.length + " competencies  •  Advanced " + R.tc.A + "  •  Proficient " + R.tc.P + "  •  Beginner " + R.tc.B + "  •  Improved " + R.improved + "  •  Slipped " + R.slipped + "</div>";
  }

  function domainBody(R) {
    var head = '<tr><th class="l">Area</th><th>Comps</th><th>End-term B / P / A</th><th>Pre-Test score</th><th>Term 1 score</th><th>Change</th><th>Level</th><th>Band</th><th class="l">Review note</th></tr>';
    var body = R.domains.map(function (d) {
      var lv = d.lvl.pre && d.lvl.term ? lvl(d.lvl.pre) + ' <span class="hpc-arr">→</span> ' + lvl(d.lvl.term) : "–";
      var ch = d.change === null ? '<span class="hpc-na">–</span>' : '<b class="' + (d.change >= 0 ? "hpc-up" : "hpc-down") + '">' + sgn(d.change) + " " + (d.change >= 0 ? "↑" : "↓") + "</b>";
      return '<tr><td class="l"><b>' + esc((DOM_ICON[d.code] || "") + "  " + d.name) + "</b></td><td>" + d.comps + "</td><td>" + d.b + " / " + d.p + " / " + d.a +
        "</td><td>" + f0(d.pre) + '</td><td class="bar"><span style="--w:' + Math.max(0, Math.min(100, ((d.term || 100) - 100) / 2)).toFixed(0) + '%"></span><b>' + f0(d.term) + "</b></td><td>" + ch +
        "</td><td>" + lv + "</td><td>" + band(d.band) + '</td><td class="l hpc-note">' + esc(domainNote(d.change, d.band)) + "</td></tr>";
    }).join("");
    return '<table class="hpc-t hpc-dom"><thead>' + head + "</thead><tbody>" + body + "</tbody></table>";
  }

  function kosha4Body(R) {
    var head = '<tr><th class="l">Area</th><th>Comps</th><th>End-term B / P / A</th><th>Pre-Test score</th><th>Term 1 score</th><th>Change</th><th>Level</th><th>Band</th></tr>';
    var body = R.koshas.map(function (k) {
      var lv = k.lvl.pre && k.lvl.term ? lvl(k.lvl.pre) + ' <span class="hpc-arr">→</span> ' + lvl(k.lvl.term) : "–";
      var ch = k.change === null ? '<span class="hpc-na">–</span>' : '<b class="' + (k.change >= 0 ? "hpc-up" : "hpc-down") + '">' + sgn(k.change) + " " + (k.change >= 0 ? "↑" : "↓") + "</b>";
      return '<tr><td class="l"><b>' + esc((KOSHA_ICON[k.code] || "") + "  " + k.name + (k.cgs ? "  (" + k.cgs + ")" : "")) + "</b></td><td>" + k.comps + "</td><td>" + k.b + " / " + k.p + " / " + k.a +
        "</td><td>" + f0(k.pre) + "</td><td><b>" + f0(k.term) + "</b></td><td>" + ch + "</td><td>" + lv + "</td><td>" + band(k.band) + "</td></tr>";
    }).join("");
    return '<table class="hpc-t hpc-kosha"><thead>' + head + "</thead><tbody>" + body + "</tbody></table>";
  }

  function listOf(rows, empty) {
    if (!rows.length) return '<p class="hpc-muted">' + empty + "</p>";
    return '<ul class="hpc-list">' + rows.map(function (r) { return "<li><b>" + esc(r.id) + "</b> – " + esc(r.text) + "</li>"; }).join("") + "</ul>";
  }
  function prominentBody(R) { return listOf(R.rows.filter(function (r) { return r.term === "A"; }), "None at Advanced yet."); }
  function improveBody(R) { return listOf(R.rows.filter(function (r) { return RANK[r.pre] && RANK[r.term] && RANK[r.term] > RANK[r.pre]; }), "No movement up yet."); }
  function roomBody(R) {
    var beginner = R.rows.filter(function (r) { return r.term === "B"; });
    var slipped = R.rows.filter(function (r) { return RANK[r.pre] && RANK[r.term] && RANK[r.term] < RANK[r.pre]; });
    var focus = R.params.filter(function (p) { return p.needs.length; });
    var t = focus.length ? '<table class="hpc-t hpc-focus"><thead><tr><th class="l">Focus area</th><th class="l">Needs support in</th><th class="l">Suggested activities (class &amp; home)</th></tr></thead><tbody>' +
      focus.map(function (p) { return '<tr><td class="l"><b>' + esc(p.name) + '</b></td><td class="l">' + esc(p.needs.join(", ")) + '</td><td class="l">' + esc(p.next) + "</td></tr>"; }).join("") + "</tbody></table>" : "";
    return '<div class="hpc-two"><div><b>Still at Beginner</b>' + listOf(beginner, "None — well done.") + "</div>" +
      '<div><b>Slipped since the Pre-Test</b>' + listOf(slipped, "None.") + "</div></div>" + t;
  }
  function notesBody() {
    var boxes = ["Overall progress", "Strengths observed", "Areas to work on", "Message to parents"].map(function (t) {
      return '<div class="hpc-box"><b>' + t + '</b><div class="hpc-line"></div></div>';
    }).join("");
    return '<div class="hpc-boxes">' + boxes + '</div><div class="hpc-sigs"><div>Class Teacher</div><div>Principal</div><div>Parent / Guardian</div></div>';
  }

  // ---------- the card ----------
  // Column guide for the Student Report: the same short names as the class report, plus the student figures
  function studentGuideBox() {
    var terms = [
      ['CG', 'Curricular Goal, the goal a competency belongs to (CG-1 to CG-13).'],
      ['C-x.y', 'A competency code: CG number, then the competency number (for example C-7.1).'],
      ['COMPS', 'Number of competencies in that row (for a domain or a Panchakosha, all its competencies).'],
      ['END-TERM B / P / A', 'How many of the child\u2019s competencies are at Beginner, Proficient and Advanced at the end of Term 1.'],
      ['PRE-TEST SCORE', 'The child\u2019s score at the Pre-Test (on joining), 100 to 300.'],
      ['TERM 1 SCORE', 'The child\u2019s score at the end of Term 1, 100 to 300.'],
      ['CHANGE', 'Term 1 score minus Pre-Test score, in points. An up arrow (↑) means improved.'],
      ['LEVEL', 'The level from the score: A (Advanced) at 250 and above, P (Proficient) at 150 to 249, B (Beginner) below 150. Shown as "was … at Pre-Test" when it changed.'],
      ['BAND', 'The score band from the table above (Very Strong, Strong, Developing, Needs Intervention).'],
      ['Growth', 'Term 1 score minus Pre-Test score, and the growth per month since joining.'],
      ['Normalised gain', '(Term 1 score minus Pre-Test score) divided by (300 minus Pre-Test score). High is 0.70 and above, Medium 0.30 to 0.69, Low below 0.30. Below 0 is a decline.'],
      ['Readiness (P + A)', 'Share of competencies at Proficient or Advanced. High is 80% and above, Moderate 60% to 79%.'],
      ['Movement', '↑ improved, → same level, ↓ slipped, comparing the Pre-Test and Term 1 level for each competency.'],
      ['Review note', 'A short automatic note for the band, plus the points changed since the Pre-Test.']
    ];
    var rows = terms.map(function (t) { return '<tr><td style="padding:5px 8px; font-weight:700; white-space:nowrap; vertical-align:top;">' + t[0] + '</td><td style="padding:5px 8px;">' + t[1] + '</td></tr>'; }).join('');
    return '<div style="margin:6px 14px 4px; border:1px solid #C9D6CF; border-radius:10px; padding:10px 12px; background:#FBFCFB;">' +
      '<div style="font-weight:800; margin-bottom:4px;">COLUMN GUIDE: what each short name means</div>' +
      '<table style="width:100%; border-collapse:collapse; font-size:12.5px;"><tbody>' + rows + '</tbody></table></div>';
  }
  // ---- CG-wise comparison and automated remarks: all text is built from this child's marks ----
  var CG_NAMES = { 1: "Healthy & Safe Habits", 2: "Sensorial Development", 3: "Physical Fitness & Fine Motor Skills", 4: "Emotional Intelligence",
    5: "Productive Work & Seva", 6: "Care for Nature", 7: "Observation & Logical Thinking", 8: "Mathematical Understanding",
    9: "Communication in Two Languages", 10: "Reading & Writing (L1)", 11: "Beginning Reading & Writing (L2)", 12: "Visual & Performing Arts",
    13: "Curiosity, Attention, Adaptability & Positivity" };
  function cgNumOf(code) { var m = /(\d+)/.exec(String(code || "")); return m ? Number(m[1]) : null; }
  function signed(n) { return n === null || n === undefined ? "–" : (n >= 0 ? "+" : "−") + Math.abs(Math.round(n)); }
  function cgGroups(R, data) {
    var pre = data.pre || {}, term = data.term || {}, groups = {};
    R.rows.forEach(function (r) { var n = cgNumOf(r.cg); if (n !== null) (groups[n] = groups[n] || []).push(r); });
    return Object.keys(groups).map(Number).sort(function (a, b) { return a - b; }).map(function (n) {
      var rs = groups[n];
      var pIds = rs.filter(function (r) { return RANK[r.pre]; }).map(function (r) { return r.id; });
      var tIds = rs.filter(function (r) { return RANK[r.term]; }).map(function (r) { return r.id; });
      var ps = pIds.length ? scoreOf(pre, pIds) : null, ts = tIds.length ? scoreOf(term, tIds) : null;
      var up = rs.filter(function (r) { return RANK[r.pre] && RANK[r.term] && RANK[r.term] > RANK[r.pre]; }).length;
      var same = rs.filter(function (r) { return RANK[r.pre] && RANK[r.term] && RANK[r.term] === RANK[r.pre]; }).length;
      var down = rs.filter(function (r) { return RANK[r.pre] && RANK[r.term] && RANK[r.term] < RANK[r.pre]; }).length;
      return { n: n, name: CG_NAMES[n] || ("CG-" + n), rows: rs, ps: ps, ts: ts,
               chg: (ps !== null && ts !== null) ? ts - ps : null, up: up, same: same, down: down };
    });
  }
  function cgBody(groups) {
    if (!groups.length) return "<p class=\"hpc-cap\">No curricular goals with marks yet.</p>";
    var items = groups.map(function (g) {
      var pre = g.ps === null ? "–" : Math.round(g.ps), term = g.ts === null ? "–" : Math.round(g.ts);
      return '<li style="margin:0 0 6px;"><b>CG-' + g.n + "</b> " + esc(g.name) + ": <span style=\"white-space:nowrap;\">" + pre + " → " + term + "</span> " +
        (g.ts === null ? "" : band(bandOf(g.ts))) + "</li>";
    }).join("");
    return '<ul style="list-style:none; margin:0; padding:4px 2px; columns:2; column-gap:24px; font-size:13px; line-height:1.4;">' + items + "</ul>";
  }
  function remarksBody(R, data) {
    var pre = data.pre || {}, term = data.term || {}, groups = cgGroups(R, data);
    var name = (data.student && data.student.name) ? data.student.name : "The child";
    var first = name.split(" ")[0];
    var out = [];
    var pS = R.preIds.length ? scoreOf(pre, R.preIds) : null, tS = R.termIds.length ? scoreOf(term, R.termIds) : null;
    if (tS !== null) {
      var overall = first + " has a Term 1 score of " + Math.round(tS) + " (" + bandOf(tS) + ")";
      if (pS !== null) overall += ", " + (tS - pS >= 0 ? "up " : "down ") + Math.round(Math.abs(tS - pS)) + " points from the Pre-Test score of " + Math.round(pS) + " (" + bandOf(pS) + ")";
      out.push(overall + ".");
    }
    if (R.termIds.length) out.push("Of " + R.termIds.length + " competencies, " + R.improved + " improved, " + R.same + " stayed at the same level and " + R.slipped + " slipped.");
    var scored = groups.filter(function (g) { return g.ts !== null; });
    if (scored.length) {
      var best = scored.slice().sort(function (a, b) { return b.ts - a.ts; })[0];
      out.push("Strongest area: CG-" + best.n + " " + best.name + " (score " + Math.round(best.ts) + ", " + bandOf(best.ts) + ").");
      var moved = groups.filter(function (g) { return g.chg !== null; }).sort(function (a, b) { return b.chg - a.chg; });
      if (moved.length && moved[0].chg > 0) out.push("Biggest improvement: CG-" + moved[0].n + " " + moved[0].name + ", up " + Math.round(moved[0].chg) + " points.");
      var weak = scored.slice().sort(function (a, b) { return a.ts - b.ts; })[0];
      if (weak.n !== best.n) out.push("Needs most support: CG-" + weak.n + " " + weak.name + " (score " + Math.round(weak.ts) + ", " + bandOf(weak.ts) + ").");
    }
    var beg = R.rows.filter(function (r) { return r.term === "B"; }).map(function (r) { return r.id; });
    if (beg.length) out.push("Still at Beginner in " + beg.length + " competenc" + (beg.length === 1 ? "y" : "ies") + ": " + beg.slice(0, 10).join(", ") + (beg.length > 10 ? " and " + (beg.length - 10) + " more" : "") + ".");
    var slip = R.rows.filter(function (r) { return RANK[r.pre] && RANK[r.term] && RANK[r.term] < RANK[r.pre]; }).map(function (r) { return r.id; });
    if (slip.length) out.push("Slipped since the Pre-Test in: " + slip.join(", ") + ". These need a closer look in the next round.");
    if (!out.length) return "<p class=\"hpc-cap\">Not enough marks yet to write remarks.</p>";
    var perCg = groups.map(function (g) {
      return "<li><b>CG-" + g.n + " " + esc(g.name) + ":</b> " + g.up + " up, " + g.same + " same, " + g.down + " down of " + g.rows.length + " competencies" +
        (g.ts !== null ? ", Term 1 score " + Math.round(g.ts) + " (" + bandOf(g.ts) + ")" : "") + ".</li>";
    }).join("");
    return "<ul style=\"margin:0 0 10px 18px; line-height:1.55;\">" + out.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
      "<p class=\"hpc-cap\" style=\"margin:6px 0 4px;\"><b>By curricular goal</b></p><ul style=\"margin:0 0 4px 18px; line-height:1.55;\">" + perCg + "</ul>";
  }
  // Best CGs (by Term 1 score) and weak CGs, each with the Beginner competencies behind it
  function bestCGBody(groups) {
    var best = groups.filter(function (g) { return g.ts !== null; }).sort(function (a, b) { return b.ts - a.ts; }).slice(0, 5);
    if (!best.length) return '<p class="hpc-cap">No curricular goals scored yet.</p>';
    return '<ul style="margin:0 0 10px 18px; line-height:1.55;">' + best.map(function (g) {
      return '<li><b>CG-' + g.n + '</b> ' + esc(g.name) + ': ' + Math.round(g.ts) + ' ' + band(bandOf(g.ts)) + '</li>';
    }).join('') + '</ul>';
  }
  function weakCGBody(groups, R) {
    var scored = groups.filter(function (g) { return g.ts !== null; }).sort(function (a, b) { return a.ts - b.ts; });
    var weak = scored.filter(function (g) { return g.ts < 200; });
    if (!weak.length) weak = scored.slice(0, 3);
    if (!weak.length) return '<p class="hpc-cap">No curricular goals scored yet.</p>';
    return '<ul style="margin:0 0 10px 18px; line-height:1.55;">' + weak.map(function (g) {
      var beg = R.rows.filter(function (r) { return cgNumOf(r.cg) === g.n && r.term === 'B'; }).map(function (r) { return r.id; });
      return '<li><b>CG-' + g.n + '</b> ' + esc(g.name) + ': ' + Math.round(g.ts) + ' ' + band(bandOf(g.ts)) +
        (beg.length ? ' · still at Beginner in ' + esc(beg.join(', ')) : '') + '</li>';
    }).join('') + '</ul>';
  }
  // a section that fails shows a short note instead of breaking the whole report; the console shows the cause
  function safeBody(fn) {
    try { return fn(); } catch (e) {
      try { console.error('HPC section error', e); } catch (x) {}
      return '<p class="hpc-cap" style="color:#9B1C1C;">This section could not be drawn: ' + esc((e && e.message) || e) + '</p>';
    }
  }
  // Collective overview for the four teacher note boxes: no CG or domain names, just how the child is doing overall
  function notesParts(R, data) {
    var pre = data.pre || {}, term = data.term || {};
    var name = (data.student && data.student.name) ? data.student.name : 'The child';
    var first = name.split(' ')[0];
    var pS = R.preIds.length ? scoreOf(pre, R.preIds) : null, tS = R.termIds.length ? scoreOf(term, R.termIds) : null;
    var n = R.termIds.length || 0;
    var pa = n ? Math.round((R.tc.P + R.tc.A) / n * 100) : 0;
    var change = (pS !== null && tS !== null) ? tS - pS : null;
    var pace = change === null ? '' : (change >= 100 ? 'strong' : (change > 0 ? 'steady' : 'limited'));

    var overall = [];
    if (tS !== null) {
      overall.push(first + (pace ? ' has made ' + pace + ' progress this term' : ' is at ' + bandOf(tS) + ' this term') +
        (pS !== null ? ', moving from ' + bandOf(pS) + ' to ' + bandOf(tS) + '.' : '.'));
    }
    if (n) overall.push(pa + '% of learning is now at Proficient or Advanced, with ' + R.tc.A + ' of ' + n + ' competencies at Advanced.');

    var strengths = [];
    if (R.tc.A) strengths.push('Confident and secure in ' + R.tc.A + ' competencies, ready for Advanced-level tasks.');
    if (R.improved) strengths.push('Has moved up a level in ' + R.improved + ' competencies since joining.');

    var areas = [];
    if (R.tc.B) areas.push('Still building ' + R.tc.B + ' Beginner-level skills; these need focused, small-group practice.');
    if (R.tc.P) areas.push('Ready to move ' + R.tc.P + ' Proficient-level skills up to Advanced with more practice.');
    areas.push(R.slipped ? R.slipped + ' earlier gains have slipped and need a quick check.' : 'No earlier gains have slipped.');

    var parents = [];
    if (tS !== null) {
      parents.push(first + ' is ' + (tS >= 200 ? 'doing well' : (tS >= 150 ? 'making steady progress' : 'needing extra support')) + ' this term' +
        (pS !== null && change > 0 ? ', and has come a long way since joining.' : '.'));
    }
    return { overall: overall, strengths: strengths, areas: areas, parents: parents };
  }
  function bulletList(items) {
    if (!items || !items.length) return '<p class="hpc-cap" style="margin:0;">No marks yet.</p>';
    return '<ul style="margin:0 0 6px 16px; line-height:1.5; font-size:13px;">' + items.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
  }
  function notesFilled(R, data) {
    var p = notesParts(R, data);
    var box = function (title, inner) {
      return '<div class="hpc-box" style="min-height:120px;"><b>' + title + '</b><div style="margin-top:4px;">' + inner + '</div><div class="hpc-line"></div></div>';
    };
    var boxes = box('Overall progress', bulletList(p.overall.slice(0, 2))) +
      box('Strengths observed', bulletList(p.strengths.slice(0, 2))) +
      box('Areas to work on', bulletList(p.areas.slice(0, 2))) +
      box('Message to parents', bulletList(p.parents.slice(0, 1)));
    return '<div class="hpc-boxes">' + boxes + '</div><div class="hpc-sigs"><div>Class Teacher</div><div>Principal</div><div>Parent / Guardian</div></div>';
  }
  // Short Best Performance summary: top CGs, how many are Very Strong or Strong, and the prominent competencies
  function bestSummary(groups, R) {
    var scored = groups.filter(function (g) { return g.ts !== null; }).sort(function (a, b) { return b.ts - a.ts; });
    if (!scored.length) return '<p class="hpc-cap">No curricular goals scored yet.</p>';
    var top = scored.slice(0, 5).map(function (g) { return 'CG-' + g.n + ' (' + Math.round(g.ts) + ')'; }).join(', ');
    var vs = scored.filter(function (g) { return g.ts >= 250; }).length;
    var st = scored.filter(function (g) { return g.ts >= 200 && g.ts < 250; }).length;
    var adv = R.rows.filter(function (r) { return r.term === 'A'; }).map(function (r) { return r.id; });
    var advList = adv.slice(0, 4).join(', ') + (adv.length > 4 ? ' and ' + (adv.length - 4) + ' more' : '');
    return '<div style="line-height:1.6; font-size:13px;">' +
      '<div><b>Top CGs:</b> ' + esc(top) + '</div>' +
      '<div><b>Very Strong</b> in ' + vs + ' of ' + scored.length + ' CGs; <b>Strong</b> in ' + st + '.</div>' +
      '<div><b>Prominent competencies (Advanced):</b> ' + adv.length + (adv.length ? ' — ' + esc(advList) : '') + '</div></div>';
  }
  // number the sections that are actually shown, in order: 1, 2, 3 ...
  function renumberSections(html) {
    var n = 0;
    return String(html).replace(/(<span class="hpc-sec-t">)([^<·]*?)(\s*·)/g, function (m, a, b, c) { n += 1; return a + n + c; });
  }
  function render(data) {
    var R = build(data), s = data.student || {};
    var groupsNow = []; try { groupsNow = cgGroups(R, data); } catch (e) { try { console.error('HPC CG groups', e); } catch (x) {} }
    var joined = s.joined || "–";
    var sub = (data.schoolName ? '<div class="hpc-school">' + esc(data.schoolName) + "</div>" : "");
    var head = '<div class="hpc-banner"><div class="hpc-title">' + esc(data.schoolName || "School") + "</div>" +
      '<div class="hpc-sub2">STUDENT PROGRESS REPORT  •  ' + esc(data.className || "") + "  •  Academic Year " + esc(data.academicYear || "") + "</div>" +
      '<div class="hpc-sub3">Pre-Test (on joining)  →  Term 1 (end of term)   |   B = Beginner   P = Proficient   A = Advanced   |   NEP 2020 • NCF-FS • Panchakosha</div></div>' +
      '<table class="hpc-info"><tr><th>Roll No.</th><td class="v">' + esc(s.roll || "") + "</td><th>Name</th><td class=\"n\">" + esc(s.name || "") + "</td><th>Gender</th><td>" + esc(s.gender || "–") + "</td><th>Class</th><td>" + esc(data.className || "–") + "</td><th>Year</th><td>" + esc(data.academicYear || "–") + "</td></tr>" +
      "<tr><th>Joined</th><td>" + esc(joined) + '</td><td colspan="3" class="c">Assessed: Baseline and end of term  •  Competencies assessed: ' + R.termIds.length + '</td><td colspan="3" class="c">Report date: ' + esc(data.reportDate || "") + '</td><td colspan="2" class="c">Time in school: ' + (R.months ? Math.floor(R.months) + " months" : "–") + "</td></tr></table>";

    var sec1 = section("sec1", 1, "OVERALL OVERVIEW", "", summaryCards(R) + overviewBody(R, data), true);
    var sec2 = section("sec2", 2, "COMPETENCY-WISE PERFORMANCE (all competencies)",
      R.termIds.length + " competencies  •  " + R.tc.A + " Advanced  •  " + R.tc.P + " Proficient  •  " + R.tc.B + " Beginner", competencyBody(R));
    var sec3 = section("sec3", 3, "DOMAIN-WISE DEVELOPMENT (" + R.domains.length + " domains)",
      R.strongest ? "strongest: " + esc(R.strongest.short) + "  •  most support: " + esc(R.weakest.short) : "", domainBody(R));
    var sec4 = section("sec4", 4, "PANCHAKOSHA-WISE DEVELOPMENT", R.koshas.length + " koshas", kosha4Body(R));
    var sec5 = section("sec5", 5, "BEST PERFORMANCE IN CG  ⭐",
      groupsNow.length + " curricular goals", safeBody(function () { return bestSummary(groupsNow, R); }));
    var secWeak = section("sec-weak", 6, "WEAK PERFORMING CGs", "lowest curricular goals", safeBody(function () { return weakCGBody(groupsNow, R); }), true);
    var sec6 = section("sec6", 6, "IMPROVEMENT  📈  (moved up since the Pre-Test)",
      R.improved + " competencies", improveBody(R));
    var sec7 = section("sec7", 7, "ROOM FOR IMPROVEMENT  🎯", R.tc.B + " still at Beginner", roomBody(R));
    var sec8 = section("sec8", 7, "TEACHER'S REVIEW NOTES", "", safeBody(function () { return notesFilled(R, data); }), true);

    // score bands legend: the score range and what it means, shown on the card itself
    var band = function (name, range, lvl, bg, fg, text) {
      return '<tr><td style="padding:6px 8px;"><span style="display:inline-block; padding:3px 10px; border-radius:999px; font-weight:700; background:' + bg + '; color:' + fg + ';">' + name + '</span></td>' +
        '<td style="padding:6px 8px; font-weight:700; white-space:nowrap;">' + range + '</td><td style="padding:6px 8px; white-space:nowrap;">' + lvl + '</td><td style="padding:6px 8px;">' + text + '</td></tr>';
    };
    var legend = '<div style="margin:10px 14px 4px; border:1px solid #9FD3BB; border-radius:10px; padding:10px 12px; background:#F0F8F4;">' +
      '<div style="font-weight:800; margin-bottom:4px;">SCORE BANDS: what the score range means</div>' +
      '<p style="margin:0 0 6px; font-size:12.5px;">Score = 1 × % Beginner + 2 × % Proficient + 3 × % Advanced (range 100 to 300). It is shown as the Pre-Test score and the Term 1 score.</p>' +
      '<table style="width:100%; border-collapse:collapse; font-size:12.5px;"><thead><tr>' +
      '<th style="text-align:left; padding:6px 8px;">Band</th><th style="text-align:left; padding:6px 8px;">Score range</th><th style="text-align:left; padding:6px 8px;">Level</th><th style="text-align:left; padding:6px 8px;">What it means</th></tr></thead><tbody>' +
      band('Very Strong', '250 to 300', 'Advanced (A)', '#1B5E20', '#FFFFFF', 'Strong: secure at Advanced') +
      band('Strong', '200 to 249', 'Proficient (P)', '#A9D18E', '#1B5E20', 'Strong: secure at Proficient') +
      band('Developing', '150 to 199', 'Proficient (P)', '#FFD966', '#5D4037', 'Good progress, still developing') +
      band('Needs Intervention', 'below 150', 'Beginner (B)', '#F4A6A0', '#7F0000', 'Mostly Beginner: needs support') +
      '</tbody></table></div>';

    var secRemarks = section("sec-remarks", "2A", "AUTOMATED REMARKS (from this child's marks)", "", safeBody(function () { return remarksBody(R, data); }), true);
    var secCG = section("sec-cg", "2B", "CG-WISE COMPARISON (Pre-Test vs Term 1)", groupsNow.length + " curricular goals", safeBody(function () { return cgBody(groupsNow); }), true);
    return renumberSections('<div class="hpc-page">' + head + legend + studentGuideBox() + sec1 + sec2 + sec3 + sec4 + sec5 + secWeak + sec8 +
      '<div class="hpc-footer">⭐ EVERY CHILD · EVERY CHANCE · EVERY DAY</div></div>');
  }

  var api = { render: render };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HPCCard = api;
})(typeof window !== "undefined" ? window : globalThis);