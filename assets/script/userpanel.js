import { fetchWithAuth, resolveProductImagePath } from "./data.js";
import { getFavoriteProducts, registerFavoriteProduct } from "./favorites.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function renderFavoriteProducts() {
  const favoritesList = document.getElementById("favoritesList");
  if (!favoritesList) return;

  const favorites = getFavoriteProducts();
  if (!favorites.length) {
    favoritesList.innerHTML = `
      <p class="col-span-full py-8 text-center text-sm text-gray-500">
        هنوز محصولی به علاقه‌مندی‌ها اضافه نشده است.
      </p>
    `;
    return;
  }

  favorites.forEach(registerFavoriteProduct);
  favoritesList.innerHTML = favorites
    .map((product) => {
      const productId = encodeURIComponent(product.id);
      const image = escapeHtml(resolveProductImagePath(product.image || ""));
      const title = escapeHtml(product.title);
      const brand = escapeHtml(product.brand);
      const price = new Intl.NumberFormat("en-US").format(
        Number(product.price) || 0,
      );

      return `
        <article class="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 p-3">
          <a href="../details/index.html?id=${productId}" class="flex min-w-0 flex-1 items-center gap-3">
            <img src="${image}" alt="${title}" class="h-16 w-16 shrink-0 rounded bg-yasi object-contain p-1" />
            <span class="min-w-0">
              <span class="block truncate text-sm font-bold text-black-primary">${title}</span>
              <span class="mt-1 block truncate text-xs text-gray-400">${brand}</span>
              <span class="mt-1 block text-xs font-bold text-purple1">${price} تومان</span>
            </span>
          </a>
          <button type="button" class="favorite-toggle-btn shrink-0 rounded-full p-2 text-purple1" data-product-id="${escapeHtml(product.id)}" aria-label="حذف از علاقه‌مندی‌ها" aria-pressed="true">
            <svg class="h-5 w-5 fill-purple1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
          </button>
        </article>
      `;
    })
    .join("");
}

function normalizeOrdersPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["data", "orders", "result", "items", "payload"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nestedOrders = normalizeOrdersPayload(value);
      if (nestedOrders.length) return nestedOrders;
    }
  }

  return [];
}

function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
        localStorage.getItem("userData") ||
        sessionStorage.getItem("user") ||
        sessionStorage.getItem("userData") ||
        "null",
    );
  } catch {
    return null;
  }
}

const orderStatusLabels = {
  processing: "در حال پردازش",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  canceled: "لغو شده",
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
  unpaid: "پرداخت نشده",
  completed: "تکمیل شده",
};

function isUnpaidOrder(order) {
  const status = String(order.payment_status || order.status || "")
    .trim()
    .toLowerCase();
  return [
    "pending",
    "unpaid",
    "awaiting_payment",
    "waiting_for_payment",
  ].includes(status);
}

function getOrderItems(order, depth = 0) {
  if (!order || typeof order !== "object" || depth > 4) return [];
  for (const key of ["items", "order_items", "products"]) {
    if (Array.isArray(order[key])) return order[key];
    if (order[key] && typeof order[key] === "object") {
      const nestedItems = getOrderItems(order[key], depth + 1);
      if (nestedItems.length) return nestedItems;
    }
  }
  for (const key of ["data", "order", "result", "payload"]) {
    const nestedItems = getOrderItems(order[key], depth + 1);
    if (nestedItems.length) return nestedItems;
  }
  return [];
}

function getOrderVariantId(item) {
  return (
    item.variant_id ??
    item.variant?.id ??
    item.variant?.variant_id ??
    item.product?.variant_id ??
    null
  );
}

function getCartItems(payload, depth = 0) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object" || depth > 4) return [];
  for (const key of ["items", "cart", "data", "result", "payload"]) {
    const items = getCartItems(payload[key], depth + 1);
    if (items.length) return items;
  }
  return [];
}

function getUserToken() {
  return localStorage.getItem("token");
}

function redirectToLogin() {
  window.location.replace("../index.html#login");
}

function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userData");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("userData");

  redirectToLogin();
}

