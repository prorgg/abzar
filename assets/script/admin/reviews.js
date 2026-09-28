import { fetchWithAuth, BASE_URL } from "../data.js";

document.addEventListener("DOMContentLoaded", () => {
  const reviewsContainer = document.getElementById("reviews-table-rows");

  // فقط اگر این بخش در صفحه فعلی وجود داشت API فراخوانی شود
  if (reviewsContainer) {
    fetchReviews();
  }
});

async function fetchReviews() {
  const reviewsContainer = document.getElementById("reviews-table-rows");
  if (!reviewsContainer) return;

  reviewsContainer.innerHTML = `
    <div class="py-8 text-center text-gray-400 text-sm">
      درحال بارگذاری نظرات...
    </div>
  `;

  try {
    const res = await fetchWithAuth("/reviews", { method: "GET" });
    const reviews = Array.isArray(res) ? res : res?.data || [];

    if (reviews.length === 0) {
      reviewsContainer.innerHTML = `
        <div class="py-8 text-center text-gray-400 text-sm">
          هیچ نظری ثبت نشده است.
        </div>
      `;
      return;
    }

    reviewsContainer.innerHTML = reviews
      .map((item) => renderReviewRow(item))
      .join("");
  } catch (error) {
    console.error("خطا در دریافت نظرات:", error);
    reviewsContainer.innerHTML = `
      <div class="py-8 text-center text-rose-500 text-sm">
        خطا در دریافت لیست نظرات از سرور.
      </div>
    `;
  }
}

function renderReviewRow(item) {
  const id = item.id;
  const commentText = item.comment || item.text || "-";
  const customerName =
    item.user_name || item.user?.name || item.customer || "کاربر عمومی";
  const productName = item.productName || item.product?.name || "محصول نامشخص";
  const productCode =
    item.productCode ||
    item.product?.code ||
    (item.product_id ? `کد: ${item.product_id}` : "-");
  const dateText = item.date || item.created_at || "-";
  const isApproved = item.status === "approved" || item.is_approved === true;

  let imageUrl = item.productImage || item.product?.image;
  let imageMarkup = `
    <div class="w-11 h-11 bg-[#fdf6e7] rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-amber-100">
      <svg class="w-6 h-6 text-[#a88b68]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
    </div>
  `;

  if (imageUrl) {
    if (!imageUrl.startsWith("http")) {
      imageUrl = `${BASE_URL}/${imageUrl.replace(/^\//, "")}`;
    }
    imageMarkup = `<img src="${imageUrl}" alt="${productName}" class="w-11 h-11 object-cover rounded-xl border border-amber-100 shrink-0" />`;
  }

  return `
    <div data-id="${id}" class="grid grid-cols-12 gap-2 text-center items-center py-4 px-4 border-b border-rose-200/60 last:border-0 hover:bg-rose-50/20 transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm">
      <div class="col-span-2 text-right text-gray-800 font-medium px-1 truncate" title="${commentText}">
        ${commentText}
      </div>

      <div class="col-span-3 flex items-center justify-start gap-3 text-right">
        ${imageMarkup}
        <div class="flex flex-col text-right min-w-0">
          <p class="text-gray-900 font-bold text-xs sm:text-sm truncate">${productName}</p>
          <p class="text-gray-500 text-xs mt-0.5 font-medium truncate">${productCode}</p>
        </div>
      </div>

      <div class="col-span-2 text-gray-900 font-bold truncate">
        ${customerName}
      </div>

      <div class="col-span-2 text-gray-900 font-bold truncate">
        ${dateText}
      </div>

      <div class="col-span-3 flex items-center justify-center gap-3 flex-nowrap shrink-0">
        <label class="relative inline-flex items-center cursor-pointer shrink-0" title="تایید یا رد نظر">
          <input type="checkbox" class="sr-only peer" ${isApproved ? "checked" : ""} onchange="approveReview(${id}, this.checked)">
          <div class="w-11 h-6 bg-gray-300 border-2 border-transparent rounded-full peer peer-checked:bg-emerald-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
        </label>

        <button class="text-rose-500 hover:text-rose-700 transition cursor-pointer p-1 shrink-0" onclick="deleteReview(${id}, this)" title="حذف نظر">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    </div>
  `;
}

window.approveReview = async function (id, isChecked = true) {
  try {
    await fetchWithAuth("/reviews", {
      method: "POST",
      body: JSON.stringify({
        id,
        status: isChecked ? "approved" : "pending",
      }),
    });
  } catch (err) {
    window.showAppNotice("خطا در تغییر وضعیت نظر: " + (err.message || "خطای سرور"));
    fetchReviews();
  }
};

window.deleteReview = async function (id, buttonEl = null) {
  if (!(await window.showAppConfirm("آیا از حذف این نظر اطمینان دارید؟"))) return;

  try {
    await fetchWithAuth("/reviews", {
      method: "POST",
      body: JSON.stringify({ action: "delete", id }),
    });

    if (buttonEl) {
      const row = buttonEl.closest("div.grid");
      if (row) {
        row.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        row.style.opacity = "0";
        row.style.transform = "scale(0.97)";
        setTimeout(() => row.remove(), 300);
      }
    } else {
      fetchReviews();
    }
  } catch (err) {
    window.showAppNotice("خطا در حذف نظر: " + (err.message || "خطای سرور"));
  }
};
