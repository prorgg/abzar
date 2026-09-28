import { fetchWithAuth } from "../data.js";

const form = document.getElementById("collection-form");
const list = document.getElementById("collections-list");
const parentSelect = document.getElementById("collection-parent");
const cancelButton = document.getElementById("collection-cancel");
const refreshButton = document.getElementById("collection-refresh");
const message = document.getElementById("collection-message");
const iconFileInput = document.getElementById("collection-icon-file");
const iconName = document.getElementById("collection-icon-name");
const editModal = document.getElementById("collection-edit-modal");
const editForm = document.getElementById("collection-edit-form");
const editCloseButton = document.getElementById("collection-edit-close");
const editCancelButton = document.getElementById("collection-edit-cancel");
const editMessage = document.getElementById("collection-edit-message");
const editIconFileInput = document.getElementById("collection-edit-icon-file");
const editIconName = document.getElementById("collection-edit-icon-name");

let categories = [];
let selectedIconFile = null;
let selectedEditIconFile = null;

function flattenCategories(items, level = 0, result = []) {
  items.forEach((item) => {
    result.push({ ...item, level });
    if (Array.isArray(item.children))
      flattenCategories(item.children, level + 1, result);
  });
  return result;
}

function showMessage(text, isError = false) {
  if (!message) return;
  message.textContent = text;
  message.classList.remove("hidden", "text-red-600", "text-green-600");
  message.classList.add(isError ? "text-red-600" : "text-green-600");
}

function resetForm() {
  form?.reset();
  selectedIconFile = null;
  if (iconName) iconName.textContent = "";
  const idInput = document.getElementById("collection-id");
  const title = document.getElementById("collection-form-title");
  if (idInput) idInput.value = "";
  if (title) title.textContent = "افزودن دسته‌بندی";
  cancelButton?.classList.add("hidden");
  if (message) message.classList.add("hidden");
}

function renderParentOptions(excludeId = "") {
  if (!parentSelect) return;
  parentSelect.value = parentSelect.value || "";
}

