import {
  fetchWithAuth,
  resolveFrontendAssetPath,
  resolveProductImagePath,
} from "./data.js";
import { isFavorite, registerFavoriteProduct } from "./favorites.js";
import {
  decodeUtf8Mojibake,
  matchesSelectedCategory,
} from "./categories.js";

const PAGE_SIZE = 8;

async function fetchCategories() {
  try {
    const response = await fetchWithAuth("/categories");
    const categories = Array.isArray(response)
      ? response
      : response?.data || response?.categories || [];

    return categories
      .map((category) => ({
        id: category.id ?? category.category_id,
        name: decodeUtf8Mojibake(
          category.title || category.name || category.category_name || "",
        ),
      }))
      .filter((category) => category.id && category.name);
  } catch (error) {
    console.error("خطا در دریافت دسته‌بندی‌های فیلتر:", error);
    return [];
  }
}

function getCategoryFilterFromUrl(categories) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("categoryId") || "";
  const name = decodeUtf8Mojibake(params.get("categoryName") || "");
  if (!id && !name) return null;

  const matchedCategory = categories.find(
    (category) =>
      (id && String(category.id) === id) ||
      (name && normalizeText(category.name) === normalizeText(name)),
  );

  return {
    id: id || String(matchedCategory?.id || ""),
    name: name || matchedCategory?.name || "",
  };
}

function populateCategoryFilter(categories, selectedCategory) {
  const categorySelect = document.getElementById("filter-category-select");
  if (!categorySelect) return;

  categorySelect.replaceChildren(new Option("همه دسته‌بندی‌ها", "all"));
  categories.forEach((category) => {
    const option = new Option(category.name, String(category.id));
    option.dataset.categoryName = category.name;
    categorySelect.add(option);
  });

  if (
    selectedCategory?.id &&
    !categories.some((category) => String(category.id) === selectedCategory.id)
  ) {
    const option = new Option(
      selectedCategory.name || `دسته ${selectedCategory.id}`,
      selectedCategory.id,
    );
    option.dataset.categoryName = selectedCategory.name;
    categorySelect.add(option);
  }

  categorySelect.value = selectedCategory?.id || "all";
}

function getSelectedCategoryFilter() {
  const categorySelect = document.getElementById("filter-category-select");
  if (!categorySelect || categorySelect.value === "all") return null;

  const selectedOption = categorySelect.selectedOptions[0];
  return {
    id: categorySelect.value,
    name:
      selectedOption?.dataset.categoryName ||
      selectedOption?.textContent.trim() ||
      "",
  };
}

