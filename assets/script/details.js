import {
  fetchWithAuth,
  resolveFrontendAssetPath,
  resolveProductImagePath,
} from "./data.js";
import { createProductCard } from "./products.js";
import { isFavorite, registerFavoriteProduct } from "./favorites.js";

document.addEventListener("DOMContentLoaded", async () => {
  let masterProductsList = [];

  try {
    const response = await fetchWithAuth("/products");
    const data = Array.isArray(response) ? response : response?.data || [];
    masterProductsList = [...data];
  } catch (error) {
    console.error("خطا در دریافت لیست محصولات از API:", error);
  }

  // 2. اصلاح تابع دریافت تصویر (پشتیبانی از JSON string)
  function getProductImage(item) {
    if (!item)
      return resolveProductImagePath("./assets/images/products/achar.jpg");

    let imagesArray = item.images;
    if (typeof imagesArray === "string") {
      try {
        imagesArray = JSON.parse(imagesArray);
      } catch (e) {
        imagesArray = [item.images];
      }
    }

    const imgPath =
      (Array.isArray(imagesArray) && imagesArray.length > 0
        ? imagesArray[0]
        : null) ||
      item.image ||
      item.image_url ||
      item.cover ||
      item.pic ||
      item.variant?.image ||
      "";

    return resolveProductImagePath(imgPath);
  }

  function setupRelatedProducts(currentProductId) {
    const track = document.getElementById("specialTrack");

    if (!track) return;

    const related = masterProductsList.filter(
      (p) => String(p.id) !== String(currentProductId),
    );

    track.innerHTML = related
      .map((item) => createProductCard(item, { rail: true, related: true }))
      .join("");

    track.querySelectorAll(".related-product-card").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest(".favorite-toggle-btn, .add-to-cart-btn")) {
          return;
        }
        event.preventDefault();
        const selectedId = card.dataset.productId;
        if (selectedId) {
          const newUrl = `${window.location.pathname}?id=${selectedId}`;
          window.history.pushState({ path: newUrl }, "", newUrl);

          loadProductDetails(selectedId);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });

    window.setupProductCardSlider?.("specialTrack", "specialPrev", "specialNext");
  }

  async function loadProductDetails(targetProductId) {
    const root = document.getElementById("product-detail-root");
    if (!root) return;

    root.innerHTML = `
      <div class="p-12 text-center text-gray-main font-bold">در حال دریافت اطلاعات محصول...</div>
    `;

    let product = null;
    try {
      const response = await fetchWithAuth(
        `/products?id=${encodeURIComponent(targetProductId)}`,
      );
      product = response?.data || null;
      if (Array.isArray(response?.data) && response.data.length) {
        product =
          response.data.find(
            (item) => String(item.id) === String(targetProductId),
          ) || response.data[0];
      }
      const cache = JSON.parse(
        localStorage.getItem("shop_products_cache") || "[]",
      );
      const nextCache = Array.isArray(cache) ? cache : [];
      if (product) {
        const existingIndex = nextCache.findIndex(
          (item) => String(item.id) === String(product.id),
        );
        if (existingIndex >= 0) nextCache[existingIndex] = product;
        else nextCache.push(product);
        localStorage.setItem("shop_products_cache", JSON.stringify(nextCache));
      }
      if (response?.status === false || !product) {
        throw new Error(response?.message || "محصول پیدا نشد");
      }
    } catch (error) {
      console.error("خطا در دریافت جزئیات محصول از API:", error);
      root.innerHTML = `
        <div class="max-w-[1440px] mx-auto p-12 text-center text-red-600 font-bold text-xl">
          دریافت اطلاعات محصول انجام نشد.
        </div>
      `;
      return;
    }

    const existingProductIndex = masterProductsList.findIndex(
      (item) => String(item.id) === String(targetProductId),
    );
    if (existingProductIndex >= 0) {
      masterProductsList[existingProductIndex] = product;
    } else {
      masterProductsList.push(product);
    }

    if (!product) {
      root.innerHTML = `
        <div class="max-w-[1440px] mx-auto p-12 text-center text-red-600 font-bold text-xl">
          محصول مورد نظر یافت نشد.
        </div>
      `;
      return;
    }

    const {
      id,
      price = "0",
      brand = "مشخص نشده",
      description = "توضیحاتی برای این محصول ثبت نشده است.",
      weight = "نامشخص",
      dimensions = "نامشخص",
      images = [],
    } = product;

    const title = product.title || product.name || "عنوان نامشخص";
    const image = getProductImage(product);
    registerFavoriteProduct(product);
    const favorite = isFavorite(id);
    const variants = (
      Array.isArray(product.variants) ? product.variants : []
    ).filter(
      (variant) =>
        variant &&
        (variant.id ?? variant.variant_id) &&
        (variant.product_id == null ||
          String(variant.product_id) === String(id)) &&
        variant.is_active !== 0 &&
        variant.stock !== 0,
    );
    const firstVariant = variants[0];
    let selectedVariantId = firstVariant?.id ?? firstVariant?.variant_id ?? "";

    setupRelatedProducts(id);

    let validGallery = [];
    if (typeof images === "string") {
      try {
        validGallery = JSON.parse(images);
      } catch (e) {
        validGallery = [];
      }
    } else if (Array.isArray(images)) {
      validGallery = images;
    }
    validGallery = validGallery.map((galleryImage) =>
      resolveProductImagePath(galleryImage),
    );
    if (!validGallery.length) validGallery = [image, image, image];

    root.innerHTML = `
        <h1 class="text-2xl font-extrabold text-black-main mb-6 text-right">
          جزئیات محصول
        </h1>

        <div class="border border-purple1 rounded-3xl p-6 bg-white shadow-sm">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div class="lg:col-span-8 flex flex-col gap-4 overflow-visible" dir="rtl">
              <div class="flex items-center w-full">
                <span class="w-[60%] h-[2px] bg-purple1 z-0"></span>
                <h2 class="text-xl md:text-2xl font-extrabold text-purple1 whitespace-nowrap bg-white pr-4 z-10">
                  ${title}
                </h2>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-12 items-start gap-4">
                <div class="md:col-span-7 flex flex-col gap-4">
                  <div class="bg-yasi rounded-3xl aspect-square flex items-center justify-center p-8 relative overflow-hidden shadow-sm">
                    <img id="main-product-img" src="${image}" alt="${title}" class="w-full h-full object-contain" />
                  </div>

                  <div class="flex items-center justify-between gap-2">
                    <button class="text-purple1 hover:scale-110 transition-transform">
                      <svg class="w-8 h-8 fill-current" viewBox="0 0 29 58" fill="none">
                        <path d="M0 0L28.75 28.75L0 57.5V0Z" />
                      </svg>
                    </button>

                    <div class="grid grid-cols-3 gap-3 flex-1">
                      ${validGallery
                        .slice(0, 3)
                        .map(
                          (imgSrc) => `
                        <div class="thumb-card bg-yasi rounded-2xl aspect-square p-2 flex items-center justify-center cursor-pointer hover:border hover:border-purple1 transition-all">
                          <img src="${imgSrc}" alt="${title}" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='${resolveFrontendAssetPath("./assets/images/products/achar.jpg")}'" />
                        </div>
                      `,
                        )
                        .join("")}
                    </div>

                    <button class="text-purple1 hover:scale-110 transition-transform">
                      <svg class="w-8 h-8 fill-current" viewBox="0 0 29 58" fill="none">
                        <path d="M28.75 0L0 28.75L28.75 57.5V0Z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="md:col-span-5 space-y-8 pt-5 md:pt-3 xl:pt-6 2xl:pt-10 text-right">
                  <div class="md:space-y-5 xl:space-y-7 2xl:space-y-10">
                    <div class="flex items-center text-xs md:text-sm text-gray-400">
                      <span class="w-4 h-[2px] bg-purple1 flex-shrink-0"></span>
                      <div class="flex items-center gap-1.5 whitespace-nowrap bg-white pr-2">
                        <span class="text-gray-300 tracking-tight">☆☆☆☆☆</span>
                        <span>(9)</span>
                        <button type="button" class="favorite-toggle-btn text-red-300 hover:text-purple1 transition-colors" data-product-id="${id}" aria-label="${favorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}" aria-pressed="${favorite}">
                          <svg class="w-6 h-6 xl:w-10 h-10 stroke-red-400 ${favorite ? "fill-purple1" : "fill-none"}" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div class="space-y-2 pt-2">
                      <p class="text-xs md:text-sm font-bold text-purple1 text-right pr-6">خلاصه محصول</p>
                      <div class="flex items-center text-xs md:text-sm text-black-primary font-medium">
                        <span class="w-4 h-[2px] bg-purple1 flex-shrink-0"></span>
                        <span class="pr-2">${title}</span>
                      </div>
                      <div class="flex items-center text-xs md:text-sm text-black-primary font-medium">
                        <span class="w-4 h-[2px] bg-purple1 flex-shrink-0"></span>
                        <span class="pr-2">برند ${brand}</span>
                      </div>
                      <div class="flex items-center text-xs md:text-sm text-black-primary font-medium">
                        <span class="w-4 h-[2px] bg-purple1 flex-shrink-0"></span>
                        <span class="pr-2">ضدآب / گارانتی / همراه با جعبه مخصوص</span>
                      </div>
                    </div>

                    <div class="flex items-center pt-2">
                      <span class="w-4 h-[2px] bg-red-500 flex-shrink-0"></span>
                      <span class="text-xl md:text-2xl font-extrabold text-purple1/70 whitespace-nowrap bg-white pr-2">
                        ${price} <span class="text-sm lg:text-xl xl:text-3xl font-bold">تومان</span>
                      </span>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            <div data-id="${id}" class="product-card lg:col-span-4 border border-purple1/70 rounded-2xl p-5 space-y-4 flex flex-col justify-between bg-white h-full">
              <div class="text-xs text-black-primary space-y-2 leading-relaxed text-right">
                <p>تعویض و مرجوعی به هیچ عنوان نداریم.</p>
                <p>${description}</p>
                <p>هزینه حمل به عهده خریدار</p>
                <p class="pt-1">
                  شناسه محصول:
                  <span class="font-bold text-black-primary">${id}</span>
                </p>
              </div>

              <hr class="border-gray-200" />

              <div class="text-xs text-black-primary space-y-2">
                <p class="flex justify-between items-center">
                  <span class="font-bold">${weight}</span>
                  <span class="text-gray-500">وزن:</span>
                </p>
                <hr class="border-gray-200" />
                <p class="flex justify-between items-center">
                  <span class="font-bold">${dimensions}</span>
                  <span class="text-gray-500">ابعاد:</span>
                </p>
              </div>

              <hr class="border-gray-200" />

              <div class="space-y-2 text-center">
                <p class="text-sm font-bold text-black-primary">رنگ بندی</p>
                <div class="flex items-center justify-center gap-2 pt-1">
                  ${variants
                    .map((variant, index) => {
                      const currentVariantId =
                        variant.id ?? variant.variant_id ?? "";
                      const color = variant.color_code || "#9CA3AF";
                      const colorName =
                        variant.color_name || `رنگ ${index + 1}`;
                      const selectedClass =
                        String(currentVariantId) === String(selectedVariantId)
                          ? "ring-2 ring-offset-2 ring-purple1"
                          : "";
                      return `<button type="button" data-variant-option="${currentVariantId}" title="${colorName}" aria-label="${colorName}" class="w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform ${selectedClass}" style="background-color: ${color}"></button>`;
                    })
                    .join("")}
                </div>
              </div>

              <p class="text-xs font-bold text-emerald-600 text-center">موجود در انبار</p>

              <!-- اضافه شدن دیتا-اتریبیوت‌های لازم به دکمه افزودن به سبد خرید -->
              <button data-id="${id}" data-variant-id="${selectedVariantId}" ${selectedVariantId ? "" : "disabled"} class="add-to-cart-btn w-full bg-purple1/70 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple1/70 transition-colors shadow-md active:scale-95">
                <span>افزودن به سبد خرید</span>
                <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
            </div>

          </div>
        </div>
    `;

    const addButton = root.querySelector(".add-to-cart-btn");
    root.querySelectorAll("[data-variant-option]").forEach((option) => {
      option.addEventListener("click", () => {
        selectedVariantId = option.dataset.variantOption || "";
        if (addButton) {
          addButton.dataset.variantId = selectedVariantId;
          addButton.disabled = !selectedVariantId;
        }
        root.querySelectorAll("[data-variant-option]").forEach((item) => {
          item.classList.toggle("ring-2", item === option);
          item.classList.toggle("ring-offset-2", item === option);
          item.classList.toggle("ring-purple1", item === option);
        });
      });
    });

    const mainImg = document.getElementById("main-product-img");

    document.querySelectorAll(".thumb-card img").forEach((thumb) => {
      thumb.addEventListener("click", (e) => {
        mainImg.src = e.target.src;
      });
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const targetId =
    urlParams.get("id") || localStorage.getItem("selectedProductId");

  if (targetId) {
    loadProductDetails(targetId);
  }
});
