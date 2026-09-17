/* aisopach.com — the only script on the page.
   1. mobile nav toggle
   2. the access form: POSTs JSON to window.AISOPACH_ACCESS_ENDPOINT when one is
      configured, otherwise falls back to a prefilled mail draft so no lead is lost. */
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

  var form = document.querySelector("form.access");
  if (!form) { return; }
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
})();
