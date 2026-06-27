import {
  CloudRain,
  CloudSun,
  Fan,
  Heart,
  Home,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Music,
  Orbit,
  Quote,
  Sparkles,
  Venus,
  createIcons,
} from "lucide";

createIcons({
  icons: {
    CloudRain,
    CloudSun,
    Fan,
    Heart,
    Home,
    Lightbulb,
    Mail,
    MapPin,
    MessageCircle,
    Moon,
    Music,
    Orbit,
    Quote,
    Sparkles,
    Venus,
  },
  attrs: {
    "stroke-width": 1.7,
  },
});

const timePill = document.querySelector("[data-time-pill]");
const daypart = document.querySelector("[data-daypart]");
const timeDisplays = document.querySelectorAll("[data-time-display]");

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
  }
}

syncTime();
window.setInterval(syncTime, 1000);
