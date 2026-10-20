#!/usr/bin/env python3
"""Site and knowledge-base consistency check. Standard library only.

Run from the project root:

    python tools/kb-check.py

Checks:
  * js/kb-articles.js parses, and every entry has valid fields
  * each article page exists and its <h1>, og:title, metadata line and tags
    match its entry; reading time matches the convention (see below)
  * related slugs exist; the <noscript> list in knowledge-base.html matches
  * every HTML page: balanced tags, no duplicate ids, internal links, anchors
    and local assets resolve

Reading-time convention: words inside <article> (prose + code, excluding the
"On this page" list and the article footer) / 200 words per minute, rounded up.

Exit code 0 = all good, 1 = problems found.
"""
import glob
import html
import json
import math
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
WPM = 200
LEVELS = {"beginner": "Beginner", "intermediate": "Intermediate", "advanced": "Advanced"}
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
VOID = {"meta", "link", "br", "img", "input", "hr", "source", "wbr"}

problems = []


def problem(msg):
    problems.append(msg)


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def load_manifest():
    src = read("js/kb-articles.js")

    def grab(name):
        m = re.search(r"window\." + name + r"\s*=\s*(\[.*?\n\]);", src, re.S)
        if not m:
            sys.exit(f"cannot find window.{name} = [...] in js/kb-articles.js")
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError as e:
            sys.exit(f"js/kb-articles.js: {name} is not valid JSON: {e}")

    return grab("KB_CATEGORIES"), grab("KB_ARTICLES")


def fmt_date(iso):
    y, m, d = iso.split("-")
    return f"{MONTHS[int(m) - 1]} {int(d)}, {y}"


def reading_minutes(page):
    body = page[page.index("<article"):page.index("</article>")]
    body = re.sub(r'<nav class="toc".*?</nav>', " ", body, flags=re.S)
    body = re.sub(r'<footer class="article-footer">.*?</footer>', " ", body, flags=re.S)
    words = len(html.unescape(re.sub(r"<[^>]+>", " ", body)).split())
    return max(1, math.ceil(words / WPM)), words


