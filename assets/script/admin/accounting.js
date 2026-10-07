import {
  fetchWithAuth,
  incomeData,
  expenseData,
  transactionsData,
  accountingProductsData,
  setIncomeData,
  setExpenseData,
  setTransactionsData,
  setAccountingProductsData,
} from "../data.js";

function parseCurrencyToNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = value
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const sanitized = normalized.replace(/[^0-9.-]/g, "");
    return Number(sanitized || 0);
  }
  return 0;
}

function formatCurrency(value) {
  return parseCurrencyToNumber(value).toLocaleString("en-US");
}

function getAccountingItemAmount(item) {
  return (
    item?.amount ??
    item?.income_amount ??
    item?.expense_amount ??
    item?.value ??
    item?.total ??
    item?.price ??
    item?.income ??
    item?.expense ??
    item?.cost ??
    0
  );
}

function sumAccountingItems(items) {
  return items.reduce((total, item) => {
    return total + parseCurrencyToNumber(getAccountingItemAmount(item));
  }, 0);
}

function normalizeTransactionDate(value) {
  return String(value || "")
    .trim()
    .replace(/[\/]/g, "-");
}

function normalizeAccountingItem(item, type) {
  const amount = parseCurrencyToNumber(getAccountingItemAmount(item));
  const date = item?.transaction_date || item?.date || item?.created_at || "-";
  return {
    ...item,
    type: item?.type || type,
    title: item?.title || item?.description || "-",
    amount: `${formatCurrency(amount)} تومان`,
    date,
    transaction_date: item?.transaction_date || date,
  };
}

function ensureAccountingApiSuccess(response) {
  if (!response || response.status === false) {
    const error = new Error(
      response?.authRequired
        ? "برای ثبت اطلاعات، ابتدا وارد حساب مدیریت شوید."
        : response?.message || "ذخیره اطلاعات حسابداری در سرور ناموفق بود.",
    );
    error.authRequired = Boolean(response?.authRequired);
    error.status = response?.statusCode || (response?.authRequired ? 401 : undefined);
    throw error;
  }
  return response;
}

async function accountingRequest(method, payload) {
  const response = await fetchWithAuth("/accounting", {
    method,
    body: JSON.stringify(payload),
  });
  return ensureAccountingApiSuccess(response);
}

function getAccountingResponseItem(response, fallback) {
  const value = response?.data || response?.transaction || response?.result;
  return Array.isArray(value) ? fallback : value || fallback;
}

function refreshAccountingSummary() {
  if (typeof window.refreshAccountingSummary === "function") {
    window.refreshAccountingSummary();
  }
}

function getAccountingItemId(item) {
  return item?.id ?? item?.transaction_id ?? item?.accounting_id;
}

async function deleteAccountingItem(item) {
  const id = getAccountingItemId(item);
  if (id == null) throw new Error("شناسه رکورد برای حذف وجود ندارد.");
  await accountingRequest("DELETE", { id });
}

function isIncomeType(type) {
  return type === "income" || type === "درآمد";
}

function normalizeAccountingType(type, fallback = "expense") {
  return isIncomeType(type) ? "income" : type === "expense" || type === "هزینه" ? "expense" : fallback;
}

function updateTransactionCopy(previousItem, nextItem) {
  const itemId = getAccountingItemId(previousItem);
  const transactionIndex = transactionsData.findIndex(
    (transaction) => itemId != null && getAccountingItemId(transaction) === itemId,
  );

  if (transactionIndex >= 0) {
    transactionsData[transactionIndex] = nextItem;
  }
}

function removeTransactionCopy(item) {
  const itemId = getAccountingItemId(item);
  const transactionIndex = transactionsData.findIndex(
    (transaction) => itemId != null && getAccountingItemId(transaction) === itemId,
  );

  if (transactionIndex >= 0) transactionsData.splice(transactionIndex, 1);
}

