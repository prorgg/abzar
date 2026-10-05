import { fetchWithAuth, resolveProductImagePath } from "./data.js";

document.addEventListener("DOMContentLoaded", () => {
  let productsRequest;

  const normalizeText = (value) =>
    String(value ?? "")
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const readProducts = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.products)) return response.products;
    if (Array.isArray(response?.items)) return response.items;
    if (response?.data && typeof response.data === "object") {
      return [response.data];
    }
    return [];
  };

  const getProducts = async () => {
    const currentProducts = window.__productPageState?.allProducts;
    if (Array.isArray(currentProducts)) return currentProducts;

    productsRequest ??= fetchWithAuth("/products").then(readProducts);
    return productsRequest;
  };

  const getProductImage = (product) => {
    let images = product.images ?? product.gallery ?? product.image_urls;
    if (typeof images === "string") {
      try {
        images = JSON.parse(images);
      } catch {
        images = [images];
      }
    }
    const image = Array.isArray(images)
      ? images.find((candidate) => candidate && candidate !== "null")
      : images;
    return resolveProductImagePath(
      image || product.image || product.image_url || product.cover,
    );
  };

  const getProductPrice = (product) => {
    const price = Number(
      product.price ??
        product.final_price ??
        product.sale_price ??
        product.base_price ??
        product.variants?.[0]?.price ??
        0,
    );
    return Number.isFinite(price)
      ? `${new Intl.NumberFormat("en-US").format(price)} تومان`
      : "";
  };

  const createSuggestion = (product) => {
    const item = document.createElement("a");
    const isNestedPage = /\/(products|details|about-us)\//.test(
      window.location.pathname,
    );
    item.href = `${isNestedPage ? "../" : "./"}details/index.html?id=${encodeURIComponent(product.id)}`;
    item.className =
      "flex items-center gap-3 border-b border-gray-100 px-3 py-2 text-right transition-colors last:border-0 hover:bg-yasi";

    const image = document.createElement("img");
    image.src = getProductImage(product);
    image.alt = "";
    image.className = "h-12 w-12 shrink-0 rounded-lg bg-white object-contain";

    const details = document.createElement("span");
    details.className = "flex min-w-0 flex-1 flex-col gap-1";

    const title = document.createElement("span");
    title.className = "truncate text-sm font-bold text-black-primary";
    title.textContent = product.title || product.name || "محصول بدون عنوان";

    const price = document.createElement("span");
    price.className = "text-xs text-purple1";
    price.textContent = getProductPrice(product);

    details.append(title, price);
    item.append(image, details);
    return item;
  };

  const searchProducts = async (form, query) => {
    const suggestions = form.querySelector("[data-search-suggestions]");
    if (!suggestions) return;

    suggestions.replaceChildren();
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      suggestions.classList.add("hidden");
      return;
    }

    suggestions.classList.remove("hidden");
    const loading = document.createElement("p");
    loading.className = "p-4 text-center text-sm text-gray-500";
    loading.textContent = "در حال جست‌وجو...";
    suggestions.replaceChildren(loading);

    try {
      const products = await getProducts();
      if (
        form.querySelector('input[name="search"]')?.value.trim() !==
        query.trim()
      ) {
        return;
      }

      const matches = products.filter((product) => {
        const title = normalizeText(product.title || product.name);
        const brand = normalizeText(
          product.brand || product.brand_name || product.manufacturer,
        );
        return title.includes(normalizedQuery) || brand.includes(normalizedQuery);
      });

      suggestions.replaceChildren();
      if (!matches.length) {
        const emptyState = document.createElement("p");
        emptyState.className = "p-4 text-center text-sm text-gray-500";
        emptyState.textContent = "محصولی با این عبارت پیدا نشد.";
        suggestions.append(emptyState);
        return;
      }

      matches.slice(0, 3).forEach((product) => {
        suggestions.append(createSuggestion(product));
      });

      if (matches.length > 3) {
        const moreLink = document.createElement("a");
        const destination = new URL(form.action, window.location.href);
        destination.searchParams.set("search", query.trim());
        moreLink.href = destination.href;
        moreLink.className =
          "block px-3 py-3 text-center text-sm font-bold text-purple1 transition-colors hover:bg-yasi";
        moreLink.textContent = `نمایش همه ${matches.length.toLocaleString("fa-IR")} محصول`;
        suggestions.append(moreLink);
      }
    } catch (error) {
      console.error("خطا در جست‌وجوی پیشنهاد محصولات:", error);
      const errorState = document.createElement("p");
      errorState.className = "p-4 text-center text-sm text-red-600";
      errorState.textContent = "بارگذاری پیشنهادها با خطا مواجه شد.";
      suggestions.replaceChildren(errorState);
    }
  };

  const closeSearch = (form) => {
    const toggle = form.querySelector("[data-search-toggle]");
    const input = form.querySelector('input[name="search"]');
    const suggestions = form.querySelector("[data-search-suggestions]");

    form.classList.remove("w-64", "px-3");
    form.classList.add("w-10", "px-0");
    input?.classList.add("hidden");
    suggestions?.classList.add("hidden");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "باز کردن جست‌وجو");
  };

  document.querySelectorAll("[data-product-search-form]").forEach((form) => {
    const input = form.querySelector('input[name="search"]');
    const toggle = form.querySelector("[data-search-toggle]");

    input?.addEventListener("input", () => {
      searchProducts(form, input.value);
    });

    form.addEventListener("submit", (event) => {
      if (toggle?.getAttribute("aria-expanded") !== "true") {
        event.preventDefault();
        document.getElementById("userMenuDropdown")?.classList.add("hidden");
        const profileButton = document.getElementById("desktopUserProfile");
        profileButton?.setAttribute("aria-expanded", "false");
        profileButton?.classList.remove("w-48", "px-3");
        profileButton?.classList.add("w-10", "px-0");
        profileButton
          ?.querySelector("[data-profile-label]")
          ?.classList.add("hidden");
        profileButton
          ?.querySelector("[data-profile-icon]")
          ?.classList.remove("hidden");

        form.classList.remove("w-10", "px-0");
        form.classList.add("w-64", "px-3");
        input?.classList.remove("hidden");
        toggle?.setAttribute("aria-expanded", "true");
        toggle?.setAttribute("aria-label", "جست‌وجوی محصول");
        input?.focus();
        return;
      }

      if (!input?.value.trim()) {
        event.preventDefault();
        input?.focus();
      }
    });
  });

  document.addEventListener("click", (event) => {
    document.querySelectorAll("[data-product-search-form]").forEach((form) => {
      if (!form.contains(event.target)) closeSearch(form);
    });
  });
});
