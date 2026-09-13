// ۱. مدیریت سایدبار / منوی کشویی ادمین (موبایل و تبلت)
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
// ۲. مدیریت تعویض تب‌ها (Sections) و عنوان صفحه
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
