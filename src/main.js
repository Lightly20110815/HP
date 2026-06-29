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
const views = ["about", "orbit", "playlist", "contact"];

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

function scheduleTimeSync() {
  syncTime();

  const now = new Date();
  const msUntilNextMinute = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
  window.setTimeout(scheduleTimeSync, msUntilNextMinute + 50);
}

scheduleTimeSync();

let viewTransition = null;
let transitionToken = 0;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function afterNextPaint(callback) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

function runViewWork(nextView, token) {
  if (nextView !== "playlist") return;

  afterNextPaint(() => {
    if (token === transitionToken && document.body.dataset.view === nextView) {
      initMusic();
    }
  });
}

function cancelTransition() {
  if (!viewTransition) return;

  if (typeof viewTransition.cancel === "function") {
    viewTransition.cancel();
  } else if (typeof viewTransition.skipTransition === "function") {
    viewTransition.skipTransition();
  }

  viewTransition = null;
  document.body.classList.remove("is-route-transitioning");
}

function applyView(nextView, options = {}) {
  document.body.dataset.view = nextView;

  pageViews.forEach((page) => {
    const isActive = page.dataset.page === nextView;

    page.classList.toggle("is-active", isActive);
    page.classList.remove("is-exiting", "is-entering");

    if (isActive && options.animate) {
      page.classList.add("is-entering");
      page.addEventListener(
        "animationend",
        (event) => {
          if (event.target === page) {
            page.classList.remove("is-entering");
          }
        },
        { once: true },
      );
    }
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

function setView(view, options = {}) {
  const nextView = views.includes(view) ? view : "home";
  const currentActive = document.querySelector(".page-view.is-active");
  const token = ++transitionToken;
  const animate = options.animate !== false;

  if (!currentActive || currentActive.dataset.page === nextView) {
    applyView(nextView);
    runViewWork(nextView, token);
    return;
  }

  cancelTransition();

  if (!animate || prefersReducedMotion()) {
    applyView(nextView);
    runViewWork(nextView, token);
    return;
  }

  // Native View Transitions keep route changes on browser-managed snapshots.
  if (typeof document !== "undefined" && document.startViewTransition) {
    document.body.classList.add("is-route-transitioning");
    viewTransition = document.startViewTransition(() => {
      applyView(nextView);
    });

    viewTransition.finished
      .finally(() => {
        if (token !== transitionToken) return;

        document.body.classList.remove("is-route-transitioning");
        viewTransition = null;
        runViewWork(nextView, token);
      })
      .catch(() => {});

    return;
  }

  const doSwitch = () => {
    const exitPage = currentActive;
    exitPage.classList.add("is-exiting");
    document.body.classList.add("is-route-transitioning");
    let timeoutId = null;

    const onEnd = (event) => {
      if (event && event.target !== exitPage) return;

      exitPage.removeEventListener("animationend", onEnd);
      window.clearTimeout(timeoutId);

      if (token !== transitionToken) return;

      exitPage.classList.remove("is-exiting");
      document.body.classList.remove("is-route-transitioning");
      applyView(nextView, { animate: true });
      viewTransition = null;
      runViewWork(nextView, token);
    };

    exitPage.addEventListener("animationend", onEnd);
    timeoutId = window.setTimeout(onEnd, 240);

    viewTransition = {
      cancel: () => {
        exitPage.removeEventListener("animationend", onEnd);
        window.clearTimeout(timeoutId);
        exitPage.classList.remove("is-exiting");
      },
    };
  };

  doSwitch();
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

setView(window.location.hash.slice(1), { animate: false });

// ── Scroll-reveal fallback ─────────────────────
// CSS animation-timeline: view() is not yet supported in Firefox/Safari.
// When unavailable, IntersectionObserver drives the .is-revealed class.
(function initScrollReveal() {
  const supportsScrollDriven = CSS.supports("animation-timeline", "view()");
  if (supportsScrollDriven) return;

  const targets = document.querySelectorAll(
    ".about-mini-grid article, .orbit-card-row article, .contact-grid .contact-card",
  );

  if (!targets.length) return;

  targets.forEach((el) => el.classList.add("scroll-reveal-fallback"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.1 },
  );

  targets.forEach((el) => observer.observe(el));
})();
