const currentUser =
JSON.parse(localStorage.getItem("divineYouUser"));

("Current User:", currentUser);

if (
    !currentUser ||
    !currentUser.role ||
    currentUser.role.toLowerCase() !== "admin"
) {

    window.location.href = "index.html";
}

// Global variables
let allOrders = [];
let filteredOrders = [];
let currentView = 'table';

// Available couriers
const COURIERS = ['Delhivery', 'BlueDart', 'DTDC', 'Ekart'];
let courierUsers = [];

// Order status options
const ORDER_STATUSES = [
    'pending',
    'processing', 
    'packed',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled'
];

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {

    setupEventListeners();

    await loadCouriers();

    loadOrders();
}
async function loadCouriers() {

    try {

        const response =
        await fetch(
            "http://localhost:7000/api/users/couriers"
        );

        const data =
        await response.json();

        if (data.success) {

            courierUsers =
            data.couriers;

            (
                "Loaded Couriers:",
                courierUsers
            );
        }

    } catch(error) {

    }
}

// Load orders from localStorage
// Load orders from backend API
async function loadOrders() {

    try {

        const response = await fetch("http://localhost:7000/api/orders");

        const data = await response.json();

        ("Fetched Orders:", data);

        if (data.success) {

            allOrders = data.orders.map(order => {

                return {

                    ...order,

                    // NORMALIZED FIELDS
                    orderId: order.order_id,

                    totalAmount: Number(order.total_amount || 0),

                    orderStatus: order.order_status || 'pending',

                    courierName: order.courier_name || '',

                    tracking_id: order.tracking_id || '',
                    
                    assigned_courier_email: order.assigned_courier_email || '',
                    
                    assigned_courier_id: order.assigned_courier_id || '',

                    shipmentId: order.shipment_id || '',

                    paymentStatus: order.payment_status || 'pending',

                    orderDate: order.created_at,
customer: {
    name: order.first_name || 'Customer',
    email: order.email || 'N/A',
    phone: order.phone || 'N/A',
    address: order.address || 'N/A'
},

                    // CONVERT ITEMS
                    products: (order.items || []).map(item => ({
                        name: item.product_title,
                        quantity: item.quantity,
                        price: Number(item.price || 0),
                        image: item.image_url
                    }))
                };
            });

        } else {

            allOrders = [];
        }

        filteredOrders = [...allOrders];

        renderDashboard();

    } catch (error) {

        ("Error loading orders:", error);

        allOrders = [];
        filteredOrders = [];
    }
}
// Setup event listeners
function setupEventListeners() {
    // Global search
    const globalSearchInput = document.getElementById('globalSearchInput');
    const clearGlobalSearch = document.getElementById('clearGlobalSearch');
    
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', handleGlobalSearch);
    }
    
    if (clearGlobalSearch) {
        clearGlobalSearch.addEventListener('click', clearGlobalSearchInput);
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterOrders);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    const shipmentSearchInput =
    document.getElementById(
        'shipmentSearchInput'
    );

if (shipmentSearchInput) {

    shipmentSearchInput.addEventListener(
        'input',
        filterOrders
    );
}

const courierFilter =
    document.getElementById(
        'courierFilter'
    );

if (courierFilter) {

    courierFilter.addEventListener(
        'change',
        filterOrders
    );
}

const sortOrders =
    document.getElementById(
        'sortOrders'
    );

if (sortOrders) {

    sortOrders.addEventListener(
        'change',
        filterOrders
    );
}
}


// Render entire dashboard
function renderDashboard() {
    updateSummaryCards();
    renderOrders();
    renderRecentActivity();
}

// Update summary cards
function updateSummaryCards() {
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(order => order.orderStatus === 'pending').length;
    const shippedOrders = allOrders.filter(order => order.orderStatus === 'shipped').length;
    const deliveredOrders = allOrders.filter(order => order.orderStatus === 'delivered').length;
    const totalRevenue = allOrders
        .filter(order => order.paymentStatus === 'paid')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const uniqueCustomers = new Set(
    allOrders.map(order =>
        order.customer?.email
    )
).size;

const averageOrderValue =
    totalOrders > 0
        ? totalRevenue / totalOrders
        : 0;

const totalProductsSold =
    allOrders.reduce((sum, order) => {

        const qty =
            (order.products || []).reduce(
                (pSum, p) => pSum + p.quantity,
                0
            );

        return sum + qty;

    }, 0);
    // Update DOM
    updateElement('totalOrdersCount', totalOrders);
    updateElement('pendingOrdersCount', pendingOrders);
    updateElement('shippedOrdersCount', shippedOrders);
    updateElement('deliveredOrdersCount', deliveredOrders);
    updateElement('totalRevenueAmount', `₹${totalRevenue.toFixed(2)}`);
    updateElement(
    'totalCustomersCount',
    uniqueCustomers
);

updateElement(
    'averageOrderValue',
    `₹${averageOrderValue.toFixed(2)}`
);

updateElement(
    'productsSoldCount',
    totalProductsSold
);
}

