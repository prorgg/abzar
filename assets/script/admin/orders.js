
import { ordersData } from "../data.js";

document.addEventListener("DOMContentLoaded", () => {
  ordersData;

  // ۱. تعریف متغیرهای صفحه و عناوین
  const pageTitle = document.getElementById("page-title");
  const breadcrumb = document.getElementById("page-breadcrumb");
  const tableBody = document.getElementById("orders-table-body");

  // ۲. رندر جدول سفارشات
  function renderOrders() {
    if (!tableBody) return;

    if (!ordersData || ordersData.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-gray-400 text-center">هیچ سفارشی یافت نشد.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = ordersData
      .map(
        (order) => `
      <tr class="border-b border-purple1/20 hover:bg-gray-50/50 transition-colors">
        <td class="py-4 px-3 font-medium">${order.orderCode}</td>
        <td class="py-4 px-3">${order.customer}</td>
        <td class="py-4 px-3 font-bold">${order.amount}</td>
        <td class="py-4 px-3">${order.date}</td>
        <td class="py-4 px-3">
          <span class="${order.statusColor} font-medium">${order.status}</span>
        </td>
        <td class="py-4 px-3">
          <!-- استفاده از data-id به جای onclick -->
          <button data-id="${order.id}" 
                  class="btn-order-detail bg-[#f2e2ce] text-black-primary text-xs font-bold px-3 py-1.5 rounded-lg hover:brightness-95 transition cursor-pointer">
            جزئیات
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
  }

  // ۳. ثبت کلیک روی دکمه جزئیات با Event Delegation
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-order-detail");
      if (btn) {
        const orderId = Number(btn.getAttribute("data-id"));
        showOrderDetails(orderId);
      }
    });
  }

  // ۴. نمایش جزئیات سفارش
  function showOrderDetails(orderId) {
    const order = ordersData.find((o) => o.id === orderId);
    if (!order) {
      return;
    }

    // اطلاعات مشتری
    const customerNameEl = document.getElementById("detail-customer-name");
    const customerPhoneEl = document.getElementById("detail-customer-phone");
    const orderIdEl = document.getElementById("detail-order-id");
    const statusEl = document.getElementById("detail-status");

    if (customerNameEl) customerNameEl.textContent = order.customer;
    if (customerPhoneEl) customerPhoneEl.textContent = order.customerPhone;
    if (orderIdEl) orderIdEl.textContent = order.orderCode;
    if (statusEl) {
      statusEl.textContent = order.status;
      statusEl.className = `font-bold text-sm sm:text-base ${order.statusColor}`;
    }

    // اطلاعات ارسال
    const addressEl = document.getElementById("detail-address");
    const dateEl = document.getElementById("detail-date");
    const shippingMethodEl = document.getElementById("detail-shipping-method");
    const shippingStatusEl = document.getElementById("detail-shipping-status");
    const shippingDateEl = document.getElementById("detail-shipping-date");

    if (addressEl) addressEl.textContent = order.address;
    if (dateEl) dateEl.textContent = order.date + " - pm14:00";
    if (shippingMethodEl) shippingMethodEl.textContent = order.shippingMethod;
    if (shippingStatusEl) shippingStatusEl.textContent = order.shippingStatus;
    if (shippingDateEl) shippingDateEl.textContent = order.shippingDate;

    // جدول اقلام سفارش
    const itemsBody = document.getElementById("detail-items-body");
    if (itemsBody && order.items) {
      itemsBody.innerHTML = order.items
        .map((item) => {
          const rawPrice = parseInt(item.price.replace(/[.,]/g, ""), 10) || 0;
          return `
            <tr class="border-b border-gray-200 last:border-0">
              <td class="py-3 px-4 text-right font-medium">
                ${item.product}
                <span class="text-xs text-gray-500 block">سایز: ${item.size} | رنگ: ${item.color}</span>
              </td>
              <td class="py-3 px-4 font-bold">${item.price} تومان</td>
              <td class="py-3 px-4">${item.quantity}</td>
              <td class="py-3 px-4 font-bold text-purple1">${(rawPrice * item.quantity).toLocaleString()} تومان</td>
            </tr>
          `;
        })
        .join("");
    }

    // محاسبه جمع کل
    const subtotalEl = document.getElementById("detail-subtotal");
    const shippingCostEl = document.getElementById("detail-shipping-cost");
    const totalEl = document.getElementById("detail-total");

    if (subtotalEl) subtotalEl.textContent = order.subtotal;
    if (shippingCostEl) shippingCostEl.textContent = order.shippingCost;
    if (totalEl) totalEl.textContent = order.total;

    // تغییر نمایش بخش‌ها
    const ordersSection = document.getElementById("orders-section");
    const orderDetailsSection = document.getElementById(
      "order-details-section",
    );

    if (ordersSection) ordersSection.classList.add("hidden");
    if (orderDetailsSection) orderDetailsSection.classList.remove("hidden");

    // به‌روزرسانی عناوین
    if (pageTitle) pageTitle.textContent = `جزئیات سفارش ${order.orderCode}`;
    if (breadcrumb)
      breadcrumb.textContent = `سفارشات > جزئیات سفارش ${order.orderCode}`;
  }

  // ۵. بازگشت به لیست سفارشات
  const backToOrdersBtn = document.getElementById("back-to-orders");
  if (backToOrdersBtn) {
    backToOrdersBtn.addEventListener("click", function () {
      const orderDetailsSection = document.getElementById(
        "order-details-section",
      );
      const ordersSection = document.getElementById("orders-section");

      if (orderDetailsSection) orderDetailsSection.classList.add("hidden");
      if (ordersSection) ordersSection.classList.remove("hidden");
      if (pageTitle) pageTitle.textContent = "سفارشات";
      if (breadcrumb) breadcrumb.textContent = "مدیریت سفارشات";
    });
  }

  // اجرای اولیه برای رندر جدول
  renderOrders();
});
