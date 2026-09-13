document.addEventListener("DOMContentLoaded", () => {
  // ۳. مدیریت بخش CRUD محصولات (افزودن، ویرایش و حذف)
  // ----------------------------------------------------------------------
  const productsData = [];
  let editingProductId = null;

  const productsSection = document.getElementById("products-section");
  const addProductSection = document.getElementById("add-product-section");
  const btnShowAddForm = document.getElementById("btn-show-add-form");
  const btnCancelAdd = document.getElementById("btn-cancel-add");
  const addProductForm = document.getElementById("add-product-form");
  const productsTableBody = document.getElementById("products-table-body");
  const productsCountText = document.getElementById("products-count");
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
  const inputStatus = document.getElementById("input-status");
  const inputImage = document.getElementById("input-image");
  const imageNamePreview = document.getElementById("image-name-preview");
  const stockText = document.getElementById("stock-text");
  const radioRatingYes = document.getElementById("rating-yes");
  const radioRatingNo = document.getElementById("rating-no");
  const radioShowInStore = document.getElementById("show-in-store");
  const radioHideInStore = document.getElementById("hide-in-store");

  let uploadedImageUrl =
    "https://via.placeholder.com/60/e8b896/ffffff?text=Product";

  function renderProducts() {
    if (!productsTableBody) return;
    if (productsData.length === 0) {
      productsTableBody.innerHTML =
        '<tr><td colspan="6" class="py-6 text-gray-400 text-center">هیچ محصولی یافت نشد.</td></tr>';
      if (productsCountText) productsCountText.innerText = "نمایش ۰ از ۰ محصول";
      return;
    }
    productsTableBody.innerHTML = productsData
      .map(
        (
          product,
        ) => `<tr class="hover:bg-yasi/20 transition-colors border-b border-rose-100 whitespace-nowrap text-xs sm:text-sm">
  <!-- تصویر -->
  <td class="py-3 px-4">
    <img src="${product.image}" alt="${product.title}" class="w-12 h-12 object-cover rounded-xl mx-auto border border-gray-primary/40" />
  </td>

  <!-- نام محصول -->
  <td class="py-3 px-4 text-right font-bold text-black-primary pr-6 truncate max-w-[200px]">
    ${product.title}
  </td>

  <!-- قیمت -->
  <td class="py-3 px-4 font-bold text-black-primary dir-ltr">
    ${product.price}
  </td>

  <!-- موجودی -->
  <td class="py-3 px-4 font-bold ${product.status === "موجود" ? "text-emerald-500" : "text-rose-500"}">
    ${product.status}
  </td>

  <!-- کالکشن -->
  <td class="py-3 px-4 font-bold text-black-primary">
    ${product.collection || "_"}
  </td>

  <!-- عملیات -->
  <td class="py-3 px-4">
    <div class="flex items-center justify-center gap-3 flex-nowrap shrink-0">
      <button onclick="editProduct(${product.id})" 
              class="bg-[#f2e2ce] text-black-primary border border-gray-primary/30 px-3 py-1.5 rounded-2xl hover:brightness-95 transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0">
        <i class="fa-regular fa-pen-to-square text-xs"></i>
        <span>ویرایش اطلاعات</span>
      </button>

      <button onclick="deleteProduct(${product.id})" 
              class="text-rose-500 hover:text-rose-700 transition-colors cursor-pointer p-1 shrink-0" 
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
</tr>`,
      )
      .join("");
    if (productsCountText)
      productsCountText.innerText = `نمایش ${productsData.length} از ${productsData.length} محصول`;
  }

  btnShowAddForm?.addEventListener("click", () => {
    editingProductId = null;
    addProductForm?.reset();
    if (formTitle) formTitle.innerText = "افزودن محصول جدید";
    if (btnSubmitProduct) btnSubmitProduct.innerText = "افزودن محصول";
    if (imageNamePreview) imageNamePreview.innerText = "";
    uploadedImageUrl =
      "https://via.placeholder.com/60/e8b896/ffffff?text=Product";
    if (inputStatus) inputStatus.checked = true;
    updateStockStatusText(true);
    productsSection?.classList.add("hidden");
    addProductSection?.classList.remove("hidden");
  });

  window.editProduct = function (id) {
    const product = productsData.find((p) => p.id === id);
    if (!product) return;
    editingProductId = id;
    if (inputName) inputName.value = product.title || "";
    if (inputCategory)
      inputCategory.value = product.category || product.collection || "";
    if (inputCode) inputCode.value = product.code || "";
    if (inputBrand) inputBrand.value = product.brand || "";
    if (inputDescription) inputDescription.value = product.description || "";
    if (inputPrice)
      inputPrice.value = product.price
        ? product.price.replace(" تومان", "")
        : "";
    if (inputDiscountPrice)
      inputDiscountPrice.value = product.discountPrice || "";
    if (inputSizes) inputSizes.value = product.sizes || "";
    if (inputColors) inputColors.value = product.colors || "";

    const isInStock = product.status === "موجود";
    if (inputStatus) inputStatus.checked = isInStock;
    updateStockStatusText(isInStock);

    if (radioRatingYes && radioRatingNo) {
      radioRatingYes.checked = product.showRating !== false;
      radioRatingNo.checked = product.showRating === false;
    }
    if (radioShowInStore && radioHideInStore) {
      radioShowInStore.checked = product.showInStore !== false;
      radioHideInStore.checked = product.showInStore === false;
    }

    uploadedImageUrl =
      product.image ||
      "https://via.placeholder.com/60/e8b896/ffffff?text=Product";
    if (imageNamePreview) imageNamePreview.innerText = "تصویر فعلی ثبت شده است";
    if (formTitle) formTitle.innerText = "ویرایش محصول";
    if (btnSubmitProduct) btnSubmitProduct.innerText = "ویرایش محصول";

    productsSection?.classList.add("hidden");
    addProductSection?.classList.remove("hidden");
  };

  btnCancelAdd?.addEventListener("click", () => {
    editingProductId = null;
    addProductForm?.reset();
    if (imageNamePreview) imageNamePreview.innerText = "";
    addProductSection?.classList.add("hidden");
    productsSection?.classList.remove("hidden");
  });

  inputImage?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (imageNamePreview) imageNamePreview.innerText = file.name;
      uploadedImageUrl = URL.createObjectURL(file);
    }
  });

  function updateStockStatusText(isChecked) {
    if (!stockText) return;
    if (isChecked) {
      stockText.innerText = "موجود است";
      stockText.className = "text-sm font-bold text-emerald-500";
    } else {
      stockText.innerText = "ناموجود";
      stockText.className = "text-sm font-bold text-rose-500";
    }
  }
  inputStatus?.addEventListener("change", () => {
    updateStockStatusText(inputStatus.checked);
  });

  addProductForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const formattedPrice = inputPrice.value.trim().includes("تومان")
      ? inputPrice.value.trim()
      : `${inputPrice.value.trim()} تومان`;

    if (editingProductId !== null) {
      const index = productsData.findIndex((p) => p.id === editingProductId);
      if (index !== -1) {
        productsData[index] = {
          ...productsData[index],
          title: inputName?.value.trim() || "",
          category: inputCategory?.value || "",
          collection: inputCategory?.value || "_",
          code: inputCode?.value.trim() || "",
          brand: inputBrand?.value.trim() || "",
          description: inputDescription?.value.trim() || "",
          price: formattedPrice,
          discountPrice: inputDiscountPrice?.value.trim() || "",
          sizes: inputSizes?.value || "",
          colors: inputColors?.value || "",
          status: inputStatus?.checked ? "موجود" : "ناموجود",
          image: uploadedImageUrl,
          showRating: radioRatingYes ? radioRatingYes.checked : true,
          showInStore: radioShowInStore ? radioShowInStore.checked : true,
        };
      }
    } else {
      const newProduct = {
        id: Date.now(),
        title: inputName?.value.trim() || "",
        category: inputCategory?.value || "",
        collection: inputCategory?.value || "_",
        code: inputCode?.value.trim() || "",
        brand: inputBrand?.value.trim() || "",
        description: inputDescription?.value.trim() || "",
        price: formattedPrice,
        discountPrice: inputDiscountPrice?.value.trim() || "",
        sizes: inputSizes?.value || "",
        colors: inputColors?.value || "",
        status: inputStatus?.checked ? "موجود" : "ناموجود",
        image: uploadedImageUrl,
        showRating: radioRatingYes ? radioRatingYes.checked : true,
        showInStore: radioShowInStore ? radioShowInStore.checked : true,
      };
      productsData.unshift(newProduct);
    }

    renderProducts();
    editingProductId = null;
    addProductForm.reset();
    if (imageNamePreview) imageNamePreview.innerText = "";
    uploadedImageUrl =
      "https://via.placeholder.com/60/e8b896/ffffff?text=Product";
    addProductSection?.classList.add("hidden");
    productsSection?.classList.remove("hidden");
  });

  window.deleteProduct = function (id) {
    if (confirm("آیا از حذف این محصول اطمینان دارید؟")) {
      const index = productsData.findIndex((p) => p.id === id);
      if (index !== -1) {
        productsData.splice(index, 1);
        renderProducts();
      }
    }
  };

  renderProducts();
});
