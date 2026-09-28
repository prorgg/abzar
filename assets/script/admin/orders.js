import { fetchWithAuth } from "../data.js";

document.addEventListener("DOMContentLoaded", () => {
  const pageTitle = document.getElementById("page-title");
  const breadcrumb = document.getElementById("page-breadcrumb");
  const tableBody = document.getElementById("orders-table-body");
  const searchInput = document.getElementById("order-search-input");
  const statusFilter = document.getElementById("order-status-filter");

  let ordersData = [];

  const statusMap = {
    processing: { text: "در حال پردازش", color: "text-amber-500" },
    shipped: { text: "ارسال شده", color: "text-blue-500" },
    delivered: { text: "تحویل داده شده", color: "text-emerald-500" },
    canceled: { text: "لغو شده", color: "text-red-500" },
    pending: { text: "در انتظار پرداخت", color: "text-yellow-600" },
    paid: { text: "پرداخت شده", color: "text-emerald-500" },
    completed: { text: "تکمیل شده", color: "text-emerald-500" },
    success: { text: "موفق", color: "text-emerald-500" },
    failed: { text: "ناموفق", color: "text-red-500" },
    unpaid: { text: "پرداخت نشده", color: "text-amber-500" },
  };

  function normalizeOrdersPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];

    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.orders)) return payload.orders;
    if (Array.isArray(payload.result)) return payload.result;
    if (Array.isArray(payload.items)) return payload.items;
    for (const key of ["data", "orders", "result", "items", "payload"]) {
      const value = payload[key];
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        const nestedOrders = normalizeOrdersPayload(value);
        if (nestedOrders.length) return nestedOrders;
      }
    }

    return [];
  }

  async function fetchAllOrders() {
    const response = await fetchWithAuth("/order", { method: "GET" });
    if (response?.authRequired || response?.status === false) {
      const error = new Error(
        response.message || "برای مشاهده سفارش‌ها با حساب مدیر وارد شوید.",
      );
      error.authRequired = Boolean(response.authRequired);
      throw error;
    }
    return normalizeOrdersPayload(response);
  }

  // 1. دریافت لیست کامل سفارشات از API طبق داکیومنت (GET /order)
  async function fetchOrders() {
    if (!tableBody) return;

    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-gray-400 text-center">درحال بارگذاری اطلاعات...</td>
      </tr>
    `;

    try {
      ordersData = await fetchAllOrders();
      renderOrders(ordersData);
    } catch (error) {
      console.error("خطا در دریافت سفارشات:", error);
      const message = error.authRequired || error.status === 401
        ? "نشست مدیر معتبر نیست؛ دوباره وارد حساب مدیر شوید."
        : error.message || "خطا در دریافت لیست سفارشات.";
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.className = "py-6 text-red-500 text-center";
      cell.textContent = message;
      row.appendChild(cell);
      tableBody.replaceChildren(row);
    }
  }

  // 2. رندر جدول سفارشات
  function renderOrders(data) {
    if (!tableBody) return;

    if (!data || data.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-gray-400 text-center">هیچ سفارشی یافت نشد.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = data
      .map((order) => {
        const orderId = order.id;
        const orderCode =
          order.order_number ||
          order.code ||
          order.order_code ||
          `ORD-${orderId}`;
        const customerName =
          order.user?.name ||
          order.customer_name ||
          (order.user_id ? `کاربر شماره ${order.user_id}` : "کاربر ناشناس");

        const rawAmount =
          order.final_amount ??
          order.total_amount ??
          order.total ??
          order.payable_price ??
          0;
        const totalAmount = Number(rawAmount).toLocaleString("en-US");

        const orderDate = order.created_at || order.date || "-";

        const rawStatus = order.payment_status || order.status || "processing";
        const statusInfo = statusMap[rawStatus] || {
          text: rawStatus,
          color: "text-gray-600",
        };

        return `
          <tr class="border-b border-purple1/20 hover:bg-gray-50/50 transition-colors">
            <td class="py-4 px-3 font-medium">${orderCode}</td>
            <td class="py-4 px-3">${customerName}</td>
            <td class="py-4 px-3 font-bold">${totalAmount} تومان</td>
            <td class="py-4 px-3">${orderDate}</td>
            <td class="py-4 px-3">
              <span class="${statusInfo.color} font-medium">${statusInfo.text}</span>
            </td>
            <td class="py-4 px-3">
              <button data-id="${orderId}"
                      class="btn-order-detail bg-[#f2e2ce] text-black-primary text-xs font-bold px-3 py-1.5 rounded-lg hover:brightness-95 transition cursor-pointer">
                جزئیات
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  // 3. کلیک روی جزئیات
  if (tableBody) {
    tableBody.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-order-detail");
      if (btn) {
        const orderId = Number(btn.getAttribute("data-id"));
        showOrderDetails(orderId);
      }
    });
  }

  // 4. دریافت جزئیات سفارش طبق داکیومنت (GET /order?id=1)
  async function showOrderDetails(orderId) {
    try {
      const res = await fetchWithAuth(
        `/order?id=${encodeURIComponent(orderId)}`,
        { method: "GET" },
      );
      if (res?.status === false || res?.authRequired) {
        throw new Error(res.message || "دریافت جزئیات سفارش ناموفق بود.");
      }

      const orderPayload = res?.data ?? res;
      const order = Array.isArray(orderPayload)
        ? orderPayload.find((item) => Number(item.id) === Number(orderId))
        : orderPayload?.id
          ? orderPayload
          : ordersData.find((item) => Number(item.id) === Number(orderId));

      if (!order) return;

      const orderCode =
        order.order_number ||
        order.code ||
        order.order_code ||
        `ORD-${order.id}`;

      const customerNameEl = document.getElementById("detail-customer-name");
      const customerPhoneEl = document.getElementById("detail-customer-phone");
      const orderIdEl = document.getElementById("detail-order-id");
      const statusEl = document.getElementById("detail-status");

      if (customerNameEl)
        customerNameEl.textContent =
          order.user?.name ||
          order.customer_name ||
          (order.user_id ? `کاربر شماره ${order.user_id}` : "-");
      if (customerPhoneEl)
        customerPhoneEl.textContent = order.user?.mobile || order.mobile || "-";
      if (orderIdEl) orderIdEl.textContent = orderCode;

      const rawStatus = order.status || "processing";
      const statusInfo = statusMap[rawStatus] || {
        text: rawStatus,
        color: "text-gray-600",
      };

      if (statusEl) {
        statusEl.textContent = statusInfo.text;
        statusEl.className = `font-bold text-sm sm:text-base ${statusInfo.color}`;
      }

      const addressEl = document.getElementById("detail-address");
      const dateEl = document.getElementById("detail-date");

      if (addressEl)
        addressEl.textContent = order.shipping_address || order.address || "-";
      if (dateEl) dateEl.textContent = order.created_at || order.date || "-";

      const itemsBody = document.getElementById("detail-items-body");
      const items = order.items || order.order_items || [];

      if (itemsBody) {
        if (items.length === 0) {
          itemsBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-400">هیچ کالا/آیتمی ثبت نشده است.</td></tr>`;
        } else {
          itemsBody.innerHTML = items
            .map((item) => {
              const productName =
                item.product?.name || item.title || item.name || "محصول";
              const size = item.size || item.variant?.size?.name || "-";
              const color = item.color || item.variant?.color?.name || "-";
              const price = Number(item.price || item.unit_price || 0);
              const qty = Number(item.quantity || item.qty || 1);
              const itemTotal = price * qty;

              return `
                <tr class="border-b border-gray-200 last:border-0">
                  <td class="py-3 px-4 text-right font-medium">
                    ${productName}
                    <span class="text-xs text-gray-500 block">سایز: ${size} | رنگ: ${color}</span>
                  </td>
                  <td class="py-3 px-4 font-bold">${price.toLocaleString("en-US")} تومان</td>
                  <td class="py-3 px-4">${qty.toLocaleString("en-US")}</td>
                  <td class="py-3 px-4 font-bold text-purple1">${itemTotal.toLocaleString("en-US")} تومان</td>
                </tr>
              `;
            })
            .join("");
        }
      }

      const subtotalEl = document.getElementById("detail-subtotal");
      const shippingCostEl = document.getElementById("detail-shipping-cost");
      const totalEl = document.getElementById("detail-total");

      const subtotal = Number(
        order.total_amount || order.subtotal || order.total_price || 0,
      );
      const shippingCost = Number(order.shipping_cost || 0);
      const total = Number(
        order.final_amount ||
          order.total ||
          order.payable_price ||
          subtotal + shippingCost,
      );

      if (subtotalEl)
        subtotalEl.textContent = `${subtotal.toLocaleString("en-US")} تومان`;
      if (shippingCostEl)
        shippingCostEl.textContent = `${shippingCost.toLocaleString("en-US")} تومان`;
      if (totalEl)
        totalEl.textContent = `${total.toLocaleString("en-US")} تومان`;

      const ordersSection = document.getElementById("orders-section");
      const orderDetailsSection = document.getElementById(
        "order-details-section",
      );

      if (ordersSection) ordersSection.classList.add("hidden");
      if (orderDetailsSection) orderDetailsSection.classList.remove("hidden");

      if (pageTitle) pageTitle.textContent = `جزئیات سفارش ${orderCode}`;
      if (breadcrumb)
        breadcrumb.textContent = `سفارشات > جزئیات سفارش ${orderCode}`;

      setupStatusChangeAction(order.id);
    } catch (error) {
      console.error("خطا در دریافت جزئیات سفارش:", error);
    }
  }

  // 5. تغییر وضعیت سفارش در API طبق داکیومنت (PUT /order)
  function setupStatusChangeAction(orderId) {
    const statusSelect = document.getElementById("change-status-select");
    const updateStatusBtn = document.getElementById("update-status-btn");

    if (!updateStatusBtn) return;

    updateStatusBtn.onclick = async () => {
      const newStatus = statusSelect?.value;
      if (!newStatus) return;

      try {
        updateStatusBtn.disabled = true;

        const response = await fetchWithAuth("/order", {
          method: "PUT",
          body: { id: orderId, status: newStatus },
        });
        if (response?.status === false || response?.authRequired) {
          throw new Error(response.message || "تغییر وضعیت سفارش ناموفق بود.");
        }

        window.showAppNotice("وضعیت سفارش با موفقیت بروزرسانی شد.");
        await fetchOrders();
      } catch (err) {
        console.error("خطا در تغییر وضعیت سفارش:", err);
      } finally {
        updateStatusBtn.disabled = false;
      }
    };
  }

  // 6. فیلتر و جستجو
  function applyFilters() {
    const query = searchInput?.value.trim().toLowerCase() || "";
    const selectedStatus = statusFilter?.value || "all";

    const filtered = ordersData.filter((order) => {
      const code = (
        order.order_number ||
        order.code ||
        order.order_code ||
        `ORD-${order.id}`
      )
        .toString()
        .toLowerCase();
      const name = (
        order.user?.name ||
        order.customer_name ||
        ""
      ).toLowerCase();
      const phone = (order.user?.mobile || order.mobile || "").toString();

      const matchesSearch =
        code.includes(query) || name.includes(query) || phone.includes(query);
      const matchesStatus =
        selectedStatus === "all" || order.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });

    renderOrders(filtered);
  }

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);

  // 7. بازگشت به لیست
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

  fetchOrders();
});
