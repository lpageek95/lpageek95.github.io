/* Knowledge-base article pages: copy buttons on code blocks, plus previous/next
   and related-article links built from KB_ARTICLES (js/kb-articles.js). */
(function () {
  "use strict";

  var LEVELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- copy buttons ---------- */
  var live = el("span", "visually-hidden");
  live.setAttribute("aria-live", "polite");
  document.body.appendChild(live);

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for file:// and other insecure contexts
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) { resolve(); } else { reject(new Error("copy failed")); }
    });
  }

  /* ---------- code windows ----------
     Every .prose pre becomes a small terminal-style window: a title bar with the
     block's label and language, a Wrap toggle (only when lines overflow) and a
     Copy button (not on simulated output). Without JS the plain <pre> still works. */
  var LANGS = { bash: "bash", yaml: "yaml", powershell: "powershell", ini: "ini",
                docker: "dockerfile", json: "json", text: "text" };
  var WRAP_KEY = "kb-code-wrap";
  var wrapAll = false;
  try { wrapAll = localStorage.getItem(WRAP_KEY) === "1"; } catch (e) { /* storage unavailable */ }

  var blocks = [];

  function setWrap(on) {
    wrapAll = on;
    try { localStorage.setItem(WRAP_KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
    blocks.forEach(function (b) {
      b.wrap.classList.toggle("wrap", on);
      b.wrapBtn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    updateWrapButtons();
  }

  function updateWrapButtons() {
    blocks.forEach(function (b) {
      var overflows = b.pre.scrollWidth > b.pre.clientWidth + 2;
      b.wrapBtn.hidden = !(overflows || wrapAll);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".prose pre"), function (pre) {
    var code = pre.querySelector("code");
    if (!code) return;
    var isOutput = pre.classList.contains("output");

    var wrap = el("div", "code-block");
    if (pre.classList.contains("changes")) wrap.classList.add("changes");
    if (isOutput) wrap.classList.add("output");
    if (wrapAll) wrap.classList.add("wrap");
    pre.parentNode.insertBefore(wrap, pre);

    var head = el("div", "code-head");
    var dots = el("span", "code-dots");
    dots.setAttribute("aria-hidden", "true");
    dots.appendChild(el("span")); dots.appendChild(el("span")); dots.appendChild(el("span"));
    head.appendChild(dots);

    var m = /language-([a-z]+)/.exec(code.className || "");
    var lang = m ? (LANGS[m[1]] || m[1]) : "";
    var label = pre.getAttribute("data-label") || (isOutput ? "output" : lang || "code");
    head.appendChild(el("span", "code-title", label));
    if (lang && lang !== "text" && label.toLowerCase() !== lang) head.appendChild(el("span", "code-lang", lang));

    var actions = el("span", "code-actions");
    var wrapBtn = el("button", "code-btn wrap-btn", "Wrap");
    wrapBtn.type = "button";
    wrapBtn.setAttribute("aria-pressed", wrapAll ? "true" : "false");
    wrapBtn.setAttribute("aria-label", "Wrap long lines in code blocks");
    wrapBtn.addEventListener("click", function () { setWrap(!wrapAll); });
    actions.appendChild(wrapBtn);

    if (!isOutput) {
      var btn = el("button", "code-btn copy-btn", "Copy");
      btn.type = "button";
      btn.setAttribute("aria-label", "Copy code to clipboard");
      var timer;
      btn.addEventListener("click", function () {
        copyText(code.textContent.replace(/\n+$/, "")).then(function () {
          btn.textContent = "Copied!";
          btn.classList.add("copied");
          live.textContent = "Copied to clipboard";
        }, function () {
          btn.textContent = "Failed";
          live.textContent = "Copy failed. Select the text manually.";
        });
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
          live.textContent = "";
        }, 1800);
      });
      actions.appendChild(btn);
    }
    head.appendChild(actions);

    wrap.appendChild(head);
    wrap.appendChild(pre);
    blocks.push({ wrap: wrap, pre: pre, wrapBtn: wrapBtn });
  });

  if (blocks.length) {
    updateWrapButtons();
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateWrapButtons, 150);
    });
    // Web fonts change line widths once they load
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateWrapButtons);
  }

  /* ---------- previous / next + related ---------- */
  var articles = window.KB_ARTICLES || [];
  var mount = document.getElementById("kb-article-nav");
  if (!mount || !articles.length) return;

  var slug = decodeURIComponent(window.location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  var index = -1;
  for (var i = 0; i < articles.length; i++) {
    if (articles[i].slug === slug) { index = i; break; }
  }
  if (index === -1) return;
  var current = articles[index];

  function href(a) { return a.slug + ".html"; } // articles are siblings in articles/

  function metaText(a) {
    return a.category + " · " + (LEVELS[a.level] || a.level) + " · " + a.minutes + " min read";
  }

  // Related: explicit list first, then best matches by shared category (+3) and tags (+1 each).
  function related(a, limit) {
    var bySlug = {};
    articles.forEach(function (x) { bySlug[x.slug] = x; });
    var picked = (a.related || []).map(function (s) { return bySlug[s]; }).filter(Boolean);

    var scored = articles
      .filter(function (x) { return x.slug !== a.slug && picked.indexOf(x) === -1; })
      .map(function (x, order) {
        var score = x.category === a.category ? 3 : 0;
        x.tags.forEach(function (t) { if (a.tags.indexOf(t) !== -1) score++; });
        return { article: x, score: score, order: order };
      })
      .filter(function (s) { return s.score > 0; })
      .sort(function (p, q) { return q.score - p.score || p.order - q.order; })
      .map(function (s) { return s.article; });

    return picked.concat(scored).slice(0, limit);
  }

  // Previous / next (reading order = array order)
  var prev = articles[index - 1];
  var next = articles[index + 1];
  if (prev || next) {
    var pager = el("nav", "article-pager");
    pager.setAttribute("aria-label", "Previous and next articles");
    [[prev, "pager-prev", "← Previous"], [next, "pager-next", "Next →"]].forEach(function (p) {
      if (!p[0]) { pager.appendChild(el("span", "pager-spacer")); return; }
      var a = el("a", p[1]);
      a.href = href(p[0]);
      a.setAttribute("rel", p[1] === "pager-prev" ? "prev" : "next");
      a.appendChild(el("span", "pager-dir", p[2]));
      a.appendChild(el("span", "pager-title", p[0].title));
      pager.appendChild(a);
    });
    mount.appendChild(pager);
  }

  var rel = related(current, 2);
  if (rel.length) {
    var section = el("section", "related");
    section.setAttribute("aria-labelledby", "related-articles");
    var h = el("h2", null, "Related articles");
    h.id = "related-articles";
    section.appendChild(h);
    var ul = el("ul", "related-list");
    rel.forEach(function (r) {
      var li = el("li");
      var a = el("a", null, r.title);
      a.href = href(r);
      li.appendChild(a);
      li.appendChild(el("span", "related-meta", metaText(r)));
      ul.appendChild(li);
    });
    section.appendChild(ul);
    mount.appendChild(section);
  }
})();
