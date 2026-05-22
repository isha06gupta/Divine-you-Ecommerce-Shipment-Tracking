const currentUser =
JSON.parse(localStorage.getItem("divineYouUser"));

console.log("Courier User:", currentUser);

if (
    !currentUser ||
    !currentUser.role ||
    currentUser.role.toLowerCase() !== "courier"
) {

    window.location.href = "index.html";
}
// Global variables
let allOrders = [];
let filteredShipments = [];
let currentView = 'cards';
let currentCourier =currentUser.company_name || "";

// Delivery status options
const DELIVERY_STATUSES = [
    'assigned',
    'shipped',
    'in_transit',
    'out_for_delivery',
    'delivered'
];

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
                    "application/json"
                },

                body: JSON.stringify({

                    status,

                    location:
                        "Courier Hub",

                    message:
                        `Shipment moved to ${status.replace(/_/g, ' ')}`
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
// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {

    const courierName =
        `${currentUser.first_name || ""} ${currentUser.last_name || ""}`;

    const courierNameElement =
        document.getElementById("courierName");

    if (courierNameElement) {

        courierNameElement.textContent =
            courierName;
    }

    loadOrders();

    setupEventListeners();
}

// Load orders from localStorage and filter for current courier
async function loadOrders() {

    try {

        const response = await fetch(
            "http://localhost:7000/api/orders"
        );

        const data = await response.json();

        console.log(
            "Courier Orders Response:",
            data
        );
        console.log(
    "FIRST ORDER:",
    data.orders?.[0]
);

        if (!data.success) {

            throw new Error(
                "Failed to fetch orders"
            );
        }

        allOrders = (data.orders || []).map(order => {

    return {

        ...order,

        orderId: order.order_id,

        totalAmount: Number(
            order.total_amount || 0
        ),

        deliveryStatus:
            order.order_status || "assigned",


        paymentStatus:
            order.payment_status || "pending",
    
        trackingId:
            order.tracking_id || "",

        shipmentId:
        order.shipment_id || order.shipmentId ||"",

        orderDate:
            order.created_at,

        courierName:
            order.courier_name || "",

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
                    item.product_title,

                quantity:
                    item.quantity,

                price:
                    Number(item.price || 0),

                image:
                    item.image_url
            }))
    };

});

        // FILTER ONLY CURRENT COURIER ORDERS
        filteredShipments = allOrders.filter(order => {

            const orderCourierId =
    order.assigned_courier_id ||
    order.courier_id ||
    order.courierid ||
    order.courierId ||
    order["courier_id"];

    console.log(
    "ORDER COURIER:",
    orderCourierId,
    "CURRENT USER:",
    currentUser.id
);

return (
    Number(orderCourierId) ===
Number(currentUser.id)
);

        });

        console.log(
            "Filtered Courier Orders:",
            filteredShipments
        );

        renderDashboard();

    } catch (error) {

        console.error(
            "LOAD ORDERS ERROR:",
            error
        );

        allOrders = [];
        filteredShipments = [];

        renderDashboard();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    if (clearSearch) {
        clearSearch.addEventListener('click', clearSearchInput);
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterShipments);
    }
    
    // Close modals when clicking outside
    const shipmentModal = document.getElementById('shipmentModal');
    const deliveryModal = document.getElementById('deliveryModal');
    
    if (shipmentModal) {
        shipmentModal.addEventListener('click', function(e) {
            if (e.target === shipmentModal) {
                closeModal();
            }
        });
    }
    
    if (deliveryModal) {
        deliveryModal.addEventListener('click', function(e) {
            if (e.target === deliveryModal) {
                closeDeliveryModal();
            }
        });
    }
}

// Render entire dashboard
function renderDashboard() {
    updateSummaryCards();
    renderShipments();
}