function splitTransactionsByType(items) {
  return {
    income: items
      .filter((item) => isIncomeType(item.type))
      .map((item) => normalizeAccountingItem(item, "income")),
    expense: items
      .filter((item) => !isIncomeType(item.type))
      .map((item) => normalizeAccountingItem(item, "expense")),
  };
}

window.openIncomeModal = function () {
  const modal = document.getElementById("add-income-modal");
  if (modal) modal.classList.remove("hidden");
};

window.closeIncomeModal = function () {
  const modal = document.getElementById("add-income-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("add-income-form");
  if (form) form.reset();
};

window.openExpenseModal = function () {
  const modal = document.getElementById("add-expense-modal");
  if (modal) modal.classList.remove("hidden");
};

window.closeExpenseModal = function () {
  const modal = document.getElementById("add-expense-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("add-expense-form");
  if (form) form.reset();
};

window.openEditIncomeModal = function (index) {
  const modal = document.getElementById("edit-income-modal");
  const item = incomeData[index];
  if (!modal || !item) return;

  document.getElementById("edit-income-title").value = item.title || "";
  document.getElementById("edit-income-amount").value = item.amount || "";
  document.getElementById("edit-income-date").value = item.date || "";
  modal.dataset.index = String(index);
  modal.classList.remove("hidden");
};

window.closeEditIncomeModal = function () {
  const modal = document.getElementById("edit-income-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("edit-income-form");
  if (form) form.reset();
  delete modal?.dataset.index;
};

window.openEditExpenseModal = function (index) {
  const modal = document.getElementById("edit-expense-modal");
  const item = expenseData[index];
  if (!modal || !item) return;

  document.getElementById("edit-expense-title").value = item.title || "";
  document.getElementById("edit-expense-amount").value = item.amount || "";
  document.getElementById("edit-expense-date").value = item.date || "";
  modal.dataset.index = String(index);
  modal.classList.remove("hidden");
};

window.closeEditExpenseModal = function () {
  const modal = document.getElementById("edit-expense-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("edit-expense-form");
  if (form) form.reset();
  delete modal?.dataset.index;
};

window.openEditTransactionModal = function (index) {
  const modal = document.getElementById("edit-transaction-modal");
  const item = transactionsData[index];
  if (!modal || !item) return;

  const typeField = document.getElementById("edit-transaction-type");
  if (typeField) {
    const value = item.type === "expense" || item.type === "هزینه" ? "هزینه" : "درآمد";
    typeField.value = value;
  }

  const titleField = document.getElementById("edit-transaction-title");
  const amountField = document.getElementById("edit-transaction-amount");
  const dateField = document.getElementById("edit-transaction-date");

  if (titleField) titleField.value = item.title || item.description || "";
  if (amountField) amountField.value = item.amount || "";
  if (dateField) dateField.value = item.transaction_date || item.date || "";

  modal.dataset.index = String(index);
  modal.classList.remove("hidden");
};

window.closeEditTransactionModal = function () {
  const modal = document.getElementById("edit-transaction-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("edit-transaction-form");
  if (form) form.reset();
  delete modal?.dataset.index;
};

window.handleEditIncomeSubmit = async function (event) {
  event.preventDefault();
  const modal = document.getElementById("edit-income-modal");
  const index = Number(modal?.dataset.index ?? -1);
  const item = incomeData[index];
  if (!item) return;

  const payload = {
    id: getAccountingItemId(item),
    type: "income",
    title: document.getElementById("edit-income-title")?.value.trim(),
    amount: parseCurrencyToNumber(document.getElementById("edit-income-amount")?.value || "0"),
    transaction_date: document.getElementById("edit-income-date")?.value.trim(),
  };

  try {
    const response = await accountingRequest("PUT", payload);
    const savedItem = getAccountingResponseItem(response, payload);
    const incomeItem = normalizeAccountingItem(
      { ...item, ...payload, ...savedItem, type: "income" },
      "income",
    );
    incomeData[index] = incomeItem;
    updateTransactionCopy(item, incomeItem);
  } catch (error) {
    window.showAppNotice(`درآمد ویرایش نشد: ${error.message}`);
    return;
  }

  window.renderAllIncome();
  renderAllTransactions();
  refreshAccountingSummary();
  window.closeEditIncomeModal();
};

window.handleEditExpenseSubmit = async function (event) {
  event.preventDefault();
  const modal = document.getElementById("edit-expense-modal");
  const index = Number(modal?.dataset.index ?? -1);
  const item = expenseData[index];
  if (!item) return;

  const payload = {
    id: getAccountingItemId(item),
    type: "expense",
    title: document.getElementById("edit-expense-title")?.value.trim(),
    amount: parseCurrencyToNumber(document.getElementById("edit-expense-amount")?.value || "0"),
    transaction_date: document.getElementById("edit-expense-date")?.value.trim(),
  };

  try {
    const response = await accountingRequest("PUT", payload);
    const savedItem = getAccountingResponseItem(response, payload);
    const expenseItem = normalizeAccountingItem(
      { ...item, ...payload, ...savedItem, type: "expense" },
      "expense",
    );
    expenseData[index] = expenseItem;
    updateTransactionCopy(item, expenseItem);
  } catch (error) {
    window.showAppNotice(`هزینه ویرایش نشد: ${error.message}`);
    return;
  }

  window.renderAllExpense();
  renderAllTransactions();
  refreshAccountingSummary();
  window.closeEditExpenseModal();
};

window.handleEditTransactionSubmit = async function (event) {
  event.preventDefault();
  const modal = document.getElementById("edit-transaction-modal");
  const index = Number(modal?.dataset.index ?? -1);
  const item = transactionsData[index];
  if (!item) return;

  const type = document.getElementById("edit-transaction-type")?.value === "هزینه" ? "expense" : "income";
  const payload = {
    id: getAccountingItemId(item),
    type,
    title: document.getElementById("edit-transaction-title")?.value.trim(),
    amount: parseCurrencyToNumber(document.getElementById("edit-transaction-amount")?.value || "0"),
    transaction_date: document.getElementById("edit-transaction-date")?.value.trim(),
  };

  try {
    const response = await accountingRequest("PUT", payload);
    const savedItem = getAccountingResponseItem(response, payload);
    const transactionItem = normalizeAccountingItem(
      { ...item, ...payload, ...savedItem, type },
      type,
    );
    transactionsData[index] = transactionItem;
    const previousList = isIncomeType(item.type) ? incomeData : expenseData;
    const previousIndex = previousList.findIndex((sourceItem) => sourceItem.id === item.id);
    if (previousIndex >= 0) {
      if (isIncomeType(item.type) !== isIncomeType(type)) {
        previousList.splice(previousIndex, 1);
      } else {
        previousList[previousIndex] = transactionItem;
      }
    }

    if (isIncomeType(type) !== isIncomeType(item.type)) {
      const nextList = isIncomeType(type) ? incomeData : expenseData;
      nextList.unshift(transactionItem);
    }
  } catch (error) {
    window.showAppNotice(`تراکنش ویرایش نشد: ${error.message}`);
    return;
  }

  renderAllTransactions();
  if (type === "income") window.renderAllIncome();
  if (type === "expense") window.renderAllExpense();
  refreshAccountingSummary();
  window.closeEditTransactionModal();
};

// مدیریت ویوها
window.showTotalIncomeDetails = function () {
  const mainView = document.getElementById("accounting-main-view");
  const incomeView = document.getElementById("income-details-view");
  const expenseView = document.getElementById("expense-details-view");

  if (typeof window.renderAllIncome === "function") window.renderAllIncome();

  if (mainView) mainView.classList.add("hidden");
  if (expenseView) expenseView.classList.add("hidden");
  if (incomeView) incomeView.classList.remove("hidden");
};

window.showTotalExpenseDetails = function () {
  const mainView = document.getElementById("accounting-main-view");
  const incomeView = document.getElementById("income-details-view");
  const expenseView = document.getElementById("expense-details-view");

  if (typeof window.renderAllExpense === "function") window.renderAllExpense();

  if (mainView) mainView.classList.add("hidden");
  if (incomeView) incomeView.classList.add("hidden");
  if (expenseView) expenseView.classList.remove("hidden");
};

window.showAccountingMain = function () {
  const mainView = document.getElementById("accounting-main-view");
  const incomeView = document.getElementById("income-details-view");
  const expenseView = document.getElementById("expense-details-view");

  if (mainView) mainView.classList.remove("hidden");
  if (incomeView) incomeView.classList.add("hidden");
  if (expenseView) expenseView.classList.add("hidden");
};

document.addEventListener("DOMContentLoaded", async () => {
  if (
    typeof window.hasAdminPermission === "function" &&
    !window.hasAdminPermission("accounting")
  ) {
    return;
  }

  // 1. دریافت آمار کلی و لیست‌ها از API
  await fetchAccountingData();

  function fetchAccountingSummary() {
    const totalIncomeEl = document.getElementById("total-income");
    const totalExpensesEl = document.getElementById("total-expenses");
    const netProfitEl = document.getElementById("net-profit");
    const incomeDetailsTotalEl = document.getElementById("income-details-total");
    const expenseDetailsTotalEl = document.getElementById("expense-details-total");

    const totalIncome = sumAccountingItems(incomeData);
    const totalExpenses = sumAccountingItems(expenseData);
    const netProfit = totalIncome - totalExpenses;

    if (totalIncomeEl) totalIncomeEl.innerText = formatCurrency(totalIncome);
    if (totalExpensesEl) totalExpensesEl.innerText = formatCurrency(totalExpenses);
    if (netProfitEl) netProfitEl.innerText = formatCurrency(netProfit);
    if (incomeDetailsTotalEl)
      incomeDetailsTotalEl.innerText = formatCurrency(totalIncome);
    if (expenseDetailsTotalEl)
      expenseDetailsTotalEl.innerText = formatCurrency(totalExpenses);
  }

  fetchAccountingSummary();

  async function fetchAccountingData() {
    try {
      const res = ensureAccountingApiSuccess(
        await fetchWithAuth("/accounting", { method: "GET" }),
      );
      const data = res?.data || res || {};

      const responseItems = Array.isArray(data) ? data : [];
      const incomeList = Array.isArray(data.income) ? data.income : Array.isArray(data.incomes) ? data.incomes : [];
      const expenseList = Array.isArray(data.expenses) ? data.expenses : Array.isArray(data.expense) ? data.expense : [];
      const itemList = Array.isArray(data.items) ? data.items : responseItems;
      const transactionList = Array.isArray(data.transactions)
        ? data.transactions
        : Array.isArray(data.transaction)
          ? data.transaction
          : itemList.filter((item) => item.type === "income" || item.type === "expense" || item.type === "درآمد" || item.type === "هزینه");
      const productList = Array.isArray(data.products)
        ? data.products
        : itemList.filter((item) => item.productName || item.product_name || item.productCode || item.product_code);

      const normalizedTransactions = transactionList.map((item) => ({
        ...item,
        type: normalizeAccountingType(item.type),
      }));
      setTransactionsData(normalizedTransactions);
      const splitLists = splitTransactionsByType(normalizedTransactions);
      setIncomeData(incomeList.length ? incomeList.map((item) => normalizeAccountingItem(item, "income")) : splitLists.income);
      setExpenseData(expenseList.length ? expenseList.map((item) => normalizeAccountingItem(item, "expense")) : splitLists.expense);
      if (productList.length) setAccountingProductsData(productList);
    } catch (err) {
      setIncomeData([]);
      setExpenseData([]);
      setTransactionsData([]);
      setAccountingProductsData([]);
      console.warn(
        err?.authRequired || err?.status === 401
          ? "حسابداری نیاز به ورود مدیر دارد."
          : "عدم دریافت اطلاعات حسابداری از API.",
        err,
      );
    } finally {
      renderProducts();
      renderAllTransactions();
      if (typeof window.renderAllIncome === "function")
        window.renderAllIncome();
      if (typeof window.renderAllExpense === "function")
        window.renderAllExpense();
    }
  }

  window.refreshAccountingSummary = fetchAccountingSummary;
  window.reloadAccountingData = fetchAccountingData;

  // 2. رندر محصولات
  function renderProducts() {
    const productsContainer = document.getElementById("products-container");
    if (productsContainer && Array.isArray(accountingProductsData)) {
      productsContainer.innerHTML = accountingProductsData
        .map(
          (item, index) => `
      <div class="grid grid-cols-12 gap-3 text-center items-center py-4 px-3 border-b border-gray-200 last:border-0 whitespace-nowrap">
        <div class="col-span-2 text-black-primary text-[13px] leading-relaxed px-1 truncate text-right">
          ${item.comment || "-"}
        </div>
        <div class="col-span-3 flex items-center gap-3 text-right">
          <div class="w-10 h-10 bg-yasi rounded-lg flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-gray-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 17l6-6 4 4 8-8"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 7h7v7"></path>
            </svg>
          </div>
          <div class="flex flex-col min-w-0">
            <p class="text-black-primary font-bold text-sm truncate">${item.productName || "-"}</p>
            <p class="text-gray-main text-xs mt-0.5 truncate">${item.productCode || "-"}</p>
          </div>
        </div>
        <div class="col-span-2 text-black-primary font-bold text-sm truncate">
          ${item.customer || "-"}
        </div>
        <div class="col-span-2 text-black-primary font-bold text-sm truncate">
          ${item.date || "-"}
        </div>
        <div class="col-span-3 flex items-center justify-center gap-4 flex-nowrap shrink-0">
          <button class="text-rose-500 hover:opacity-80 transition cursor-pointer p-1 shrink-0" onclick="window.deleteProductRow(this, ${index})" title="حذف">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>`,
        )
        .join("");
    }
  }

  window.deleteProductRow = async function (button, index) {
    const item = accountingProductsData[index];
    if (!item) return;

    try {
      await deleteAccountingItem(item);
    } catch (error) {
      window.showAppNotice(`رکورد محصول حذف نشد: ${error.message}`);
      return;
    }

    accountingProductsData.splice(index, 1);
    renderProducts();
  };

  // 3. تراکنش‌ها
  let editingTransactionIndex = null;

  function renderTransactionRow(item, index) {
    const isIncome = item.type === "income" || item.type === "درآمد";
    const typeLabel = isIncome ? "درآمد" : "هزینه";
    const badgeClass = isIncome
      ? "text-emerald-600 bg-emerald-50"
      : "text-rose-500 bg-rose-50";

    const displayAmount = `${formatCurrency(item.amount)} تومان`;

    return `<div class="grid grid-cols-12 gap-2 text-center items-center py-3.5 px-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors whitespace-nowrap text-xs sm:text-sm">
      <div class="col-span-2">
        <span class="${badgeClass} px-2.5 py-1 rounded-full font-bold inline-block">${typeLabel}</span>
      </div>
      <div class="col-span-3 text-blackPrimary font-bold truncate px-1 text-right pr-2">
        ${item.title || item.description || "-"}
      </div>
      <div class="col-span-3 text-blackPrimary font-bold dir-ltr">
        ${displayAmount}
      </div>
      <div class="col-span-2 text-gray-500 font-medium">
        ${item.transaction_date || item.date || "-"}
      </div>
      <div class="col-span-2 flex items-center justify-center gap-2 flex-nowrap shrink-0">
        <button class="text-rose-500 hover:text-rose-700 transition cursor-pointer p-1 shrink-0" onclick="window.deleteTransactionRow(this, ${index})" title="حذف">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>`;
  }

  function renderAllTransactions() {
    const container =
      document.getElementById("transactions-list") ||
      document.getElementById("transactions-container") ||
      document.getElementById("transactions-table-body");

    if (container && Array.isArray(transactionsData)) {
      if (transactionsData.length === 0) {
        container.innerHTML =
          '<div class="text-center py-4 text-gray-400">هیچ تراکنشی یافت نشد.</div>';
        return;
      }
      container.innerHTML = transactionsData.map(renderTransactionRow).join("");
    }
  }

  window.deleteTransactionRow = async function (button, index) {
    const item = transactionsData[index];
    if (!item) return;

    try {
      await deleteAccountingItem(item);
    } catch (error) {
      window.showAppNotice(`تراکنش حذف نشد: ${error.message}`);
      return;
    }

    transactionsData.splice(index, 1);
    const sourceList = isIncomeType(item.type) ? incomeData : expenseData;
    const itemId = getAccountingItemId(item);
    const sourceIndex = sourceList.findIndex(
      (sourceItem) => itemId != null && getAccountingItemId(sourceItem) === itemId,
    );
    if (sourceIndex >= 0) sourceList.splice(sourceIndex, 1);
    renderAllTransactions();
    if (isIncomeType(item.type)) window.renderAllIncome();
    if (!isIncomeType(item.type)) window.renderAllExpense();
    refreshAccountingSummary();
  };

  // 4. بخش درآمدها
  function renderIncomeRow(item, index) {
    return `<div class="grid grid-cols-12 gap-2 text-center items-center py-3.5 px-4 hover:bg-rose-50/20 transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm">
      <div class="col-span-2 text-emerald-500 font-bold truncate">درآمد</div>
      <div class="col-span-2 text-gray-900 font-bold truncate text-right pr-2">${item.title}</div>
      <div class="col-span-3 text-gray-900 font-bold truncate dir-ltr">${item.amount}</div>
      <div class="col-span-2 text-gray-900 font-bold truncate">${item.date}</div>
      <div class="col-span-3 flex items-center justify-center gap-2 flex-nowrap shrink-0">
        <button onclick="window.deleteIncomeRow(this, ${index})" class="text-purple1 hover:text-purple1/60 transition cursor-pointer p-1 shrink-0" title="حذف">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>`;
  }

  window.renderAllIncome = function () {
    const container = document.getElementById("income-table-rows");
    if (container && Array.isArray(incomeData)) {
      container.innerHTML = incomeData.length
        ? incomeData.map(renderIncomeRow).join("")
        : '<div class="text-center py-4 text-gray-400">هیچ درآمدی یافت نشد.</div>';
    }
  };

  window.deleteIncomeRow = async function (button, index) {
    const item = incomeData[index];
    if (!item) return;

    try {
      await deleteAccountingItem(item);
    } catch (error) {
      window.showAppNotice(`درآمد حذف نشد: ${error.message}`);
      return;
    }

    incomeData.splice(index, 1);
    removeTransactionCopy(item);
    window.renderAllIncome();
    renderAllTransactions();
    refreshAccountingSummary();
  };

  window.handleIncomeSubmit = async function (event) {
    event.preventDefault();
    const titleInput = document.getElementById("income-title");
    const amountInput = document.getElementById("income-amount");
    const dateInput = document.getElementById("income-date");

    if (!titleInput || !amountInput || !dateInput) return;

    const payload = {
      type: "income",
      title: titleInput.value.trim(),
      amount: parseCurrencyToNumber(amountInput.value),
      transaction_date: normalizeTransactionDate(dateInput.value),
    };

    let savedItem = payload;
    try {
      const response = await accountingRequest("POST", payload);
      savedItem = ensureAccountingApiSuccess(response);
      savedItem = savedItem?.data || savedItem?.transaction || savedItem;
    } catch (error) {
      console.error("ذخیره درآمد در API ناموفق بود:", error);
      window.showAppNotice(`درآمد ذخیره نشد: ${error.message}`);
      return;
    }

    if (typeof window.reloadAccountingData === "function") {
      await window.reloadAccountingData();
    } else {
      const incomeItem = normalizeAccountingItem(
        { ...payload, ...savedItem, type: "income" },
        "income",
      );
      incomeData.unshift(incomeItem);
      transactionsData.unshift(incomeItem);
      window.renderAllIncome();
      renderAllTransactions();
    }
    refreshAccountingSummary();
    window.closeIncomeModal();
  };

  // 5. بخش هزینه‌ها
  function renderExpenseRow(item, index) {
    return `<div class="grid grid-cols-12 gap-2 text-center items-center py-3.5 px-4 hover:bg-rose-50/20 transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm">
      <div class="col-span-2 text-purple1 font-bold truncate">هزینه</div>
      <div class="col-span-2 text-gray-900 font-bold truncate text-right pr-2">${item.title}</div>
      <div class="col-span-3 text-gray-900 font-bold truncate dir-ltr">${item.amount}</div>
      <div class="col-span-2 text-gray-900 font-bold truncate">${item.date}</div>
      <div class="col-span-3 flex items-center justify-center gap-2 flex-nowrap shrink-0">
        <button onclick="window.deleteExpenseRow(this, ${index})" class="text-purple1 hover:text-purple1/60 transition cursor-pointer p-1 shrink-0" title="حذف">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>`;
  }

  window.renderAllExpense = function () {
    const container = document.getElementById("expense-table-rows");
    if (container && Array.isArray(expenseData)) {
      container.innerHTML = expenseData.length
        ? expenseData.map(renderExpenseRow).join("")
        : '<div class="text-center py-4 text-gray-400">هیچ هزینه‌ای یافت نشد.</div>';
    }
  };

  window.deleteExpenseRow = async function (button, index) {
    const item = expenseData[index];
    if (!item) return;

    try {
      await deleteAccountingItem(item);
    } catch (error) {
      window.showAppNotice(`هزینه حذف نشد: ${error.message}`);
      return;
    }

    expenseData.splice(index, 1);
    removeTransactionCopy(item);
    window.renderAllExpense();
    renderAllTransactions();
    refreshAccountingSummary();
  };

  window.handleExpenseSubmit = async function (event) {
    event.preventDefault();
    const titleInput = document.getElementById("expense-title");
    const amountInput = document.getElementById("expense-amount");
    const dateInput = document.getElementById("expense-date");

    if (!titleInput || !amountInput || !dateInput) return;

    const payload = {
      type: "expense",
      title: titleInput.value.trim(),
      description: titleInput.value.trim(),
      amount: parseCurrencyToNumber(amountInput.value),
      transaction_date: normalizeTransactionDate(dateInput.value),
    };

    let savedItem = payload;
    try {
      const response = await accountingRequest("POST", payload);
      savedItem = ensureAccountingApiSuccess(response);
      savedItem = savedItem?.data || savedItem?.transaction || savedItem;
    } catch (error) {
      console.error("ذخیره هزینه در API ناموفق بود:", error);
      window.showAppNotice(`هزینه ذخیره نشد: ${error.message}`);
      return;
    }

    if (typeof window.reloadAccountingData === "function") {
      await window.reloadAccountingData();
    } else {
      const expenseItem = normalizeAccountingItem(
        { ...payload, ...savedItem, type: "expense" },
        "expense",
      );
      expenseData.unshift(expenseItem);
      transactionsData.unshift(expenseItem);
      window.renderAllExpense();
      renderAllTransactions();
    }
    refreshAccountingSummary();
    window.closeExpenseModal();
  };

  // رندر اولیه
  renderProducts();
  renderAllTransactions();
});
