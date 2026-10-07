import {
  fetchWithAuth,
  BASE_URL,
  FALLBACK_PRODUCT_IMAGE,
  resolveFrontendAssetPath,
} from "../data.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. متغیرهای اصلی
  let productsData = [];
  let editingProductId = null;
  let editingProductVariants = [];
  let currentProductPage = 1;
  const productsPerPage = 10;
  let categoriesData = [];

  const productsSection = document.getElementById("products-section");
  const addProductSection = document.getElementById("add-product-section");
  const btnShowAddForm = document.getElementById("btn-show-add-form");
  const btnCancelAdd = document.getElementById("btn-cancel-add");
  const addProductForm = document.getElementById("add-product-form");
  const productsTableBody = document.getElementById("products-table-body");
  const productsCountText = document.getElementById("products-count");
  const productsPagination = document.getElementById("products-pagination");
  const searchInput = document.getElementById("search-input");
  const productsCategoryFilter = document.getElementById(
    "products-category-filter",
  );
  const formTitle = document.getElementById("form-title");
  const btnSubmitProduct = document.getElementById("btn-submit-product");

  const inputName = document.getElementById("input-name");
  const inputCategory = document.getElementById("input-category");
  const inputCode = document.getElementById("input-code");
  const inputBrand = document.getElementById("input-brand");
  const inputDescription = document.getElementById("input-description");
  const inputPrice = document.getElementById("input-price");
  const inputDiscountPrice = document.getElementById("input-discount-price");
  const inputSizes = document.getElementById("input-sizes");
  const inputColors = document.getElementById("input-colors");
  const inputStock = document.getElementById("input-stock");
  const inputImage = document.getElementById("input-image");
  const imageNamePreview = document.getElementById("image-name-preview");
  const stockText = document.getElementById("stock-text");
  const radioRatingYes = document.getElementById("rating-yes");
  const radioRatingNo = document.getElementById("rating-no");
  const radioShowInStore = document.getElementById("show-in-store");
  const radioHideInStore = document.getElementById("hide-in-store");

  let uploadedFile = null;

  function parseProductPrice(value, fieldLabel, { optional = false } = {}) {
    const normalized = String(value ?? "")
      .trim()
      .replace(/[۰-۹]/g, (digit) =>
        String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
      )
      .replace(/[٠-٩]/g, (digit) =>
        String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
      )
      .replace(/[٬،,.\s]/g, "");

    if (!normalized && optional) return 0;
    if (!/^\d+$/.test(normalized)) {
      throw new Error(`مبلغ ${fieldLabel} را به‌درستی وارد کنید.`);
    }

    const amount = Number(normalized);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new Error(`مبلغ ${fieldLabel} معتبر نیست.`);
    }
    return amount;
  }

  async function loadProductReferences() {
    const categoryResponse = await fetchWithAuth("/categories");
    categoriesData = categoryResponse?.data || [];

    if (inputCategory) {
      inputCategory.innerHTML =
        '<option value="" disabled selected>انتخاب کنید</option>';
      categoriesData.forEach((category) => {
        inputCategory.add(new Option(category.name, category.id));
      });
    }
    if (productsCategoryFilter) {
      productsCategoryFilter.innerHTML =
        '<option value="all">همه دسته‌بندی‌ها</option>';
      categoriesData.forEach((category) => {
        productsCategoryFilter.add(
          new Option(category.name || category.title || "", category.id),
        );
      });
    }
  }

  function getVariantAttributeValue(variant, attribute) {
    const namedValue =
      variant[`${attribute}_name`] ||
      (attribute === "size" ? variant.dimension_name || variant.dimension : "");
    if (namedValue) return String(namedValue);

    const value = variant[attribute];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (value && typeof value === "object") {
      const name = value.name || value.title;
      if (name) return String(name);
      if (value.id != null) return String(value.id);
    }

    const id = variant[`${attribute}_id`];
    return id == null ? "" : String(id);
  }

  function getTextValues(input) {
    return (input?.value || "")
      .split(/[,،]/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function normalizeSearchValue(value) {
    return String(value ?? "")
      .trim()
      .toLocaleLowerCase()
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک");
  }

  function getProductCategoryIds(product) {
    const categories = Array.isArray(product.categories)
      ? product.categories
      : product.category
        ? [product.category]
        : [];
    const categoryIds = categories
      .map((category) => {
        if (typeof category === "object" && category !== null) {
          return category.id ?? category.category_id;
        }
        const matchingCategory = categoriesData.find(
          (item) =>
            String(item.id) === String(category) ||
            normalizeSearchValue(item.name || item.title) ===
              normalizeSearchValue(category),
        );
        return matchingCategory?.id ?? category;
      })
      .filter((id) => id != null)
      .map(String);
    const singleCategoryId = product.category_id ?? product.categoryId;
    if (singleCategoryId != null) categoryIds.push(String(singleCategoryId));
    if (Array.isArray(product.category_ids)) {
      categoryIds.push(...product.category_ids.map(String));
    }
    return categoryIds;
  }

  function getFilteredProducts() {
    const searchTerm = normalizeSearchValue(searchInput?.value);
    const categoryId = productsCategoryFilter?.value || "all";

    return productsData.filter((product) => {
      if (
        categoryId !== "all" &&
        !getProductCategoryIds(product).includes(String(categoryId))
      ) {
        return false;
      }
      if (!searchTerm) return true;

      const searchableValues = [
        product.name,
        product.title,
        product.code,
        product.sku,
        product.brand_name,
        typeof product.brand === "object"
          ? product.brand?.name
          : product.brand,
        ...(Array.isArray(product.categories)
          ? product.categories.map((category) =>
              typeof category === "string"
                ? category
                : category?.name || category?.title,
            )
          : []),
        product.category?.name,
        typeof product.category === "string" ? product.category : "",
        product.collection,
      ];
      return searchableValues.some((value) =>
        normalizeSearchValue(value).includes(searchTerm),
      );
    });
  }

  // 2. دریافت لیست محصولات از API (GET)
  async function fetchProducts() {
    if (!productsTableBody) return;

    productsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-gray-400 text-center">درحال بارگذاری اطلاعات محصولات...</td>
      </tr>
    `;

    try {
      const res = await fetchWithAuth("/products", { method: "GET" });

      if (Array.isArray(res)) {
        productsData = res;
      } else if (res && Array.isArray(res.data)) {
        productsData = res.data;
      } else if (res && res.data && Array.isArray(res.data.data)) {
        productsData = res.data.data;
      } else {
        productsData = [];
      }

      renderProducts();
    } catch (error) {
      console.error("خطا در دریافت لیست محصولات:", error);
      productsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-red-500 text-center">خطا در دریافت اطلاعات محصولات.</td>
        </tr>
      `;
    }
  }

  // 3. رندر کردن جدول محصولات
  function renderProducts() {
    if (!productsTableBody) return;

    const filteredProducts = getFilteredProducts();
    if (filteredProducts.length === 0) {
      productsTableBody.innerHTML =
        `<tr><td colspan="6" class="py-6 text-gray-400 text-center">${
          productsData.length === 0
            ? "هیچ محصولی یافت نشد."
            : "محصولی با این فیلترها یافت نشد."
        }</td></tr>`;
      if (productsCountText) productsCountText.innerText = "نمایش 0 از 0 محصول";
      if (productsPagination) productsPagination.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    currentProductPage = Math.min(Math.max(currentProductPage, 1), totalPages);
    const startIndex = (currentProductPage - 1) * productsPerPage;
    const visibleProducts = filteredProducts.slice(
      startIndex,
      startIndex + productsPerPage,
    );

    productsTableBody.innerHTML = visibleProducts
      .map((product) => {
        const apiProductId =
          product.id ??
          product.product_id ??
          product.productId ??
          product.id_product ??
          product.product?.id;
        const name = product.name || product.title || "بدون نام";
        const categoryName = Array.isArray(product.categories)
          ? product.categories
              .map((category) =>
                typeof category === "string"
                  ? category
                  : category?.name || category?.title,
              )
              .filter(Boolean)
              .join(", ") || "_"
          : product.category?.name ||
            product.category ||
            product.collection ||
            "_";
        const rawPrice = Number(product.price || 0);
        const formattedPrice = rawPrice.toLocaleString("en-US") + " تومان";

        const stockTotal =
          Array.isArray(product.variants) && product.variants.length
            ? product.variants.reduce(
                (total, variant) =>
                  total + Math.max(0, Number(variant.stock) || 0),
                0,
              )
            : Math.max(0, Number(product.stock ?? product.quantity) || 0);
        const isInStock = stockTotal > 0;
        const statusText = isInStock ? `${stockTotal} عدد` : "ناموجود";

        let rawImage = product.images || product.image_url || product.image;
        let imagePath = "";

        if (typeof rawImage === "string") {
          try {
            const parsed = JSON.parse(rawImage);
            if (Array.isArray(parsed) && parsed.length > 0) {
              imagePath = parsed[0];
            } else {
              imagePath = rawImage;
            }
          } catch (e) {
            imagePath = rawImage;
          }
        } else if (Array.isArray(rawImage) && rawImage.length > 0) {
          imagePath = rawImage[0];
        }

        let imageUrl = resolveFrontendAssetPath(FALLBACK_PRODUCT_IMAGE);
        if (imagePath && typeof imagePath === "string") {
          if (imagePath.startsWith("http")) {
            imageUrl = imagePath;
          } else if (
            imagePath.startsWith("./") ||
            imagePath.startsWith("assets/") ||
            imagePath.startsWith("images/")
          ) {
            imageUrl = resolveFrontendAssetPath(imagePath);
          } else {
            imageUrl = `${BASE_URL}/${imagePath.replace(/^\//, "")}`;
          }
        }

        return `
          <tr class="hover:bg-yasi/20 transition-colors border-b border-rose-100 whitespace-nowrap text-xs sm:text-sm">
            <td class="py-3 px-4">
              <img src="${imageUrl}" alt="${name}" class="w-12 h-12 object-cover rounded-xl mx-auto border border-gray-primary/40" />
            </td>
            <td class="py-3 px-4 text-right font-bold text-black-primary pr-6 truncate max-w-[200px]">
              ${name}
            </td>
            <td class="py-3 px-4 font-bold text-black-primary dir-ltr">
              ${formattedPrice}
            </td>
            <td class="py-3 px-4 font-bold ${isInStock ? "text-emerald-500" : "text-rose-500"}">
              ${statusText}
            </td>
            <td class="py-3 px-4 font-bold text-black-primary">
              ${categoryName}
            </td>
            <td class="py-3 px-4">
              <div class="flex items-center justify-center gap-3 flex-nowrap shrink-0">
                <button onclick="editProduct(${apiProductId})" 
                        class="bg-[#f2e2ce] text-black-primary border border-gray-primary/30 px-3 py-1.5 rounded-2xl hover:brightness-95 transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0">
                  <i class="fa-regular fa-pen-to-square text-xs"></i>
                  <span>ویرایش اطلاعات</span>
                </button>

                <button type="button" data-product-id="${apiProductId ?? ""}" class="delete-product-button text-rose-500 hover:text-rose-700 transition-colors cursor-pointer p-1 shrink-0"
                        title="حذف محصول">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    if (productsCountText) {
      productsCountText.innerText = `نمایش ${startIndex + 1}-${Math.min(startIndex + productsPerPage, filteredProducts.length)} از ${filteredProducts.length} محصول`;
    }

    renderProductsPagination(totalPages);

    productsTableBody
      .querySelectorAll(".delete-product-button")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          window.deleteProduct(button.dataset.productId);
        });
      });
  }

  searchInput?.addEventListener("input", () => {
    currentProductPage = 1;
    renderProducts();
  });
  productsCategoryFilter?.addEventListener("change", () => {
    currentProductPage = 1;
    renderProducts();
  });

  function renderProductsPagination(totalPages) {
    if (!productsPagination) return;
    productsPagination.innerHTML = "";
    if (totalPages <= 1) return;

    const controls = document.createElement("div");
    controls.className = "flex items-center gap-2";
    for (let page = 1; page <= totalPages; page += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(page);
      button.className = `w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-sm border border-purple1/20 transition-all cursor-pointer ${
        page === currentProductPage
          ? "bg-purple1 text-white"
          : "bg-yasi text-purple1 hover:bg-purple1 hover:text-white"
      }`;
      button.addEventListener("click", () => {
        currentProductPage = page;
        renderProducts();
      });
      controls.appendChild(button);
    }
    productsPagination.appendChild(controls);
  }

  // 4. نمایش فرم افزودن
  btnShowAddForm?.addEventListener("click", () => {
    editingProductId = null;
    editingProductVariants = [];
    addProductForm?.reset();
    uploadedFile = null;
    if (formTitle) formTitle.innerText = "افزودن محصول جدید";
    if (btnSubmitProduct) btnSubmitProduct.innerText = "افزودن محصول";
    if (imageNamePreview) imageNamePreview.innerText = "";
    if (inputStock) inputStock.value = "1";
    updateStockStatusText(1);
    productsSection?.classList.add("hidden");
    addProductSection?.classList.remove("hidden");
  });

  // 5. آماده‌سازی فرم ویرایش محصول
  window.editProduct = function (id) {
    const product = productsData.find((p) => p.id === id);
    if (!product) return;

    editingProductId = id;
    editingProductVariants = Array.isArray(product.variants)
      ? product.variants
      : [];
    uploadedFile = null;

    if (inputName) inputName.value = product.name || product.title || "";
    if (inputCategory) {
      inputCategory.value =
        product.category_id ||
        product.categories?.[0]?.id ||
        product.category?.id ||
        "";
    }
    if (inputCode) inputCode.value = product.code || product.sku || "";
    if (inputBrand) {
      inputBrand.value =
        product.brand_name ||
        product.brand?.name ||
        (typeof product.brand === "string" ? product.brand : "") ||
        product.brand_id ||
        "";
    }
    if (inputDescription) inputDescription.value = product.description || "";
    if (inputPrice) inputPrice.value = product.price || "";
    if (inputDiscountPrice)
      inputDiscountPrice.value =
        product.discount_price || product.discountPrice || "";
    if (inputSizes) {
      inputSizes.value = [
        ...new Set(
          editingProductVariants
            .map((variant) => getVariantAttributeValue(variant, "size"))
            .filter(Boolean),
        ),
      ].join(", ");
    }
    if (inputColors) {
      inputColors.value = [
        ...new Set(
          editingProductVariants
            .map((variant) => getVariantAttributeValue(variant, "color"))
            .filter(Boolean),
        ),
      ].join(", ");
    }

    syncStockInputToSelectedVariant();

    if (radioRatingYes && radioRatingNo) {
      radioRatingYes.checked =
        product.show_rating == 1 || product.showRating !== false;
      radioRatingNo.checked =
        product.show_rating == 0 || product.showRating === false;
    }
    if (radioShowInStore && radioHideInStore) {
      radioShowInStore.checked =
        product.is_active == 1 || product.showInStore !== false;
      radioHideInStore.checked =
        product.is_active == 0 || product.showInStore === false;
    }

    if (imageNamePreview) imageNamePreview.innerText = "تصویر قبلی ثبت شده است";
    if (formTitle) formTitle.innerText = "ویرایش محصول";
    if (btnSubmitProduct) btnSubmitProduct.innerText = "ویرایش محصول";

    productsSection?.classList.add("hidden");
    addProductSection?.classList.remove("hidden");
  };

  // 6. انصراف از فرم
  btnCancelAdd?.addEventListener("click", () => {
    editingProductId = null;
    uploadedFile = null;
    addProductForm?.reset();
    if (imageNamePreview) imageNamePreview.innerText = "";
    addProductSection?.classList.add("hidden");
    productsSection?.classList.remove("hidden");
  });

  // 7. مدیریت آپلود عکس
  inputImage?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadedFile = file;
      if (imageNamePreview) imageNamePreview.innerText = file.name;
    }
  });

  function updateStockStatusText(stock) {
    if (!stockText) return;
    const quantity = Math.max(0, Number(stock) || 0);
    if (quantity > 0) {
      stockText.innerText = `${quantity} عدد موجود`;
      stockText.className = "text-sm font-bold text-emerald-500";
    } else {
      stockText.innerText = "ناموجود";
      stockText.className = "text-sm font-bold text-rose-500";
    }
  }

  function syncStockInputToSelectedVariant() {
    const selectedSize = getTextValues(inputSizes)[0] || "";
    const selectedColor = getTextValues(inputColors)[0] || "";
    const selectedVariant = editingProductVariants.find(
      (variant) =>
        getVariantAttributeValue(variant, "size") === selectedSize &&
        getVariantAttributeValue(variant, "color") === selectedColor,
    );
    const stock = Math.max(0, Number(selectedVariant?.stock) || 0);
    if (inputStock) inputStock.value = String(stock);
    updateStockStatusText(stock);
  }

  inputSizes?.addEventListener("input", syncStockInputToSelectedVariant);
  inputColors?.addEventListener("input", syncStockInputToSelectedVariant);

  inputStock?.addEventListener("input", () => {
    updateStockStatusText(inputStock.value);
  });

  // 8. ثبت فرم (POST یا PUT به API)
  addProductForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (btnSubmitProduct) btnSubmitProduct.disabled = true;

    try {
      const endpoint = "/products";
      const method = "POST";
      const price = parseProductPrice(inputPrice?.value, "قیمت");
      const discountPrice = parseProductPrice(
        inputDiscountPrice?.value,
        "با تخفیف",
        { optional: true },
      );
      if (discountPrice > price) {
        throw new Error("قیمت با تخفیف نمی‌تواند از قیمت اصلی بیشتر باشد.");
      }

      const categoryIds = inputCategory?.value
        ? [Number(inputCategory.value)].filter(
            (id) => Number.isFinite(id) && id > 0,
          )
        : [];
      const sizeValues = getTextValues(inputSizes);
      const colorValues = getTextValues(inputColors);

      const existingProduct = productsData.find(
        (product) => String(product.id) === String(editingProductId),
      );
      const existingVariants = Array.isArray(existingProduct?.variants)
        ? existingProduct.variants
        : [];
      const maxVariantCount = Math.max(sizeValues.length, colorValues.length);
      const variants = [];
      for (let i = 0; i < maxVariantCount; i += 1) {
        const sizeName = sizeValues[i] ?? sizeValues[0] ?? "";
        const colorName = colorValues[i] ?? colorValues[0] ?? "";
        if (!sizeName || !colorName) continue;

        const previousVariant = existingVariants.find(
          (variant) =>
            getVariantAttributeValue(variant, "size") === sizeName &&
            getVariantAttributeValue(variant, "color") === colorName,
        );
        variants.push({
          size_id: null,
          color_id: null,
          size_name: sizeName,
          color_name: colorName,
          stock:
            i === 0 || !previousVariant
              ? Math.max(0, Math.floor(Number(inputStock?.value) || 0))
              : Math.max(0, Number(previousVariant.stock) || 0),
          price_adjust: Number(previousVariant?.price_adjust) || 0,
          sku:
            previousVariant?.sku ||
            inputCode?.value?.trim() ||
            `SKU-${editingProductId || Date.now()}-${i}`,
        });
      }

      const formData = new FormData();
      formData.append("name", inputName?.value.trim() || "");
      formData.append("brand_name", inputBrand?.value.trim() || "");
      formData.append("price", String(price));
      formData.append("discount_price", String(discountPrice));
      formData.append("description", inputDescription?.value.trim() || "");
      formData.append("material", "");
      formData.append("warranty", "");
      formData.append(
        "show_rating",
        String(radioRatingYes ? radioRatingYes.checked : true),
      );
      formData.append("variants", JSON.stringify(variants));
      formData.append("category_ids", JSON.stringify(categoryIds));

      if (editingProductId) {
        formData.append("id", String(editingProductId));
      }

      if (uploadedFile) {
        formData.append("images", uploadedFile);
      }

      if (!variants.length) {
        throw new Error("لطفاً حداقل یک سایز و یک رنگ برای محصول وارد کنید.");
      }

      const response = await fetchWithAuth(endpoint, {
        method,
        body: formData,
      });

      if (
        response?.status === false ||
        response?.status === "error" ||
        response?.success === false ||
        response?.authRequired ||
        response?.error
      ) {
        throw new Error(
          response.message || response.error || "خطا در ثبت اطلاعات محصول.",
        );
      }

      window.showAppNotice(
        editingProductId !== null
          ? "محصول با موفقیت ویرایش شد."
          : "محصول جدید با موفقیت اضافه شد.",
      );

      editingProductId = null;
      uploadedFile = null;
      addProductForm.reset();
      if (imageNamePreview) imageNamePreview.innerText = "";
      addProductSection?.classList.add("hidden");
      productsSection?.classList.remove("hidden");

      await fetchProducts();
    } catch (error) {
      console.error("خطا در ثبت اطلاعات محصول:", error);
      window.showAppNotice(
        "خطا در ثبت اطلاعات محصول: " + (error.message || "نامشخص"),
      );
    } finally {
      if (btnSubmitProduct) btnSubmitProduct.disabled = false;
    }
  });

  // 9. حذف محصول (DELETE)
  window.deleteProduct = async function (id) {
    const productId = String(id ?? "").trim();
    if (!/^\d+$/.test(productId) || Number(productId) <= 0) {
      window.showAppNotice("شناسه معتبر برای حذف محصول پیدا نشد.");
      return;
    }
    if (!(await window.showAppConfirm("آیا از حذف این محصول اطمینان دارید؟")))
      return;

    try {
      const response = await fetchWithAuth("/products", {
        method: "DELETE",
        body: JSON.stringify({ id: Number(productId) }),
      });

      if (
        response?.status === false ||
        response?.status === "error" ||
        response?.success === false ||
        response?.error ||
        response?.authRequired
      ) {
        throw new Error(
          response.message || response.error || "حذف محصول از API ناموفق بود.",
        );
      }

      window.showAppNotice("محصول با موفقیت حذف شد.");
      await fetchProducts();
    } catch (error) {
      console.error("خطا در حذف محصول:", error);
      window.showAppNotice("خطا در حذف محصول: " + error.message);
    }
  };

  loadProductReferences().catch((error) => {
    console.error("خطا در دریافت اطلاعات پایه محصول:", error);
  });
  fetchProducts();
});
