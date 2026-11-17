/*
 * school-report.js — Class / School performance analysis (the "School_Report"
 * sheet). Needs js/hpc-master.js (window.HPC) and js/hpc-card.css for styling.
 *
 * HPCSchool.render({
 *   schoolName, className, academicYear, termLabel,
 *   cohort: [ { pre: {"C-1.1":"B"|"P"|"A",...}, term: {"C-1.1":"B"|"P"|"A",...} }, ... ]  // one entry per child
 * })
 * Each child × competency with a level counts as one observation (30 × 60 = 1800 in the workbook).
 * Levels are B / P / A only. Children are never ranked: CGs are shown as they are, without a rank column.
 */
(function (root) {
  "use strict";
  var H = root.HPC;
  if (!H) throw new Error("school-report.js needs js/hpc-master.js loaded first.");

  var RANK = { B: 1, P: 2, A: 3 };
  var LVC = { B: { bg: "#FCE3E1", fg: "#9B1C1C" }, P: { bg: "#FFF1CC", fg: "#7A5300" }, A: { bg: "#DDF2E5", fg: "#1E6B46" } };
  var BANDC = {
    "Very Strong": { bg: "#1B5E20", fg: "#FFFFFF" }, "Strong": { bg: "#A9D18E", fg: "#1B5E20" },
    "Developing": { bg: "#FFD966", fg: "#5D4037" }, "Needs Intervention": { bg: "#F4A6A0", fg: "#7F0000" }
  };
  var THRESH = { achieved: 0.7, readyHigh: 0.8, readyMod: 0.6, convHigh: 0.8, convMod: 0.4 };
  var ALL_IDS = Object.keys(H.competencies).sort(function (a, b) {
    if (a[0] !== b[0]) return a[0] === "V" ? 1 : (b[0] === "V" ? -1 : 0);
    var pa = a.replace(/[^0-9.]/g, "").split(".").map(Number), pb = b.replace(/[^0-9.]/g, "").split(".").map(Number);
    return (pa[0] - pb[0]) || (pa[1] - pb[1]);
  });

  function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function pct(x) { return x === null || x === undefined || isNaN(x) ? "–" : Math.round(x * 1000) / 10 + "%"; }
  function p1(x) { return x === null || x === undefined || isNaN(x) ? "–" : (Math.round(x * 1000) / 10).toFixed(1) + "%"; }
  function n0(x) { return x === null || x === undefined || isNaN(x) ? "–" : String(Math.round(x)); }
  function sgn(x) { return x === null || x === undefined || isNaN(x) ? "–" : (x >= 0 ? "+" : "") + x.toFixed(1); }
  function lvl(l) { return RANK[l] ? '<span class="hpc-lvl" style="background:' + LVC[l].bg + ';color:' + LVC[l].fg + '">' + l + "</span>" : '<span class="hpc-na">–</span>'; }
  function band(b) { return b && BANDC[b] ? '<span class="hpc-band" style="background:' + BANDC[b].bg + ';color:' + BANDC[b].fg + '">' + esc(b) + "</span>" : '<span class="hpc-na">–</span>'; }
  function bandOf(sc) { return sc === null ? null : H.band(sc); }
  function arrowCell(d) {
    if (d === null || isNaN(d)) return '<span class="hpc-na">–</span>';
    return d > 0 ? '<b class="hpc-up">↑</b>' : d < 0 ? '<b class="hpc-down">↓</b>' : '<b class="hpc-same">→</b>';
  }

  // ---------- counting ----------
  function emptyC() { return { B: 0, P: 0, A: 0, n: 0 }; }
  function add(c, l) { if (RANK[l]) { c[l]++; c.n++; } return c; }
  function scoreC(c) { return c.n ? 100 * (1 * c.B + 2 * c.P + 3 * c.A) / c.n : null; }
  function pa(c) { return c.n ? (c.P + c.A) / c.n : null; }
  function share(c, k) { return c.n ? c[k] / c.n : null; }

  function build(data) {
    var coh = data.cohort || [];
    var kids = coh.length;
    var all = { pre: emptyC(), term: emptyC() };
    var byCG = {}, byDom = {}, byPar = {}, byKos = {};
    var paired = { n: 0, up: 0, same: 0, down: 0, bToPA: 0, bPre: 0, pToA: 0, pPre: 0 };
    var domPaired = {}, parPaired = {};
    var childrenTerm = 0, childrenPre = 0;
    var compTerm = {};   // id -> emptyC for achieved count

    function bucket(map, key) { return map[key] || (map[key] = { pre: emptyC(), term: emptyC(), ids: {} }); }

    ALL_IDS.forEach(function (id) { compTerm[id] = emptyC(); });
    coh.forEach(function (child) {
      var pre = child.pre || {}, term = child.term || {};
      if (Object.keys(term).some(function (k) { return RANK[term[k]]; })) childrenTerm++;
      if (Object.keys(pre).some(function (k) { return RANK[pre[k]]; })) childrenPre++;
      ALL_IDS.forEach(function (id) {
        var i = H.info(id), p = pre[id], t = term[id];
        if (RANK[p]) add(all.pre, p);
        if (RANK[t]) { add(all.term, t); add(compTerm[id], t); }
        var cg = bucket(byCG, i.cg || "other"), dm = bucket(byDom, i.domain || "other"), pr = bucket(byPar, i.param || "other"), ko = bucket(byKos, i.kosha || "other");
        [cg, dm, pr, ko].forEach(function (b) { if (RANK[p]) add(b.pre, p); if (RANK[t]) add(b.term, t); });
        if (RANK[p] && RANK[t]) {
          paired.n++;
          if (RANK[t] > RANK[p]) paired.up++; else if (RANK[t] === RANK[p]) paired.same++; else paired.down++;
          if (p === "B") { paired.bPre++; if (t === "P" || t === "A") paired.bToPA++; }
          if (p === "P") { paired.pPre++; if (t === "A") paired.pToA++; }
          var d = domPaired[i.domain] || (domPaired[i.domain] = { n: 0, up: 0, same: 0, down: 0, bPre: 0, bToPA: 0, pPre: 0, pToA: 0 });
          d.n++; if (RANK[t] > RANK[p]) d.up++; else if (RANK[t] === RANK[p]) d.same++; else d.down++;
          if (p === "B") { d.bPre++; if (t === "P" || t === "A") d.bToPA++; }
          if (p === "P") { d.pPre++; if (t === "A") d.pToA++; }
        }
      });
    });

    // ---- key metrics ----
    var domScores = Object.keys(byDom).filter(function (k) { return k !== "other"; }).map(function (k) { return scoreC(byDom[k].term); }).filter(function (x) { return x !== null; });
    var cpi = domScores.length ? domScores.reduce(function (a, b) { return a + b; }, 0) / domScores.length : null;
    var achieved = ALL_IDS.filter(function (id) { return compTerm[id].n && pa(compTerm[id]) >= THRESH.achieved; }).length;
    var withTerm = ALL_IDS.filter(function (id) { return compTerm[id].n; }).length;
    var sri = pa(all.term), readyLbl = sri === null ? "" : sri >= THRESH.readyHigh ? "High Readiness" : sri >= THRESH.readyMod ? "Moderate Readiness" : "Low Readiness";
    var conv = paired.bPre ? paired.bToPA / paired.bPre : null;
    var convLbl = conv === null ? "" : conv >= THRESH.convHigh ? "High" : conv >= THRESH.convMod ? "Moderate" : "Low";
    var ratio = all.term.B ? (all.term.P + all.term.A) / all.term.B : null;

    return { kids: kids, childrenTerm: childrenTerm, childrenPre: childrenPre, all: all, byCG: byCG, byDom: byDom, byPar: byPar, byKos: byKos,
             paired: paired, domPaired: domPaired, cpi: cpi, achieved: achieved, withTerm: withTerm, sri: sri, readyLbl: readyLbl,
             conv: conv, convLbl: convLbl, ratio: ratio, data: data, compTerm: compTerm };
  }

  // ---------- key metric cards ----------
  function tile(label, value, sub, color) {
    return '<div class="hpc-sum"><div class="hpc-sum-l">' + esc(label) + '</div><div class="hpc-sum-v" style="color:' + (color || "#0f6e56") + '">' + value +
      '</div><div class="hpc-sum-s">' + sub + "</div></div>";
  }
  function keyMetrics(R) {
    var t = R.all.term, p = R.all.pre, tot = t.n;
    var dist = tot ? Math.round(share(t, "B") * 100) + "% B | " + Math.round(share(t, "P") * 100) + "% P | " + Math.round(share(t, "A") * 100) + "% A" : "–";
    var row1 = [
      tile("🎓 Student Readiness Indicator", pct(R.sri), esc(R.readyLbl)),
      tile("🔄 B → P/A Conversion", pct(R.conv), esc("Learning improvement – " + (R.convLbl || "–"))),
      tile("📊 Class Performance Index", n0(R.cpi), esc(bandOf(R.cpi) ? bandOf(R.cpi) + " (avg of " + Object.keys(R.byDom).filter(function (k) { return k !== "other"; }).length + " domains)" : "")),
      tile("🟢 Distribution (Term)", '<span style="font-size:15px">' + dist + "</span>", "Beginner | Proficient | Advanced"),
      tile("🎯 Achievement Rate", pct(R.withTerm ? R.achieved / R.withTerm : null), R.achieved + " of " + R.withTerm + " competencies achieved (≥ 70% at P or A)")
    ].join("");
    var row2 = [
      tile("👧 Children assessed", R.childrenTerm, "Pre-Test: " + R.childrenPre + " | Obs: " + tot),
      tile("📈 Overall Proficiency (P+A)", pct(R.sri), "was " + pct(pa(p)) + " at Pre-Test"),
      tile("⭐ Advanced (A) share", pct(share(t, "A")), "was " + pct(share(p, "A")) + " at Pre-Test"),
      tile("⬆ Upward movement", pct(R.paired.n ? R.paired.up / R.paired.n : null), "of paired obs; " + pct(R.paired.n ? R.paired.down / R.paired.n : null) + " slipped"),
      tile("⚖ (P+A) / B ratio", R.ratio === null ? "–" : R.ratio.toFixed(2), R.ratio === null ? "" : (R.ratio > 1 ? "Strong (>1 = strong)" : "Needs improvement (<1)"))
    ].join("");
    return '<div class="hpc-sumgrid hpc-five">' + row1 + '</div><div class="hpc-sumgrid hpc-five" style="margin-top:10px">' + row2 + "</div>";
  }

  // ---------- CG table (no rank column, as agreed) ----------
  function cgTable(R) {
    var cgs = Object.keys(R.byCG).filter(function (k) { return k !== "other"; }).sort(function (a, b) {
      var na = parseInt(a.replace(/\D/g, "")) || 99, nb = parseInt(b.replace(/\D/g, "")) || 99; return na - nb; });
    var rows = cgs.map(function (k) {
      var b = R.byCG[k], pr = b.pre, tm = b.term, move = pa(tm) !== null && pa(pr) !== null ? pa(tm) - pa(pr) : null;
      var name = (ALL_IDS.map(function (id) { return H.info(id); }).filter(function (i) { return i.cg === k; })[0] || {}).cgName || k;
      return "<tr><td><b>" + esc(k) + "</b></td><td class=\"l\">" + esc(name) + "</td><td>" + pct(share(pr, "B")) + "</td><td>" + pct(share(pr, "P")) + "</td><td>" + pct(share(pr, "A")) +
        "</td><td>" + pct(share(tm, "B")) + "</td><td>" + pct(share(tm, "P")) + "</td><td>" + pct(share(tm, "A")) + "</td><td>" + pct(pa(pr)) + "</td><td><b>" + pct(pa(tm)) +
        "</b></td><td>" + (move === null ? "–" : sgn(move * 100)) + "</td><td>" + arrowCell(move) + "</td></tr>";
    }).join("");
    var o = R.all;
    var over = "<tr class=\"hpc-total-row\"><td><b>OVERALL</b></td><td class=\"l\"><b>All competencies</b></td><td>" + pct(share(o.pre, "B")) + "</td><td>" + pct(share(o.pre, "P")) + "</td><td>" + pct(share(o.pre, "A")) +
      "</td><td>" + pct(share(o.term, "B")) + "</td><td>" + pct(share(o.term, "P")) + "</td><td>" + pct(share(o.term, "A")) + "</td><td>" + pct(pa(o.pre)) + "</td><td><b>" + pct(pa(o.term)) +
      "</b></td><td>" + sgn((pa(o.term) - pa(o.pre)) * 100) + "</td><td>" + arrowCell(pa(o.term) - pa(o.pre)) + "</td></tr>";
    return '<div class="hpc-tablewrap"><table class="hpc-t hpc-school-t"><thead><tr><th>CG</th><th class="l">Curricular Goal</th><th>%B Pre</th><th>%P Pre</th><th>%A Pre</th><th>%B Term</th><th>%P Term</th><th>%A Term</th><th>%P+A Pre</th><th>%P+A Term</th><th>Progress pp</th><th>Move</th></tr></thead><tbody>' +
      rows + over + "</tbody></table></div>";
  }

  // ---------- domain distribution + domain movement ----------
  function domainTable(R) {
    var doms = Object.keys(H.domains).sort();
    var rows = doms.map(function (k) {
      var b = R.byDom[k]; if (!b) return "";
      var t = b.term, p = b.pre, comps = ALL_IDS.filter(function (id) { return H.info(id).domain === k; }).length;
      var dom = share(t, "A") >= share(t, "P") && share(t, "A") >= share(t, "B") ? "Advanced" : share(t, "P") >= share(t, "B") ? "Proficient" : "Beginner";
      return "<tr><td class=\"l\"><b>" + esc(H.domains[k].name) + "</b></td><td>" + comps + "</td><td>" + t.n + "</td><td>" + pct(share(t, "B")) + "</td><td>" + pct(share(t, "P")) + "</td><td>" + pct(share(t, "A")) +
        "</td><td>" + pct(pa(p)) + "</td><td><b>" + pct(pa(t)) + "</b></td><td>" + esc(dom) + "</td><td>" + band(bandOf(scoreC(t))) + "</td></tr>";
    }).join("");
    var o = R.all.term;
    rows += "<tr class=\"hpc-total-row\"><td class=\"l\"><b>OVERALL</b></td><td>" + ALL_IDS.length + "</td><td>" + o.n + "</td><td>" + pct(share(o, "B")) + "</td><td>" + pct(share(o, "P")) + "</td><td>" + pct(share(o, "A")) +
      "</td><td>" + pct(pa(R.all.pre)) + "</td><td><b>" + pct(pa(o)) + "</b></td><td></td><td>" + band(bandOf(scoreC(o))) + "</td></tr>";
    return '<table class="hpc-t hpc-school-t"><thead><tr><th class="l">Domain</th><th>Comps</th><th>Obs</th><th>% Beginner</th><th>% Proficient</th><th>% Advanced</th><th>% P+A Pre</th><th>% P+A Term</th><th>Dominant level</th><th>Band</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function movementTable(R) {
    var doms = Object.keys(H.domains).sort();
    var rows = doms.map(function (k) {
      var d = R.domPaired[k]; if (!d) return "";
      var up = d.n ? d.up / d.n : null, bp = d.bPre ? d.bToPA / d.bPre : null, pa2 = d.pPre ? d.pToA / d.pPre : null;
      var b = R.byDom[k], ch = scoreC(b.term) !== null && scoreC(b.pre) !== null ? scoreC(b.term) - scoreC(b.pre) : null;
      var cv = bp === null ? "" : bp >= THRESH.convHigh ? "High" : bp >= THRESH.convMod ? "Moderate" : "Low";
      return "<tr><td class=\"l\"><b>" + esc(H.domains[k].name) + "</b></td><td>" + d.n + "</td><td>" + d.up + "</td><td>" + d.same + "</td><td>" + d.down + "</td><td>" + pct(up) + "</td><td>" + pct(bp) + "</td><td>" + pct(pa2) +
        "</td><td>" + sgn(ch) + "</td><td>" + arrowCell(ch) + "</td><td>" + esc(cv) + "</td></tr>";
    }).join("");
    var p = R.paired;
    rows += "<tr class=\"hpc-total-row\"><td class=\"l\"><b>OVERALL</b></td><td>" + p.n + "</td><td>" + p.up + "</td><td>" + p.same + "</td><td>" + p.down + "</td><td>" + pct(p.n ? p.up / p.n : null) + "</td><td>" + pct(R.conv) + "</td><td>" + pct(p.pPre ? p.pToA / p.pPre : null) + "</td><td></td><td></td><td>" + esc(R.convLbl) + "</td></tr>";
    return '<table class="hpc-t hpc-school-t"><thead><tr><th class="l">Domain</th><th>Paired obs</th><th>↑ Up</th><th>→ Same</th><th>↓ Down</th><th>Upward %</th><th>B→P/A %</th><th>P→A %</th><th>Score change</th><th>Move</th><th>Conversion band</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  // ---------- essential combinations (HPC parameters) ----------
  function paramTable(R) {
    var rows = Object.keys(H.params).map(function (p) {
      var b = R.byPar[p]; if (!b) return "";
      var info = H.params[p], dom = H.domains[info.domain] ? H.domains[info.domain].short : "";
      var cgs = ALL_IDS.filter(function (id) { return H.info(id).param === p; }).map(function (id) { return H.info(id).cg; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(", ");
      var sp = scoreC(b.pre), st = scoreC(b.term);
      var conv = b.pre.B ? (function () { return null; })() : null;
      return "<tr><td class=\"l\">" + esc(dom) + "</td><td class=\"l\"><b>" + esc(p + " " + info.name) + "</b></td><td>" + esc(cgs) + "</td><td>" + pct(share(b.term, "B")) + "</td><td>" + pct(share(b.term, "P")) +
        "</td><td>" + pct(share(b.term, "A")) + "</td><td>" + pct(pa(b.pre)) + "</td><td><b>" + pct(pa(b.term)) + "</b></td><td>" + n0(sp) + "</td><td><b>" + n0(st) + "</b></td><td>" + band(bandOf(st)) + "</td></tr>";
    }).join("");
    return '<table class="hpc-t hpc-school-t"><thead><tr><th class="l">Domain</th><th class="l">Essential combination</th><th>CG align</th><th>%B Term</th><th>%P Term</th><th>%A Term</th><th>%P+A Pre</th><th>%P+A Term</th><th>Score Pre</th><th>Score Term</th><th>Band</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  // ---------- top and bottom CGs ----------
  function topBottom(R) {
    var list = Object.keys(R.byCG).filter(function (k) { return k !== "other" && scoreC(R.byCG[k].term) !== null; }).map(function (k) {
      var name = (ALL_IDS.map(function (id) { return H.info(id); }).filter(function (i) { return i.cg === k; })[0] || {}).cgName || k;
      return { k: k, name: name, s: scoreC(R.byCG[k].term) };
    }).sort(function (a, b) { return b.s - a.s; });
    var top = list.slice(0, 3), bot = list.slice(-3).reverse();
    function li(x, i) { return "<li>" + (i + 1) + ". " + esc(x.k) + " " + esc(x.name) + " – <b>" + x.s.toFixed(1) + "</b></li>"; }
    return '<div class="hpc-two"><div><b>🏆 Top 3 performing CGs (Term score)</b><ol class="hpc-list">' + top.map(li).join("") + '</ol></div>' +
      '<div><b>🔴 Bottom 3 CGs needing intervention</b><ol class="hpc-list">' + bot.map(li).join("") + "</ol></div></div>";
  }

  // ---------- the report ----------
  // Score bands legend and column guide, shown on the class report itself
  function bandRow(name, range, lvl, bg, fg, text) {
    return '<tr><td style="padding:6px 8px;"><span style="display:inline-block; padding:3px 10px; border-radius:999px; font-weight:700; background:' + bg + '; color:' + fg + ';">' + name + '</span></td>' +
      '<td style="padding:6px 8px; font-weight:700; white-space:nowrap;">' + range + '</td><td style="padding:6px 8px; white-space:nowrap;">' + lvl + '</td><td style="padding:6px 8px;">' + text + '</td></tr>';
  }
  function guideBox() {
    var legend = '<div style="margin:10px 14px 4px; border:1px solid #9FD3BB; border-radius:10px; padding:10px 12px; background:#F0F8F4;">' +
      '<div style="font-weight:800; margin-bottom:4px;">SCORE BANDS: what the score range means</div>' +
      '<p style="margin:0 0 6px; font-size:12.5px;">Score = 1 × % Beginner + 2 × % Proficient + 3 × % Advanced (range 100 to 300). The bands below are used for each domain and for the class.</p>' +
      '<table style="width:100%; border-collapse:collapse; font-size:12.5px;"><thead><tr>' +
      '<th style="text-align:left; padding:6px 8px;">Band</th><th style="text-align:left; padding:6px 8px;">Score range</th><th style="text-align:left; padding:6px 8px;">Level</th><th style="text-align:left; padding:6px 8px;">What it means</th></tr></thead><tbody>' +
      bandRow('Very Strong', '250 to 300', 'Advanced (A)', '#1B5E20', '#FFFFFF', 'Strong: secure at Advanced') +
      bandRow('Strong', '200 to 249', 'Proficient (P)', '#A9D18E', '#1B5E20', 'Strong: secure at Proficient') +
      bandRow('Developing', '150 to 199', 'Proficient (P)', '#FFD966', '#5D4037', 'Good progress, still developing') +
      bandRow('Needs Intervention', 'below 150', 'Beginner (B)', '#F4A6A0', '#7F0000', 'Mostly Beginner: needs support') +
      '</tbody></table></div>';
    var terms = [
      ['CG', 'Curricular Goal, the goal a competency belongs to (CG-1 to CG-13).'],
      ['C-x.y', 'A competency code: CG number, then the competency number (for example C-7.1).'],
      ['COMPS', 'Number of competencies in that row (for a domain, all its competencies).'],
      ['OBS', 'Number of observations: each child\u2019s mark on each competency counts once.'],
      ['%B / %P / %A', 'Share of observations at Beginner, Proficient or Advanced.'],
      ['Pre / Term', 'Pre = the Pre-Test (on joining). Term = Term 1 (end of term).'],
      ['%P+A', 'Share of observations at Proficient or Advanced (the readiness share).'],
      ['PROGRESS PP', 'Change in %P+A from Pre-Test to Term, in percentage points (Term %P+A minus Pre %P+A).'],
      ['MOVE', '↑ improved, → stable, ↓ declined, comparing Pre-Test and Term 1.'],
      ['Band', 'The score band from the table above (Very Strong, Strong, Developing, Needs Intervention).'],
      ['Dominant level', 'The level (B, P or A) that most observations fall in.'],
      ['SRI', 'Student Readiness Indicator: the share of observations at P or A (High 80% and above, Moderate 60 to 79%).'],
      ['CPI', 'Class Performance Index: the average of the six domain scores (100 to 300).'],
      ['Achievement rate', 'Competencies where at least 70% of children are at P or A, out of all competencies assessed.'],
      ['(P+A) / B ratio', 'Proficient plus Advanced observations divided by Beginner observations. Above 1 is strong.']
    ];
    var rows = terms.map(function (t) { return '<tr><td style="padding:5px 8px; font-weight:700; white-space:nowrap; vertical-align:top;">' + t[0] + '</td><td style="padding:5px 8px;">' + t[1] + '</td></tr>'; }).join('');
    var guide = '<div style="margin:6px 14px 4px; border:1px solid #C9D6CF; border-radius:10px; padding:10px 12px; background:#FBFCFB;">' +
      '<div style="font-weight:800; margin-bottom:4px;">COLUMN GUIDE: what each short name means</div>' +
      '<table style="width:100%; border-collapse:collapse; font-size:12.5px;"><tbody>' + rows + '</tbody></table></div>';
    return legend + guide;
  }
  function render(data) {
    var R = build(data), d = data || {};
    var title = esc(d.schoolName || "School") + "  |  " + esc(d.className || "") + "  |  " + esc(d.academicYear || "");
    var head = '<div class="hpc-banner"><div class="hpc-title">' + title + '</div>' +
      '<div class="hpc-sub2">HOLISTIC PROGRESS CARD – CLASS / SCHOOL PERFORMANCE ANALYSIS</div>' +
      '<div class="hpc-sub3">B = Beginner | P = Proficient | A = Advanced  •  ' + esc(d.termLabel || "Pre-Test → Term 1") + '  •  6 Domains • 13 CGs • Panchakosha  •  NEP 2020 / NCF-FS</div></div>';
    function sec(id, num, title, summary, body, open) {
      return '<section class="hpc-sec' + (open ? " hpc-open" : "") + '" id="' + id + '"><div class="hpc-sec-head" role="button" tabindex="0" ' +
        'onclick="this.parentNode.classList.toggle(\'hpc-open\')" onkeydown="if(event.key===\'Enter\')this.parentNode.classList.toggle(\'hpc-open\')">' +
        '<span class="hpc-sec-t">' + num + " · " + esc(title) + '</span><span class="hpc-sec-sum">' + summary + '</span>' +
        '<span class="hpc-hint"><span class="hpc-h-open">click to open ▾</span><span class="hpc-h-close">click to close ▴</span></span></div>' +
        '<div class="hpc-sec-body">' + body + "</div></section>";
    }
    return '<div class="hpc-page">' + head + guideBox() +
      sec("school-k", "", "KEY METRICS (auto-calculated)", "", keyMetrics(R), true) +
      sec("school-1", 1, "CG-WISE B / P / A ANALYSIS (Pre-Test vs Term 1)", R.kids + " children", '<p class="hpc-cap">Each Curricular Goal tracked separately (% of observations). Movement: ↑ improvement | → stable | ↓ decline <br><b>Columns:</b> %B / %P / %A PRE = share of observations at Beginner, Proficient, Advanced in the Pre-Test; the TERM columns do the same for Term 1. %P+A PRE and %P+A TERM = share at Proficient or Advanced. <b>PROGRESS PP</b> = %P+A TERM minus %P+A PRE, in percentage points (a rise of +50 means 50 more points of observations at P or A). <b>MOVE</b> = ↑ improved, → stable, ↓ declined, comparing Pre-Test and Term 1..</p>' + cgTable(R) + topBottom(R), false) +
      sec("school-2", 2, "DOMAIN-WISE DISTRIBUTION (6 domains)", "", domainTable(R), false) +
      sec("school-3", 3, "DOMAIN-WISE (B → P → A) MOVEMENT", "", '<p class="hpc-cap">Paired = same child and competency assessed in both rounds. Up = moved at least one level.</p>' + movementTable(R), false) +
      sec("school-4", 4, "ESSENTIAL COMBINATIONS (HPC parameters)", "", paramTable(R), false) +
      '<div class="hpc-footer">⭐ EVERY CHILD · EVERY CHANCE · EVERY DAY</div></div>';
  }

  root.HPCSchool = { render: render, build: build };
  if (typeof module !== "undefined" && module.exports) module.exports = root.HPCSchool;
})(typeof window !== "undefined" ? window : globalThis);
