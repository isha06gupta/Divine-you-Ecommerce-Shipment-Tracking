// Order History Management
let currentUser = null;
let allOrders = [];
let filteredOrders = [];

// Cart state (matching shop.js)
let cart = [];

// DOM elements
const ordersList = document.getElementById('ordersList');
const emptyState = document.getElementById('emptyState');
const noSearchResults = document.getElementById('noSearchResults');
const orderSearchInput = document.getElementById('orderSearchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    loadOrders();
    setupProfileDropdown();
    setupSearchFunctionality();
    loadCart();
    updateCartUI();
});

// Initialize authentication state
function initializeAuth() {
    // Check if user is logged in (same logic as shop.js)
    const userStr = localStorage.getItem('divineYouUser');
    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
        } catch (e) {
            console.error('Error parsing user data:', e);
            currentUser = null;
        }
    }
    
    // If no user is logged in, redirect to shop page
    if (!currentUser) {
        window.location.href = 'shop.html';
        return;
    }
}

// Setup profile dropdown
function setupProfileDropdown() {
    const dropdownContent = document.getElementById('dropdownContent');
    
    if (currentUser) {
        dropdownContent.innerHTML = `
            <div class="dropdown-item" onclick="handleAccount()">
                <i class="fas fa-user"></i>
                <span>Account</span>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item logout-item" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </div>
        `;
    } else {
        dropdownContent.innerHTML = `
            <div class="dropdown-item" onclick="handleLogin()">
                <i class="fas fa-sign-in-alt"></i>
                <span>Login</span>
            </div>
            <div class="dropdown-item" onclick="handleRegister()">
                <i class="fas fa-user-plus"></i>
                <span>Register</span>
            </div>
        `;
    }
}

// Load orders from localStorage
async function loadOrders() {

    console.log("📦 Loading orders from database...");

    try {

        const response = await fetch(
            "http://localhost:7000/api/orders"
        );

        const data = await response.json();

        console.log("Fetched Orders:", data);

        if (data.success) {

            allOrders = data.orders.map(order => {

                return {

                    id: order.id,

                    orderId: order.order_id,

                    shipmentId: order.shipment_id,
                    created_at: order.created_at,

                    orderStatus: order.order_status,

                    total: Number(order.total_amount || 0),

                    paymentStatus: order.payment_status,

                    customerName: order.first_name || "Customer",

                    customerEmail: order.email,
address: order.address,
trackingId: order.tracking_id,
                    shipmentId: order.shipment_id,

                    courierName: order.courier_name,

                    phone: order.phone,
                    shipmentId: order.shipment_id,

                    items: (order.items || []).map(item => ({

                        id: item.product_id,

                        title: item.product_title,

                        quantity: item.quantity,

                        price: Number(item.price || 0),

                        image: item.image_url

                    }))
                };
            });

        } else {

            allOrders = [];
        }

        console.log("All Orders:", allOrders);

        filterUserOrders();

        renderOrders();

    } catch (error) {

        console.error("❌ Error loading orders:", error);

        allOrders = [];

        filteredOrders = [];

        renderOrders();
    }
}
// Filter orders for current user
function filterUserOrders() {

    console.log('Current User:', currentUser);

    console.log('All Orders:', allOrders);

    if (!currentUser) {

        filteredOrders = [];

        return;
    }

    filteredOrders = allOrders.filter(order => {

        return (
            order.customerEmail === currentUser.email
        );
    });

    filteredOrders.sort((a, b) => {

        const dateA = new Date(a.created_at || 0);

        const dateB = new Date(b.created_at || 0);

        return dateB - dateA;
    });

    
    console.log(
    "FIRST FILTERED ORDER:",
    filteredOrders[0]
);
}
// Render orders to the page
function renderOrders(ordersToRender = filteredOrders) {
    if (ordersToRender.length === 0) {
        showEmptyState();
        return;
    }
    
    hideEmptyStates();
    
    const ordersHTML = ordersToRender.map(order => createOrderCard(order)).join('');
    ordersList.innerHTML = ordersHTML;
    
    // Add fade-in animation
    ordersList.classList.add('fade-in');
}

