import { fetchWithAuth } from "../data.js";

document.body.classList.add("hidden");

function getStoredUser() {
  try {
    const raw =
      sessionStorage.getItem("user") ||
      sessionStorage.getItem("userData") ||
      localStorage.getItem("user") ||
      localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getEffectiveAdminRole() {
  const user = getStoredUser();
  const storedRole = localStorage.getItem("userRole") || "";
  const directRole =
    user?.role ||
    user?.user_role ||
    user?.userRole ||
    user?.type ||
    user?.account_type ||
    user?.role_name ||
    "";

  if (storedRole) return String(storedRole).toLowerCase();
  if (directRole) return String(directRole).toLowerCase();
  if (user?.is_admin === true || user?.admin === true || user?.isAdmin === true) {
    return "admin";
  }
  return "";
}

function getStoredPermissions() {
  const user = getStoredUser();
  const permissions = user?.permissions ?? user?.permission ?? [];
  if (Array.isArray(permissions)) {
    return permissions.map((permission) => String(permission).toLowerCase());
  }
  if (typeof permissions === "string") {
    try {
      const parsed = JSON.parse(permissions);
      if (Array.isArray(parsed)) {
        return parsed.map((permission) => String(permission).toLowerCase());
      }
    } catch {
      return permissions
        .split(",")
        .map((permission) => permission.trim().toLowerCase())
        .filter(Boolean);
    }
  }
  return [];
}

function hasUnlimitedPermissions() {
  const user = getStoredUser();
  return user?.permissions === null || user?.permission === null;
}

function getPermissionForSection(sectionId) {
  const permissionMap = {
    "dashboard-section": "dashboard",
    "orders-section": "orders",
    "order-details-section": "orders",
    "products-section": "products",
    "add-product-section": "products",
    "collections-section": "products",
    "reviews-section": "reviews",
    "accounting-section": "accounting",
    "income-details-view": "accounting",
    "expense-details-view": "accounting",
    "settings-section": "settings",
  };
  return permissionMap[sectionId] || "dashboard";
}

function isFullAccessRole() {
  const role = getEffectiveAdminRole();
  return role === "super_admin" || role === "manager";
}

function canAccessSection(sectionId) {
  return (
    isFullAccessRole() ||
    hasUnlimitedPermissions() ||
    getStoredPermissions().includes(getPermissionForSection(sectionId))
  );
}

window.hasAdminPermission = (permission) =>
  isFullAccessRole() ||
  hasUnlimitedPermissions() ||
  getStoredPermissions().includes(String(permission).toLowerCase());

function applyPermissionRestrictions() {
  const sectionByMenuId = {
    dashboard: "dashboard-section",
    orders: "orders-section",
    products: "products-section",
    collections: "collections-section",
    reviews: "reviews-section",
    accounting: "accounting-section",
    settings: "settings-section",
  };

  Object.entries(sectionByMenuId).forEach(([menuId, sectionId]) => {
    const link = document.getElementById(menuId);
    if (link) link.classList.toggle("hidden", !canAccessSection(sectionId));
  });

  document.querySelectorAll(".quick-link-btn[data-target]").forEach((link) => {
    const target = link.dataset.target;
    link.classList.toggle("hidden", !canAccessSection(target));
  });

  const mainSections = [...document.querySelectorAll("main > section")];
  const allowedSections = mainSections.filter((section) =>
    canAccessSection(section.id),
  );
  mainSections.forEach((section) => {
    if (!canAccessSection(section.id)) section.classList.add("hidden");
  });
  if (allowedSections.length && !allowedSections.some((section) => !section.classList.contains("hidden"))) {
    allowedSections[0].classList.remove("hidden");
  }
}

async function enforceAdminAccess() {
  const token = localStorage.getItem("token");

  const hasAdminRole =
    getEffectiveAdminRole() === "admin" ||
    getEffectiveAdminRole() === "super_admin" ||
    getEffectiveAdminRole() === "manager";

  if (!token && !hasAdminRole) {
    window.location.replace("../index.html");
    return;
  }

  try {
    const response = await fetchWithAuth("/admin?dashboard=true", {
      method: "GET",
    });

    if (response?.authRequired === true) {
      throw new Error("ورود لازم است");
    }

    const responseUser = response?.user || response?.data?.user || response?.data;
    if (responseUser?.permissions || responseUser?.permission) {
      const user = getStoredUser() || {};
      const permissions = responseUser.permissions || responseUser.permission;
      localStorage.setItem(
        "user",
        JSON.stringify({ ...user, permissions }),
      );
      sessionStorage.setItem(
        "user",
        JSON.stringify({ ...user, permissions }),
      );
    }

    if (response?.status === true || response?.data || response?.user || hasAdminRole) {
      applyPermissionRestrictions();
      document.body.classList.remove("hidden");
      return;
    }

    throw new Error("دسترسی ادمین تأیید نشد");
  } catch {
    if (hasAdminRole) {
      applyPermissionRestrictions();
      document.body.classList.remove("hidden");
      return;
    }

    [
      "token",
      "user",
      "userData",
      "userRole",
    ].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
    window.location.replace("../index.html");
  }
}

enforceAdminAccess();
window.addEventListener("pageshow", enforceAdminAccess);

// 1. مدیریت سایدبار / منوی کشویی ادمین (موبایل و تبلت)
// ----------------------------------------------------------------------
const adminSidebar =
  document.getElementById("admin-sidebar") ||
  document.getElementById("sidebar");
const overlayAdmin =
  document.getElementById("admin-sidebar-overlay") ||
  document.getElementById("sidebar-overlay");
const openBtnAdmin =
  document.getElementById("admin-hamburger-btn") ||
  document.getElementById("open-sidebar-btn");
const closeBtnAdmin =
  document.getElementById("admin-close-sidebar-btn") ||
  document.getElementById("close-sidebar-btn");

function openAdminSidebar() {
  if (!adminSidebar || !overlayAdmin) return;
  adminSidebar.classList.remove("translate-x-full");
  overlayAdmin.classList.remove("hidden");
  setTimeout(() => overlayAdmin.classList.add("opacity-100"), 10);
  document.body.classList.add("overflow-hidden");
}

function closeAdminSidebar() {
  if (!adminSidebar || !overlayAdmin) return;
  adminSidebar.classList.add("translate-x-full");
  overlayAdmin.classList.remove("opacity-100");
  setTimeout(() => overlayAdmin.classList.add("hidden"), 300);
  document.body.classList.remove("overflow-hidden");
}

openBtnAdmin?.addEventListener("click", openAdminSidebar);
closeBtnAdmin?.addEventListener("click", closeAdminSidebar);
overlayAdmin?.addEventListener("click", closeAdminSidebar);

// ----------------------------------------------------------------------
// 2. مدیریت تعویض تب‌ها (Sections) و عنوان صفحه
// ----------------------------------------------------------------------
const adminMenu = document.querySelector("#admin-menu");
const navLinksAdmin = document.querySelectorAll("#admin-menu a");
const sectionsAdmin = document.querySelectorAll("main > section");
const pageTitle = document.getElementById("page-title");

if (adminMenu) {
  adminMenu.addEventListener("click", (e) => {
    const targetLink = e.target.closest("a");
    if (!targetLink || targetLink.id === "exit") return;
    e.preventDefault();

    navLinksAdmin.forEach((item) => {
      item.classList.remove("bg-white", "text-black-primary", "font-bold");
      item.classList.add("text-white/90", "hover:bg-white/10", "font-semibold");
    });
    targetLink.classList.remove(
      "text-white/90",
      "hover:bg-white/10",
      "font-semibold",
    );
    targetLink.classList.add("bg-white", "text-black-primary", "font-bold");

    if (sectionsAdmin.length > 0) {
      if (!canAccessSection(`${targetLink.id}-section`)) return;
      sectionsAdmin.forEach((sec) => {
        if (sec.id === `${targetLink.id}-section`) {
          sec.classList.remove("hidden");
        } else {
          sec.classList.add("hidden");
        }
      });
    }

    if (pageTitle) pageTitle.textContent = targetLink.textContent.trim();

    if (window.innerWidth < 1024) closeAdminSidebar();
  });
}

// تابع اختصاصی برای تغییر منوی فعال در سایدبار
function setActiveNavItem(targetSectionId) {
  const menuLinks = document.querySelectorAll("#admin-menu a");
  menuLinks.forEach((link) => {
    link.classList.remove("bg-white", "text-black-primary", "font-bold");
    link.classList.add("text-white/90", "hover:bg-white/10", "font-semibold");
  });

  const sectionToNavMap = {
    "dashboard-section": "dashboard",
    "orders-section": "orders",
    "order-details-section": "orders",
    "products-section": "products",
    "add-product-section": "products",
    "collections-section": "collections",
    "reviews-section": "reviews",
    "accounting-section": "accounting",
    "settings-section": "settings",
  };

  const activeNavId = sectionToNavMap[targetSectionId];

  if (activeNavId) {
    const activeLink = document.getElementById(activeNavId);
    if (activeLink) {
      activeLink.classList.remove(
        "text-white/90",
        "hover:bg-white/10",
        "font-semibold",
      );
      activeLink.classList.add("bg-white", "text-black-primary", "font-bold");

      if (pageTitle) pageTitle.textContent = activeLink.textContent.trim();
    }
  }
}

// تابع اصلی نمایش سکشن و به‌روزرسانی ناوبری
window.showSection = function (sectionId) {
  if (!canAccessSection(sectionId)) {
    const firstAllowedLink = [...navLinksAdmin].find((link) =>
      canAccessSection(`${link.id}-section`),
    );
    if (firstAllowedLink) window.showSection(`${firstAllowedLink.id}-section`);
    return;
  }

  const sections = document.querySelectorAll("main > section");
  sections.forEach((sec) => sec.classList.add("hidden"));

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.remove("hidden");
  }

  setActiveNavItem(sectionId);
};

// مدیریت کلیک روی دکمه‌های «مدیریت سریع»
const quickLinkBtns = document.querySelectorAll(".quick-link-btn");
quickLinkBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const targetSectionId = btn.getAttribute("data-target");
    if (targetSectionId) {
      window.showSection(targetSectionId);
    }
  });
});
