import { BASE_URL } from "./data.js";

// ==========================================================================
// اطلاعات فروشگاه (Site Info) — گرفتن اطلاعات حساب ادمین از بک‌اند و نمایش
// آن در فوتر همه صفحات و بخش «راه‌های ارتباطی» صفحه درباره‌ما.
// منبع داده فقط بک‌اند است؛ اگر مقداری برنگردد، متن پیش‌فرض HTML باقی می‌ماند.
// ==========================================================================

const SETTINGS_ENDPOINTS = [
  "/settings",
  "/admin/settings",
  "/settings?general=true",
];

function getToken() {
  let token = localStorage.getItem("token");
  if (!token) return "";
  token = token.replace(/^"(.*)"$/, "$1");
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

// یک GET عمومی مستقیم (بدون گیت auth ماژول data.js) که JSON برمی‌گرداند یا null.
async function getJson(endpoint, withToken = false) {
  try {
    const headers = { Accept: "application/json" };
    if (withToken) {
      const token = getToken();
      if (token) headers["Authorization"] = token;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers,
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function normalize(res) {
  const payload = res?.data ?? res ?? {};
  const s = payload.settings ?? payload.user ?? payload.profile ?? payload;
  if (!s || typeof s !== "object") return {};

  return {
    name: s.name || s.full_name || s.fullName || s.display_name || "",
    phone:
      s.contact_phone || s.phone || s.mobile || s.contactMobile || s.phone_number || "",
    email: s.email || "",
    instagram: s.instagram || "",
    telegram: s.telegram || "",
    rubika: s.rubika || s.roobika || "",
    whatsapp: s.whatsapp || s.whats_app || "",
    address: s.store_address || s.address || s.shop_address || "",
    website: s.website || s.site || s.site_url || "",
    work_hours: s.work_hours || s.working_hours || s.workHours || "",
  };
}

async function fetchSiteInfo() {
  // بک‌اند فعلاً endpoint عمومی (بدون توکن) برای اطلاعات فروشگاه ندارد؛ مسیرهای
  // /settings و /admin-users فقط با توکن ادمین کار می‌کنند و برای بازدیدکننده‌ی
  // عمومی 401 می‌دهند. پس تا وقتی توکن نیست هیچ درخواستی نمی‌زنیم تا کنسول خطا
  // نگیرد و متن پیش‌فرض HTML حفظ شود. وقتی بک‌اند endpoint عمومی اضافه کرد،
  // این گارد را بردار و آن endpoint را این‌جا صدا بزن.
  if (!getToken()) return {};

  // اگر ادمین وارد شده، تازه‌ترین پروفایل حساب را هم امتحان کن.
  const profile = await getJson("/admin-users?profile=true", true);
  const normalizedProfile = normalize(profile);
  if (hasAnyValue(normalizedProfile)) return normalizedProfile;

  for (const endpoint of SETTINGS_ENDPOINTS) {
    const res = await getJson(endpoint, true);
    const normalized = normalize(res);
    if (hasAnyValue(normalized)) return normalized;
  }
  return {};
}

function hasAnyValue(info) {
  return Object.values(info || {}).some(
    (value) => typeof value === "string" && value.trim() !== "",
  );
}

// ساخت لینک از روی مقدار هر کانال
function buildLink(kind, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const handle = raw.replace(/^@/, "").replace(/^https?:\/\/[^/]+\//i, "").trim();
  const digits = raw.replace(/[^\d]/g, "");

  switch (kind) {
    case "phone":
      return digits ? `tel:${digits}` : "";
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "telegram":
      return `https://t.me/${handle}`;
    case "whatsapp":
      return digits ? `https://wa.me/${digits}` : "";
    case "rubika":
      return `https://rubika.ir/${handle}`;
    case "website":
      return /^https?:\/\//i.test(raw) ? raw : `https://${handle}`;
    default:
      return "";
  }
}

function applySiteInfo(info) {
  // پر کردن متن‌ها
  document.querySelectorAll("[data-site-info]").forEach((el) => {
    const key = el.getAttribute("data-site-info");
    const value = info[key];
    if (value && String(value).trim() !== "") {
      el.textContent = value;
      revealHolder(el, key);
    }
  });

  // تنظیم لینک‌ها
  document.querySelectorAll("[data-site-link]").forEach((el) => {
    const kind = el.getAttribute("data-site-link");
    const href = buildLink(kind, info[kind]);
    if (href) {
      el.setAttribute("href", href);
      revealHolder(el, kind);
    }
  });
}

// اگر آیتم فوتر/کارت به‌صورت پیش‌فرض hidden بود، وقتی مقدار داشت نمایش بده.
function revealHolder(el, key) {
  const holder = el.closest("[data-site-item]");
  if (holder && holder.getAttribute("data-site-item") === key) {
    holder.classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // فقط وقتی در صفحه‌ای عنصر مربوطه هست کار کن.
  if (
    !document.querySelector("[data-site-info]") &&
    !document.querySelector("[data-site-link]")
  ) {
    return;
  }

  try {
    const info = await fetchSiteInfo();
    if (hasAnyValue(info)) applySiteInfo(info);
  } catch (err) {
    console.error("خطا در دریافت اطلاعات فروشگاه:", err?.message || err);
  }
});
