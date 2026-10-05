export const BASE_URL = "http://localhost/shop_tools";
export const API_BASE = BASE_URL;
export const API_BASE_URL = BASE_URL;
export const FALLBACK_PRODUCT_IMAGE = "./assets/images/products/achar.jpg";

function getAppModal() {
  let modal = document.getElementById("app-message-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "app-message-modal";
  modal.className =
    "fixed inset-0 z-[100] hidden items-center justify-center bg-black/50 p-4";
  modal.innerHTML = `
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-right shadow-2xl">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h3 data-modal-title class="text-lg font-bold text-gray-900">پیام</h3>
        <button type="button" data-modal-close class="text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="بستن">×</button>
      </div>
      <p data-modal-message class="whitespace-pre-line text-sm leading-7 text-gray-700"></p>
      <div data-modal-actions class="mt-6 flex justify-end gap-2">
        <button type="button" data-modal-confirm class="rounded-lg bg-purple1 px-5 py-2 text-sm font-bold text-white">تأیید</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

window.showAppNotice = function (message, title = "پیام") {
  const modal = getAppModal();
  const closeButton = modal.querySelector("[data-modal-close]");
  const confirmButton = modal.querySelector("[data-modal-confirm]");
  const actions = modal.querySelector("[data-modal-actions]");
  modal.querySelector("[data-modal-title]").textContent = title;
  modal.querySelector("[data-modal-message]").textContent = String(
    message || "",
  );
  actions.classList.remove("justify-between");
  actions.classList.add("justify-end");
  confirmButton.textContent = "تأیید";
  confirmButton.classList.remove("hidden");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  const close = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  };
  closeButton.onclick = close;
  confirmButton.onclick = close;
};

window.showAppConfirm = function (message, title = "تأیید عملیات") {
  const modal = getAppModal();
  const closeButton = modal.querySelector("[data-modal-close]");
  const confirmButton = modal.querySelector("[data-modal-confirm]");
  const actions = modal.querySelector("[data-modal-actions]");
  modal.querySelector("[data-modal-title]").textContent = title;
  modal.querySelector("[data-modal-message]").textContent = String(
    message || "",
  );
  actions.classList.remove("justify-end");
  actions.classList.add("justify-between");
  confirmButton.textContent = "بله، ادامه بده";
  confirmButton.classList.remove("hidden");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  let settled = false;

  return new Promise((resolve) => {
    const close = (result) => {
      if (settled) return;
      settled = true;
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      resolve(result);
    };
    closeButton.onclick = () => close(false);
    confirmButton.onclick = () => close(true);
  });
};

if (
  window.location.hostname === "127.0.0.1" &&
  window.location.port === "5501"
) {
  window.location.replace(
    `http://localhost:5501${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

// Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø­ØµÙˆÙ„Ø§Øª Ø¨Ø§ÛŒØ¯ Ø§Ø² Ø¨Ú©â€ŒØ§Ù†Ø¯ ÙˆØ§Ù‚Ø¹ÛŒ Ú¯Ø±ÙØªÙ‡ Ø´ÙˆÙ†Ø¯Ø› fallback Ù…Ø­Ù„ÛŒ ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ø­Ø§Ù„Øª Ø§Ø¶Ø·Ø±Ø§Ø±ÛŒ Ø§Ø³Øª.
const USE_MOCK_FALLBACK = false;

export let cart = JSON.parse(localStorage.getItem("cart")) || [];
export let registeredUsers = [];

export const fallbackProducts = [
  {
    id: 1,
    title: "Ø¯Ø±ÛŒÙ„ Ø´Ø§Ø±Ú˜ÛŒ Ø­Ø±ÙÙ‡â€ŒØ§ÛŒ",
    name: "Ø¯Ø±ÛŒÙ„ Ø´Ø§Ø±Ú˜ÛŒ Ø­Ø±ÙÙ‡â€ŒØ§ÛŒ",
    brand: "ØªÚ© Ø§Ø¨Ø²Ø§Ø±",
    category_id: 1,
    price: 2450000,
    discount: 15,
    images: ["./assets/images/products/achar.jpg"],
    image: "./assets/images/products/achar.jpg",
    variants: [{ id: 1, variant_id: 1, price: 2450000 }],
    like: false,
  },
  {
    id: 2,
    title: "Ù…ÙˆØªÙˆØ± Ø¨Ø±Ø´ ØµÙ†Ø¹ØªÛŒ",
    name: "Ù…ÙˆØªÙˆØ± Ø¨Ø±Ø´ ØµÙ†Ø¹ØªÛŒ",
    brand: "Ø§Ø¨Ø²Ø§Ø± ØµÙ†Ø¹Øª",
    category_id: 2,
    price: 3190000,
    discount: 10,
    images: ["./assets/images/products/abzar1.jpg"],
    image: "./assets/images/products/abzar1.jpg",
    variants: [{ id: 2, variant_id: 2, price: 3190000 }],
    like: false,
  },
  {
    id: 3,
    title: "Ù¾ÛŒÚ†â€ŒÚ¯ÙˆØ´ØªÛŒ Ø¨Ø§ØªØ±ÛŒâ€ŒØ¯Ø§Ø±",
    name: "Ù¾ÛŒÚ†â€ŒÚ¯ÙˆØ´ØªÛŒ Ø¨Ø§ØªØ±ÛŒâ€ŒØ¯Ø§Ø±",
    brand: "Ø¢Ø¨Ø²Ø§Ø±ÛŒÙ†Ùˆ",
    category_id: 3,
    price: 1890000,
    discount: 20,
    images: ["./assets/images/products/abzar2.jpg"],
    image: "./assets/images/products/abzar2.jpg",
    variants: [{ id: 3, variant_id: 3, price: 1890000 }],
    like: false,
  },
  {
    id: 4,
    title: "Ú©Ù…Ù¾Ø±Ø³ÙˆØ± Ø¨Ø§Ø¯ Ø­Ø±ÙÙ‡â€ŒØ§ÛŒ",
    name: "Ú©Ù…Ù¾Ø±Ø³ÙˆØ± Ø¨Ø§Ø¯ Ø­Ø±ÙÙ‡â€ŒØ§ÛŒ",
    brand: "Ø±ÙˆÙ†ÛŒÚ©Ø³",
    category_id: 4,
    price: 4290000,
    discount: 12,
    images: ["./assets/images/products/abzar3.jpg"],
    image: "./assets/images/products/abzar3.jpg",
    variants: [{ id: 4, variant_id: 4, price: 4290000 }],
    like: false,
  },
  {
    id: 5,
    title: "Ø§Ø±Ù‡ Ø¨Ø±Ù‚ÛŒ Ø¯Ùˆ Ø³Ø±Ø¹ØªÙ‡",
    name: "Ø§Ø±Ù‡ Ø¨Ø±Ù‚ÛŒ Ø¯Ùˆ Ø³Ø±Ø¹ØªÙ‡",
    brand: "ØªÚ© Ø§Ø¨Ø²Ø§Ø±",
    category_id: 5,
    price: 3590000,
    discount: 18,
    images: ["./assets/images/products/abzar4.jpg"],
    image: "./assets/images/products/abzar4.jpg",
    variants: [{ id: 5, variant_id: 5, price: 3590000 }],
    like: false,
  },
  {
    id: 6,
    title: "Ø¯Ø³ØªÚ¯Ø§Ù‡ ÙØ±Ø² Ø´Ø§Ø±Ú˜ÛŒ",
    name: "Ø¯Ø³ØªÚ¯Ø§Ù‡ ÙØ±Ø² Ø´Ø§Ø±Ú˜ÛŒ",
    brand: "Ù…Ø¯Ø±Ù†â€ŒØ§Ø¨Ø²Ø§Ø±",
    category_id: 6,
    price: 2750000,
    discount: 14,
    images: ["./assets/images/products/abzar5.jpg"],
    image: "./assets/images/products/abzar5.jpg",
    variants: [{ id: 6, variant_id: 6, price: 2750000 }],
    like: false,
  },
];

export let allProducts = [...fallbackProducts];

export let adminUsersList = [];
export let reviewsData = [];
export let accountingProductsData = [];
export let incomeData = [];
export let expenseData = [];
export let transactionsData = [];

export function setCart(newCart) {
  cart = newCart;
  localStorage.setItem("cart", JSON.stringify(cart));
}
export function setAllProducts(products) {
  allProducts = products;
}
export function setRegisteredUsers(users) {
  registeredUsers = users;
}
export function setAdminUsersList(users) {
  adminUsersList = users;
}
export function setReviewsData(reviews) {
  reviewsData = reviews;
}
export function setAccountingProductsData(products) {
  accountingProductsData = products;
}
export function setIncomeData(data) {
  incomeData = data;
}
export function setExpenseData(data) {
  expenseData = data;
}
export function setTransactionsData(data) {
  transactionsData = data;
}

function generateFallbackEndpointVariants(endpoint) {
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const variants = new Set([clean]);

  if (clean.includes("/admin-users")) {
    variants.add("/admin/users");
    variants.add("/admin-user");
    variants.add("/admin/users");
    variants.add("/admins");
    variants.add("/admin");
  }

  if (clean.includes("/accounting")) {
    variants.add("/accounting");
    variants.add("/transactions");
    variants.add("/finance");
    variants.add("/account");
  }

  if (clean.includes("/settings")) {
    variants.add("/setting");
    variants.add("/settings");
  }

  return [...variants];
}

function buildRequestBodyVariants(endpoint, body) {
  if (!body) return [body];

  let parsed = body;
  if (typeof body === "string") {
    try {
      parsed = JSON.parse(body);
    } catch {
      return [body];
    }
  }

  if (typeof parsed !== "object" || parsed === null) return [body];
  const variants = [parsed];

  const endpointIdMatch = endpoint.match(/\/(\d+)(?:\/)?$/);
  const endpointId = endpointIdMatch ? Number(endpointIdMatch[1]) : null;

  if (endpointId && (parsed.id == null || parsed.id === undefined)) {
    variants.push({ ...parsed, id: endpointId });
  }

  if (endpoint.includes("/products")) {
    const productId = parsed.id ?? endpointId;
    if (productId !== null && productId !== undefined) {
      variants.push({
        ...parsed,
        id: productId,
        product_id: parsed.product_id ?? productId,
      });
    }
  }

  if (endpoint.includes("/admin-users")) {
    const profileLike = {
      ...parsed,
      name:
        parsed.name ||
        parsed.full_name ||
        parsed.fullName ||
        parsed.display_name,
      mobile:
        parsed.mobile ||
        parsed.phone ||
        parsed.phone_number ||
        parsed.contact_mobile,
      email:
        parsed.email || parsed.username || parsed.user_name || parsed.login,
      username:
        parsed.username || parsed.user_name || parsed.email || parsed.login,
      full_name:
        parsed.full_name ||
        parsed.name ||
        parsed.fullName ||
        parsed.display_name,
      fullName:
        parsed.fullName ||
        parsed.name ||
        parsed.full_name ||
        parsed.display_name,
      user_name:
        parsed.user_name || parsed.username || parsed.email || parsed.login,
      is_active:
        parsed.is_active ??
        (parsed.status !== "ØºÛŒØ±ÙØ¹Ø§Ù„" && parsed.status !== "inactive"),
      status:
        parsed.status ||
        (parsed.is_active === false ? "ØºÛŒØ±ÙØ¹Ø§Ù„" : "ÙØ¹Ø§Ù„"),
    };
    variants.push(profileLike);
  }

  return variants.filter(
    (item, index, array) =>
      index ===
      array.findIndex(
        (candidate) => JSON.stringify(candidate) === JSON.stringify(item),
      ),
  );
}

export function resolveFrontendAssetPath(value) {
  if (!value || typeof value !== "string") return value || "";

  const normalized = value.trim();
  if (
    /^https?:\/\//i.test(normalized) ||
    normalized.startsWith("/") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  const cleanValue = normalized
    .replace(/^\.\/+/g, "")
    .replace(/^\.\.\/+/g, "")
    .replace(/^\/+/, "");

  const nestedPaths = [
    "/products/",
    "/details/",
    "/cart/",
    "/about-us/",
    "/admin/",
    "/userpanel/",
  ];
  const isNested = nestedPaths.some((segment) =>
    window.location.pathname.includes(segment),
  );

  if (
    cleanValue.startsWith("assets/") ||
    cleanValue.startsWith("images/") ||
    cleanValue.startsWith("assets/images/products/") ||
    cleanValue.startsWith("images/products/")
  ) {
    return isNested ? `../${cleanValue}` : `./${cleanValue}`;
  }

  return normalized;
}

export function resolveProductImagePath(value) {
  const fallback = "./assets/images/products/achar.jpg";

  if (!value || typeof value !== "string") {
    return resolveFrontendAssetPath(fallback);
  }

  const normalized = value.trim();
  if (normalized === "undefined" || normalized === "null") {
    return resolveFrontendAssetPath(fallback);
  }

  return resolveFrontendAssetPath(normalized);
}

export async function fetchWithAuth(endpoint, options = {}) {
  let token = localStorage.getItem("token");

  if (token) token = token.replace(/^"(.*)"$/, "$1");

  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (cleanEndpoint === "/profile" || cleanEndpoint.startsWith("/profile?")) {
    cleanEndpoint = "/profile";
  }

  if (cleanEndpoint === "/account" || cleanEndpoint.startsWith("/account?")) {
    const method = (options.method || "GET").toUpperCase();
    if (method === "DELETE") {
      return {
        status: false,
        message:
          "حذف حساب کاربری در بک‌اند فعلی فعال نیست؛ endpoint /account وجود ندارد.",
      };
    }
    cleanEndpoint = "/admin-users";
  }

  const requestMethod = (options.method || "GET").toUpperCase();

  const authRequiredPatterns = [
    "/admin-users",
    "/admin?dashboard=true",
    "/admin",
    "/accounting",
    "/settings",
    "/order",
    "/cart",
    "/profile",
    "/account",
    "/interests",
  ];

  const needsAuth =
    authRequiredPatterns.some((pattern) => cleanEndpoint.includes(pattern)) ||
    (cleanEndpoint === "/products" &&
      ["POST", "PUT", "DELETE"].includes(requestMethod));

  if (!token && needsAuth) {
    return {
      status: false,
      authRequired: true,
      message: "ÙˆØ±ÙˆØ¯ Ù„Ø§Ø²Ù… Ø§Ø³Øª",
    };
  }

  if (cleanEndpoint.startsWith("/orders")) {
    cleanEndpoint = cleanEndpoint.replace("/orders", "/order");
  }

  if (
    USE_MOCK_FALLBACK &&
    (isMockEndpoint(cleanEndpoint) ||
      cleanEndpoint.includes("/cart") ||
      cleanEndpoint.includes("/order") ||
      cleanEndpoint.includes("/products") ||
      cleanEndpoint.includes("/reviews"))
  ) {
    return getFallbackData(cleanEndpoint);
  }

  let isAdminCreationRequest = false;
  if (cleanEndpoint === "/admin-users" && requestMethod === "POST") {
    try {
      const requestBody =
        typeof options.body === "string"
          ? JSON.parse(options.body)
          : options.body;
      isAdminCreationRequest = requestBody?.add_admin === true;
    } catch {
      isAdminCreationRequest = false;
    }
  }

  const isAccountingWrite =
    cleanEndpoint === "/accounting" &&
    ["POST", "PUT", "DELETE"].includes(requestMethod);
  const isProductWrite =
    cleanEndpoint === "/products" &&
    ["POST", "PUT", "DELETE"].includes(requestMethod);
  const requestVariants =
    isAdminCreationRequest || isAccountingWrite || isProductWrite
      ? [cleanEndpoint]
      : generateFallbackEndpointVariants(cleanEndpoint);
  let lastError = null;

  for (const variant of requestVariants) {
    const method = (options.method || "GET").toUpperCase();
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    const headers = {
      Accept: "application/json",
      ...(method !== "GET" && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    };

    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }

    const candidateBody = options.body;
    const bodyVariants = isFormData
      ? [candidateBody]
      : buildRequestBodyVariants(variant, candidateBody);

    for (const bodyVariant of bodyVariants) {
      try {
        const response = await fetch(`${BASE_URL}${variant}`, {
          ...options,
          method,
          headers,
          ...(method !== "GET"
            ? {
                body: isFormData ? bodyVariant : JSON.stringify(bodyVariant),
              }
            : {}),
        });

        const responseText = await response.text();
        let responseData = null;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch {
          responseData = null;
        }

        if (response.ok) {
          if (responseData && typeof responseData === "object") {
            const nestedData =
              responseData.data ??
              responseData.result ??
              responseData.items ??
              responseData.orders ??
              responseData.user ??
              responseData.profile;
            if (nestedData !== undefined && nestedData !== null) {
              return {
                ...responseData,
                data: nestedData,
              };
            }
          }
          return responseData ?? {};
        }

        const message =
          responseData?.message ||
          responseData?.error ||
          `Ø®Ø·Ø§ÛŒ API (${response.status})`;
        const error = new Error(message);
        error.status = response.status;
        lastError = error;

        if (response.status === 401) {
          ["token", "user", "userData", "userRole"].forEach((key) => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
          });
          throw error;
        }

        if (response.status === 404 || response.status === 405) {
          continue;
        }
      } catch (error) {
        lastError = error;
        if (
          USE_MOCK_FALLBACK &&
          (cleanEndpoint.includes("/cart") ||
            cleanEndpoint.includes("/order") ||
            cleanEndpoint.includes("/products") ||
            cleanEndpoint.includes("/reviews"))
        ) {
          return getFallbackData(cleanEndpoint);
        }
      }
    }
  }

  if (lastError && USE_MOCK_FALLBACK) {
    return getFallbackData(cleanEndpoint);
  }

  if (lastError) throw lastError;
  throw new Error("Ø®Ø·Ø§ Ø¯Ø± Ø§Ø±ØªØ¨Ø§Ø· Ø¨Ø§ Ø³Ø±ÙˆØ±");
}

function isMockEndpoint(endpoint) {
  // Ù…Ø³ÛŒØ±Ù‡Ø§ÛŒÛŒ Ú©Ù‡ Ø¯Ø± Ø¨Ú©â€ŒØ§Ù†Ø¯ Ù¾ÛŒØ§Ø¯Ù‡â€ŒØ³Ø§Ø²ÛŒ Ù†Ø´Ø¯Ù‡â€ŒØ§Ù†Ø¯ ÛŒØ§ 404 Ù…ÛŒâ€ŒØ¯Ù‡Ù†Ø¯
  return (
    endpoint.includes("dashboard=true") ||
    endpoint.includes("profile=true") ||
    endpoint.includes("limit=")
  );
}

function getFallbackData(endpoint) {
  if (endpoint.includes("/products")) {
    const productList =
      allProducts && allProducts.length ? allProducts : fallbackProducts;
    return { status: true, data: productList };
  }
  if (endpoint.includes("/cart")) {
    return { status: true, data: cart };
  }
  if (endpoint.includes("/order")) {
    return { status: true, data: [] };
  }
  if (
    endpoint.includes("/accounting") ||
    endpoint.includes("/dashboard") ||
    endpoint.includes("/admin")
  ) {
    return {
      status: true,
      total_income: 25200000,
      total_expenses: 25200000,
      net_profit: 0,
      orders_count: 0,
      products_count: allProducts.length || 0,
      users_count: 0,
      income: [],
      expenses: [],
      transactions: [
        {
          id: 1,
          type: "expense",
          title: "Ø®Ø±ÛŒØ¯ Ù…ÙˆØ§Ø¯ Ø§ÙˆÙ„ÛŒÙ‡",
          amount: 500000,
          transaction_date: "1405-06-07",
        },
      ],
    };
  }
  if (endpoint.includes("/settings")) {
    return {
      status: true,
      contact_phone: "09120000000",
      contact_mobile: "09120000000",
      instagram: "shop@",
      store_address: "Ø§ØµÙÙ‡Ø§Ù†",
    };
  }
  if (endpoint.includes("/reviews")) {
    return { status: true, data: [] };
  }
  if (endpoint.includes("/admin-users")) {
    return {
      status: true,
      name: "Ù…Ø¯ÛŒØ± ÙØ±ÙˆØ´Ú¯Ø§Ù‡",
      email: "admin@shop.com",
      mobile: "09120000000",
      data: [],
    };
  }
  return { status: true, data: [] };
}