// Helper function to update element content
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Render orders based on current view
function renderOrders() {
    if (currentView === 'table') {
        renderTableView();
    } else {
        renderCardsView();
    }
    
    // Show/hide empty state
    toggleEmptyState();
}
function renderRecentActivity() {

    const container =
        document.getElementById(
            'recentActivityList'
        );

    if (!container) return;

    const latestOrders =
        [...allOrders]
        .sort(
            (a, b) =>
                new Date(b.orderDate) -
                new Date(a.orderDate)
        )
        .slice(0, 6);

    container.innerHTML =
        latestOrders.map(order => `

            <div class="activity-item">

                <div class="activity-dot"></div>

                <div class="activity-content">

                    <div class="activity-title">

                        Order
                        <strong>
                            ${order.orderId}
                        </strong>

                        is currently

                        <strong>
                            ${formatStatus(order.orderStatus)}
                        </strong>

                    </div>

                    <div class="activity-time">

                        ${formatOrderDate(order.orderDate)}

                    </div>

                </div>

            </div>

        `).join('');
}

// Render table view
function renderTableView() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort orders by date (newest first)
    const sortedOrders = [...filteredOrders].sort((a, b) => 
        new Date(b.orderDate) - new Date(a.orderDate)
    );
    
    sortedOrders.forEach(order => {
        const row = createOrderTableRow(order);
        tbody.appendChild(row);
    });
}

// Create table row for order
function createOrderTableRow(order){

    const row = document.createElement('tr');

    const customerName =
    order.customer?.name || 'N/A';

    const customerEmail =
    order.customer?.email || 'N/A';

    const orderDate =
    formatOrderDate(order.orderDate);

    const amount =
    `₹${(order.totalAmount || 0).toFixed(2)}`;

    row.innerHTML = `

        <td><strong>${order.orderId}</strong></td>

        <td>${customerName}</td>

        <td>${customerEmail}</td>

        <td>${createProductsPreview(order.products)}</td>

        <td>${orderDate}</td>

        <td>${amount}</td>

        <td>${createPaymentBadge(order.paymentStatus)}</td>

        <td>${order.courierName || '-'}</td>

        <td>${order.tracking_id || '-'}</td>

        <td class="actions-cell">
            ${createActionButtons(order)}
        </td>
    `;

    return row;
}

// Render cards view
function renderCardsView() {
    const container = document.getElementById('ordersCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Sort orders by date (newest first)
    const sortedOrders = [...filteredOrders].sort((a, b) => 
        new Date(b.orderDate) - new Date(a.orderDate)
    );
    
    sortedOrders.forEach(order => {
        const card = createOrderCard(order);
        container.appendChild(card);
    });
}

// Create card for order
function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const customerName = order.customer?.name || order.customerName || 'N/A';
    const customerEmail = order.customer?.email || order.email || 'N/A';
    const orderDate = formatOrderDate(order.orderDate || order.created_at);
    const amount = `₹${(order.totalAmount || 0).toFixed(2)}`;
    
    card.innerHTML = `
        <div class="order-card-header">
            <span class="order-id">${order.orderId}</span>
            ${createStatusBadge(order.orderStatus)}
        </div>
        <div class="order-card-body">
            <div class="order-info-row">
                <span class="order-info-label">Customer:</span>
                <span class="order-info-value">${customerName}</span>
            </div>
            <div class="order-info-row">
                <span class="order-info-label">Email:</span>
                <span class="order-info-value">${customerEmail}</span>
            </div>
            <div class="order-info-row">
                <span class="order-info-label">Date:</span>
                <span class="order-info-value">${orderDate}</span>
            </div>
            <div class="order-info-row">
                <span class="order-info-label">Amount:</span>
                <span class="order-info-value">${amount}</span>
            </div>
            <div class="order-info-row">
                <span class="order-info-label">Courier:</span>
                <span class="order-info-value">${order.courierName || 'Not assigned'}</span>
            </div>
            <div class="order-info-row">
                <span class="order-info-label">Shipment ID:</span>
                <span class="order-info-value">${order.shipmentId || 'Not generated'}</span>
            </div>
        </div>
        <div class="order-card-actions">
            ${createActionButtons(order)}
        </div>
    `;
    
    return card;
}

