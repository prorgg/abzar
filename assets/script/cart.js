import { fetchWithAuth, resolveFrontendAssetPath } from "./data.js";

// ==========================================================================
// 1. توابع ارتباط با API
// ==========================================================================

function normalizeCartQuantity(item) {
  const rawQty =
    item?.quantity ?? item?.qty ?? item?.count ?? item?.amount ?? 1;
  const qty = Number(rawQty);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function getCartItemIdentifier(item) {
  if (!item || typeof item !== "object") return null;

  const values = [
    item.id,
    item.item_id,
    item.cart_item_id,
    item.variant_id,
    item.product_id,
    item.variant?.id,
    item.variant?.variant_id,
    item.variant?.product_id,
    item.product?.id,
    item.product?.variant_id,
  ];

  return (
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    ) ?? null
  );
}

function getServerCartItemId(item) {
  return item?.item_id ?? item?.cart_item_id ?? item?.id ?? null;
}

function normalizeCartEntry(item) {
  const base = { ...item };
  const identifier = getCartItemIdentifier(base) ?? Date.now() + Math.random();

  base.id = base.id ?? identifier;
  base.item_id = base.item_id ?? identifier;
  base.cart_item_id = base.cart_item_id ?? identifier;
  base.variant_id =
    base.variant_id ??
    base.variant?.id ??
    base.variant?.variant_id ??
    identifier;
  base.product_id =
    base.product_id ?? base.product?.id ?? base.variant?.product_id ?? base.id;
  base.quantity = normalizeCartQuantity(base);
  return base;
}

function getCachedProducts() {
  try {
    const raw = localStorage.getItem("shop_products_cache");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function resolveProductPrice(item) {
  const productFromCache = (() => {
    const cache = getCachedProducts();
    const targetId =
      item?.product_id ??
      item?.product?.id ??
      item?.variant?.product_id ??
      item?.variant_id;
    const targetVariantId =
      item?.variant_id ?? item?.variant?.id ?? item?.variant?.variant_id;

    const match = cache.find((product) => {
      const candidateIds = [
        String(product.id ?? ""),
        String(product.product_id ?? ""),
      ];
      return (
        candidateIds.includes(String(targetId || "")) ||
        candidateIds.includes(String(targetVariantId || ""))
      );
    });

    if (match) {
      const variant =
        match.variants?.find(
          (variantItem) =>
            String(
              variantItem.id ??
                variantItem.variant_id ??
                variantItem.product_id,
            ) === String(targetVariantId || ""),
        ) || match.variants?.[0];

      return {
        price: match.price ?? match.discount_price ?? variant?.price ?? 0,
        basePrice: match.price ?? match.discount_price ?? variant?.price ?? 0,
        discountPrice:
          match.discount_price ??
          variant?.discount_price ??
          match.price ??
          variant?.price ??
          0,
      };
    }

    return { price: 0, basePrice: 0, discountPrice: 0 };
  })();

  const rawPrice =
    item?.price_at_add ??
    item?.price ??
    item?.unit_price ??
    item?.final_price ??
    item?.payable_price ??
    item?.variant?.price ??
    item?.product?.price ??
    item?.product?.discount_price ??
    item?.variant?.discount_price ??
    productFromCache.price ??
    productFromCache.discountPrice ??
    0;

  const rawBasePrice =
    item?.old_price ??
    item?.original_price ??
    item?.product_price ??
    item?.variant?.old_price ??
    item?.variant?.price ??
    item?.product?.old_price ??
    item?.product?.base_price ??
    item?.product?.price ??
    productFromCache.basePrice ??
    rawPrice;

  const salePriceValue = Number(String(rawPrice).replace(/,/g, "")) || 0;
  const basePriceValue =
    Number(String(rawBasePrice).replace(/,/g, "")) || salePriceValue;

  return {
    price: salePriceValue,
    basePrice: basePriceValue,
  };
}

function getLocalCartItems() {
  const sources = [
    localStorage.getItem("shop_local_cart"),
    localStorage.getItem("cart"),
  ];

  const items = [];
  for (const raw of sources) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => items.push(entry));
      }
    } catch {
      // ignore invalid stored cart payloads
    }
  }

  const unique = [];
  const seen = new Set();
  items.forEach((item) => {
    const normalized = normalizeCartEntry(item);
    const key = String(getCartItemIdentifier(normalized));
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(normalized);
    }
  });

  return unique;
}

function setLocalCartItems(items) {
  const normalized = (Array.isArray(items) ? items : []).map(
    normalizeCartEntry,
  );
  localStorage.setItem("shop_local_cart", JSON.stringify(normalized));
  localStorage.setItem("cart", JSON.stringify(normalized));
}

