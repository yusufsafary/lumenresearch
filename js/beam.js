/* Lumen Research: the living beam.
   A procedural observatory scene on a canvas over the hero: light falls
   from an oculus, strikes a slowly turning prism, and fans out into a
   spectrum. Dust motes drift in the beam. Drawn fresh every frame from
   math only; no images. Pauses off screen; one still frame when the
   visitor prefers reduced motion. */
(function () {
  var canvas = document.getElementById("beam");
  if (!canvas || !canvas.getContext) return;
  var hero = canvas.parentElement;
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = 1, running = false, raf = 0, visible = true;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var HUES = [
    [87, 200, 255], [94, 234, 212], [123, 228, 149],
    [255, 209, 102], [255, 157, 92], [255, 122, 217]
  ];

  var motes = [];
  function seedMotes() {
    motes = [];
    var n = Math.round(Math.min(56, Math.max(22, W / 22)));
    for (var i = 0; i < n; i++) {
      motes.push({
        x: Math.random(), y: Math.random(),
        r: 0.6 + Math.random() * 1.7,
        s: 0.12 + Math.random() * 0.5,
        p: Math.random() * Math.PI * 2
      });
    }
  }

  function resize() {
    var r = hero.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    W = Math.max(300, r.width); H = Math.max(300, r.height);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seedMotes();
    if (reduced) draw(0);
  }

  function prismPoint(cx, cy, R, rot, k) {
    var a = rot + k * (Math.PI * 2 / 3) - Math.PI / 2;
    return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
  }

  var lvl = 1, lvlTarget = 1;
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var dv = parseInt((document.body && document.body.dataset.verdict) || "1", 10);
    if (!isNaN(dv)) lvlTarget = Math.max(0, Math.min(3, dv));
    lvl += (lvlTarget - lvl) * 0.02;
    var cx = W >= 1024 ? W * 0.60 : W * 0.5;
    var py = W < 640 ? Math.min(H * 0.30, 250) : Math.min(H * 0.36, 300);
    var fanAlpha = (W < 640 ? 0.11 : 0.14) * (0.55 + lvl * 0.22);
    var R = Math.max(30, Math.min(52, W * 0.075));
    var rot = Math.sin(t * 0.00016) * 0.5;
    var breathe = 0.82 + 0.18 * Math.sin(t * 0.0007);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    /* spectrum fan out of the prism: width and hue range follow the live
       projected verdict (body[data-verdict] 0 standby, 1 cold, 2 developing,
       3 confirmed). A quiet Case throws a narrow blue fan; a crowded Case
       opens the full spectrum. */
    var spread = 0.34 + lvl * 0.11 + 0.04 * Math.sin(t * 0.00023);
    var baseA = Math.PI / 2 + Math.sin(t * 0.00016) * 0.08;
    var fanLen = H * 1.05;
    for (var i = 0; i < HUES.length; i++) {
      var a = baseA + (i - (HUES.length - 1) / 2) * (spread / HUES.length) * 1.9;
      var c = HUES[i];
      var hueScale = Math.max(0.06, Math.min(1, lvl + 1.35 - i * 0.62));
      var grad = ctx.createLinearGradient(cx, py, cx + Math.cos(a) * fanLen, py + Math.sin(a) * fanLen);
      grad.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (fanAlpha * breathe * hueScale) + ")");
      grad.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, py);
      var wHalf = 0.055;
      ctx.lineTo(cx + Math.cos(a - wHalf) * fanLen, py + Math.sin(a - wHalf) * fanLen);
      ctx.lineTo(cx + Math.cos(a + wHalf) * fanLen, py + Math.sin(a + wHalf) * fanLen);
      ctx.closePath();
      ctx.fill();
    }

    /* incoming beam from the oculus */
    var bw = 15 + 3 * Math.sin(t * 0.0011);
    var beam = ctx.createLinearGradient(0, -10, 0, py);
    beam.addColorStop(0, "rgba(246,242,228," + (0.30 * breathe) + ")");
    beam.addColorStop(1, "rgba(246,242,228," + (0.05 * breathe) + ")");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(cx - bw * 2.6, -10);
    ctx.lineTo(cx + bw * 2.6, -10);
    ctx.lineTo(cx + bw * 0.4, py - R * 0.4);
    ctx.lineTo(cx - bw * 0.4, py - R * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,253,246," + (0.5 * breathe) + ")";
    ctx.fillRect(cx - 1.4, -10, 2.8, py - R * 0.35);

    /* glow at the prism heart */
    var glow = ctx.createRadialGradient(cx, py, 0, cx, py, R * 3.4);
    glow.addColorStop(0, "rgba(255,246,220," + (0.30 * breathe) + ")");
    glow.addColorStop(0.4, "rgba(201,163,92," + (0.12 * breathe) + ")");
    glow.addColorStop(1, "rgba(201,163,92,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - R * 3.4, py - R * 3.4, R * 6.8, R * 6.8);

    ctx.restore();

    /* oculus ring */
    ctx.save();
    ctx.strokeStyle = "rgba(201,163,92,0.65)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cx, -6, R * 1.5, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(233,220,192,0.28)";
    ctx.beginPath();
    ctx.ellipse(cx, -6, R * 1.9, 17, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    /* the prism */
    var p0 = prismPoint(cx, py, R, rot, 0);
    var p1 = prismPoint(cx, py, R, rot, 1);
    var p2 = prismPoint(cx, py, R, rot, 2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath();
    ctx.fillStyle = "rgba(214,230,255,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(233,220,192,0.9)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, py); ctx.lineTo(p0[0], p0[1]);
    ctx.strokeStyle = "rgba(201,163,92,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    /* dust motes drifting in the light */
    ctx.save();
    for (var j = 0; j < motes.length; j++) {
      var m = motes[j];
      var drift = ((t * 0.008 * m.s) % (H + 40));
      var y = (m.y * (H + 40) + drift) % (H + 40) - 20;
      var x = m.x * W + Math.sin(t * 0.0006 + m.p) * 14;
      var tw = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.0016 + m.p * 3));
      ctx.fillStyle = "rgba(240,234,214," + tw.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    /* bottom fade into the page */
    var fade = ctx.createLinearGradient(0, H * 0.72, 0, H);
    fade.addColorStop(0, "rgba(7,13,29,0)");
    fade.addColorStop(1, "rgba(7,13,29,0.94)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);
  }

  function loop(t) {
    if (!running) return;
    draw(t || 0);
    raf = window.requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduced || !visible) return;
    running = true;
    raf = window.requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
  }

  var rt;
  window.addEventListener("resize", function () {
    window.clearTimeout(rt);
    rt = window.setTimeout(resize, 160);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0.02 }).observe(hero);
  }
  resize();
  if (reduced) draw(1200); else start();
})();
