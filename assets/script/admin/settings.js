import { adminUsersList } from "../data.js";
import { registeredUsers } from "../data.js";
document.addEventListener("DOMContentLoaded", () => {
  // 6. مدیریت بخش تنظیمات حساب ادمین (Admin Settings & Profile)
  // ==========================================================================
  adminUsersList;
  registeredUsers;
  // متغیر جلسه فعلی ادمین
  let currentLoggedInAdmin = null;

  let editingAdminId = null;

  // ۱. مدیریت سوییچ تب‌ها
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      tabButtons.forEach((b) => {
        b.classList.remove("text-purple1", "border-b-2", "border-purple1/50");
        b.classList.add("text-gray-500");
      });
      btn.classList.add("text-purple1", "border-b-2", "border-purple1/50");
      btn.classList.remove("text-gray-500");

      tabContents.forEach((content) => {
        if (content.id === `tab-${targetTab}`) {
          content.classList.remove("hidden");
        } else {
          content.classList.add("hidden");
        }
      });
    });
  });

  // ۲. مقداردهی اولیه اینپوت‌های فرم از روی داده‌های ادمین لاگین شده
  function loadAdminProfileData() {
    if (currentLoggedInAdmin) {
      const adminInfo = currentLoggedInAdmin;

      const fullNameEl = document.getElementById("admin-fullName");
      const phoneEl = document.getElementById("admin-phone");
      const instagramEl = document.getElementById("admin-instagram");
      const telegramEl = document.getElementById("admin-telegram");
      const rubikaEl = document.getElementById("admin-rubika");
      const whatsappEl = document.getElementById("admin-whatsapp");
      const addressEl = document.getElementById("admin-address");

      if (fullNameEl) fullNameEl.value = adminInfo.fullName || "";
      if (phoneEl) phoneEl.value = adminInfo.phone || "";
      if (instagramEl) instagramEl.value = adminInfo.instagram || "";
      if (telegramEl) telegramEl.value = adminInfo.telegram || "";
      if (rubikaEl) rubikaEl.value = adminInfo.rubika || "";
      if (whatsappEl) whatsappEl.value = adminInfo.whatsapp || "";
      if (addressEl) addressEl.value = adminInfo.address || "";
    }
  }

  // ۳. ثبت و ذخیره تغییرات فرم
  const adminProfileForm = document.getElementById("admin-profile-form");

  adminProfileForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!currentLoggedInAdmin) {
      return;
    }

    const updatedData = {
      fullName: document.getElementById("admin-fullName").value.trim(),
      phone: document.getElementById("admin-phone").value.trim(),
      instagram: document.getElementById("admin-instagram").value.trim(),
      telegram: document.getElementById("admin-telegram").value.trim(),
      rubika: document.getElementById("admin-rubika").value.trim(),
      whatsapp: document.getElementById("admin-whatsapp").value.trim(),
      address: document.getElementById("admin-address").value.trim(),
      username: currentLoggedInAdmin.username,
      password: currentLoggedInAdmin.password,
      permissions: currentLoggedInAdmin.permissions,
      status: currentLoggedInAdmin.status,
    };

    // به‌روزرسانی در لیست ادمین‌ها
    const index = adminUsersList.findIndex(
      (a) => a.username === updatedData.username,
    );
    if (index !== -1) {
      adminUsersList[index] = {
        ...adminUsersList[index],
        fullName: updatedData.fullName,
        phone: updatedData.phone,
        instagram: updatedData.instagram,
        telegram: updatedData.telegram,
        rubika: updatedData.rubika,
        whatsapp: updatedData.whatsapp,
        address: updatedData.address,
      };
    }

    // به‌روزرسانی currentLoggedInAdmin
    currentLoggedInAdmin = updatedData;

    console.log("Updated Admin Profile Data:", updatedData);
  });

  // فراخوانی اولیه برای پر کردن فرم
  loadAdminProfileData();

  // ==========================================================================
  // مدیریت تغییر رمز عبور
  // ==========================================================================

  // 1. نمایش/مخفی کردن رمز عبور
  window.togglePasswordVisibility = function (inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";

    const svg = button.querySelector("svg");
    if (svg) {
      if (isPassword) {
        svg.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        `;
      } else {
        svg.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        `;
      }
    }
  };

  // 2. بررسی قدرت رمز عبور
  function checkPasswordStrength(password) {
    let score = 0;
    let level = "ضعیف";
    let color = "bg-red-500";
    let width = "0%";

    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score >= 4) {
      level = "قوی";
      color = "bg-emerald-500";
      width = "100%";
    } else if (score >= 3) {
      level = "متوسط";
      color = "bg-yellow-500";
      width = "70%";
    } else if (score >= 2) {
      level = "ضعیف";
      color = "bg-orange-500";
      width = "40%";
    } else {
      level = "ضعیف";
      color = "bg-red-500";
      width = "20%";
    }

    return { level, color, width };
  }

  // 3. اعتبارسنجی رمز عبور جدید
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const strengthBar = document.getElementById("password-strength-bar");
  const strengthText = document.getElementById("password-strength-text");
  const matchMessage = document.getElementById("password-match-message");
  const submitBtn = document.getElementById("change-password-btn");

  newPasswordInput?.addEventListener("input", function () {
    const password = this.value;
    const result = checkPasswordStrength(password);

    if (strengthBar) {
      strengthBar.className = `h-full ${result.color} transition-all duration-300 rounded-full`;
      strengthBar.style.width = result.width;
    }
    if (strengthText) {
      strengthText.textContent = result.level;
      const colorClass =
        result.color === "bg-red-500"
          ? "text-red-500"
          : result.color === "bg-orange-500"
            ? "text-orange-500"
            : result.color === "bg-yellow-500"
              ? "text-yellow-600"
              : "text-emerald-500";
      strengthText.className = `text-xs font-medium ${colorClass}`;
    }

    checkPasswordMatch();
  });

  confirmPasswordInput?.addEventListener("input", function () {
    checkPasswordMatch();
  });

  function checkPasswordMatch() {
    const newPass = newPasswordInput?.value || "";
    const confirmPass = confirmPasswordInput?.value || "";

    if (!matchMessage) return;

    if (confirmPass.length === 0) {
      matchMessage.classList.add("hidden");
      matchMessage.classList.remove("text-emerald-500", "text-red-500");
      return;
    }

    if (newPass === confirmPass) {
      matchMessage.textContent = "✓ رمز عبور تطابق دارد";
      matchMessage.className = "text-xs font-medium mt-1 text-emerald-500";
      matchMessage.classList.remove("hidden");
    } else {
      matchMessage.textContent = "✗ رمز عبور تطابق ندارد";
      matchMessage.className = "text-xs font-medium mt-1 text-red-500";
      matchMessage.classList.remove("hidden");
    }
  }

  // 4. ارسال فرم تغییر رمز عبور
  const changePasswordForm = document.getElementById("change-password-form");
  const passwordMessage = document.getElementById("password-message");

  changePasswordForm?.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!currentLoggedInAdmin) {
      return;
    }

    const currentPassword =
      document.getElementById("current-password")?.value || "";
    const newPassword = document.getElementById("new-password")?.value || "";
    const confirmPassword =
      document.getElementById("confirm-password")?.value || "";

    // بررسی رمز فعلی
    if (currentPassword !== currentLoggedInAdmin.password) {
      showPasswordMessage("رمز عبور فعلی اشتباه است!", "error");
      return;
    }

    if (newPassword.length < 6) {
      showPasswordMessage("رمز عبور جدید باید حداقل 6 کاراکتر باشد!", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showPasswordMessage("رمز عبور جدید و تکرار آن مطابقت ندارند!", "error");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "در حال ذخیره‌سازی...";
    }

    setTimeout(() => {
      // به‌روزرسانی رمز عبور در لیست ادمین‌ها
      const index = adminUsersList.findIndex(
        (a) => a.username === currentLoggedInAdmin.username,
      );
      if (index !== -1) {
        adminUsersList[index].password = newPassword;
      }

      // به‌روزرسانی currentLoggedInAdmin
      currentLoggedInAdmin.password = newPassword;

      showPasswordMessage("رمز عبور با موفقیت تغییر یافت! ✅", "success");

      this.reset();
      if (strengthBar) {
        strengthBar.style.width = "0%";
        strengthBar.className =
          "h-full bg-red-500 transition-all duration-300 rounded-full";
      }
      if (strengthText) {
        strengthText.textContent = "ضعیف";
        strengthText.className = "text-xs font-medium text-gray-500";
      }
      if (matchMessage) {
        matchMessage.classList.add("hidden");
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "ذخیره تغییرات";
      }
    }, 1500);
  });

  // تابع نمایش پیام (یکبار تعریف شده)
  function showPasswordMessage(text, type) {
    if (!passwordMessage) return;

    passwordMessage.textContent = text;
    passwordMessage.className =
      type === "success"
        ? "p-4 rounded-2xl text-sm font-bold text-right bg-emerald-50 text-emerald-700 border border-emerald-200"
        : "p-4 rounded-2xl text-sm font-bold text-right bg-red-50 text-red-700 border border-red-200";
    passwordMessage.classList.remove("hidden");

    clearTimeout(window.passwordMessageTimeout);
    window.passwordMessageTimeout = setTimeout(() => {
      passwordMessage.classList.add("hidden");
    }, 5000);
  }

  // 8. مدیریت دسترسی ادمین‌ها (Admin Access)
  // ==========================================================================

  // رندر لیست ادمین‌ها
  function renderAdminUsers() {
    const container = document.getElementById("admin-users-list");
    const countText = document.getElementById("admin-count");

    if (!container) return;

    if (adminUsersList.length === 0) {
      container.innerHTML = `
      <div class="text-center py-10 text-gray-400 font-medium">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <p>هیچ ادمینی یافت نشد</p>
      </div>
    `;
      if (countText) countText.textContent = "نمایش ۰ از ۰ ادمین";
      return;
    }

    container.innerHTML = adminUsersList
      .map(
        (admin) => `
    <div class="grid grid-cols-12 gap-2 text-center items-center py-3.5 px-4 hover:bg-gray-50/50 transition-colors whitespace-nowrap">
      
      <!-- نام -->
      <div class="col-span-3 text-right pr-2 font-bold text-black-primary text-sm truncate">
        ${admin.fullName}
      </div>

      <!-- شماره تماس -->
      <div class="col-span-3 text-gray-700 text-sm font-medium dir-ltr">
        ${admin.phone}
      </div>

      <!-- وضعیت -->
      <div class="col-span-2">
        <span class="${admin.status === "فعال" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-700 border-red-200"} px-3 py-1 rounded-full text-xs font-bold border inline-block">
          ${admin.status || "فعال"}
        </span>
      </div>

      <!-- آخرین فعالیت -->
      <div class="col-span-1 text-gray-500 text-xs truncate">
        ${admin.lastActivity || "—"}
      </div>

      <!-- عملیات (بدون شکستن خط) -->
      <div class="col-span-3 flex items-center justify-center gap-2 flex-nowrap">
        <button onclick="openEditAdminModal(${admin.id})" 
                class="bg-yasi text-black-primary text-xs font-bold px-3 py-1.5 rounded-lg hover:brightness-95 transition flex items-center gap-1 cursor-pointer shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span class="whitespace-nowrap">ویرایش اطلاعات</span>
        </button>
        
        <button onclick="deleteAdmin(${admin.id})" 
                class="text-rose-500 hover:text-rose-700 transition cursor-pointer p-1.5 rounded-lg hover:bg-rose-50 shrink-0" 
                title="حذف">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>

    </div>
  `,
      )
      .join("");

    if (countText) {
      countText.textContent = `نمایش ${adminUsersList.length} از ${adminUsersList.length} ادمین`;
    }
  }

  // مودال افزودن ادمین
  window.openAddAdminModal = function () {
    const modal = document.getElementById("add-admin-modal");
    const form = document.getElementById("add-admin-form");
    if (modal) {
      modal.classList.remove("hidden");
      if (form) form.reset();
      const titleEl = document.querySelector("#add-admin-modal h3");
      if (titleEl) titleEl.textContent = "افزودن ادمین جدید";
      const submitBtn = document.querySelector(
        "#add-admin-modal button[type='submit']",
      );
      if (submitBtn) submitBtn.textContent = "افزودن ادمین";
      editingAdminId = null;
    }
  };

  window.closeAddAdminModal = function () {
    const modal = document.getElementById("add-admin-modal");
    if (modal) modal.classList.add("hidden");
    editingAdminId = null;
  };

  // مودال ویرایش ادمین (ساده)
  window.openEditAdminModal = function (id) {
    const admin = adminUsersList.find((a) => a.id === id);
    if (!admin) {
      return;
    }

    editingAdminId = id;
    const modal = document.getElementById("add-admin-modal");
    if (!modal) return;

    document.getElementById("admin-fullname").value = admin.fullName || "";
    document.getElementById("admin-phone-number").value = admin.phone || "";
    document.getElementById("admin-username").value = admin.username || "";
    document.getElementById("admin-password").value = admin.password || "";

    const statusRadios = document.querySelectorAll(
      "input[name='admin-status']",
    );
    statusRadios.forEach((radio) => {
      radio.checked = radio.value === admin.status;
    });

    const titleEl = document.querySelector("#add-admin-modal h3");
    if (titleEl) titleEl.textContent = "ویرایش اطلاعات ادمین";
    const submitBtn = document.querySelector(
      "#add-admin-modal button[type='submit']",
    );
    if (submitBtn) submitBtn.textContent = "ذخیره تغییرات";

    modal.classList.remove("hidden");
  };

  // ارسال فرم افزودن/ویرایش ادمین
  window.handleAddAdminSubmit = function (event) {
    event.preventDefault();

    const fullName = document.getElementById("admin-fullname").value.trim();
    const phone = document.getElementById("admin-phone-number").value.trim();
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value.trim();
    const status =
      document.querySelector("input[name='admin-status']:checked")?.value ||
      "فعال";

    if (!fullName || !phone || !username || !password) {
      return;
    }

    if (password.length < 6) {
      return;
    }

    if (editingAdminId) {
      const index = adminUsersList.findIndex((a) => a.id === editingAdminId);
      if (index !== -1) {
        adminUsersList[index] = {
          ...adminUsersList[index],
          fullName,
          phone,
          username,
          password,
          status,
        };
      }
    } else {
      if (adminUsersList.some((a) => a.username === username)) {
        return;
      }

      const newAdmin = {
        id: Date.now(),
        fullName,
        phone,
        username,
        password,
        status,
        lastActivity:
          new Date().toLocaleDateString("fa-IR") +
          " - " +
          new Date().toLocaleTimeString("fa-IR"),
        permissions: ["dashboard", "orders", "products"],
      };
      adminUsersList.unshift(newAdmin);
    }

    renderAdminUsers();
    closeAddAdminModal();
  };

  // حذف ادمین
  window.deleteAdmin = function (id) {
    if (!confirm("آیا از حذف این ادمین اطمینان دارید؟")) return;

    const index = adminUsersList.findIndex((a) => a.id === id);
    if (index !== -1) {
      adminUsersList.splice(index, 1);
      renderAdminUsers();
    }
  };

  // راه‌اندازی اولیه
  renderAdminUsers();

  // ==========================================================================
  // 9. مدیریت ویرایش اطلاعات ادمین (مودال کامل)
  // ==========================================================================

  let currentEditingAdminId = null;

  // باز کردن مودال ویرایش کامل
  window.openEditAdminModal = function (id) {
    const admin = adminUsersList.find((a) => a.id === id);
    if (!admin) {
      return;
    }

    currentEditingAdminId = id;
    const modal = document.getElementById("edit-admin-modal");
    if (!modal) return;

    // پر کردن اطلاعات شخصی
    document.getElementById("edit-admin-fullname").value = admin.fullName || "";
    document.getElementById("edit-admin-phone").value = admin.phone || "";
    document.getElementById("edit-admin-username").value = admin.username || "";

    // تنظیم وضعیت حساب
    const statusRadios = document.querySelectorAll(
      "input[name='edit-admin-status']",
    );
    statusRadios.forEach((radio) => {
      radio.checked = radio.value === admin.status;
    });

    // تنظیم دسترسی‌ها
    const permissions = admin.permissions || [
      "dashboard",
      "orders",
      "products",
    ];
    const permissionCheckboxes = document.querySelectorAll(
      "input[name='admin-permissions']",
    );
    permissionCheckboxes.forEach((cb) => {
      cb.checked = permissions.includes(cb.value);
    });

    modal.classList.remove("hidden");
  };

  // بستن مودال ویرایش
  window.closeEditAdminModal = function () {
    const modal = document.getElementById("edit-admin-modal");
    if (modal) modal.classList.add("hidden");
    currentEditingAdminId = null;
  };

  // انتخاب همه / لغو همه دسترسی‌ها
  window.selectAllPermissions = function (select) {
    const checkboxes = document.querySelectorAll(
      "input[name='admin-permissions']",
    );
    checkboxes.forEach((cb) => {
      cb.checked = select;
    });
  };

  // ارسال فرم ویرایش ادمین
  window.handleEditAdminSubmit = function (event) {
    event.preventDefault();

    const fullName = document
      .getElementById("edit-admin-fullname")
      .value.trim();
    const phone = document.getElementById("edit-admin-phone").value.trim();
    const status =
      document.querySelector("input[name='edit-admin-status']:checked")
        ?.value || "فعال";

    // دریافت دسترسی‌های انتخاب شده
    const permissions = [];
    document
      .querySelectorAll("input[name='admin-permissions']:checked")
      .forEach((cb) => {
        permissions.push(cb.value);
      });

    // اعتبارسنجی
    if (!fullName || !phone) {
      return;
    }

    // پیدا کردن و به‌روزرسانی ادمین
    const index = adminUsersList.findIndex(
      (a) => a.id === currentEditingAdminId,
    );
    if (index !== -1) {
      adminUsersList[index] = {
        ...adminUsersList[index],
        fullName,
        phone,
        status,
        permissions,
      };
    }

    renderAdminUsers();
    closeEditAdminModal();

    // نمایش پیام موفقیت
    showPasswordMessage(
      "اطلاعات ادمین با موفقیت به‌روزرسانی شد! ✅",
      "success",
    );
  };
});
