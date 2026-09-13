import { adminUsersList, registeredUsers } from "./data.js";

document.addEventListener("DOMContentLoaded", () => {
  let currentLoggedInAdmin = null;

  // المان‌های مربوط به پروفایل و احراز هویت
  const desktopAuthBtn = document.getElementById("desktopAuthBtn");
  const desktopUserProfile = document.getElementById("desktopUserProfile");
  const mobileAuthBtn = document.getElementById("mobileAuthBtn");
  const mobileUserProfile = document.getElementById("mobileUserProfile");
  const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

  // المان‌های مودال احراز هویت
  const authModal = document.getElementById("authModal");
  const closeAuthModalBtn = document.getElementById("closeAuthModal");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginError = document.getElementById("loginError");
  const registerError = document.getElementById("registerError");
  const switchToRegister = document.getElementById("switchToRegister");
  const switchToLogin = document.getElementById("switchToLogin");
  const openAuthBtns = document.querySelectorAll(".openAuthModal");

  // --- مدیریت وضعیت ورود / خروج در UI ---
  function checkAuthStatus() {
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;

    if (user && (user.fullName || user.username)) {
      const displayName = user.fullName || user.username;
      const initial = displayName.charAt(0).toUpperCase();

      // مخفی کردن دکمه‌های ورود
      if (desktopAuthBtn) desktopAuthBtn.classList.add("hidden");
      if (mobileAuthBtn) mobileAuthBtn.classList.add("hidden");

      // نمایش پروفایل‌ها
      if (desktopUserProfile) {
        desktopUserProfile.classList.remove("hidden");
        desktopUserProfile.classList.add("flex");
      }
      if (mobileUserProfile) {
        mobileUserProfile.classList.remove("hidden");
        mobileUserProfile.classList.add("flex");
      }

      // به‌روزرسانی نام و کاراکتر اول
      document.querySelectorAll(".userName").forEach((el) => {
        el.textContent = displayName;
      });
      document.querySelectorAll(".userInitial").forEach((el) => {
        el.textContent = initial;
      });
    } else {
      // نمایش دکمه‌های ورود
      if (desktopAuthBtn) {
        desktopAuthBtn.classList.remove("hidden");
        desktopAuthBtn.classList.add("lg:flex");
      }
      if (mobileAuthBtn) mobileAuthBtn.classList.remove("hidden");

      // مخفی کردن پروفایل‌ها
      if (desktopUserProfile) {
        desktopUserProfile.classList.add("hidden");
        desktopUserProfile.classList.remove("flex");
      }
      if (mobileUserProfile) {
        mobileUserProfile.classList.add("hidden");
        mobileUserProfile.classList.remove("flex");
      }
    }
  }

  // رویداد دکمه خروج موبایل
  mobileLogoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("user");
    checkAuthStatus();
  });

  // --- تابع مسیردهی دقیق ادمین ---
  function getAdminPath() {
    const pathname = window.location.pathname;

    if (pathname.includes("/admin/")) {
      return "./index.html";
    }

    const segments = pathname.split("/").filter(Boolean);

    if (segments.length > 0 && segments[segments.length - 1] === "index.html") {
      segments.pop();
    }

    const isRoot =
      segments.length === 0 ||
      segments[segments.length - 1] === "127.0.0.1:5500";

    if (isRoot) {
      return "./admin/index.html";
    } else {
      return "../admin/index.html";
    }
  }

  // بستن ایمن منوی موبایل
  function closeMobileMenuSafe() {
    const mobileMenu = document.getElementById("mobileMenu");
    const overlay = document.getElementById("overlay");
    if (mobileMenu) mobileMenu.style.right = "-100%";
    if (overlay) overlay.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  // توابع نمایش/مخفی‌سازی مودال
  function showModal() {
    if (!authModal) return;
    authModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    switchToLoginTab();
  }

  function hideModal() {
    if (!authModal) return;
    authModal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    clearErrors();
  }

  function clearErrors() {
    if (loginError) {
      loginError.innerText = "";
      loginError.classList.add("hidden");
    }
    if (registerError) {
      registerError.innerText = "";
      registerError.classList.add("hidden");
    }
  }

  function switchToLoginTab() {
    clearErrors();
    loginForm?.classList.remove("hidden");
    registerForm?.classList.add("hidden");
    tabLogin?.classList.add("text-purple1", "border-b-2", "border-purple1");
    tabLogin?.classList.remove("text-gray-400");
    tabRegister?.classList.remove(
      "text-purple1",
      "border-b-2",
      "border-purple1",
    );
    tabRegister?.classList.add("text-gray-400");
  }

  function switchToRegisterTab() {
    clearErrors();
    registerForm?.classList.remove("hidden");
    loginForm?.classList.add("hidden");
    tabRegister?.classList.add("text-purple1", "border-b-2", "border-purple1");
    tabRegister?.classList.remove("text-gray-400");
    tabLogin?.classList.remove("text-purple1", "border-b-2", "border-purple1");
    tabLogin?.classList.add("text-gray-400");
  }

  // شنونده کلیک دکمه‌های باز کردن مودال ورود
  openAuthBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMobileMenuSafe();
      showModal();
    });
  });

  closeAuthModalBtn?.addEventListener("click", hideModal);
  tabLogin?.addEventListener("click", switchToLoginTab);
  tabRegister?.addEventListener("click", switchToRegisterTab);
  switchToRegister?.addEventListener("click", switchToRegisterTab);
  switchToLogin?.addEventListener("click", switchToLoginTab);

  authModal?.addEventListener("click", (e) => {
    if (e.target === authModal) hideModal();
  });

  // --- پردازش فرم ورود ---
  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();

    const usernameInput = document
      .getElementById("loginUsername")
      ?.value.trim();
    const passwordInput = document
      .getElementById("loginPassword")
      ?.value.trim();

    // ۱. بررسی ورود ادمین
    const foundAdmin = adminUsersList.find(
      (admin) =>
        admin.username === usernameInput && admin.password === passwordInput,
    );

    if (foundAdmin) {
      currentLoggedInAdmin = { ...foundAdmin };
      localStorage.setItem("user", JSON.stringify(currentLoggedInAdmin));
      window.location.href = getAdminPath();
      return;
    }

    // ۲. بررسی ورود کاربر عادی
    const foundUser = registeredUsers.find(
      (user) =>
        user.username === usernameInput && user.password === passwordInput,
    );

    if (foundUser) {
      localStorage.setItem("user", JSON.stringify(foundUser));
      checkAuthStatus();
      hideModal();
      return;
    }

    // ۳. اگر کاربر پیدا نشد
    if (loginError) {
      loginError.innerText =
        "کاربری با این مشخصات یافت نشد! لطفا ابتدا ثبت نام کنید.";
      loginError.classList.remove("hidden");
    }

    setTimeout(() => {
      switchToRegisterTab();
      const regUsername = document.getElementById("regUsername");
      if (regUsername) regUsername.value = usernameInput || "";
    }, 1500);
  });

  // --- پردازش فرم ثبت‌نام ---
  registerForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();

    const fullNameInput = document.getElementById("regFullName")?.value.trim();
    const usernameInput = document.getElementById("regUsername")?.value.trim();
    const passwordInput = document.getElementById("regPassword")?.value.trim();

    const existsInAdmins = adminUsersList.some(
      (admin) => admin.username === usernameInput,
    );
    const existsInUsers = registeredUsers.some(
      (user) => user.username === usernameInput,
    );

    if (existsInAdmins || existsInUsers) {
      if (registerError) {
        registerError.innerText = "این نام کاربری قبلاً ثبت شده است!";
        registerError.classList.remove("hidden");
      }
      return;
    }

    const newUser = {
      fullName: fullNameInput,
      username: usernameInput,
      password: passwordInput,
    };

    registeredUsers.push(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));

    checkAuthStatus();
    hideModal();
    registerForm.reset();
  });

  // بررسی وضعیت لاگین به محض بارگذاری صفحه
  checkAuthStatus();
});