// Create order card HTML
function createOrderCard(order) {

    const orderDate =
        formatDate(order.created_at);

    const orderStatus =
        order.orderStatus || 'pending';

    const firstItem =
        order.items &&
        order.items.length > 0
            ? order.items[0]
            : null;

    const productImage =
        firstItem?.image ||
        'https://via.placeholder.com/80x80';

    const productTitle =
        firstItem?.title ||
        'Order Items';

    const itemCount =
        order.items
            ? order.items.length
            : 0;

    const titleText =
        itemCount > 1
            ? `${productTitle} +${itemCount - 1} more`
            : productTitle;

    const customerName =
        order.customerName ||
        'Customer';

    const totalAmount =
        formatCurrency(order.total || 0);

    return `

        <div class="order-card">

            <div class="order-header">

                <div class="order-info">

                    <div class="order-id">
                        Order #${order.orderId}
                    </div>

                    <div class="order-date">
                        Placed on ${orderDate}
                    </div>

                </div>

                <div class="order-status status-${orderStatus.toLowerCase()}">

                    ${formatStatus(orderStatus)}

                </div>

            </div>

            <div class="order-content">

                <img
                    src="${productImage}"
                    alt="${productTitle}"
                    class="product-image"
                >

                <div class="product-info">

                    <div class="product-title">
                        ${titleText}
                    </div>

                    <div class="product-meta">
                        Shipped to:
                        ${customerName}
                    </div>

                </div>

                <div class="order-details">

                    <div class="order-total">
                        ${totalAmount}
                    </div>

                    <div class="shipping-info">

                        ${itemCount}
                        item${itemCount !== 1 ? 's' : ''}

                    </div>

                </div>

            </div>

            <div class="order-actions">

                ${
                    order.shipmentId

                    ?

                    `
                    <button
                        class="action-btn"
                        onclick="trackPackage('${order.shipmentId}')"
                    >
                        <i class="fas fa-truck"></i>
                        Track Package
                    </button>
                    `

                    :

                    `
                    <button
                        class="action-btn"
                        disabled
                        style="
                            opacity:0.6;
                            cursor:not-allowed;
                        "
                    >
                        <i class="fas fa-clock"></i>
                        Shipment Pending
                    </button>
                    `
                }

                <button
                    class="action-btn"
                    onclick="viewOrderDetails('${order.orderId}')"
                >
                    <i class="fas fa-eye"></i>
                    View Order Details
                </button>

                <button
    class="action-btn"
    onclick="downloadInvoice('${order.orderId}')"
>
    <i class="fas fa-file-pdf"></i>
    Invoice
</button>

<button
    class="action-btn primary"
    onclick="buyAgain('${order.orderId}')"
>
    <i class="fas fa-redo"></i>
    Buy Again
</button>

S

            </div>

        </div>
    `;
}
// Format date
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return 'Invalid date';
    }
}

// Format currency
function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return `₹${num.toFixed(2)}`;
}

// Format status text
function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'processing': 'Processing',
        'shipped': 'Shipped',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled',
        'returned': 'Returned'
    };
    
    return statusMap[status?.toLowerCase()] || status || 'Pending';
}

// Show empty state
function showEmptyState() {
    ordersList.style.display = 'none';
    emptyState.style.display = 'block';
    noSearchResults.style.display = 'none';
}

// Show no search results
function showNoSearchResults() {
    ordersList.style.display = 'none';
    emptyState.style.display = 'none';
    noSearchResults.style.display = 'block';
}

// Hide all empty states
function hideEmptyStates() {
    ordersList.style.display = 'grid';
    emptyState.style.display = 'none';
    noSearchResults.style.display = 'none';
}

// Setup search functionality
function setupSearchFunctionality() {
    // Add input event listener for real-time search
    orderSearchInput.addEventListener('input', searchOrders);
    
    // Add clear button functionality
    clearSearchBtn.addEventListener('click', clearSearch);
}

