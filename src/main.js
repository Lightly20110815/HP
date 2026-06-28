import {
  Box,
  Brain,
  CloudRain,
  CloudSun,
  Code2,
  Disc3,
  Fan,
  Heart,
  Home,
  Landmark,
  Lightbulb,
  ListMusic,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Music,
  Orbit,
  Paintbrush,
  Pause,
  PenLine,
  Pencil,
  Play,
  Quote,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  Venus,
  Volume2,
  VolumeX,
  createIcons,
} from "lucide";

import { initMusic } from "./music.js";

createIcons({
  icons: {
    Box,
    Brain,
    CloudRain,
    CloudSun,
    Code2,
    Disc3,
    Fan,
    Heart,
    Home,
    Landmark,
    Lightbulb,
    ListMusic,
    Mail,
    MapPin,
    MessageCircle,
    Moon,
    Music,
    Orbit,
    Paintbrush,
    Pause,
    PenLine,
    Pencil,
    Play,
    Quote,
    Repeat,
    Repeat1,
    Search,
    Shuffle,
    SkipBack,
    SkipForward,
    Sparkles,
    Star,
    Venus,
    Volume2,
    VolumeX,
  },
  attrs: {
    "stroke-width": 1.7,
  },
});

const timePill = document.querySelector("[data-time-pill]");
const daypart = document.querySelector("[data-daypart]");
const timeDisplays = document.querySelectorAll("[data-time-display]");
const pageViews = document.querySelectorAll("[data-page]");
const viewLinks = document.querySelectorAll("[data-view-link]");

function getDaypart(hour) {
  if (hour >= 5 && hour < 8) return "清晨";
  if (hour >= 8 && hour < 12) return "上午";
  if (hour >= 12 && hour < 14) return "中午";
  if (hour >= 14 && hour < 18) return "午后";
  if (hour >= 18 && hour < 22) return "傍晚";
  return "夜晚";
}

function formatClock(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function syncTime() {
  const now = new Date();
  const clock = formatClock(now);
  const label = getDaypart(now.getHours());

  if (daypart) {
    daypart.textContent = label;
  }

  timeDisplays.forEach((node) => {
    node.textContent = clock;

    if (node instanceof HTMLTimeElement) {
      node.dateTime = clock;
    }
  });

  if (timePill) {
    timePill.setAttribute("aria-label", `${label} ${clock}`);
    timePill.hidden = false;
  }
}

syncTime();
window.setInterval(syncTime, 1000);

function setView(view) {
  const nextView = ["about", "orbit", "playlist"].includes(view) ? view : "home";

  document.body.dataset.view = nextView;

  if (nextView === "playlist") {
    initMusic();
  }

  pageViews.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === nextView);
  });

  viewLinks.forEach((link) => {
    const isCurrent = link.dataset.viewLink === nextView;

    if (link.closest(".top-nav")) {
      link.classList.toggle("is-current", isCurrent);
    }

    if (link.classList.contains("side-link")) {
      link.classList.toggle("is-active", isCurrent);
      link.toggleAttribute("aria-current", isCurrent);
    }
  });
}

viewLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const view = link.dataset.viewLink;

    if (!view) return;

    event.preventDefault();
    window.history.pushState(null, "", `#${view}`);
    setView(view);
  });
});

window.addEventListener("popstate", () => {
  setView(window.location.hash.slice(1));
});

setView(window.location.hash.slice(1));
