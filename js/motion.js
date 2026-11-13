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

  var SUBJECTS = {"2": "BNB, the chain's native asset", "3": "PancakeSwap, BNB Chain's largest DEX", "4": "SPACE ID Agent ID registry (0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F)", "5": "USDT on BNB Chain", "6": "Four.meme launch curve", "7": "Newly verified contracts on BscScan", "8": "BNB staking and validators", "9": "CAKE, PancakeSwap's token", "10": "PancakeSwap v2 router", "11": "Thena, ve(3,3) DEX on BNB Chain", "12": "Venus Protocol, lending on BNB Chain", "13": "Lista DAO and lisUSD", "14": "Biswap", "15": "MEV on BNB Chain", "16": "Stablecoin flows (FDUSD)", "17": "$ZAP launch (Zaplo, PancakeSwap)", "18": "$SONIC launch (Sonic Protocol, PancakeSwap)", "19": "$ORIVIA launch (Orivia, PancakeSwap)", "20": "New PancakeSwap pools today", "21": "Liquidity locks at launch", "22": "Montra launches today", "23": "First-hour trading, new pairs", "24": "Launch-day wallets", "25": "Agent ID registry, week one", "26": "SPACE ID .bnb names", "27": "Binance Agentic Wallet", "28": "Agentic Pass mints", "29": "Nomio", "30": "AgentPepe", "31": "Agent Market stalls", "32": "Orivia", "33": "Elysium Punks (chain 99901)", "34": "Foundry Faces", "35": "AgentNova", "36": "Liberate", "37": "Doodle Lab", "38": "Urbanova", "39": "Z0MBIT and the Montra line", "40": "Standboy", "41": "AgentX402 Syrup Fund", "42": "Cointris lock refunds", "43": "Agent Browser harvest", "44": "CoinFin shares", "45": "Presschain editions", "46": "AgentLabs experiments", "47": "Claim contracts, fee flows", "48": "Lumen itself, meta case", "49": "Honeypot checks", "50": "Rug pulls, red flags", "51": "Contract verification", "52": "Whale wallets on BNB Chain", "53": "Bridge flows, BSC to Elysium", "54": "Gas and priority fees", "55": "Dormant wallets waking", "56": "Agentverse X awakening", "57": "Week 1 dossier"};

  /* ---- seal ring: live window progress from chain ---- */
  var arc = document.getElementById("ring-arc");
  var label = document.getElementById("ring-time");
  var ring = document.getElementById("sealring");
  if (arc && label && CFG.CONTRACT) {
    var C = 2 * Math.PI * 40;
    arc.style.strokeDasharray = String(C);
    arc.style.strokeDashoffset = String(C);
    var SEL = { open: "0x14349d0c", cur: "0xf85ffaa3", end: "0x37e46fcd", part: "0xe200c857" };
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
        if (!open) {
          label.textContent = "SOON"; arc.style.strokeDashoffset = String(C); ring.style.opacity = "0.45";
          document.body.dataset.verdict = "0"; document.body.dataset.live = "0";
          return null;
        }
        document.body.dataset.live = "1";
        return call(SEL.cur);
      }).then(function (cur) {
        if (cur === null || cur === undefined) return null;
        var subjEl = document.getElementById("d-subject");
        if (subjEl && SUBJECTS[String(cur)]) subjEl.textContent = SUBJECTS[String(cur)];
        return Promise.all([call(SEL.end + encUint(cur)), call(SEL.part + encUint(cur))]).then(function (r) {
          return { end: r[0], part: r[1] };
        });
      }).then(function (res) {
        if (!res) return;
        var now = Math.floor(Date.now() / 1000);
        var left = Math.max(0, res.end - now);
        var frac = Math.min(1, left / 10800);
        ring.style.opacity = "1";
        label.textContent = left > 0 ? fmt(left) : "SEAL";
        arc.style.strokeDashoffset = String(C * (1 - frac));
        document.body.dataset.verdict = res.part > 100 ? "3" : (res.part >= 25 ? "2" : "1");
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

  /* ---- v7 premium interaction layer (fine pointers) ---- */
  var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches && !reduced;
  if (fine) {
    /* cursor light: a soft observatory glow follows the pointer */
    var glow = document.createElement("div");
    glow.id = "glow";
    document.body.appendChild(glow);
    var gx = -600, gy = -600, tx = -600, ty = -600;
    document.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (gx < -500) { gx = tx; gy = ty; }
      glow.style.opacity = "1";
    }, { passive: true });
    (function follow() {
      gx += (tx - gx) * 0.08; gy += (ty - gy) * 0.08;
      glow.style.transform = "translate(" + (gx - 280) + "px," + (gy - 280) + "px)";
      requestAnimationFrame(follow);
    })();

    /* magnetic buttons: a gentle pull toward the cursor */
    var mags = document.querySelectorAll(".hero-cta .btn, .chead .btn");
    Array.prototype.forEach.call(mags, function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.14;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
        b.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });

    /* dossier glare follows the pointer across the plate */
    var plate = document.querySelector(".dossier");
    if (plate) {
      plate.addEventListener("pointermove", function (e) {
        var r = plate.getBoundingClientRect();
        plate.style.setProperty("--gx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
        plate.style.setProperty("--gy", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
      });
    }
  }

  /* nav wayfinding: mark the section in view */
  var navLinks = document.querySelectorAll('.navrow a[href^="#"]');
  if (navLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    Array.prototype.forEach.call(navLinks, function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var nobs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Array.prototype.forEach.call(navLinks, function (a) { a.classList.remove("on"); });
        var link = byId[en.target.id];
        if (link) link.classList.add("on");
      });
    }, { rootMargin: "-38% 0px -52% 0px" });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) nobs.observe(s);
    });
  }

  /* back to top (desktop) */
  var toTop = document.createElement("button");
  toTop.id = "toTop";
  toTop.type = "button";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.textContent = "↑";
  document.body.appendChild(toTop);
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); });
  window.addEventListener("scroll", function () {
    toTop.classList.toggle("show", window.scrollY > 700);
  }, { passive: true });
})();
