// ---------------------------------------------------------------------------
// NAIROBI NIGHTOWLS — frontend logic
// Talks to the Google Apps Script API defined in config.js (API_URL).
// Falls back to local sample data if API_URL hasn't been set yet, so the
// site is browsable immediately after cloning, before you wire up Sheets.
// ---------------------------------------------------------------------------

const FALLBACK_PROFILES = [
  { id: "1", alias: "The Matatu Financier", sector: "Transport & Logistics", origin: "Started with one 14-seater on the Rongai route in 2003", note: "Now quietly owns a fleet management and insurance-financing operation serving over 40 SACCOs.", revealedAt: "23:41" },
  { id: "2", alias: "The Mabati Queen", sector: "Construction Materials", origin: "Sold roofing sheets from a Gikomba kiosk before her 21st birthday", note: "Controls a regional steel-sheet distribution network across three counties.", revealedAt: "22:03" },
  { id: "3", alias: "The Land Whisperer", sector: "Real Estate", origin: "Bought his first quarter-acre in Kitengela with matatu-conducting savings", note: "Holds land parcels across five counties bought two decades before they appreciated.", revealedAt: "20:55" },
];
const FALLBACK_BOOKS = [
  { id: "1", title: "The Kiosk to Conglomerate Playbook", author: "Anonymous Nightowl Collective", price: "KES 1,200", format: "PDF + Audio" },
  { id: "2", title: "Silent Capital: How Nairobi's Rich Stay Unseen", author: "Field Notes Press", price: "KES 1,800", format: "PDF" },
];
const FALLBACK_GROUPS = [
  { id: "1", name: "Ruiru Young Builders", focus: "Construction & hardware trade", members: 34 },
  { id: "2", name: "CBD Night Traders Circle", focus: "Import/export & forex", members: 61 },
];
const FALLBACK_IDEAS = [
  { id: "1", author: "@wanjiru_k", text: "What if we pooled a small monthly amount as a youth SACCO to buy wholesale stock together?", votes: 14 },
  { id: "2", author: "@otieno_biz", text: "Anyone tried a joint cold-storage cooperative for small avocado farmers near Ruiru?", votes: 9 },
];

const usingApi = typeof API_URL === "string" && API_URL.startsWith("http");

let profiles = [];
let currentProfileIdx = 0;

function getFollowerId() {
  let id = localStorage.getItem("nightowl_follower_id");
  if (!id) {
    id = "f_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("nightowl_follower_id", id);
  }
  return id;
}

function getFollowedSet() {
  return new Set(JSON.parse(localStorage.getItem("nightowl_followed") || "[]"));
}
function saveFollowedSet(set) {
  localStorage.setItem("nightowl_followed", JSON.stringify([...set]));
}

async function apiGet(action) {
  if (!usingApi) return null;
  const res = await fetch(`${API_URL}?action=${action}`);
  const json = await res.json();
  return json.ok ? json.data : [];
}

async function apiPost(action, payload) {
  if (!usingApi) return { ok: true };
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2200);
}

// ---------- PROFILE / HERO ----------
function renderProfile() {
  const p = profiles[currentProfileIdx];
  if (!p) return;
  document.getElementById("p-sector").textContent = p.sector;
  document.getElementById("p-time").textContent = "REVEALED " + (p.revealedAt || "—");
  document.getElementById("p-alias").textContent = p.alias;
  document.getElementById("p-origin").textContent = p.origin;
  document.getElementById("p-note").textContent = p.note;

  const followed = getFollowedSet();
  const btn = document.getElementById("follow-btn");
  if (followed.has(String(p.id))) {
    btn.textContent = "✓ Following";
    btn.classList.add("active");
  } else {
    btn.textContent = "+ Follow";
    btn.classList.remove("active");
  }
}

function revealAnother() {
  const card = document.getElementById("profile-card");
  const ring = document.getElementById("scan-ring");
  card.classList.add("scanning");
  ring.classList.remove("active");
  void ring.offsetWidth; // restart animation
  ring.classList.add("active");

  setTimeout(() => {
    let next = Math.floor(Math.random() * profiles.length);
    if (profiles.length > 1 && next === currentProfileIdx) next = (next + 1) % profiles.length;
    currentProfileIdx = next;
    renderProfile();
    card.classList.remove("scanning");
  }, 900);
}

async function toggleFollow() {
  const p = profiles[currentProfileIdx];
  const followed = getFollowedSet();
  const idStr = String(p.id);
  if (followed.has(idStr)) {
    followed.delete(idStr);
    showToast("Unfollowed");
  } else {
    followed.add(idStr);
    showToast("Now following — you'll see future field notes");
    await apiPost("follow", { profileId: p.id, followerId: getFollowerId() });
  }
  saveFollowedSet(followed);
  renderProfile();
}

