import { fetchWithAuth, resolveFrontendAssetPath } from "./data.js";

/**
 * مدیریت بخش دسته‌بندی‌ها
 * @param {Function} onSelectCategory - تابعی که پس از انتخاب یک دسته‌بندی فراخوانی می‌شود
 */
export function decodeUtf8Mojibake(value) {
  if (value === null || value === undefined || value === "") return "";

  let str = String(value).trim();
  if (!str) return "";

  const mojibakePattern = /[Ø-ö]/.test(str) || /Ã|Â|â|Ã¼|Ã©|Â/.test(str);
  if (!mojibakePattern) return str;

  try {
    const repaired = decodeURIComponent(escape(str));
    if (repaired && repaired !== str) return repaired;
  } catch {
    // ignore
  }

  return str;
}

export function normalizeCategoryText(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

export function extractNestedCategoryValues(source) {
  if (!source) return [];
  const values = [];
  const pushValue = (value) => {
    if (value === null || value === undefined || value === "") return;
    values.push(value);
  };

  if (Array.isArray(source)) {
    source.forEach((item) => {
      if (typeof item === "object") {
        pushValue(item.id);
        pushValue(item.category_id);
        pushValue(item.name);
        pushValue(item.title);
        pushValue(item.slug);
      } else {
        pushValue(item);
      }
    });
    return values;
  }

  if (typeof source === "object") {
    pushValue(source.id);
    pushValue(source.category_id);
    pushValue(source.name);
    pushValue(source.title);
    pushValue(source.slug);
  } else {
    pushValue(source);
  }

  return values;
}

export function matchesSelectedCategory(product, categoryFilter) {
  if (!categoryFilter) return true;

  const categoryIdValue = categoryFilter.id;
  const categoryNameValue = categoryFilter.name || "";

  const productCategoryCandidates = [
    product.category_id,
    product.categoryId,
    product.category,
    product.category_name,
    product.categoryName,
    product.category?.id,
    product.category?.name,
    product.category?.title,
    product.categories,
    product.category_ids,
    product.categoryIds,
    product.categories?.[0],
    product.name,
    product.title,
    product.description,
    product.brand_name,
    ...extractNestedCategoryValues(product.categories),
    ...extractNestedCategoryValues(product.category),
  ];

  const hasCategoryIdMatch = productCategoryCandidates.some((value) => {
    const nestedValues = extractNestedCategoryValues(value);
    return nestedValues.some(
      (item) => String(item) === String(categoryIdValue),
    );
  });

  const normalizedName = normalizeCategoryText(categoryNameValue);
  const productTitleMatches = productCategoryCandidates.some((value) => {
    const nestedValues = extractNestedCategoryValues(value);
    return nestedValues.some((item) => {
      if (!item || item === "undefined" || item === "null") return false;
      return normalizeCategoryText(item).includes(normalizedName);
    });
  });

  if (
    !hasCategoryIdMatch &&
    !productTitleMatches &&
    product &&
    categoryNameValue
  ) {
    console.warn(
      "Category mismatch: product has no category relation in payload",
      {
        productId: product.id,
        categoryName: categoryNameValue,
        categories: product.categories,
        category_id: product.category_id,
        category: product.category,
      },
    );
  }

  return hasCategoryIdMatch || productTitleMatches;
}

export async function initCategories(onSelectCategory) {
  const categoriesContainer =
    document.getElementById("categories-container") ||
    document.getElementById("categories-grid");

  if (!categoriesContainer) return;

  let categories = [];

  try {
    const response = await fetchWithAuth("/categories");
    categories = Array.isArray(response) ? response : response?.data || [];
  } catch (error) {
    console.error("خطا در دریافت لیست دسته‌بندی‌ها:", error);
  }

  renderCategories(categories, categoriesContainer, onSelectCategory);
}

document.addEventListener("DOMContentLoaded", () => {
  const categoriesGrid = document.getElementById("categories-grid");
  if (categoriesGrid) {
    initCategories((categoryId, categoryName) => {
      const params = new URLSearchParams({
        categoryId: String(categoryId),
        categoryName,
      });
      window.location.href = `./products/index.html?${params.toString()}`;
    });
  }
});

/**
 * رندر کردن دسته‌بندی‌ها در صفحه
 */
function renderCategories(categories, container, onSelectCategory) {
  container.innerHTML = "";

  const normalizedCategories = categories
    .map((cat) => ({
      ...cat,
      id: cat.id ?? cat.category_id,
      title: decodeUtf8Mojibake(cat.title || cat.name || "دسته‌بندی"),
    }))
    .filter((cat) => cat.id && cat.title && cat.title.trim() !== "")
    .filter(
      (cat, index, array) =>
        array.findIndex(
          (item) =>
            String(item.id) === String(cat.id) || item.title === cat.title,
        ) === index,
      );

  if (normalizedCategories.length === 0) {
    container.innerHTML = `
      <div class="w-full py-6 text-center text-gray-400">
        دسته‌بندی یافت نشد.
      </div>
    `;
    return;
  }

  normalizedCategories.forEach((cat) => {
    const title = cat.title;
    const fallbackImage = resolveFrontendAssetPath("./assets/images/products/achar.jpg");
    const rawImage = String(cat.image || cat.icon || "").trim();
    const image = /^fa-[a-z0-9-]+$/i.test(rawImage)
      ? fallbackImage
      : resolveFrontendAssetPath(rawImage || "./assets/images/products/achar.jpg");

    container.insertAdjacentHTML(
      "beforeend",
      `
      <div data-category-id="${cat.id}" data-category-name="${title}" class="category-card h-36 w-36 shrink-0 cursor-pointer rounded-lg border border-purple1/30 bg-white p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-all">
        <div class="w-16 h-16 mb-2 overflow-hidden flex items-center justify-center">
          <img src="${image}" alt="${title}" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='${fallbackImage}';" />
        </div>
        <h4 class="font-bold text-black-main text-sm truncate w-full">${title}</h4>
      </div>
    `,
    );
  });

  container.querySelectorAll(".category-card").forEach((card) => {
    card.addEventListener("click", () => {
      const selectedCatId = card.dataset.categoryId;
      const selectedCatName =
        card.dataset.categoryName || card.textContent.trim();
      if (typeof onSelectCategory === "function") {
        onSelectCategory(selectedCatId, selectedCatName);
      }
    });
  });

  window.setupProductCardSlider?.(
    "categories-grid",
    "categoriesPrev",
    "categoriesNext",
  );
}
