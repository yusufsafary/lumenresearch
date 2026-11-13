/* Lumen Research page behaviour: copy buttons, UTC clock, footer year,
   contract address fill from lab/config.js, finding price calculator,
   reveal on scroll. Every lookup is null-guarded. Zero placeholder
   addresses never become BscScan links or swap targets. */
(function () {
  function $(id) { return document.getElementById(id); }
  var CFG = window.LUMEN_CONFIG || {};
  var ZERO = "0x0000000000000000000000000000000000000000";
  function isLive(a) { return /^0x[0-9a-fA-F]{40}$/.test(a || "") && a.toLowerCase() !== ZERO; }

  /* Fill contract addresses from config so one edit updates every page.
     Anchors with data-addr-link become BscScan links only when the
     address is a real deployed one. */
  var ADDRS = {
    nft: CFG.CONTRACT,
    token: CFG.TOKEN,
    claim: CFG.CLAIM,
    registry: CFG.AGENT_ID_REGISTRY,
    wallet: CFG.PROJECT_WALLET
  };
  Object.keys(ADDRS).forEach(function (key) {
    var val = ADDRS[key];
    if (!val) return;
    document.querySelectorAll('[data-addr="' + key + '"]').forEach(function (el) {
      el.textContent = val;
    });
    if (isLive(val)) {
      document.querySelectorAll('[data-addr-link="' + key + '"]').forEach(function (el) {
        el.setAttribute("href", "https://bscscan.com/address/" + val);
      });
    }
  });

  function wireCopy(btnId, srcId, label) {
    var btn = $(btnId), src = $(srcId);
    if (!btn || !src) return;
    btn.addEventListener("click", function () {
      var t = src.textContent;
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(t);
        else {
          var ta = document.createElement("textarea");
          ta.value = t; document.body.appendChild(ta); ta.select();
          document.execCommand("copy"); ta.remove();
        }
      } catch (err) { /* clipboard unavailable */ }
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = label; }, 1600);
    });
  }
  wireCopy("copy-prompt", "agent-prompt", "Copy prompt");
  wireCopy("copy-prompt-claim", "claim-prompt", "Copy prompt");
  wireCopy("copy-token", "token-addr", "Copy address");

  /* Swap buttons: prefilled with the $LUMEN address once it is a real
     deployed address; inert while config still holds a placeholder. */
  document.querySelectorAll("[data-swap]").forEach(function (a) {
    var base = a.getAttribute("data-swap");
    if (base && isLive(CFG.TOKEN || "")) {
      a.setAttribute("href", base + CFG.TOKEN);
    } else {
      a.setAttribute("href", "#");
      a.setAttribute("aria-disabled", "true");
    }
  });

  /* Finding price calculator (index only) */
  var range = $("calc-range"), cN = $("calc-n"), cRows = $("calc-rows"),
      cTotal = $("calc-total"), cNote = $("calc-note");
  function priceOf(copyNo) {
    if (copyNo <= 1) return 0;
    if (copyNo <= 5) return 0.0002;
    return 0.0004;
  }
  function renderCalc() {
    if (!range || !cN) return;
    var n = parseInt(range.value, 10) || 1;
    cN.textContent = n;
    var parts = [], total = 0;
    for (var i = 1; i <= n; i++) {
      var p = priceOf(i);
      total += p;
      parts.push(p === 0 ? "FREE" : p.toFixed(4));
    }
    if (cRows) cRows.textContent = parts.join(" + ");
    if (cTotal) cTotal.textContent = total.toFixed(4) + " BNB";
    if (cNote) cNote.textContent = n >= 10
      ? "Ten Findings is a wallet's full desk for one Case. The next Case, three hours later, resets the allowance."
      : "Your first Finding of each Case is free with an Agent ID.";
  }
  if (range) { range.addEventListener("input", renderCalc); renderCalc(); }

  /* Live UTC clock in the utility strip */
  var clock = $("utc-clock");
  if (clock) {
    var DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    var MONS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var tickClock = function () {
      var d = new Date();
      clock.textContent = DAYS[d.getUTCDay()] + " " + pad(d.getUTCDate()) + " " + MONS[d.getUTCMonth()] + " " + d.getUTCFullYear() +
        " · " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + " UTC";
    };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* Footer year */
  var yr = $("year");
  if (yr) yr.textContent = new Date().getUTCFullYear();

  if ("IntersectionObserver" in window) {
    var rvEls = document.querySelectorAll(".sec, .dossier, .plate, .panel, .lcard, .swap-card, .tok-row, .tbl-wrap, .doc > h2, .doc > h3");
    var rvIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); rvIO.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
    rvEls.forEach(function (el) { el.classList.add("rv"); rvIO.observe(el); });
  }
})();

/* Nav shadow once the page scrolls */
(function () {
  function onScroll() { document.body.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
