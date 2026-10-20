# Personal Website

Static personal site: dark, terminal-inspired theme showcasing Unix/OpenShift
administration, networking, Kubernetes, VMware (Tanzu) and AI work, plus a
knowledge base of admin runbooks.

Plain HTML/CSS/JS — no build step, no backend. Hosted on GitHub Pages.

## Structure

```
index.html            home: hero, bio teaser, interactive terminal
projects.html         project cards
knowledge-base.html   knowledge-base index: stats, search, filters, cards (rendered by JS)
articles/*.html       knowledge-base articles
resume.html           resume (under construction for now)
about.html            full bio, focus areas, contact (#contact)
css/style.css         shared theme (colors are CSS variables on :root)
css/motion.css        animations: page transitions, menus, reveals, reading progress, boot intro
js/terminal.js        terminal widget (home page only)
js/motion.js          every page: mobile menu, knowledge-base dropdown, scroll reveal, cursor glow,
                      article progress bar + back-to-top, boot intro (home, once per session)
js/kb-articles.js     knowledge-base metadata: the single list of articles
js/knowledge-base.js  index page: cards, search, category/tag filters, result count
js/article.js         article pages: copy buttons, previous/next, related articles
tools/kb-check.py     consistency + link checker (Python 3, standard library only)
```

`kb-article-prompts-chatgpt/` holds local prompt/instruction notes. It is listed in
`.gitignore`, so it's never committed or published.

### Terminal commands
`help`, `whoami`, `about`, `projects`, `kb`, `resume`, `contact`, `clear`, and `hack`
(a "breach the firewall" number-guessing game — `exit` to quit).
↑/↓ cycles through command history.

## Preview locally

Open `index.html` in a browser, or serve the folder:

```sh
python -m http.server 8000
# then visit http://localhost:8000
```

## Placeholders to fill in

Search the project for `TODO`. The main ones:

- **Bio** — teaser in `index.html`, full version in `about.html`.
- **Resume** — `resume.html` currently shows an under-construction notice.
- **Projects** — 4 placeholder cards in `projects.html`.

Contact links (GitHub + LinkedIn, no email by design) appear in the footer of
every page, in `about.html#contact`, and in the `CONTACT` array at the top of
`js/terminal.js` — update all three together if they change.

## Knowledge base

### How it fits together

- **`js/kb-articles.js` is the single source of truth.** It holds `KB_CATEGORIES` and the
  `KB_ARTICLES` list. The index page builds its stats, category buttons and cards from it,
  and every article page builds its previous/next and related links from it.
- **The array order is the reading order.** It sets both the card order on the index
  and previous/next. Keep related articles next to each other (Kubernetes together,
  Linux together).
- The article pages are plain static HTML (good for SEO and for readers without
  JavaScript). Their metadata line repeats the category, difficulty, reading time and
  date, and `tools/kb-check.py` makes sure it matches the manifest.
- No JavaScript changes are needed to add an article.

### How to add a new knowledge-base article

1. **Create the page.** Copy an existing article to `articles/<slug>.html`. The slug is
   lowercase and hyphenated, for example `selinux-denials-troubleshooting`. Then update:
   - `<title>` (`<Article title> — Mario Paniagua`), `<meta name="description">`
   - the Open Graph block: `og:title` (= the `<h1>`), `og:description`,
     `article:published_time`, `article:section` (= category), one `article:tag` per tag
   - the breadcrumb (`~/knowledge-base / <slug>`) and `<h1>`
   - the metadata line: category · difficulty (with the matching bars) · `N min read` ·
     `Published <date>`. If you revise an article later, add
     `· <span class="updated">Updated <time datetime="YYYY-MM-DD">Mon D, YYYY</time></span>`
   - the static tag list `<ul class="tags">` (same tags, same order as the manifest)
   - the "On this page" list, whose links must match the `id`s of the `<h2>` headings
   - keep the footer (`<div id="kb-article-nav">` + back link) and the scripts at the
     bottom unchanged, adding Prism language components if the page needs new ones.