function hasAnyToken() {
  return Boolean(localStorage.getItem("token"));
}

export async function getCart() {
  try {
    const response = await fetchWithAuth("/cart", { method: "GET" });
    if (response?.status === false || response?.authRequired) {
      throw new Error(response.message || "دریافت سبد خرید ناموفق بود.");
    }
    return response;
  } catch (error) {
    if (hasAnyToken()) throw error;
    const items = getLocalCartItems();
    return { status: true, items, data: { items } };
  }
}

export async function addToCart(variantId, quantity = 1) {
  const vId = Number(variantId);
  if (!vId) throw new Error("شناسه تنوع (variant_id) نامعتبر است.");

  const cache = getCachedProducts();
  const matchedProduct = cache.find((product) => {
    const variantIds = (product.variants || []).map((variantItem) =>
      String(variantItem.id ?? variantItem.variant_id ?? ""),
    );
    return variantIds.includes(String(vId));
  });

  const productPriceData = matchedProduct
    ? (() => {
        const variant =
          (matchedProduct.variants || []).find(
            (variantItem) =>
              String(variantItem.id ?? variantItem.variant_id) === String(vId),
          ) || (matchedProduct.variants || [])[0];
        const salePrice =
          Number(
            String(
              matchedProduct.discount_price ||
                matchedProduct.price ||
                variant?.price ||
                0,
            ).replace(/,/g, ""),
          ) || 0;
        const basePrice =
          Number(
            String(
              matchedProduct.price || variant?.price || salePrice || 0,
            ).replace(/,/g, ""),
          ) || salePrice;
        return {
          price: salePrice || basePrice,
          basePrice: basePrice || salePrice,
        };
      })()
    : { price: 0, basePrice: 0 };

  try {
    const response = await fetchWithAuth("/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        variant_id: vId,
        quantity: Number(quantity) || 1,
      },
    });
    if (response?.status === false || response?.authRequired) {
      throw new Error(response.message || "افزودن به سبد خرید ناموفق بود.");
    }
    return response;
  } catch (error) {
    if (hasAnyToken()) throw error;
    const localItems = getLocalCartItems();
    const existingItem = localItems.find(
      (item) =>
        String(item.variant_id ?? item.product_id ?? item.id) === String(vId),
    );
    if (existingItem) {
      existingItem.quantity =
        normalizeCartQuantity(existingItem) + Number(quantity || 1);
    } else {
      localItems.push(
        normalizeCartEntry({
          variant_id: vId,
          product_id: matchedProduct?.id || vId,
          quantity: Number(quantity) || 1,
          price_at_add: productPriceData.price || 0,
          price: productPriceData.price || 0,
          old_price: productPriceData.basePrice || productPriceData.price || 0,
          product: {
            id: matchedProduct?.id || vId,
            name: matchedProduct?.name || matchedProduct?.title || "محصول",
            image: matchedProduct?.images?.[0] || matchedProduct?.image || "",
          },
        }),
      );
    }
    setLocalCartItems(localItems);
    return { status: true, data: { items: localItems } };
  }
}

export async function updateCartItem(itemId, quantity) {
  try {
    const response = await fetchWithAuth("/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: {
        item_id: Number(itemId),
        quantity: Number(quantity),
      },
    });
    if (response?.status === false || response?.authRequired) {
      throw new Error(response.message || "تغییر تعداد ناموفق بود.");
    }
    return response;
  } catch (error) {
    if (hasAnyToken()) throw error;
    const localItems = getLocalCartItems();
    const target = localItems.find(
      (item) =>
        String(
          item.item_id ?? item.id ?? item.cart_item_id ?? item.variant_id,
        ) === String(itemId),
    );
    if (target) {
      target.quantity = Math.max(1, Number(quantity) || 1);
      setLocalCartItems(localItems);
    }
    return { status: true, data: { items: localItems } };
  }
}

export async function removeCartItem(itemId) {
  try {
    const response = await fetchWithAuth("/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: {
        item_id: Number(itemId),
      },
    });
    if (response?.status === false || response?.authRequired) {
      throw new Error(response.message || "حذف آیتم ناموفق بود.");
    }
    return response;
  } catch (error) {
    if (hasAnyToken()) throw error;
    const localItems = getLocalCartItems().filter(
      (item) =>
        String(
          item.item_id ?? item.id ?? item.cart_item_id ?? item.variant_id,
        ) !== String(itemId),
    );
    setLocalCartItems(localItems);
    return { status: true, data: { items: localItems } };
  }
}

