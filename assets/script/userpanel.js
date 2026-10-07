import {
  fetchWithAuth,
  formatPersianDate,
  resolveProductImagePath,
} from "./data.js";
import { FAVORITES_STORAGE_KEY } from "./favorites.js";

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

function normalizeFavoriteInterests(payload, depth = 0) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object" || depth > 4) return [];

  for (const key of ["date", "data", "interests", "result", "items", "payload"]) {
    const rows = normalizeFavoriteInterests(payload[key], depth + 1);
    if (rows.length) return rows;
  }

  return [];
}

function normalizeProductsPayload(payload, depth = 0) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object" || depth > 4) return [];

  for (const key of ["data", "products", "result", "items", "payload"]) {
    const products = normalizeProductsPayload(payload[key], depth + 1);
    if (products.length) return products;
  }

  return [];
}

async function renderFavoriteProducts() {
  const favoritesList = document.getElementById("favoritesList");
  if (!favoritesList) return;

  favoritesList.innerHTML =
    '<p class="col-span-full py-8 text-center text-sm text-gray-500">در حال بارگذاری علاقه‌مندی‌ها...</p>';

  try {
    const [interestsResponse, productsResponse] = await Promise.all([
      fetchWithAuth("/interests"),
      fetchWithAuth("/products"),
    ]);
    for (const response of [interestsResponse, productsResponse]) {
      if (
        response?.status === false ||
        response?.status === "error" ||
        response?.authRequired
      ) {
        throw new Error(response.message || "دریافت علاقه‌مندی‌ها ناموفق بود.");
      }
    }

    const interests = normalizeFavoriteInterests(interestsResponse);
    const products = normalizeProductsPayload(productsResponse);
    const productsById = new Map(
      products.map((product) => [String(product.id ?? product.product_id), product]),
    );
    const favorites = interests
      .map((interest) => ({
        interest,
        product: productsById.get(
          String(interest.product_id ?? interest.productId ?? ""),
        ),
      }))
      .filter(({ product }) => product);

    try {
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(
          favorites.map(({ product }) => ({
            id: product.id ?? product.product_id,
            title: product.title || product.name || "محصول بدون عنوان",
            brand: product.brand || product.brand_name || "بدون برند",
            price:
              product.final_price ??
              product.discount_price ??
              product.price ??
              0,
            image: product.image || product.images?.[0] || "",
          })),
        ),
      );
    } catch (error) {
      console.error("همگام‌سازی محلی علاقه‌مندی‌ها انجام نشد:", error);
    }

    if (!favorites.length) {
      favoritesList.innerHTML = `
        <p class="col-span-full py-8 text-center text-sm text-gray-500">
          هنوز محصولی به علاقه‌مندی‌ها اضافه نشده است.
        </p>
      `;
      return;
    }

    favoritesList.innerHTML = favorites
      .map(({ interest, product }) => {
        const productId = encodeURIComponent(product.id ?? product.product_id);
        const interestId = escapeHtml(
          interest.id ?? interest.interests_id ?? interest.interest_id ?? "",
        );
        const image = escapeHtml(
          resolveProductImagePath(product.image || product.images?.[0] || ""),
        );
        const title = escapeHtml(product.title || product.name || "محصول");
        const brand = escapeHtml(
          product.brand || product.brand_name || "بدون برند",
        );
        const price = Number(
          product.final_price ?? product.discount_price ?? product.price ?? 0,
        ).toLocaleString("en-US");

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
            <button type="button" class="remove-api-favorite-btn shrink-0 rounded-full p-2 text-purple1" data-interest-id="${interestId}" aria-label="حذف از علاقه‌مندی‌ها">
              <svg class="h-5 w-5 fill-purple1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
            </button>
          </article>
        `;
      })
      .join("");

    favoritesList
      .querySelectorAll(".remove-api-favorite-btn")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          if (!button.dataset.interestId) {
            window.showAppNotice("شناسهٔ علاقه‌مندی پیدا نشد.");
            return;
          }

          button.disabled = true;
          try {
            const result = await fetchWithAuth("/interests", {
              method: "DELETE",
              body: { interests_id: button.dataset.interestId },
            });
            if (
              result?.status === false ||
              result?.status === "error" ||
              result?.success === false ||
              result?.ok === false
            ) {
              throw new Error(result.message || "حذف علاقه‌مندی انجام نشد.");
            }
            await renderFavoriteProducts();
          } catch (error) {
            console.error("حذف علاقه‌مندی از API ناموفق بود:", error);
            window.showAppNotice(error.message || "حذف علاقه‌مندی انجام نشد.");
            button.disabled = false;
          }
        });
      });
  } catch (error) {
    console.error("دریافت علاقه‌مندی‌های کاربر از API ناموفق بود:", error);
    favoritesList.innerHTML = `
      <p class="col-span-full py-8 text-center text-sm text-red-500">
        دریافت علاقه‌مندی‌ها با خطا روبه‌رو شد. لطفاً دوباره تلاش کنید.
      </p>
    `;
  }
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

function getOrderId(order) {
  return order?.id ?? order?.order_id ?? order?.orderId ?? null;
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

function getOrderStatus(order) {
  const rawStatus = String(
    order?.status ?? order?.order_status ?? order?.payment_status ?? "",
  )
    .trim()
    .toLowerCase();
  const paymentStatus = String(order?.payment_status ?? "")
    .trim()
    .toLowerCase();

  if (
    order?.cancel === true ||
    order?.cancelled === true ||
    order?.is_cancelled === true ||
    ["canceled", "cancelled", "canceled_order"].includes(rawStatus)
  ) {
    return "canceled";
  }

  if (
    ["paid", "success", "successful", "completed", "delivered"].includes(
      paymentStatus || rawStatus,
    ) ||
    order?.is_paid === true ||
    order?.paid === true ||
    order?.payment_status === 1
  ) {
    return "paid";
  }

  if (
    ["pending", "unpaid", "awaiting_payment", "waiting_for_payment", "failed"].includes(
      paymentStatus || rawStatus,
    ) ||
    order?.is_paid === false ||
    order?.paid === false ||
    order?.payment_status === 0
  ) {
    return "unpaid";
  }

  return rawStatus || "processing";
}

function isUnpaidOrder(order) {
  return getOrderStatus(order) === "unpaid";
}

function getOrderItems(order, depth = 0) {
  if (!order || typeof order !== "object" || depth > 4) return [];
  for (const key of ["items", "order_items", "products"]) {
    if (Array.isArray(order[key]) && order[key].length) return order[key];
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

function getOrderItemQuantity(item) {
  return Number(
    item?.quantity ??
      item?.qty ??
      item?.count ??
      item?.amount ??
      item?.pivot?.quantity ??
      item?.order_item?.quantity ??
      1,
  );
}

function getOrderItemsCacheKey() {
  const user = getStoredUser();
  const userId =
    user?.id ?? user?.user_id ?? user?.customer_id ?? user?.customer?.id;
  return userId == null ? null : `abzar_order_items_${userId}`;
}

function getCachedOrderItems(orderId) {
  const cacheKey = getOrderItemsCacheKey();
  if (!cacheKey) return [];

  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey) || "{}");
    return Array.isArray(cache[orderId]) ? cache[orderId] : [];
  } catch (error) {
    console.error("خواندن جزئیات ذخیره‌شده سفارش ناموفق بود:", error);
    return [];
  }
}

function cacheOrderItems(orderId, items) {
  const cacheKey = getOrderItemsCacheKey();
  if (!cacheKey || !items.length) return;

  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey) || "{}");
    cache[orderId] = items;
    localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch (error) {
    console.error("ذخیره جزئیات سفارش برای فاکتور ناموفق بود:", error);
  }
}

function removeCachedOrderItems(orderId) {
  const cacheKey = getOrderItemsCacheKey();
  if (!cacheKey) return;

  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey) || "{}");
    delete cache[orderId];
    localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch (error) {
    console.error("حذف جزئیات ذخیره‌شده سفارش ناموفق بود:", error);
  }
}

function getAvailableOrderItems(orderId, ...orders) {
  for (const order of orders) {
    const items = getOrderItems(order);
    if (items.length) return items;
  }
  return getCachedOrderItems(orderId);
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

function getInventoryQuantity(inventory) {
  if (
    inventory?.in_stock === false ||
    inventory?.is_in_stock === false ||
    inventory?.available === false
  ) {
    return 0;
  }

  for (const key of [
    "available_quantity",
    "available_stock",
    "stock_quantity",
    "quantity",
    "stock",
  ]) {
    const value = inventory?.[key];
    if (value === null || value === undefined || value === "") continue;
    const quantity = Number(String(value).replace(/,/g, ""));
    if (Number.isFinite(quantity) && quantity >= 0) return quantity;
  }

  return null;
}

function getProductForOrderItem(item, products) {
  const variantId = getOrderVariantId(item);
  const productId =
    item.product_id ??
    item.product?.id ??
    item.variant?.product_id ??
    item.variant?.product?.id;

  for (const product of products) {
    const matchingVariant = (Array.isArray(product.variants)
      ? product.variants
      : []
    ).find(
      (variant) =>
        variantId != null &&
        String(variant.id ?? variant.variant_id ?? "") === String(variantId),
    );
    if (matchingVariant) return { product, variant: matchingVariant };
  }

  const product = products.find(
    (candidate) =>
      productId != null &&
      String(candidate.id ?? candidate.product_id ?? "") ===
        String(productId),
  );
  return product ? { product, variant: null } : null;
}

function getCurrentStock(product, variant) {
  const variantStock = getInventoryQuantity(variant);
  if (variantStock !== null) return variantStock;
  return getInventoryQuantity(product);
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
    const storedUser = getStoredUser();
    const response = await fetchWithAuth("/profile", { method: "GET" });
    if (
      response?.status === false ||
      response?.status === "error" ||
      response?.authRequired
    ) {
      throw new Error(response.message || "دریافت اطلاعات حساب ناموفق بود.");
    }

    const profile = response?.data ?? response?.user ?? response ?? null;
    if (!profile || typeof profile !== "object") {
      throw new Error("اطلاعات حساب از سرور دریافت نشد.");
    }

    const normalizedProfile = {
      ...profile,
      name:
        profile.name ||
        profile.customer_name ||
        profile.full_name ||
        storedUser?.name ||
        "",
      mobile: profile.mobile || profile.phone || storedUser?.mobile || "",
      national_code: profile.national_code || profile.national_id || "",
      full_address: profile.full_address || profile.address || "",
    };
    localStorage.setItem("user", JSON.stringify(normalizedProfile));
    localStorage.setItem("userData", JSON.stringify(normalizedProfile));
    sessionStorage.setItem("user", JSON.stringify(normalizedProfile));
    sessionStorage.setItem("userData", JSON.stringify(normalizedProfile));
    return normalizedProfile;
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
  document
    .getElementById("closeUserPanelMenu")
    ?.addEventListener("click", () => {
      setUserPanelMenuOpen(false);
      openUserPanelMenuButton?.focus();
    });
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
        tabButton.classList.remove("bg-white", "text-black-primary", "font-bold");
        tabButton.classList.add("text-white/90", "font-semibold");
      });
      button.classList.add("bg-white", "text-black-primary", "font-bold");
      button.classList.remove("text-white/90", "font-semibold");

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
    const progressTextColor = {
      red: "text-red-600",
      yellow: "text-yellow-600",
      green: "text-green-600",
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

  // 4. بارگذاری اطلاعات حساب از API
  async function loadUserData() {
    initProvinceSelect();
    let user;
    try {
      user = await fetchCurrentProfile();
    } catch (error) {
      console.error("دریافت اطلاعات حساب از API ناموفق بود:", error);
      window.showAppNotice(
        error.message || "دریافت اطلاعات حساب ناموفق بود.",
      );
      return false;
    }

    const name = user.name || user.customer_name || "";
    const phone = user.mobile || user.phone || "";
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
    if (userNationalIdInput) {
      userNationalIdInput.value = user.national_code || user.national_id || "";
    }
    if (userBirthdateInput) userBirthdateInput.value = user.birthdate || "";
    if (userPostalCodeInput) userPostalCodeInput.value = user.postal_code || "";
    if (userAddressInput) {
      userAddressInput.value = user.full_address || user.address || "";
    }

    if (user.province && provinceSelect) {
      provinceSelect.value = user.province;
      updateCities(user.province, user.city || "");
    }
    updateProfileProgress();
    return true;
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
      if (updatedData.current_password && !updatedData.new_password) {
        window.showAppNotice(
          "برای تغییر رمز عبور، رمز عبور جدید را هم وارد کنید.",
        );
        return;
      }

      try {
        const payload = {
          name: updatedData.name,
          mobile: updatedData.mobile,
          national_code: updatedData.national_id,
          province: updatedData.province,
          city: updatedData.city,
          postal_code: updatedData.postal_code,
          full_address: updatedData.address,
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

        if (
          result?.status === false ||
          result?.status === "error" ||
          result?.authRequired ||
          result?.success === false ||
          result?.ok === false
        ) {
          throw new Error(result.message || "به‌روزرسانی مشخصات انجام نشد.");
        }

        if (!(await loadUserData())) {
          throw new Error("اطلاعات ذخیره شد، اما بارگذاری دوبارهٔ پروفایل ناموفق بود.");
        }
        document.getElementById("currentPasswordInput").value = "";
        document.getElementById("newPasswordInput").value = "";
        window.showAppNotice("تغییرات با موفقیت اعمال شد.");
      } catch (error) {
        console.error("API Error:", error);
        window.showAppNotice(
          error.message || "خطا در به‌روزرسانی اطلاعات پروفایل.",
        );
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
          <div class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-primary/40 bg-yasi/20 px-6 py-12 text-center">
            <span class="grid size-14 place-items-center rounded-full bg-yasi text-purple1" aria-hidden="true">
              <svg class="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6M10 21h.01M17 21h.01" /></svg>
            </span>
            <h3 class="text-base font-bold text-black-primary">هنوز سفارشی ثبت نکرده‌اید</h3>
            <p class="max-w-md text-sm text-gray-main">محصول موردنیازتان را پیدا کنید؛ جزئیات خرید و وضعیت سفارش‌ها در همین بخش نمایش داده می‌شود.</p>
            <a href="../products/index.html" class="mt-2 rounded-xl bg-purple1 px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">رفتن به فروشگاه</a>
          </div>
        `;
        return;
      }

      ordersListEl.innerHTML = orders
        .map((order) => {
          const orderId = getOrderId(order);
          const orderCode =
            order.order_number || order.order_code || order.code || order.id;
          const orderDate = formatPersianDate(order.created_at || order.date);
          const orderTotal = Number(
            order.final_amount ??
              order.total_amount ??
              order.total ??
              order.payable_price ??
              0,
          );
          const status = getOrderStatus(order);
          const statusText =
            orderStatusLabels[status] || status;
          const statusClass =
            status === "canceled" ||
            status === "cancelled"
              ? "bg-red-100 text-red-800"
              : status === "paid" ||
            status === "delivered" ||
            status === "completed"
              ? "bg-emerald-100 text-emerald-800"
              : status === "unpaid" || status === "pending"
                ? "bg-amber-100 text-amber-800"
                : "bg-blue-100 text-blue-800";

          return `
            <article class="rounded-2xl border border-gray-primary/30 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-primary/20 pb-4">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-yasi text-purple1" aria-hidden="true">
                    <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 3v5h5M8 13h8M8 17h8"/></svg>
                  </span>
                  <span class="min-w-0">
                    <span class="block text-[11px] text-gray-main">کد پیگیری</span>
                    <strong class="block truncate text-sm font-bold text-black-primary">${escapeHtml(orderCode)}</strong>
                  </span>
                </div>
                <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusClass}"><span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>${escapeHtml(statusText)}</span>
              </div>
              <div class="grid grid-cols-2 gap-4 py-4">
                <div><span class="block text-[11px] text-gray-main">تاریخ ثبت</span><strong class="mt-1 block text-sm font-bold text-black-primary">${escapeHtml(orderDate)}</strong></div>
                <div><span class="block text-[11px] text-gray-main">مبلغ سفارش</span><strong class="mt-1 block text-sm font-bold text-purple1">${orderTotal.toLocaleString("en-US")} تومان</strong></div>
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2 border-t border-gray-primary/20 pt-4">
                <button data-order-id="${escapeHtml(orderId)}" class="view-invoice-btn inline-flex items-center gap-1.5 rounded-xl bg-purple1 px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90">
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 3v5h5M9 13h6M9 17h6"/></svg>
                  مشاهده فاکتور
                </button>
                ${isUnpaidOrder(order) ? `<button data-order-id="${escapeHtml(orderId)}" class="restore-order-btn inline-flex items-center gap-1.5 rounded-xl border border-purple1/40 px-4 py-2 text-xs font-bold text-purple1 transition-colors hover:bg-yasi"><svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h11a6 6 0 1 1-5.2 9M3 10l4-4m-4 4 4 4"/></svg>بازگردانی به سبد</button>` : ""}
                ${status !== "canceled" && status !== "cancelled" ? `<button data-order-id="${escapeHtml(orderId)}" class="delete-order-btn inline-flex items-center gap-1.5 rounded-xl border border-gray-primary/50 px-4 py-2 text-xs font-bold text-gray-main transition-colors hover:bg-yasi"><svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M8 7v12h8V7M10 4h4"/></svg>لغو سفارش</button>` : ""}
              </div>
            </article>
          `;
        })
        .join("");

      ordersListEl.querySelectorAll(".view-invoice-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          const order = orders.find(
            (item) => String(getOrderId(item)) === String(button.dataset.orderId),
          );
          if (!order) return;

          const orderId = getOrderId(order);
          if (orderId === null || orderId === "") {
            window.showAppNotice("شناسه سفارش برای دریافت جزئیات پیدا نشد.");
            return;
          }

          button.disabled = true;
          try {
            const detailResponse = await fetchWithAuth(
              `/order?id=${encodeURIComponent(orderId)}`,
              { method: "GET" },
            );
            if (
              detailResponse?.status === false ||
              detailResponse?.authRequired ||
              detailResponse?.success === false ||
              detailResponse?.ok === false
            ) {
              throw new Error(
                detailResponse.message || "دریافت جزئیات سفارش ناموفق بود.",
              );
            }

            const items = getAvailableOrderItems(orderId, detailResponse, order);
            if (!items.length) {
              throw new Error("جزئیات کالاهای این سفارش در دسترس نیست.");
            }
            cacheOrderItems(orderId, items);
            order.items = items;
            openInvoiceModal(order, items);
          } catch (error) {
            console.error("دریافت جزئیات سفارش برای فاکتور ناموفق بود:", error);
            const cachedItems = getAvailableOrderItems(orderId, order);
            if (cachedItems.length) {
              openInvoiceModal(order, cachedItems);
            } else {
              window.showAppNotice(
                error.message || "دریافت جزئیات فاکتور ناموفق بود.",
              );
            }
          } finally {
            button.disabled = false;
          }
        });
      });

      ordersListEl.querySelectorAll(".delete-order-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          const order = orders.find(
            (item) => String(getOrderId(item)) === String(button.dataset.orderId),
          );
          if (!order || getOrderStatus(order) === "canceled") return;
          const orderId = getOrderId(order);
          if (orderId === null || orderId === "") {
            window.showAppNotice("شناسه سفارش برای حذف پیدا نشد.");
            return;
          }

          const confirmed = await window.showAppConfirm(
            "از لغو این سفارش مطمئن هستید؟ این کار قابل بازگشت نیست.",
          );
          if (!confirmed) return;

          button.disabled = true;
          try {
            const detailResponse = await fetchWithAuth(
              `/order?id=${encodeURIComponent(orderId)}`,
              { method: "GET" },
            );
            if (
              detailResponse?.status === false ||
              detailResponse?.authRequired ||
              detailResponse?.success === false ||
              detailResponse?.ok === false
            ) {
              throw new Error(
                detailResponse.message || "دریافت اقلام سفارش ناموفق بود.",
              );
            }
            const items = getAvailableOrderItems(orderId, detailResponse, order);
            if (!items.length) {
              throw new Error(
                "جزئیات کالاهای این سفارش پیدا نشد؛ برای جلوگیری از حذف جزئیات، سفارش لغو نشد.",
              );
            }
            cacheOrderItems(orderId, items);

            const response = await fetchWithAuth("/order", {
              method: "PUT",
              body: { id: orderId, cancel: true },
            });
            if (
              response?.status === false ||
              response?.authRequired ||
              response?.success === false ||
              response?.ok === false
            ) {
              throw new Error(response.message || "لغو سفارش انجام نشد.");
            }
            order.status = "canceled";
            order.payment_status = "canceled";
            window.showAppNotice("سفارش با موفقیت لغو شد.");
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
            (item) =>
              String(getOrderId(item)) === String(button.dataset.orderId),
          );
          if (!order || !isUnpaidOrder(order)) return;

          button.disabled = true;
          const unavailableNames = [];
          const failedNames = [];
          try {
            const orderId = getOrderId(order);
            if (orderId === null || orderId === "") {
              throw new Error("شناسه سفارش برای بازگردانی پیدا نشد.");
            }
            const detailResponse = await fetchWithAuth(
              `/order?id=${encodeURIComponent(orderId)}`,
              { method: "GET" },
            );
            if (
              detailResponse?.status === false ||
              detailResponse?.authRequired ||
              detailResponse?.success === false ||
              detailResponse?.ok === false
            ) {
              throw new Error(
                detailResponse.message || "دریافت اقلام سفارش ناموفق بود.",
              );
            }

            const items = getAvailableOrderItems(
              orderId,
              detailResponse,
              order,
            );
            if (!items.length) {
              throw new Error("اقلام این سفارش برای بازگردانی در دسترس نیست.");
            }

            const productsResponse = await fetchWithAuth("/products", {
              method: "GET",
            });
            if (
              productsResponse?.status === false ||
              productsResponse?.status === "error" ||
              productsResponse?.authRequired ||
              productsResponse?.success === false ||
              productsResponse?.ok === false
            ) {
              throw new Error(
                productsResponse.message || "بررسی موجودی کالاها ناموفق بود.",
              );
            }
            const products = normalizeProductsPayload(productsResponse);
            if (!products.length) {
              throw new Error(
                "اطلاعات موجودی کالاها دریافت نشد؛ سفارش به سبد منتقل نشد.",
              );
            }

            const requestedByVariant = new Map();
            for (const item of items) {
              const variantId = Number(getOrderVariantId(item));
              const quantity = getOrderItemQuantity(item);
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
                unavailableNames.push(name);
                continue;
              }

              const current = requestedByVariant.get(variantId) || {
                quantity: 0,
                name,
                item,
              };
              current.quantity += quantity;
              requestedByVariant.set(variantId, current);
            }

            const availableItems = [];
            for (const [variantId, requested] of requestedByVariant) {
              const matchedProduct = getProductForOrderItem(
                requested.item,
                products,
              );
              const stock = matchedProduct
                ? getCurrentStock(
                    matchedProduct.product,
                    matchedProduct.variant,
                  )
                : null;
              if (stock === null || stock < requested.quantity) {
                unavailableNames.push(
                  stock === null
                    ? requested.name
                    : `${requested.name} (موجودی: ${stock}، تعداد درخواستی: ${requested.quantity})`,
                );
                continue;
              }

              availableItems.push(requested.name);
              const response = await fetchWithAuth("/cart", {
                method: "POST",
                body: {
                  variant_id: variantId,
                  quantity: requested.quantity,
                },
              });
              if (
                response?.status === false ||
                response?.status === "error" ||
                response?.authRequired ||
                response?.success === false ||
                response?.ok === false
              ) {
                failedNames.push(requested.name);
              }
            }

            if (failedNames.length) {
              const failureNotice =
                `افزودن بعضی کالاهای موجود به سبد ناموفق بود؛ سفارش قبلی حذف نشد تا دوباره تلاش کنید.\n${failedNames.join("\n")}` +
                (unavailableNames.length
                  ? `\n\nبرای کالاهای زیر عذرخواهی می‌کنیم؛ موجودی کافی ندارند:\n${unavailableNames.join("\n")}`
                  : "");
              window.showAppNotice(failureNotice, "بازگردانی ناقص");
              button.disabled = false;
              return;
            }

            if (!availableItems.length) {
              window.showAppNotice(
                `متأسفیم، موجودی کافی برای اقلام این سفارش وجود ندارد:\n${unavailableNames.join("\n")}\nسفارش شما حذف نشده است و می‌توانید بعداً دوباره تلاش کنید.`,
                "موجودی کالا",
              );
              button.disabled = false;
              return;
            }

            const deleteResponse = await fetchWithAuth("/order", {
              method: "DELETE",
              body: { id: orderId },
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

            removeCachedOrderItems(orderId);
            const restoreNotice = unavailableNames.length
              ? `اقلام دارای موجودی به سبد خرید اضافه شدند.\n\nمتأسفیم، موجودی کافی برای این اقلام وجود نداشت:\n${unavailableNames.join("\n")}`
              : "اقلام سفارش به سبد خرید اضافه شدند. تا زمان زدن دکمه ثبت سفارش در مرحله آخر، سفارش جدیدی ثبت نمی‌شود.";
            sessionStorage.setItem(
              "abzar_cart_restore_notice",
              JSON.stringify({
                title: "بازگردانی سفارش",
                message: restoreNotice,
              }),
            );
            window.location.href = "../cart/index.html";
          } catch (error) {
            window.showAppNotice(error.message || "بازگردانی سفارش انجام نشد.");
            button.disabled = false;
          }
        });
      });
    } catch (error) {
      console.error("خطا در دریافت سفارش‌های کاربر:", error);
      ordersListEl.innerHTML = `<div class="text-center py-8 text-red-500">دریافت سفارش‌ها با خطا روبه‌رو شد. لطفاً دوباره تلاش کنید.</div>`;
    }
  }

  function openInvoiceModal(order, items = getOrderItems(order)) {
    const modal = document.getElementById("invoiceModal");
    if (!modal) return;

    document.getElementById("invoiceOrderCode").textContent =
      `کد سفارش: ${order.order_number || order.order_code || order.code || `#${order.id}`}`;
    document.getElementById("invoiceOrderDate").textContent =
      `تاریخ: ${formatPersianDate(order.created_at || order.date)}`;
    document.getElementById("invoiceTotalPrice").textContent =
      `${Number(order.final_amount ?? order.total_amount ?? order.total ?? 0).toLocaleString("en-US")} تومان`;

    const tbody = document.getElementById("invoiceItems");
    if (tbody)
      tbody.innerHTML = items.length
        ? items
            .map((item) => {
              const quantity = getOrderItemQuantity(item);
              const unitPrice = Number(
                item.unit_price ??
                  item.price ??
                  item.unitPrice ??
                  item.product?.price ??
                  0,
              );
              const productName =
                item.product?.name ||
                item.product?.title ||
                item.product_name ||
                item.name ||
                item.title ||
                "محصول";

              return `
      <tr>
        <td class="p-2">${escapeHtml(productName)}</td>
        <td class="p-2">${quantity.toLocaleString("en-US")}</td>
        <td class="p-2">${unitPrice.toLocaleString("en-US")} تومان</td>
        <td class="p-2">${(quantity * unitPrice).toLocaleString("en-US")} تومان</td>
      </tr>
    `;
            })
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
