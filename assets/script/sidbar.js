document.addEventListener("DOMContentLoaded", () => {
  // ==========================================================================
  // بخش دوم: عملکردهای عمومی فروشگاه و لندینگ (MAIN STOREFRONT / LANDING SCRIPTS)
  // ==========================================================================

  // تابع کمکی برای نرمال‌سازی URL و Hash
  function getNormalizedUrlInfo(urlString) {
    if (!urlString) return { path: "", hash: "" };

    try {
      const parsed = new URL(urlString, window.location.origin);
      let path = parsed.pathname.toLowerCase();

      // حذف اسلش انتهای مسیر
      if (path.length > 1 && path.endsWith("/")) {
        path = path.slice(0, -1);
      }

      let hash = parsed.hash === "#" ? "" : parsed.hash.toLowerCase();
      return { path, hash };
    } catch (e) {
      return { path: "", hash: "" };
    }
  }

  // ----------------------------------------------------------------------
  // 1. مدیریت منوی دسکتاپ
  // ----------------------------------------------------------------------
  const desktopNavLinks = document.querySelectorAll(
    ".nav-link:not(#admin-menu .nav-link)",
  );

  function highlightCurrentPageDesktop() {
    const current = getNormalizedUrlInfo(window.location.href);

    desktopNavLinks.forEach((link) => {
      const rawHref = link.getAttribute("href") || "";

      if (!rawHref || rawHref === "#") {
        link.classList.remove("active", "after:w-[50%]", "text-purple1");
        link.classList.add("after:w-0", "text-black-primary");
        return;
      }

      const linkInfo = getNormalizedUrlInfo(link.href);
      const isMatch =
        current.path === linkInfo.path && current.hash === linkInfo.hash;

      if (isMatch) {
        link.classList.add("active", "after:w-[50%]", "text-purple1");
        link.classList.remove(
          "after:w-0",
          "text-black-primary",
          "text-blackPrimary",
        );
      } else {
        link.classList.remove("active", "after:w-[50%]", "text-purple1");
        link.classList.add("after:w-0", "text-black-primary");
      }
    });
  }

  // ----------------------------------------------------------------------
  // 2. مدیریت منوی موبایل
  // ----------------------------------------------------------------------
  const mobileItems = document.querySelectorAll("#mobileMenu ul li");

  function highlightCurrentPageMobile() {
    const current = getNormalizedUrlInfo(window.location.href);

    mobileItems.forEach((item) => {
      const link = item.querySelector("a");
      if (!link) return;

      const rawHref = link.getAttribute("href") || "";

      if (!rawHref || rawHref === "#") {
        item.classList.remove("bg-purple1");
        link.classList.remove("text-white");
        link.classList.add("text-black-primary");
        return;
      }

      const linkInfo = getNormalizedUrlInfo(link.href);
      const isMatch =
        current.path === linkInfo.path && current.hash === linkInfo.hash;

      if (isMatch) {
        item.classList.add("bg-purple1");
        link.classList.remove("text-black-primary", "text-[#272727]");
        link.classList.add("text-white");
      } else {
        item.classList.remove("bg-purple1");
        link.classList.remove("text-white");
        link.classList.add("text-black-primary");
      }
    });
  }

  // اجرا هنگام بارگذاری اولیه و تغییر Hash
  highlightCurrentPageDesktop();
  highlightCurrentPageMobile();

  window.addEventListener("hashchange", () => {
    highlightCurrentPageDesktop();
    highlightCurrentPageMobile();
  });

  // ----------------------------------------------------------------------
  // 3. باز و بستن منوی موبایل (اصلاح‌شده)
  // ----------------------------------------------------------------------
  const mobileMenu = document.getElementById("mobileMenu");
  const overlayPublic = document.getElementById("overlay");
  const openBtnPublic = document.getElementById("openMenu");
  const closeBtnPublic = document.getElementById("closeMenu");

  function openMobileMenu(e) {
    if (e) e.stopPropagation();
    if (!mobileMenu) return;

    mobileMenu.style.right = "0";
    if (overlayPublic) {
      overlayPublic.classList.remove("hidden");
    }
    document.body.classList.add("overflow-hidden");
  }

  function closeMobileMenu(e) {
    if (e) e.stopPropagation();
    if (!mobileMenu) return;

    mobileMenu.style.right = "-100%";
    if (overlayPublic) {
      overlayPublic.classList.add("hidden");
    }
    document.body.classList.remove("overflow-hidden");
  }

  // ثبت ایونت‌ها با بررسی وجود عنصر
  if (openBtnPublic) {
    openBtnPublic.addEventListener("click", openMobileMenu);
  }

  if (closeBtnPublic) {
    closeBtnPublic.addEventListener("click", closeMobileMenu);
  }

  if (overlayPublic) {
    overlayPublic.addEventListener("click", closeMobileMenu);
  }

  // بستن منو پس از کلیک روی گزینه‌ها در موبایل
  mobileItems.forEach((item) => {
    item.addEventListener("click", () => {
      closeMobileMenu();
    });
  });
});
