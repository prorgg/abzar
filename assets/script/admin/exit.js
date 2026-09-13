document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------------------------------------------------
  // مدیریت مودال خروج و ثبت خروج ادمین
  // ----------------------------------------------------------------------
  const logoutModal = document.getElementById("logout-modal");
  const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
  const cancelLogoutBtn = document.getElementById("cancel-logout-btn");
  const exitBtn = document.getElementById("exit"); // دکمه خروج در سایدبار

  // تابع نمایش مودال خروج
  function showLogoutModal() {
    if (!logoutModal) return;
    logoutModal.classList.remove("hidden");
    setTimeout(() => logoutModal.classList.remove("opacity-0"), 10);
  }

  // تابع مخفی کردن مودال خروج
  function hideLogoutModal() {
    if (!logoutModal) return;
    logoutModal.classList.add("opacity-0");
    setTimeout(() => logoutModal.classList.add("hidden"), 300);
  }

  // کلیک روی گزینه خروج در سایدبار برای باز شدن مودال
  exitBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    showLogoutModal();
  });

  // دکمه انصراف از خروج
  cancelLogoutBtn?.addEventListener("click", hideLogoutModal);

  // دکمه تایید خروج
  confirmLogoutBtn?.addEventListener("click", () => {
    // پاک کردن داده‌های ذخیره‌شده ادمین
    localStorage.removeItem("currentLoggedInAdmin");
    sessionStorage.removeItem("currentLoggedInAdmin");

    // هدایت به صفحه اصلی یا لاگین
    window.location.href = "../index.html";
  });
});
