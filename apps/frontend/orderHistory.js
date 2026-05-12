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
    const userStr = localStorage.getItem('ayurLeafUser');
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
function loadOrders() {
    console.log('🔍 Loading orders from localStorage...');
    
    try {
        const ordersStr = localStorage.getItem('orders');
        console.log('📦 Raw orders string:', ordersStr);
        
        if (ordersStr) {
            allOrders = JSON.parse(ordersStr);
            console.log('📦 Parsed orders:', allOrders);
            console.log('📦 Total orders found:', allOrders.length);
        } else {
            console.log('📦 No orders found in localStorage');
            allOrders = [];
        }
    } catch (e) {
        console.error('❌ Error loading orders:', e);
        allOrders = [];
    }
    
    // Filter orders for current user
    filterUserOrders();
    renderOrders();
}

// Filter orders for current user
function filterUserOrders() {
    console.log('Current User:', currentUser);
    console.log('All Orders:', allOrders);
    
    if (!currentUser) {
        console.log('❌ No current user, filtering to empty array');
        filteredOrders = [];
        return;
    }
    
    console.log('🔍 Filtering orders from', allOrders.length, 'total orders');
    
    filteredOrders = allOrders.filter(order => {
        console.log('🔍 Checking order:', order);
        
        // Support both old flat structure and new nested customer object structure
        const matches = 
            // Old structure (flat properties)
            order.userEmail === currentUser.email || 
            order.userId === currentUser.id ||
            order.customerEmail === currentUser.email ||
            // New structure (nested customer object)
            order.customer?.email === currentUser.email ||
            order.customer?.id === currentUser.id;
        
        console.log('🔍 Order matches user:', matches);
        return matches;
    });
    
    console.log('Filtered Orders:', filteredOrders.length);
    
    // Sort by date (newest first)
    filteredOrders.sort((a, b) => {
        const dateA = new Date(a.created_at || a.orderDate || 0);
        const dateB = new Date(b.created_at || b.orderDate || 0);
        return dateB - dateA;
    });
    
    console.log('Sorted orders (newest first):', filteredOrders);
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
    const orderDate = formatDate(order.created_at || order.orderDate);
    const orderStatus = order.orderStatus || 'pending';
    const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
    
    // Get product image (fallback to placeholder)
    const productImage = firstItem?.image || 'https://via.placeholder.com/80x80/f0f0f0/666?text=Product';
    
    // Get product title (show first item or order summary)
    const productTitle = firstItem?.title || firstItem?.name || 'Order Items';
    
    // Handle multiple items
    const itemCount = order.items ? order.items.length : 0;
    const titleText = itemCount > 1 ? `${productTitle} +${itemCount - 1} more` : productTitle;
    
    // Get customer name
    const customerName = order.customerName || order.shippingName || 'Customer';
    
    // Format total amount
    const totalAmount = formatCurrency(order.total || order.amount || 0);
    
    return `
        <div class="order-card">
            <div class="order-header">
                <div class="order-info">
                    <div class="order-id">Order #${order.orderId || order.id}</div>
                    <div class="order-date">Placed on ${orderDate}</div>
                </div>
                <div class="order-status status-${orderStatus.toLowerCase()}">
                    ${formatStatus(orderStatus)}
                </div>
            </div>
            
            <div class="order-content">
                <img src="${productImage}" alt="${productTitle}" class="product-image">
                <div class="product-info">
                    <div class="product-title">${titleText}</div>
                    <div class="product-meta">
                        Shipped to: ${customerName}
                    </div>
                </div>
                <div class="order-details">
                    <div class="order-total">${totalAmount}</div>
                    <div class="shipping-info">${itemCount} item${itemCount !== 1 ? 's' : ''}</div>
                </div>
            </div>
            
            <div class="order-actions">
                <button class="action-btn" onclick="trackPackage('${order.orderId || order.id}')">
                    <i class="fas fa-truck"></i>
                    Track Package
                </button>
                <button class="action-btn" onclick="viewOrderDetails('${order.orderId || order.id}')">
                    <i class="fas fa-eye"></i>
                    View Order Details
                </button>
                <button class="action-btn primary" onclick="buyAgain('${order.orderId || order.id}')">
                    <i class="fas fa-redo"></i>
                    Buy Again
                </button>
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

// Order action functions
function trackPackage(orderId) {
    // Find the order
    const order = allOrders.find(o => (o.orderId || o.id) === orderId);
    if (!order) return;
    
    // Show tracking information (placeholder for now)
    const trackingInfo = `
        Order #${orderId}
        Status: ${formatStatus(order.orderStatus)}
        
        Tracking functionality will be available soon.
        You will receive tracking updates via email.
    `;
    
    alert(trackingInfo);
}

function viewOrderDetails(orderId) {
    // Find the order
    const order = allOrders.find(o => (o.orderId || o.id) === orderId);
    if (!order) return;
    
    // Create detailed order information
    const itemsList = order.items ? order.items.map(item => 
        `- ${item.title || item.name} (${item.quantity || 1}x) - ${formatCurrency(item.price || 0)}`
    ).join('\n') : 'No items found';
    
    const orderDetails = `
ORDER DETAILS
==============
Order ID: #${orderId}
Date: ${formatDate(order.created_at || order.orderDate)}
Status: ${formatStatus(order.orderStatus)}
Payment: ${formatCurrency(order.total || order.amount || 0)}

Customer: ${order.customerName || order.shippingName || 'N/A'}
Email: ${order.userEmail || order.customerEmail || 'N/A'}
Address: ${order.address || 'N/A'}

Items:
${itemsList}

Order details page will be available soon.
    `;
    
    alert(orderDetails);
}

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
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('active');
    alert('Account page coming soon!');
}

function handleLogout() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('active');
    
    // Clear user data (same keys as shop.js)
    localStorage.removeItem('ayurLeafUser');
    localStorage.removeItem('ayurLeafAuthToken');
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