function updateCategoryFilterUrl(category) {
  const url = new URL(window.location.href);
  if (category) {
    url.searchParams.set("categoryId", category.id);
    url.searchParams.set("categoryName", category.name);
  } else {
    url.searchParams.delete("categoryId");
    url.searchParams.delete("categoryName");
  }
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function updateCategoryFilterChip(category) {
  const chip = document.getElementById("active-category-filter");
  const name = document.getElementById("active-category-name");
  if (!chip || !name) return;

  chip.hidden = !category;
  name.textContent = category?.name || "";
}

function readFilterControls() {
  return {
    search: document.getElementById("filter-search-input")?.value || "",
    discountOnly:
      document.getElementById("filter-discount-select")?.value === "discounted",
    brand: document.getElementById("brand-filter-select")?.value || "all",
    stock: document.getElementById("stock-filter-select")?.value || "all",
    category: getSelectedCategoryFilter(),
  };
}

function writeFilterControls(filters = {}) {
  const search = document.getElementById("filter-search-input");
  const category = document.getElementById("filter-category-select");
  const discount = document.getElementById("filter-discount-select");
  const brand = document.getElementById("brand-filter-select");
  const stock = document.getElementById("stock-filter-select");

  if (search) search.value = filters.search || "";
  if (category) category.value = filters.category?.id || "all";
  if (discount) discount.value = filters.discountOnly ? "discounted" : "all";
  if (brand) brand.value = filters.brand || "all";
  if (stock) stock.value = filters.stock || "all";
}

function hasActiveFilters(filters = {}) {
  return Boolean(
    filters.search?.trim() ||
      filters.discountOnly ||
      (filters.brand && filters.brand !== "all") ||
      (filters.stock && filters.stock !== "all") ||
      filters.category,
  );
}

function updateFilterTrigger(filters) {
  const button = document.getElementById("filter-trigger");
  if (!button) return;

  const active = hasActiveFilters(filters);
  button.setAttribute("aria-pressed", String(active));
  button.classList.toggle("bg-purple1", active);
  button.classList.toggle("text-white", active);
  button.classList.toggle("hover:bg-purple1/90", active);
  button.classList.toggle("bg-white", !active);
  button.classList.toggle("text-purple1", !active);
  button.classList.toggle("hover:bg-yasi/50", !active);
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getProductImage(item) {
  if (!item) {
    return resolveProductImagePath("./assets/images/products/achar.jpg");
  }

  let imageList =
    item.images ?? item.gallery ?? item.image_urls ?? item.imageUrl;

  if (typeof imageList === "string") {
    try {
      imageList = JSON.parse(imageList);
    } catch {
      imageList = [imageList];
    }
  }

  const firstImage = Array.isArray(imageList)
    ? imageList.find((img) => !!img && img !== "null" && img !== "undefined")
    : null;

  return resolveProductImagePath(
    firstImage ||
      item.image ||
      item.image_url ||
      item.cover ||
      item.pic ||
      "./assets/images/products/achar.jpg",
  );
}

function formatPrice(value) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue)
    ? new Intl.NumberFormat("en-US").format(numberValue)
    : "0";
}

function getProductTitle(product) {
  return product.title || product.name || "محصول بدون عنوان";
}

function getProductBrand(product) {
  return (
    product.brand || product.brand_name || product.manufacturer || "بدون برند"
  );
}

function getProductPrice(product) {
  const candidates = [
    product.price,
    product.final_price,
    product.sale_price,
    product.base_price,
    product.variants?.[0]?.price,
    product.variants?.[0]?.selling_price,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }

  return 0;
}

function getProductDiscount(product) {
  const rawDiscount =
    product.discount ?? product.discount_percent ?? product.offer ?? 0;
  const value = Number(rawDiscount);
  return Number.isFinite(value) ? value : 0;
}

function parseProductData(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.products)) return response.products;
  if (response?.data && typeof response.data === "object") {
    return [response.data];
  }
  return [];
}