// Update summary cards
function updateSummaryCards() {
    const totalShipments = filteredShipments.length;
    const inTransit = filteredShipments.filter(shipment => shipment.deliveryStatus === 'in_transit').length;
    const outForDelivery = filteredShipments.filter(shipment => shipment.deliveryStatus === 'out_for_delivery').length;
    const delivered = filteredShipments.filter(shipment => shipment.deliveryStatus === 'delivered').length;
    const pending = filteredShipments.filter(shipment => shipment.deliveryStatus === 'assigned').length;
    
    // Update DOM
    updateElement('totalShipmentsCount', totalShipments);
    updateElement('inTransitCount', inTransit);
    updateElement('outForDeliveryCount', outForDelivery);
    updateElement('deliveredCount', delivered);
    updateElement('pendingCount', pending);
    
    // Update hero stats
    updateElement('activeShipmentsCount', totalShipments);
    updateElement('todayDeliveriesCount', outForDelivery + delivered);
    const completionRate = totalShipments > 0 ? Math.round((delivered / totalShipments) * 100) : 0;
    updateElement('completionRate', `${completionRate}%`);
}

// Helper function to update element content
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Render shipments based on current view
function renderShipments() {
    if (currentView === 'cards') {
        renderCardsView();
    } else {
        renderTableView();
    }
    
    // Show/hide empty state
    toggleEmptyState();
}

