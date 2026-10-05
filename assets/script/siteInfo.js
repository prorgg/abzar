import { BASE_URL } from "./data.js";

async function getSettings() {
  const response = await fetch(`${BASE_URL}/settings`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`دریافت تنظیمات فروشگاه ناموفق بود (HTTP ${response.status})`);
  }

  const result = await response.json();
  if (result?.status === false || result?.status === "error") {
    throw new Error(result.message || "دریافت تنظیمات فروشگاه ناموفق بود.");
  }
  return result;
}

function flattenSettings(response) {
  let payload = response;

  for (let depth = 0; depth < 5; depth += 1) {
    if (!payload || typeof payload !== "object") return {};
    const nested = payload.settings ?? payload.data ?? payload.result;
    if (!nested || typeof nested !== "object") break;
    payload = nested;
  }

  if (Array.isArray(payload)) {
    return payload.reduce((settings, row) => {
      if (row && typeof row === "object" && row.key != null) {
        settings[row.key] = row.value ?? "";
      }
      return settings;
    }, {});
  }

  if (!payload || typeof payload !== "object") return {};

  const settings = {};
  Object.values(payload).forEach((group) => {
    if (!Array.isArray(group)) return;
    group.forEach((row) => {
      if (row && typeof row === "object" && row.key != null) {
        settings[row.key] = row.value ?? "";
      }
    });
  });

  return Object.keys(settings).length > 0 ? settings : payload;
}

function normalize(response) {
  const settings = flattenSettings(response);
  const social = settings.social ?? settings.socials ?? {};
  const contact = settings.contact ?? {};

  return {
    name:
      settings.site_name ||
      settings.siteName ||
      settings.store_name ||
      settings.shop_name ||
      settings.name ||
      settings.full_name ||
      settings.fullName ||
      settings.display_name ||
      "",
    phone:
      settings.contact_phone ||
      settings.phone ||
      settings.phone_number ||
      contact.phone ||
      "",
    mobile:
      settings.contact_mobile ||
      settings.contactMobile ||
      settings.mobile ||
      settings.phone_number ||
      "",
    instagram:
      settings.instagram ||
      settings.shop_instagram ||
      settings.store_instagram ||
      social.instagram ||
      contact.instagram ||
      "",
    telegram:
      settings.telegram ||
      settings.shop_telegram ||
      settings.store_telegram ||
      social.telegram ||
      contact.telegram ||
      "",
    rubika:
      settings.rubika ||
      settings.roobika ||
      settings.shop_rubika ||
      settings.store_rubika ||
      social.rubika ||
      contact.rubika ||
      "",
    whatsapp:
      settings.whatsapp ||
      settings.whats_app ||
      settings.shop_whatsapp ||
      settings.store_whatsapp ||
      social.whatsapp ||
      contact.whatsapp ||
      "",
    address:
      settings.store_address ||
      settings.address ||
      settings.shop_address ||
      settings.contact_address ||
      contact.address ||
      settings.location ||
      "",
    website:
      settings.website ||
      settings.site ||
      settings.site_url ||
      settings.siteUrl ||
      "",
    work_hours:
      settings.work_hours ||
      settings.working_hours ||
      settings.workHours ||
      settings.workingHours ||
      "",
  };
}

function buildLink(kind, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const handle = raw
    .replace(/^@/, "")
    .replace(/^https?:\/\/[^/]+\//i, "")
    .trim();
  const digits = raw.replace(/[^\d]/g, "");

  switch (kind) {
    case "phone":
    case "mobile":
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

function getHolder(element, key) {
  const item = element.closest("[data-site-item]");
  if (item?.getAttribute("data-site-item") === key) return item;
  return element.closest("li");
}

function setHolderVisibility(element, key, visible) {
  const holder = getHolder(element, key);
  if (holder) holder.classList.toggle("hidden", !visible);
}

async function resolveBaladLocation(address) {
  const link = document.querySelector('[data-site-map-link="balad"]');
  if (!link || !address) return;

  const fallbackUrl = `https://balad.ir/search?query=${encodeURIComponent(address)}`;
  link.href = fallbackUrl;

  const response = await fetch(
    `https://search.raah.ir/v6/?text=${encodeURIComponent(address)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`جست‌وجوی مکان در بلد ناموفق بود (HTTP ${response.status})`);
  }

  const result = await response.json();
  const places = Array.isArray(result?.results) ? result.results : [];
  const place = places.find(
    (item) =>
      item?.type === "poi" &&
      item.id &&
      Array.isArray(item.center_point) &&
      item.center_point.length >= 2 &&
      item.center_point.every((coordinate) => Number.isFinite(Number(coordinate))),
  );

  if (!place) {
    throw new Error("برای آدرس فروشگاه در بلد مکان دقیقی پیدا نشد.");
  }

  const [longitude, latitude] = place.center_point.map(Number);
  link.href = `https://balad.ir/p/${encodeURIComponent(place.id)}#15/${latitude}/${longitude}`;
}

function applySiteInfo(info) {
  document.querySelectorAll("[data-site-info]").forEach((element) => {
    const key = element.getAttribute("data-site-info");
    const value = info[key];
    const hasValue = value != null && String(value).trim() !== "";

    element.textContent = hasValue ? value : "";
    setHolderVisibility(element, key, hasValue);
  });

  document.querySelectorAll("[data-site-link]").forEach((element) => {
    const kind = element.getAttribute("data-site-link");
    const href = buildLink(kind, info[kind]);
    if (href) {
      element.setAttribute("href", href);
      setHolderVisibility(element, kind, true);
    } else {
      element.removeAttribute("href");
      setHolderVisibility(
        element,
        kind,
        info[kind] != null && String(info[kind]).trim() !== "",
      );
    }
  });

  const address = String(info.address || "").trim();
  const mapFrame = document.querySelector("[data-site-map-frame]");
  const mapPlaceholder = document.querySelector("[data-site-map-placeholder]");
  const directions = document.querySelector("[data-site-directions]");

  document.querySelectorAll("[data-site-map-link]").forEach((element) => {
    const provider = element.getAttribute("data-site-map-link");
    if (!address) {
      element.removeAttribute("href");
      return;
    }

    const query = encodeURIComponent(address);
    const mapUrls = {
      balad: `https://balad.ir/search?query=${query}`,
      neshan: `https://neshan.org/maps/search/${query}`,
    };
    const href = mapUrls[provider];
    if (href) element.setAttribute("href", href);
  });

  if (directions) directions.classList.toggle("hidden", !address);
  if (mapFrame) {
    if (address) {
      mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
      mapFrame.classList.remove("hidden");
    } else {
      mapFrame.removeAttribute("src");
      mapFrame.classList.add("hidden");
    }
  }
  if (mapPlaceholder) mapPlaceholder.classList.toggle("hidden", Boolean(address));
}

document.addEventListener("DOMContentLoaded", async () => {
  if (
    !document.querySelector("[data-site-info]") &&
    !document.querySelector("[data-site-link]")
  ) {
    return;
  }

  applySiteInfo({});
  try {
    const info = normalize(await getSettings());
    applySiteInfo(info);
    try {
      await resolveBaladLocation(String(info.address || "").trim());
    } catch (error) {
      console.error("خطا در ساخت لینک موقعیت بلد:", error?.message || error);
    }
  } catch (error) {
    console.error("خطا در دریافت اطلاعات فروشگاه:", error?.message || error);
  }
});
