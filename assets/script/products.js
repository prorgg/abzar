import { allProducts } from "./data.js";

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================================================
  // ۱. متغیرها و وضعیت اولیه (State Management)
  // ==========================================================================
  let currentPage = 1;
  const itemsPerPage = 12;

  // کپی پشتیبان از لیست اصلی محصولات بدون تغییر در داده مرجع
  const masterProductsList = [...(allProducts || [])];

  // لیست آرایه محصولات فیلترشده که در گرید قرار می‌گیرند
  let filteredProducts = [...masterProductsList];

  // المان‌های کانتینر اصلی محصولات
  const productContainer =
    document.querySelector("#product-container") ||
    document.getElementById("special-products-grid") ||
    document.getElementById("products-grid");

  // کانتینر علاقه‌مندی‌ها
  const favoritesContainer = document.getElementById("favorites-container");

  // المان‌های اسلایدر محصولات ویژه
  const specialTrack = document.getElementById("specialTrack");
  const specialPrev = document.getElementById("specialPrev");
  const specialNext = document.getElementById("specialNext");

  // المان‌های اسلایدر همه محصولات
  const allTrack = document.getElementById("allTrack");
  const allPrev = document.getElementById("allPrev");
  const allNext = document.getElementById("allNext");

  // المان‌های مودال فیلتر
  const filterModal = document.getElementById("filter-modal");
  const closeFilterModalBtn = document.getElementById("close-filter-modal-btn");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const resetFilterBtn = document.getElementById("reset-filter-btn");

  // ورودی‌های فیلتر
  const filterSearchInput = document.getElementById("filter-search-input");
  const filterDiscountSelect = document.getElementById(
    "filter-discount-select",
  );
  const filterPriceRange = document.getElementById("filter-price-range");
  const filterPriceValue = document.getElementById("filter-price-value");

  // ==========================================================================
  // ۲. توابع کمکی (Helper Functions)
  // ==========================================================================

  // تبدیل اعداد فارسی/متن به عدد انگلیسی جهت محاسبات ریاضی
  function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const persianDigits = [
      /۰/g,
      /۱/g,
      /۲/g,
      /۳/g,
      /۴/g,
      /۵/g,
      /۶/g,
      /۷/g,
      /۸/g,
      /۹/g,
    ];
    let normalizedStr = String(priceStr);
    for (let i = 0; i < 10; i++) {
      normalizedStr = normalizedStr.replace(persianDigits[i], i);
    }
    const cleanStr = normalizedStr.replace(/[^0-9]/g, "");
    return parseInt(cleanStr, 10) || 0;
  }

  // محاسبه حداکثر قیمت محصولات جهت تنظیم دامنه اسلایدر قیمت
  const allPrices = masterProductsList.map((p) => parsePrice(p.price));
  const maxProductPrice = allPrices.length ? Math.max(...allPrices) : 10000000;

  // تنظیم ویژگی‌های Range اسلایدر قیمت
  if (filterPriceRange) {
    filterPriceRange.min = "0";
    filterPriceRange.max = maxProductPrice.toString();
    filterPriceRange.step = "50000";
    filterPriceRange.value = maxProductPrice.toString();
  }

  // به‌روزرسانی برچسب نشان‌دهنده قیمت در مودال فیلتر
  function updatePriceLabel(val) {
    if (!filterPriceValue) return;
    const numericVal = parseInt(val, 10);
    if (numericVal >= maxProductPrice || numericVal === 0) {
      filterPriceValue.textContent = "همه قیمت‌ها";
    } else {
      filterPriceValue.textContent = `تا ${numericVal.toLocaleString("fa-IR")} تومان`;
    }
  }

  filterPriceRange?.addEventListener("input", (e) =>
    updatePriceLabel(e.target.value),
  );

  // ==========================================================================
  // ۳. مدیریت مودال فیلتر (Modal Controls)
  // ==========================================================================
  const filterButtons = Array.from(document.querySelectorAll("button")).filter(
    (btn) =>
      btn.textContent.trim().includes("فیلتر") &&
      btn.id !== "apply-filter-btn" &&
      btn.id !== "reset-filter-btn",
  );

  function openFilterModal() {
    if (!filterModal) return;
    filterModal.classList.remove("opacity-0", "pointer-events-none");
    filterModal.querySelector("div")?.classList.remove("scale-95");
    document.body.classList.add("overflow-hidden");
  }

  function closeFilterModal() {
    if (!filterModal) return;
    filterModal.classList.add("opacity-0", "pointer-events-none");
    filterModal.querySelector("div")?.classList.add("scale-95");
    document.body.classList.remove("overflow-hidden");
  }

  filterButtons.forEach((btn) =>
    btn.addEventListener("click", openFilterModal),
  );
  closeFilterModalBtn?.addEventListener("click", closeFilterModal);
  filterModal?.addEventListener("click", (e) => {
    if (e.target === filterModal) closeFilterModal();
  });

  // ==========================================================================
  // ۴. رندر اسلایدر محصولات ویژه (Special Products Slider)
  // ==========================================================================
  function renderSpecialSlider() {
    if (!specialTrack) return;
    specialTrack.innerHTML = "";

    const productsToRender = masterProductsList.slice(0, 7);

    productsToRender.forEach((item) => {
      const isLiked = item.like === true || item.like === "true";
      specialTrack.insertAdjacentHTML(
        "beforeend",
        `
        <div data-id="${item.id}" class="product-card min-w-[260px] sm:min-w-[280px] max-w-[280px] group relative bg-white border border-purple1/30 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-lg cursor-pointer flex-shrink-0">
          <div>
            <div class="relative bg-gray-100 rounded-xl aspect-square flex items-center justify-center overflow-hidden mb-4">
              ${item.discount ? `<span class="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">${item.discount}٪ تخفیف</span>` : ""}
              <button data-id="${item.id}" class="like-btn absolute top-3 right-3 text-purple1 hover:scale-110 transition-transform z-10">
                <svg class="w-6 h-6 stroke-purple1 ${isLiked ? "fill-purple1" : "fill-none"}" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </button>
              <img src="${item.image}" alt="${item.title}" class="w-full h-full object-contain">
            </div>
            <div class="text-center space-y-1">
              <h3 class="font-bold text-black-main text-base sm:text-lg truncate">${item.title}</h3>
              <p class="text-xs text-gray-primary">کد محصول: ${item.id}</p>
              <p class="text-base font-extrabold text-purple1 pt-1">${item.price} <span class="text-xs font-normal">تومان</span></p>
            </div>
          </div>
          <button class="add-to-cart-btn w-full mt-4 bg-purple1 text-white py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-opacity-90 active:scale-95 transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
            <span class="text-xs sm:text-sm">افزودن به سبد خرید</span>
          </button>
        </div>
      `,
      );
    });

    setupSpecialSlider();
  }

  // تنظیم حرکات و محاسبه موقعیت اسلایدر محصولات ویژه
  function setupSpecialSlider() {
    if (!specialTrack || !specialPrev || !specialNext) return;
    let currentIndex = 0;

    function getCardWidth() {
      const card = specialTrack.querySelector(".product-card");
      if (!card) return 300;
      const style = window.getComputedStyle(specialTrack);
      const gap = parseInt(style.gap || "16", 10);
      return card.offsetWidth + gap;
    }

    function getMaxIndex() {
      const cardWidth = getCardWidth();
      const visibleWidth = specialTrack.parentElement.offsetWidth;
      const totalWidth = specialTrack.scrollWidth;
      const maxScroll = totalWidth - visibleWidth;
      return Math.max(0, Math.ceil(maxScroll / cardWidth));
    }

    function updateSliderPosition() {
      const cardWidth = getCardWidth();
      specialTrack.style.transform = `translateX(${currentIndex * cardWidth}px)`;
      specialPrev.disabled = currentIndex <= 0;
      specialNext.disabled = currentIndex >= getMaxIndex();
    }

    specialNext.onclick = () => {
      if (currentIndex < getMaxIndex()) {
        currentIndex++;
        updateSliderPosition();
      }
    };

    specialPrev.onclick = () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateSliderPosition();
      }
    };

    updateSliderPosition();
  }

  // ==========================================================================
  // ۵. رندر اسلایدر همه محصولات (All Products Slider)
  // ==========================================================================
  function renderAllProductsSlider() {
    if (!allTrack) return;
    allTrack.innerHTML = "";

    const productsToRender = masterProductsList.slice(0, 10);

    productsToRender.forEach((item) => {
      const isLiked = item.like === true || item.like === "true";
      allTrack.insertAdjacentHTML(
        "beforeend",
        `
        <div data-id="${item.id}" class="product-card min-w-[260px] sm:min-w-[280px] max-w-[280px] group relative bg-white border border-purple1/30 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-lg cursor-pointer flex-shrink-0">
          <div>
            <div class="relative bg-gray-100 rounded-xl aspect-square flex items-center justify-center overflow-hidden mb-4">
              ${item.discount ? `<span class="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">${item.discount}٪ تخفیف</span>` : ""}
              <button data-id="${item.id}" class="like-btn absolute top-3 right-3 text-purple1 hover:scale-110 transition-transform z-10">
                <svg class="w-6 h-6 stroke-purple1 ${isLiked ? "fill-purple1" : "fill-none"}" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </button>
              <img src="${item.image}" alt="${item.title}" class="w-full h-full object-contain">
            </div>
            <div class="text-center space-y-1">
              <h3 class="font-bold text-black-main text-base sm:text-lg truncate">${item.title}</h3>
              <p class="text-xs text-gray-primary">کد محصول: ${item.id}</p>
              <p class="text-base font-extrabold text-purple1 pt-1">${item.price} <span class="text-xs font-normal">تومان</span></p>
            </div>
          </div>
          <button class="add-to-cart-btn w-full mt-4 bg-purple1 text-white py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-opacity-90 active:scale-95 transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
            <span class="text-xs sm:text-sm">افزودن به سبد خرید</span>
          </button>
        </div>
      `,
      );
    });

    setupAllProductsSlider();
  }

  // تنظیم حرکات اسلایدر عمومی محصولات
  function setupAllProductsSlider() {
    if (!allTrack || !allPrev || !allNext) return;
    let currentIndex = 0;

    function getCardWidth() {
      const card = allTrack.querySelector(".product-card");
      if (!card) return 300;
      const style = window.getComputedStyle(allTrack);
      const gap = parseInt(style.gap || "16", 10);
      return card.offsetWidth + gap;
    }

    function getMaxIndex() {
      const cardWidth = getCardWidth();
      const visibleWidth = allTrack.parentElement.offsetWidth;
      const totalWidth = allTrack.scrollWidth;
      const maxScroll = totalWidth - visibleWidth;
      return Math.max(0, Math.ceil(maxScroll / cardWidth));
    }

    function updateSliderPosition() {
      const cardWidth = getCardWidth();
      allTrack.style.transform = `translateX(${currentIndex * cardWidth}px)`;
      allPrev.disabled = currentIndex <= 0;
      allNext.disabled = currentIndex >= getMaxIndex();
    }

    allNext.onclick = () => {
      if (currentIndex < getMaxIndex()) {
        currentIndex++;
        updateSliderPosition();
      }
    };

    allPrev.onclick = () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateSliderPosition();
      }
    };

    updateSliderPosition();
  }

  // ==========================================================================
  // ۶. رندر گرید محصولات اصلی و صفحه بندی (Grid + Pagination)
  // ==========================================================================
  function renderProducts() {
    if (!productContainer) return;
    productContainer.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    if (paginatedProducts.length === 0) {
      productContainer.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-500 font-bold">
          هیچ محصولی با مشخصات انتخاب شده یافت نشد.
        </div>
      `;
      updatePagination();
      return;
    }

    paginatedProducts.forEach((item) => {
      const isLiked = item.like === true || item.like === "true";
      productContainer.insertAdjacentHTML(
        "beforeend",
        `
        <div data-id="${item.id}" class="product-card group relative bg-white border border-purple1/30 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-lg cursor-pointer">
          <div>
            <div class="relative bg-gray-100 rounded-xl aspect-square flex items-center justify-center overflow-hidden mb-4">
              ${item.discount ? `<span class="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">${item.discount}٪ تخفیف</span>` : ""}
              <button data-id="${item.id}" class="like-btn absolute top-3 right-3 text-purple1 hover:scale-110 transition-transform z-10">
                <svg class="w-6 h-6 stroke-purple1 ${isLiked ? "fill-purple1" : "fill-none"}" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </button>
              <img src="${item.image}" alt="${item.title}" class="w-full h-full object-contain">
            </div>
            <div class="text-center space-y-1">
              <h3 class="font-bold text-black-main text-lg">${item.title}</h3>
              <p class="text-xs text-gray-primary">کد محصول: ${item.id}</p>
              <p class="text-base font-extrabold text-purple1 pt-1">${item.price} <span class="text-xs font-normal">تومان</span></p>
            </div>
          </div>
          <button class="add-to-cart-btn w-full mt-4 bg-purple1 text-white py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-opacity-90 active:scale-95 transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
            <span>افزودن به سبد خرید</span>
          </button>
        </div>
      `,
      );
    });

    updatePagination();
  }

  // ایجاد و به‌روزرسانی دکمه‌های صفحه‌بندی
  function updatePagination() {
    const paginationContainer =
      document.querySelector("#pagination-container") ||
      document.querySelector(".dir-ltr");
    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    if (totalPages <= 1) return;

    function scrollToContainer() {
      if (productContainer) {
        window.scrollTo({
          top: productContainer.offsetTop - 100,
          behavior: "smooth",
        });
      }
    }

    // دکمه قبلی
    const prevBtn = document.createElement("button");
    prevBtn.className = `p-2.5 rounded-lg border transition-colors ${
      currentPage === 1
        ? "border-gray-200 text-gray-300 cursor-not-allowed"
        : "border-purple1 text-purple1 hover:bg-yasi cursor-pointer"
    }`;
    prevBtn.disabled = currentPage === 1;
    prevBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
      </svg>
    `;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderProducts();
        scrollToContainer();
      }
    };
    paginationContainer.appendChild(prevBtn);

    // محاسبه شماره صفحات
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pageNumbers.push(i);
      } else if (pageNumbers[pageNumbers.length - 1] !== "...") {
        pageNumbers.push("...");
      }
    }

    pageNumbers.forEach((page) => {
      if (page === "...") {
        const dots = document.createElement("span");
        dots.className = "px-2 text-gray-400 tracking-widest";
        dots.textContent = "...";
        paginationContainer.appendChild(dots);
      } else {
        const btn = document.createElement("button");
        btn.textContent = page;
        btn.className =
          page === currentPage
            ? "w-10 h-10 rounded-lg border border-purple1 bg-purple1 text-white font-semibold cursor-pointer"
            : "w-10 h-10 rounded-lg border border-gray-300/40 text-gray-600 font-semibold hover:border-purple1 hover:text-purple1 cursor-pointer";
        btn.onclick = () => {
          currentPage = page;
          renderProducts();
          scrollToContainer();
        };
        paginationContainer.appendChild(btn);
      }
    });

    // دکمه بعدی
    const nextBtn = document.createElement("button");
    nextBtn.className = `p-2.5 rounded-lg border transition-colors ${
      currentPage === totalPages
        ? "border-gray-200 text-gray-300 cursor-not-allowed"
        : "border-purple1 text-purple1 hover:bg-yasi cursor-pointer"
    }`;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
      </svg>
    `;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderProducts();
        scrollToContainer();
      }
    };
    paginationContainer.appendChild(nextBtn);
  }

  // ==========================================================================
  // ۷. منطق و فیلتر کردن اطلاعات (Filtering Logic)
  // ==========================================================================
  function applyFilters() {
    const searchQuery = filterSearchInput?.value.trim().toLowerCase() || "";
    const discountFilter = filterDiscountSelect?.value || "all";
    const selectedMaxPrice = parseInt(
      filterPriceRange?.value || maxProductPrice.toString(),
      10,
    );

    filteredProducts = masterProductsList.filter((product) => {
      const matchesSearch =
        !searchQuery || product.title.toLowerCase().includes(searchQuery);

      const hasDiscount = product.discount && Number(product.discount) > 0;
      const matchesDiscount =
        discountFilter === "all" ||
        (discountFilter === "discounted" && hasDiscount) ||
        (discountFilter === "normal" && !hasDiscount);

      const prodPrice = parsePrice(product.price);
      const matchesPrice =
        selectedMaxPrice >= maxProductPrice || prodPrice <= selectedMaxPrice;

      return matchesSearch && matchesDiscount && matchesPrice;
    });

    currentPage = 1;
    renderProducts();
    closeFilterModal();
  }

  function resetFilters() {
    if (filterSearchInput) filterSearchInput.value = "";
    if (filterDiscountSelect) filterDiscountSelect.value = "all";
    if (filterPriceRange) {
      filterPriceRange.value = maxProductPrice.toString();
      updatePriceLabel(maxProductPrice);
    }

    filteredProducts = [...masterProductsList];
    currentPage = 1;
    renderProducts();
    closeFilterModal();
  }

  applyFilterBtn?.addEventListener("click", applyFilters);
  resetFilterBtn?.addEventListener("click", resetFilters);

  // ==========================================================================
  // ۸. مدیریت بخش علاقه‌مندی‌ها (Favorites Section)
  // ==========================================================================
  function renderFavorites() {
    if (!favoritesContainer) return;

    const likedProducts = masterProductsList.filter(
      (p) => p.like === true || p.like === "true",
    );

    favoritesContainer.innerHTML = "";

    if (likedProducts.length === 0) {
      favoritesContainer.innerHTML = `
        <div class="col-span-full text-center py-10 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          هیچ محصولی در لیست علاقه‌مندی‌های شما قرار ندارد.
        </div>
      `;
      return;
    }

    likedProducts.forEach((item) => {
      favoritesContainer.insertAdjacentHTML(
        "beforeend",
        `
        <div data-id="${item.id}" class="product-card group relative bg-white border border-purple1/30 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-lg cursor-pointer">
          <div>
            <div class="relative bg-gray-100 rounded-xl aspect-square flex items-center justify-center overflow-hidden mb-4">
              ${item.discount ? `<span class="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">${item.discount}٪ تخفیف</span>` : ""}
              <button data-id="${item.id}" class="like-btn absolute top-3 right-3 text-purple1 hover:scale-110 transition-transform z-10">
                <svg class="w-6 h-6 stroke-purple1 fill-purple1" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </button>
              <img src="${item.image}" alt="${item.title}" class="w-full h-full object-contain">
            </div>
            <div class="text-center space-y-1">
              <h3 class="font-bold text-black-main text-lg truncate">${item.title}</h3>
              <p class="text-xs text-gray-primary">کد محصول: ${item.id}</p>
              <p class="text-base font-extrabold text-purple1 pt-1">${item.price} <span class="text-xs font-normal">تومان</span></p>
            </div>
          </div>
          <button class="add-to-cart-btn w-full mt-4 bg-purple1 text-white py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-opacity-90 active:scale-95 transition-all">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
            <span>افزودن به سبد خرید</span>
          </button>
        </div>
      `,
      );
    });
  }

  // ==========================================================================
  // ۹. اسلایدر و رندر محصولات مرتبط (Related Products Slider)
  // ==========================================================================
  function setupRelatedProducts(currentCategory, currentProductId) {
    const track = document.getElementById("specialTrack");
    const prevBtn = document.getElementById("specialPrev");
    const nextBtn = document.getElementById("specialNext");

    if (!track) return;

    // ۱. فیلتر محصولات مرتبط (هم‌دسته با محصول فعلی و حذف خود محصول فعلی)
    let related = (allProducts || []).filter(
      (p) =>
        p.category === currentCategory &&
        String(p.id) !== String(currentProductId),
    );

    // اگر محصول هم‌دسته‌ای یافت نشد، سایر محصولات را نشان بده
    if (related.length === 0) {
      related = (allProducts || []).filter(
        (p) => String(p.id) !== String(currentProductId),
      );
    }

    // ۲. رندر کارت‌های محصول در اسلایدر
    track.innerHTML = related
      .map(
        (item) => `
    <div data-id="${item.id}" 
       class="related-product-card flex-shrink-0 w-[220px] sm:w-[260px] bg-white border border-gray-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group cursor-pointer">
      
      <div class="w-full aspect-square bg-[#FFF2F2] rounded-xl p-4 flex items-center justify-center overflow-hidden mb-3">
        <img src="${item.image || "../images/placeholder.jpg"}" 
             alt="${item.title}" 
             class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
      </div>

      <div class="flex flex-col gap-2 text-right" dir="rtl">
        <h3 class="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-red-600 transition-colors">
          ${item.title}
        </h3>
        <span class="text-xs text-gray-400 font-medium">
          ${item.category || "عمومی"}
        </span>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <span class="text-xs text-gray-400">قیمت:</span>
          <span class="text-sm font-extrabold text-red-600">
            ${item.price} <span class="text-xs font-normal text-gray-500">تومان</span>
          </span>
        </div>
      </div>

    </div>
  `,
      )
      .join("");

    // ۳. مدیریت کلیک روی هر کارت محصول مرتبط جهت بارگذاری جزئیات همان محصول در همین صفحه
    track.querySelectorAll(".related-product-card").forEach((card) => {
      card.addEventListener("click", () => {
        const selectedId = card.dataset.id;
        if (selectedId) {
          // به‌روزرسانی پارامتر ID در URL بدون ریلود کامل صفحه
          const newUrl = `${window.location.pathname}?id=${selectedId}`;
          window.history.pushState({ path: newUrl }, "", newUrl);

          // بارگذاری مجدد اطلاعات جزئیات محصول در همین صفحه
          loadProductDetails(selectedId);

          // اسکرول نرم به بالای صفحه جزئیات
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });

    // ۴. منطق اسکرول افقی اسلایدر
    const scrollAmount = 280;

    nextBtn?.addEventListener("click", () => {
      track.parentElement.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });

    prevBtn?.addEventListener("click", () => {
      track.parentElement.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
  }

  // ==========================================================================
  // ۱۰. رویداد کلیک روی دکمه لایک (Event Delegation)
  // ==========================================================================
  document.addEventListener("click", (e) => {
    const likeBtn = e.target.closest(".like-btn");
    if (!likeBtn) return;

    e.stopPropagation();

    const productId = String(likeBtn.dataset.id);
    const targetProduct = masterProductsList.find(
      (p) => String(p.id) === productId,
    );

    if (targetProduct) {
      targetProduct.like = !(
        targetProduct.like === true || targetProduct.like === "true"
      );

      renderProducts();
      renderSpecialSlider();
      renderAllProductsSlider();
      renderFavorites();
    }
  });

  // ==========================================================================
  // ۱۱. رویداد کلیک جهت هدایت به صفحه جزئیات (Card Navigation)
  // ==========================================================================
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    const isAddToCart = e.target.closest(".add-to-cart-btn");
    const isLikeBtn = e.target.closest(".like-btn");

    if (card && !isAddToCart && !isLikeBtn) {
      const productId = card.dataset.id;
      localStorage.setItem("selectedProductId", productId);

      const pathname = window.location.pathname;
      const isSubFolder =
        pathname.includes("/products/") ||
        pathname.includes("/about-us/") ||
        pathname.includes("/admin/") ||
        pathname.includes("/cart/");

      const targetUrl = isSubFolder
        ? `../details/index.html?id=${productId}`
        : `./details/index.html?id=${productId}`;

      window.location.href = targetUrl;
    }
  });

  // ==========================================================================
  // ۱۲. فراخوانی‌های اولیه و رندر کامپوننت‌های کلی
  // ==========================================================================
  if (filterPriceRange) updatePriceLabel(filterPriceRange.value);
  renderProducts();
  renderSpecialSlider();
  renderAllProductsSlider();
  renderFavorites();

  // ==========================================================================
  // ۱۳. رندر دینامیک بخش جزئیات محصول (Product Detail Page Rendering)
  // ==========================================================================
  function loadProductDetails(targetProductId) {
    const root = document.getElementById("product-detail-root");
    if (!root) return;

    // ۱. جستجو در آرایه داده‌ها
    const product = (allProducts || []).find(
      (p) => String(p.id) === String(targetProductId),
    );

    if (!product) {
      root.innerHTML = `
        <div class="max-w-[1440px] mx-auto p-12 text-center text-red-600 font-bold text-xl">
          محصول مورد نظر یافت نشد.
        </div>
      `;
      return;
    }

    // ۲. استخراج مشخصات محصول یا مقادیر پیش‌فرض
    const {
      id,
      title = "عنوان نامشخص",
      price = "0",
      image = "../images/placeholder.jpg",
      category = "ابزار عمومی",
      brand = "مشخص نشده",
      description = "توضیحاتی برای این محصول ثبت نشده است.",
      weight = "نامشخص",
      dimensions = "نامشخص",
      like = false,
      gallery = [],
    } = product;

    // راه اندازی مجدد محصولات مرتبط بر اساس دسته بندی و آیدی محصول انتخابی جدید
    setupRelatedProducts(category, id);

    // تنظیم گالری تصاویر (در صورت عدم وجود، استفاده از تصویر اصلی)
    const productImages = gallery.length > 0 ? gallery : [image, image, image];

    // ۳. تزریق کامل HTML و Tailwind CSS
    root.innerHTML = `
        <h1 class="text-2xl font-extrabold text-black-main mb-6 text-right">
          جزئیات محصول
        </h1>

        <!-- کادر اصلی -->
        <div class="border border-red-500 rounded-3xl p-6 bg-white shadow-sm">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <!-- ۱. بخش اطلاعات سمت چپ + گالری عکس سمت راست -->
            <div class="lg:col-span-8 flex flex-col gap-4 overflow-visible" dir="rtl">
              
              <!-- عنوان محصول -->
              <div class="flex items-center w-full">
                <span class="w-[60%] h-[2px] bg-red-500 z-0"></span>
                <h2 class="text-xl md:text-2xl font-extrabold text-red-600 whitespace-nowrap bg-white pr-4 z-10">
                  ${title}
                </h2>
              </div>

              <!-- گالری عکس و مشخصات خلاصه -->
              <div class="grid grid-cols-1 md:grid-cols-12 items-start gap-4">
                
                <!-- گالری عکس -->
                <div class="md:col-span-7 flex flex-col gap-4">
                  <div class="bg-[#FFF2F2] rounded-3xl aspect-square flex items-center justify-center p-8 relative overflow-hidden shadow-sm">
                    <img id="main-product-img" src="${image}" alt="${title}" class="w-full h-full object-contain" />
                  </div>

                  <div class="flex items-center justify-between gap-2">
                    <button class="text-purple1 hover:scale-110 transition-transform">
                      <svg class="w-8 h-8 fill-current" viewBox="0 0 29 58" fill="none">
                        <path d="M0 0L28.75 28.75L0 57.5V0Z" />
                      </svg>
                    </button>

                    <div class="grid grid-cols-3 gap-3 flex-1">
                      ${productImages
                        .slice(0, 3)
                        .map(
                          (imgSrc) => `
                        <div class="thumb-card bg-[#FFF2F2] rounded-2xl aspect-square p-2 flex items-center justify-center cursor-pointer hover:border hover:border-red-400 transition-all">
                          <img src="${imgSrc}" alt="${title}" class="w-full h-full object-contain" />
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

                <!-- مشخصات و خلاصه -->
                <div class="md:col-span-5 space-y-8 pt-5 md:pt-3 xl:pt-6 2xl:pt-10 text-right">
                  <div class="md:space-y-5 xl:space-y-7 2xl:space-y-10">
                    
                    <div class="flex items-center text-xs md:text-sm text-gray-700">
                      <span class="w-4 h-[2px] bg-red-500 flex-shrink-0"></span>
                      <span class="whitespace-nowrap bg-white pr-2">دسته بندی: ${category}</span>
                    </div>

                    <div class="flex items-center text-xs md:text-sm text-gray-400">
                      <span class="w-4 h-[2px] bg-red-500 flex-shrink-0"></span>
                      <div class="flex items-center gap-1.5 whitespace-nowrap bg-white pr-2">
                        <span class="text-gray-300 tracking-tight">☆☆☆☆☆</span>
                        <span>(9)</span>
                        <button class="text-red-300 hover:text-red-500 transition-colors">
                          <svg class="w-6 h-6 xl:w-10 h-10 stroke-red-400 ${like ? "fill-red-500" : "fill-none"}" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div class="space-y-2 pt-2">
                      <p class="text-xs md:text-sm font-bold text-red-600 text-right pr-6">خلاصه محصول</p>
                      <div class="flex items-center text-xs md:text-sm text-gray-700 font-medium">
                        <span class="w-4 h-[2px] bg-red-500 flex-shrink-0"></span>
                        <span class="pr-2">${title}</span>
                      </div>
                      <div class="flex items-center text-xs md:text-sm text-gray-700 font-medium">
                        <span class="w-4 h-[2px] bg-red-500 flex-shrink-0"></span>
                        <span class="pr-2">برند ${brand}</span>
                      </div>
                      <div class="flex items-center text-xs md:text-sm text-gray-700 font-medium">
                        <span class="w-4 h-[2px] bg-red-500 flex-shrink-0"></span>
                        <span class="pr-2">ضدآب / گارانتی / همراه با جعبه مخصوص</span>
                      </div>
                    </div>

                    <div class="flex items-center pt-2">
                      <span class="w-4 h-[2px] bg-red-500 flex-shrink-0"></span>
                      <span class="text-xl md:text-2xl font-extrabold text-red-600 whitespace-nowrap bg-white pr-2">
                        ${price} <span class="text-sm lg:text-xl xl:text-3xl font-bold">تومان</span>
                      </span>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            <!-- ۲. ستون مشخصات فنی و خرید -->
            <div class="lg:col-span-4 border border-red-400 rounded-2xl p-5 space-y-4 flex flex-col justify-between bg-white h-full">
              <div class="text-xs text-gray-600 space-y-2 leading-relaxed text-right">
                <p>تعویض و مرجوعی به هیچ عنوان نداریم.</p>
                <p>${description}</p>
                <p>هزینه حمل به عهده خریدار</p>
                <p class="pt-1">
                  شناسه محصول:
                  <span class="font-bold text-gray-800">${id}</span>
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
                <p class="text-sm font-bold text-gray-800">رنگ بندی</p>
                <div class="flex items-center justify-center gap-2 pt-1">
                  <span class="w-8 h-8 rounded-full bg-[#C82323] cursor-pointer hover:scale-110 transition-transform"></span>
                  <span class="w-8 h-8 rounded-full bg-[#2E6B12] cursor-pointer hover:scale-110 transition-transform"></span>
                  <span class="w-8 h-8 rounded-full bg-[#4F46E5] cursor-pointer hover:scale-110 transition-transform"></span>
                  <span class="w-8 h-8 rounded-full bg-[#FF5722] cursor-pointer hover:scale-110 transition-transform"></span>
                </div>
              </div>

              <p class="text-xs font-bold text-emerald-600 text-center">موجود در انبار</p>

              <!-- شمارنده تعداد -->
              <div class="flex items-center justify-between border border-red-500 rounded-xl p-1 px-4">
                <button id="qty-minus" class="text-2xl font-bold text-red-600 hover:scale-125 transition-transform">-</button>
                <span id="qty-val" class="font-bold text-base text-black-primary">1</span>
                <button id="qty-plus" class="text-2xl font-bold text-red-600 hover:scale-125 transition-transform">+</button>
              </div>

              <button class="w-full bg-[#C82323] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-md active:scale-95">
                <span>افزودن به سبد خرید</span>
                <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
            </div>

          </div>
        </div>
    `;

    // ۴. تعاملات کامپوننت جزئیات (تغییر عکس اصلی با کلیک روی تامبنیل‌ها و شمارنده تعداد)
    let count = 1;
    const qtyVal = document.getElementById("qty-val");
    const mainImg = document.getElementById("main-product-img");

    document.getElementById("qty-plus")?.addEventListener("click", () => {
      count++;
      qtyVal.textContent = count;
    });

    document.getElementById("qty-minus")?.addEventListener("click", () => {
      if (count > 1) {
        count--;
        qtyVal.textContent = count;
      }
    });

    document.querySelectorAll(".thumb-card img").forEach((thumb) => {
      thumb.addEventListener("click", (e) => {
        mainImg.src = e.target.src;
      });
    });
  }

  // بارگذاری اولیه جزئیات محصول بر اساس URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialProductId = urlParams.get("id");
  if (initialProductId) {
    loadProductDetails(initialProductId);
  }
});
