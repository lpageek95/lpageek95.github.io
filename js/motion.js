/* Motion & immersion layer for every page (styles in css/motion.css):
   mobile menu, knowledge-base dropdown, header shadow, scroll reveal,
   cursor glow + card spotlight, article reading progress, back-to-top,
   current-section highlight, and the home-page boot sequence.
   Progressive: without this script the site works exactly as before. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  doc.classList.add("js-motion");

  // Pages in articles/ link one level up.
  var base = /\/articles\/[^/]*$/.test(window.location.pathname) ? "../" : "";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- Knowledge-base dropdown (built from js/kb-articles.js) ---------- */
  var nav = document.querySelector(".site-nav");
  var kbLink = nav && nav.querySelector('a[href$="knowledge-base.html"]');
  var articles = window.KB_ARTICLES || [];
  var dropdown = null;

  if (kbLink && articles.length) {
    var counts = {};
    articles.forEach(function (a) { counts[a.category] = (counts[a.category] || 0) + 1; });
    var order = (window.KB_CATEGORIES || []).filter(function (c) { return counts[c]; });
    Object.keys(counts).sort().forEach(function (c) { if (order.indexOf(c) === -1) order.push(c); });

    dropdown = kbLink.parentNode;
    dropdown.classList.add("nav-dropdown");

    var toggle = el("button", "nav-sub-toggle", "▾");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Knowledge base categories");
    toggle.setAttribute("aria-controls", "nav-sub-kb");

    var sub = el("ul", "nav-sub");
    sub.id = "nav-sub-kb";
    var cmd = el("li");
    cmd.appendChild(el("span", "nav-sub-cmd", "ls ~/knowledge-base"));
    sub.appendChild(cmd);
    order.forEach(function (c) {
      var li = el("li");
      var a = el("a");
      a.href = base + "knowledge-base.html?category=" + encodeURIComponent(c.toLowerCase());
      a.appendChild(el("span", null, c.toLowerCase() + "/"));
      a.appendChild(el("span", "count", String(counts[c])));
      li.appendChild(a);
      sub.appendChild(li);
    });
    var allLi = el("li");
    var all = el("a", "nav-sub-all");
    all.href = base + "knowledge-base.html";
    all.appendChild(el("span", null, "all articles"));
    all.appendChild(el("span", "count", String(articles.length)));
    allLi.appendChild(all);
    sub.appendChild(allLi);

    kbLink.insertAdjacentElement("afterend", toggle);
    toggle.insertAdjacentElement("afterend", sub);

    var closeTimer;
    var setOpen = function (open) {
      clearTimeout(closeTimer);
      dropdown.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!dropdown.classList.contains("open"));
    });
    if (finePointer) {
      dropdown.addEventListener("mouseenter", function () { if (window.innerWidth > 720) setOpen(true); });
      dropdown.addEventListener("mouseleave", function () {
        if (window.innerWidth > 720) closeTimer = setTimeout(function () { setOpen(false); }, 160);
      });
    }
    dropdown.addEventListener("focusout", function (e) {
      if (!dropdown.contains(e.relatedTarget)) setOpen(false);
    });
    document.addEventListener("click", function (e) { if (!dropdown.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dropdown.classList.contains("open")) { setOpen(false); toggle.focus(); }
    });
  }

  /* ---------- Mobile menu ---------- */
  var header = document.querySelector(".site-header");
  if (nav && header) {
    var menuBtn = el("button", "nav-toggle");
    menuBtn.type = "button";
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-controls", "site-nav");
    nav.id = nav.id || "site-nav";
    var icon = el("span", "nav-toggle-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.appendChild(el("span")); icon.appendChild(el("span")); icon.appendChild(el("span"));
    menuBtn.appendChild(icon);
    menuBtn.appendChild(el("span", null, "menu"));
    nav.parentNode.insertBefore(menuBtn, nav);

    var setMenu = function (open) {
      nav.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setMenu(!nav.classList.contains("open"));
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("open") && !header.contains(e.target)) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 720) setMenu(false); });
  }

  /* ---------- Header shadow once scrolled ---------- */
  function onScrollHeader() { if (header) header.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Cursor glow + card spotlight ---------- */
  if (finePointer && !reduceMotion) {
    var raf = 0, mx = 0, my = 0;
    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        doc.style.setProperty("--mx", mx + "px");
        doc.style.setProperty("--my", my + "px");
      });
    }, { passive: true });
  }
  if (finePointer) {
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".card");
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty("--cx", (e.clientX - r.left) + "px");
      card.style.setProperty("--cy", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  /* ---------- Scroll reveal ---------- */
  if (!reduceMotion && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(
      ".hero, .terminal, main h2, .job, main .grid:not(#kb-grid) > .card, .kb-stats, .kb-controls," +
      " .prose > p, .prose > ul, .prose > ol, .prose > .callout, .prose > .table-wrap, .prose > pre," +
      " .prose .scenario, .toc, .article-footer"
    );
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    var vh = window.innerHeight;
    Array.prototype.forEach.call(targets, function (t) {
      var top = t.getBoundingClientRect().top;
      t.classList.add("reveal");
      // Stagger cards in the same grid
      if (t.classList.contains("card") && t.parentNode) {
        var i = Array.prototype.indexOf.call(t.parentNode.children, t);
        t.style.setProperty("--reveal-delay", (i * 0.07) + "s");
      } else if (top < vh) {
        t.style.setProperty("--reveal-delay", Math.min(top / vh, 1) * 0.25 + "s");
      }
      io.observe(t);
    });
  }

  /* ---------- Articles: reading progress, back-to-top, current section ---------- */
  var article = document.querySelector("article.article");
  if (article) {
    var bar = el("div", "read-progress");
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var top = el("button", "to-top");
    top.type = "button";
    top.setAttribute("aria-label", "Back to top");
    top.appendChild(el("span", null, "↑ top"));
    var pct = el("span", "pct", "0%");
    top.appendChild(pct);
    document.body.appendChild(top);
    top.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
    var sections = tocLinks.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });

    var ticking = false;
    var update = function () {
      ticking = false;
      var start = article.offsetTop;
      var end = start + article.offsetHeight - window.innerHeight;
      var p = Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start)));
      bar.style.setProperty("--progress", p.toFixed(4));
      pct.textContent = Math.round(p * 100) + "%";
      top.classList.toggle("show", window.scrollY > window.innerHeight * 0.8);

      var current = -1;
      var line = window.innerHeight * 0.3;
      sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < line) current = i; });
      tocLinks.forEach(function (a, i) { a.classList.toggle("active", i === current); });
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Home: boot sequence (once per browser session) ---------- */
  var hero = document.querySelector(".hero");
  if (hero && document.getElementById("terminal") && !reduceMotion) {
    var seen = false;
    try { seen = sessionStorage.getItem("booted") === "1"; } catch (e) { seen = false; }
    if (!seen) {
      try { sessionStorage.setItem("booted", "1"); } catch (e) { /* storage blocked: still fine */ }

      var LINES = [
        ["dim", "mario-os 1.0 (tty1)"],
        ["", ""],
        ["ok", "[  OK  ] ", "Mounted /home/mario"],
        ["ok", "[  OK  ] ", "Started network.target (eth0 up)"],
        ["ok", "[  OK  ] ", "Reached target kubernetes.target"],
        ["ok", "[  OK  ] ", "Started openshift-console.service"],
        ["ok", "[  OK  ] ", "Loaded knowledge-base (" + (articles.length || "several") + " articles)"],
        ["ok", "[  OK  ] ", "Started bitcoind.service"],
        ["info", "[ INFO ] ", "Starting interactive shell for guest..."],
      ];

      var overlay = el("div", "boot");
      overlay.setAttribute("aria-hidden", "true");
      overlay.appendChild(el("span", "boot-skip", "click or press any key to skip"));
      document.body.appendChild(overlay);

      var timers = [];
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        timers.forEach(clearTimeout);
        overlay.classList.add("done");
        document.removeEventListener("keydown", finish);
        setTimeout(function () { overlay.remove(); }, 500);
      };
      overlay.addEventListener("click", finish);
      document.addEventListener("keydown", finish);

      LINES.forEach(function (l, i) {
        timers.push(setTimeout(function () {
          var p = el("p", "boot-line");
          if (l.length === 3) { p.appendChild(el("span", l[0], l[1])); p.appendChild(document.createTextNode(l[2])); }
          else { p.appendChild(el("span", l[0], l[1])); }
          overlay.insertBefore(p, overlay.lastChild);
        }, 120 + i * 140));
      });
      timers.push(setTimeout(finish, 120 + LINES.length * 140 + 450));
    }
  }
})();