// Render cards view
function renderCardsView() {
    const container = document.getElementById('shipmentsCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Sort shipments by date (newest first)
    const sortedShipments = [...filteredShipments].sort((a, b) => 
        new Date(b.orderDate || b.created_at) - new Date(a.orderDate || a.created_at)
    );
    
    sortedShipments.forEach(shipment => {
        const card = createShipmentCard(shipment);
        container.appendChild(card);
    });
}

// Render table view
function renderTableView() {
    const tbody = document.getElementById('shipmentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort shipments by date (newest first)
    const sortedShipments = [...filteredShipments].sort((a, b) => 
        new Date(b.orderDate || b.created_at) - new Date(a.orderDate || a.created_at)
    );
    
    sortedShipments.forEach(shipment => {
        const row = createShipmentTableRow(shipment);
        tbody.appendChild(row);
    });
}

// Create shipment card
function createShipmentCard(shipment) {
    const card = document.createElement('div');
    card.className = 'shipment-card';
    
    const customerName = shipment.customer?.name || shipment.customerName || 'N/A';
    const customerEmail = shipment.customer?.email || shipment.email || 'N/A';
    const orderDate = formatOrderDate(shipment.orderDate || shipment.created_at);
    const amount = `₹${(shipment.totalAmount || 0).toFixed(2)}`;
const trackingId =
    shipment.trackingId ||
    shipment.tracking_id ||
    'Not generated';
    const progressPercentage = getProgressPercentage(shipment.deliveryStatus);
    
    card.innerHTML = `
        <div class="shipment-card-header">
            <div>
                <span class="shipment-id">
                    <i class="fas fa-box" style="color: var(--warm-beige); margin-right: 0.5rem;"></i>
                    ${shipment.orderId}
                </span>
                ${shipment.deliveryStatus === 'out_for_delivery' ? '<span class="shipment-priority">Priority</span>' : ''}
            </div>
            ${createDeliveryStatusBadge(shipment.deliveryStatus)}
        </div>
        <div class="shipment-card-body">
            <div class="shipment-info-row">
                <span class="shipment-info-label">Customer:</span>
                <span class="shipment-info-value">${customerName}</span>
            </div>
            <div class="shipment-info-row">
                <span class="shipment-info-label">Email:</span>
                <span class="shipment-info-value">${customerEmail}</span>
            </div>
            <div class="shipment-info-row">
                <span class="shipment-info-label">Date:</span>
                <span class="shipment-info-value">${orderDate}</span>
            </div>
            <div class="shipment-info-row">
                <span class="shipment-info-label">Amount:</span>
                <span class="shipment-info-value">${amount}</span>
            </div>
            <div class="shipment-info-row">
                <span class="shipment-info-label">Tracking ID:</span>
                <span class="shipment-info-value">${trackingId}</span>
            </div>
            <div class="shipment-info-row">
                <span class="shipment-info-label">Address:</span>
                <span class="shipment-info-value">${shipment.customer?.address || 'N/A'}</span>
            </div>
        </div>
        ${createProgressBar(shipment.deliveryStatus, progressPercentage)}
        ${createTrackingTimeline(shipment.deliveryStatus)}
        <div class="shipment-card-actions">
            ${createShipmentActions(shipment)}
        </div>
    `;
    
    return card;
}

// Create shipment table row
function createShipmentTableRow(shipment) {
    const row = document.createElement('tr');
    
    const customerName = shipment.customer?.name || shipment.customerName || 'N/A';
    const customerEmail = shipment.customer?.email || shipment.email || 'N/A';
    const orderDate = formatOrderDate(shipment.orderDate || shipment.created_at);
    const amount = `₹${(shipment.totalAmount || 0).toFixed(2)}`;
    const trackingId =
    shipment.trackingId ||
    shipment.tracking_id ||
    'Not generated';

    row.innerHTML = `
        <td><strong>${shipment.orderId}</strong></td>
        <td>${customerName}</td>
        <td>${customerEmail}</td>
        <td>${orderDate}</td>
        <td>${amount}</td>
        <td>${trackingId}</td>
        <td>${createDeliveryStatusBadge(shipment.deliveryStatus)}</td>
        <td>
            ${createShipmentActions(shipment)}
        </td>
    `;
    
    return row;
}

// Create delivery status badge
function createDeliveryStatusBadge(status) {
    return `<span class="status-badge status-${status}">${formatStatus(status)}</span>`;
}

// Create progress bar
function createProgressBar(deliveryStatus, percentage) {
    return `
        <div class="shipment-progress">
            <div class="progress-header">
                <span class="progress-title">Delivery Progress</span>
                <span class="progress-percentage">${percentage}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
        </div>
    `;
}

// Get progress percentage based on delivery status
function getProgressPercentage(deliveryStatus) {
    const statusProgress = {
        'assigned': 0,
        'shipped': 25,
        'in_transit': 50,
        'out_for_delivery': 75,
        'delivered': 100
    };
    return statusProgress[deliveryStatus] || 0;
}

// Create tracking timeline
function createTrackingTimeline(deliveryStatus) {
    const timelineSteps = [
        { status: 'assigned', label: 'Assigned', icon: 'fa-clipboard-check' },
        { status: 'shipped', label: 'Shipped', icon: 'fa-box' },
        { status: 'in_transit', label: 'In Transit', icon: 'fa-shipping-fast' },
        { status: 'out_for_delivery', label: 'Out for Delivery', icon: 'fa-route' },
        { status: 'delivered', label: 'Delivered', icon: 'fa-check-circle' }
    ];
    
    const currentIndex = timelineSteps.findIndex(step => step.status === deliveryStatus);
    
    const timelineHTML = timelineSteps.map((step, index) => {
        let stepClass = 'timeline-step';
        if (index < currentIndex) {
            stepClass += ' completed';
        } else if (index === currentIndex) {
            stepClass += ' active';
        } else {
            stepClass += ' pending';
        }
        
        return `
            <div class="${stepClass}">
                <div class="timeline-icon">
                    <i class="fas ${step.icon}"></i>
                </div>
                <span>${step.label}</span>
            </div>
        `;
    }).join('');
    
    return `<div class="tracking-timeline">${timelineHTML}</div>`;
}

// Create shipment actions
function createShipmentActions(shipment){

    const trackingId =
        shipment.trackingId || "";

    const courierPartner =
        shipment.courier_partner || "";

    return `

        <button
            class="action-btn view-btn-action"
            onclick="viewShipmentDetails('${shipment.orderId}')"
        >
            <i class="fas fa-eye"></i>
            View
        </button>

        <div class="manual-entry-box">

            <input
                type="text"
                class="manual-input"
                id="tracking-${shipment.orderId}"
                placeholder="Enter Tracking ID"
                value="${trackingId}"
            >

            <input
                type="text"
                class="manual-input"
                id="partner-${shipment.orderId}"
                placeholder="Courier Partner (DTDC, Delhivery...)"
                value="${courierPartner}"
            >

            <button
                class="action-btn save-manual-btn"
                onclick="saveTrackingDetails('${shipment.orderId}')"
            >
                <i class="fas fa-save"></i>
                Save
            </button>

        </div>
    `;
}

async function saveTrackingDetails(orderId){

    const trackingId =
        document.getElementById(
            `tracking-${orderId}`
        ).value.trim();

    const courierPartner =
        document.getElementById(
            `partner-${orderId}`
        ).value.trim();

    if(!trackingId || !courierPartner){

        showNotification(
            "Enter tracking ID and courier partner",
            "warning"
        );

        return;
    }

    try{

        const response =
        await fetch(
            `http://localhost:7000/api/orders/${orderId}/shipment`,
            {
                method:"PUT",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({
                    tracking_id:trackingId,
                    courier_name:courierPartner
                })
            }
        );

        const data =
        await response.json();

        if(data.success){

            showNotification(
                "Shipment details saved",
                "success"
            );

            loadOrders();

        }else{

            showNotification(
                "Failed to save",
                "error"
            );
        }

    }catch(error){

        console.error(error);

        showNotification(
            "Server error",
            "error"
        );
    }
}

// Update delivery status
function updateDeliveryStatus(orderId, newStatus) {
    const shipmentIndex = filteredShipments.findIndex(shipment => shipment.orderId === orderId);
    if (shipmentIndex !== -1) {
        filteredShipments[shipmentIndex].deliveryStatus = newStatus;
        
        // Update in all orders
        const orderIndex = allOrders.findIndex(order => order.orderId === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].deliveryStatus = newStatus;
        }
        
        saveOrders();
        renderDashboard();
        showNotification(`Delivery status updated to ${formatStatus(newStatus)}`, 'success');
    }
}

// Open delivery modal
function openDeliveryModal(orderId) {
    const shipment = filteredShipments.find(s => s.orderId === orderId);
    if (!shipment) return;
    
    const modal = document.getElementById('deliveryModal');
    const deliveryDate = document.getElementById('deliveryDate');
    const deliveryTime = document.getElementById('deliveryTime');
    const deliveryLocation = document.getElementById('deliveryLocation');
    
    // Pre-fill with existing data
    if (shipment.deliveryDetails) {
        deliveryDate.value = shipment.deliveryDetails.date || '';
        deliveryTime.value = shipment.deliveryDetails.time || '';
        deliveryLocation.value = shipment.deliveryDetails.location || '';
    } else {
        deliveryDate.value = '';
        deliveryTime.value = '';
        deliveryLocation.value = '';
    }
    
    // Store current order ID for form submission
    modal.dataset.orderId = orderId;
    
    if (modal) {
        modal.style.display = 'block';
    }
}

// Save delivery details
function saveDeliveryDetails(event) {
    event.preventDefault();
    
    const modal = document.getElementById('deliveryModal');
    const orderId = modal.dataset.orderId;
    
    const deliveryDate = document.getElementById('deliveryDate').value;
    const deliveryTime = document.getElementById('deliveryTime').value;
    const deliveryLocation = document.getElementById('deliveryLocation').value;
    
    const shipmentIndex = filteredShipments.findIndex(shipment => shipment.orderId === orderId);
    if (shipmentIndex !== -1) {
        const deliveryDetails = {
            date: deliveryDate,
            time: deliveryTime,
            location: deliveryLocation
        };
        
        filteredShipments[shipmentIndex].deliveryDetails = deliveryDetails;
        
        // Update in all orders
        const orderIndex = allOrders.findIndex(order => order.orderId === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].deliveryDetails = deliveryDetails;
        }
        
        saveOrders();
        renderDashboard();
        closeDeliveryModal();
        showNotification('Delivery details saved successfully', 'success');
    }
}

