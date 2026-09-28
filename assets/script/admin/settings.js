import { fetchWithAuth } from "../data.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ==========================================================================
  // مدیریت بخش تنظیمات حساب ادمین (Admin Settings & Profile)
  // ==========================================================================
    if (
      typeof window.hasAdminPermission === "function" &&
      !window.hasAdminPermission("settings")
    ) {
      return;
    }

  let currentLoggedInAdmin = null;
  let adminUsersList = [];
  let editingAdminId = null;
  let currentEditingAdminId = null;

  function normalizeAdminRecord(admin = {}) {
    const id = admin.id ?? admin.admin_id ?? admin.user_id ?? admin._id ?? null;
    const name =
      admin.name ||
      admin.full_name ||
      admin.fullName ||
      admin.display_name ||
      "بدون نام";
    const mobile =
      admin.mobile ||
      admin.phone ||
      admin.phone_number ||
      admin.contact_mobile ||
      "";
    const email =
      admin.email || admin.username || admin.user_name || admin.login || "";
    const username = admin.username || admin.user_name || admin.email || "";
    const isActive =
      admin.is_active !== undefined
        ? Boolean(admin.is_active)
        : admin.status !== "غیرفعال" && admin.status !== "inactive";
    const permissions = Array.isArray(admin.permissions)
      ? admin.permissions
      : Array.isArray(admin.permission)
        ? admin.permission
        : [];

    return {
      ...admin,
      id,
      name,
      fullName: name,
      mobile,
      phone: mobile,
      email,
      username,
      user_name: username,
      is_active: isActive,
      status: isActive ? "فعال" : "غیرفعال",
      permissions,
      permission: permissions,
    };
  }

  function extractAdminListPayload(res) {
    if (Array.isArray(res)) return res.map(normalizeAdminRecord);
    if (Array.isArray(res?.data)) return res.data.map(normalizeAdminRecord);
    if (Array.isArray(res?.admins)) return res.admins.map(normalizeAdminRecord);
    if (Array.isArray(res?.admin_users))
      return res.admin_users.map(normalizeAdminRecord);
    if (Array.isArray(res?.users)) return res.users.map(normalizeAdminRecord);
    if (res && typeof res === "object") {
      const maybeList = [
        res.data,
        res.admins,
        res.admin_users,
        res.users,
        res.result,
      ].find(Array.isArray);
      if (maybeList) return maybeList.map(normalizeAdminRecord);
    }
    return [];
  }

  // وضعیت صفحه‌بندی (Pagination)
  let currentPage = 1;
  const itemsPerPage = 5;

  // 1. مدیریت سوییچ تب‌ها
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

  // 2. دریافت و بارگذاری پروفایل ادمین فعلی از API
  async function loadAdminProfileData() {
    try {
      const res = await fetchWithAuth("/admin-users?profile=true");
      const profileData =
        res?.data || res?.user || res?.profile || res?.admin || res || {};

      if (profileData && typeof profileData === "object") {
        currentLoggedInAdmin = profileData;

        const fullNameEl = document.getElementById("admin-fullName");
        const phoneEl = document.getElementById("admin-phone");
        const instagramEl = document.getElementById("admin-instagram");
        const telegramEl = document.getElementById("admin-telegram");
        const rubikaEl = document.getElementById("admin-rubika");
        const whatsappEl = document.getElementById("admin-whatsapp");
        const addressEl = document.getElementById("admin-address");

        if (fullNameEl)
          fullNameEl.value =
            profileData.name ||
            profileData.full_name ||
            profileData.fullName ||
            "";
        if (phoneEl)
          phoneEl.value =
            profileData.mobile ||
            profileData.phone ||
            profileData.phone_number ||
            "";
        if (instagramEl) instagramEl.value = profileData.instagram || "";
        if (telegramEl) telegramEl.value = profileData.telegram || "";
        if (rubikaEl) rubikaEl.value = profileData.rubika || "";
        if (whatsappEl) whatsappEl.value = profileData.whatsapp || "";
        if (addressEl) addressEl.value = profileData.address || "";
      }
    } catch (err) {
      console.error("خطا در دریافت اطلاعات پروفایل:", err.message);
    }
  }

  // 3. ثبت و ذخیره تغییرات فرم پروفایل
  const adminProfileForm = document.getElementById("admin-profile-form");

  adminProfileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById("admin-fullName")?.value.trim(),
      mobile: document.getElementById("admin-phone")?.value.trim(),
      email: currentLoggedInAdmin?.email || "",
      instagram: document.getElementById("admin-instagram")?.value.trim(),
      telegram: document.getElementById("admin-telegram")?.value.trim(),
      rubika: document.getElementById("admin-rubika")?.value.trim(),
      whatsapp: document.getElementById("admin-whatsapp")?.value.trim(),
      address: document.getElementById("admin-address")?.value.trim(),
    };

    try {
      const res = await fetchWithAuth("/admin-users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showPasswordMessage("پروفایل با موفقیت بروزرسانی شد! ✅", "success");
      await loadAdminProfileData();
    } catch (err) {
      showPasswordMessage(err.message || "خطا در بروزرسانی پروفایل", "error");
    }
  });

  // ==========================================================================
  // مدیریت تغییر رمز عبور
  // ==========================================================================

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

  confirmPasswordInput?.addEventListener("input", checkPasswordMatch);

  function checkPasswordMatch() {
    const newPass = newPasswordInput?.value || "";
    const confirmPass = confirmPasswordInput?.value || "";

    if (!matchMessage) return;

    if (confirmPass.length === 0) {
      matchMessage.classList.add("hidden");
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

  const changePasswordForm = document.getElementById("change-password-form");
  const passwordMessage = document.getElementById("password-message");

  changePasswordForm?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const currentPassword =
      document.getElementById("current-password")?.value || "";
    const newPassword = document.getElementById("new-password")?.value || "";
    const confirmPassword =
      document.getElementById("confirm-password")?.value || "";

    if (!currentPassword) {
      showPasswordMessage("رمز عبور فعلی را وارد کنید!", "error");
      return;
    }

    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      showPasswordMessage(
        "رمز عبور باید حداقل 8 کاراکتر و شامل حروف بزرگ، کوچک و عدد باشد!",
        "error",
      );
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

    try {
      await fetchWithAuth("/admin-users", {
        method: "POST",
        body: JSON.stringify({
          change_password: true,
          old_password: currentPassword,
          new_password: newPassword,
        }),
      });

      showPasswordMessage("رمز عبور با موفقیت تغییر یافت! ✅", "success");

      this.reset();
      if (strengthBar) strengthBar.style.width = "0%";
      if (matchMessage) matchMessage.classList.add("hidden");
    } catch (err) {
      showPasswordMessage(err.message || "خطا در تغییر رمز عبور!", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "ذخیره تغییرات";
      }
    }
  });

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

  // ==========================================================================
  // مدیریت دسترسی ادمین‌ها (Admin Access List)
  // ==========================================================================

  async function fetchAdminUsers() {
    try {
      let storedPermissions = {};
      try {
        storedPermissions = JSON.parse(
          localStorage.getItem("admin_permissions_cache") || "{}",
        );
      } catch {
        storedPermissions = {};
      }
      const previousPermissions = new Map(
        adminUsersList
          .filter((admin) => Array.isArray(admin.permissions))
          .map((admin) => [Number(admin.id), admin.permissions]),
      );
      const res = await fetchWithAuth("/admin-users");
      adminUsersList = extractAdminListPayload(res);
      adminUsersList = adminUsersList.map((admin) => {
        if (
          !Array.isArray(admin.permissions) ||
          admin.permissions.length === 0
        ) {
          const savedPermissions =
            previousPermissions.get(Number(admin.id)) ||
            storedPermissions[String(admin.id)];
          if (savedPermissions) {
            return {
              ...admin,
              permissions: savedPermissions,
              permission: savedPermissions,
            };
          }
        }
        return admin;
      });
      if (adminUsersList.length === 0 && res && typeof res === "object") {
        const singleAdmin = normalizeAdminRecord(res);
        if (singleAdmin.id || singleAdmin.name || singleAdmin.email) {
          adminUsersList = [singleAdmin];
        }
      }
      currentPage = 1;
      renderAdminUsers();
    } catch (err) {
      console.error("خطا در دریافت لیست ادمین‌ها:", err.message);
      adminUsersList = [];
      renderAdminUsers();
    }
  }

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
      if (countText) countText.textContent = "نمایش 0 از 0 ادمین";
      renderPaginationControls(0);
      return;
    }

    const totalPages = Math.ceil(adminUsersList.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = adminUsersList.slice(startIndex, endIndex);

    container.innerHTML = currentItems
      .map((admin) => {
        const normalizedAdmin = normalizeAdminRecord(admin);
        const adminName = normalizedAdmin.name || "بدون نام";
        const adminPhone =
          normalizedAdmin.mobile || normalizedAdmin.phone || "—";
        const activeLabel = normalizedAdmin.is_active ? "فعال" : "غیرفعال";
        const activeClass = normalizedAdmin.is_active
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-red-100 text-red-700 border-red-200";
        const permissionLabels = normalizedAdmin.permissions.length
          ? normalizedAdmin.permissions.join("، ")
          : "ثبت نشده";

        return `
    <div class="grid grid-cols-12 gap-2 text-center items-center py-3.5 px-4 hover:bg-gray-50/50 transition-colors whitespace-nowrap border-b border-gray-100 last:border-0">
      <div class="col-span-3 text-right pr-2 font-bold text-black-primary text-sm truncate">
        ${adminName}
      </div>

      <div class="col-span-3 text-gray-700 text-sm font-medium dir-ltr">
        ${adminPhone}
      </div>

      <div class="col-span-2">
        <span class="${activeClass} px-3 py-1 rounded-full text-xs font-bold border inline-block">
          ${activeLabel}
        </span>
      </div>

      <div class="col-span-1 text-gray-500 text-xs truncate" title="${permissionLabels}">
        ${permissionLabels}
      </div>

      <div class="col-span-3 flex items-center justify-center gap-2 flex-nowrap">
        <button data-admin-id="${normalizedAdmin.id ?? ""}" data-action="edit-admin" 
                class="js-edit-admin-btn bg-yasi text-black-primary text-xs font-bold px-3 py-1.5 rounded-lg hover:brightness-95 transition flex items-center gap-1 cursor-pointer shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span class="whitespace-nowrap">ویرایش اطلاعات</span>
        </button>

        <button data-admin-id="${normalizedAdmin.id ?? ""}" data-action="delete-admin" 
                class="js-delete-admin-btn text-rose-500 hover:text-rose-700 transition cursor-pointer p-1.5 rounded-lg hover:bg-rose-50 shrink-0" 
                title="حذف">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    </div>`;
      })
      .join("");

    if (countText) {
      countText.textContent = `نمایش ${startIndex + 1} تا ${Math.min(endIndex, adminUsersList.length)} از ${adminUsersList.length} ادمین`;
    }

    renderPaginationControls(totalPages);
  }

  // رندر دکمه‌های صفحه‌بندی
  function renderPaginationControls(totalPages) {
    let paginationContainer = document.getElementById("admin-pagination");

    if (!paginationContainer) {
      paginationContainer = document.createElement("div");
      paginationContainer.id = "admin-pagination";
      paginationContainer.className =
        "flex items-center justify-center gap-2 mt-4 dir-rtl";
      const parent = document.getElementById("admin-users-list")?.parentElement;
      if (parent) parent.appendChild(paginationContainer);
    }

    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }

    let buttonsHTML = `
      <button onclick="changeAdminPage(${currentPage - 1})" 
              ${currentPage === 1 ? "disabled" : ""} 
              class="px-3 py-1.5 rounded-lg border text-xs font-bold transition ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-black-primary hover:bg-purple1 hover:text-white cursor-pointer"}">
        قبلی
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      buttonsHTML += `
        <button onclick="changeAdminPage(${i})" 
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${i === currentPage ? "bg-purple1 text-white" : "bg-white border text-black-primary hover:bg-gray-100"}">
          ${i}
        </button>
      `;
    }

    buttonsHTML += `
      <button onclick="changeAdminPage(${currentPage + 1})" 
              ${currentPage === totalPages ? "disabled" : ""} 
              class="px-3 py-1.5 rounded-lg border text-xs font-bold transition ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-black-primary hover:bg-purple1 hover:text-white cursor-pointer"}">
        بعدی
      </button>
    `;

    paginationContainer.innerHTML = buttonsHTML;
  }

  // تغییر صفحه
  window.changeAdminPage = function (page) {
    const totalPages = Math.ceil(adminUsersList.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      renderAdminUsers();
    }
  };

  // مودال افزودن ادمین
  window.openAddAdminModal = function () {
    const modal = document.getElementById("add-admin-modal");
    const form = document.getElementById("add-admin-form");
    if (modal) {
      modal.classList.remove("hidden");
      if (form) form.reset();
      editingAdminId = null;
    }
  };

  window.closeAddAdminModal = function () {
    const modal = document.getElementById("add-admin-modal");
    if (modal) modal.classList.add("hidden");
    editingAdminId = null;
  };

  // ارسال فرم افزودن ادمین جدید
  window.handleAddAdminSubmit = async function (event) {
    event.preventDefault();

    const name = document.getElementById("admin-fullname")?.value.trim();
    const mobile = document.getElementById("admin-phone-number")?.value.trim();
    const email = document.getElementById("admin-username")?.value.trim();
    const password = document.getElementById("admin-password")?.value.trim();
    const submitButton = event.currentTarget?.querySelector("button[type='submit']");
    const status = document.querySelector("input[name='admin-status']:checked")?.value;
    const isActive = status !== "غیرفعال";

    if (!name || !mobile || !email || !password) {
      window.showAppNotice("لطفا تمامی فیلدها را پر کنید.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      window.showAppNotice("لطفاً یک ایمیل معتبر وارد کنید؛ مثال: admin@shop.com");
      return;
    }

    try {
      if (submitButton) submitButton.disabled = true;
      const payload = {
        add_admin: true,
        name,
        mobile,
        email,
        password,
        permissions: ["dashboard", "orders", "products"],
        is_active: isActive,
      };

      const response = await fetchWithAuth("/admin-users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      let finalResponse = response;
      if (response?.status === false && !response?.authRequired) {
        const formData = new FormData();
        formData.append("add_admin", "1");
        formData.append("name", name);
        formData.append("mobile", mobile);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("permissions", JSON.stringify(payload.permissions));
        formData.append("is_active", isActive ? "1" : "0");

        finalResponse = await fetchWithAuth("/admin-users", {
          method: "POST",
          body: formData,
        });
      }
      if (finalResponse?.status === false || finalResponse?.authRequired) {
        throw new Error(finalResponse.message || "افزودن ادمین انجام نشد.");
      }

      closeAddAdminModal();
      await fetchAdminUsers();
      showPasswordMessage("ادمین جدید با موفقیت افزوده شد! ✅", "success");
    } catch (err) {
      window.showAppNotice(err.message || "خطا در افزودن ادمین");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  };

  // حذف ادمین
  window.deleteAdmin = async function (id) {
    if (!(await window.showAppConfirm("آیا از حذف این ادمین اطمینان دارید؟"))) return;

    try {
      await fetchWithAuth("/admin-users", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });

      await fetchAdminUsers();
      showPasswordMessage("ادمین با موفقیت حذف شد! ✅", "success");
    } catch (err) {
      window.showAppNotice(err.message || "خطا در حذف ادمین");
    }
  };

  // ==========================================================================
  // مدیریت ویرایش کامل ادمین و دسترسی‌ها
  // ==========================================================================

  function buildAdminUpdatePayload(formData) {
    return {
      update_permissions: true,
      admin_id: currentEditingAdminId,
      permissions: formData.permissions,
      is_active: formData.isActive,
    };
  }

  async function submitAdminUpdateRequest(payload) {
    const response = await fetchWithAuth("/admin-users", {
      method: "POST",
      body: payload,
    });

    if (response?.status === false || response?.authRequired) {
      throw new Error(response.message || "خطا در بروزرسانی دسترسی ادمین");
    }

    return response;
  }

  window.openEditAdminModal = function (id) {
    const admin = adminUsersList.find((a) => Number(a.id) === Number(id));
    if (!admin) return;

    currentEditingAdminId = Number(id);
    const modal = document.getElementById("edit-admin-modal");
    if (!modal) return;

    const normalizedAdmin = normalizeAdminRecord(admin);
    const nameInput = document.getElementById("edit-admin-fullname");
    const phoneInput = document.getElementById("edit-admin-phone");
    const usernameInput = document.getElementById("edit-admin-username");

    if (nameInput) nameInput.value = normalizedAdmin.name || "";
    if (phoneInput) phoneInput.value = normalizedAdmin.mobile || "";
    if (usernameInput) {
      usernameInput.value =
        normalizedAdmin.email || normalizedAdmin.username || "";
    }

    const statusRadios = document.querySelectorAll(
      "input[name='edit-admin-status']",
    );
    statusRadios.forEach((radio) => {
      radio.checked = Boolean(normalizedAdmin.is_active)
        ? radio.value === "فعال"
        : radio.value === "غیرفعال";
    });

    const permissions = normalizedAdmin.permissions.length
      ? normalizedAdmin.permissions
      : ["dashboard", "orders", "products"];
    const permissionCheckboxes = document.querySelectorAll(
      "input[name='admin-permissions']",
    );
    permissionCheckboxes.forEach((cb) => {
      cb.checked = permissions.includes(cb.value);
    });

    modal.classList.remove("hidden");
  };

  window.closeEditAdminModal = function () {
    const modal = document.getElementById("edit-admin-modal");
    if (modal) modal.classList.add("hidden");
    currentEditingAdminId = null;
  };

  window.selectAllPermissions = function (select) {
    const checkboxes = document.querySelectorAll(
      "input[name='admin-permissions']",
    );
    checkboxes.forEach((cb) => {
      cb.checked = select;
    });
  };

  window.handleEditAdminSubmit = async function (event) {
    event.preventDefault();

    const name = document.getElementById("edit-admin-fullname")?.value.trim();
    const mobile = document.getElementById("edit-admin-phone")?.value.trim();
    const email = document.getElementById("edit-admin-username")?.value.trim();

    if (!currentEditingAdminId) {
      window.showAppNotice("هیچ ادمینی برای ویرایش انتخاب نشده است.");
      return;
    }

    if (!name || !mobile || !email) {
      window.showAppNotice("لطفاً نام، شماره تماس و ایمیل/نام کاربری را وارد کنید.");
      return;
    }

    const statusVal = document.querySelector(
      "input[name='edit-admin-status']:checked",
    )?.value;
    const isActive = statusVal === "فعال";

    const permissions = [];
    document
      .querySelectorAll("input[name='admin-permissions']:checked")
      .forEach((cb) => {
        permissions.push(cb.value);
      });

    const payload = buildAdminUpdatePayload({ isActive, permissions });

    try {
      await submitAdminUpdateRequest(payload);
      const updatedAdmin = adminUsersList.find(
        (admin) => Number(admin.id) === Number(currentEditingAdminId),
      );
      if (updatedAdmin) {
        updatedAdmin.permissions = permissions;
        updatedAdmin.permission = permissions;
        updatedAdmin.is_active = isActive;
      }
      try {
        const permissionsCache = JSON.parse(
          localStorage.getItem("admin_permissions_cache") || "{}",
        );
        permissionsCache[String(currentEditingAdminId)] = permissions;
        localStorage.setItem(
          "admin_permissions_cache",
          JSON.stringify(permissionsCache),
        );
      } catch {
        // The server update already succeeded; UI cache is best effort.
      }
      closeEditAdminModal();
      await fetchAdminUsers();
      showPasswordMessage(
        "اطلاعات ادمین با موفقیت به‌روزرسانی شد! ✅",
        "success",
      );
    } catch (err) {
      window.showAppNotice(err.message || "خطا در بروزرسانی اطلاعات ادمین");
    }
  };

  document
    .getElementById("close-edit-admin-modal-btn")
    ?.addEventListener("click", () => {
      closeEditAdminModal();
    });

  document
    .getElementById("cancel-edit-admin-modal-btn")
    ?.addEventListener("click", () => {
      closeEditAdminModal();
    });

  document
    .getElementById("edit-admin-form")
    ?.addEventListener("submit", (event) => {
      handleEditAdminSubmit(event);
    });

  const adminUsersContainer = document.getElementById("admin-users-list");
  adminUsersContainer?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const adminId = Number(button.getAttribute("data-admin-id"));
    const action = button.getAttribute("data-action");

    if (action === "edit-admin") {
      openEditAdminModal(adminId);
    }

    if (action === "delete-admin") {
      deleteAdmin(adminId);
    }
  });

  // بارگذاری اولیه داده‌ها
  await loadAdminProfileData();
  await fetchAdminUsers();
});