function renderCategories() {
  if (!list) return;
  const flat = flattenCategories(categories);
  if (!flat.length) {
    list.innerHTML =
      '<p class="text-sm text-gray-main text-center py-6">دسته‌بندی‌ای ثبت نشده است.</p>';
    return;
  }

  list.innerHTML = flat
    .map(
      (category) => `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-200 rounded-xl p-4" data-category-row="${category.id}">
      <div style="padding-right:${category.level * 18}px">
        <p class="font-bold text-black-primary">${escapeHtml(category.name || category.title || "بدون نام")}</p>
        <p class="text-xs text-gray-main mt-1" dir="ltr">${escapeHtml(category.slug || "بدون اسلاگ")}</p>
        ${category.description ? `<p class="text-xs text-gray-main mt-1">${escapeHtml(category.description)}</p>` : ""}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" data-edit-category="${category.id}" class="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">ویرایش</button>
        <button type="button" data-delete-category="${category.id}" class="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold">حذف</button>
      </div>
    </div>
  `,
    )
    .join("");

  list.querySelectorAll("[data-edit-category]").forEach((button) => {
    button.addEventListener("click", () =>
      startEdit(button.dataset.editCategory),
    );
  });
  list.querySelectorAll("[data-delete-category]").forEach((button) => {
    button.addEventListener("click", () =>
      deleteCategory(button.dataset.deleteCategory),
    );
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCategoriesFromResponse(response) {
  const payload = response?.data ?? response?.categories ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function loadCategories() {
  if (!list) return;
  try {
    const response = await fetchWithAuth("/categories");
    if (response?.status === false) {
      throw new Error(response.message || "دریافت دسته‌بندی‌ها ناموفق بود");
    }
    categories = getCategoriesFromResponse(response);
    renderParentOptions();
    renderCategories();
  } catch (error) {
    list.innerHTML = `<p class="text-sm text-red-600 text-center py-6">${escapeHtml(error.message || "دریافت دسته‌بندی‌ها ناموفق بود")}</p>`;
  }
}

function startEdit(id) {
  const category = flattenCategories(categories).find(
    (item) => String(item.id) === String(id),
  );
  if (!category) return;
  document.getElementById("collection-edit-id").value = category.id;
  document.getElementById("collection-edit-name").value =
    category.name || category.title || "";
  document.getElementById("collection-edit-slug").value = category.slug || "";
  document.getElementById("collection-edit-description").value =
    category.description || "";
  document.getElementById("collection-edit-icon").value =
    category.icon || category.image || "";
  selectedEditIconFile = null;
  if (editIconName) {
    editIconName.textContent = category.icon || category.image
      ? `آیکن فعلی: ${category.icon || category.image}`
      : "";
  }
  document.getElementById("collection-edit-parent").value = category.parent_id || "";
  if (editMessage) editMessage.classList.add("hidden");
  editModal?.classList.remove("hidden");
  document.getElementById("collection-edit-name")?.focus();
}

function closeEditModal() {
  editModal?.classList.add("hidden");
  editForm?.reset();
  selectedEditIconFile = null;
  if (editIconName) editIconName.textContent = "";
  if (editMessage) editMessage.classList.add("hidden");
}

function getIconPath(file) {
  return `../assets/images/categories/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

function getParentValue(value) {
  const parentValue = String(value || "").trim();
  if (!parentValue) return null;
  if (/^\d+$/.test(parentValue)) return Number(parentValue);

  const parentCategory = flattenCategories(categories).find(
    (category) =>
      String(category.name || category.title || "").trim().toLowerCase() ===
      parentValue.toLowerCase(),
  );
  return parentCategory ? Number(parentCategory.id) : undefined;
}

function hasDuplicateSlug(slug, currentId = "") {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  return flattenCategories(categories).some(
    (category) =>
      String(category.slug || "").trim().toLowerCase() === normalizedSlug &&
      String(category.id) !== String(currentId),
  );
}

async function deleteCategory(id) {
  if (!(await window.showAppConfirm("آیا از حذف این دسته‌بندی و زیرمجموعه‌های آن مطمئن هستید؟"))) return;
  try {
    const response = await fetchWithAuth("/categories", {
      method: "DELETE",
      body: JSON.stringify({ id: Number(id) }),
    });
    if (response?.status === false)
      throw new Error(response.message || "حذف انجام نشد");
    resetForm();
    await loadCategories();
    showMessage("دسته‌بندی با موفقیت حذف شد.");
  } catch (error) {
    showMessage(error.message || "حذف دسته‌بندی ناموفق بود.", true);
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.getElementById("collection-id")?.value;
  const name = document.getElementById("collection-name")?.value.trim() || "";
  const slug = document.getElementById("collection-slug")?.value.trim() || "";
  if (hasDuplicateSlug(slug)) {
    showMessage("این آدرس دسته‌بندی قبلاً استفاده شده است؛ یک اسلاگ دیگر وارد کنید.", true);
    return;
  }
  const parentInput = parentSelect?.value || "";
  const parentId = getParentValue(parentInput);
  if (String(parentInput).trim() && parentId === undefined) {
    showMessage("دسته والد پیدا نشد؛ نام دقیق یا شناسه عددی آن را وارد کنید.", true);
    return;
  }
  const iconPath = selectedIconFile
    ? getIconPath(selectedIconFile)
    : document.getElementById("collection-icon")?.value.trim() || "";
  const payload = {
    name,
    slug: slug || `collection-${Date.now()}`,
    parent_id: parentId,
    description:
      document.getElementById("collection-description")?.value.trim() || "",
    icon: iconPath,
  };

  try {
    const response = await fetchWithAuth("/categories", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(id ? { ...payload, id: Number(id) } : payload),
    });
    if (response?.status === false)
      throw new Error(response.message || "ذخیره انجام نشد");
    resetForm();
    await loadCategories();
    showMessage(id ? "دسته‌بندی ویرایش شد." : "دسته‌بندی ایجاد شد.");
  } catch (error) {
    showMessage(error.message || "ذخیره دسته‌بندی ناموفق بود.", true);
  }
});

editForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.getElementById("collection-edit-id")?.value;
  const editSlug = document.getElementById("collection-edit-slug")?.value.trim() || "";
  if (hasDuplicateSlug(editSlug, id)) {
    if (editMessage) {
      editMessage.textContent = "این آدرس دسته‌بندی قبلاً استفاده شده است؛ یک اسلاگ دیگر وارد کنید.";
      editMessage.classList.remove("hidden", "text-green-600");
      editMessage.classList.add("text-red-600");
    }
    return;
  }
  const parentInput = document.getElementById("collection-edit-parent")?.value || "";
  const parentId = getParentValue(parentInput);
  if (String(parentInput).trim() && parentId === undefined) {
    if (editMessage) {
      editMessage.textContent = "دسته والد پیدا نشد؛ نام دقیق یا شناسه عددی آن را وارد کنید.";
      editMessage.classList.remove("hidden", "text-green-600");
      editMessage.classList.add("text-red-600");
    }
    return;
  }
  const payload = {
    id: Number(id),
    name: document.getElementById("collection-edit-name")?.value.trim() || "",
    slug: editSlug,
    parent_id: parentId,
    description: document.getElementById("collection-edit-description")?.value.trim() || "",
    icon: selectedEditIconFile
      ? getIconPath(selectedEditIconFile)
      : document.getElementById("collection-edit-icon")?.value.trim() || "",
  };

  try {
    const response = await fetchWithAuth("/categories", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (response?.status === false) {
      throw new Error(response.message || "ویرایش انجام نشد");
    }
    closeEditModal();
    await loadCategories();
    showMessage("دسته‌بندی با موفقیت ویرایش شد.");
  } catch (error) {
    if (editMessage) {
      editMessage.textContent = error.message || "ویرایش دسته‌بندی ناموفق بود.";
      editMessage.classList.remove("hidden", "text-green-600");
      editMessage.classList.add("text-red-600");
    }
  }
});

cancelButton?.addEventListener("click", resetForm);
editCloseButton?.addEventListener("click", closeEditModal);
editCancelButton?.addEventListener("click", closeEditModal);
refreshButton?.addEventListener("click", loadCategories);

iconFileInput?.addEventListener("change", () => {
  const file = iconFileInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    iconFileInput.value = "";
    showMessage("لطفاً یک فایل تصویری انتخاب کنید.", true);
    return;
  }
  if (file.size > 6 * 1024 * 1024) {
    iconFileInput.value = "";
    showMessage("حجم تصویر نباید بیشتر از 6 مگابایت باشد.", true);
    return;
  }
  selectedIconFile = file;
  if (iconName) iconName.textContent = `تصویر انتخاب‌شده: ${file.name}`;
  const iconPathInput = document.getElementById("collection-icon");
  if (iconPathInput) {
    iconPathInput.value = getIconPath(file);
  }
});

editIconFileInput?.addEventListener("change", () => {
  const file = editIconFileInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    editIconFileInput.value = "";
    if (editMessage) {
      editMessage.textContent = "لطفاً یک فایل تصویری انتخاب کنید.";
      editMessage.classList.remove("hidden");
      editMessage.classList.add("text-red-600");
    }
    return;
  }
  if (file.size > 6 * 1024 * 1024) {
    editIconFileInput.value = "";
    if (editMessage) {
      editMessage.textContent = "حجم تصویر نباید بیشتر از 6 مگابایت باشد.";
      editMessage.classList.remove("hidden");
      editMessage.classList.add("text-red-600");
    }
    return;
  }
  selectedEditIconFile = file;
  if (editIconName) editIconName.textContent = `تصویر انتخاب‌شده: ${file.name}`;
  const iconPathInput = document.getElementById("collection-edit-icon");
  if (iconPathInput) iconPathInput.value = getIconPath(file);
});

loadCategories();
