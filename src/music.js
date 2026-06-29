// Music page - talks to the self-hosted MusicApi (https://music.20110815.xyz).
// Endpoints used:
//   GET /api/tracks?limit=&q=        -> { data: { items[], pagination } }
//   GET /api/tracks/{id}/audio       -> streamed audio (HTTP Range)
//   GET /api/tracks/{id}/cover       -> album artwork

const API = "https://music.20110815.xyz";

// inline lucide "music" glyph for cover-less tracks (avoids re-running createIcons)
const MUSIC_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

const state = {
  tracks: [], // full library, original order
  view: [], // currently visible (after search)
  currentId: null, // id of the loaded track
  mode: "loop", // loop | one | shuffle
  inited: false,
};

let audio;
let seeking = false;
const el = {};

const $ = (sel, root = document) => root.querySelector(sel);

function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const whole = Math.floor(sec);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

const coverUrl = (t) => (t.hasCover ? `${API}${t.urls.cover}` : null);
const audioUrl = (t) => `${API}${t.urls.audio}`;
const currentTrack = () => state.tracks.find((t) => t.id === state.currentId) || null;

// ---- rendering -------------------------------------------------------------

function renderList() {
  const rows = state.view
    .map((t, i) => {
      const cover = coverUrl(t);
      const sub = [t.artist, t.album].filter(Boolean).join(" · ");
      const art = cover
        ? `<img class="track-cover-img" src="${esc(cover)}" loading="lazy" alt="" />`
        : `<span class="track-cover-fallback">${MUSIC_SVG}</span>`;
      return `
        <li class="track-row" data-id="${esc(t.id)}" role="button" tabindex="0"
            aria-label="播放 ${esc(t.title)}">
          <span class="track-num">
            <b>${String(i + 1).padStart(2, "0")}</b>
            <span class="track-eq" aria-hidden="true"><i></i><i></i><i></i></span>
          </span>
          <span class="track-cover">${art}</span>
          <span class="track-meta">
            <b class="track-title">${esc(t.title || t.filename)}</b>
            <span class="track-sub">${esc(sub || "未知艺术家")}</span>
          </span>
          <span class="track-dur">${fmtTime(t.duration)}</span>
        </li>`;
    })
    .join("");

  el.list.innerHTML = rows;
  markActive();
}

function markActive() {
  const rows = el.list.querySelectorAll(".track-row");
  rows.forEach((row) => {
    const on = row.dataset.id === state.currentId;
    row.classList.toggle("is-current", on);
    if (on) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
  });
}

function setState(message, withRetry = false) {
  if (!message) {
    el.state.hidden = true;
    el.state.innerHTML = "";
    return;
  }
  el.state.hidden = false;
  el.state.innerHTML = withRetry
    ? `${esc(message)} <button type="button" class="track-retry" data-retry>重试</button>`
    : esc(message);
}

// ---- data ------------------------------------------------------------------

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The API is serverless (Vercel) and the first request can cold-start / drop,
// so retry a few times with a small backoff before giving up.
async function fetchTracks(attempt = 0) {
  try {
    const res = await fetch(`${API}/api/tracks?limit=500`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json?.data?.items ?? [];
  } catch (err) {
    if (attempt < 3) {
      await wait(500 * (attempt + 1));
      return fetchTracks(attempt + 1);
    }
    throw err;
  }
}

async function loadTracks() {
  setState("正在连接声音星球…");
  el.list.innerHTML = "";
  try {
    const items = await fetchTracks();
    state.tracks = items;
    state.view = items.slice();

    el.statNum.textContent = String(items.length);
    el.count.textContent = `${items.length} 首`;

    if (!items.length) {
      setState("曲库里还没有歌曲。");
      return;
    }
    setState(null);
    renderList();
    if (!items.some((item) => item.id === state.currentId)) {
      loadTrack(items[0], false);
    }
  } catch (err) {
    setState(`没能连上音乐服务（${err.message}）。`, true);
    el.count.textContent = "";
  }
}

function applySearch(q) {
  const term = q.trim().toLowerCase();
  state.view = !term
    ? state.tracks.slice()
    : state.tracks.filter((t) =>
        [t.title, t.artist, t.album, t.albumArtist, t.filename]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(term)),
      );
  renderList();
  setState(state.view.length ? null : "没有找到匹配的曲目。");
}

// ---- playback --------------------------------------------------------------

function loadTrack(track, autoplay = true) {
  if (!track) return;
  state.currentId = track.id;
  audio.src = audioUrl(track);

  el.title.textContent = track.title || track.filename;
  el.artist.textContent = [track.artist, track.album].filter(Boolean).join(" · ") || "未知艺术家";

  const cover = coverUrl(track);
  if (cover) {
    el.cover.src = cover;
    el.cover.style.display = "";
    el.nowPlaying.classList.add("has-cover");
  } else {
    el.cover.removeAttribute("src");
    el.cover.style.display = "none";
    el.nowPlaying.classList.remove("has-cover");
  }

  el.seek.value = 0;
  el.seek.style.setProperty("--fill", "0%");
  el.current.textContent = "0:00";
  el.duration.textContent = fmtTime(track.duration);

  markActive();

  if (autoplay) {
    audio.play().catch(() => {});
  }
}