// ---------- BOOKS ----------
function renderBooks(books) {
  const grid = document.getElementById("books-grid");
  grid.innerHTML = "";
  books.forEach((b) => {
    const card = document.createElement("div");
    card.className = "book-card";
    card.innerHTML = `
      <div class="book-format">${b.format}</div>
      <div class="book-title">${b.title}</div>
      <div class="book-author">${b.author}</div>
      <div class="book-footer">
        <span class="book-price">${b.price}</span>
        <button class="buy-btn">Buy</button>
      </div>`;
    card.querySelector(".buy-btn").addEventListener("click", async () => {
      await apiPost("bookLead", { bookId: b.id });
      showToast(`Added "${b.title}" to cart`);
    });
    grid.appendChild(card);
  });
}

// ---------- GROUPS ----------
function renderGroups(groups) {
  const row = document.getElementById("groups-row");
  row.innerHTML = "";
  groups.forEach((g) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `
      <div class="group-name">${g.name}</div>
      <div class="group-focus">${g.focus}</div>
      <div class="group-members">${g.members} member${Number(g.members) === 1 ? "" : "s"}</div>`;
    row.appendChild(card);
  });
}

// ---------- IDEAS ----------
function renderIdeas(ideas) {
  const list = document.getElementById("ideas-list");
  list.innerHTML = "";
  ideas
    .slice()
    .sort((a, b) => Number(b.votes) - Number(a.votes))
    .forEach((idea) => {
      const card = document.createElement("div");
      card.className = "idea-card";
      card.innerHTML = `
        <button class="vote-btn">▲<span class="vote-count">${idea.votes}</span></button>
        <div>
          <div class="idea-text">${idea.text}</div>
          <div class="idea-author">${idea.author}</div>
        </div>`;
      card.querySelector(".vote-btn").addEventListener("click", async () => {
        await apiPost("upvoteIdea", { id: idea.id });
        idea.votes = Number(idea.votes) + 1;
        renderIdeas(ideas);
      });
      list.appendChild(card);
    });
}

// ---------- INIT ----------
async function init() {
  document.getElementById("clock").textContent = usingApi ? "NAIROBI · LIVE" : "NAIROBI · DEMO MODE (set API_URL in config.js)";

  profiles = (await apiGet("getProfiles")) || FALLBACK_PROFILES;
  if (!profiles.length) profiles = FALLBACK_PROFILES;
  renderProfile();

  const books = (await apiGet("getBooks")) || FALLBACK_BOOKS;
  renderBooks(books.length ? books : FALLBACK_BOOKS);

  const groups = (await apiGet("getGroups")) || FALLBACK_GROUPS;
  renderGroups(groups.length ? groups : FALLBACK_GROUPS);

  const ideas = (await apiGet("getIdeas")) || FALLBACK_IDEAS;
  renderIdeas(ideas.length ? ideas : FALLBACK_IDEAS);

  document.getElementById("reveal-btn").addEventListener("click", revealAnother);
  document.getElementById("follow-btn").addEventListener("click", toggleFollow);

  document.getElementById("new-group-btn").addEventListener("click", () => {
    document.getElementById("group-form").classList.remove("hidden");
    document.getElementById("new-group-btn").classList.add("hidden");
  });
  document.getElementById("cancel-group-btn").addEventListener("click", () => {
    document.getElementById("group-form").classList.add("hidden");
    document.getElementById("new-group-btn").classList.remove("hidden");
  });
  document.getElementById("group-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("group-name").value.trim();
    const focus = document.getElementById("group-focus").value.trim();
    if (!name) return;
    await apiPost("createGroup", { name, focus });
    showToast("Group created");
    document.getElementById("group-form").reset();
    document.getElementById("group-form").classList.add("hidden");
    document.getElementById("new-group-btn").classList.remove("hidden");
    const groups = (await apiGet("getGroups")) || [];
    renderGroups(groups.length ? groups : [{ id: "local", name, focus, members: 1 }]);
  });

  document.getElementById("idea-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = document.getElementById("idea-input").value.trim();
    if (!text) return;
    await apiPost("postIdea", { text, author: "@you" });
    showToast("Idea posted");
    document.getElementById("idea-form").reset();
    const ideas = (await apiGet("getIdeas")) || [];
    renderIdeas(ideas.length ? ideas : [{ id: "local_" + Date.now(), author: "@you", text, votes: 0 }]);
  });
}

init();
