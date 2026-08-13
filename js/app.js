/* =============================================================
   GitHub Profile Finder — vanilla JS
   Front-end only. Talks to the public GitHub REST API.
   ============================================================= */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function icon(name, cls) {
    return '<svg class="icon' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  function compact(n) {
    if (n == null) return "0";
    if (n < 1000) return String(n);
    if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "") + "k";
    return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
  }

  var DATE_FMT = { year: "numeric", month: "short", day: "numeric" };
  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, DATE_FMT);
  }

  function relTime(iso) {
    if (!iso) return "—";
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + (mins === 1 ? " minute ago" : " minutes ago");
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
    var days = Math.round(hrs / 24);
    if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
    var months = Math.round(days / 30);
    if (months < 12) return months + (months === 1 ? " month ago" : " months ago");
    var years = Math.floor(days / 365);
    return years + (years === 1 ? " year ago" : " years ago");
  }

  /* Profile URLs come from user-editable API fields, so only http(s) is allowed
     through — anything else (javascript:, data:, …) is dropped, not linked. */
  function normalizeUrl(url) {
    if (!url) return "";
    var candidate = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : "https://" + url;
    return /^https?:\/\//i.test(candidate) ? candidate : "";
  }

  /* ---------- language colors (GitHub linguist subset) ---------- */
  var LANG_COLORS = {
    JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Java: "#b07219",
    C: "#555555", "C++": "#f34b7d", "C#": "#178600", Go: "#00ADD8", Rust: "#dea584",
    Ruby: "#701516", PHP: "#4F5D95", Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB",
    HTML: "#e34c26", CSS: "#563d7c", SCSS: "#c6538c", Vue: "#41b883", Svelte: "#ff3e00",
    Shell: "#89e051", PowerShell: "#012456", Perl: "#0298c3", Lua: "#000080",
    Haskell: "#5e5086", Elixir: "#6e4a7e", Erlang: "#B83998", Clojure: "#db5855",
    Scala: "#c22d40", "Objective-C": "#438eff", R: "#198CE7", MATLAB: "#e16737",
    Julia: "#a270ba", Zig: "#ec915c", Nix: "#7e7eff", Solidity: "#AA6746",
    Assembly: "#6E4C13", Makefile: "#427819", Dockerfile: "#384d54", Vim: "#199f4b",
    "Jupyter Notebook": "#DA5B0B", TeX: "#3D6117", Astro: "#ff5a03", "Emacs Lisp": "#c065db"
  };
  function langColor(lang) { return LANG_COLORS[lang] || "#8b949e"; }

  /* ---------- state ---------- */
  var PAGE_SIZE = 12;
  var MAX_REPO_PAGES = 3; /* up to 300 repos */

  var state = {
    user: null,
    repos: [],
    visible: PAGE_SIZE,
    filter: "",
    sort: "updated",
    lastQuery: "",
    requestId: 0
  };

  /* ---------- element refs ---------- */
  var views = {
    landing: $("#viewLanding"),
    loading: $("#viewLoading"),
    profile: $("#viewProfile"),
    notFound: $("#viewNotFound"),
    error: $("#viewError")
  };
  var headerSearchForm = $("#headerSearchForm");
  var headerSearchInput = $("#headerSearchInput");
  var heroSearchInput = $("#heroSearchInput");
  var notFoundInput = $("#notFoundInput");
  var repoGrid = $("#repoGrid");
  var repoEmpty = $("#repoEmpty");
  var repoFilter = $("#repoFilter");
  var repoSort = $("#repoSort");
  var loadMoreWrap = $("#loadMoreWrap");
  var toastRegion = $("#toastRegion");

  /* =============================================================
     Theme
     ============================================================= */
  var themeToggle = $("#themeToggle");
  var themeTimer;

  function applyTheme(theme) {
    var root = document.documentElement;
    root.classList.add("theme-switching");
    root.setAttribute("data-theme", theme);
    /* force a style flush, then re-enable transitions once the swap has painted
       (a timer, not rAF: rAF is throttled to zero in background tabs) */
    void root.offsetWidth;
    clearTimeout(themeTimer);
    themeTimer = setTimeout(function () { root.classList.remove("theme-switching"); }, 60);
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    try { localStorage.setItem("gpf-theme", theme); } catch (e) { /* storage unavailable */ }
  }

  (function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem("gpf-theme"); } catch (e) { /* ignore */ }
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(stored || (prefersDark ? "dark" : "light"));
  })();

  themeToggle.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    toast(next === "dark" ? "Dark theme enabled" : "Light theme enabled", "success");
  });

  /* =============================================================
     Toasts
     ============================================================= */
  function toast(message, type) {
    var el = document.createElement("div");
    el.className = "toast toast-" + (type || "info");
    var glyph = type === "error" ? "alert" : type === "warn" ? "alert" : "check";
    el.innerHTML = icon(glyph) + "<span>" + esc(message) + "</span>";
    toastRegion.appendChild(el);
    setTimeout(function () {
      el.classList.add("is-out");
      setTimeout(function () { el.remove(); }, 220);
    }, 4000);
  }

  /* =============================================================
     Views
     ============================================================= */
  function showView(name) {
    Object.keys(views).forEach(function (key) { views[key].hidden = key !== name; });
    headerSearchForm.hidden = name === "landing";
    closeMobileNav();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* screen-reader announcements for state changes that are only visual */
  function announce(message) {
    var region = $("#statusAnnouncer");
    region.textContent = "";
    /* re-setting after a tick makes repeat messages announce again */
    setTimeout(function () { region.textContent = message; }, 60);
  }

  /* =============================================================
     API
     ============================================================= */
  var API = "https://api.github.com";

  function apiFetch(path) {
    return fetch(API + path, { headers: { Accept: "application/vnd.github+json" } }).then(function (res) {
      var remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining !== null) updateRateMeta(remaining, res.headers.get("x-ratelimit-reset"));

      if (res.ok) return res.json();

      if (res.status === 404) throw makeError("not_found", "Not found");
      if (res.status === 403 || res.status === 429) {
        var reset = res.headers.get("x-ratelimit-reset");
        var when = reset ? new Date(reset * 1000).toLocaleTimeString() : null;
        throw makeError("rate_limit",
          "GitHub API rate limit reached (60 requests per hour for unauthenticated users)." +
          (when ? " It resets at " + when + "." : ""));
      }
      throw makeError("http", "GitHub API responded with " + res.status + " " + res.statusText + ".");
    });
  }

  function makeError(kind, message) {
    var err = new Error(message);
    err.kind = kind;
    return err;
  }

  function updateRateMeta(remaining, reset) {
    var el = $("#rateMeta");
    var text = "API requests left this hour: " + remaining;
    if (Number(remaining) === 0 && reset) text += " · resets " + new Date(reset * 1000).toLocaleTimeString();
    el.textContent = text;
  }

  function fetchAllRepos(login, publicRepos) {
    /* an account with no public repos needs no request at all */
    if (!publicRepos) return Promise.resolve([]);

    var pages = Math.min(MAX_REPO_PAGES, Math.ceil(publicRepos / 100));
    var requests = [];
    for (var p = 1; p <= pages; p++) {
      requests.push(apiFetch("/users/" + encodeURIComponent(login) + "/repos?per_page=100&sort=updated&page=" + p));
    }
    return Promise.all(requests).then(function (chunks) {
      var seen = {};
      var all = [];
      chunks.forEach(function (chunk) {
        /* pages are fetched in parallel; a push mid-flight can repeat a repo
           across page boundaries, so de-duplicate on id */
        if (!Array.isArray(chunk)) return;
        chunk.forEach(function (repo) {
          if (!repo || typeof repo.name !== "string" || seen[repo.id]) return;
          seen[repo.id] = true;
          all.push(repo);
        });
      });
      return all;
    });
  }

  /* =============================================================
     Search flow
     ============================================================= */
  function search(rawName, options) {
    var username = String(rawName || "").trim().replace(/^@/, "");
    if (!username) {
      toast("Enter a GitHub username to search.", "warn");
      (views.landing.hidden ? headerSearchInput : heroSearchInput).focus();
      return;
    }
    if (!/^[A-Za-z0-9-]{1,39}$/.test(username)) {
      state.lastQuery = username;
      syncInputs(username);
      showView("notFound");
      notFoundInput.value = username;
      notFoundInput.focus();
      announce("That is not a valid GitHub username.");
      return;
    }

    state.lastQuery = username;
    syncInputs(username);

    if (!options || options.updateHash !== false) {
      var target = "#/" + username;
      if (window.location.hash !== target) {
        window.location.hash = target;
        return; /* hashchange handler re-enters with updateHash:false */
      }
    }

    var id = ++state.requestId;
    showView("loading");
    announce("Searching for " + username);

    apiFetch("/users/" + encodeURIComponent(username))
      .then(function (user) {
        if (id !== state.requestId) return null;
        return fetchAllRepos(user.login, user.public_repos).then(function (repos) {
          return { user: user, repos: repos };
        });
      })
      .then(function (data) {
        if (!data || id !== state.requestId) return;
        state.user = data.user;
        state.repos = data.repos;
        state.visible = PAGE_SIZE;
        state.filter = "";
        state.sort = "updated";
        repoFilter.value = "";
        repoSort.value = "updated";
        renderProfile();
        showView("profile");
        document.title = data.user.login + " · GitHub Profile Finder";
        announce("Profile loaded for " + data.user.login + ", " +
          data.repos.length + (data.repos.length === 1 ? " repository" : " repositories"));
      })
      .catch(function (err) {
        if (id !== state.requestId) return;
        if (err && err.kind === "not_found") {
          notFoundInput.value = username;
          showView("notFound");
          document.title = "User not found · GitHub Profile Finder";
          announce("No GitHub user found with the username " + username);
          return;
        }
        showError(err);
      });
  }

  function showError(err) {
    var message;
    if (err && err.kind) message = err.message;                      /* rate limit / HTTP status */
    else if (err instanceof SyntaxError) message = "GitHub returned an unexpected response.";
    else if (err instanceof TypeError) message = "Network request failed. Check your internet connection and try again.";
    else message = (err && err.message) || "The request could not be completed.";

    var detail = $("#errorDetail");
    detail.textContent = message;
    detail.hidden = false;
    showView("error");
    document.title = "Something went wrong · GitHub Profile Finder";
    announce("Something went wrong. " + message);
    if (err && err.kind === "rate_limit") toast("GitHub API rate limit reached.", "error");
  }

  function syncInputs(value) {
    headerSearchInput.value = value;
    heroSearchInput.value = value;
  }

  var pendingHomeFocus = false;

  function goHome() {
    state.requestId++;
    state.user = null;
    state.repos = [];
    syncInputs("");
    notFoundInput.value = "";
    document.title = "GitHub Profile Finder";
    if (window.location.hash) {
      /* the view switches on the hashchange, so focus has to wait for it */
      pendingHomeFocus = true;
      window.location.hash = "";
    } else {
      showView("landing");
      heroSearchInput.focus();
    }
  }

  /* =============================================================
     Render — profile
     ============================================================= */
  function renderProfile() {
    var u = state.user;

    $("#pAvatar").src = u.avatar_url;
    $("#pAvatar").alt = "Avatar of " + (u.name || u.login);
    $("#pName").textContent = u.name || u.login;
    var login = $("#pLogin");
    login.textContent = "@" + u.login;
    login.href = u.html_url;

    var bio = $("#pBio");
    bio.textContent = u.bio || "";
    bio.hidden = !u.bio;

    var meta = [];
    if (u.company) meta.push("<li>" + icon("company") + "<span>" + esc(u.company) + "</span></li>");
    if (u.location) meta.push("<li>" + icon("location") + "<span>" + esc(u.location) + "</span></li>");
    var blogUrl = normalizeUrl(u.blog);
    if (u.blog) {
      meta.push("<li>" + icon("link") + (blogUrl
        ? '<a href="' + esc(blogUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(u.blog) + "</a>"
        : "<span>" + esc(u.blog) + "</span>") + "</li>");
    }
    meta.push("<li>" + icon("calendar") + "<span>Joined " + esc(fmtDate(u.created_at)) + "</span></li>");
    $("#pMeta").innerHTML = meta.join("");

    $("#pProfileLink").href = u.html_url;

    $("#pStats").innerHTML = [
      stat("repo", "Repositories", u.public_repos),
      stat("users", "Followers", u.followers),
      stat("users", "Following", u.following),
      stat("gist", "Public gists", u.public_gists)
    ].join("");

    renderSidebar();
    renderRepos();
  }

  function stat(iconName, label, value) {
    return '<div class="stat" role="listitem">' +
      '<span class="stat-value" title="' + esc(String(value)) + '">' + esc(compact(value)) + "</span>" +
      '<span class="stat-label">' + icon(iconName) + esc(label) + "</span>" +
      "</div>";
  }

  /* ---------- sidebar ---------- */
  function renderSidebar() {
    var u = state.user;
    var repos = state.repos;

    /* languages */
    var counts = {};
    repos.forEach(function (r) {
      if (r.fork || !r.language) return;
      counts[r.language] = (counts[r.language] || 0) + 1;
    });
    var langs = Object.keys(counts).map(function (name) { return { name: name, count: counts[name] }; })
      .sort(function (a, b) { return b.count - a.count; });
    var total = langs.reduce(function (sum, l) { return sum + l.count; }, 0);
    var top = langs.slice(0, 6);

    var langBox = $("#langBox");
    if (!top.length) {
      langBox.innerHTML = '<p class="empty-note">No language data available for these repositories.</p>';
    } else {
      var bar = top.map(function (l) {
        return '<span style="width:' + ((l.count / total) * 100).toFixed(2) + "%;background:" + langColor(l.name) + '" title="' + esc(l.name) + '"></span>';
      }).join("");
      var legend = top.map(function (l) {
        return "<li>" +
          '<span class="lang-dot" style="--lang:' + langColor(l.name) + '"></span>' +
          '<span class="name">' + esc(l.name) + "</span>" +
          '<span class="pct">' + ((l.count / total) * 100).toFixed(1) + "%</span>" +
          "</li>";
      }).join("");
      langBox.innerHTML = '<div class="lang-bar">' + bar + '</div><ul class="lang-legend">' + legend + "</ul>";
    }

    /* contribution summary */
    var stars = repos.reduce(function (s, r) { return s + r.stargazers_count; }, 0);
    var forksReceived = repos.reduce(function (s, r) { return s + r.forks_count; }, 0);
    var forkedRepos = repos.filter(function (r) { return r.fork; }).length;
    var mostStarred = repos.slice().sort(function (a, b) { return b.stargazers_count - a.stargazers_count; })[0];
    var lastPush = repos.reduce(function (latest, r) {
      var t = new Date(r.pushed_at || r.updated_at).getTime();
      return t > latest ? t : latest;
    }, 0);

    $("#summaryBox").innerHTML = [
      kv("star", "Stars earned", compact(stars)),
      kv("fork", "Forks received", compact(forksReceived)),
      kv("repo", "Original repositories", compact(state.repos.length - forkedRepos)),
      kv("fork", "Forked repositories", compact(forkedRepos)),
      mostStarred && mostStarred.stargazers_count > 0
        ? kvText("star", "Most starred", mostStarred.name)
        : "",
      kvText("calendar", "Last activity", lastPush ? relTime(new Date(lastPush).toISOString()) : "—")
    ].join("");

    /* profile information */
    $("#infoBox").innerHTML = [
      kvText("code", "Username", u.login),
      kvText("users", "Account type", u.type + (u.site_admin ? " · staff" : "")),
      kvText("calendar", "Joined", fmtDate(u.created_at)),
      kvText("calendar", "Profile updated", relTime(u.updated_at)),
      u.hireable ? kvText("check", "Hireable", "Yes") : "",
      u.twitter_username ? kvText("link", "Social", "@" + u.twitter_username) : ""
    ].join("");

    /* links */
    var links = ['<li><a href="' + esc(u.html_url) + '" target="_blank" rel="noopener noreferrer">' +
      icon("mark") + "GitHub profile" + icon("external", "icon-sm") + "</a></li>"];
    var website = normalizeUrl(u.blog);
    if (website) {
      links.push('<li><a href="' + esc(website) + '" target="_blank" rel="noopener noreferrer">' +
        icon("link") + "Personal website" + icon("external", "icon-sm") + "</a></li>");
    }
    if (u.twitter_username) {
      links.push('<li><a href="https://x.com/' + esc(u.twitter_username) + '" target="_blank" rel="noopener noreferrer">' +
        icon("external") + "@" + esc(u.twitter_username) + "</a></li>");
    }
    links.push('<li><a href="' + esc(u.html_url) + '?tab=repositories" target="_blank" rel="noopener noreferrer">' +
      icon("repo") + "All repositories" + icon("external", "icon-sm") + "</a></li>");
    $("#linksBox").innerHTML = links.join("");
  }

  function kv(iconName, label, value) {
    return '<li><span class="k">' + icon(iconName) + esc(label) + '</span><span class="v">' + esc(value) + "</span></li>";
  }
  function kvText(iconName, label, value) {
    return '<li><span class="k">' + icon(iconName) + esc(label) + '</span><span class="v truncate" title="' + esc(value) + '">' + esc(value) + "</span></li>";
  }

  /* =============================================================
     Render — repositories
     ============================================================= */
  function getVisibleRepos() {
    var term = state.filter.trim().toLowerCase();
    var list = state.repos.filter(function (r) {
      if (!term) return true;
      return r.name.toLowerCase().indexOf(term) !== -1 ||
        (r.description || "").toLowerCase().indexOf(term) !== -1 ||
        (r.language || "").toLowerCase().indexOf(term) !== -1 ||
        (r.topics || []).some(function (t) { return t.indexOf(term) !== -1; });
    });

    var sorters = {
      updated: function (a, b) { return new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at); },
      created: function (a, b) { return new Date(b.created_at) - new Date(a.created_at); },
      stars: function (a, b) { return b.stargazers_count - a.stargazers_count; },
      forks: function (a, b) { return b.forks_count - a.forks_count; },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    };
    return list.sort(sorters[state.sort] || sorters.updated);
  }

  function renderRepos() {
    var list = getVisibleRepos();
    var shown = list.slice(0, state.visible);

    $("#repoCount").textContent = state.repos.length ? String(list.length) : "0";

    if (!state.repos.length) {
      repoGrid.innerHTML = "";
      repoGrid.hidden = true;
      repoEmpty.hidden = false;
      $("#repoEmptyText").textContent = "This user doesn't have any public repositories yet.";
      $("#clearFilter").hidden = true;
      loadMoreWrap.hidden = true;
      return 0;
    }

    if (!list.length) {
      repoGrid.innerHTML = "";
      repoGrid.hidden = true;
      repoEmpty.hidden = false;
      $("#repoEmptyText").textContent = 'No repositories match "' + state.filter.trim() + '". Try a different term or clear the filter to see all ' + state.repos.length + " repositories.";
      $("#clearFilter").hidden = false;
      loadMoreWrap.hidden = true;
      return 0;
    }

    repoEmpty.hidden = true;
    repoGrid.hidden = false;
    repoGrid.innerHTML = shown.map(repoCard).join("");

    var remaining = list.length - shown.length;
    var capped = state.user && state.repos.length < state.user.public_repos;
    var note = "";
    if (remaining > 0) note = "Showing " + shown.length + " of " + list.length + " repositories";
    else if (capped) note = "Showing the " + state.repos.length + " most recently updated repositories";

    loadMoreWrap.hidden = remaining <= 0 && !capped;
    $("#loadMore").hidden = remaining <= 0;
    $("#loadMoreCount").textContent = note;
    return list.length;
  }

  function repoCard(r) {
    var meta = [];
    if (r.language) {
      meta.push('<span class="lang"><span class="lang-dot" style="--lang:' + langColor(r.language) + '"></span>' + esc(r.language) + "</span>");
    }
    meta.push("<span>" + icon("star") + '<span class="num">' + compact(r.stargazers_count) + "</span></span>");
    meta.push("<span>" + icon("fork") + '<span class="num">' + compact(r.forks_count) + "</span></span>");
    meta.push("<span>" + icon("calendar") + "Updated " + esc(relTime(r.pushed_at || r.updated_at)) + "</span>");

    var badges = [];
    if (r.fork) badges.push('<span class="badge">Fork</span>');
    if (r.archived) badges.push('<span class="badge">Archived</span>');
    badges.push('<span class="badge">' + (r.private ? "Private" : "Public") + "</span>");

    return '<article class="repo-card" tabindex="0" role="button" data-repo="' + esc(r.name) + '" ' +
      'aria-label="Open details for repository ' + esc(r.name) + '">' +
      '<div class="repo-card-head">' +
      '<h3 class="repo-name" title="' + esc(r.name) + '">' + esc(r.name) + "</h3>" +
      "<div>" + badges.join("") + "</div>" +
      "</div>" +
      '<p class="repo-desc">' + (r.description ? esc(r.description) : '<em>No description provided.</em>') + "</p>" +
      '<div class="repo-meta">' + meta.join("") + "</div>" +
      "</article>";
  }

  /* =============================================================
     Repository modal
     ============================================================= */
  var lastFocused = null;

  function openRepoModal(name) {
    var r = state.repos.filter(function (x) { return x.name === name; })[0];
    if (!r) return;

    $("#modalOwner").textContent = r.owner ? r.owner.login + " /" : "";
    $("#modalTitle").textContent = r.name;
    var desc = $("#modalDesc");
    desc.textContent = r.description || "No description provided.";

    $("#modalStats").innerHTML = [
      modalStat("star", "Stars", compact(r.stargazers_count)),
      modalStat("fork", "Forks", compact(r.forks_count)),
      modalStat("issue", "Open issues", compact(r.open_issues_count)),
      modalStat("users", "Watchers", compact(r.watchers_count))
    ].join("");

    var facts = [
      fact("Language", r.language
        ? '<span class="lang"><span class="lang-dot" style="--lang:' + langColor(r.language) + '"></span>' + esc(r.language) + "</span>"
        : "Not detected"),
      fact("Visibility", '<span class="badge ' + (r.private ? "" : "badge-success") + '">' + (r.private ? "Private" : "Public") + "</span>"),
      fact("Created", esc(fmtDate(r.created_at))),
      fact("Last updated", esc(fmtDate(r.pushed_at || r.updated_at)) + " · " + esc(relTime(r.pushed_at || r.updated_at))),
      fact("Default branch", "<code>" + esc(r.default_branch || "—") + "</code>"),
      fact("License", esc(r.license && r.license.spdx_id ? r.license.spdx_id : "None"))
    ];
    if (r.fork) facts.push(fact("Type", '<span class="badge">Forked repository</span>'));
    if (r.archived) facts.push(fact("Status", '<span class="badge">Archived</span>'));
    $("#modalFacts").innerHTML = facts.join("");

    var topicsBox = $("#modalTopics");
    if (r.topics && r.topics.length) {
      topicsBox.innerHTML = r.topics.map(function (t) { return '<span class="topic">' + esc(t) + "</span>"; }).join("");
      topicsBox.hidden = false;
    } else {
      topicsBox.innerHTML = "";
      topicsBox.hidden = true;
    }

    $("#modalUrl").textContent = r.html_url;
    $("#modalLink").href = r.html_url;

    openDialog($("#modalBackdrop"));
  }

  function modalStat(iconName, label, value) {
    return '<div class="modal-stat"><span class="v">' + esc(value) + '</span><span class="k">' + icon(iconName) + esc(label) + "</span></div>";
  }
  function fact(label, valueHtml) {
    return "<div><dt>" + esc(label) + "</dt><dd>" + valueHtml + "</dd></div>";
  }

  /* ---------- dialog primitives ---------- */
  function openDialog(backdrop) {
    lastFocused = document.activeElement;
    backdrop.hidden = false;
    document.body.classList.add("modal-open");
    var focusable = getFocusable(backdrop);
    if (focusable.length) focusable[0].focus();
  }

  function closeDialog(backdrop) {
    backdrop.hidden = true;
    if (!$$(".modal-backdrop:not([hidden])").length) document.body.classList.remove("modal-open");
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  }

  function getFocusable(root) {
    return $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', root)
      .filter(function (el) { return el.offsetParent !== null; });
  }

  document.addEventListener("keydown", function (e) {
    var open = $(".modal-backdrop:not([hidden])");
    if (!open) {
      /* no dialog: Escape backs out of the mobile menu instead */
      if (e.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        closeMobileNav();
        navToggle.focus();
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); closeDialog(open); return; }
    if (e.key === "Tab") {
      var focusable = getFocusable(open);
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  $$(".modal-backdrop").forEach(function (backdrop) {
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeDialog(backdrop);
    });
  });
  $("#modalClose").addEventListener("click", function () { closeDialog($("#modalBackdrop")); });
  $$("[data-close-modal]").forEach(function (btn) {
    btn.addEventListener("click", function () { closeDialog(btn.closest(".modal-backdrop")); });
  });

  /* =============================================================
     Events
     ============================================================= */
  $("#heroSearchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    search(heroSearchInput.value);
  });
  headerSearchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    search(headerSearchInput.value);
  });
  $("#notFoundForm").addEventListener("submit", function (e) {
    e.preventDefault();
    search(notFoundInput.value);
  });

  $$("[data-example]").forEach(function (btn) {
    btn.addEventListener("click", function () { search(btn.getAttribute("data-example")); });
  });

  $$('[data-action="go-home"]').forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); goHome(); });
  });

  $("#retryBtn").addEventListener("click", function () {
    if (state.lastQuery) search(state.lastQuery, { updateHash: false });
    else goHome();
  });

  /* repo filter (debounced) */
  var filterTimer;
  repoFilter.addEventListener("input", function () {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(function () {
      state.filter = repoFilter.value;
      state.visible = PAGE_SIZE;
      var matches = renderRepos();
      announce(matches + (matches === 1 ? " repository matches" : " repositories match") + " the filter");
    }, 160);
  });

  repoSort.addEventListener("change", function () {
    state.sort = repoSort.value;
    state.visible = PAGE_SIZE;
    renderRepos();
  });

  $("#clearFilter").addEventListener("click", function () {
    repoFilter.value = "";
    state.filter = "";
    state.visible = PAGE_SIZE;
    renderRepos();
    repoFilter.focus();
  });

  $("#loadMore").addEventListener("click", function () {
    state.visible += PAGE_SIZE;
    renderRepos();
    var cards = $$(".repo-card", repoGrid);
    var next = cards[state.visible - PAGE_SIZE];
    if (next) next.focus();
  });

  /* repo card open — click + keyboard */
  repoGrid.addEventListener("click", function (e) {
    var card = e.target.closest(".repo-card");
    if (card) openRepoModal(card.getAttribute("data-repo"));
  });
  repoGrid.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var card = e.target.closest(".repo-card");
    if (!card) return;
    e.preventDefault();
    openRepoModal(card.getAttribute("data-repo"));
  });

  /* about */
  $$('[data-action="about"]').forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); closeMobileNav(); openDialog($("#aboutBackdrop")); });
  });

  /* mobile nav */
  var navToggle = $("#navToggle");
  var mobileNav = $("#mobileNav");
  navToggle.addEventListener("click", function () {
    var open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    navToggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
    mobileNav.hidden = open;
  });
  function closeMobileNav() {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    mobileNav.hidden = true;
  }
  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) closeMobileNav();
  });

  /* "/" focuses search, like a real developer tool */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ($(".modal-backdrop:not([hidden])")) return;
    e.preventDefault();
    (views.landing.hidden ? headerSearchInput : heroSearchInput).focus();
  });

  /* =============================================================
     Routing (#/username) + boot
     ============================================================= */
  function routeFromHash() {
    var raw = window.location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
    var name;
    try {
      name = decodeURIComponent(raw).trim();
    } catch (e) {
      name = raw.trim(); /* malformed percent-encoding must not break boot */
    }

    if (!name || name === "about") {
      state.requestId++;
      showView("landing");
      document.title = "GitHub Profile Finder";
      if (name === "about") openDialog($("#aboutBackdrop"));
      else if (pendingHomeFocus) heroSearchInput.focus();
      pendingHomeFocus = false;
      return;
    }
    search(name, { updateHash: false });
  }

  window.addEventListener("hashchange", routeFromHash);

  /* loading-state skeleton cards */
  (function buildSkeletons() {
    var html = "";
    for (var i = 0; i < 6; i++) {
      html += '<div class="sk-card">' +
        '<div class="sk sk-line" style="width:55%;height:16px"></div>' +
        '<div class="sk sk-line"></div>' +
        '<div class="sk sk-line" style="width:70%"></div>' +
        '<div class="sk-card-foot">' +
        '<div class="sk sk-line" style="width:70px"></div>' +
        '<div class="sk sk-line" style="width:44px"></div>' +
        '<div class="sk sk-line" style="width:44px"></div>' +
        "</div></div>";
    }
    $("#loadingRepos").innerHTML = html;
  })();

  routeFromHash();
})();
