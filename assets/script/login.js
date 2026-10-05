import { API_BASE_URL, fetchWithAuth } from "./data.js";

// ==========================================================================
// نمایش پیام عدم ورود و هدایت به مودال لاگین
// ==========================================================================
window.showLoginNoticeAndModal = function () {
  let noticeModal = document.getElementById("loginNoticeModal");

  if (!noticeModal) {
    noticeModal = document.createElement("div");
    noticeModal.id = "loginNoticeModal";
    noticeModal.className =
      "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-opacity duration-300";
    noticeModal.innerHTML = `
      <div class="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl border border-gray-100">
        <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-2">هنوز وارد نشده‌اید!</h3>
        <p class="text-sm text-gray-600 mb-4">برای ادامه کار، لطفاً ابتدا وارد حساب کاربری خود شوید.</p>
        <div class="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div class="bg-purple1 h-full w-full animate-pulse"></div>
        </div>
      </div>
    `;
    document.body.appendChild(noticeModal);
  } else {
    noticeModal.classList.remove("hidden");
  }

  document.body.classList.add("overflow-hidden");

  setTimeout(() => {
    noticeModal.classList.add("hidden");
    const authModal = document.getElementById("authModal");
    if (authModal) {
      authModal.classList.remove("hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }, 2000);
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.protocol === "file:") {
    console.warn(
      "This storefront must be served over http:// or https:// to call the API correctly.",
    );
    const fileProtocolLoginError = document.getElementById("loginError");
    if (fileProtocolLoginError) {
      fileProtocolLoginError.textContent =
        "برای ورود و بارگذاری محصولات، پروژه باید از طریق localhost/http اجرا شود.";
      fileProtocolLoginError.classList.remove("hidden");
    }
  }

  // المان‌های احراز هویت
  const desktopAuthBtn = document.getElementById("desktopAuthBtn");
  const userProfileWrapper = document.getElementById("userProfileWrapper");
  const profileBtn = document.getElementById("desktopUserProfile");
  const profileLabel = profileBtn?.querySelector("[data-profile-label]");
  const profileIcon = profileBtn?.querySelector("[data-profile-icon]");
  const hasExpandableProfile = Boolean(profileLabel && profileIcon);
  const userMenuDropdown = document.getElementById("userMenuDropdown");
  const chevron = document.getElementById("profileChevron");

  const mobileAuthBtn = document.getElementById("mobileAuthBtn");
  const mobileUserProfile = document.getElementById("mobileUserProfile");

  // المان‌های مودال
  const authModal = document.getElementById("authModal");
  const closeAuthModalBtn = document.getElementById("closeAuthModal");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const loginSubmitBtn = loginForm?.querySelector('button[type="submit"]');
  const registerForm = document.getElementById("registerForm");
  const loginError = document.getElementById("loginError");
  const registerError = document.getElementById("registerError");
  const switchToRegister = document.getElementById("switchToRegister");
  const switchToLogin = document.getElementById("switchToLogin");
  const openAuthBtns = document.querySelectorAll(".openAuthModal");

  // المان‌های نمایش پروفایل
  const userInitialEls = document.querySelectorAll(".userInitial");
  const userNameEls = document.querySelectorAll(".userName");
  const userPhoneEl = document.getElementById("userPhone");

  function updateProfileCompletion(user) {
    const fields = [
      user.name || user.customer_name || user.full_name,
      user.mobile || user.phone,
      user.national_code || user.national_id || user.nationalId,
      user.birthdate || user.birth_date,
      user.province,
      user.city,
      user.postal_code || user.postalCode,
      user.full_address || user.address,
    ];
    const completedFields = fields.filter((value) =>
      String(value ?? "").trim(),
    ).length;
    const percentage = Math.round((completedFields / fields.length) * 100);
    const percentageLabel = `${percentage.toLocaleString("fa-IR")}٪`;
    const progressColor =
      percentage === 100
        ? "green"
        : percentage >= 50
          ? "yellow"
          : "red";
    const progressBarColor = {
      red: "bg-red-500",
      yellow: "bg-yellow-500",
      green: "bg-green-500",
    }[progressColor];
    const progressBarColors = [
      "bg-red-500",
      "bg-yellow-500",
      "bg-green-500",
      "bg-purple1",
    ];
    const progressTextColors = [
      "text-red-600",
      "text-yellow-600",
      "text-green-600",
      "text-purple1",
    ];
    const progressTextColor = {
      red: "text-red-600",
      yellow: "text-yellow-600",
      green: "text-green-600",
    }[progressColor];

    document.querySelectorAll("[data-profile-progress]").forEach((progress) => {
      progress.setAttribute("aria-valuenow", String(percentage));
      progress.setAttribute("aria-valuetext", percentageLabel);
    });
    document
      .querySelectorAll("[data-profile-completion-bar]")
      .forEach((progressBar) => {
        progressBar.style.width = `${percentage}%`;
        progressBar.classList.remove(...progressBarColors);
        progressBar.classList.add(progressBarColor);
      });
    document
      .querySelectorAll("[data-profile-completion-value]")
      .forEach((progressValue) => {
        progressValue.textContent = percentageLabel;
        progressValue.classList.remove(...progressTextColors);
        progressValue.classList.add(progressTextColor);
      });
  }

  function clearAuthState() {
    ["user", "userData", "token", "userRole", "currentLoggedInAdmin"].forEach(
      (key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      },
    );
    window.dispatchEvent(new Event("authstatechange"));
  }

  // 1. بررسی وضعیت لاگین و نمایش/مخفی‌سازی بخش‌ها
  async function checkAuthStatus() {
    const token = localStorage.getItem("token");

    const userRaw =
      sessionStorage.getItem("user") ||
      sessionStorage.getItem("userData") ||
      localStorage.getItem("user") ||
      localStorage.getItem("userData");
    let user = userRaw ? JSON.parse(userRaw) : null;

    if (token) {
      // نمایش پروفایل و مخفی کردن دکمه ورود/ثبت‌نام
      if (desktopAuthBtn) {
        desktopAuthBtn.classList.remove("lg:flex", "flex");
        desktopAuthBtn.classList.add("hidden");
      }
      if (mobileAuthBtn) {
        mobileAuthBtn.classList.remove("flex");
        mobileAuthBtn.classList.add("hidden");
      }

      if (userProfileWrapper) {
        userProfileWrapper.classList.remove("hidden");
      }
      if (mobileUserProfile) {
        mobileUserProfile.classList.remove("hidden");
        mobileUserProfile.classList.add("flex");
      }

      // آپدیت اولیه بر اساس اطلاعات ذخیره‌شده
      if (user) {
        updateUserUI(user);
      }

      // دریافت پروفایل به‌روز از API فقط در صورت وجود توکن معتبر
      try {
        const res = await fetchWithAuth("/profile", {
          method: "GET",
        });
        const apiUser = res?.data ?? res?.user ?? res ?? null;
        if (apiUser && apiUser !== null && typeof apiUser === "object") {
          localStorage.setItem("user", JSON.stringify(apiUser));
          localStorage.setItem("userData", JSON.stringify(apiUser));
          updateUserUI(apiUser);
        }
      } catch (err) {
        console.warn("استفاده از اطلاعات محلی کاربر به دلیل خطا در شبکه:", err);
      }
    } else {
      // مخفی کردن کامل پروفایل و نمایش دکمه ورود/ثبت‌نام
      if (desktopAuthBtn) {
        desktopAuthBtn.classList.add("hidden", "lg:flex");
      }
      if (mobileAuthBtn) {
        mobileAuthBtn.classList.remove("hidden");
      }

      if (userProfileWrapper) {
        userProfileWrapper.classList.add("hidden");
      }
      if (mobileUserProfile) {
        mobileUserProfile.classList.add("hidden");
        mobileUserProfile.classList.remove("flex");
      }
      if (userMenuDropdown) {
        userMenuDropdown.classList.add("hidden");
      }
      profileBtn?.setAttribute("aria-expanded", "false");
    }
  }

  // 2. بروزرسانی اطلاعات متنی کاربر در DOM
  function updateUserUI(user) {
    const name =
      user.full_name ||
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.name ||
      user.customer_name ||
      user.mobile ||
      "کاربر گرامی";
    const mobile = user.mobile || user.phone || "---";
    const initial = name.trim().charAt(0).toUpperCase() || "ک";

    userNameEls.forEach((el) => (el.textContent = name));
    userInitialEls.forEach((el) => (el.textContent = initial));
    if (profileLabel) profileLabel.textContent = name;
    profileBtn?.setAttribute("title", name);
    if (userPhoneEl) userPhoneEl.textContent = mobile;
    updateProfileCompletion(user);
  }

  // 3. مدیریت کلیک دکمه پروفایل و باز/بسته شدن دراپ‌داون
  if (profileBtn && userMenuDropdown) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = userMenuDropdown.classList.contains("hidden");

      if (isHidden) {
        if (hasExpandableProfile) {
          profileBtn.classList.remove("w-10", "px-0");
          profileBtn.classList.add("w-48", "px-3");
          profileLabel.classList.remove("hidden");
          profileIcon.classList.add("hidden");
        }
        userMenuDropdown.classList.remove("hidden");
        profileBtn.setAttribute("aria-expanded", "true");
        if (chevron) chevron.style.transform = "rotate(180deg)";
        document.querySelectorAll("[data-search-toggle]").forEach((toggle) => {
          const searchForm = toggle.closest("[data-product-search-form]");
          const searchInput = searchForm?.querySelector('input[name="search"]');
          searchForm?.classList.remove("w-64", "px-3");
          searchForm?.classList.add("w-10", "px-0");
          searchInput?.classList.add("hidden");
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", "باز کردن جست‌وجو");
        });
      } else {
        if (hasExpandableProfile) {
          profileBtn.classList.remove("w-48", "px-3");
          profileBtn.classList.add("w-10", "px-0");
          profileLabel.classList.add("hidden");
          profileIcon.classList.remove("hidden");
        }
        userMenuDropdown.classList.add("hidden");
        profileBtn.setAttribute("aria-expanded", "false");
        if (chevron) chevron.style.transform = "rotate(0deg)";
      }
    });

    document.addEventListener("click", (e) => {
      if (userProfileWrapper && !userProfileWrapper.contains(e.target)) {
        if (hasExpandableProfile) {
          profileBtn.classList.remove("w-48", "px-3");
          profileBtn.classList.add("w-10", "px-0");
          profileLabel.classList.add("hidden");
          profileIcon.classList.remove("hidden");
        }
        userMenuDropdown.classList.add("hidden");
        profileBtn.setAttribute("aria-expanded", "false");
        if (chevron) chevron.style.transform = "rotate(0deg)";
      }
    });
  }

  // 4. منطق مسیرهای ورود/خروج
  function getAdminPath() {
    const pathname = window.location.pathname;
    if (pathname.includes("/admin/")) return "./index.html";

    const segments = pathname.split("/").filter(Boolean);
    const isNestedPage =
      segments.length > 0 && segments[segments.length - 1] !== "index.html";

    return isNestedPage ? "../admin/index.html" : "./admin/index.html";
  }

  function getMainPagePath() {
    return window.location.pathname.includes("/admin/")
      ? "../index.html"
      : "./index.html";
  }

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

  function getRoleValueFromUser(user) {
    if (!user || typeof user !== "object") return "";

    const role =
      user.role ||
      user.user_role ||
      user.userRole ||
      user.type ||
      user.account_type ||
      user.role_name ||
      user.permission_level ||
      "";

    if (role && String(role).toLowerCase() !== "user") return String(role);

    if (
      user.is_admin === true ||
      user.admin === true ||
      user.isAdmin === true
    ) {
      return "admin";
    }

    return "";
  }

  function isAdminSession() {
    const token = localStorage.getItem("token");

    const user = getStoredUser();
    const savedRole =
      sessionStorage.getItem("userRole") ||
      localStorage.getItem("userRole") ||
      "";
    const role =
      savedRole ||
      getRoleValueFromUser(user) ||
      user?.role ||
      user?.user_role ||
      "";

    return Boolean(
      token &&
      (String(role).toLowerCase() === "admin" ||
        String(role).toLowerCase() === "super_admin" ||
        String(role).toLowerCase() === "manager" ||
        user?.is_admin === true ||
        user?.admin === true ||
        user?.isAdmin === true),
    );
  }

  function enforceAdminPanelRestrictions() {
    if (window.location.pathname.includes("/admin/")) {
      if (!isAdminSession()) {
        window.location.replace(getMainPagePath());
        return;
      }

      const blockBackNavigation = () => {
        history.pushState(null, "", window.location.href);
      };

      blockBackNavigation();
      window.addEventListener("popstate", () => {
        blockBackNavigation();
        window.location.replace(window.location.href);
      });
      return;
    }

    if (isAdminSession()) {
      window.location.replace(getAdminPath());
    }
  }

  function performLogout() {
    clearAuthState();

    if (window.location.pathname.includes("/admin/")) {
      window.location.replace(getMainPagePath());
    } else {
      checkAuthStatus();
    }
  }

  document.addEventListener("click", (e) => {
    const target = e.target.closest("a, button");
    if (!target) return;

    const id = target.id || "";
    const text = target.innerText?.trim() || "";

    if (
      id === "logoutBtn" ||
      id === "mobileLogoutBtn" ||
      id === "adminLogoutBtn" ||
      text.includes("خروج از حساب")
    ) {
      e.preventDefault();
      performLogout();
    }
  });

  // 5. مدیریت مودال ورود / ثبت‌نام
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
      loginError.classList.remove("text-green-600");
      loginError.classList.add("text-purple1");
    }
    if (registerError) {
      registerError.innerText = "";
      registerError.classList.add("hidden");
    }
  }

  function normalizeDigits(value) {
    return String(value || "")
      .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
      .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
      .trim();
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

  openAuthBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showModal();
    });
  });

  if (window.location.hash === "#login") {
    showModal();
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  closeAuthModalBtn?.addEventListener("click", hideModal);
  tabLogin?.addEventListener("click", switchToLoginTab);
  tabRegister?.addEventListener("click", switchToRegisterTab);
  switchToRegister?.addEventListener("click", switchToRegisterTab);
  switchToLogin?.addEventListener("click", switchToLoginTab);

  authModal?.addEventListener("click", (e) => {
    if (e.target === authModal) hideModal();
  });

  // 6. فرم ثبت‌نام
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById("regFullName")?.value.trim() || "";
    const mobile = normalizeDigits(
      document.getElementById("regMobile")?.value ||
        document.getElementById("regPhone")?.value,
    );
    const email =
      document.getElementById("regEmail")?.value.trim() ||
      document.getElementById("regUsername")?.value.trim() ||
      "";
    const password = document.getElementById("regPassword")?.value || "";
    const passwordConfirm =
      document.getElementById("regPasswordConfirm")?.value || "";

    if (password !== passwordConfirm) {
      if (registerError) {
        registerError.innerText = "تکرار رمز عبور صحیح نیست.";
        registerError.classList.remove("hidden");
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile, password }),
      });
      const data = await response.json();

      if (response.ok && (data.status === "true" || data.status === true)) {
        switchToLoginTab();
        if (loginError) {
          loginError.innerText = "ثبت‌نام با موفقیت انجام شد؛ اکنون وارد شوید.";
          loginError.classList.remove("hidden");
          loginError.classList.add("text-green-600");
        }
      } else if (registerError) {
        registerError.innerText = data.message || "ثبت‌نام انجام نشد.";
        registerError.classList.remove("hidden");
      }
    } catch (err) {
      console.error(err);
      if (registerError) {
        registerError.innerText = "خطا در ارتباط با سرور.";
        registerError.classList.remove("hidden");
      }
    }
  });

  // 7. فرم لاگین
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const mobileInput = normalizeDigits(
      (
        document.getElementById("loginUsername") ||
        document.getElementById("loginMobile") ||
        loginForm.querySelector('input[type="tel"]') ||
        loginForm.querySelector('input[type="text"]')
      )?.value,
    );

    const passwordInput =
      (
        document.getElementById("loginPassword") ||
        loginForm.querySelector('input[type="password"]')
      )?.value.trim() || "";

    if (!mobileInput || !passwordInput) {
      if (loginError) {
        loginError.innerText = "لطفاً تمامی فیلدها را وارد کنید.";
        loginError.classList.remove("hidden");
      }
      return;
    }

    try {
      if (loginSubmitBtn) loginSubmitBtn.disabled = true;

      const loginPayloadVariants = [
        { mobile: mobileInput, password: passwordInput },
      ];

      let finalData = null;
      let finalResponse = null;
      let lastErrorMessage = "اطلاعات ورود اشتباه است.";

      for (let i = 0; i < loginPayloadVariants.length; i += 1) {
        const payload = loginPayloadVariants[i];

        try {
          const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await response.json().catch(() => null);
          finalResponse = response;
          finalData = data;

          if (response.ok) {
            if (
              data &&
              (data.status === "success" ||
                data.token ||
                data.access_token ||
                data.status === true ||
                data.user ||
                data.data)
            ) {
              break;
            }
          }

          if (response.status === 401 || response.status === 400) {
            lastErrorMessage =
              data?.message ||
              data?.error ||
              "شماره همراه یا رمز عبور اشتباه است.";
            continue;
          }

          if (response.status === 429) {
            lastErrorMessage =
              "تعداد تلاش‌ها زیاد است؛ لطفاً کمی بعد دوباره تلاش کنید.";
            break;
          }

          lastErrorMessage =
            data?.message || data?.error || "خطا در ورود به حساب.";
        } catch (err) {
          console.warn("درخواست ورود ناموفق بود:", err);
          lastErrorMessage = "خطا در ارتباط با سرور.";
        }

        if (i < loginPayloadVariants.length - 1) {
          continue;
        }
      }

      if (!finalResponse || !finalData) {
        throw new Error("پاسخ نامعتبر از سرور دریافت شد");
      }

      const data = finalData;

      if (
        finalResponse.ok &&
        (data.status === "success" ||
          data.token ||
          data.access_token ||
          data.status === true ||
          data.data ||
          data.user)
      ) {
        const nestedData = data.data || {};
        const token =
          data.token ||
          data.access_token ||
          data.auth_token ||
          nestedData.token ||
          nestedData.access_token ||
          nestedData.auth_token ||
          data.user?.token ||
          data.user?.access_token ||
          "";

        if (token) {
          localStorage.setItem("token", token);
          sessionStorage.removeItem("token");
          window.dispatchEvent(new Event("authstatechange"));
        }

        const user =
          data.user ||
          nestedData.user ||
          nestedData.profile ||
          nestedData.data ||
          data.profile ||
          data.data ||
          null;

        const normalizedUserForRole =
          typeof user === "string" ? JSON.parse(user) : user || {};
        const inferredRoleFromResponse = getRoleValueFromUser(
          normalizedUserForRole,
        );
        const responseRole = String(
          data?.role ||
            data?.user?.role ||
            data?.data?.role ||
            data?.profile?.role ||
            normalizedUserForRole?.role ||
            "",
        ).toLowerCase();
        const isAdminLogin =
          responseRole === "admin" ||
          responseRole === "super_admin" ||
          responseRole === "manager" ||
          String(inferredRoleFromResponse).toLowerCase() === "admin" ||
          String(inferredRoleFromResponse).toLowerCase() === "super_admin" ||
          String(inferredRoleFromResponse).toLowerCase() === "manager" ||
          normalizedUserForRole?.is_admin === true ||
          normalizedUserForRole?.admin === true ||
          normalizedUserForRole?.isAdmin === true ||
          data.user?.is_admin === true ||
          data.data?.is_admin === true ||
          data.profile?.is_admin === true ||
          data.is_admin === true ||
          data.admin === true;

        if (token && isAdminLogin) {
          sessionStorage.setItem("userRole", "admin");
          localStorage.setItem("userRole", "admin");
        }

        if (user) {
          const normalizedUser =
            typeof user === "string" ? JSON.parse(user) : user;
          sessionStorage.setItem("user", JSON.stringify(normalizedUser));
          sessionStorage.setItem("userData", JSON.stringify(normalizedUser));
          localStorage.setItem("user", JSON.stringify(normalizedUser));
          localStorage.setItem("userData", JSON.stringify(normalizedUser));

          const role = getRoleValueFromUser(normalizedUser);
          if (role) {
            sessionStorage.setItem("userRole", String(role));
            localStorage.setItem("userRole", String(role));
          }
        }

        const inferredRole =
          sessionStorage.getItem("userRole") ||
          localStorage.getItem("userRole") ||
          String(
            data?.role ||
              data?.user?.role ||
              data?.data?.role ||
              data?.profile?.role ||
              data?.user?.user_role ||
              data?.data?.user_role ||
              data?.profile?.user_role ||
              "",
          ) ||
          getRoleValueFromUser(data.user || data.data || data.profile) ||
          getRoleValueFromUser(data) ||
          "";

        if (
          String(inferredRole).toLowerCase() === "admin" ||
          String(inferredRole).toLowerCase() === "super_admin" ||
          String(inferredRole).toLowerCase() === "manager" ||
          data.user?.is_admin === true ||
          data.data?.is_admin === true ||
          data.profile?.is_admin === true ||
          data.is_admin === true ||
          data.admin === true ||
          isAdminLogin
        ) {
          if (!sessionStorage.getItem("userRole") && inferredRole) {
            sessionStorage.setItem("userRole", String(inferredRole));
          }
          window.location.href = getAdminPath();
          return;
        }

        checkAuthStatus();
        hideModal();
      } else {
        if (loginError) {
          loginError.innerText = lastErrorMessage;
          loginError.classList.remove("hidden");
        }
      }
    } catch (err) {
      console.error(err);
      if (loginError) {
        loginError.innerText =
          "خطا در ارتباط با سرور یا اطلاعات ورود نامعتبر است.";
        loginError.classList.remove("hidden");
      }
    } finally {
      if (loginSubmitBtn) loginSubmitBtn.disabled = false;
    }
  });

  // اجرای بررسی وضعیت احراز هویت در ابتدا
  checkAuthStatus();
  enforceAdminPanelRestrictions();
});
