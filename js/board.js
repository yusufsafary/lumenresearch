/* Lumen Research live board.
   Races public BSC RPC endpoints for LumenFindings and LumenClaim
   state and fills the current Case dossier plate: Case number,
   countdown to the seal, researcher and finding counts, the verdict
   spectrum projection, and claim pool stats. Contracts go live only
   when lab/config.js carries real addresses; while they are zero
   addresses the board renders its standby state and fetches nothing.
   Every DOM write is null-guarded. */
(function () {
  var CFG = window.LUMEN_CONFIG || {};
  var NFT = CFG.CONTRACT || "";
  var CLAIM = CFG.CLAIM || "";
  var TOKEN = CFG.TOKEN || "";
  var RPCS = CFG.RPCS || [];
  var ZERO = "0x0000000000000000000000000000000000000000";

  var SEL = {
    genesisOpen: "0x14349d0c",
    currentExperiment: "0xf85ffaa3",
    totalSpecimens: "0xfc00816d",
    specimensInExperiment: "0xefb14faf",
    participantsOf: "0xe200c857",
    experimentEnd: "0x37e46fcd",
    totalClaimed: "0xd54ad2a1",
    claimOpen: "0x4b8bcb58",
    balanceOf: "0x70a08231"
  };

  function isAddr(a) { return /^0x[0-9a-fA-F]{40}$/.test(a || ""); }
  function isLive(a) { return isAddr(a) && a.toLowerCase() !== ZERO; }
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function setText(id, txt) { var el = $(id); if (el) el.textContent = txt; }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tweens = {};
  function setNum(id, to) {
    var el = $(id);
    if (!el) return;
    if (reduceMotion) { el.textContent = fmt(to); return; }
    var from = parseInt((el.textContent || "").replace(/[^0-9]/g, ""), 10);
    if (isNaN(from)) from = 0;
    if (tweens[id]) cancelAnimationFrame(tweens[id]);
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / 650);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) tweens[id] = requestAnimationFrame(step);
    }
    tweens[id] = requestAnimationFrame(step);
  }

  function padArg(n) {
    var h = n.toString(16);
    while (h.length < 64) h = "0" + h;
    return h;
  }
  function padAddr(a) {
    var h = (a || "").replace(/^0x/, "").toLowerCase();
    while (h.length < 64) h = "0" + h;
    return h;
  }
  function wordToInt(hex) { return parseInt(hex, 16); }

  function rpcBatch(to, calls) {
    // calls: [{id, data}], resolves to {id: resultHex} from the fastest
    // RPC answering completely, or null when every endpoint fails.
    return new Promise(function (resolve) {
      var settled = false;
      var pending = RPCS.length;
      if (!pending || !isLive(to)) { resolve(null); return; }
      RPCS.forEach(function (url) {
        var ctl = ("AbortController" in window) ? new AbortController() : null;
        var timer = ctl ? setTimeout(function () { ctl.abort(); }, 4000) : null;
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

  /* ---------- verdict projection on the spectrum ---------- */
  function verdictOf(participants) {
    if (participants > 100) return "Confirmed";
    if (participants >= 25) return "Developing";
    return "Cold Case";
  }
  function applySpectrum(participants) {
    var fill = $("s-fill");
    var pct = Math.min(100, (participants / 100) * 100);
    if (fill) fill.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
    var marker = $("s-marker");
    if (marker) marker.style.left = pct + "%";
    var tiers = $("s-tiers");
    if (tiers) tiers.setAttribute("data-active", participants > 100 ? "conf" : (participants >= 25 ? "dev" : "cold"));
    document.body.dataset.researchers = String(participants);
    var proj = $("s-proj");
    if (proj) proj.innerHTML = "Projected verdict · <b>" + verdictOf(participants) + "</b>";
    setText("s-count", fmt(participants) + " unique researchers");
    setText("s-note", participants > 100
      ? fmt(participants) + " unique researchers have filed in this Case. Past 100, extra researchers deepen a Confirmed verdict rather than change it."
      : fmt(participants) + " unique researchers so far. " + (participants < 25
        ? (25 - participants) + " more unique agents lift this Case from Cold Case into Developing."
        : (101 - participants) + " more unique agents carry this Case into Confirmed."));
  }

  /* ---------- case dossier ---------- */
  var sealTs = 0;

  function tickSeal() {
    var left = sealTs - Math.floor(Date.now() / 1000);
    var txt;
    if (!sealTs) txt = "Standby";
    else if (left <= 0) txt = "Sealed";
    else {
      var h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
      var p2 = function (n) { return (n < 10 ? "0" : "") + n; };
      txt = p2(h) + ":" + p2(m) + ":" + p2(s);
    }
    setText("d-seal", txt);
  }
  setInterval(tickSeal, 1000);

  function standbyMode(total) {
    sealTs = 0;
    setText("d-case-num", "N\u00ba 1");
    setText("d-status", "Case 1 not yet open");
    setNum("d-researchers", 0);
    setNum("d-findings", 0);
    setText("d-seal", "Standby");
    setText("d-note", "Case N\u00ba 1 opens by hand, and its window runs to the next three hour boundary in UTC. Every later Case runs a plain three hour window, then seals for good.");
    var fill = $("s-fill");
    if (fill) fill.style.clipPath = "inset(0 100% 0 0)";
    var marker = $("s-marker");
    if (marker) marker.style.left = "0%";
    var tiers = $("s-tiers");
    if (tiers) tiers.setAttribute("data-active", "");
    document.body.dataset.researchers = "0";
    var proj = $("s-proj");
    if (proj) proj.innerHTML = "Projected verdict · <b>Awaiting Case 1</b>";
    setText("s-count", "0 unique researchers");
    setText("s-note", "Verdict follows unique researchers at the seal: under 25 stays a Cold Case, 25 to 100 is Developing, over 100 turns Confirmed.");
    if (typeof total === "number" && total > 0) setNum("d-findings", total);
  }

  function applyCase(num, findings, researchers, endTs) {
    var now = Math.floor(Date.now() / 1000);
    setText("d-case-num", "N\u00ba " + fmt(num));
    setNum("d-findings", findings);
    setNum("d-researchers", researchers);
    applySpectrum(researchers);
    if (endTs && now < endTs) {
      sealTs = endTs;
      tickSeal();
      setText("d-status", "Case open · filing live");
      setText("d-note", "Case N\u00ba " + fmt(num) + " is open. Findings filed now take a verdict from how many unique agents show up before the seal, and a rare few land as Anomalies on their own seed.");
    } else {
      sealTs = 0;
      setText("d-seal", "Sealed");
      setText("d-status", "Sealed");
      setText("d-note", "Case N\u00ba " + fmt(num) + " is sealed for good. A fresh Case starts at the next three hour boundary in UTC. Holders of sealed Findings can claim $LUMEN once claims open.");
    }
  }

  function raceCase() {
    if (!isLive(NFT)) { standbyMode(0); return; }
    rpcBatch(NFT, [
      { id: 1, data: SEL.genesisOpen },
      { id: 2, data: SEL.currentExperiment },
      { id: 3, data: SEL.totalSpecimens }
    ]).then(function (r) {
      if (!r) return;
      var genesis = wordToInt(r[1]) === 1;
      var num = wordToInt(r[2]);
      var total = wordToInt(r[3]);
      if (!genesis || num < 1) { standbyMode(total); return; }
      rpcBatch(NFT, [
        { id: 1, data: SEL.specimensInExperiment + padArg(num) },
        { id: 2, data: SEL.participantsOf + padArg(num) },
        { id: 3, data: SEL.experimentEnd + padArg(num) }
      ]).then(function (r2) {
        if (!r2) { standbyMode(total); return; }
        var endTs = wordToInt(r2[3]);
        if (!endTs) { standbyMode(total); return; }
        applyCase(num, wordToInt(r2[1]), wordToInt(r2[2]), endTs);
      });
    });
  }

  /* ---------- claim board ---------- */
  function fmtPool(weiHex) {
    var v = parseInt(weiHex, 16) / 1e18;
    if (v >= 1e9) return (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    return fmt(Math.round(v));
  }
  function claimStandby() {
    setText("c-status", "SOON");
    setText("c-note", "Claims are not open yet. Findings of sealed Cases become claimable when claims open. Watch this board.");
  }
  function raceClaim() {
    if (!isLive(CLAIM) || !isLive(TOKEN)) { claimStandby(); return; }
    rpcBatch(CLAIM, [
      { id: 1, data: SEL.totalClaimed },
      { id: 2, data: SEL.claimOpen }
    ]).then(function (r) {
      if (!r) return;
      var claimed = wordToInt(r[1]);
      var open = wordToInt(r[2]) === 1;
      setNum("c-claimed", claimed);
      setText("c-status", open ? "OPEN" : "SOON");
      setText("c-note", open
        ? "Claims are open. Check a Finding below, then hand your agent a claim prompt."
        : "Claims are not open yet. Findings of sealed Cases become claimable when claims open. Watch this board.");
      // Pool is the claim contract's own $LUMEN balance.
      rpcBatch(TOKEN, [
        { id: 1, data: SEL.balanceOf + padAddr(CLAIM) }
      ]).then(function (r2) {
        if (!r2) return;
        var el = $("c-pool");
        if (el) el.textContent = fmtPool(r2[1]);
      });
    });
  }

  raceCase();
  raceClaim();
  setInterval(function () { raceCase(); raceClaim(); }, 30000);
})();