// Search orders
function searchOrders() {
    const searchTerm = orderSearchInput.value.trim().toLowerCase();
    
    // Show/hide clear button
    clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    
    if (!searchTerm) {
        renderOrders();
        return;
    }
    
    const searchResults = filteredOrders.filter(order => {
        // Search by order ID
        const orderId = (order.orderId || order.id || '').toString().toLowerCase();
        if (orderId.includes(searchTerm)) {
            return true;
        }
        
        // Search by product names
        if (order.items) {
            return order.items.some(item => {
                const title = (item.title || item.name || '').toLowerCase();
                return title.includes(searchTerm);
            });
        }
        
        return false;
    });
    
    if (searchResults.length === 0) {
        showNoSearchResults();
    } else {
        renderOrders(searchResults);
    }
}

// Clear search
function clearSearch() {
    orderSearchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderOrders();
}

function trackPackage(shipmentId) {

    window.location.href =
    "https://www.delhivery.com/";
}

function viewOrderDetails(orderId) {

    const order =
        allOrders.find(
            o => (o.orderId || o.id) === orderId
        );

    if (!order) return;

    const itemsHTML =
        order.items && order.items.length > 0

        ?

        order.items.map(item => `

            <div
                style="
                    padding:12px;
                    border-bottom:1px solid #ddd;
                "
            >

                <div>
                    <b>
                        ${item.title || item.name}
                    </b>
                </div>

                <div>
                    Quantity:
                    ${item.quantity || 1}
                </div>

                <div>
                    Price:
                    ${formatCurrency(item.price || 0)}
                </div>

            </div>

        `).join("")

        :

        "<p>No items found</p>";

    const html = `

        <div style="padding:10px;">

            <p>
                <b>Order ID:</b>
                ${order.orderId}
            </p>

            <p>
                <b>Date:</b>
                ${formatDate(order.created_at)}
            </p>

            <p>
                <b>Status:</b>
                ${formatStatus(order.orderStatus)}
            </p>

            <p>
                <b>Payment Status:</b>
                ${order.paymentStatus || "Pending"}
            </p>

            <p>
                <b>Customer:</b>
                ${order.customerName || "N/A"}
            </p>

            <p>
                <b>Email:</b>
                ${order.customerEmail || "N/A"}
            </p>

            <p>
                <b>Shipment ID:</b>
                ${order.shipmentId || "Not Generated"}
            </p>

            <p>
                <b>Courier:</b>
                ${order.courierName || "Not Assigned"}
            </p>

            <p>
                <b>Total:</b>
                ${formatCurrency(order.total || 0)}
            </p>

            <hr>

            <h3>
                Ordered Items
            </h3>

            ${itemsHTML}

        </div>
    `;

    document.getElementById(
        "orderModalBody"
    ).innerHTML = html;

    document.getElementById(
        "orderModal"
    ).style.display = "flex";
}
function closeOrderModal() {

    document.getElementById(
        "orderModal"
    ).style.display = "none";
}

window.closeOrderModal =
    closeOrderModal;


