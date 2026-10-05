import { fetchWithAuth } from "../data.js";

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

async function requestAnyOf(endpointList, options = {}) {
  let lastError = null;

  for (const endpoint of endpointList) {
    try {
      const result = await fetchWithAuth(endpoint, options);
      if (result?.status === false || result?.authRequired) {
        lastError = new Error(result.message || "درخواست ناموفق بود.");
        continue;
      }
      if (result !== null && result !== undefined) return result;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
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

function normalizeSettingsPayload(payload, depth = 0) {
  if (!payload || typeof payload !== "object" || depth > 5) return {};

  if (Array.isArray(payload)) {
    return payload.reduce((settings, row) => {
      if (row && typeof row === "object" && row.key != null) {
        settings[row.key] = row.value ?? "";
      }
      return settings;
    }, {});
  }

  for (const key of ["data", "settings", "result", "profile"]) {
    if (payload[key] && typeof payload[key] === "object") {
      const normalized = normalizeSettingsPayload(payload[key], depth + 1);
      if (Object.keys(normalized).length) return normalized;
    }
  }

  const rows = Object.values(payload).some(Array.isArray);
  if (rows) {
    return Object.values(payload).reduce((settings, group) => {
      if (!Array.isArray(group)) return settings;
      group.forEach((row) => {
        if (row && typeof row === "object" && row.key != null) {
          settings[row.key] = row.value ?? "";
        }
      });
      return settings;
    }, {});
  }

  return payload;
}

function getSetting(settings, ...keys) {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => {
      if (current && typeof current === "object") return current[part];
      return undefined;
    }, settings);
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

async function initDashboard() {
  await Promise.all([
    fetchDashboardStats(),
    fetchShopInfo(),
    fetchRecentOrders(),
  ]);
}

function canUsePermission(permission) {
  return typeof window.hasAdminPermission !== "function"
    ? true
    : window.hasAdminPermission(permission);
}

// 1. دریافت کارت‌های آمار اصلی
function normalizeDashboardData(payload) {
  const data = payload?.data ?? payload ?? {};
  const summary = data.summary ?? data.stats ?? data.dashboard ?? data;

  return {
    total_income:
      summary?.total_income ??
      summary?.totalSales ??
      summary?.income ??
      data.total_income ??
      data.total_sales ??
      0,
    total_orders:
      summary?.total_orders ??
      summary?.orders_count ??
      summary?.totalOrders ??
      data.total_orders ??
      data.orders_count ??
      0,
    total_products:
      summary?.total_products ??
      summary?.products_count ??
      summary?.totalProducts ??
      data.total_products ??
      data.products_count ??
      0,
    total_users:
      summary?.total_users ??
      summary?.users_count ??
      summary?.totalUsers ??
      data.total_users ??
      data.users_count ??
      0,
  };
}

async function fetchDashboardStats() {
  try {
    const res = await requestAnyOf(
      ["/admin?dashboard=true", "/admin", "/dashboard", "/admin/dashboard"],
      { method: "GET" },
    );
    const data = normalizeDashboardData(res);

    const totalSalesEl = document.getElementById("total-sales");
    const totalOrdersEl = document.getElementById("total-orders");
    const totalProductsEl = document.getElementById("total-products");
    const totalUsersEl = document.getElementById("total-users");

    if (totalSalesEl)
      totalSalesEl.innerText = Number(data.total_income).toLocaleString("en-US");
    if (totalOrdersEl)
      totalOrdersEl.innerText = Number(data.total_orders).toLocaleString("en-US");
    if (totalProductsEl)
      totalProductsEl.innerText = Number(data.total_products).toLocaleString("en-US");
    if (totalUsersEl)
      totalUsersEl.innerText = Number(data.total_users).toLocaleString("en-US");
  } catch (error) {
    console.error("خطا در دریافت آمار داشبورد:", error);
    const totalSalesEl = document.getElementById("total-sales");
    const totalOrdersEl = document.getElementById("total-orders");
    const totalProductsEl = document.getElementById("total-products");
    const totalUsersEl = document.getElementById("total-users");
    [totalSalesEl, totalOrdersEl, totalProductsEl, totalUsersEl].forEach((el) => {
      if (el) el.innerText = "0";
    });
  }
}

// 2. دریافت اطلاعات فروشگاه
async function fetchShopInfo() {
  const shopInfoElements = [...document.querySelectorAll("[data-shop-info]")];
  if (!canUsePermission("settings")) {
    shopInfoElements.forEach((element) => {
      element.textContent = "دسترسی ندارید";
    });
    return;
  }

  try {
    const res = await requestAnyOf(
      ["/settings", "/admin/settings", "/settings?general=true"],
      { method: "GET" },
    );
    if (!res) throw new Error("پاسخ تنظیمات فروشگاه خالی است.");
    const settings = normalizeSettingsPayload(res);
    const values = {
      name: getSetting(
        settings,
        "site_name",
        "siteName",
        "store_name",
        "storeName",
        "shop_name",
        "shopName",
        "name",
      ),
      phone: getSetting(
        settings,
        "contact_phone",
        "contactPhone",
        "telephone",
        "phone",
        "contact.phone",
      ),
      mobile: getSetting(
        settings,
        "contact_mobile",
        "contactMobile",
        "mobile",
        "phone_number",
        "phoneNumber",
      ),
      instagram: getSetting(
        settings,
        "instagram",
        "shop_instagram",
        "shopInstagram",
        "store_instagram",
        "storeInstagram",
        "social.instagram",
        "socials.instagram",
        "contact.instagram",
      ),
      telegram: getSetting(
        settings,
        "telegram",
        "shop_telegram",
        "shopTelegram",
        "store_telegram",
        "storeTelegram",
        "social.telegram",
        "socials.telegram",
        "contact.telegram",
      ),
      rubika: getSetting(
        settings,
        "rubika",
        "roobika",
        "shop_rubika",
        "shopRubika",
        "store_rubika",
        "storeRubika",
        "social.rubika",
        "socials.rubika",
        "contact.rubika",
      ),
      whatsapp: getSetting(
        settings,
        "whatsapp",
        "shop_whatsapp",
        "shopWhatsapp",
        "store_whatsapp",
        "storeWhatsapp",
        "social.whatsapp",
        "socials.whatsapp",
        "contact.whatsapp",
      ),
      address: getSetting(
        settings,
        "store_address",
        "storeAddress",
        "address",
        "shop_address",
        "shopAddress",
        "contact_address",
        "contactAddress",
        "location",
      ),
      shipping: getSetting(
        settings,
        "shipping_cost",
        "shippingCost",
      ),
    };
    const formatShippingCost = (value) => {
      const amount = Number(value);
      return value && Number.isFinite(amount)
        ? `${amount.toLocaleString("en-US")} تومان`
        : "";
    };
    values.shipping = formatShippingCost(values.shipping);

    shopInfoElements.forEach((element) => {
      const value = values[element.dataset.shopInfo] || "ثبت نشده";
      element.textContent = value;
    });
  } catch (error) {
    console.error("خطا در دریافت اطلاعات فروشگاه:", error);
    shopInfoElements.forEach((element) => {
      element.textContent = "دریافت ناموفق بود";
    });
  }
}

// 3. دریافت و نمایش آخرین سفارشات در جدول
async function fetchRecentOrders() {
  const tbody = document.getElementById("recent-orders-tbody");
  if (!tbody) return;

  try {
    const response = await fetchWithAuth("/order", { method: "GET" });
    if (response?.status === false || response?.authRequired) {
      throw new Error(response.message || "دریافت سفارش‌ها ناموفق بود.");
    }
    const orders = normalizeOrdersPayload(response);

    if (orders.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="py-6 text-gray-400">هیچ سفارشی ثبت نشده است.</td></tr>';
      return;
    }

    tbody.innerHTML = orders
      .slice(0, 5)
      .map((order) => {
        const id =
          order.order_number ?? order.order_code ?? order.id ?? "---";
        const customerName =
          order.user?.name ??
          order.user_name ??
          order.customer_name ??
          (order.user_id ? `کاربر شماره ${order.user_id}` : "کاربر ناشناس");
        const total = Number(
          order.final_amount ??
            order.total_amount ??
            order.total_price ??
            order.amount ??
            order.total ??
            0,
        );
        const status =
          order.payment_status ?? order.status ?? order.order_status ?? "pending";
        const isPaid =
          ["paid", "completed", "success", "delivered", "پرداخت شده"].includes(
            String(status).toLowerCase(),
          ) || String(status).includes("پرداخت");
        const statusClass = isPaid ? "text-emerald-500" : "text-amber-500";
        const statusText =
          order.status_label ??
          order.status_text ??
          (isPaid ? "پرداخته شده" : "در انتظار پرداخت");
        const dateText = order.created_at ?? order.date ?? order.createdAt ?? "---";

        return `
        <tr class="border-b border-purple1/20 hover:bg-gray-50 transition-colors">
          <td class="py-4 px-3 font-medium">#${id}</td>
          <td class="py-4 px-3">${customerName}</td>
          <td class="py-4 px-3">${total.toLocaleString("en-US")} تومان</td>
          <td class="py-4 px-3 ${statusClass} font-medium">${statusText}</td>
          <td class="py-4 px-3">${dateText}</td>
        </tr>
      `;
      })
      .join("");
  } catch (error) {
    console.error("خطا در دریافت آخرین سفارشات:", error);
    tbody.innerHTML =
      '<tr><td colspan="5" class="py-6 text-rose-500">خطا در دریافت اطلاعات سفارشات.</td></tr>';
  }
}
