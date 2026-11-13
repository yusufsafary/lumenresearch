/* Lumen Research claim checker.
   Read-only helper for the Claim section: a visitor types a Finding
   number, the page reads LumenFindings and LumenClaim state by racing
   the public RPC endpoints from lab/config.js, and reports verdict
   class, claim amount, the exact tiered claim fee for that class, and
   status. Nothing is signed and no wallet connects; a copy button
   prepares a ready prompt for the visitor's own agent. While contract
   addresses in config are still zero placeholders, the checker says
   so plainly and fetches nothing. Every DOM write is null-guarded. */
(function () {
  var CFG = window.LUMEN_CONFIG || {};
  var NFT = CFG.CONTRACT || "";
  var CLAIM = CFG.CLAIM || "";
  var RPCS = CFG.RPCS || [];
  var ZERO = "0x0000000000000000000000000000000000000000";

  var SEL_NFT = {
    experimentOf: "0xf390add1",
    isSealed: "0x2c1758c1",
    classOf: "0x4324aa21",
    ownerOf: "0x6352211e"
  };
  var SEL_CLAIM = {
    claimedById: "0x4c80ee12",
    claimAmount: "0x23b221a0",
    claimOpen: "0x4b8bcb58",
    claimFee: "0x99d32fc4",
    claimFeeHigh: "0x4e28da5f"
  };
  var CLASSES = ["Cold Case", "Developing", "Confirmed", "Anomaly", "Pending"];

  function $(id) { return document.getElementById(id); }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function padArg(n) {
    var h = n.toString(16);
    while (h.length < 64) h = "0" + h;
    return h;
  }
  function isAddr(a) { return /^0x[0-9a-fA-F]{40}$/.test(a || ""); }
  function isLive(a) { return isAddr(a) && a.toLowerCase() !== ZERO; }

  // Race every configured RPC with one batch for one contract; resolve
  // with {key: resultHex} from the first endpoint answering completely,
  // or null when all fail. Reverted calls surface as {key: null}.
  function rpcBatch(to, calls) {
    return new Promise(function (resolve) {
      var settled = false;
      var pending = RPCS.length;
      if (!pending || !isLive(to)) { resolve(null); return; }
      RPCS.forEach(function (url) {
        var ctl = ("AbortController" in window) ? new AbortController() : null;
        var timer = ctl ? setTimeout(function () { ctl.abort(); }, 5000) : null;
        var body = calls.map(function (c, i) {
          return { jsonrpc: "2.0", id: i, method: "eth_call", params: [{ to: to, data: c.data }, "latest"] };
        });
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctl ? ctl.signal : undefined
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (timer) clearTimeout(timer);
          if (settled || !j || !Array.isArray(j)) { if (--pending === 0 && !settled) resolve(null); return; }
          var out = {};
          var answered = 0;
          calls.forEach(function (c, i) {
            var hit = null;
            for (var k = 0; k < j.length; k++) { if (j[k].id === i) { hit = j[k]; break; } }
            if (hit) { answered++; out[c.key] = (typeof hit.result === "string") ? hit.result : null; }
          });
          if (answered === calls.length) { settled = true; resolve(out); }
          else if (--pending === 0 && !settled) resolve(null);
        }).catch(function () {
          if (timer) clearTimeout(timer);
          if (--pending === 0 && !settled) resolve(null);
        });
      });
    });
  }

  function toInt(hex) { return hex ? parseInt(hex, 16) : NaN; }
  function toBig(hex) {
    if (!hex) return null;
    try { return BigInt(hex); } catch (e) { return null; }
  }
  function fmtTok(big) {
    if (big === null) return "?";
    return fmt(Number(big / 1000000000000000000n));
  }
  function fmtBnb(bigWei) {
    if (bigWei === null) return "?";
    var whole = bigWei / 1000000000000000000n;
    var frac = bigWei % 1000000000000000000n;
    var fs = frac.toString();
    while (fs.length < 18) fs = "0" + fs;
    fs = fs.replace(/0+$/, "");
    return whole.toString() + (fs ? "." + fs : "");
  }

  // Tiered fee rule, mirrored from LumenClaim: Cold Case and Developing
  // pay the standard fee; Confirmed and Anomaly pay the higher fee.
  function feeFor(cls, fees) {
    if (!fees) return null;
    return (cls === 2 || cls === 3) ? fees.high : fees.std;
  }
  function feeTierName(cls) { return (cls === 2 || cls === 3) ? "higher tier" : "standard tier"; }

  var last = null; // {id, cls, form, claimable, amountText, feeWei, feeBnb}

  function setResult(txt) {
    var el = $("ck-result");
    if (el) el.textContent = txt;
  }

  function check() {
    var input = $("ck-id");
    var btn = $("ck-go");
    var id = input ? parseInt(input.value, 10) : NaN;
    if (!id || id < 1) { setResult("Enter a valid Finding number first."); last = null; return; }
    if (!isLive(NFT) || !isLive(CLAIM)) {
      setResult("Contracts are not live yet. This checker starts reading the moment real addresses land in the public config.");
      last = null;
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = "Reading…"; }
    setResult("Reading Finding " + id + " on-chain…");
    last = null;

    rpcBatch(NFT, [
      { key: "exp", data: SEL_NFT.experimentOf + padArg(id) },
      { key: "cls", data: SEL_NFT.classOf + padArg(id) },
      { key: "own", data: SEL_NFT.ownerOf + padArg(id) }
    ]).then(function (a) {
      if (!a || !a.own) {
        setResult("Finding " + id + " has not been filed yet, or the read failed. Check the number and try again.");
        return null;
      }
      var exp = toInt(a.exp);
      var cls = toInt(a.cls);
      return rpcBatch(NFT, [
        { key: "sealed", data: SEL_NFT.isSealed + padArg(exp) }
      ]).then(function (b) {
        return rpcBatch(CLAIM, [
          { key: "done", data: SEL_CLAIM.claimedById + padArg(id) },
          { key: "amt", data: SEL_CLAIM.claimAmount + padArg(id) },
          { key: "open", data: SEL_CLAIM.claimOpen },
          { key: "fee", data: SEL_CLAIM.claimFee },
          { key: "feeHigh", data: SEL_CLAIM.claimFeeHigh }
        ]).then(function (c) {
          return { exp: exp, cls: cls, sealed: b ? toInt(b.sealed) : NaN, c: c };
        });
      });
    }).then(function (r) {
      if (btn) { btn.disabled = false; btn.textContent = "Check Finding"; }
      if (!r) return;
      var form = CLASSES[r.cls] || "Pending";
      var amtBig = r.c ? toBig(r.c.amt) : null;
      var amtText = fmtTok(amtBig);
      var fees = r.c ? { std: toBig(r.c.fee), high: toBig(r.c.feeHigh) } : null;
      var feeBig = feeFor(r.cls, fees);
      var base = "Finding Nº " + id + " · Case " + r.exp + " · Class " + form + ". ";
      if (!r.sealed) {
        last = { id: id, claimable: false };
        setResult(base + "Its Case is still open and seals at the next three hour boundary in UTC. Claims unlock at the seal.");
        return;
      }
      if (!r.c || feeBig === null) { setResult(base + "Sealed, but the claim read failed. Try again in a moment."); return; }
      var done = toInt(r.c.done) === 1;
      var open = toInt(r.c.open) === 1;
      var feeTxt = "Claim fee for this class (" + feeTierName(r.cls) + "): " + fmtBnb(feeBig) + " BNB (" + feeBig.toString() + " wei). ";
      if (done) {
        last = { id: id, claimable: false };
        setResult(base + "Already claimed. A Finding claims once, and it stays in its owner's wallet.");
        return;
      }
      if (!open) {
        last = { id: id, claimable: false };
        setResult(base + feeTxt + "Sealed and ready, but claims are paused right now. Amount held for it: " + amtText + " $LUMEN.");
        return;
      }
      last = { id: id, claimable: true, cls: r.cls, form: form, amountText: amtText, feeWei: feeBig.toString(), feeBnb: fmtBnb(feeBig) };
      setResult(base + feeTxt + "Claimable now: " + amtText + " $LUMEN. Copy the claim prompt below and hand it to your agent.");
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = "Check Finding"; }
      setResult("The read failed. Try again in a moment.");
    });
  }

  function copyText(txt, btn) {
    function done() {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = old; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done).catch(function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { /* clipboard unavailable */ }
      document.body.removeChild(ta);
    }
  }

  function copyPrompt() {
    var btn = $("ck-copy");
    var txt;
    if (last && last.claimable) {
      txt = "Read https://lumenresearch.ltd/lumen-skill.md and claim $LUMEN for my Lumen Research Finding Nº " + last.id + " on BNB Chain (chain id 56).\n\n" +
        "Facts already checked on this page: Finding Nº " + last.id + ", class " + last.form + ", claimable " + last.amountText + " $LUMEN, Case sealed, not yet claimed. Claim fee for this class: exactly " + last.feeWei + " wei (" + last.feeBnb + " BNB).\n\n" +
        "Rules from the skill file:\n" +
        "1. Contract addresses live in https://lumenresearch.ltd/lab/config.js (LUMEN_CONFIG). Abort if any address is a placeholder or a zero address.\n" +
        "2. Read classOf(" + last.id + ") on the findings contract first. Fees are tiered: Cold Case and Developing findings pay claimFee(); Confirmed and Anomaly findings pay claimFeeHigh(). Read the matching getter on the claim contract and attach exactly that value, no more and no less.\n" +
        "3. Confirm claimOpen() is 1, claimedById(" + last.id + ") is 0, and claimAmount(" + last.id + ") matches " + last.amountText + " $LUMEN. Abort if anything differs.\n" +
        "4. Call claim(" + last.id + ") attaching exactly the fee from step 2.\n" +
        "5. Show me a preview before signing, wait for my confirmation, then report the transaction hash and the $LUMEN amount.";
    } else {
      var pre = $("claim-prompt");
      txt = pre ? pre.textContent : "Read https://lumenresearch.ltd/lumen-skill.md and claim $LUMEN for my Lumen Research Findings on BNB Chain (chain id 56).";
    }
    copyText(txt, btn);
  }

  var go = $("ck-go");
  var cp = $("ck-copy");
  var input = $("ck-id");
  if (go) go.addEventListener("click", check);
  if (cp) cp.addEventListener("click", copyPrompt);
  if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); check(); } });
})();
