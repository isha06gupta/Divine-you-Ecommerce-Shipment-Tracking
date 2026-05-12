// Admin Dashboard JavaScript - Ayur Leaf

// Global variables
let allOrders = [];
let filteredOrders = [];
let currentView = 'table';

// Available couriers
const COURIERS = ['Delhivery', 'BlueDart', 'DTDC', 'Ekart'];

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

function initializeDashboard() {
    loadOrders();
    setupEventListeners();
    renderDashboard();
}

// Load orders from localStorage
function loadOrders() {
    try {
        const ordersData = localStorage.getItem('orders');
        if (ordersData) {
            allOrders = JSON.parse(ordersData);
            // Ensure all orders have required fields and normalize data
            allOrders = allOrders.map(order => {
                // Support both old and new total field names
                const totalAmount = order.grandTotal || order.total || order.totalAmount || 0;
                
                // Support both customer object and flat structure
                const customerName = order.customer?.name || order.customerName || order.name || 'N/A';
                const customerEmail = order.customer?.email || order.email || 'N/A';
                const customerPhone = order.customer?.phone || order.phone || 'N/A';
                const customerAddress = order.customer?.address || order.address || 'N/A';
                
                // Use created_at or orderDate, fallback to current date
                const orderDate = order.created_at || order.orderDate || new Date().toISOString();
                
                return {
                    ...order,
                    // Normalize fields
                    totalAmount: totalAmount,
                    orderStatus: order.orderStatus || order.status || 'pending',
                    courierName: order.courierName || order.courier || '',
                    shipmentId: order.shipmentId || order.trackingId || '',
                    paymentStatus: order.paymentStatus || 'paid',
                    // Ensure customer object exists
                    customer: {
                        name: customerName,
                        email: customerEmail,
                        phone: customerPhone,
                        address: customerAddress
                    },
                    // Ensure date field exists
                    orderDate: orderDate,
                    // Keep original fields for compatibility
                    orderId: order.orderId || order.id || `ORD-${Date.now()}`
                };
            });
        } else {
            // Create sample orders for testing if no orders exist
            createSampleOrders();
        }
        filteredOrders = [...allOrders];
    } catch (error) {
        console.error('Error loading orders:', error);
        allOrders = [];
        filteredOrders = [];
    }
}

// Create sample orders for testing
function createSampleOrders() {
    const sampleOrders = [
        {
            orderId: 'ORD-001',
            created_at: new Date('2024-05-10T15:45:00').toISOString(),
            grandTotal: 299.99,
            paymentStatus: 'paid',
            orderStatus: 'delivered',
            courierName: 'Delhivery',
            shipmentId: 'SHP-123456',
            customer: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                address: '123 Main St, City, State 12345'
            },
            products: [
                { name: 'Ayurvedic Shampoo', quantity: 2, price: 49.99 },
                { name: 'Herbal Soap', quantity: 4, price: 29.99 }
            ]
        },
        {
            orderId: 'ORD-002',
            created_at: new Date('2024-05-11T10:30:00').toISOString(),
            total: 199.99,
            paymentStatus: 'paid',
            orderStatus: 'shipped',
            courierName: 'BlueDart',
            shipmentId: 'SHP-789012',
            customer: {
                name: 'Jane Smith',
                email: 'jane@example.com',
                phone: '+0987654321',
                address: '456 Oak Ave, Town, State 67890'
            },
            products: [
                { name: 'Neem Face Pack', quantity: 1, price: 99.99 },
                { name: 'Aloe Vera Gel', quantity: 2, price: 49.99 }
            ]
        },
        {
            orderId: 'ORD-003',
            created_at: new Date('2024-05-12T09:15:00').toISOString(),
            totalAmount: 149.99,
            paymentStatus: 'pending',
            orderStatus: 'processing',
            courierName: '',
            shipmentId: '',
            customer: {
                name: 'Bob Johnson',
                email: 'bob@example.com',
                phone: '+1122334455',
                address: '789 Pine Rd, Village, State 13579'
            },
            products: [
                { name: 'Turmeric Capsules', quantity: 3, price: 49.99 }
            ]
        }
    ];
    
    allOrders = sampleOrders;
    localStorage.setItem('orders', JSON.stringify(allOrders));
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
}