// View shipment details
function viewShipmentDetails(orderId) {
    const shipment = filteredShipments.find(s => s.orderId === orderId);
    if (!shipment) return;
    
    const modal = document.getElementById('shipmentModal');
    const modalBody = document.getElementById('modalBody');
    
    if (modalBody) {
        modalBody.innerHTML = createShipmentDetailsHTML(shipment);
    }
    
    if (modal) {
        modal.style.display = 'block';
    }
}

// Create shipment details HTML
function createShipmentDetailsHTML(shipment) {
    const customerName = shipment.customer?.name || shipment.customerName || 'N/A';
    const customerEmail = shipment.customer?.email || shipment.email || 'N/A';
    const customerPhone = shipment.customer?.phone || shipment.phone || 'N/A';
    const customerAddress = shipment.customer?.address || shipment.address || 'N/A';
    const orderDate = formatOrderDate(shipment.orderDate || shipment.created_at);
    const amount = `₹${(shipment.totalAmount || 0).toFixed(2)}`;
    
    const productsHTML = (shipment.products || []).map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>₹${(product.price || 0).toFixed(2)}</td>
            <td>₹${((product.price || 0) * product.quantity).toFixed(2)}</td>
        </tr>
    `).join('');
    
    const deliveryDetailsHTML = shipment.deliveryDetails ? `
        <div class="detail-item">
            <label>Delivery Date:</label>
            <span>${shipment.deliveryDetails.date || 'N/A'}</span>
        </div>
        <div class="detail-item">
            <label>Delivery Time:</label>
            <span>${shipment.deliveryDetails.time || 'N/A'}</span>
        </div>
        <div class="detail-item">
            <label>Current Location:</label>
            <span>${shipment.deliveryDetails.location || 'N/A'}</span>
        </div>
    ` : '';
    
    return `
        <div class="shipment-details">
            <div class="detail-section">
                <h3>Shipment Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Order ID:</label>
                        <span>${shipment.orderId}</span>
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
                        <span>${shipment.paymentStatus || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Delivery Status:</label>
                        <span>${createDeliveryStatusBadge(shipment.deliveryStatus)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Courier:</label>
                        <span>${shipment.courierName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Shipment ID:</label>
                        <span>${shipment.shipmentId || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Tracking ID:</label>
                        <span>${shipment.trackingId || 'Not generated'}</span>
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
                <h3>Delivery Updates</h3>
                ${deliveryDetailsHTML}
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
            .shipment-details {
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
    const modal = document.getElementById('shipmentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close delivery modal
function closeDeliveryModal() {
    const modal = document.getElementById('deliveryModal');
    if (modal) {
        modal.style.display = 'none';
        delete modal.dataset.orderId;
    }
}

// Toggle view (cards/table)
function toggleView(view) {
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Show/hide views
    const cardsView = document.getElementById('cardsView');
    const tableView = document.getElementById('tableView');
    
    if (cardsView) {
        cardsView.style.display = view === 'cards' ? 'block' : 'none';
    }
    
    if (tableView) {
        tableView.style.display = view === 'table' ? 'block' : 'none';
    }
    
    renderShipments();
}

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const clearBtn = document.getElementById('clearSearch');
    
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'block' : 'none';
    }
    
    if (searchTerm === '') {
        filteredShipments = allOrders.filter(order => 
            Number(order.assigned_courier_id) === Number(currentUser.id)
        );
    } else {
        filteredShipments = allOrders.filter(order => {
            const isAssignedCourier = Number(order.assigned_courier_id) === Number(currentUser.id);
            const customerName = (order.customer?.name || order.customerName || '').toLowerCase();
            const customerEmail = (order.customer?.email || order.email || '').toLowerCase();
            const orderId = order.orderId.toLowerCase();
            const trackingId = (order.trackingId || '').toLowerCase();
            
            return isAssignedCourier && (
                customerName.includes(searchTerm) || 
                customerEmail.includes(searchTerm) || 
                orderId.includes(searchTerm) ||
                trackingId.includes(searchTerm)
            );
        });
    }
    
    renderShipments();
}

// Clear search input
function clearSearchInput() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    filteredShipments = allOrders.filter(order => 
        Number(order.assigned_courier_id) === Number(currentUser.id)
    );
    renderShipments();
}

// Filter shipments by status
function filterShipments() {
    const statusFilter = document.getElementById('statusFilter');
    const selectedStatus = statusFilter ? statusFilter.value : '';
    
    if (selectedStatus === '') {
        filteredShipments = allOrders.filter(order => 
            Number(order.assigned_courier_id) === Number(currentUser.id)
        );
    } else {
        filteredShipments = allOrders.filter(order => 
            Number(order.assigned_courier_id) === Number(currentUser.id) && 
            order.deliveryStatus === selectedStatus
        );
    }
    
    renderShipments();
}

// Refresh dashboard
function refreshDashboard() {
    loadOrders();
    renderDashboard();
    showNotification('Dashboard refreshed', 'success');
}

// Toggle empty state
function toggleEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const cardsView = document.getElementById('cardsView');
    const tableView = document.getElementById('tableView');
    
    const hasShipments = filteredShipments.length > 0;
    
    if (emptyState) {
        emptyState.style.display = hasShipments ? 'none' : 'block';
    }
    
    if (cardsView) {
        cardsView.style.display = hasShipments && currentView === 'cards' ? 'block' : 'none';
    }
    
    if (tableView) {
        tableView.style.display = hasShipments && currentView === 'table' ? 'block' : 'none';
    }
}

// Save orders to localStorage
function saveOrders() {

    console.log(
        "Orders updated locally"
    );
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

// Quick action functions
function generateAllTrackingIds() {
    const shipmentsWithoutTracking = filteredShipments.filter(shipment => !shipment.trackingId);
    let updatedCount = 0;
    
    shipmentsWithoutTracking.forEach(shipment => {
        const trackingId = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
        
        // Update in filtered shipments
        const shipmentIndex = filteredShipments.findIndex(s => s.orderId === shipment.orderId);
        if (shipmentIndex !== -1) {
            filteredShipments[shipmentIndex].trackingId = trackingId;
        }
        
        // Update in all orders
        const orderIndex = allOrders.findIndex(order => order.orderId === shipment.orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].trackingId = trackingId;
        }
        
        updatedCount++;
    });
    
    if (updatedCount > 0) {
        saveOrders();
        renderDashboard();
        showNotification(`Generated ${updatedCount} tracking IDs`, 'success');
    } else {
        showNotification('All shipments already have tracking IDs', 'warning');
    }
}

function markAllShipped() {
    const assignedShipments = filteredShipments.filter(shipment => shipment.deliveryStatus === 'assigned');
    let updatedCount = 0;
    
    assignedShipments.forEach(shipment => {
        // Update in filtered shipments
        const shipmentIndex = filteredShipments.findIndex(s => s.orderId === shipment.orderId);
        if (shipmentIndex !== -1) {
            filteredShipments[shipmentIndex].deliveryStatus = 'shipped';
        }
        
        // Update in all orders
        const orderIndex = allOrders.findIndex(order => order.orderId === shipment.orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].deliveryStatus = 'shipped';
        }
        
        updatedCount++;
    });
    
    if (updatedCount > 0) {
        saveOrders();
        renderDashboard();
        showNotification(`Marked ${updatedCount} shipments as shipped`, 'success');
    } else {
        showNotification('No assigned shipments to mark as shipped', 'warning');
    }
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
            key.startsWith("ayurLeafCart_") ||
            key === "ayurLeafGuestCart"
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