export function createProductCard(
  product,
  { home = false, rail = false, related = false } = {},
) {
  registerFavoriteProduct(product);
  const productId = product.id;
  const variant = (product.variants || []).find(
    (candidate) =>
      candidate &&
      (candidate.id ?? candidate.variant_id) &&
      (candidate.product_id == null ||
        String(candidate.product_id) === String(productId)) &&
      candidate.is_active !== 0 &&
      candidate.stock !== 0,
  );
  const variantId = variant?.id ?? variant?.variant_id ?? "";
  const title = getProductTitle(product);
  const imageUrl = getProductImage(product);
  const price = getProductPrice(product);
  const originalPrice = Number(
    product.original_price ?? product.base_price ?? price,
  );
  const discount = getProductDiscount(product);
  const brand = getProductBrand(product);
  const productPath = `${home ? "./" : "../"}details/index.html?id=${encodeURIComponent(productId)}`;
  const railCardWidth = rail
    ? "w-[220px] flex-shrink-0 sm:w-[240px] md:w-[260px]"
    : "";
  const relatedCardClass = related ? "related-product-card cursor-pointer" : "";
  const favorite = isFavorite(productId);
  const rating = Number(product.rating ?? product.average_rating ?? 0);
  const reviewCount = Number(
    product.review_count ?? product.reviews_count ?? product.rating_count ?? 0,
  );
  const roundedRating = Math.max(0, Math.min(5, Math.round(rating)));
  const ratingMarkup =
    rating > 0
      ? `<span class="text-[11px] text-amber-500" aria-label="امتیاز ${rating} از 5">${"★".repeat(roundedRating)}${"☆".repeat(5 - roundedRating)}</span><span class="text-[10px] text-gray-500">(${formatPrice(reviewCount)})</span>`
      : `<span class="text-[10px] text-gray-400">هنوز امتیازی ثبت نشده</span>`;

  const discountMarkup =
    discount > 0
      ? `<span class="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">-${discount}%</span>`
      : "";

  const priceMarkup =
    discount > 0 && originalPrice > price
      ? `
        <div class="flex items-center gap-2">
          <span class="line-through text-gray-400 text-xs">${formatPrice(originalPrice)} تومان</span>
          <span class="text-lg font-black text-red-600">${formatPrice(price)} تومان</span>
        </div>
      `
      : `<span class="text-lg font-black text-red-600">${formatPrice(price)} تومان</span>`;

  return `
    <article class="product-card ${relatedCardClass} ${railCardWidth} group relative flex h-90 min-w-0 flex-col rounded-md border border-red-300 bg-white p-3 shadow-sm shadow-red-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" data-product-id="${productId}">
      <button type="button" class="favorite-toggle-btn absolute left-3 top-3 z-10 rounded-full bg-white/80 p-1 text-red-100 transition-colors hover:text-purple1" data-product-id="${productId}" aria-label="${favorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}" aria-pressed="${favorite}">
        <svg class="h-5 w-5 ${favorite ? "fill-purple1" : "fill-none"}" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
      </button>
      <div class="relative mb-2 h-40 shrink-0 overflow-hidden bg-white">
        <div class="absolute right-1 top-1 z-10 flex gap-2">
          ${discountMarkup}
        </div>
        <a href="${productPath}" class="flex h-full items-center justify-center overflow-hidden p-2">
          <img src="${imageUrl}" alt="${title}" class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" onerror="this.onerror=null; this.src='${resolveFrontendAssetPath("./assets/images/products/achar.jpg")}';" />
        </a>
      </div>

      <div class="flex min-h-0 flex-1 flex-col text-right" dir="rtl">
        <a href="${productPath}" class="mb-1 block min-h-10 text-right text-sm font-extrabold leading-5 text-black-main line-clamp-2 hover:text-purple1 transition-colors">
          ${title}
        </a>
        <span class="mb-1 truncate text-[10px] text-gray-400">${brand}</span>

        <div class="mt-auto">
          <div class="mb-1 flex min-h-7 items-center justify-between gap-1">
            ${priceMarkup}
          </div>
          <div class="mb-2 flex h-5 items-center justify-end gap-1" dir="ltr">
            ${ratingMarkup}
          </div>
          <button type="button" class="add-to-cart-btn flex h-9 w-full items-center justify-center gap-2 rounded-md bg-purple1 px-2 text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-60" data-product-id="${productId}" data-variant-id="${variantId}">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 3h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg>
            افزودن به سبد خرید
          </button>
        </div>
      </div>
    </article>
  `;
}

function createHomeProductCard(product) {
  return createProductCard(product, { home: true, rail: true });
}

function renderHomeProductTrack(trackId, products) {
  const track = document.getElementById(trackId);
  if (!track) return;

  const selectedProducts = Array.isArray(products) ? products.slice(0, 8) : [];

  if (!selectedProducts.length) {
    track.innerHTML = `
      <div class="w-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500 font-bold">
        محصولی برای نمایش وجود ندارد.
      </div>
    `;
    return;
  }

  track.innerHTML = selectedProducts.map(createHomeProductCard).join("");
}