export async function clearCart() {
  try {
    const response = await fetchWithAuth("/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: {},
    });
    if (response?.status === false || response?.authRequired) {
      throw new Error(response.message || "خالی کردن سبد ناموفق بود.");
    }
    setLocalCartItems([]);
    return response;
  } catch {
    setLocalCartItems([]);
    return { status: true, data: { items: [] } };
  }
}

// ==========================================================================
// 2. توابع کمکی و رندر UI
// ==========================================================================

function parsePersianInt(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : Math.round(val);

  let str = String(val).trim();

  // تبدیل ارقام فارسی و عربی به انگلیسی
  const faDigits = "0123456789";
  const arDigits = "0123456789";

  str = str.replace(/[0-9]/g, (w) => faDigits.indexOf(w));
  str = str.replace(/[0-9]/g, (w) => arDigits.indexOf(w));

  // استخراج عدد صحیح یا اعشاری
  const floatVal = parseFloat(str);
  if (!isNaN(floatVal)) {
    return Math.round(floatVal);
  }

  // حذف کاراکترهای غیرعددی
  const cleanStr = str.replace(/[^0-9]/g, "");
  return parseInt(cleanStr, 10) || 0;
}

export function updateCartBadgesAndSummary(
  totalCount,
  subtotal,
  discount = 0,
  shippingCost = 0,
) {
  const formattedCount = Number(totalCount || 0).toLocaleString("en-US");

  document
    .querySelectorAll("#cart-badge-count, #cart-total-count, .cart-count-badge")
    .forEach((el) => {
      if (el) el.textContent = formattedCount;
    });

  const summaryCountEl = document.getElementById("summary-items-count");
  if (summaryCountEl) summaryCountEl.textContent = `${formattedCount} عدد`;

  const subtotalEl = document.getElementById("summary-subtotal");
  const discountEl = document.getElementById("summary-discount");
  const shippingEl = document.getElementById("summary-shipping");

  // فقط تخصیص جمع کل پرداختی به آیدی summary-total-price
  const totalPriceEl = document.getElementById("summary-total-price");

  const finalPayable = Math.max(0, subtotal - discount + shippingCost);

  if (subtotalEl)
    subtotalEl.textContent = `${Number(subtotal || 0).toLocaleString("en-US")} تومان`;
  if (discountEl)
    discountEl.textContent = `${Number(discount || 0).toLocaleString("en-US")} تومان`;

  if (shippingEl) {
    if (Number(shippingCost) > 0) {
      shippingEl.textContent = `${Number(shippingCost).toLocaleString("en-US")} تومان`;
      shippingEl.classList.remove("text-emerald-500");
      shippingEl.classList.add("text-black-primary");
    } else {
      shippingEl.textContent = "رایگان";
      shippingEl.classList.add("text-emerald-500");
      shippingEl.classList.remove("text-black-primary");
    }
  }

  if (totalPriceEl)
    totalPriceEl.textContent = `${Number(finalPayable || 0).toLocaleString("en-US")} تومان`;
}

function extractAttributesHTML(item) {
  const attrsList = [];

  const possibleArrays = [
    item.attributes,
    item.variant_attributes,
    item.variant?.attributes,
    item.variant?.variant_attributes,
    item.product?.attributes,
  ];

  for (const arr of possibleArrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      arr.forEach((attr) => {
        if (typeof attr === "object" && attr !== null) {
          const name =
            attr.name || attr.title || attr.key || attr.attribute_name || "";
          const val =
            attr.value || attr.val || attr.option_name || attr.title || "";
          if (name && val) attrsList.push(`${name}: ${val}`);
          else if (val) attrsList.push(val);
          else if (name) attrsList.push(name);
        } else if (typeof attr === "string") {
          attrsList.push(attr);
        }
      });
    }
  }

  const variantObj = item.variant || item.product || item;
  if (variantObj.color) {
    const c =
      typeof variantObj.color === "object"
        ? variantObj.color.name || variantObj.color.title
        : variantObj.color;
    if (c) attrsList.push(`رنگ: ${c}`);
  }
  if (variantObj.size) {
    const s =
      typeof variantObj.size === "object"
        ? variantObj.size.name || variantObj.size.title
        : variantObj.size;
    if (s) attrsList.push(`سایز: ${s}`);
  }
  if (variantObj.guarantee || variantObj.warranty) {
    const g = variantObj.guarantee || variantObj.warranty;
    const gTitle = typeof g === "object" ? g.name || g.title : g;
    if (gTitle) attrsList.push(`گارانتی: ${gTitle}`);
  }

  if (attrsList.length === 0) return "";
  const uniqueAttrs = [...new Set(attrsList)];

  return uniqueAttrs
    .map(
      (text) =>
        `<span class="inline-block bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-md border border-gray-200 font-medium">${text}</span>`,
    )
    .join(" ");
}

