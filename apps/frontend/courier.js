const currentUser =
JSON.parse(localStorage.getItem("divineYouUser"));
const token =
localStorage.getItem(
    "divineYouAuthToken"
);
if (
    !currentUser ||
    !currentUser.role ||
    currentUser.role.toLowerCase() !== "courier"
) {
    window.location.href = "index.html";
}

// =========================
// GLOBAL VARIABLES
// =========================

let allOrders = [];
let filteredShipments = [];
let currentView = "cards";

// INITIALIZE

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializeDashboard();
    }
);

function initializeDashboard() {

    const courierName =
        `${currentUser.first_name || ""} ${currentUser.last_name || ""}`;

    const courierNameElement =
        document.getElementById("courierName");

    if (courierNameElement) {
        courierNameElement.textContent =
            courierName;
    }

    setupEventListeners();

    loadOrders();
}

// =========================
// LOAD ORDERS
// =========================

async function loadOrders() {

    try {

        const response =
        await fetch(
    "http://localhost:7000/api/orders",
    {
        headers:{
            "Authorization": `Bearer ${token}`
        }
    }
);

        const data =
        await response.json();


        if (!data.success) {
            throw new Error(
                "Failed to fetch orders"
            );
        }

        allOrders =
        (data.orders || []).map(order => {

            return {

                ...order,

                orderId:
                    order.order_id || "",

                totalAmount:
                    Number(order.total_amount || 0),

                deliveryStatus:
                    order.order_status || "assigned",

                paymentStatus:
                    order.payment_status || "pending",

                trackingId:
                    order.tracking_id || "",

                shipmentId:
                    order.shipment_id || "",

                orderDate:
                    order.created_at || "",

                courierName:
                    order.courier_name || "",

                assignedCourierId:
                    order.assigned_courier_id ||
                    order.courier_id ||
                    order.courierId ||
                    order.courierid ||
                    order["courier_id"] ||
                    null,

                customer: {

                    name:
                        `${order.first_name || ""} ${order.last_name || ""}`,

                    email:
                        order.email || "N/A",

                    phone:
                        order.phone || "N/A",

                    address:
                        order.address || "N/A"
                },

                products:
                    (order.items || []).map(item => ({

                        name:
                            item.product_title || "Product",

                        quantity:
                            item.quantity || 0,

                        price:
                            Number(item.price || 0),

                        image:
                            item.image_url || ""
                    }))
            };
        });


        filteredShipments = [...allOrders];

        renderDashboard();

    } catch (error) {

        console.error(
            "LOAD ORDERS ERROR:",
            error
        );

        allOrders = [];
        filteredShipments = [];

        renderDashboard();

        showNotification(
            "Failed to load orders",
            "error"
        );
    }
}

// =========================
// UPDATE SHIPMENT STATUS
// =========================

async function updateShipmentStatus(
    orderId,
    status
) {

    if (!status) return;

    try {

        const response =
        await fetch(
            `http://localhost:7000/api/orders/${orderId}/status`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                    "application/json",
    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({
                    status
                })
            }
        );

        const data =
        await response.json();

        if (data.success) {

            showNotification(
                "Shipment status updated",
                "success"
            );

            loadOrders();

        } else {

            showNotification(
                "Update failed",
                "error"
            );
        }

    } catch (error) {

        console.error(error);

        showNotification(
            "Status update failed",
            "error"
        );
    }
}
// SAVE TRACKING DETAILS

async function saveTrackingDetails(orderId) {


    const trackingInput =
        document.getElementById(
            `table-tracking-${orderId}`
        ) ||
        document.getElementById(
            `card-tracking-${orderId}`
        );

    const partnerInput =
        document.getElementById(
            `table-partner-${orderId}`
        ) ||
        document.getElementById(
            `card-partner-${orderId}`
        );
    if (!trackingInput || !partnerInput) {

        showNotification(
            "Input fields not found",
            "error"
        );

        return;
    }

    const trackingId =
        trackingInput.value.trim();

    const courierPartner =
        partnerInput.value.trim();
    
    const statusInput =
    document.getElementById(
        `table-status-${orderId}`
    ) ||
    document.getElementById(
        `card-status-${orderId}`
    );

const trackingStatus =
    statusInput?.value;
    if (!trackingId || !courierPartner) {

        showNotification(
            "Enter tracking ID and courier partner",
            "warning"
        );

        return;
    }

    try {

        const response =
        await fetch(
            `http://localhost:7000/api/orders/${orderId}/shipment`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                    "application/json",

                    "Authorization":
                    `Bearer ${token}`
                },

               body: JSON.stringify({
    tracking_id: trackingId,
    courier_name: courierPartner,
    tracking_status: trackingStatus
})
            }
        );

        const data =
        await response.json();

        if (data.success) {

            showNotification(
                "Shipment details saved",
                "success"
            );

            loadOrders();

        } else {

            showNotification(
                data.message || "Save failed",
                "error"
            );
        }

    } catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );

        showNotification(
            "Server error",
            "error"
        );
    }
}
// EVENT LISTENERS

