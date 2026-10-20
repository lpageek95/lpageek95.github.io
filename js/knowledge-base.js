/* Knowledge-base index: renders cards from KB_ARTICLES (js/kb-articles.js) and
   wires up search, category filter, tag filter, result count and reset.
   State is mirrored in the URL (?q=&category=&tag=) so filtered views can be linked. */
(function () {
  "use strict";

  var articles = window.KB_ARTICLES || [];
  var knownCategories = window.KB_CATEGORIES || [];

  var controls = document.getElementById("kb-controls");
  var stats = document.getElementById("kb-stats");
  var grid = document.getElementById("kb-grid");
  var search = document.getElementById("kb-search");
  var catGroup = document.getElementById("kb-categories");
  var count = document.getElementById("kb-count");
  var activeTag = document.getElementById("kb-active-tag");
  var activeTagBtn = document.getElementById("kb-active-tag-btn");
  var resetBtn = document.getElementById("kb-reset");
  var empty = document.getElementById("kb-empty");
  var emptyText = document.getElementById("kb-empty-text");
  var emptyReset = document.getElementById("kb-empty-reset");
  if (!grid || !articles.length) return;

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var LEVELS = { beginner: ["Beginner", "■□□"], intermediate: ["Intermediate", "■■□"], advanced: ["Advanced", "■■■"] };

  var state = { q: "", category: "", tag: "" };

  /* ---------- helpers ---------- */
  function formatDate(iso) {
    var p = iso.split("-");
    return MONTHS[Number(p[1]) - 1] + " " + Number(p[2]) + ", " + p[0];
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function normalize(s) { return String(s).toLowerCase(); }

  // Categories in use, ordered as in KB_CATEGORIES, then any unknown ones alphabetically.
  function categoriesInUse() {
    var used = {};
    articles.forEach(function (a) { used[a.category] = (used[a.category] || 0) + 1; });
    var ordered = knownCategories.filter(function (c) { return used[c]; });
    Object.keys(used).sort().forEach(function (c) { if (ordered.indexOf(c) === -1) ordered.push(c); });
    return ordered.map(function (c) { return { name: c, count: used[c] }; });
  }

  function levelNode(level) {
    var info = LEVELS[level] || [level, ""];
    var span = el("span", "level");
    span.setAttribute("data-level", level);
    var bars = el("span", "level-bars", info[1]);
    bars.setAttribute("aria-hidden", "true");
    span.appendChild(bars);
    span.appendChild(document.createTextNode(" " + info[0]));
    return span;
  }

  /* ---------- stats ---------- */
  function renderStats() {
    if (!stats) return;
    var cats = categoriesInUse();
    var tags = {};
    var latest = "";
    articles.forEach(function (a) {
      a.tags.forEach(function (t) { tags[t] = true; });
      var d = a.updated || a.published;
      if (d > latest) latest = d;
    });
    var lines = [
      ["articles", String(articles.length)],
      ["categories", cats.map(function (c) { return c.name + " (" + c.count + ")"; }).join(" · ")],
      ["topics", Object.keys(tags).length + " tags"],
      ["updated", formatDate(latest)]
    ];
    var cmd = el("p", "kb-stats-cmd", "kb --stats");
    cmd.setAttribute("aria-hidden", "true");
    stats.appendChild(cmd);
    var dl = el("dl", "kb-stats-list");
    lines.forEach(function (l) {
      dl.appendChild(el("dt", null, l[0]));
      dl.appendChild(el("dd", null, l[1]));
    });
    stats.appendChild(dl);
  }

  /* ---------- cards ---------- */
  function renderCards() {
    articles.forEach(function (a) {
      var card = el("article", "card kb-card");
      card.setAttribute("data-slug", a.slug);
      card.setAttribute("data-category", normalize(a.category));
      card.setAttribute("data-tags", a.tags.map(normalize).join("|"));
      card.setAttribute("data-search", normalize([a.title, a.description, a.category, a.level, a.tags.join(" "), a.keywords].join(" ")));

      var meta = el("p", "card-meta");
      var time = el("time", null, formatDate(a.updated || a.published));
      time.setAttribute("datetime", a.updated || a.published);
      var dateSpan = el("span", "date");
      dateSpan.appendChild(time);
      [el("span", "cat", a.category), levelNode(a.level), el("span", "reading-time", a.minutes + " min read"), dateSpan]
        .forEach(function (item, i) {
          if (i) meta.appendChild(document.createTextNode(" · "));
          meta.appendChild(item);
        });
      card.appendChild(meta);

      var h = el("h3");
      var link = el("a", "card-link", a.title);
      link.href = "articles/" + a.slug + ".html";
      h.appendChild(link);
      card.appendChild(h);

      card.appendChild(el("p", "card-desc", a.description));

      var ul = el("ul", "tags tag-buttons");
      ul.setAttribute("aria-label", "Tags");
      a.tags.forEach(function (t) {
        var li = el("li");
        var b = el("button", "tag-btn", "#" + t);
        b.type = "button";
        b.setAttribute("data-tag", t);
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-label", "Filter by tag " + t);
        li.appendChild(b);
        ul.appendChild(li);
      });
      card.appendChild(ul);
      grid.appendChild(card);
    });
  }

  function renderCategoryButtons() {
    var all = [{ name: "", label: "All", count: articles.length }].concat(
      categoriesInUse().map(function (c) { return { name: c.name, label: c.name, count: c.count }; })
    );
    all.forEach(function (c) {
      var b = el("button", "filter-btn");
      b.type = "button";
      b.setAttribute("data-category", normalize(c.name));
      b.appendChild(document.createTextNode(c.label + " "));
      b.appendChild(el("span", "filter-count", "(" + c.count + ")"));
      catGroup.appendChild(b);
    });
  }

  /* ---------- filtering ---------- */
  function apply(updateUrl) {
    var terms = normalize(state.q).split(/\s+/).filter(Boolean);
    var cards = grid.querySelectorAll(".kb-card");
    var shown = 0;

    Array.prototype.forEach.call(cards, function (card) {
      var ok = (!state.category || card.getAttribute("data-category") === state.category) &&
               (!state.tag || card.getAttribute("data-tags").split("|").indexOf(state.tag) !== -1) &&
               terms.every(function (t) { return card.getAttribute("data-search").indexOf(t) !== -1; });
      card.hidden = !ok;
      if (ok) shown++;
    });

    var filtered = Boolean(state.q.trim() || state.category || state.tag);
    count.textContent = filtered
      ? "Showing " + shown + " of " + articles.length + " article" + (articles.length === 1 ? "" : "s")
      : articles.length + " article" + (articles.length === 1 ? "" : "s");

    empty.hidden = shown !== 0;
    emptyText.textContent = state.q.trim()
      ? "No articles found matching your search."
      : "No articles match the selected filters.";
    resetBtn.hidden = !filtered;

    Array.prototype.forEach.call(catGroup.querySelectorAll(".filter-btn"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-category") === state.category));
    });
    Array.prototype.forEach.call(grid.querySelectorAll(".tag-btn"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-tag") === state.tag));
    });
    activeTag.hidden = !state.tag;
    if (state.tag) {
      activeTagBtn.textContent = "#" + state.tag + " ×";
      activeTagBtn.setAttribute("aria-label", "Remove tag filter " + state.tag);
    }

    if (updateUrl) writeUrl();
  }

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    state.q = params.get("q") || "";
    var cat = normalize(params.get("category") || "");
    state.category = categoriesInUse().some(function (c) { return normalize(c.name) === cat; }) ? cat : "";
    state.tag = normalize(params.get("tag") || "");
    search.value = state.q;
  }

  function writeUrl() {
    if (!window.history.replaceState) return;
    var params = new URLSearchParams();
    if (state.q.trim()) params.set("q", state.q.trim());
    if (state.category) params.set("category", state.category);
    if (state.tag) params.set("tag", state.tag);
    var qs = params.toString();
    try {
      window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
    } catch (e) { /* some file:// contexts disallow it; filtering still works */ }
  }

  function reset() {
    state.q = ""; state.category = ""; state.tag = "";
    search.value = "";
    apply(true);
    search.focus();
  }

  /* ---------- events ---------- */
  search.addEventListener("input", function () { state.q = search.value; apply(true); });
  search.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && search.value) { e.preventDefault(); search.value = ""; state.q = ""; apply(true); }
  });

  catGroup.addEventListener("click", function (e) {
    var b = e.target.closest(".filter-btn");
    if (!b) return;
    state.category = b.getAttribute("data-category");
    apply(true);
  });

  grid.addEventListener("click", function (e) {
    var b = e.target.closest(".tag-btn");
    if (!b) return;
    var t = b.getAttribute("data-tag");
    state.tag = state.tag === t ? "" : t;
    apply(true);
  });

  activeTagBtn.addEventListener("click", function () { state.tag = ""; apply(true); search.focus(); });
  resetBtn.addEventListener("click", reset);
  emptyReset.addEventListener("click", reset);

  /* ---------- init ---------- */
  renderStats();
  renderCards();
  renderCategoryButtons();
  controls.hidden = false;
  readUrl();
  apply(false);
})();