function setupProductCardSlider(trackId, previousButtonId, nextButtonId) {
  const track = document.getElementById(trackId);
  const viewport = track?.parentElement;
  const previousButton = document.getElementById(previousButtonId);
  const nextButton = document.getElementById(nextButtonId);
  if (!track || !viewport) return;
  if (track.dataset.sliderInitialized === "true") {
    track.resetProductCardSlider?.();
    return;
  }

  let currentIndex = 0;
  let activePointerId = null;
  let dragStartX = 0;
  let dragStartOffset = 0;
  let dragCurrentOffset = 0;
  let dragMoved = false;
  let suppressClickUntil = 0;

  viewport.style.touchAction = "pan-y";
  viewport.style.userSelect = "none";
  viewport.style.cursor = "grab";

  const getMetrics = () => {
    const cards = Array.from(track.children).filter(
      (card) =>
        card.hasAttribute("data-product-id") ||
        card.hasAttribute("data-category-id") ||
        card.hasAttribute("data-id"),
    );
    if (!cards.length) return null;

    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = cards[0].getBoundingClientRect().width + gap;
    const maxOffset = Math.max(0, track.scrollWidth - viewport.clientWidth);

    return {
      step,
      maxOffset,
      maxIndex: step ? Math.ceil(maxOffset / step) : 0,
      direction: getComputedStyle(track).direction,
    };
  };

  const applyOffset = (offset, direction, maxOffset) => {
    const boundedOffset = Math.max(0, Math.min(offset, maxOffset));
    const signedOffset = direction === "rtl" ? boundedOffset : -boundedOffset;
    track.style.transform = `translateX(${signedOffset}px)`;
    return boundedOffset;
  };

  const getNearestIndex = (offset, step, maxOffset) => {
    if (!step) return 0;
    const lowerIndex = Math.floor(offset / step);
    const upperIndex = Math.min(lowerIndex + 1, Math.ceil(maxOffset / step));
    const lowerOffset = Math.min(lowerIndex * step, maxOffset);
    const upperOffset = Math.min(upperIndex * step, maxOffset);
    return offset - lowerOffset <= upperOffset - offset
      ? lowerIndex
      : upperIndex;
  };

  const updateSlider = () => {
    const metrics = getMetrics();
    if (!metrics) {
      currentIndex = 0;
      track.style.transform = "";
      if (previousButton) previousButton.disabled = true;
      if (nextButton) nextButton.disabled = true;
      return;
    }

    currentIndex = Math.min(currentIndex, metrics.maxIndex);
    const offset = Math.min(currentIndex * metrics.step, metrics.maxOffset);
    applyOffset(offset, metrics.direction, metrics.maxOffset);
    if (previousButton) previousButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex >= metrics.maxIndex;
  };

  previousButton?.addEventListener("click", () => {
    currentIndex = Math.max(0, currentIndex - 1);
    updateSlider();
  });
  nextButton?.addEventListener("click", () => {
    currentIndex += 1;
    updateSlider();
  });
  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (event.target.closest("button, input, select, textarea")) return;

    const metrics = getMetrics();
    if (!metrics || metrics.maxOffset === 0) return;

    activePointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartOffset = Math.min(currentIndex * metrics.step, metrics.maxOffset);
    dragCurrentOffset = dragStartOffset;
    dragMoved = false;
    track.style.transition = "none";
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId) return;

    const deltaX = event.clientX - dragStartX;
    if (!dragMoved && Math.abs(deltaX) < 5) return;
    dragMoved = true;
    event.preventDefault();

    const metrics = getMetrics();
    if (!metrics) return;
    const directionDelta = metrics.direction === "rtl" ? deltaX : -deltaX;
    const offset = Math.max(
      0,
      Math.min(dragStartOffset + directionDelta, metrics.maxOffset),
    );
    dragCurrentOffset = offset;
    applyOffset(offset, metrics.direction, metrics.maxOffset);
    viewport.style.cursor = "grabbing";
  });
  const finishDrag = (event) => {
    if (event.pointerId !== activePointerId) return;
    const wasDragged = dragMoved;
    activePointerId = null;
    dragMoved = false;
    viewport.style.cursor = "grab";
    track.style.transition = "";

    const metrics = getMetrics();
    if (metrics) {
      currentIndex = getNearestIndex(
        dragCurrentOffset,
        metrics.step,
        metrics.maxOffset,
      );
    }
    if (wasDragged) suppressClickUntil = Date.now() + 250;
    updateSlider();
  };
  viewport.addEventListener("pointerup", finishDrag);
  viewport.addEventListener("pointercancel", finishDrag);
  viewport.addEventListener(
    "click",
    (event) => {
      if (Date.now() > suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClickUntil = 0;
    },
    true,
  );
  viewport.addEventListener("dragstart", (event) => event.preventDefault());
  window.addEventListener("resize", updateSlider, { passive: true });
  track.resetProductCardSlider = () => {
    currentIndex = 0;
    updateSlider();
  };
  track.dataset.sliderInitialized = "true";
  updateSlider();
}

