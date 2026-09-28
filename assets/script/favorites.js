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

export function isFavorite(productId) {
  const id = String(productId ?? "");
  return getFavoriteProducts().some((product) => product.id === id);
}

export function toggleFavorite(product) {
  const favorite = normalizeFavorite(product);
  if (!favorite) return false;

  registerFavoriteProduct(product);
  const favorites = getFavoriteProducts();
  const existingIndex = favorites.findIndex((item) => item.id === favorite.id);
  const added = existingIndex < 0;

  if (added) {
    favorites.push(favorite);
  } else {
    favorites.splice(existingIndex, 1);
  }

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

document.addEventListener("click", (event) => {
  const button = event.target.closest(".favorite-toggle-btn");
  if (!button) return;

  event.preventDefault();
  const product = registeredProducts.get(String(button.dataset.productId));
  if (product) toggleFavorite(product);
});

window.addEventListener("storage", (event) => {
  if (event.key !== FAVORITES_STORAGE_KEY) return;
  document.querySelectorAll(".favorite-toggle-btn").forEach((button) => {
    const active = isFavorite(button.dataset.productId);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
      "aria-label",
      active ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها",
    );
    const icon = button.querySelector("svg");
    icon?.classList.toggle("fill-purple1", active);
    icon?.classList.toggle("fill-none", !active);
  });
  window.dispatchEvent(new CustomEvent("favoriteschange"));
});