/* Lumen Research sealed Case archive.
   Reads sealed Cases straight from LumenFindings by racing the public
   RPC endpoints in lab/config.js: verdicts, Findings, researchers, seal
   times, a claim ledger (filed / sealed unclaimed / claimed) and a line
   for the newest Finding. Only chain values are rendered; nothing is
   invented. Every DOM write is null-guarded and a failed read keeps the
   last good render. */
(function () {
  var CFG = window.LUMEN_CONFIG || {};
  var NFT = CFG.CONTRACT || "";
  var CLAIM = CFG.CLAIM || "";
  var RPCS = CFG.RPCS || [];
  var ZERO = "0x0000000000000000000000000000000000000000";

  var SEL = {
    genesisOpen: "0x14349d0c",
    currentExperiment: "0xf85ffaa3",
    totalSpecimens: "0xfc00816d",
    specimensInExperiment: "0xefb14faf",
    participantsOf: "0xe200c857",
    experimentEnd: "0x37e46fcd",
    totalClaimed: "0xd54ad2a1"
  };
  var RATES = { cold: "2,500", dev: "12,500", conf: "60,000" };
  var NAMES = { cold: "Cold Case", dev: "Developing", conf: "Confirmed" };
  var MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function isLive(a) { return /^0x[0-9a-fA-F]{40}$/.test(a || "") && a.toLowerCase() !== ZERO; }
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function padArg(n) { var h = n.toString(16); while (h.length < 64) h = "0" + h; return h; }
  function wordToInt(hex) { return parseInt(hex, 16); }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tweens = {};
  function setNum(id, to) {
    var el = $(id);
    if (!el) return;
    if (reduceMotion) { el.textContent = fmt(to); return; }
    var from = parseInt((el.textContent || "").replace(/[^0-9]/g, ""), 10);
    if (isNaN(from)) from = 0;
    if (from === to) { el.textContent = fmt(to); return; }
    if (tweens[id]) cancelAnimationFrame(tweens[id]);
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / 700);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) tweens[id] = requestAnimationFrame(step);
    }
    tweens[id] = requestAnimationFrame(step);
  }

  function rpcBatch(to, calls) {
    return new Promise(function (resolve) {
      var settled = false;
      var pending = RPCS.length;
      if (!pending || !isLive(to)) { resolve(null); return; }
      RPCS.forEach(function (url) {
        var ctl = ("AbortController" in window) ? new AbortController() : null;
        var timer = ctl ? setTimeout(function () { ctl.abort(); }, 5000) : null;
        var body = calls.map(function (c) {
          return { jsonrpc: "2.0", id: c.id, method: "eth_call", params: [{ to: to, data: c.data }, "latest"] };
        });
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctl ? ctl.signal : undefined
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (timer) clearTimeout(timer);
          if (settled || !j || !Array.isArray(j)) return;
          var out = {};
          var ok = true;
          calls.forEach(function (c) {
            var hit = null;
            for (var i = 0; i < j.length; i++) if (j[i].id === c.id) hit = j[i];
            if (!hit || !hit.result || hit.result === "0x") ok = false;
            else out[c.id] = hit.result;
          });
          if (ok) { settled = true; resolve(out); }
        }).catch(function () {
          if (timer) clearTimeout(timer);
        }).finally(function () {
          pending -= 1;
          if (!settled && pending === 0) resolve(null);
        });
      });
    });
  }

  function verdictKey(participants) {
    if (participants > 100) return "conf";
    if (participants >= 25) return "dev";
    return "cold";
  }
  function fmtSeal(ts) {
    var d = new Date(ts * 1000);
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return "Sealed " + d.getUTCDate() + " " + MONS[d.getUTCMonth()] + " · " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + " UTC";
  }

  var stampIO = null;
  function watchStamps() {
    var stamps = document.querySelectorAll(".acard:not(.stamp-watched)");
    if (!stamps.length) return;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      stamps.forEach(function (c) { c.classList.add("stamp-watched", "stamped"); });
      return;
    }
    if (!stampIO) {
      stampIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var card = en.target;
          var idx = parseInt(card.getAttribute("data-idx") || "0", 10);
          window.setTimeout(function () { card.classList.add("stamped"); }, idx * 130);
          stampIO.unobserve(card);
        });
      }, { threshold: 0.3 });
    }
    stamps.forEach(function (c) { c.classList.add("stamp-watched"); stampIO.observe(c); });
  }

  var lastTotal = 0;

  function render(data) {
    var grid = $("archive-grid");
    var note = $("a-note");
    setNum("a-total", data.total);
    setNum("a-claimed", data.claimed);
    setNum("a-unclaimed", Math.max(0, data.sealedTotal - data.claimed));

    var latest = $("d-latest");
    if (latest && data.total > 0) {
      latest.hidden = false;
      latest.textContent = "Newest Finding · Nº " + fmt(data.total) + " · filed into Case Nº " + fmt(data.cur);
      if (lastTotal && data.total > lastTotal && !reduceMotion) {
        latest.classList.remove("flash");
        void latest.offsetWidth;
        latest.classList.add("flash");
      }
    }
    lastTotal = data.total;

    if (!grid) return;
    if (!data.cases.length) {
      grid.innerHTML = "";
      if (note) note.textContent = "No sealed Cases yet. A first verdict lands at a three hour boundary.";
      return;
    }
    var subjects = window.LUMEN_SUBJECTS || {};
    var html = "";
    data.cases.forEach(function (c, i) {
      var key = verdictKey(c.participants);
      var subj = subjects[String(c.num)] || "Subject on file";
      html += '<article class="acard" data-verdict="' + key + '" data-idx="' + i + '">' +
        '<header><span class="acase">Case Nº ' + fmt(c.num) + '</span><span class="adate">' + fmtSeal(c.end) + '</span></header>' +
        '<div class="asubj">' + subj + '</div>' +
        '<div class="astats">' +
        '<div><b>' + fmt(c.findings) + '</b><span>Findings</span></div>' +
        '<div><b>' + fmt(c.participants) + '</b><span>Researchers</span></div>' +
        '<div><b>' + RATES[key] + '</b><span>$LUMEN / Finding</span></div>' +
        '</div>' +
        '<div class="stamp" aria-hidden="true">' + NAMES[key] + '</div>' +
        '</article>';
    });
    grid.innerHTML = html;
    if (note) {
      var last = data.cases[0];
      note.textContent = "Archive reads live from BNB Chain · latest seal Case Nº " + fmt(last.num) + ", " + NAMES[verdictKey(last.participants)] + " at " + RATES[verdictKey(last.participants)] + " $LUMEN per Finding.";
    }
    watchStamps();
  }

  function refresh() {
    if (!isLive(NFT)) return;
    rpcBatch(NFT, [
      { id: 1, data: SEL.genesisOpen },
      { id: 2, data: SEL.currentExperiment },
      { id: 3, data: SEL.totalSpecimens }
    ]).then(function (r) {
      if (!r) return null;
      var genesis = wordToInt(r[1]) === 1;
      var cur = wordToInt(r[2]);
      var total = wordToInt(r[3]);
      if (!genesis || cur < 1) return null;
      var from = Math.max(1, cur - 6);
      var calls = [{ id: 900, data: SEL.specimensInExperiment + padArg(cur) }];
      var nums = [];
      for (var n = from; n < cur; n++) {
        nums.push(n);
        calls.push({ id: 100 + n, data: SEL.specimensInExperiment + padArg(n) });
        calls.push({ id: 200 + n, data: SEL.participantsOf + padArg(n) });
        calls.push({ id: 300 + n, data: SEL.experimentEnd + padArg(n) });
      }
      return rpcBatch(NFT, calls).then(function (r2) {
        if (!r2) return null;
        var cases = nums.map(function (n) {
          return {
            num: n,
            findings: wordToInt(r2[100 + n]),
            participants: wordToInt(r2[200 + n]),
            end: wordToInt(r2[300 + n])
          };
        }).sort(function (a, b) { return b.num - a.num; });
        var sealedTotal = total - wordToInt(r2[900]);
        return rpcBatch(CLAIM, [{ id: 1, data: SEL.totalClaimed }]).then(function (r3) {
          return {
            cur: cur, total: total, cases: cases,
            sealedTotal: sealedTotal,
            claimed: r3 ? wordToInt(r3[1]) : 0
          };
        });
      });
    }).then(function (data) {
      if (data) render(data);
    }).catch(function () { /* keep last render */ });
  }

  refresh();
  setInterval(refresh, 60000);
})();