// Create status badge
function createStatusBadge(status) {
    return `<span class="status-badge status-${status}">${formatStatus(status)}</span>`;
}

// Create payment status badge
function createPaymentBadge(status) {
    const color = status === 'paid' ? 'success-green' : 'warning-orange';
    return `<span class="status-badge status-${color}">${status.toUpperCase()}</span>`;
}


// Create courier dropdown
function createCourierDropdown(
    orderId,
    currentCourier,
    assignedCourierEmail
) {

    const matchingCouriers =
    courierUsers.filter(courier => {

        return (
            courier.company_name === currentCourier
        );
    });

    const courierOptions =
    matchingCouriers.map(courier => {

        const fullName =
        `${courier.first_name} ${courier.last_name}`;

        return `
            <option
                value="${courier.email}"
                ${courier.email === assignedCourierEmail
                    ? 'selected'
                    : ''}
            >
                ${fullName}
            </option>
        `;
    }).join('');

    return `

        <div class="courier-assignment-box">

            <select
                class="courier-dropdown"
                onchange="
                    updateCourierCompany(
                        '${orderId}',
                        this.value
                    )
                "
            >

                <option value="">
                    Select Company
                </option>

                ${COURIERS.map(company => `

                    <option
                        value="${company}"
                        ${company === currentCourier
                            ? 'selected'
                            : ''}
                    >
                        ${company}
                    </option>

                `).join('')}

            </select>

            <select
                class="courier-dropdown courier-person-dropdown"
                onchange="
                    assignCourierPerson(
                        '${orderId}',
                        this.value
                    )
                "
            >

                <option value="">
                    Select Courier
                </option>

                ${courierOptions}

            </select>

        </div>
    `;
}

function createProductsPreview(products = []) {

    if (!products.length) {

        return 'No products';
    }

    return products.map(product => {

        return `
            <div class="product-preview">

                <img
                    src="${product.image || 'https://via.placeholder.com/40'}"
                    class="product-preview-img"
                >

                <div class="product-preview-info">

                    <div class="product-preview-name">
                        ${product.name}
                    </div>

                    <div class="product-preview-qty">
                        Qty: ${product.quantity}
                    </div>

                </div>

            </div>
        `;
    }).join('');
}

// Create action buttons
function createActionButtons(order){

    return `

        <button
            class="action-btn view-btn-action"
            onclick="viewOrderDetails('${order.orderId}')"
        >
            <i class="fas fa-eye"></i>
            View
        </button>

        <button
            class="action-btn invoice-btn"
            onclick="downloadInvoice('${order.orderId}')"
        >
            <i class="fas fa-file-pdf"></i>
            Invoice
        </button>
    `;
}
// Update order status
async function updateOrderStatus(orderId, newStatus) {

    try {

        const order = allOrders.find(
            order => order.orderId === orderId
        );

        if (!order) return;

        // UPDATE ORDER STATUS
        await fetch(
            `http://localhost:7000/api/orders/${order.id}/status`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    order_status: newStatus
                })
            }
        );

        // TRACKING MESSAGE
        let trackingMessage = "";

        switch(newStatus) {

            case "processing":
                trackingMessage =
                    "Your order is being processed";
                break;

            case "packed":
                trackingMessage =
                    "Your order has been packed";
                break;

            case "shipped":
                trackingMessage =
                    "Your package has been shipped";
                break;

            case "out_for_delivery":
                trackingMessage =
                    "Your package is out for delivery";
                break;

            case "delivered":
                trackingMessage =
                    "Package delivered successfully";
                break;

            case "cancelled":
                trackingMessage =
                    "Order has been cancelled";
                break;

            default:
                trackingMessage =
                    "Order status updated";
        }

        // INSERT TRACKING ENTRY
        await fetch(
            "http://localhost:7000/api/tracking",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({

                    order_id: order.id,

                    status: formatStatus(newStatus),

                    location: "Warehouse",

                    description: trackingMessage
                })
            }
        );

        // UPDATE UI
        order.orderStatus = newStatus;

        renderDashboard();

        showNotification(
            `Order updated to ${formatStatus(newStatus)}`,
            "success"
        );

    } catch(error) {

        (
            "Status Update Error:",
            error
        );

        showNotification(
            "Failed to update order",
            "error"
        );
    }
}

