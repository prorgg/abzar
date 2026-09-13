import { accountingProductsData } from "../data.js";
import { transactionsData } from "../data.js";
import { incomeData } from "../data.js";
import { expenseData } from "../data.js";
document.addEventListener("DOMContentLoaded", () => {
  // ۵. مدیریت بخش حسابداری، تراکنش‌ها، درآمدها و هزینه‌ها در ادمین
  // ----------------------------------------------------------------------
  const productsContainer = document.getElementById("products-container");
  if (productsContainer) {
    accountingProductsData;
    productsContainer.innerHTML = accountingProductsData
      .map(
        (item) => `
    <div class="grid grid-cols-12 gap-3 text-center items-center py-4 px-3 border-b border-gray-200 last:border-0 whitespace-nowrap">
      
      <!-- نظر (توضیحات) -->
      <div class="col-span-2 text-black-primary text-[13px] leading-relaxed px-1 truncate text-right">
        ${item.comment}
      </div>

      <!-- اطلاعات محصول -->
      <div class="col-span-3 flex items-center gap-3 text-right">
        <div class="w-10 h-10 bg-yasi rounded-lg flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-gray-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 17l6-6 4 4 8-8"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 7h7v7"></path>
          </svg>
        </div>
        <div class="flex flex-col min-w-0">
          <p class="text-black-primary font-bold text-sm truncate">${item.productName}</p>
          <p class="text-gray-main text-xs mt-0.5 truncate">${item.productCode}</p>
        </div>
      </div>

      <!-- مشتری -->
      <div class="col-span-2 text-black-primary font-bold text-sm truncate">
        ${item.customer}
      </div>

      <!-- تاریخ -->
      <div class="col-span-2 text-black-primary font-bold text-sm truncate">
        ${item.date}
      </div>

      <!-- عملیات (حذف و وضعیت) -->
      <div class="col-span-3 flex items-center justify-center gap-4 flex-nowrap shrink-0">
        <button class="text-rose-500 hover:opacity-80 transition cursor-pointer p-1 shrink-0" onclick="window.deleteProductRow(this)" title="حذف">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>

        <label class="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" class="sr-only peer" checked>
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
        </label>
      </div>

    </div>
  `,
      )
      .join("");

    window.deleteProductRow = function (button) {
      const row = button.closest("div.grid");
      if (row) {
        row.style.transition = "opacity 0.3s ease";
        row.style.opacity = "0";
        setTimeout(() => row.remove(), 300);
      }
    };
  }
  transactionsData;
  let editingTransactionIndex = null;

  function renderTransactionRow(item, index) {
    return `<div class="grid grid-cols-12 gap-2 text-center items-center py-3.5 px-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors whitespace-nowrap text-xs sm:text-sm">
  
  <!-- نوع -->
  <div class="col-span-2">
    <span class="${item.typeColor} font-bold inline-block">${item.type}</span>
  </div>

  <!-- عنوان -->
  <div class="col-span-3 text-blackPrimary font-bold truncate px-1 text-right pr-2">
    ${item.title}
  </div>

  <!-- مبلغ -->
  <div class="col-span-3 text-blackPrimary font-bold dir-ltr">
    ${item.amount}
  </div>

  <!-- تاریخ -->
  <div class="col-span-2 text-gray-500 font-medium">
    ${item.date}
  </div>

  <!-- عملیات -->
  <div class="col-span-2 flex items-center justify-center gap-2 flex-nowrap shrink-0">
    <button onclick="window.openEditTransactionModal(${index})" 
            class="bg-[#f2e2ce] text-blackPrimary text-xs font-bold px-2.5 py-1.5 rounded-lg hover:brightness-95 transition flex items-center gap-1 cursor-pointer shrink-0" 
            title="ویرایش">
      <i class="fa-regular fa-pen-to-square"></i>
      <span>ویرایش اطلاعات</span>
    </button>

    <button class="text-rose-500 hover:text-rose-700 transition cursor-pointer p-1 shrink-0" 
            onclick="window.deleteTransactionRow(this, ${index})" 
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
  }

  function renderAllTransactions() {
    const transactionsContainer =
      document.getElementById("transactions-list") ||
      document.getElementById("transactions-container") ||
      document.getElementById("transactions-table-body") ||
      document.querySelector(".transactions-list");

    if (transactionsContainer) {
      transactionsContainer.innerHTML = transactionsData
        .map(renderTransactionRow)
        .join("");
    }
  }
  renderAllTransactions();

  window.deleteTransactionRow = function (button, index) {
    const row = button.closest("div.grid");
    if (row) {
      row.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      row.style.opacity = "0";
      row.style.transform = "scale(0.98)";
      setTimeout(() => {
        transactionsData.splice(index, 1);
        renderAllTransactions();
      }, 300);
    }
  };

  window.openEditTransactionModal = function (index) {
    editingTransactionIndex = index;
    const item = transactionsData[index];
    const modal = document.getElementById("edit-transaction-modal");

    if (item && modal) {
      document.getElementById("edit-transaction-type").value = item.type;
      document.getElementById("edit-transaction-title").value = item.title;
      document.getElementById("edit-transaction-amount").value =
        item.amount.replace(" تومان", "");
      document.getElementById("edit-transaction-date").value = item.date;
      modal.classList.remove("hidden");
    }
  };

  window.closeEditTransactionModal = function () {
    const modal = document.getElementById("edit-transaction-modal");
    if (modal) modal.classList.add("hidden");
    editingTransactionIndex = null;
  };

  window.handleEditTransactionSubmit = function (event) {
    event.preventDefault();
    if (editingTransactionIndex === null) return;

    const type = document.getElementById("edit-transaction-type").value;
    const title = document
      .getElementById("edit-transaction-title")
      .value.trim();
    let amount = document
      .getElementById("edit-transaction-amount")
      .value.trim();
    const date = document.getElementById("edit-transaction-date").value.trim();

    if (!amount.includes("تومان")) amount += " تومان";

    const typeColor =
      type === "درآمد"
        ? "text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"
        : "text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full";

    transactionsData[editingTransactionIndex] = {
      ...transactionsData[editingTransactionIndex],
      type,
      typeColor,
      title,
      amount,
      date,
    };

    renderAllTransactions();
    closeEditTransactionModal();
  };

  let editingIncomeIndex = null;

  function renderIncomeRow(item, index) {
    return `<div class="grid grid-cols-12 gap-2 text-center items-center py-3.5 px-4 hover:bg-rose-50/20 transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm">
  
  <!-- نوع -->
  <div class="col-span-2 text-emerald-500 font-bold truncate">
    ${item.type}
  </div>

  <!-- عنوان -->
  <div class="col-span-2 text-gray-900 font-bold truncate text-right pr-2">
    ${item.title}
  </div>

  <!-- مبلغ -->
  <div class="col-span-3 text-gray-900 font-bold truncate dir-ltr">
    ${item.amount}
  </div>

  <!-- تاریخ -->
  <div class="col-span-2 text-gray-900 font-bold truncate">
    ${item.date}
  </div>

  <!-- عملیات -->
  <div class="col-span-3 flex items-center justify-center gap-2 flex-nowrap shrink-0">
    <button onclick="window.openEditIncomeModal(${index})" 
            class="bg-yasi text-gray-800 hover:bg-yasi/40 text-xs font-bold py-1.5 px-3 rounded-full border border-yasi/40 shadow-sm flex items-center gap-1.5 transition cursor-pointer shrink-0">
      <svg class="w-3.5 h-3.5 text-gray-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      <span class="whitespace-nowrap">ویرایش اطلاعات</span>
    </button>

    <button onclick="window.deleteIncomeRow(this, ${index})" 
            class="text-purple1 hover:text-purple1/60 transition cursor-pointer p-1 shrink-0" 
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
  }
  incomeData;
  function renderAllIncome() {
    const container = document.getElementById("income-table-rows");
    if (container) {
      container.innerHTML = incomeData.map(renderIncomeRow).join("");
    }
  }

  window.showTotalIncomeDetails = function () {
    const mainView = document.getElementById("accounting-main-view");
    const incomeView = document.getElementById("income-details-view");
    const expenseView = document.getElementById("expense-details-view");

    renderAllIncome();

    if (mainView) mainView.classList.add("hidden");
    if (expenseView) expenseView.classList.add("hidden");
    if (incomeView) incomeView.classList.remove("hidden");
  };

  window.deleteIncomeRow = function (button, index) {
    const row = button.closest("div.grid");
    if (row) {
      row.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      row.style.opacity = "0";
      row.style.transform = "scale(0.97)";
      setTimeout(() => {
        incomeData.splice(index, 1);
        renderAllIncome();
      }, 300);
    }
  };

  window.openIncomeModal = function () {
    const modal = document.getElementById("add-income-modal");
    if (modal) modal.classList.remove("hidden");
  };

  window.closeIncomeModal = function () {
    const modal = document.getElementById("add-income-modal");
    const form = document.getElementById("add-income-form");
    if (modal) modal.classList.add("hidden");
    if (form) form.reset();
  };

  window.handleIncomeSubmit = function (event) {
    event.preventDefault();
    const titleInput = document.getElementById("income-title");
    const amountInput = document.getElementById("income-amount");
    const dateInput = document.getElementById("income-date");

    let rawAmount = amountInput.value.trim();
    if (!rawAmount.includes("تومان")) rawAmount += " تومان";

    incomeData.unshift({
      type: "درآمد",
      title: titleInput.value.trim(),
      amount: rawAmount,
      date: dateInput.value.trim(),
    });

    renderAllIncome();
    closeIncomeModal();
  };

  window.openEditIncomeModal = function (index) {
    editingIncomeIndex = index;
    const item = incomeData[index];
    const modal = document.getElementById("edit-income-modal");

    if (item && modal) {
      document.getElementById("edit-income-title").value = item.title;
      document.getElementById("edit-income-amount").value = item.amount.replace(
        " تومان",
        "",
      );
      document.getElementById("edit-income-date").value = item.date;
      modal.classList.remove("hidden");
    }
  };

  window.closeEditIncomeModal = function () {
    const modal = document.getElementById("edit-income-modal");
    if (modal) modal.classList.add("hidden");
    editingIncomeIndex = null;
  };

  window.handleEditIncomeSubmit = function (event) {
    event.preventDefault();
    if (editingIncomeIndex === null) return;

    const title = document.getElementById("edit-income-title").value.trim();
    let amount = document.getElementById("edit-income-amount").value.trim();
    const date = document.getElementById("edit-income-date").value.trim();

    if (!amount.includes("تومان")) amount += " تومان";

    incomeData[editingIncomeIndex] = {
      ...incomeData[editingIncomeIndex],
      title,
      amount,
      date,
    };

    renderAllIncome();
    closeEditIncomeModal();
  };
  expenseData;
  let editingExpenseIndex = null;

  function renderExpenseRow(item, index) {
    return `<div class="grid grid-cols-12 gap-2 text-center items-center py-3.5 px-4 hover:bg-rose-50/20 transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm">
  
  <!-- نوع -->
  <div class="col-span-2 text-purple1 font-bold truncate">
    ${item.type}
  </div>

  <!-- عنوان -->
  <div class="col-span-2 text-gray-900 font-bold truncate text-right pr-2">
    ${item.title}
  </div>

  <!-- مبلغ -->
  <div class="col-span-3 text-gray-900 font-bold truncate dir-ltr">
    ${item.amount}
  </div>

  <!-- تاریخ -->
  <div class="col-span-2 text-gray-900 font-bold truncate">
    ${item.date}
  </div>

  <!-- عملیات -->
  <div class="col-span-3 flex items-center justify-center gap-2 flex-nowrap shrink-0">
    <button onclick="window.openEditExpenseModal(${index})" 
            class="bg-yasi text-gray-800 hover:bg-yasi/40 text-xs font-bold py-1.5 px-3 rounded-full border border-[#d8c5b0] shadow-sm flex items-center gap-1.5 transition cursor-pointer shrink-0">
      <svg class="w-3.5 h-3.5 text-gray-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      <span class="whitespace-nowrap">ویرایش اطلاعات</span>
    </button>

    <button onclick="window.deleteExpenseRow(this, ${index})" 
            class="text-purple1 hover:text-purple1/60 transition cursor-pointer p-1 shrink-0" 
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
  }

  function renderAllExpense() {
    const container = document.getElementById("expense-table-rows");
    if (container) {
      container.innerHTML = expenseData.map(renderExpenseRow).join("");
    }
  }

  window.showTotalExpenseDetails = function () {
    const mainView = document.getElementById("accounting-main-view");
    const incomeView = document.getElementById("income-details-view");
    const expenseView = document.getElementById("expense-details-view");

    renderAllExpense();

    if (mainView) mainView.classList.add("hidden");
    if (incomeView) incomeView.classList.add("hidden");
    if (expenseView) expenseView.classList.remove("hidden");
  };

  window.deleteExpenseRow = function (button, index) {
    const row = button.closest("div.grid");
    if (row) {
      row.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      row.style.opacity = "0";
      row.style.transform = "scale(0.97)";
      setTimeout(() => {
        expenseData.splice(index, 1);
        renderAllExpense();
      }, 300);
    }
  };

  window.openExpenseModal = function () {
    const modal = document.getElementById("add-expense-modal");
    if (modal) modal.classList.remove("hidden");
  };

  window.closeExpenseModal = function () {
    const modal = document.getElementById("add-expense-modal");
    const form = document.getElementById("add-expense-form");
    if (modal) modal.classList.add("hidden");
    if (form) form.reset();
  };

  window.handleExpenseSubmit = function (event) {
    event.preventDefault();
    const titleInput = document.getElementById("expense-title");
    const amountInput = document.getElementById("expense-amount");
    const dateInput = document.getElementById("expense-date");

    let rawAmount = amountInput.value.trim();
    if (!rawAmount.includes("تومان")) rawAmount += " تومان";

    expenseData.unshift({
      type: "هزینه",
      title: titleInput.value.trim(),
      amount: rawAmount,
      date: dateInput.value.trim(),
    });

    renderAllExpense();
    closeExpenseModal();
  };

  window.openEditExpenseModal = function (index) {
    editingExpenseIndex = index;
    const item = expenseData[index];
    const modal = document.getElementById("edit-expense-modal");

    if (item && modal) {
      document.getElementById("edit-expense-title").value = item.title;
      document.getElementById("edit-expense-amount").value =
        item.amount.replace(" تومان", "");
      document.getElementById("edit-expense-date").value = item.date;
      modal.classList.remove("hidden");
    }
  };

  window.closeEditExpenseModal = function () {
    const modal = document.getElementById("edit-expense-modal");
    if (modal) modal.classList.add("hidden");
    editingExpenseIndex = null;
  };

  window.handleEditExpenseSubmit = function (event) {
    event.preventDefault();
    if (editingExpenseIndex === null) return;

    const title = document.getElementById("edit-expense-title").value.trim();
    let amount = document.getElementById("edit-expense-amount").value.trim();
    const date = document.getElementById("edit-expense-date").value.trim();

    if (!amount.includes("تومان")) amount += " تومان";

    expenseData[editingExpenseIndex] = {
      ...expenseData[editingExpenseIndex],
      title,
      amount,
      date,
    };

    renderAllExpense();
    closeEditExpenseModal();
  };

  window.showAccountingMain = function () {
    const mainView = document.getElementById("accounting-main-view");
    const incomeView = document.getElementById("income-details-view");
    const expenseView = document.getElementById("expense-details-view");

    if (mainView) mainView.classList.remove("hidden");
    if (incomeView) incomeView.classList.add("hidden");
    if (expenseView) expenseView.classList.add("hidden");
  };
});