function setupEventListeners() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const statusFilter =
        document.getElementById(
            "statusFilter"
        );

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            handleSearch
        );
    }

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            filterShipments
        );
    }
}

// =========================
// SEARCH
// =========================

function handleSearch(e) {

    const searchTerm =
        e.target.value.toLowerCase();

    filteredShipments =
    allOrders.filter(order => {

        const customerName =
            (order.customer?.name || "")
            .toLowerCase();

        const orderId =
            (order.orderId || "")
            .toLowerCase();

        const trackingId =
            (order.trackingId || "")
            .toLowerCase();

        return (

            customerName.includes(searchTerm) ||

            orderId.includes(searchTerm) ||

            trackingId.includes(searchTerm)
        );
    });

    renderDashboard();
}

// =========================
// FILTER
// =========================

function filterShipments() {

    const status =
        document.getElementById(
            "statusFilter"
        )?.value;

    if (!status) {

        filteredShipments = [...allOrders];

    } else {

        filteredShipments =
        allOrders.filter(order => {

            return (
                order.deliveryStatus === status
            );
        });
    }

    renderDashboard();
}

// LOGOUT


function handleLogout() {

    localStorage.removeItem(
        "divineYouUser"
    );

    localStorage.removeItem(
        "divineYouAuthToken"
    );

    window.location.replace(
        "index.html"
    );
}

// =========================
// UTILITIES
// =========================

function formatStatus(status) {

    return status
        .replace(/_/g, " ")
        .replace(
            /\b\w/g,
            l => l.toUpperCase()
        );
}

function formatOrderDate(dateString) {

    if (!dateString) {
        return "N/A";
    }

    try {

        const date =
            new Date(dateString);

        return date.toLocaleString();

    } catch (error) {

        return "N/A";
    }
}

// =========================
// NOTIFICATION
// =========================