// Update courier
async function updateCourierCompany(orderId, newCourier) {

    try {

        const response = await fetch(
            `http://localhost:7000/api/orders/${orderId}/courier`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({

                    courier_name: newCourier,

                    assigned_courier_email: null,

                    assigned_courier_id: null
                })
            }
        );

        const data = await response.json();

        if (data.success) {

            showNotification(
                "Courier company updated",
                "success"
            );

            loadOrders();
        }

    } catch(error) {

        (error);
    }
}

async function assignCourierPerson(
    orderId,
    courierEmail
) {

    try {

        const courier =
        courierUsers.find(
            c => c.email === courierEmail
        );

        if (!courier) {

            showNotification(
                "Courier not found",
                "error"
            );

            return;
        }

        (
            "Assigning Courier:",
            courier
        );

        const response =
        await fetch(
            `http://localhost:7000/api/orders/${orderId}/courier`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    courier_name:
                        courier.company_name,

                    courier_id:
                        courier.id,

                    assigned_courier_email:
                        courier.email
                })
            }
        );

        const data =
        await response.json();

        (
            "Courier Assign Response:",
            data
        );

        if (data.success) {

            showNotification(
                "Courier assigned successfully",
                "success"
            );

            loadOrders();

        } else {

            showNotification(
                "Assignment failed",
                "error"
            );
        }

    } catch(error) {

        (
            "COURIER ASSIGN ERROR:",
            error
        );

        showNotification(
            "Assignment failed",
            "error"
        );
    }
}

// Generate shipment ID

// View order details
function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.orderId === orderId);
    if (!order) return;
    
    const modal = document.getElementById('orderModal');
    const modalBody = document.getElementById('modalBody');
    
    if (modalBody) {
        modalBody.innerHTML = createOrderDetailsHTML(order);
    }
    
    if (modal) {
        modal.style.display = 'block';
    }
}

