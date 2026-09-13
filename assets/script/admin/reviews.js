import { reviewsData } from "../data.js";
document.addEventListener("DOMContentLoaded", () => {
  // ۴. مدیریت بخش نظرات مشتریان در ادمین
  // ----------------------------------------------------------------------
  const reviewsTableContainer = document.getElementById("table-rows");
  reviewsData;
  if (reviewsTableContainer) {
    function renderReviewRow(item) {
      return `<div class="grid grid-cols-12 gap-2 text-center items-center py-4 px-4 border-b border-rose-200/60 last:border-0 hover:bg-rose-50/20 transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm">
  
  <!-- نظر -->
  <div class="col-span-2 text-right text-gray-800 font-medium px-1 truncate">
    ${item.comment}
  </div>

  <!-- محصول -->
  <div class="col-span-3 flex items-center justify-start gap-3 text-right">
    <div class="w-11 h-11 bg-[#fdf6e7] rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-amber-100">
      <svg class="w-6 h-6 text-[#a88b68]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
    </div>
    <div class="flex flex-col text-right min-w-0">
      <p class="text-gray-900 font-bold text-xs sm:text-sm truncate">${item.productName}</p>
      <p class="text-gray-500 text-xs mt-0.5 font-medium truncate">${item.productCode}</p>
    </div>
  </div>

  <!-- مشتری -->
  <div class="col-span-2 text-gray-900 font-bold truncate">
    ${item.customer}
  </div>

  <!-- تاریخ -->
  <div class="col-span-2 text-gray-900 font-bold truncate">
    ${item.date}
  </div>

  <!-- عملیات -->
  <div class="col-span-3 flex items-center justify-center gap-3 flex-nowrap shrink-0">
    <label class="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" class="sr-only peer" checked>
      <div class="w-11 h-6 bg-white border-2 border-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:bg-emerald-500 after:content-[''] after:absolute after:top-[3px] after:right-[19px] after:bg-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:border-emerald-500"></div>
    </label>

    <button class="text-rose-500 hover:text-rose-700 transition cursor-pointer p-1 shrink-0" onclick="window.deleteReviewRow(this)" title="حذف نظر">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </button>
  </div>

</div>`;
    }

    window.deleteReviewRow = function (button) {
      const row = button.closest("div.grid");
      if (row) {
        row.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        row.style.opacity = "0";
        row.style.transform = "scale(0.97)";
        setTimeout(() => row.remove(), 300);
      }
    };

    reviewsTableContainer.innerHTML = reviewsData.map(renderReviewRow).join("");
  }
});
