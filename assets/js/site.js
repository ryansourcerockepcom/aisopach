/* aisopach.com — the only script on the page.
   1. mobile nav toggle
   2. the access form: POSTs JSON to window.AISOPACH_ACCESS_ENDPOINT when one is
      configured, otherwise falls back to a prefilled mail draft so no lead is lost.
   3. motion: parallax backgrounds, scroll reveals, count-up numerals.
      Transform/opacity only, one rAF loop, and all of it steps aside for
      prefers-reduced-motion. */
(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("open"); }
    });
  }

  /* ---- access form ---- */
  var form = document.querySelector("form.access");
  if (form) {
    var msg = form.querySelector(".form-msg");
    var fallback = form.getAttribute("data-fallback-email") || "access@aisopach.com";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.page = location.href;
      data.at = new Date().toISOString();

      var endpoint = window.AISOPACH_ACCESS_ENDPOINT;
      if (!endpoint) {
        var body = Object.keys(data).map(function (k) { return k + ": " + data[k]; }).join("\n");
        window.location.href = "mailto:" + fallback
          + "?subject=" + encodeURIComponent("Access request — " + (data.firm || data.name || "AIsopach"))
          + "&body=" + encodeURIComponent(body);
        if (msg) { msg.textContent = "Opening a mail draft — send it and we'll reply within 48 hours."; }
        return;
      }

      var btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) { throw new Error("HTTP " + r.status); }
        form.reset();
        if (msg) { msg.textContent = "Received. We reply to every request from a named firm, usually within 48 hours."; }
      }).catch(function () {
        if (msg) {
          msg.textContent = "That didn't go through. Email " + fallback + " and we'll pick it up from there.";
        }
      }).then(function () {
        if (btn) { btn.disabled = false; btn.textContent = "Request access"; }
      });
    });
  }

  /* ---- motion ---- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add(reduce ? "motion-off" : "motion-on");
  if (reduce) { return; }

  // Parallax: each [data-parallax] moves against scroll by its factor, measured
  // from its parent's centre so the layer is at rest when the section is centred.
  var layers = [].slice.call(document.querySelectorAll("[data-parallax]")).map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute("data-parallax")) || 0.3, parent: el.parentElement };
  });
  var ticking = false, trail = 0;
  function frame() {
    ticking = false;
    clearTimeout(trail);
    var vh = window.innerHeight;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      if (L.custom) { L.custom(); continue; }
      var r = L.parent.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) { continue; }
      var centre = r.top + r.height / 2 - vh / 2;
      L.el.style.transform = "translate3d(0," + (-centre * L.speed).toFixed(1) + "px,0)";
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    // trailing call so the resting position is always applied, even if a
    // frame is dropped while the tab is busy or not drawing
    clearTimeout(trail);
    trail = setTimeout(frame, 80);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  // Pipeline scene: while the strip is pinned, scroll progress picks the active
  // step and fills the progress line. Below 761px the CSS makes it a static
  // list and the scene has no extra travel, so this just selects step one.
  var scene = document.getElementById("pipeline");
  if (scene) {
    var sticky = scene.querySelector(".pipe-sticky");
    var cells = scene.querySelectorAll(".pipe > div");
    var caps = scene.querySelectorAll(".pipe-cap");
    var bar = scene.querySelector(".pipe-progress i");
    var current = -1;
    var setStep = function (n) {
      if (n === current) { return; }
      current = n;
      for (var k = 0; k < cells.length; k++) { cells[k].classList.toggle("active", k === n); }
      for (var m = 0; m < caps.length; m++) { caps[m].classList.toggle("active", m === n); }
    };
    layers.push({ custom: function () {
      var travel = scene.offsetHeight - sticky.offsetHeight;
      if (travel <= 0) { setStep(0); return; }
      var p = Math.min(Math.max((78 - scene.getBoundingClientRect().top) / travel, 0), 1);
      if (bar) { bar.style.width = (p * 100).toFixed(1) + "%"; }
      setStep(Math.min(cells.length - 1, Math.floor(p * cells.length)));
    } });
  }

  // Reveal: .reveal elements fade and rise once when they enter the viewport.
  // Siblings inside a .stagger container are delayed in order.
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        var el = en.target;
        var group = el.parentElement.classList.contains("stagger") ? el.parentElement : null;
        if (group) {
          var idx = [].indexOf.call(group.children, el);
          el.style.transitionDelay = Math.min(idx * 90, 450) + "ms";
        }
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Count-up: every .stat .num whose text starts with a number counts from zero
  // the first time it is seen. Decimals and a leading $ are preserved.
  var nums = [].slice.call(document.querySelectorAll(".stat .num")).filter(function (el) {
    return el.firstChild && el.firstChild.nodeType === 3 && /^\s*\$?\d/.test(el.firstChild.nodeValue);
  });
  function countUp(el) {
    var node = el.firstChild;
    var raw = node.nodeValue.trim();
    var prefix = raw.charAt(0) === "$" ? "$" : "";
    var target = parseFloat(raw.replace(/[^0-9.]/g, ""));
    var decimals = (raw.split(".")[1] || "").length;
    var start = null, dur = 1400;
    function step(t) {
      if (start === null) { start = t; }
      var p = Math.min((t - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      node.nodeValue = prefix + (target * e).toFixed(decimals);
      if (p < 1) { requestAnimationFrame(step); } else { node.nodeValue = raw; }
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && nums.length) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); io2.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io2.observe(el); });
  }

  // the scene registers after the listeners, so the first frame runs last
  frame();
})();