2. **Keep the section order:** Introduction → When this is useful → Prerequisites →
   How it works → Troubleshooting workflow → Commands and examples → Reading the output →
   Common problems → Troubleshooting tips → Best practices → Summary.
3. **Code blocks:**
   - read-only: `<pre data-label="read-only"><code class="language-bash">…</code></pre>`
   - modifies the system: `<pre class="changes" data-label="changes the system">`
     (destructive commands also get a `<div class="callout warn">` warning)
   - simulated output: `<pre class="output" data-label="output"><code class="language-text">`
     (output blocks get no Copy button)
   - escape `<`, `>` and `&` inside code (`&lt;pod&gt;`).
   - Copy buttons are added automatically to every non-output block.
4. **Add the manifest entry** to `KB_ARTICLES` in `js/kb-articles.js`, at the position
   where it belongs in the reading order:
   ```json
   {
     "slug": "selinux-denials-troubleshooting",
     "title": "Troubleshooting SELinux Denials",
     "description": "One or two sentences shown on the card.",
     "category": "Security",
     "tags": ["security", "linux", "rhel", "troubleshooting"],
     "level": "intermediate",
     "minutes": 10,
     "published": "2026-10-15",
     "updated": "",
     "keywords": "selinux avc ausearch audit2why restorecon semanage setsebool",
     "related": []
   }
   ```
   The array must stay **valid JSON**: double quotes, no trailing commas, no comments inside.
5. **Add the article to the `<noscript>` list** in `knowledge-base.html`, in the same order.
   This is the fallback for readers without JavaScript.
6. **Run the checker** and fix anything it reports:
   ```sh
   python tools/kb-check.py
   ```

### Field reference

| Field | Rule |
|---|---|
| **category** | Exactly one, from `KB_CATEGORIES`: Kubernetes, OpenShift, Linux, DNS, Security, Networking, Storage, Containers, Automation, Monitoring, Crypto. Filter buttons only appear for categories that have articles. To add a new category, append it to `KB_CATEGORIES`. |
| **Kubernetes vs OpenShift** | Use **Kubernetes** when the content applies to both (and add the `openshift` tag). Use the **OpenShift** category only for OpenShift-only features (SCCs, Routes, Operators/OLM, MachineSets). |
| **Linux vs RHEL** | Linux is the category, and `rhel` is a tag for RHEL-specific content (dnf, NetworkManager, SELinux defaults). |
| **tags** | Lowercase, 2–5 per article, shown as clickable `#tag` filters. Reuse existing tags where possible: kubernetes, openshift, linux, rhel, dns, security, troubleshooting, system administration, devops. |
| **level** | `beginner` (explains the basics, safe commands), `intermediate` (assumes admin basics, multi-step diagnosis), `advanced` (cluster-admin changes, internals, several interacting mechanisms). Don't default to advanced. |
| **minutes** | Words inside `<article>` (prose + code, excluding the "On this page" list and footer) ÷ 200, rounded up. `tools/kb-check.py` prints the correct value. |
| **keywords** | Extra search terms not already in the title or description: commands, error strings, technologies. Search matches title, description, category, level, tags and keywords (case-insensitive; every word must match). |
| **related** | Optional list of slugs to pin. Leave it `[]` to auto-pick 2 articles (same category +3, each shared tag +1). Only list articles that exist. |
| **published / updated** | `YYYY-MM-DD`. The card shows `updated` if set, otherwise `published`. |

### Index page features

Search, category buttons and tag filters combine (AND). The state is kept in the URL, so
filtered views can be linked, for example `knowledge-base.html?q=dns`,
`?category=kubernetes&q=pod` or `?tag=rhel`. "reset filters" and <kbd>Esc</kbd> clear it.

## Deploy to GitHub Pages

1. Create a repo on GitHub (e.g. `lpageek95.github.io` for a root site, or any name
   for a project site at `lpageek95.github.io/<repo>`).
2. Push this folder to it:
   ```sh
   git init
   git add .
   git commit -m "Initial site skeleton"
   git branch -M main
   git remote add origin https://github.com/lpageek95/<repo>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
4. The site goes live at the URL shown on that page within a minute or two.

All links are relative, so the site works both as a root site and as a project site.