function showNotification(
    message,
    type = "success"
) {

    const notification =
        document.createElement("div");

    notification.textContent =
        message;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 18px;
        border-radius: 8px;
        color: white;
        z-index: 9999;
        font-weight: 600;
        background:
            ${
                type === "success"
                ? "#28a745"
                : type === "error"
                ? "#dc3545"
                : "#f39c12"
            };
    `;

    document.body.appendChild(
        notification
    );

    setTimeout(() => {

        notification.remove();

    }, 3000);
}
// =========================
// RENDER DASHBOARD
// =========================

function renderDashboard() {

    updateSummaryCards();

    if (currentView === "cards") {

        renderCardsView();

    } else {

        renderTableView();
    }

    toggleEmptyState();
}

// =========================
// SUMMARY CARDS
// =========================

function updateSummaryCards() {

    const total =
        filteredShipments.length;

    const inTransit =
    filteredShipments.filter(
        o => o.deliveryStatus === "In Transit"
    ).length;

const outForDelivery =
    filteredShipments.filter(
        o => o.deliveryStatus === "Out For Delivery"
    ).length;

const delivered =
    filteredShipments.filter(
        o => o.deliveryStatus === "Delivered"
    ).length;

const pending =
    filteredShipments.filter(
        o =>
            o.deliveryStatus === "pending" ||
            o.deliveryStatus === "Order Placed"
    ).length;

    updateElement(
        "totalShipmentsCount",
        total
    );

    updateElement(
        "activeShipmentsCount",
        total
    );

    updateElement(
        "inTransitCount",
        inTransit
    );

    updateElement(
        "outForDeliveryCount",
        outForDelivery
    );

    updateElement(
        "deliveredCount",
        delivered
    );

    updateElement(
        "pendingCount",
        pending
    );

    updateElement(
        "todayDeliveriesCount",
        delivered
    );

    const completionRate =
        total > 0
        ? Math.round((delivered / total) * 100)
        : 0;

    updateElement(
        "completionRate",
        `${completionRate}%`
    );
}

// =========================
// UPDATE ELEMENT
// =========================

function updateElement(id, value) {

    const el =
        document.getElementById(id);

    if (el) {

        el.textContent = value;
    }
}

// =========================
// TOGGLE VIEW
// =========================

function toggleView(view) {

    currentView = view;

    document
    .querySelectorAll(".view-btn")
    .forEach(btn => {

        btn.classList.toggle(
            "active",
            btn.dataset.view === view
        );
    });

    document.getElementById(
        "cardsView"
    ).style.display =
        view === "cards"
        ? "block"
        : "none";

    document.getElementById(
        "tableView"
    ).style.display =
        view === "table"
        ? "block"
        : "none";

    renderDashboard();
}

// =========================
// CARDS VIEW
// =========================

function renderCardsView() {

    const container =
        document.getElementById(
            "shipmentsCards"
        );

    if (!container) return;

    container.innerHTML = "";

    filteredShipments.forEach(order => {

        const card =
        document.createElement("div");

        card.className =
            "shipment-card";

        card.innerHTML = `

            <div class="shipment-card-content">

                <h3>${order.orderId}</h3>

                <p>
                    <strong>Customer:</strong>
                    ${order.customer.name}
                </p>

                <p>
                    <strong>Amount:</strong>
                    ₹${order.totalAmount}
                </p>

                <p>
                    <strong>Courier:</strong>
                    ${order.courierName || "-"}
                </p>

                <p>
                    <strong>Tracking:</strong>
                    ${order.trackingId || "-"}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${formatStatus(order.deliveryStatus)}
                </p>

                <div class="manual-entry-box">

                    <input
                        type="text"
                        class="manual-input"
                        id="card-partner-${order.id}"
                        value="${order.courierName || ""}"
                        placeholder="Courier Partner"
                    >

                    <input
                        type="text"
                        class="manual-input"
                        id="card-tracking-${order.id}"
                        value="${order.trackingId || ""}"
                        placeholder="Tracking ID"
                    >
         <select
    class="manual-input status-dropdown"
    id="card-status-${order.id}"
>
    <option value="Order Placed" ${order.deliveryStatus === "Order Placed" ? "selected" : ""}>Order Placed</option>

    <option value="Picked Up" ${order.deliveryStatus === "Picked Up" ? "selected" : ""}>Picked Up</option>

    <option value="In Transit" ${order.deliveryStatus === "In Transit" ? "selected" : ""}>In Transit</option>

    <option value="Out For Delivery" ${order.deliveryStatus === "Out For Delivery" ? "selected" : ""}>Out For Delivery</option>

    <option value="Delivered" ${order.deliveryStatus === "Delivered" ? "selected" : ""}>Delivered</option>

    <option value="Failed Delivery" ${order.deliveryStatus === "Failed Delivery" ? "selected" : ""}>Failed Delivery</option>
<option value="pending"
${order.deliveryStatus === "pending" ? "selected" : ""}>
pending
</option>

<option value="shipped"
${order.deliveryStatus === "shipped" ? "selected" : ""}>
shipped
</option>
    </select>

                    <button
                        class="action-btn save-manual-btn"
                        onclick="saveTrackingDetails(${order.id})"
                    >
                        Save
                    </button>

                </div>

            </div>
        `;

        container.appendChild(card);
    });
}

// =========================
// TABLE VIEW
// =========================

function renderTableView() {

    const tbody =
        document.getElementById(
            "shipmentsTableBody"
        );

    if (!tbody) return;

    tbody.innerHTML = "";

    filteredShipments.forEach(order => {

        const row =
        document.createElement("tr");
        row.innerHTML = `

            <td>${order.orderId}</td>

            <td>${order.customer.name}</td>

            <td>${order.customer.email}</td>

            <td>${formatOrderDate(order.orderDate)}</td>

            <td>₹${order.totalAmount}</td>
            
            <td>
    <input
        type="text"
        class="manual-input"
        id="table-partner-${order.id}"
        value="${order.courierName || ""}"
        placeholder="Courier Company"
    >
</td>

<td>
    <input
        type="text"
        class="manual-input"
        id="table-tracking-${order.id}"
        value="${order.trackingId || ""}"
        placeholder="Tracking ID"
    >
</td>

<td>
    <select
    class="manual-input status-dropdown"
    id="card-status-${order.id}"
>
    <option value="Order Placed" ${order.deliveryStatus === "Order Placed" ? "selected" : ""}>Order Placed</option>

    <option value="Picked Up" ${order.deliveryStatus === "Picked Up" ? "selected" : ""}>Picked Up</option>

    <option value="In Transit" ${order.deliveryStatus === "In Transit" ? "selected" : ""}>In Transit</option>

    <option value="Out For Delivery" ${order.deliveryStatus === "Out For Delivery" ? "selected" : ""}>Out For Delivery</option>

    <option value="Delivered" ${order.deliveryStatus === "Delivered" ? "selected" : ""}>Delivered</option>

    <option value="Failed Delivery" ${order.deliveryStatus === "Failed Delivery" ? "selected" : ""}>Failed Delivery</option>
<option value="pending"
${order.deliveryStatus === "pending" ? "selected" : ""}>
pending
</option>

<option value="shipped"
${order.deliveryStatus === "shipped" ? "selected" : ""}>
shipped
</option>
    </select>
</td>

<td>
    <button
        class="action-btn save-manual-btn"
        onclick="saveTrackingDetails(${order.id})"
    >
        Save
    </button>
</td>
        `;

        tbody.appendChild(row);
    });
}

// =========================
// EMPTY STATE
// =========================

function toggleEmptyState() {

    const emptyState =
        document.getElementById(
            "emptyState"
        );

    if (!emptyState) return;

    emptyState.style.display =
        filteredShipments.length === 0
        ? "block"
        : "none";
}

// =========================
// REFRESH
// =========================

function refreshDashboard() {

    loadOrders();
}
async function markAllShipped() {

    for (const order of filteredShipments) {

        await updateShipmentStatus(
            order.id,
            "shipped"
        );
    }
}