window.setupProductCardSlider = setupProductCardSlider;

function renderProducts(products) {
  const productContainer = document.getElementById("product-container");
  if (!productContainer) return;

  if (!products.length) {
    productContainer.innerHTML = `
      <div class="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-lg font-bold text-gray-500">
        محصولی برای نمایش وجود ندارد.
      </div>
    `;
    renderPagination(1);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const page = Math.min(
    Math.max(1, Number(document.body.dataset.currentPage) || 1),
    totalPages,
  );
  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedProducts = products.slice(startIndex, startIndex + PAGE_SIZE);

  productContainer.innerHTML = paginatedProducts
    .map(createProductCard)
    .join("");
  renderPagination(totalPages, page);
}

function renderPagination(totalPages, currentPage = 1) {
  const paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) return;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  paginationContainer.innerHTML = pages
    .map((page) => {
      const activeClass =
        page === currentPage
          ? "bg-purple1 text-white"
          : "bg-white text-gray-700 border border-gray-200 hover:bg-yasi";
      return `
        <button type="button" data-page="${page}" class="page-btn h-10 min-w-10 rounded-full px-3 text-sm font-bold transition-all ${activeClass}">
          ${page}
        </button>
      `;
    })
    .join("");

  paginationContainer.querySelectorAll(".page-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedPage = Number(button.dataset.page || 1);
      document.body.dataset.currentPage = String(selectedPage);
      const state = window.__productPageState || {};
      renderProducts(state.filteredProducts || []);
    });
  });
}

function isProductMatch(product, filters) {
  const searchText = normalizeText(filters.search);
  const nameText = normalizeText(getProductTitle(product));
  const brandText = normalizeText(getProductBrand(product));

  if (
    searchText &&
    !nameText.includes(searchText) &&
    !brandText.includes(searchText)
  ) {
    return false;
  }

  if (filters.discountOnly && getProductDiscount(product) <= 0) {
    return false;
  }

  if (filters.brand !== "all") {
    const productBrand = normalizeText(getProductBrand(product));
    if (productBrand !== normalizeText(filters.brand)) {
      return false;
    }
  }

  if (filters.stock !== "all") {
    const inStock = Number(product.stock ?? product.quantity ?? 1) > 0;
    if (filters.stock === "in-stock" && !inStock) return false;
    if (filters.stock === "out-of-stock" && inStock) return false;
  }

  if (!matchesSelectedCategory(product, filters.category)) {
    return false;
  }

  return true;
}

function applyFilters(products, filters = readFilterControls()) {
  const state = window.__productPageState || {};
  const source = Array.isArray(state.allProducts) ? state.allProducts : products;
  const nextList = source.filter((product) =>
    isProductMatch(product, filters),
  );
  window.__productPageState = {
    ...state,
    filteredProducts: nextList,
    categoryFilter: filters.category,
    appliedFilters: { ...filters },
  };
  updateCategoryFilterChip(filters.category);
  updateCategoryFilterUrl(filters.category);
  updateFilterTrigger(filters);
  document.body.dataset.currentPage = "1";
  renderProducts(nextList);
}

