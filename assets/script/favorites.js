import { fetchWithAuth } from "./data.js";

export const FAVORITES_STORAGE_KEY = "abzari:favorite-products";

const registeredProducts = new Map();

function normalizeFavorite(product) {
  const id = product?.id ?? product?.product_id;
  if (id === null || id === undefined || id === "") return null;

  let images = product.images ?? product.gallery ?? product.image_urls ?? product.imageUrl;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }

  const image = Array.isArray(images)
    ? images.find((item) => item && item !== "null" && item !== "undefined")
    : images;
  const priceCandidates = [
    product.final_price,
    product.sale_price,
    product.price,
    product.base_price,
  ];
  const price = priceCandidates
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number)
    .find((value) => Number.isFinite(value)) ?? 0;

  return {
    id: String(id),
    title: String(product.title || product.name || "محصول بدون عنوان"),
    brand: String(
      product.brand || product.brand_name || product.manufacturer || "بدون برند",
    ),
    price,
    image: String(
      image ||
        product.image ||
        product.image_url ||
        product.cover ||
        product.pic ||
        "",
    ),
  };
}

export function registerFavoriteProduct(product) {
  const favorite = normalizeFavorite(product);
  if (!favorite) return;
  registeredProducts.set(favorite.id, product);
}

export function getFavoriteProducts() {
  try {
    const favorites = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    return Array.isArray(favorites)
      ? favorites.map(normalizeFavorite).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function updateFavoriteButtons() {
  const favoriteIds = new Set(getFavoriteProducts().map((product) => product.id));
  document.querySelectorAll(".favorite-toggle-btn").forEach((button) => {
    const active = favoriteIds.has(String(button.dataset.productId ?? ""));
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
      "aria-label",
      active ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها",
    );
    const icon = button.querySelector("svg");
    icon?.classList.toggle("fill-purple1", active);
    icon?.classList.toggle("fill-none", !active);
  });
}

export function isFavorite(productId) {
  const id = String(productId ?? "");
  return getFavoriteProducts().some((product) => product.id === id);
}

export function toggleFavorite(product) {
  const favorite = normalizeFavorite(product);
  if (!favorite) return false;

  registerFavoriteProduct(product);
  const existing = getFavoriteProducts().some(
    (item) => item.id === favorite.id,
  );
  return setFavoriteState(product, !existing);
}

function setFavoriteState(product, added) {
  const favorite = normalizeFavorite(product);
  if (!favorite) return false;

  registerFavoriteProduct(product);
  const favorites = getFavoriteProducts().filter(
    (item) => item.id !== favorite.id,
  );
  if (added) favorites.push(favorite);
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("ذخیره علاقه‌مندی‌ها انجام نشد:", error);
    return false;
  }

  document.querySelectorAll(".favorite-toggle-btn").forEach((button) => {
    if (String(button.dataset.productId) !== favorite.id) return;
    const active = added;
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
      "aria-label",
      active ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها",
    );
    const icon = button.querySelector("svg");
    icon?.classList.toggle("fill-purple1", active);
    icon?.classList.toggle("fill-none", !active);
  });

  window.dispatchEvent(
    new CustomEvent("favoriteschange", {
      detail: { productId: favorite.id, added },
    }),
  );
  return added;
}

function getInterestRows(payload, depth = 0) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object" || depth > 4) return [];

  for (const key of ["date", "data", "interests", "result", "items", "payload"]) {
    const rows = getInterestRows(payload[key], depth + 1);
    if (rows.length) return rows;
  }

  return [];
}

async function toggleAccountFavorite(product) {
  const favorite = normalizeFavorite(product);
  if (!favorite) return false;

  const interestsResponse = await fetchWithAuth("/interests");
  if (
    interestsResponse?.status === false ||
    interestsResponse?.status === "error" ||
    interestsResponse?.authRequired
  ) {
    throw new Error(
      interestsResponse.message || "دریافت علاقه‌مندی‌ها ناموفق بود.",
    );
  }

  const existing = getInterestRows(interestsResponse).find(
    (interest) =>
      String(
        interest.product_id ??
          interest.productId ??
          interest.product?.id ??
          interest.product?.product_id ??
          "",
      ) === favorite.id,
  );
  const added = !existing;
  const interestId =
    existing?.id ?? existing?.interests_id ?? existing?.interest_id;
  if (!added && (interestId === null || interestId === undefined)) {
    throw new Error("شناسهٔ علاقه‌مندی برای حذف از API پیدا نشد.");
  }
  const response = await fetchWithAuth("/interests", {
    method: added ? "POST" : "DELETE",
    body: added
      ? { product_id: favorite.id }
      : { interests_id: interestId },
  });
  if (
    response?.status === false ||
    response?.status === "error" ||
    response?.authRequired ||
    response?.success === false ||
    response?.ok === false
  ) {
    throw new Error(
      response.message || "به‌روزرسانی علاقه‌مندی‌ها انجام نشد.",
    );
  }

  return setFavoriteState(product, added);
}

async function syncAccountFavorites() {
  if (!localStorage.getItem("token")) return;

  try {
    const response = await fetchWithAuth("/interests");
    if (
      response?.status === false ||
      response?.status === "error" ||
      response?.authRequired ||
      response?.success === false ||
      response?.ok === false
    ) {
      throw new Error(response.message || "دریافت علاقه‌مندی‌ها ناموفق بود.");
    }

    const savedFavorites = new Map(
      getFavoriteProducts().map((favorite) => [favorite.id, favorite]),
    );
    const favorites = getInterestRows(response)
      .map((interest) => {
        const product = interest.product ?? interest;
        const id =
          interest.product_id ??
          interest.productId ??
          product.id ??
          product.product_id;
        if (id === null || id === undefined || id === "") return null;

        return normalizeFavorite({
          ...savedFavorites.get(String(id)),
          ...(product && typeof product === "object" ? product : {}),
          id,
        });
      })
      .filter(Boolean);

    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    updateFavoriteButtons();
    window.dispatchEvent(new CustomEvent("favoriteschange"));
  } catch (error) {
    console.error("همگام‌سازی علاقه‌مندی‌ها با API ناموفق بود:", error);
    window.showAppNotice?.(
      error.message || "دریافت علاقه‌مندی‌های حساب کاربری ناموفق بود.",
    );
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".favorite-toggle-btn");
  if (!button) return;

  event.preventDefault();
  const product = registeredProducts.get(String(button.dataset.productId));
  if (!product) return;

  if (!localStorage.getItem("token")) {
    toggleFavorite(product);
    return;
  }

  button.disabled = true;
  toggleAccountFavorite(product)
    .catch((error) => {
      console.error("ذخیره علاقه‌مندی در API ناموفق بود:", error);
      window.showAppNotice?.(
        error.message || "ذخیره علاقه‌مندی در حساب کاربری ناموفق بود.",
      );
    })
    .finally(() => {
      button.disabled = false;
    });
});

window.addEventListener("authstatechange", syncAccountFavorites);
if (localStorage.getItem("token")) syncAccountFavorites();

window.addEventListener("storage", (event) => {
  if (event.key === "token") {
    if (event.newValue) syncAccountFavorites();
    else window.dispatchEvent(new CustomEvent("favoriteschange"));
    return;
  }
  if (event.key === FAVORITES_STORAGE_KEY) {
    updateFavoriteButtons();
    window.dispatchEvent(new CustomEvent("favoriteschange"));
  }
});