function playId(id) {
  const track = state.tracks.find((t) => t.id === id);
  if (track) loadTrack(track, true);
}

function togglePlay() {
  if (!state.currentId) {
    if (state.view[0]) loadTrack(state.view[0], true);
    return;
  }
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

function neighbour(step) {
  // Navigate within the visible list; fall back to the full library.
  const list = state.view.length ? state.view : state.tracks;
  if (!list.length) return null;

  if (state.mode === "shuffle" && step !== 0) {
    if (list.length === 1) return list[0];
    let next;
    do {
      next = list[Math.floor(Math.random() * list.length)];
    } while (next.id === state.currentId);
    return next;
  }

  const idx = list.findIndex((t) => t.id === state.currentId);
  if (idx === -1) return list[0];
  const nextIdx = (idx + step + list.length) % list.length;
  return list[nextIdx];
}

function next() {
  const t = neighbour(1);
  if (t) loadTrack(t, true);
}
function prev() {
  // restart current track if we're more than 3s in
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const t = neighbour(-1);
  if (t) loadTrack(t, true);
}

function onEnded() {
  if (state.mode === "one") {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } else {
    next();
  }
}

function cycleMode() {
  const order = ["loop", "shuffle", "one"];
  state.mode = order[(order.indexOf(state.mode) + 1) % order.length];
  el.mode.dataset.mode = state.mode;
  const labels = { loop: "顺序播放", shuffle: "随机播放", one: "单曲循环" };
  el.mode.setAttribute("aria-label", `播放模式：${labels[state.mode]}`);
}

// ---- player UI events ------------------------------------------------------

function bindAudio() {
  audio.addEventListener("play", () => el.board.classList.add("is-playing"));
  audio.addEventListener("pause", () => el.board.classList.remove("is-playing"));
  audio.addEventListener("ended", onEnded);

  audio.addEventListener("loadedmetadata", () => {
    el.duration.textContent = fmtTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (seeking || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    el.seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    el.seek.style.setProperty("--fill", `${pct}%`);
    el.current.textContent = fmtTime(audio.currentTime);
  });

  audio.addEventListener("error", () => {
    if (state.currentId) setState("这首歌暂时播放不了，换一首试试？");
  });
}

function bindControls() {
  el.play.addEventListener("click", togglePlay);
  el.prev.addEventListener("click", prev);
  el.next.addEventListener("click", next);
  el.mode.addEventListener("click", cycleMode);

  el.seek.addEventListener("input", () => {
    seeking = true;
    const pct = Number(el.seek.value) / 10;
    el.seek.style.setProperty("--fill", `${pct}%`);
    if (audio.duration) el.current.textContent = fmtTime((pct / 100) * audio.duration);
  });
  el.seek.addEventListener("change", () => {
    if (audio.duration) audio.currentTime = (Number(el.seek.value) / 1000) * audio.duration;
    seeking = false;
  });

  const applyVolume = () => {
    const v = Number(el.volume.value);
    audio.volume = v;
    audio.muted = v === 0;
    el.volume.style.setProperty("--fill", `${v * 100}%`);
    el.board.classList.toggle("is-muted", v === 0);
  };
  el.volume.addEventListener("input", applyVolume);
  audio.volume = Number(el.volume.value);

  el.mute.addEventListener("click", () => {
    if (Number(el.volume.value) > 0) {
      el.volume.dataset.last = el.volume.value;
      el.volume.value = "0";
    } else {
      el.volume.value = el.volume.dataset.last || "0.85";
    }
    applyVolume();
  });
}

function bindList() {
  const activate = (target) => {
    const row = target.closest(".track-row");
    if (row) playId(row.dataset.id);
  };
  el.list.addEventListener("click", (e) => activate(e.target));
  el.list.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(e.target);
    }
  });

  let t;
  el.search.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => applySearch(el.search.value), 140);
  });

  el.state.addEventListener("click", (e) => {
    if (e.target.closest("[data-retry]")) loadTracks();
  });
}

// ---- init (lazy, on first visit to the Playlist view) ----------------------

export function initMusic() {
  if (state.inited) return;
  const page = $('[data-page="playlist"]');
  if (!page) return;
  state.inited = true;

  audio = $("[data-audio]", page);
  Object.assign(el, {
    board: $(".music-board", page),
    nowPlaying: $("[data-now-playing]", page),
    cover: $("[data-np-cover]", page),
    title: $("[data-np-title]", page),
    artist: $("[data-np-artist]", page),
    seek: $("[data-np-seek]", page),
    current: $("[data-np-current]", page),
    duration: $("[data-np-duration]", page),
    play: $("[data-np-play]", page),
    prev: $("[data-np-prev]", page),
    next: $("[data-np-next]", page),
    mode: $("[data-np-mode]", page),
    volume: $("[data-np-volume]", page),
    mute: $("[data-np-mute]", page),
    list: $("[data-track-list]", page),
    search: $("[data-search]", page),
    state: $("[data-track-state]", page),
    count: $("[data-track-count]", page),
    statNum: $("[data-stat-num]", page),
  });

  bindAudio();
  bindControls();
  bindList();
  loadTracks();
}