def check_articles(categories, articles):
    slugs = [a.get("slug") for a in articles]
    required = ["slug", "title", "description", "category", "tags", "level", "minutes",
                "published", "updated", "keywords", "related"]
    for a in articles:
        s = a.get("slug", "?")
        for k in required:
            if k not in a:
                problem(f"manifest {s}: missing field '{k}'")
        if slugs.count(s) > 1:
            problem(f"manifest {s}: duplicate slug")
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", s):
            problem(f"manifest {s}: slug must be lowercase-hyphenated")
        if a.get("category") not in categories:
            problem(f"manifest {s}: category '{a.get('category')}' is not in KB_CATEGORIES")
        if a.get("level") not in LEVELS:
            problem(f"manifest {s}: level must be one of {', '.join(LEVELS)}")
        for d in ("published", "updated"):
            v = a.get(d, "")
            if v and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
                problem(f"manifest {s}: {d} must be YYYY-MM-DD or empty")
        for t in a.get("tags", []):
            if t != t.lower():
                problem(f"manifest {s}: tag '{t}' must be lowercase")
        for r in a.get("related", []):
            if r not in slugs:
                problem(f"manifest {s}: related slug '{r}' does not exist")
            if r == s:
                problem(f"manifest {s}: lists itself as related")

        path = f"articles/{s}.html"
        if not os.path.exists(os.path.join(ROOT, path)):
            problem(f"{path}: file missing")
            continue
        page = read(path)

        h1 = re.search(r"<h1>(.*?)</h1>", page, re.S)
        if not h1 or html.unescape(h1.group(1)).strip() != a.get("title"):
            problem(f"{path}: <h1> does not match manifest title")
        og = re.search(r'<meta property="og:title" content="([^"]*)">', page)
        if not og or html.unescape(og.group(1)) != a.get("title"):
            problem(f"{path}: og:title missing or different from title")

        meta = re.search(r'<p class="article-meta">(.*?)</p>', page, re.S)
        meta_text = html.unescape(re.sub(r"<[^>]+>", "", meta.group(1))) if meta else ""
        expect = [a.get("category", ""), LEVELS.get(a.get("level"), "?"),
                  f"{a.get('minutes')} min read", fmt_date(a.get("published", "2000-01-01"))]
        if a.get("updated"):
            expect.append("Updated " + fmt_date(a["updated"]))
        for e in expect:
            if e not in meta_text:
                problem(f"{path}: metadata line is missing '{e}'")

        page_tags = re.search(r'<ul class="tags">(.*?)</ul>', page, re.S)
        found = re.findall(r"<li>(.*?)</li>", page_tags.group(1)) if page_tags else []
        if found != a.get("tags"):
            problem(f"{path}: tag list {found} != manifest {a.get('tags')}")

        mins, words = reading_minutes(page)
        if mins != a.get("minutes"):
            problem(f"{path}: reading time should be {mins} min ({words} words / {WPM}), manifest says {a.get('minutes')}")
        print(f"  {s}: {words} words -> {mins} min")

        for needed in ('id="kb-article-nav"', "../js/kb-articles.js", "../js/article.js"):
            if needed not in page:
                problem(f"{path}: missing {needed}")

    kb = read("knowledge-base.html")
    nos = re.search(r"<noscript>(.*?)</noscript>", kb, re.S)
    listed = re.findall(r'href="articles/([^"]+)\.html"', nos.group(1)) if nos else []
    if listed != slugs:
        problem(f"knowledge-base.html: <noscript> list {listed} should match manifest order {slugs}")

    orphans = {os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(ROOT, "articles", "*.html"))} - set(slugs)
    for o in sorted(orphans):
        problem(f"articles/{o}.html is not listed in js/kb-articles.js")


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.ids, self.refs, self.errors = [], [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.append(a["id"])
        for k in ("href", "src"):
            if a.get(k):
                self.refs.append(a[k])
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()
            return
        self.errors.append(f"line {self.getpos()[0]}: unexpected </{tag}> (open: {[t for t, _ in self.stack[-3:]]})")
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break


def check_pages():
    pages = sorted(glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "articles", "*.html")))
    parsed = {}
    for p in pages:
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        pp = PageParser()
        pp.feed(read(rel))
        pp.close()
        for e in pp.errors:
            problem(f"{rel}: {e}")
        for tag, line in pp.stack:
            problem(f"{rel}: <{tag}> opened on line {line} is never closed")
        dupes = {i for i in pp.ids if pp.ids.count(i) > 1}
        for d in sorted(dupes):
            problem(f"{rel}: duplicate id '{d}'")
        if "mailto:" in read(rel):
            problem(f"{rel}: contains a mailto: link (the site intentionally has no email)")
        parsed[rel] = pp

    for rel, pp in parsed.items():
        base = os.path.dirname(rel)
        for ref in pp.refs:
            if re.match(r"^(https?:|mailto:|data:)", ref):
                continue
            path, _, frag = ref.partition("#")
            target = os.path.normpath(os.path.join(base, path)).replace(os.sep, "/") if path else rel
            if target.startswith(".."):
                problem(f"{rel}: link escapes the site root: {ref}")
                continue
            if not os.path.exists(os.path.join(ROOT, target)):
                problem(f"{rel}: broken link {ref}")
            elif frag and target in parsed and frag not in parsed[target].ids:
                problem(f"{rel}: missing anchor {ref}")
    return len(pages)


def main():
    categories, articles = load_manifest()
    print(f"manifest: {len(articles)} articles, {len(categories)} categories")
    check_articles(categories, articles)
    n = check_pages()
    print(f"pages checked: {n}")
    if problems:
        print(f"\n{len(problems)} problem(s):")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    print("OK: no problems found")


if __name__ == "__main__":
    main()
