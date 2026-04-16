const root = document.documentElement;
const storedTheme = window.localStorage.getItem("spendly-theme");
const navToggle = document.querySelector("[data-nav-toggle]");
const navPanel = document.querySelector("[data-nav-panel]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeIcon = document.querySelector("[data-theme-icon]");
const modalTriggers = document.querySelectorAll("[data-modal-open]");
const modalClosers = document.querySelectorAll("[data-modal-close]");
let activeModal = null;

function syncThemeIcon() {
  if (!themeIcon) {
    return;
  }
  themeIcon.textContent = root.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
}

if (storedTheme === "dark") {
  root.setAttribute("data-theme", "dark");
}

syncThemeIcon();

if (navToggle && navPanel) {
  navToggle.addEventListener("click", () => {
    const isOpen = navPanel.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    if (isDark) {
      root.removeAttribute("data-theme");
      window.localStorage.setItem("spendly-theme", "light");
    } else {
      root.setAttribute("data-theme", "dark");
      window.localStorage.setItem("spendly-theme", "dark");
    }
    syncThemeIcon();
  });
}

function closeModal() {
  if (!activeModal) {
    return;
  }

  activeModal.hidden = true;
  document.body.style.overflow = "";
  activeModal = null;
}

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const target = document.getElementById(trigger.getAttribute("data-modal-open"));
    if (!target) {
      return;
    }

    target.hidden = false;
    activeModal = target;
    document.body.style.overflow = "hidden";
  });
});

modalClosers.forEach((closer) => {
  closer.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});