function buyAgain(orderId) {
    // Find the order
    const order = allOrders.find(o => (o.orderId || o.id) === orderId);
    if (!order) return;
    
    // Add items back to cart (simplified version)
    if (order.items && order.items.length > 0) {
        // Get current cart
        let cart = [];
        const cartStr = localStorage.getItem('ayurLeafCart');
        if (cartStr) {
            try {
                cart = JSON.parse(cartStr);
            } catch (e) {
                cart = [];
            }
        }
        
        // Add items to cart
        order.items.forEach(item => {
            const cartItem = {
                id: item.id || item.productId,
                title: item.title || item.name,
                price: item.price,
                quantity: item.quantity || 1,
                image: item.image,
                variant: item.variant || null
            };
            
            // Check if item already exists in cart
            const existingIndex = cart.findIndex(cartItem => 
                cartItem.id === item.id && 
                JSON.stringify(cartItem.variant) === JSON.stringify(item.variant)
            );
            
            if (existingIndex >= 0) {
                cart[existingIndex].quantity += (item.quantity || 1);
            } else {
                cart.push(cartItem);
            }
        });
        
        // Save cart
        localStorage.setItem('ayurLeafCart', JSON.stringify(cart));
        
        // Show success message and redirect to shop
        alert(`Items from order #${orderId} have been added to your cart!`);
        window.location.href = 'shop.html';
    }
}
async function downloadInvoice(orderId) {

    const order = allOrders.find(
        o => (o.orderId || o.id) === orderId
    );

    if (!order) return;

    let productsText = "";

    if (order.items && order.items.length > 0) {

        order.items.forEach((item, index) => {

            productsText += `
${index + 1}. ${item.title || item.name || 'Product'}

   Quantity : ${item.quantity || 1}

   Price    : ₹${item.price || 0}

   Total    : ₹${(item.price || 0) * (item.quantity || 1)}


`;
        });

    } else {

        productsText = "No Products Found";
    }

    const invoiceText = `

DIVINE YOU
========================================

                INVOICE


Order ID       : ${order.orderId}

Date           : ${formatDate(order.created_at)}

Customer Name  : ${order.customerName}

Email          : ${order.customerEmail}

Phone          : ${order.phone || 'N/A'}

Payment Status : ${order.paymentStatus}


SHIPPING ADDRESS
----------------------------------------

${order.address || 'N/A'}


ORDERED PRODUCTS
========================================

${productsText}

========================================

Subtotal       : ₹${order.subtotal || order.total}

Shipping Charge: ₹${order.shippingCharge || 50}

Grand Total    : ₹${order.total}

========================================

Thank you for shopping with Divine You

`;

    const element = document.createElement("pre");

    element.innerText = invoiceText;

    element.style.fontFamily = "Arial";
    element.style.whiteSpace = "pre-wrap";
    element.style.padding = "30px";
    element.style.background = "white";
    element.style.color = "black";
    element.style.width = "700px";
    element.style.fontSize = "16px";
    element.style.lineHeight = "1.8";

    document.body.appendChild(element);

    const options = {

        margin: 0.5,

        filename: `Invoice-${order.orderId}.pdf`,

        image: {
            type: 'jpeg',
            quality: 1
        },

        html2canvas: {
            scale: 2
        },

        jsPDF: {
            unit: 'in',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    await html2pdf()
        .set(options)
        .from(element)
        .save();

    document.body.removeChild(element);
}

window.downloadInvoice = downloadInvoice;

window.downloadInvoice =
    downloadInvoice;

// Profile dropdown functions (matching shop.js)
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('active');
}

function handleOrderHistory() {
    // Already on order history page
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('active');
}
function handleAccount() {

    const dropdown =
    document.getElementById(
        'profileDropdown'
    );

    if (dropdown) {
        dropdown.classList.remove(
            'active'
        );
    }

    window.location.href =
    'account.html';
}

function handleLogout() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('active');
    
    // Clear user data (same keys as shop.js)
    localStorage.removeItem('divineYouUser');
    localStorage.removeItem('divineYouAuthToken');
    currentUser = null;
    
    // Redirect to shop
    window.location.href = 'shop.html';
}

function handleLogin() {
    window.location.href = 'shop.html';
}

function handleRegister() {
    window.location.href = 'shop.html';
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    const profileBtn = document.querySelector('.profile-btn');
    
    if (dropdown && !dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Cart functions (matching shop.js)
function loadCart() {
    const userCartKey = getUserCartKey();
    const cartStr = localStorage.getItem(userCartKey);
    if (cartStr) {
        try {
            cart = JSON.parse(cartStr);
        } catch (e) {
            console.error('Error parsing cart data:', e);
            cart = [];
        }
    }
}

function getUserCartKey() {
    if (currentUser && currentUser.id) {
        return `ayurLeafCart_${currentUser.id}`;
    }
    return 'ayurLeafGuestCart';
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function toggleCart() {
    // For now, redirect to shop page to access cart
    window.location.href = 'shop.html';
}



// Export functions for global access
window.trackPackage = trackPackage;
window.viewOrderDetails = viewOrderDetails;
window.buyAgain = buyAgain;
window.searchOrders = searchOrders;
window.clearSearch = clearSearch;
window.toggleProfileDropdown = toggleProfileDropdown;
window.handleOrderHistory = handleOrderHistory;
window.handleAccount = handleAccount;
window.handleLogout = handleLogout;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.toggleCart = toggleCart;
globalThis.handleAccount =handleAccount;