// Render entire dashboard
function renderDashboard() {
    updateSummaryCards();
    renderOrders();
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
    
    // Update DOM
    updateElement('totalOrdersCount', totalOrders);
    updateElement('pendingOrdersCount', pendingOrders);
    updateElement('shippedOrdersCount', shippedOrders);
    updateElement('deliveredOrdersCount', deliveredOrders);
    updateElement('totalRevenueAmount', `₹${totalRevenue.toFixed(2)}`);
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
function createOrderTableRow(order) {
    const row = document.createElement('tr');
    
    const customerName = order.customer?.name || order.customerName || 'N/A';
    const customerEmail = order.customer?.email || order.email || 'N/A';
    const orderDate = formatOrderDate(order.orderDate || order.created_at);
    const amount = `₹${(order.totalAmount || 0).toFixed(2)}`;
    
    row.innerHTML = `
        <td><strong>${order.orderId}</strong></td>
        <td>${customerName}</td>
        <td>${customerEmail}</td>
        <td>${orderDate}</td>
        <td>${amount}</td>
        <td>${createPaymentBadge(order.paymentStatus)}</td>
        <td>${createStatusDropdown(order.orderId, order.orderStatus)}</td>
        <td>${createCourierDropdown(order.orderId, order.courierName)}</td>
        <td>${order.shipmentId || '-'}</td>
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

// Create status dropdown
function createStatusDropdown(orderId, currentStatus) {
    const options = ORDER_STATUSES.map(status => 
        `<option value="${status}" ${status === currentStatus ? 'selected' : ''}>${formatStatus(status)}</option>`
    ).join('');
    
    return `<select class="status-dropdown" onchange="updateOrderStatus('${orderId}', this.value)">
        ${options}
    </select>`;
}

// Create courier dropdown
function createCourierDropdown(orderId, currentCourier) {
    const options = ['<option value="">Not assigned</option>', ...COURIERS.map(courier => 
        `<option value="${courier}" ${courier === currentCourier ? 'selected' : ''}>${courier}</option>`
    )].join('');
    
    return `<select class="courier-dropdown" onchange="updateCourier('${orderId}', this.value)">
        ${options}
    </select>`;
}

// Create action buttons
function createActionButtons(order) {
    const hasShipmentId = order.shipmentId && order.shipmentId.trim() !== '';
    
    return `
        <button class="action-btn view-btn-action" onclick="viewOrderDetails('${order.orderId}')">
            <i class="fas fa-eye"></i> View
        </button>
        ${!hasShipmentId ? `
            <button class="action-btn generate-btn" onclick="generateShipmentId('${order.orderId}')">
                <i class="fas fa-tag"></i> Generate ID
            </button>
        ` : `
            <button class="action-btn generate-btn" disabled>
                <i class="fas fa-check"></i> ID Generated
            </button>
        `}
    `;
}

// Update order status
function updateOrderStatus(orderId, newStatus) {
    const orderIndex = allOrders.findIndex(order => order.orderId === orderId);
    if (orderIndex !== -1) {
        allOrders[orderIndex].orderStatus = newStatus;
        saveOrders();
        renderDashboard();
        showNotification(`Order status updated to ${formatStatus(newStatus)}`, 'success');
    }
}

// Update courier
function updateCourier(orderId, newCourier) {
    const orderIndex = allOrders.findIndex(order => order.orderId === orderId);
    if (orderIndex !== -1) {
        allOrders[orderIndex].courierName = newCourier;
        saveOrders();
        renderDashboard();
        showNotification(`Courier assigned successfully`, 'success');
    }
}

// Generate shipment ID
function generateShipmentId(orderId) {
    const orderIndex = allOrders.findIndex(order => order.orderId === orderId);
    if (orderIndex !== -1 && !allOrders[orderIndex].shipmentId) {
        const shipmentId = `SHP-${Math.floor(100000 + Math.random() * 900000)}`;
        allOrders[orderIndex].shipmentId = shipmentId;
        saveOrders();
        renderDashboard();
        showNotification(`Shipment ID generated: ${shipmentId}`, 'success');
    } else if (allOrders[orderIndex]?.shipmentId) {
        showNotification('Shipment ID already exists', 'warning');
    }
}

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
    const statusFilter = document.getElementById('statusFilter');
    const selectedStatus = statusFilter ? statusFilter.value : '';
    
    if (selectedStatus === '') {
        filteredOrders = [...allOrders];
    } else {
        filteredOrders = allOrders.filter(order => order.orderStatus === selectedStatus);
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
        console.error('Error saving orders:', error);
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
    if (confirm('Are you sure you want to logout?')) {
        // Redirect to main site or login page
        window.location.href = 'index.html';
    }
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