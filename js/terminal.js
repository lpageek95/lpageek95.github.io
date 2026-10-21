/* Interactive terminal widget — doubles as site navigation + a small easter egg. */
(function () {
  "use strict";

  const root = document.getElementById("terminal");
  if (!root) return;

  const body = root.querySelector(".terminal-body");
  const output = root.querySelector(".terminal-output");
  const input = root.querySelector(".terminal-input");
  const promptEl = root.querySelector(".terminal-prompt");

  const PROMPT = "guest@site:~$";
  const GAME_PROMPT = "firewall>";

  // Keep in sync with the footer on every page + about.html#contact
  const CONTACT = [
    ["github", "github.com/lpageek95"],
    ["linkedin", "linkedin.com/in/mario-paniagua-47815b133"],
  ];

  const history = [];
  let historyIndex = 0;
  let game = null; // { target, attempts } while "hack" is running

  function print(text, cls) {
    const p = document.createElement("p");
    p.className = "line" + (cls ? " " + cls : "");
    p.textContent = text;
    output.appendChild(p);
    body.scrollTop = body.scrollHeight;
  }

  function go(page, label) {
    print("opening " + label + " ...", "info");
    setTimeout(function () { window.location.href = page; }, 400);
  }

  const commands = {
    help: function () {
      print("available commands:", "info");
      print("  help       show this list");
      print("  whoami     who runs this site");
      print("  about      open the about / contact page");
      print("  projects   open the projects page");
      print("  kb         open the knowledge base");
      print("  resume     open the resume page");
      print("  contact    print contact info");
      print("  clear      clear the screen");
      print("  hack       ???", "warn");
    },
    whoami: function () {
      print("mario paniagua", "ok");
      print("unix / openshift systems administrator, costa rica.");
      print("10+ years: juniper tac -> vmware tanzu -> production openshift.");
      print("type 'about' for the full story.", "muted");
    },
    about: function () { go("about.html", "about.html"); },
    projects: function () { go("projects.html", "projects.html"); },
    kb: function () { go("knowledge-base.html", "knowledge-base.html"); },
    resume: function () { go("resume.html", "resume.html"); },
    contact: function () {
      CONTACT.forEach(function (c) { print("  " + c[0].padEnd(10) + c[1]); });
      print("more at about.html#contact", "muted");
    },
    clear: function () { output.innerHTML = ""; },
    hack: startGame,
  };

  /* ---------- "breach the firewall" number-guessing game ---------- */
  const MAX_ATTEMPTS = 7;

  function startGame() {
    game = { target: Math.floor(Math.random() * 100) + 1, attempts: 0 };
    promptEl.textContent = GAME_PROMPT;
    print("[!] initiating breach sequence...", "warn");
    print("firewall port key is a number between 1 and 100.");
    print("you have " + MAX_ATTEMPTS + " attempts. type 'exit' to abort.");
  }

  function endGame() {
    game = null;
    promptEl.textContent = PROMPT;
  }

  function playGame(raw) {
    if (raw === "exit" || raw === "quit") {
      print("connection closed.", "muted");
      endGame();
      return;
    }
    const guess = Number(raw);
    if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
      print("invalid key: enter a whole number 1-100.", "err");
      return;
    }
    game.attempts++;
    const left = MAX_ATTEMPTS - game.attempts;
    if (guess === game.target) {
      print(">>> ACCESS GRANTED <<<", "ok");
      print("breached in " + game.attempts + " attempt" + (game.attempts === 1 ? "" : "s") + ". nice.", "ok");
      endGame();
    } else if (left <= 0) {
      print("[x] intrusion detected. lockout engaged. key was " + game.target + ".", "err");
      print("type 'hack' to try again.", "muted");
      endGame();
    } else {
      const hint = guess < game.target ? "higher" : "lower";
      print("denied. key is " + hint + ". " + left + " attempt" + (left === 1 ? "" : "s") + " left.", left <= 2 ? "warn" : "info");
    }
  }

  /* ---------- input handling ---------- */
  function run(raw) {
    const line = raw.trim();
    print((game ? GAME_PROMPT : PROMPT) + " " + line, "cmd");
    if (!line) return;

    history.push(line);
    historyIndex = history.length;

    if (game) { playGame(line.toLowerCase()); return; }

    const cmd = line.toLowerCase().split(/\s+/)[0];
    if (Object.prototype.hasOwnProperty.call(commands, cmd)) {
      commands[cmd]();
    } else {
      print("command not found: " + cmd + " (try 'help')", "err");
    }
  }

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      run(input.value);
      input.value = "";
    } else if (e.key === "ArrowUp") {
      if (historyIndex > 0) { historyIndex--; input.value = history[historyIndex]; }
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (historyIndex < history.length - 1) { historyIndex++; input.value = history[historyIndex]; }
      else { historyIndex = history.length; input.value = ""; }
      e.preventDefault();
    }
  });

  // Click anywhere in the terminal to focus (but don't steal text selection).
  body.addEventListener("click", function () {
    if (!window.getSelection().toString()) input.focus();
  });

  promptEl.textContent = PROMPT;
  print("welcome. type 'help' to see available commands.", "ok");
})();