async function initProductsPage() {
  const productContainer = document.getElementById("product-container");
  const hasProductListPage = !!productContainer;

  try {
    const response = await fetchWithAuth("/products");
    const products = parseProductData(response);
    const finalProducts = products.length ? products : [];
    const categories = hasProductListPage ? await fetchCategories() : [];
    const categoryFilter = hasProductListPage
      ? getCategoryFilterFromUrl(categories)
      : null;
    populateCategoryFilter(categories, categoryFilter);
    window.__productPageState = {
      allProducts: finalProducts,
      filteredProducts: finalProducts,
      categoryFilter,
    };
    document.body.dataset.currentPage = "1";

    if (document.getElementById("allTrack")) {
      renderHomeProductTrack("specialTrack", finalProducts);
      renderHomeProductTrack("allTrack", finalProducts);
      setupProductCardSlider("specialTrack", "specialNext", "specialPrev");
      setupProductCardSlider("allTrack", "allPrev", "allNext");
    }
    if (hasProductListPage) {
      if (categoryFilter) {
        const categorySelect = document.getElementById("filter-category-select");
        if (categorySelect) categorySelect.value = categoryFilter.id || "all";
      }
      applyFilters(finalProducts);
    }
  } catch (error) {
    console.error("خطا در دریافت محصولات:", error);
    const fallbackProducts = [];
    window.__productPageState = {
      allProducts: fallbackProducts,
      filteredProducts: fallbackProducts,
    };
    if (document.getElementById("allTrack")) {
      renderHomeProductTrack("specialTrack", fallbackProducts);
      renderHomeProductTrack("allTrack", fallbackProducts);
      setupProductCardSlider("specialTrack", "specialNext", "specialPrev");
      setupProductCardSlider("allTrack", "allPrev", "allNext");
    }
    if (hasProductListPage) {
      renderProducts(fallbackProducts);
    }
  }

  const resetButton = document.getElementById("reset-filter-btn");
  const applyButton = document.getElementById("apply-filter-btn");
  const closeButton = document.getElementById("close-filter-modal-btn");
  const filterModal = document.getElementById("filter-modal");

  resetButton?.addEventListener("click", () => {
    writeFilterControls({});
    applyFilters(undefined, readFilterControls());
    filterModal?.classList.add("opacity-0", "pointer-events-none");
  });

  applyButton?.addEventListener("click", () => {
    applyFilters(undefined, readFilterControls());
    filterModal?.classList.add("opacity-0", "pointer-events-none");
  });

  document.getElementById("clear-category-filter-btn")?.addEventListener(
    "click",
    () => {
      const appliedFilters = {
        ...(window.__productPageState?.appliedFilters || {}),
        category: null,
      };
      writeFilterControls(appliedFilters);
      applyFilters(undefined, appliedFilters);
    },
  );

  const closeFilterModal = () => {
    writeFilterControls(window.__productPageState?.appliedFilters || {});
    filterModal?.classList.add("opacity-0", "pointer-events-none");
  };

  closeButton?.addEventListener("click", closeFilterModal);
  filterModal?.addEventListener("click", (event) => {
    if (event.target === filterModal) closeFilterModal();
  });

  const filterTrigger = document.getElementById("filter-trigger");

  filterTrigger?.addEventListener("click", () => {
    writeFilterControls(window.__productPageState?.appliedFilters || {});
    filterModal?.classList.remove("opacity-0", "pointer-events-none");
  });

  const cartBadge = document.getElementById("cart-badge-count");
  if (cartBadge) {
    const currentCart = JSON.parse(localStorage.getItem("cart") || "[]");
    const total = currentCart.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
    cartBadge.textContent = String(total);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initProductsPage();
});
