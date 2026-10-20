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

  // Command/config blocks get a button; simulated output (pre.output) does not.
  Array.prototype.forEach.call(document.querySelectorAll(".prose pre:not(.output)"), function (pre) {
    var code = pre.querySelector("code");
    if (!code) return;

    var wrap = el("div", "code-block");
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    var btn = el("button", "copy-btn", "Copy");
    btn.type = "button";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    wrap.appendChild(btn);

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
  });

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
