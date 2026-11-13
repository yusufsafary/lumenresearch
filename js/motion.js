/* Lumen Research motion layer: scroll spectrum, seal ring, dossier tilt.
   Self-contained and null-guarded; board.js and claim.js stay untouched. */
(function () {
  "use strict";
  var CFG = window.LUMEN_CONFIG || {};
  var RPCS = CFG.RPCS || ["https://bsc-dataseed.binance.org"];
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- scroll spectrum progress ---- */
  var bar = document.getElementById("scrollbar-x");
  if (bar && !reduced) {
    var ticking = false;
    function paint() {
      ticking = false;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, p)).toFixed(4) + ")";
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  /* ---- seal ring: live window progress from chain ---- */
  var arc = document.getElementById("ring-arc");
  var label = document.getElementById("ring-time");
  var ring = document.getElementById("sealring");
  if (arc && label && CFG.CONTRACT) {
    var C = 2 * Math.PI * 40;
    arc.style.strokeDasharray = String(C);
    arc.style.strokeDashoffset = String(C);
    var SEL = { open: "0x14349d0c", cur: "0xf85ffaa3", end: "0x37e46fcd" };
    function encUint(n) { return n.toString(16).padStart(64, "0"); }
    function call(data) {
      var jobs = RPCS.map(function (url) {
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, 6000);
        return fetch(url, {
          method: "POST", signal: ctrl.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: CFG.CONTRACT, data: data }, "latest"] })
        }).then(function (r) { return r.json(); }).then(function (j) {
          clearTimeout(to);
          if (!j || !j.result || j.result === "0x") throw new Error("bad");
          return parseInt(j.result, 16);
        });
      });
      return Promise.any(jobs);
    }
    function fmt(sec) {
      if (sec >= 3600) return Math.floor(sec / 3600) + ":" + String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
      if (sec >= 60) return Math.floor(sec / 60) + "M";
      return sec + "S";
    }
    function tickRing() {
      call(SEL.open).then(function (open) {
        if (!open) { label.textContent = "SOON"; arc.style.strokeDashoffset = String(C); ring.style.opacity = "0.45"; return null; }
        return call(SEL.cur);
      }).then(function (cur) {
        if (cur === null || cur === undefined) return null;
        return call(SEL.end + encUint(cur));
      }).then(function (end) {
        if (end === null || end === undefined) return;
        var now = Math.floor(Date.now() / 1000);
        var left = Math.max(0, end - now);
        var frac = Math.min(1, left / 10800);
        ring.style.opacity = "1";
        label.textContent = left > 0 ? fmt(left) : "SEAL";
        arc.style.strokeDashoffset = String(C * (1 - frac));
      }).catch(function () { /* keep last state */ });
    }
    tickRing();
    setInterval(tickRing, 20000);
  }

  /* ---- dossier tilt, fine pointers only ---- */
  var doss = document.querySelector(".dossier");
  if (doss && !reduced && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var raf = null;
    doss.addEventListener("pointermove", function (e) {
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        raf = null;
        var r = doss.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        doss.style.transform = "perspective(1200px) rotateY(" + (dx * 1.6).toFixed(2) + "deg) rotateX(" + (-dy * 1.6).toFixed(2) + "deg)";
      });
    });
    doss.addEventListener("pointerleave", function () { doss.style.transform = ""; });
  }
})();