// Create order details HTML
function createOrderDetailsHTML(order) {
    const customerName = order.customer?.name || order.customerName || 'N/A';
    const customerEmail = order.customer?.email || order.email || 'N/A';
    const customerPhone = order.customer?.phone || order.phone || 'N/A';
    const customerAddress = order.customer?.address || order.address || 'N/A';
    const orderDate = formatOrderDate(order.orderDate || order.created_at);
    const amount = `₹${(order.totalAmount || 0).toFixed(2)}`;
    
    const productsHTML = (order.products || []).map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>₹${(product.price || 0).toFixed(2)}</td>
            <td>₹${((product.price || 0) * product.quantity).toFixed(2)}</td>
        </tr>
    `).join('');
    
    return `
        <div class="order-details">
            <div class="detail-section">
                <h3>Order Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Order ID:</label>
                        <span>${order.orderId}</span>
                    </div>
                    <div class="detail-item">
                        <label>Order Date:</label>
                        <span>${orderDate}</span>
                    </div>
                    <div class="detail-item">
                        <label>Total Amount:</label>
                        <span>${amount}</span>
                    </div>
                    <div class="detail-item">
                        <label>Payment Status:</label>
                        <span>${createPaymentBadge(order.paymentStatus)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Order Status:</label>
                        <span>${createStatusBadge(order.orderStatus)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Courier:</label>
                        <span>${order.courierName || 'Not assigned'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Shipment ID:</label>
                        <span>${order.shipmentId || 'Not generated'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Customer Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${customerName}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${customerEmail}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${customerPhone}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>Address:</label>
                        <span>${customerAddress}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Order Items</h3>
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsHTML}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="detail-section">

    <h3>Order Timeline</h3>

    ${createTimelineHTML(order.orderStatus)}

</div>
        <style>
            .order-details {
                max-width: 100%;
            }
            .detail-section {
                margin-bottom: 2rem;
            }
            .detail-section h3 {
                color: var(--primary-olive);
                margin-bottom: 1rem;
                font-family: 'Playfair Display', serif;
            }
            .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
            }
            .detail-item {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            .detail-item.full-width {
                grid-column: 1 / -1;
            }
            .detail-item label {
                font-weight: 600;
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            .detail-item span {
                color: var(--text-primary);
            }
            .products-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 1rem;
            }
            .products-table th,
            .products-table td {
                padding: 0.75rem;
                text-align: left;
                border-bottom: 1px solid var(--border-light);
            }
            .products-table th {
                background: var(--muted-cream);
                font-weight: 600;
            }
                .timeline-container {

    display: flex;

    justify-content: space-between;

    gap: 10px;

    margin-top: 20px;

    flex-wrap: wrap;
}

.timeline-step {

    display: flex;

    flex-direction: column;

    align-items: center;

    flex: 1;
}

.timeline-circle {

    width: 40px;

    height: 40px;

    border-radius: 50%;

    background: #dcdcdc;

    color: white;

    display: flex;

    align-items: center;

    justify-content: center;

    font-weight: bold;

    margin-bottom: 8px;
}

.timeline-circle.active {

    background: #556B2F;
}

.timeline-label {

    font-size: 12px;

    text-align: center;

    color: #333;
}
        </style>
    `;
}

// Close modal
function closeModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Toggle view (table/cards)
function toggleView(view) {
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Show/hide views
    const tableView = document.getElementById('tableView');
    const cardsView = document.getElementById('cardsView');
    
    if (tableView) {
        tableView.style.display = view === 'table' ? 'block' : 'none';
    }
    
    if (cardsView) {
        cardsView.style.display = view === 'cards' ? 'block' : 'none';
    }
    
    renderOrders();
}

// Handle global search
function handleGlobalSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const clearBtn = document.getElementById('clearGlobalSearch');
    
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'block' : 'none';
    }
    
    if (searchTerm === '') {
        filteredOrders = [...allOrders];
    } else {
        filteredOrders = allOrders.filter(order => {
            const customerName = (order.customer?.name || order.customerName || '').toLowerCase();
            const customerEmail = (order.customer?.email || order.email || '').toLowerCase();
            const orderId = order.orderId.toLowerCase();
            
            return customerName.includes(searchTerm) || 
                   customerEmail.includes(searchTerm) || 
                   orderId.includes(searchTerm);
        });
    }
    
    renderOrders();
}

// Clear global search input
function clearGlobalSearchInput() {
    const searchInput = document.getElementById('globalSearchInput');
    const clearBtn = document.getElementById('clearGlobalSearch');
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    filteredOrders = [...allOrders];
    renderOrders();
}

// Filter orders by status
function filterOrders() {

    const statusFilter =
        document.getElementById(
            'statusFilter'
        );

    const courierFilter =
        document.getElementById(
            'courierFilter'
        );

    const shipmentSearch =
        document.getElementById(
            'shipmentSearchInput'
        );

    const sortOrders =
        document.getElementById(
            'sortOrders'
        );

    const selectedStatus =
        statusFilter?.value || '';

    const selectedCourier =
        courierFilter?.value || '';

    const shipmentSearchTerm =
        shipmentSearch?.value
        ?.toLowerCase() || '';

    const sortValue =
        sortOrders?.value || 'latest';

    filteredOrders =
        [...allOrders].filter(order => {

            const matchesStatus =
                !selectedStatus ||
                order.orderStatus === selectedStatus;

            const matchesCourier =
                !selectedCourier ||
                order.courierName === selectedCourier;

            const matchesShipment =
                !shipmentSearchTerm ||
                (order.shipmentId || '')
                .toLowerCase()
                .includes(shipmentSearchTerm);

            return (
                matchesStatus &&
                matchesCourier &&
                matchesShipment
            );
        });

    // SORTING

    if (sortValue === 'latest') {

        filteredOrders.sort(
            (a, b) =>
                new Date(b.orderDate) -
                new Date(a.orderDate)
        );
    }

    if (sortValue === 'oldest') {

        filteredOrders.sort(
            (a, b) =>
                new Date(a.orderDate) -
                new Date(b.orderDate)
        );
    }

    if (sortValue === 'high') {

        filteredOrders.sort(
            (a, b) =>
                b.totalAmount -
                a.totalAmount
        );
    }

    if (sortValue === 'low') {

        filteredOrders.sort(
            (a, b) =>
                a.totalAmount -
                b.totalAmount
        );
    }

    renderOrders();
}
// Refresh dashboard
function refreshDashboard() {
    loadOrders();
    renderDashboard();
    showNotification('Dashboard refreshed');
}

// Toggle empty state
function toggleEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const tableView = document.getElementById('tableView');
    const cardsView = document.getElementById('cardsView');
    
    const hasOrders = filteredOrders.length > 0;
    
    if (emptyState) {
        emptyState.style.display = hasOrders ? 'none' : 'block';
    }
    
    if (tableView) {
        tableView.style.display = hasOrders && currentView === 'table' ? 'block' : 'none';
    }
    
    if (cardsView) {
        cardsView.style.display = hasOrders && currentView === 'cards' ? 'block' : 'none';
    }
}

// Save orders to localStorage
function saveOrders() {
    try {
        localStorage.setItem('orders', JSON.stringify(allOrders));
    } catch (error) {
        ('Error saving orders:', error);
        showNotification('Error saving orders', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Set colors based on type
    let bgColor;
    switch(type) {
        case 'success':
            bgColor = 'var(--success-green)';
            break;
        case 'warning':
            bgColor = 'var(--warning-orange)';
            break;
        case 'error':
            bgColor = 'var(--danger-red)';
            break;
        default:
            bgColor = 'var(--primary-olive)';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${bgColor};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Handle logout
function handleLogout() {

    // REMOVE USER SESSION
    localStorage.removeItem(
        "divineYouUser"
    );

    localStorage.removeItem(
        "divineYouAuthToken"
    );

    // REMOVE ALL POSSIBLE CARTS
    Object.keys(localStorage).forEach(key => {

        if (
            key.startsWith("divineYouCart_") ||
            key === "divineYouGuestCart"
        ) {

            localStorage.removeItem(key);
        }
    });

    // REDIRECT DIRECTLY
    window.location.replace(
        "index.html"
    );
}
// Utility functions
function formatOrderDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        const options = {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        return 'N/A';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'N/A';
    }
}

function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
function createTimelineHTML(currentStatus) {

    const statuses = [
        'pending',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered'
    ];

    const currentIndex =
        statuses.indexOf(currentStatus);

    return `
        <div class="timeline-container">

            ${statuses.map((status, index) => `

                <div class="timeline-step">

                    <div class="
                        timeline-circle
                        ${index <= currentIndex
                            ? 'active'
                            : ''}
                    ">
                        ✓
                    </div>

                    <div class="timeline-label">
                        ${formatStatus(status)}
                    </div>

                </div>

            `).join('')}

        </div>
    `;
}
// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

async function downloadInvoice(orderId) {

    const order =
        allOrders.find(
            o => o.orderId === orderId
        );

    if (!order) return;

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    // COLORS

    const olive = [94, 111, 82];

    // HEADER

    doc.setFillColor(...olive);

    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);

    doc.setFontSize(26);

    doc.text(
        'AYUR LEAF',
        20,
        20
    );

    doc.setFontSize(14);

    doc.text(
        'INVOICE',
        160,
        20
    );

    // RESET TEXT COLOR

    doc.setTextColor(0, 0, 0);

    let y = 50;

    // ORDER INFO BOX

    doc.setDrawColor(220);

    doc.roundedRect(
        15,
        y,
        180,
        28,
        3,
        3
    );

    doc.setFontSize(12);

    doc.text(
        `Order ID: ${order.orderId}`,
        22,
        y + 10
    );

    doc.text(
        `Date: ${formatOrderDate(order.orderDate)}`,
        22,
        y + 20
    );

    doc.text(
        `Payment: ${order.paymentStatus}`,
        120,
        y + 10
    );

    doc.text(
        `Status: ${formatStatus(order.orderStatus)}`,
        120,
        y + 20
    );

    y += 40;

    // CUSTOMER SECTION

    doc.setFontSize(16);

    doc.setTextColor(...olive);

    doc.text(
        'Customer Details',
        15,
        y
    );

    doc.setTextColor(0,0,0);

    y += 10;

    doc.roundedRect(
        15,
        y,
        180,
        40,
        3,
        3
    );

    doc.setFontSize(11);

    doc.text(
        `Name: ${order.customer?.name || 'N/A'}`,
        22,
        y + 10
    );

    doc.text(
        `Email: ${order.customer?.email || 'N/A'}`,
        22,
        y + 20
    );

    doc.text(
        `Phone: ${order.customer?.phone || 'N/A'}`,
        22,
        y + 30
    );

    const address =
        order.customer?.address || 'N/A';

    doc.text(
        `Address: ${address}`,
        100,
        y + 10,
        { maxWidth: 80 }
    );

    y += 55;

    // PRODUCTS TITLE

    doc.setFontSize(16);

    doc.setTextColor(...olive);

    doc.text(
        'Products',
        15,
        y
    );

    y += 10;

    // TABLE HEADER

    doc.setFillColor(...olive);

    doc.rect(15, y, 180, 10, 'F');

    doc.setTextColor(255,255,255);

    doc.setFontSize(11);

    doc.text('Product', 20, y + 7);

    doc.text('Qty', 110, y + 7);

    doc.text('Price', 135, y + 7);

    doc.text('Total', 165, y + 7);

    y += 10;

    // PRODUCTS

    doc.setTextColor(0,0,0);

    (order.products || []).forEach(product => {

        const total =
            product.quantity * product.price;

        doc.rect(15, y, 180, 10);

        doc.text(
            product.name,
            20,
            y + 7
        );

        doc.text(
            String(product.quantity),
            112,
            y + 7
        );

        doc.text(
            `₹${product.price}`,
            135,
            y + 7
        );

        doc.text(
            `₹${total}`,
            165,
            y + 7
        );

        y += 10;
    });

    y += 15;

    // TOTAL SECTION

    doc.setFillColor(245,245,245);

    doc.roundedRect(
        120,
        y,
        75,
        25,
        3,
        3,
        'F'
    );

    doc.setFontSize(12);

    doc.text(
        `Grand Total`,
        128,
        y + 10
    );

    doc.setFontSize(18);

    doc.setTextColor(...olive);

    doc.text(
        `₹${order.totalAmount.toFixed(2)}`,
        128,
        y + 20
    );

    doc.setTextColor(0,0,0);

    y += 40;

    // SHIPMENT INFO

    doc.setFontSize(14);

    doc.setTextColor(...olive);

    doc.text(
        'Shipment Details',
        15,
        y
    );

    doc.setTextColor(0,0,0);

    y += 10;

    doc.roundedRect(
        15,
        y,
        180,
        25,
        3,
        3
    );

    doc.setFontSize(11);

    doc.text(
        `Shipment ID: ${order.shipmentId || 'Not Generated'}`,
        22,
        y + 10
    );

    doc.text(
        `Courier: ${order.courierName || 'Not Assigned'}`,
        22,
        y + 20
    );

    // FOOTER

    doc.setFontSize(10);

    doc.setTextColor(120);

    doc.text(
        'Thank you for shopping with Ayur Leaf',
        60,
        285
    );

    // SAVE

    doc.save(
        `Invoice-${order.orderId}.pdf`
    );
}
// OPEN COURIER MODAL

function openCourierModal() {

    document.getElementById(
        "courierModal"
    ).style.display = "block";
}

// CLOSE COURIER MODAL

function closeCourierModal() {

    document.getElementById(
        "courierModal"
    ).style.display = "none";
}

// CREATE COURIER

async function createCourier(event) {

    event.preventDefault();

    try {

        const first_name =
            document.getElementById(
                "courierFirstName"
            ).value;

        const last_name =
            document.getElementById(
                "courierLastName"
            ).value;

       const email =
    document.getElementById(
        "courierEmail"
    ).value;

const phone =
    document.getElementById(
        "courierPhone"
    ).value;

const password =document.getElementById(
                "courierPassword"
            ).value;

        const company_name =
            document.getElementById(
                "courierCompany"
            ).value;

        const response =
            await fetch(
                "http://localhost:7000/api/users/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                        "application/json"
                    },

                    body: JSON.stringify({
                        first_name,
                        last_name,
                        email,
                        phone,
                        password,
                        role: "courier",
                        company_name

                    })
                }
            );

        const data =
            await response.json();

        if (data.success) {

            showNotification(
                "Courier created successfully",
                "success"
            );

            closeCourierModal();

            document.getElementById(
                "courierForm"
            ).reset();

        } else {

            showNotification(
                data.message ||
                "Failed to create courier",
                "error"
            );
        }

    } catch(error) {

        (error);

        showNotification(
            "Server error",
            "error"
        );
    }
}

function openMedusaAdmin() {

    window.open(
        "http://localhost:9000/app",
        "_blank"
    );
}