export async function fetchAndRenderCart() {
  const container = document.getElementById("cart-items-container");

  const token = localStorage.getItem("token");

  const localItems = getLocalCartItems();

  try {
    const res = await getCart();

    const items =
      res?.items ||
      res?.data?.items ||
      res?.cart?.items ||
      res?.data ||
      (Array.isArray(res) ? res : localItems);

    const normalizedItems = Array.isArray(items)
      ? items.map((entry) => normalizeCartEntry(entry))
      : localItems.map((entry) => normalizeCartEntry(entry));

    const safeItems = normalizedItems.length
      ? normalizedItems
      : localItems.map((entry) => normalizeCartEntry(entry));

    if (!safeItems.length) {
      if (container) {
        container.innerHTML = `<div class="p-8 text-center bg-white rounded-2xl border border-purple1/30 text-gray-500 font-bold">سبد خرید شما خالی است.</div>`;
      }
      updateCartBadgesAndSummary(0, 0, 0, 0);
      return;
    }

    let totalItemsCount = 0;
    let totalCalculatedSubtotal = 0;
    let totalCalculatedDiscount = 0;

    const renderedHTML = safeItems
      .map((item) => {
        const itemId = getServerCartItemId(item);
        const productId =
          item.product_id ||
          item.product?.id ||
          item.variant_id ||
          item.variant?.product_id ||
          itemId;
        const itemQty = parsePersianInt(
          item.quantity || item.count || item.qty || 1,
        );

        // دریافت قیمت تک محصول از کلید price_at_add برگردانده‌شده از API
        const resolvedPrice = resolveProductPrice(item);
        const rawPrice =
          item.price_at_add ??
          item.price ??
          item.unit_price ??
          item.final_price ??
          item.payable_price ??
          item.variant?.price ??
          item.product?.price ??
          resolvedPrice.price ??
          0;

        const rawOldPrice =
          item.old_price ??
          item.original_price ??
          item.product_price ??
          item.variant?.old_price ??
          item.variant?.price ??
          item.product?.price ??
          resolvedPrice.basePrice ??
          rawPrice;

        const itemPrice = parsePersianInt(rawPrice || resolvedPrice.price);
        const oldPrice = parsePersianInt(
          rawOldPrice || resolvedPrice.basePrice || itemPrice,
        );

        const title =
          item.product?.name ||
          item.product?.title ||
          item.variant?.product?.name ||
          item.product_name ||
          item.title ||
          item.name ||
          "محصول بدون نام";

        const brand =
          item.product?.brand ||
          item.variant?.product?.brand ||
          item.brand ||
          "توولینو";

        const attributesHTML = extractAttributesHTML(item);

        let rawImage =
          item.product?.image ||
          item.variant?.product?.image ||
          item.image ||
          "";

        if (!rawImage && item.images) {
          const images = Array.isArray(item.images)
            ? item.images
            : (() => {
                try {
                  return JSON.parse(item.images);
                } catch {
                  return [item.images];
                }
              })();
          rawImage = Array.isArray(images) ? images[0] || "" : images;
        }

        const fallbackImage = resolveFrontendAssetPath(
          "./assets/images/products/achar.jpg",
        );
        let imgSrc = fallbackImage;
        if (rawImage) {
          imgSrc = resolveFrontendAssetPath(rawImage);
        }

        const effectiveOldPrice = oldPrice > itemPrice ? oldPrice : itemPrice;
        const unitDiscount =
          effectiveOldPrice > itemPrice ? effectiveOldPrice - itemPrice : 0;

        const itemSubtotal = effectiveOldPrice * itemQty;
        const itemDiscountTotal = unitDiscount * itemQty;

        totalItemsCount += itemQty;
        totalCalculatedSubtotal += itemSubtotal;
        totalCalculatedDiscount += itemDiscountTotal;

        // نمایش قیمت قبل از تخفیف برای 1 واحد محصول
        const oldPriceHTML =
          effectiveOldPrice > itemPrice
            ? `<span class="text-xs lg:text-sm text-gray-400 line-through block font-normal">${effectiveOldPrice.toLocaleString("en-US")} تومان</span>`
            : "";

        return `
        <div class="relative h-auto border border-purple1/30 rounded-2xl p-4 lg:p-5 lg:pl-12 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm cursor-pointer cart-item-row" data-cart-item-id="${itemId}" data-product-id="${productId}">
          <button class="cart-remove-btn absolute top-4 left-4 text-purple1 hover:opacity-75 cursor-pointer" title="حذف">
            <svg class="w-5 h-5 lg:w-6 lg:h-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>

          <div class="flex flex-col sm:flex-row items-center gap-4 lg:gap-7 text-center sm:text-right w-full sm:w-auto">
            <div class="w-[140px] h-[130px] sm:w-[160px] sm:h-[150px] lg:w-[180px] lg:h-[160px] bg-yasi rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
              <img src="${imgSrc}" alt="${title}" class="w-full h-full object-contain p-2">
            </div>
            <div class="space-y-2 lg:space-y-3">
              <h3 class="font-bold text-black-primary text-base lg:text-lg">${title}</h3>
              <p class="text-xs lg:text-sm text-gray-primary">
                برند: <span class="font-medium text-black-primary">${brand}</span>
              </p>
              ${attributesHTML ? `<div class="flex flex-wrap gap-1.5 pt-1 justify-center sm:justify-start">${attributesHTML}</div>` : ""}
              <p class="text-xs lg:text-sm text-emerald-500 font-medium pt-1">موجود در انبار</p>
            </div>
          </div>

          <div class="flex flex-col items-center sm:items-end gap-3 sm:mr-auto pl-0 lg:pl-6 space-y-2">
            <div class="text-center sm:text-left">
              ${oldPriceHTML}
              <!-- نمایش قیمت 1 دانه از محصول -->
              <span class="font-bold text-base lg:text-xl text-black-primary">
                ${itemPrice.toLocaleString("en-US")} تومان
              </span>
            </div>

            <div class="flex items-center justify-between border border-purple1/50 rounded-lg px-3 py-1 w-28 text-purple1 font-bold">
              <button class="cart-qty-btn hover:opacity-75 text-lg cursor-pointer" data-action="decrease">−</button>
              <span class="qty-count text-sm text-black-primary">${itemQty.toLocaleString("en-US")}</span>
              <button class="cart-qty-btn hover:opacity-75 text-lg cursor-pointer" data-action="increase">+</button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    if (container) container.innerHTML = renderedHTML;

    container?.querySelectorAll(".cart-item-row").forEach((row) => {
      row.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        const productId = row.dataset.productId;
        if (!productId) return;
        localStorage.setItem("selectedProductId", productId);
        const target =
          window.location.pathname.includes("/products/") ||
          window.location.pathname.includes("/details/") ||
          window.location.pathname.includes("/cart/") ||
          window.location.pathname.includes("/about-us/") ||
          window.location.pathname.includes("/admin/") ||
          window.location.pathname.includes("/userpanel/")
            ? `../details/index.html?id=${productId}`
            : `./details/index.html?id=${productId}`;
        window.location.href = target;
      });
    });

    const finalSubtotal =
      parsePersianInt(res?.subtotal ?? res?.data?.subtotal) ||
      totalCalculatedSubtotal;
    const finalDiscount =
      parsePersianInt(res?.discount ?? res?.data?.discount) ||
      totalCalculatedDiscount;
    const shippingCost =
      parsePersianInt(res?.shipping_cost ?? res?.data?.shipping_cost) || 0;

    updateCartBadgesAndSummary(
      totalItemsCount,
      finalSubtotal,
      finalDiscount,
      shippingCost,
    );
  } catch (error) {
    console.error("خطا در دریافت سبد خرید:", error);
    if (container) {
      container.innerHTML = `<div class="p-4 text-center text-red-500 font-bold">خطا در دریافت اطلاعات سبد خرید.</div>`;
    }
  }
}

const checkoutState = {
  step: 1,
  address: "",
  name: "",
  phone: "",
  shippingCost: 30000,
  couponCode: "",
  couponApplied: false,
  discountAmount: 0,
};

function formatCheckoutRow(label, value) {
  return `<div class="flex items-center justify-between gap-4"><span class="text-gray-main">${label}</span><strong class="text-black-primary">${value}</strong></div>`;
}

function getSummaryValues() {
  return {
    items:
      document.getElementById("summary-items-count")?.textContent || "0 عدد",
    subtotal:
      document.getElementById("summary-subtotal")?.textContent || "0 تومان",
    discount:
      document.getElementById("summary-discount")?.textContent || "0 تومان",
    shipping:
      document.getElementById("summary-shipping")?.textContent || "رایگان",
    total: document.getElementById("summary-total-price")?.textContent || "0",
  };
}

function calculateCouponTotals() {
  const subtotalRaw =
    document.getElementById("summary-subtotal")?.textContent || "0";
  const subtotal = parsePersianInt(subtotalRaw);
  const baseDiscount = parsePersianInt(
    document.getElementById("summary-discount")?.textContent || "0",
  );
  const couponDiscount = checkoutState.couponApplied
    ? checkoutState.discountAmount
    : 0;
  const currentDiscount = Math.min(subtotal, baseDiscount + couponDiscount);
  const shipping = checkoutState.shippingCost;
  const tax = Math.round((subtotal - currentDiscount + shipping) * 0.09);

  return {
    subtotal,
    discount: currentDiscount,
    shipping,
    tax,
    total: Math.max(0, subtotal - currentDiscount + shipping + tax),
  };
}

function renderCheckoutSummary() {
  const values = getSummaryValues();
  const stepTwoSummary = document.getElementById("checkout-summary-step-2");
  const finalInvoice = document.getElementById("final-invoice");
  const totals = calculateCouponTotals();

  const rows = [
    formatCheckoutRow("تعداد محصولات", values.items),
    formatCheckoutRow("قیمت کالاها", values.subtotal),
    formatCheckoutRow(
      "تخفیف",
      `${totals.discount.toLocaleString("en-US")} تومان`,
    ),
    formatCheckoutRow(
      "هزینه ارسال",
      `${totals.shipping.toLocaleString("en-US")} تومان`,
    ),
    formatCheckoutRow("مالیات", `${totals.tax.toLocaleString("en-US")} تومان`),
  ].join("");

  if (stepTwoSummary) stepTwoSummary.innerHTML = rows;
  if (finalInvoice) {
    finalInvoice.innerHTML = `${rows}${formatCheckoutRow("مبلغ نهایی", `${totals.total.toLocaleString("en-US")} تومان`)}`;
  }
}

function updateCheckoutProgress(step) {
  checkoutState.step = step;
  document.querySelectorAll("[id^='checkout-step-']").forEach((section) => {
    section.classList.toggle("hidden", section.id !== `checkout-step-${step}`);
  });

  document.querySelectorAll("[data-step-indicator]").forEach((indicator) => {
    const indicatorStep = Number(indicator.dataset.stepIndicator);
    const circle = indicator.querySelector(".step-circle");
    const beforeCurrent = indicatorStep < step;
    const isFinalStep = step === 3 && indicatorStep === 3;
    const active = indicatorStep === step && !isFinalStep;
    const complete = beforeCurrent || isFinalStep;

    indicator.classList.toggle("text-purple1", active || complete);
    indicator.classList.toggle("text-gray-400", !active && !complete);
    circle.classList.toggle("bg-purple1", active || complete);
    circle.classList.toggle("text-white", active || complete);
    circle.classList.toggle("bg-gray-200", !active && !complete);
    circle.classList.toggle("text-gray-500", !active && !complete);
    circle.textContent = complete ? "✓" : String(indicatorStep);
  });

  document.querySelectorAll(".step-line").forEach((line, index) => {
    line.classList.toggle("bg-purple1", index < step - 1);
    line.classList.toggle("bg-gray-200", index >= step - 1);
  });

  const payOrderBtn = document.getElementById("pay-order-btn");
  if (payOrderBtn) {
    payOrderBtn.disabled = step !== 3;
  }

  if (step > 1) renderCheckoutSummary();
}

function hasCheckoutToken() {
  return Boolean(localStorage.getItem("token"));
}

async function loadShippingProfile() {
  const nameInput = document.getElementById("shipping-name");
  const phoneInput = document.getElementById("shipping-phone");
  if (!nameInput || !phoneInput || !hasCheckoutToken()) return;

  try {
    const response = await fetchWithAuth("/profile", { method: "GET" });
    const profile = response?.data || response?.user || response;
    if (profile?.name) nameInput.value = profile.name;
    if (profile?.mobile) phoneInput.value = profile.mobile;
  } catch (error) {
    console.warn("اطلاعات پروفایل برای فرم ارسال دریافت نشد:", error.message);
  }
}

window.startCheckout = function () {
  if (!hasCheckoutToken()) {
    window.showLoginNoticeAndModal?.();
    return;
  }
  loadShippingProfile();
  updateCheckoutProgress(2);
};

if (document.documentElement.dataset.checkoutClickHandlerAttached !== "true") {
  document.documentElement.dataset.checkoutClickHandlerAttached = "true";
  document.addEventListener("click", (event) => {
    const checkoutButton = event.target.closest("#checkout-btn");
    if (!checkoutButton) return;
    event.preventDefault();
    window.startCheckout();
  });
}

function bindCheckoutListeners() {
  if (document.documentElement.dataset.checkoutListenersBound === "true")
    return;
  document.documentElement.dataset.checkoutListenersBound = "true";

  document.getElementById("checkout-btn")?.addEventListener("click", () => {
    if (!hasCheckoutToken()) {
      window.showLoginNoticeAndModal?.();
      return;
    }
    updateCheckoutProgress(2);
  });

  document.getElementById("back-to-cart")?.addEventListener("click", () => {
    updateCheckoutProgress(1);
  });

  const goToShippingStep = () => {
    checkoutState.name =
      document.getElementById("shipping-name")?.value.trim() || "";
    checkoutState.phone =
      document.getElementById("shipping-phone")?.value.trim() || "";
    checkoutState.address =
      document.getElementById("shipping-address")?.value.trim() || "";

    if (!checkoutState.name || !checkoutState.phone || !checkoutState.address) {
      return false;
    }

    const details = document.getElementById("final-shipping-details");
    if (details) {
      details.textContent = `${checkoutState.name} - ${checkoutState.phone}\n${checkoutState.address}`;
    }

    updateCheckoutProgress(3);
    return true;
  };

  document
    .getElementById("continue-to-shipping-btn")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      goToShippingStep();
    });

  document
    .getElementById("shipping-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      goToShippingStep();
    });

  document.getElementById("back-to-address")?.addEventListener("click", () => {
    updateCheckoutProgress(2);
  });

  document.getElementById("apply-coupon-btn")?.addEventListener("click", () => {
    const input = document.getElementById("coupon-code-input");
    const message = document.getElementById("coupon-message");
    const code = input?.value.trim().toUpperCase() || "";

    if (!code) {
      if (message) {
        message.textContent = "لطفاً کد تخفیف را وارد کنید.";
        message.classList.remove("hidden");
        message.classList.add("text-red-500");
      }
      checkoutState.couponApplied = false;
      checkoutState.couponCode = "";
      checkoutState.discountAmount = 0;
      updateCheckoutProgress(3);
      return;
    }

    const coupons = {
      SAVE10: 0.1,
      ABZARI20: 0.2,
      TOOL30: 0.3,
    };

    const ratio = coupons[code];
    if (typeof ratio !== "number") {
      if (message) {
        message.textContent =
          "کد تخفیف نامعتبر است. کدهای معتبر: SAVE10 ، ABZARI20 ، TOOL30";
        message.classList.remove("hidden");
        message.classList.add("text-red-500");
      }
      checkoutState.couponApplied = false;
      checkoutState.couponCode = "";
      checkoutState.discountAmount = 0;
      updateCheckoutProgress(3);
      return;
    }

    checkoutState.couponCode = code;
    const subtotal = parsePersianInt(
      document.getElementById("summary-subtotal")?.textContent || "0",
    );
    const baseDiscount = parsePersianInt(
      document.getElementById("summary-discount")?.textContent || "0",
    );
    checkoutState.discountAmount = Math.round(
      Math.max(0, subtotal - baseDiscount) * ratio,
    );
    checkoutState.couponApplied = true;

    if (message) {
      message.textContent = `کد تخفیف ${code} اعمال شد.`;
      message.classList.remove("hidden");
      message.classList.remove("text-red-500");
      message.classList.add("text-emerald-600");
    }

    updateCheckoutProgress(3);
  });

  document
    .getElementById("pay-order-btn")
    ?.addEventListener("click", async (event) => {
      if (checkoutState.step !== 3) return;

      const button = event.currentTarget;
      button.disabled = true;
      try {
        const totals = calculateCouponTotals();
        const orderResponse = await fetchWithAuth("/order", {
          method: "POST",
          body: JSON.stringify({
            address: `گیرنده: ${checkoutState.name}\nشماره تماس: ${checkoutState.phone}\nآدرس: ${checkoutState.address}`,
            shipping_cost: checkoutState.shippingCost,
            coupon_code: checkoutState.couponCode,
            discount_amount: totals.discount,
            tax_amount: totals.tax,
          }),
        });
        if (orderResponse?.status === false) {
          throw new Error(orderResponse.message || "ثبت سفارش انجام نشد.");
        }
        const orderId =
          orderResponse?.data?.id ||
          orderResponse?.data?.order_id ||
          orderResponse?.order_id ||
          orderResponse?.id;

        if (!orderId) throw new Error("شماره سفارش از API دریافت نشد.");

        const orderNumber =
          orderResponse?.data?.order_number ||
          orderResponse?.order_number ||
          orderId;
        window.showAppNotice(
          `سفارش شما با شماره ${orderNumber} با موفقیت ثبت شد.`,
        );
        updateCheckoutProgress(1);
        await fetchAndRenderCart();
      } catch (error) {
        window.showAppNotice(error.message || "خطا در ثبت سفارش و پرداخت");
      } finally {
        button.disabled = false;
      }
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindCheckoutListeners, {
    once: true,
  });
} else {
  bindCheckoutListeners();
}

// ==========================================================================
// 3. Event Listeners
// ==========================================================================

if (document.documentElement.dataset.cartClickHandlerAttached !== "true") {
  document.documentElement.dataset.cartClickHandlerAttached = "true";
  document.addEventListener("click", async (e) => {
    const addBtn = e.target.closest(".add-to-cart-btn");
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();

      const token = localStorage.getItem("token");

      const allowLocalCartFlow =
        !token &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      if (!token && !allowLocalCartFlow) {
        if (typeof window.showLoginNoticeAndModal === "function") {
          window.showLoginNoticeAndModal();
        } else {
          document.getElementById("authModal")?.classList.remove("hidden");
        }
        return;
      }

      if (!token) {
        window.showLoginNoticeAndModal?.();
        return;
      }

      const variantId = addBtn.dataset.variantId;
      if (!variantId) {
        console.error("محصول variant قابل خرید ندارد.");
        window.showAppNotice("این محصول هنوز تنوع قابل خرید ندارد.");
        return;
      }

      try {
        addBtn.disabled = true;
        await addToCart(variantId, 1);
        const profileResponse = await fetchWithAuth("/profile", {
          method: "GET",
        });
        if (
          profileResponse?.status === false ||
          profileResponse?.authRequired
        ) {
          throw new Error(
            profileResponse.message || "برای ثبت سفارش دوباره وارد حساب شوید.",
          );
        }

        const profile =
          profileResponse?.data ?? profileResponse?.user ?? profileResponse;
        const shippingAddress = String(profile?.address || "").trim();
        if (!shippingAddress) {
          await fetchAndRenderCart();
          throw new Error(
            "محصول به سبد اضافه شد؛ برای ثبت سفارش ابتدا آدرس را در حساب کاربری ثبت کنید.",
          );
        }

        const orderResponse = await fetchWithAuth("/order", {
          method: "POST",
          body: {
            address: shippingAddress,
            shipping_cost: 0,
          },
        });
        if (orderResponse?.status === false || orderResponse?.authRequired) {
          throw new Error(orderResponse.message || "ثبت سفارش ناموفق بود.");
        }

        const order = orderResponse?.data ?? orderResponse;
        const orderNumber = order?.order_number || order?.order_id || order?.id;
        if (!orderNumber) {
          throw new Error("شماره سفارش از پاسخ سرور دریافت نشد.");
        }

        await fetchAndRenderCart();
        window.showAppNotice(
          `سفارش ${orderNumber} ثبت شد و در وضعیت انتظار پرداخت قرار گرفت.`,
        );
      } catch (err) {
        console.error("خطا در افزودن به سبد خرید:", err);
        window.showAppNotice(err.message || "ثبت سفارش انجام نشد.");
      } finally {
        addBtn.disabled = false;
      }
      return;
    }

    const qtyBtn = e.target.closest(".cart-qty-btn");
    if (qtyBtn) {
      e.preventDefault();
      const itemRow = qtyBtn.closest("[data-cart-item-id]");
      const itemId = itemRow?.dataset.cartItemId;
      const qtySpan = itemRow?.querySelector(".qty-count");

      if (!itemId || !qtySpan) return;

      const currentQty = parsePersianInt(qtySpan.textContent);
      const isIncrease = qtyBtn.dataset.action === "increase";
      const newQty = isIncrease ? currentQty + 1 : currentQty - 1;

      const actionButtons = itemRow.querySelectorAll(".cart-qty-btn");
      actionButtons.forEach((btn) => (btn.disabled = true));

      try {
        if (newQty <= 0) {
          await removeCartItem(itemId);
        } else {
          await updateCartItem(itemId, newQty);
        }
        await fetchAndRenderCart();
      } catch (err) {
        console.error("خطا در تغییر تعداد:", err);
      } finally {
        actionButtons.forEach((btn) => (btn.disabled = false));
      }
      return;
    }

    const removeBtn = e.target.closest(".cart-remove-btn");
    if (removeBtn) {
      e.preventDefault();
      const itemRow = removeBtn.closest("[data-cart-item-id]");
      const itemId = itemRow?.dataset.cartItemId;

      if (!itemId) return;

      try {
        removeBtn.disabled = true;
        await removeCartItem(itemId);
        await fetchAndRenderCart();
      } catch (err) {
        console.error("خطا در حذف آیتم:", err);
      } finally {
        removeBtn.disabled = false;
      }
      return;
    }

    const clearBtn = e.target.closest("#clear-cart-btn");
    if (clearBtn) {
      e.preventDefault();
      try {
        clearBtn.disabled = true;
        await clearCart();
        await fetchAndRenderCart();
      } catch (err) {
        console.error("خطا در پاکسازی سبد خرید:", err);
      } finally {
        clearBtn.disabled = false;
      }
      return;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderCart();
});