document.addEventListener("click", (event) => {
  if (!event.target.closest("#logoutBtn")) return;
  event.preventDefault();
  logoutUser();
});

document.addEventListener("DOMContentLoaded", () => {
  if (!getUserToken()) {
    redirectToLogin();
    return;
  }

  async function fetchCurrentProfile() {
    try {
      const storedUser = getStoredUser();
      const response = await fetchWithAuth("/profile", { method: "GET" });
      if (response?.status === false) return null;

      const profile = response?.data ?? response?.user ?? response ?? null;
      if (!profile || typeof profile !== "object") return null;

      const normalizedProfile = {
        ...profile,
        name:
          profile.name ||
          profile.customer_name ||
          profile.full_name ||
          storedUser?.name ||
          "",
        mobile: profile.mobile || profile.phone || storedUser?.mobile || "",
      };
      localStorage.setItem("user", JSON.stringify(normalizedProfile));
      localStorage.setItem("userData", JSON.stringify(normalizedProfile));
      return normalizedProfile;
    } catch (error) {
      console.warn(
        "Profile fetch failed, falling back to local storage:",
        error,
      );
      return null;
    }
  }

  window.addEventListener("pageshow", () => {
    if (!getUserToken()) redirectToLogin();
  });

  const userPanelSidebar = document.getElementById("userPanelSidebar");
  const userPanelOverlay = document.getElementById("userPanelOverlay");
  const openUserPanelMenuButton = document.getElementById("openUserPanelMenu");
  let userPanelOverlayTimer;

  function setUserPanelMenuOpen(isOpen) {
    clearTimeout(userPanelOverlayTimer);
    if (isOpen) {
      userPanelSidebar?.classList.remove("translate-x-full");
      userPanelOverlay?.classList.remove("hidden");
      userPanelOverlayTimer = setTimeout(
        () => userPanelOverlay?.classList.add("opacity-100"),
        10,
      );
      document.body.classList.add("overflow-hidden");
    } else {
      userPanelSidebar?.classList.add("translate-x-full");
      userPanelOverlay?.classList.remove("opacity-100");
      userPanelOverlayTimer = setTimeout(
        () => userPanelOverlay?.classList.add("hidden"),
        300,
      );
      document.body.classList.remove("overflow-hidden");
    }
    userPanelOverlay?.setAttribute("aria-hidden", String(!isOpen));
    openUserPanelMenuButton?.setAttribute("aria-expanded", String(isOpen));
  }

  openUserPanelMenuButton?.addEventListener("click", () => {
    setUserPanelMenuOpen(true);
    document.querySelector("#tabButtons .tab-btn")?.focus();
  });
  userPanelOverlay?.addEventListener("click", () =>
    setUserPanelMenuOpen(false),
  );
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      window.innerWidth < 1024 &&
      !userPanelSidebar?.classList.contains("translate-x-full")
    ) {
      setUserPanelMenuOpen(false);
      openUserPanelMenuButton?.focus();
    }
  });

  document
    .getElementById("backToPreviousPage")
    ?.addEventListener("click", () => {
      const referrer = document.referrer;
      const sameSiteReferrer =
        referrer && new URL(referrer).origin === window.location.origin;

      if (sameSiteReferrer && window.history.length > 1) {
        window.history.back();
      } else {
        window.location.replace("../index.html");
      }
    });

  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");
      if (
        window.innerWidth < 1024 &&
        !userPanelSidebar?.classList.contains("translate-x-full")
      ) {
        setUserPanelMenuOpen(false);
      }
      tabButtons.forEach((tabButton) => {
        tabButton.classList.remove("bg-yasi", "text-purple1", "font-bold");
        tabButton.classList.add("text-gray-main", "font-medium");
      });
      button.classList.add("bg-yasi", "text-purple1", "font-bold");
      button.classList.remove("text-gray-main", "font-medium");

      tabContents.forEach((content) => {
        content.classList.toggle(
          "hidden",
          content.id !== `${targetTab}Content`,
        );
      });
    });
  });

  function activateTabFromHash() {
    const hash = window.location.hash.replace("#", "");
    const targetButton = hash
      ? document.querySelector(`.tab-btn[data-tab="${hash}"]`)
      : tabButtons[0];
    (targetButton || tabButtons[0])?.click();
  }

  activateTabFromHash();
  window.addEventListener("hashchange", activateTabFromHash);
  renderFavoriteProducts();
  window.addEventListener("favoriteschange", renderFavoriteProducts);

  // 3. لیست استان‌ها و شهرهای ایران
  const iranProvincesAndCities = {
    تهران: [
      "تهران",
      "شهریار",
      "اسلام‌شهر",
      "قدس",
      "ملارد",
      "ورامین",
      "ری",
      "دماوند",
      "پردیس",
      "فیروزکوه",
    ],
    اصفهان: [
      "اصفهان",
      "کاشان",
      "خمینی‌شهر",
      "نجف‌آباد",
      "شاهین‌شهر",
      "شهرضا",
      "سمیرم",
      "فولادشهر",
      "مبارکه",
    ],
    فارس: ["شیراز", "مرودشت", "جهرم", "فسا", "کازرون", "لار", "داراب", "آباده"],
    "خراسان رضوی": [
      "مشهد",
      "نیشابور",
      "سبزوار",
      "تربت حیدریه",
      "قوچان",
      "کاشمر",
    ],
    "آذربایجان شرقی": ["تبریز", "مراغه", "مرند", "میانه", "اهر", "بناب"],
    خوزستان: ["اهواز", "دزفول", "آبادان", "خرمشهر", "ماهشهر", "ایذه", "شوشتر"],
    مازندران: [
      "ساری",
      "بابل",
      "آمل",
      "قائم‌شهر",
      "بهشهر",
      "چالوس",
      "تنکابن",
      "رامسر",
    ],
    گیلان: ["رشت", "بندر انزلی", "لاهیجان", "لنگرود", "تالش", "آستارا"],
    البرز: ["کرج", "فردیس", "نظرآباد", "هشتگرد", "اشتهارد"],
    کرمان: ["کرمان", "سیرجان", "رفسنجان", "جیرفت", "بم", "زرند"],
    یزد: ["یزد", "میبد", "اردکان", "بافق", "مهریز"],
    قم: ["قم"],
    مرکزی: ["اراک", "ساوه", "خمين", "محلات", "دلیجان"],
    قزوین: ["قزوین", "تاکستان", "الوند", "بوئین‌زهرا"],
    همدان: ["همدان", "ملایر", "نهاوند", "تویسرکان"],
    کرمانشاه: ["کرمانشاه", "اسلام‌آباد غرب", "کنگاور", "سنقر"],
    کردستان: ["سنندج", "سقز", "مریوان", "بانه", "قروه"],
    "آذربایجان غربی": ["ارومیه", "خوی", "میاندوآب", "مهاباد", "بوکان"],
    اردبیل: ["اردبیل", "پارس‌آباد", "مشگین‌شهر", "خلخال"],
    "سیستان و بلوچستان": ["زاهدان", "زابل", "چابهار", "ایرانشهر", "سراوان"],
    بوشهر: ["بوشهر", "برازجان", "گناوه", "کنگان", "عسلویه"],
    هرمزگان: ["بندرعباس", "میناب", "قشم", "کیش", "لنگه"],
    زنجان: ["زنجان", "ابهر", "خرمدره", "قیدار"],
    گلستان: ["گرگان", "گنبد کاووس", "علی‌آباد کتول", "بندر گز"],
    سمنان: ["سمنان", "شاهرود", "دامغان", "گرمسار"],
    "چهارمحال و بختیاری": ["شهرکرد", "بروجن", "لردگان", "فارسان"],
    "کهگیلویه و بویراحمد": ["یاسوج", "دوگنبدان", "دهدشت"],
    "خراسان جنوبی": ["بیرجند", "قائن", "طبس", "فردوس"],
    "خراسان شمالی": ["بجنورد", "شیروان", "اسفراین"],
    ایلام: ["ایلام", "دهلران", "ایوان", "آبدانان"],
    لرستان: ["خرم‌آباد", "بروجرد", "دورود", "کوهدشت", "الیگودرز"],
  };

  const provinceSelect = document.getElementById("userProvinceSelect");
  const citySelect = document.getElementById("userCitySelect");
  const profileProgressFields = [
    "userNameInput",
    "userPhoneInput",
    "userNationalIdInput",
    "userBirthdateInput",
    "userProvinceSelect",
    "userCitySelect",
    "userPostalCodeInput",
    "userAddressInput",
  ];

  function updateProfileProgress() {
    const completedFields = profileProgressFields.filter((id) =>
      document.getElementById(id)?.value.trim(),
    ).length;
    const percentage = Math.round(
      (completedFields / profileProgressFields.length) * 100,
    );
    const percentageLabel = `${percentage.toLocaleString("fa-IR")}٪`;
    document.querySelectorAll("[data-profile-progress]").forEach((progress) => {
      progress.setAttribute("aria-valuenow", String(percentage));
      progress.setAttribute("aria-valuetext", percentageLabel);
    });
    document
      .querySelectorAll("[data-profile-completion-bar]")
      .forEach((progressBar) => {
        progressBar.style.width = `${percentage}%`;
      });
    document
      .querySelectorAll("[data-profile-completion-value]")
      .forEach((progressValue) => {
        progressValue.textContent = percentageLabel;
      });

    const name =
      document.getElementById("userNameInput")?.value.trim() || "کاربر گرامی";
    const phone = document.getElementById("userPhoneInput")?.value.trim() || "";
    document
      .querySelectorAll(".userName")
      .forEach((element) => (element.textContent = name));
    document
      .querySelectorAll(".userInitial")
      .forEach((element) => (element.textContent = name.charAt(0) || "ک"));
    const phoneElement = document.getElementById("userPhone");
    if (phoneElement) phoneElement.textContent = phone;
  }

  profileProgressFields.forEach((id) => {
    document
      .getElementById(id)
      ?.addEventListener("input", updateProfileProgress);
    document
      .getElementById(id)
      ?.addEventListener("change", updateProfileProgress);
  });

  function initProvinceSelect() {
    if (!provinceSelect) return;
    provinceSelect.innerHTML = '<option value="">انتخاب استان...</option>';
    Object.keys(iranProvincesAndCities).forEach((province) => {
      const option = document.createElement("option");
      option.value = province;
      option.textContent = province;
      provinceSelect.appendChild(option);
    });
  }

  function updateCities(selectedProvince, selectedCity = "") {
    if (!citySelect) return;
    citySelect.innerHTML = '<option value="">انتخاب شهر...</option>';

    if (selectedProvince && iranProvincesAndCities[selectedProvince]) {
      iranProvincesAndCities[selectedProvince].forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        if (city === selectedCity) option.selected = true;
        citySelect.appendChild(option);
      });
    }
  }

  if (provinceSelect) {
    provinceSelect.addEventListener("change", (e) => {
      updateCities(e.target.value);
    });
  }

  // 4. بارگذاری اطلاعات کاربر از API و localStorage
  async function loadUserData() {
    initProvinceSelect();

    const profile =
      (await fetchCurrentProfile()) ||
      JSON.parse(
        localStorage.getItem("user") ||
          localStorage.getItem("userData") ||
          sessionStorage.getItem("user") ||
          sessionStorage.getItem("userData") ||
          "null",
      ) ||
      {};

    const user = profile && typeof profile === "object" ? profile : {};
    const name = user.name || user.customer_name || "یونس پیرمرادیان";
    const phone = user.mobile || user.phone || "09225568686";
    const initial = name.trim().charAt(0) || "ی";

    document
      .querySelectorAll(".userName")
      .forEach((el) => (el.textContent = name));
    document
      .querySelectorAll(".userInitial")
      .forEach((el) => (el.textContent = initial));

    const phoneEl = document.getElementById("userPhone");
    if (phoneEl) phoneEl.textContent = phone;

    const userNameInput = document.getElementById("userNameInput");
    const userPhoneInput = document.getElementById("userPhoneInput");
    const userNationalIdInput = document.getElementById("userNationalIdInput");
    const userBirthdateInput = document.getElementById("userBirthdateInput");
    const userPostalCodeInput = document.getElementById("userPostalCodeInput");
    const userAddressInput = document.getElementById("userAddressInput");
    if (userNameInput) userNameInput.value = name;
    if (userPhoneInput) userPhoneInput.value = phone;
    if (userNationalIdInput) userNationalIdInput.value = user.national_id || "";
    if (userBirthdateInput) userBirthdateInput.value = user.birthdate || "";
    if (userPostalCodeInput) userPostalCodeInput.value = user.postal_code || "";
    if (userAddressInput) userAddressInput.value = user.address || "";

    if (user.province && provinceSelect) {
      provinceSelect.value = user.province;
      updateCities(user.province, user.city || "");
    }
    updateProfileProgress();
  }

  // 5. ذخیره اطلاعات و ارسال به API
  const saveBtn = document.getElementById("saveProfileBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const updatedData = {
        name: document.getElementById("userNameInput")?.value || "",
        mobile: document.getElementById("userPhoneInput")?.value || "",
        national_id:
          document.getElementById("userNationalIdInput")?.value || "",
        birthdate: document.getElementById("userBirthdateInput")?.value || "",
        province: provinceSelect?.value || "",
        city: citySelect?.value || "",
        postal_code:
          document.getElementById("userPostalCodeInput")?.value || "",
        address: document.getElementById("userAddressInput")?.value || "",
        current_password:
          document.getElementById("currentPasswordInput")?.value || "",
        new_password: document.getElementById("newPasswordInput")?.value || "",
      };

      if (updatedData.new_password && !updatedData.current_password) {
        window.showAppNotice(
          "برای تغییر رمز عبور، رمز عبور فعلی را هم وارد کنید.",
        );
        return;
      }

      const currentStorage = JSON.parse(
        localStorage.getItem("user") ||
          localStorage.getItem("userData") ||
          sessionStorage.getItem("user") ||
          sessionStorage.getItem("userData") ||
          "{}",
      );
      const optimisticUser = {
        ...currentStorage,
        name: updatedData.name,
        mobile: updatedData.mobile,
        national_id: updatedData.national_id,
        birthdate: updatedData.birthdate,
        province: updatedData.province,
        city: updatedData.city,
        postal_code: updatedData.postal_code,
        address: updatedData.address,
      };
      localStorage.setItem("user", JSON.stringify(optimisticUser));
      localStorage.setItem("userData", JSON.stringify(optimisticUser));
      sessionStorage.setItem("user", JSON.stringify(optimisticUser));
      sessionStorage.setItem("userData", JSON.stringify(optimisticUser));

      try {
        const payload = {
          name: updatedData.name,
          mobile: updatedData.mobile,
          national_id: updatedData.national_id,
          birthdate: updatedData.birthdate,
          province: updatedData.province,
          city: updatedData.city,
          postal_code: updatedData.postal_code,
          address: updatedData.address,
          change_password: Boolean(
            updatedData.current_password || updatedData.new_password,
          ),
          old_password: updatedData.current_password || "",
          new_password: updatedData.new_password || "",
        };

        const result = await fetchWithAuth("/profile", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (result && result.status === false) {
          window.showAppNotice(
            result.message || "به‌روزرسانی مشخصات انجام نشد.",
          );
          return;
        }

        const refreshedProfile = await fetchCurrentProfile();
        const mergedUser = refreshedProfile || optimisticUser;

        localStorage.setItem("user", JSON.stringify(mergedUser));
        localStorage.setItem("userData", JSON.stringify(mergedUser));
        sessionStorage.setItem("user", JSON.stringify(mergedUser));
        sessionStorage.setItem("userData", JSON.stringify(mergedUser));
        await loadUserData();
        window.showAppNotice("تغییرات با موفقیت اعمال شد.");
      } catch (error) {
        console.error("API Error:", error);
        window.showAppNotice("خطا در به‌روزرسانی اطلاعات پروفایل.");
      }
    });
  }

  // 6. حذف حساب کاربری از API
  const deleteBtn = document.getElementById("deleteAccountBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const confirmDelete = await window.showAppConfirm(
        "آیا از حذف کامل حساب کاربری خود اطمینان دارید؟ این عملیات قابل بازگشت نیست.",
      );
      if (!confirmDelete) return;

      window.showAppNotice(
        "حذف حساب کاربری در سرور فعلی پشتیبانی نمی‌شود؛ این endpoint در بک‌اند موجود نیست.",
      );
    });
  }

  // 7. دریافت سفارش‌ها از API متصل به BASE_URL
  async function loadUserOrders() {
    const ordersListEl = document.getElementById("ordersList");
    if (!ordersListEl) return;

    try {
      const result = await fetchWithAuth("/order");
      if (result?.status === false || result?.authRequired) {
        throw new Error(result.message || "دریافت سفارش‌ها ناموفق بود.");
      }
      let orders = normalizeOrdersPayload(result);
      const storedUser = getStoredUser();
      const userId =
        storedUser?.id ??
        storedUser?.user_id ??
        storedUser?.customer_id ??
        storedUser?.customer?.id;
      const orderHasOwner = (order) =>
        order.user_id != null ||
        order.userId != null ||
        order.customer_id != null ||
        order.user?.id != null;

      if (userId != null && orders.some(orderHasOwner)) {
        orders = orders.filter((order) => {
          const orderUserId =
            order.user_id ??
            order.userId ??
            order.customer_id ??
            order.user?.id;
          return String(orderUserId) === String(userId);
        });
      }

      if (!orders.length) {
        ordersListEl.innerHTML = `
          <div class="orders-empty">
            <span class="orders-empty-icon" aria-hidden="true">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6M10 21h.01M17 21h.01" /></svg>
            </span>
            <h3>هنوز سفارشی ثبت نکرده‌اید</h3>
            <p>محصول موردنیازتان را پیدا کنید؛ جزئیات خرید و وضعیت سفارش‌ها در همین بخش نمایش داده می‌شود.</p>
            <a href="../products/index.html">رفتن به فروشگاه</a>
          </div>
        `;
        return;
      }

      ordersListEl.innerHTML = orders
        .map((order) => {
          const orderCode =
            order.order_number || order.order_code || order.code || order.id;
          const orderDate = order.created_at || order.date || "-";
          const orderTotal = Number(
            order.final_amount ??
              order.total_amount ??
              order.total ??
              order.payable_price ??
              0,
          );
          const status = order.payment_status || order.status || "processing";
          const statusText =
            order.statusText || orderStatusLabels[status] || status;
          const statusClass =
            status === "paid" ||
            status === "delivered" ||
            status === "completed"
              ? "bg-emerald-100 text-emerald-800"
              : status === "unpaid" || status === "pending"
                ? "bg-amber-100 text-amber-800"
                : "bg-blue-100 text-blue-800";

          return `
            <article class="order-card">
              <div class="order-card-head">
                <div class="order-code-wrap">
                  <span class="order-symbol" aria-hidden="true">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 3v5h5M8 13h8M8 17h8"/></svg>
                  </span>
                  <span class="min-w-0">
                    <span class="order-eyebrow">کد پیگیری</span>
                    <strong class="order-code">${escapeHtml(orderCode)}</strong>
                  </span>
                </div>
                <span class="order-status ${statusClass}"><span class="order-status-dot" aria-hidden="true"></span>${escapeHtml(statusText)}</span>
              </div>
              <div class="order-details">
                <div><span class="order-detail-label">تاریخ ثبت</span><strong class="order-detail-value">${escapeHtml(orderDate)}</strong></div>
                <div><span class="order-detail-label">مبلغ سفارش</span><strong class="order-detail-value order-total">${orderTotal.toLocaleString("en-US")} تومان</strong></div>
              </div>
              <div class="order-card-footer">
                <span class="order-caption">جزئیات سفارش</span>
                <div class="order-actions">
                  <button data-order-id="${escapeHtml(order.id)}" class="view-invoice-btn bg-purple1 text-white font-bold hover:opacity-90 transition-opacity">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 3v5h5M9 13h6M9 17h6"/></svg>
                    مشاهده فاکتور
                  </button>
                  ${isUnpaidOrder(order) ? `<button data-order-id="${escapeHtml(order.id)}" class="restore-order-btn border border-purple1/40 text-purple1 font-bold hover:bg-yasi transition-colors"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h11a6 6 0 1 1-5.2 9M3 10l4-4m-4 4 4 4"/></svg>بازگردانی به سبد</button>` : ""}
                  <button data-order-id="${escapeHtml(order.id)}" class="delete-order-btn border border-gray-primary/50 text-gray-main font-bold hover:bg-yasi transition-colors"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>حذف سفارش</button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");

      ordersListEl.querySelectorAll(".view-invoice-btn").forEach((button) => {
        button.addEventListener("click", () => {
          const order = orders.find(
            (item) => String(item.id) === String(button.dataset.orderId),
          );
          if (order) openInvoiceModal(order);
        });
      });

      ordersListEl.querySelectorAll(".delete-order-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          const order = orders.find(
            (item) => String(item.id) === String(button.dataset.orderId),
          );
          if (!order) return;

          const confirmed = await window.showAppConfirm(
            "از حذف این سفارش مطمئن هستید؟ این کار قابل بازگشت نیست.",
          );
          if (!confirmed) return;

          button.disabled = true;
          try {
            const response = await fetchWithAuth("/order", {
              method: "DELETE",
              body: { id: order.id },
            });
            if (response?.status === false || response?.authRequired) {
              throw new Error(response.message || "حذف سفارش انجام نشد.");
            }
            window.showAppNotice("سفارش با موفقیت حذف شد.");
            await loadUserOrders();
          } catch (error) {
            window.showAppNotice(error.message || "حذف سفارش انجام نشد.");
            button.disabled = false;
          }
        });
      });

      ordersListEl.querySelectorAll(".restore-order-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          const order = orders.find(
            (item) => String(item.id) === String(button.dataset.orderId),
          );
          if (!order || !isUnpaidOrder(order)) return;

          button.disabled = true;
          let cartHasRestoredItems = false;
          try {
            const detailResponse = await fetchWithAuth(
              `/order?id=${encodeURIComponent(order.id)}`,
              { method: "GET" },
            );
            if (
              detailResponse?.status === false ||
              detailResponse?.authRequired
            ) {
              throw new Error(
                detailResponse.message || "دریافت اقلام سفارش ناموفق بود.",
              );
            }

            const detailPayload =
              detailResponse?.data ?? detailResponse?.result ?? detailResponse;
            const detailedOrder = Array.isArray(detailPayload)
              ? detailPayload.find(
                  (item) => String(item.id) === String(order.id),
                )
              : (detailPayload?.order ?? detailPayload);
            const items = getOrderItems(detailedOrder || order);
            if (!items.length) {
              throw new Error("اقلام این سفارش برای بازگردانی در دسترس نیست.");
            }

            const requestedByVariant = new Map();
            const failedItems = [];
            for (const item of items) {
              const variantId = Number(getOrderVariantId(item));
              const quantity = Number(
                item.quantity ?? item.qty ?? item.count ?? 1,
              );
              const name =
                item.product?.name ||
                item.product_name ||
                item.name ||
                item.title ||
                "کالا";
              if (
                !Number.isInteger(variantId) ||
                variantId < 1 ||
                !Number.isFinite(quantity) ||
                quantity < 1
              ) {
                failedItems.push(name);
                continue;
              }

              const current = requestedByVariant.get(variantId) || {
                quantity: 0,
                name,
              };
              current.quantity += quantity;
              requestedByVariant.set(variantId, current);
            }

            const cartResponse = await fetchWithAuth("/cart", {
              method: "GET",
            });
            if (cartResponse?.status === false || cartResponse?.authRequired) {
              throw new Error(
                cartResponse.message || "دریافت سبد خرید ناموفق بود.",
              );
            }
            const currentByVariant = new Map();
            getCartItems(cartResponse).forEach((item) => {
              const variantId = Number(getOrderVariantId(item));
              if (Number.isInteger(variantId) && variantId > 0) {
                currentByVariant.set(
                  variantId,
                  (currentByVariant.get(variantId) || 0) +
                    Number(item.quantity ?? item.qty ?? item.count ?? 1),
                );
              }
            });

            for (const [variantId, requested] of requestedByVariant) {
              const currentQuantity = currentByVariant.get(variantId) || 0;
              if (currentQuantity >= requested.quantity) {
                cartHasRestoredItems = true;
                continue;
              }
              const response = await fetchWithAuth("/cart", {
                method: "POST",
                body: {
                  variant_id: variantId,
                  quantity: requested.quantity - currentQuantity,
                },
              });
              if (
                response?.status === false ||
                response?.authRequired ||
                response?.success === false ||
                response?.ok === false
              ) {
                failedItems.push(requested.name);
                continue;
              }
              cartHasRestoredItems = true;
            }

            if (failedItems.length) {
              window.showAppNotice(
                `${failedItems.length} قلم به سبد اضافه نشد؛ ممکن است موجودی کافی یا شناسه تنوع معتبر نداشته باشد. سفارش قبلی حذف نشده است.`,
              );
              if (cartHasRestoredItems) {
                window.location.href = "../cart/index.html";
              } else {
                button.disabled = false;
              }
              return;
            }

            const deleteResponse = await fetchWithAuth("/order", {
              method: "DELETE",
              body: { id: order.id },
            });
            if (
              deleteResponse?.status === false ||
              deleteResponse?.authRequired ||
              deleteResponse?.success === false ||
              deleteResponse?.ok === false
            ) {
              throw new Error(
                "کالاها به سبد اضافه شدند، اما حذف سفارش قبلی ناموفق بود.",
              );
            }

            window.showAppNotice("سفارش به سبد خرید بازگردانده شد.");
            window.location.href = "../cart/index.html";
          } catch (error) {
            window.showAppNotice(error.message || "بازگردانی سفارش انجام نشد.");
            if (cartHasRestoredItems) {
              window.location.href = "../cart/index.html";
            } else {
              button.disabled = false;
            }
          }
        });
      });
    } catch (error) {
      console.error("خطا در دریافت سفارش‌های کاربر:", error);
      ordersListEl.innerHTML = `<div class="text-center py-8 text-red-500">دریافت سفارش‌ها با خطا روبه‌رو شد. لطفاً دوباره تلاش کنید.</div>`;
    }
  }

  function openInvoiceModal(order) {
    const modal = document.getElementById("invoiceModal");
    if (!modal) return;

    document.getElementById("invoiceOrderCode").textContent =
      `کد سفارش: ${order.order_number || order.order_code || order.code || `#${order.id}`}`;
    document.getElementById("invoiceOrderDate").textContent =
      `تاریخ: ${order.created_at || order.date || "-"}`;
    document.getElementById("invoiceTotalPrice").textContent =
      `${Number(order.final_amount ?? order.total_amount ?? order.total ?? 0).toLocaleString("en-US")} تومان`;

    const tbody = document.getElementById("invoiceItems");
    const items = Array.isArray(order.items)
      ? order.items
      : Array.isArray(order.order_items)
        ? order.order_items
        : [];
    if (tbody)
      tbody.innerHTML = items.length
        ? items
            .map(
              (item) => `
      <tr>
        <td class="p-2">${item.product?.name || item.product_name || item.name || item.title || "محصول"}</td>
        <td class="p-2">${Number(item.quantity ?? item.qty ?? item.count ?? 1).toLocaleString("en-US")}</td>
        <td class="p-2">${Number(item.unit_price ?? item.price ?? item.unitPrice ?? 0).toLocaleString("en-US")} تومان</td>
        <td class="p-2">${Number((item.quantity ?? item.qty ?? item.count ?? 1) * (item.unit_price ?? item.price ?? item.unitPrice ?? 0)).toLocaleString("en-US")} تومان</td>
      </tr>
    `,
            )
            .join("")
        : `<tr><td colspan="4" class="p-4 text-center text-gray-400">جزئیات کالاهای سفارش در دسترس نیست.</td></tr>`;

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  const modal = document.getElementById("invoiceModal");
  const closeBtn = document.getElementById("closeInvoiceModal");
  const printBtn = document.getElementById("printInvoiceBtn");

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }

  loadUserData();
  loadUserOrders();
});
