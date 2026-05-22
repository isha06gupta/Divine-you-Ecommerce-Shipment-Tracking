// Product data - fetched from Medusa backend
let products = [];

// Cart state
let cart = [];

// Modal state
let selectedProduct = null;
let selectedVariant = null;

// Auth state
let currentUser = null;
let isLoggedIn = false;

// Address management state
let addresses = [];
let selectedAddress = null;
let editingAddress = null;

// Checkout summary state
let checkoutState = {
    address: null,
    items: [],
    subtotal: 0,
    shipping: 50,
    grandTotal: 0
};

// Global selected address for persistence between modals
let currentCheckoutAddress = null;

// DOM elements
const productGrid = document.getElementById('productGrid');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const totalAmount = document.getElementById('totalAmount');

// Clear any old cart data on page load to ensure fresh start
function clearOldCartData() {
    // Clear old guest cart key format if exists
    localStorage.removeItem('ayurLeafCart_guest');
    
    // If user is not logged in, ensure guest cart is empty on fresh load
    if (!isLoggedIn) {
        const guestCart = localStorage.getItem('ayurLeafGuestCart');
        if (guestCart) {
            try {
                const parsed = JSON.parse(guestCart);
                // Only keep guest cart if it has items and user wasn't just logged out
                // This prevents showing old cart after logout
                if (parsed.length > 0) {
                    // Check if we have a logout flag
                    const wasLoggedOut = sessionStorage.getItem('ayurLeafJustLoggedOut');
                    if (wasLoggedOut === 'true') {
                        localStorage.removeItem('ayurLeafGuestCart');
                        sessionStorage.removeItem('ayurLeafJustLoggedOut');
                    }
                }
            } catch (e) {
                localStorage.removeItem('ayurLeafGuestCart');
            }
        }
    }
}

// Initialize the shop page
function initShop() {
    loadAuthState();
    clearOldCartData();
    fetchProducts();
    loadCartFromStorage();
    updateCartUI();
    updateProfileDropdown();
}

// Fetch products from Medusa API
function fetchProducts() {

    productGrid.innerHTML =
        '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Loading Products...</div>';

    fetch(
        `${MEDUSA_API_URL}/store/products?region_id=reg_01KRGDTG4A76Z2Z0R2V8RBHRV2`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': PUBLISHABLE_API_KEY
            }
        }
    )
    .then(response => {

        console.log('API Response status:', response.status);

        if (!response.ok) {
            throw new Error(
                `Failed to load products: ${response.status} ${response.statusText}`
            );
        }

        return response.json();
    })

    .then(data => {

        console.log('Fetched products:', data);

        products = data.products.map((product, index) => ({

            id: product.id,

            name: product.title,

            subtitle: product.subtitle || '',

            image:
                product.thumbnail ||
                'https://via.placeholder.com/300x200?text=No+Image',

            description: product.description || '',

            variants: product.variants || [],

            currentPrice:
                getVariantPrice(product.variants?.[0]) || 0,

            oldPrice: '',

            rating: 5,

            ratingCount:
                [128, 342, 517, 289, 196, 423, 267, 389][index % 8],

            weight:
                product.variants?.[0]?.title || ''

        }));

        renderProducts(products);

    })

    .catch(error => {

        console.error('Error fetching products:', error);

        productGrid.innerHTML =
            '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">Failed to load products</div>';

    });
}

// Render products to the grid
function renderProducts(products) {
    productGrid.innerHTML = products.map(product => createProductCard(product)).join('');
}

// Create product card HTML
function createProductCard(product) {
    return `
        <div class="product-card" onclick="openProductModal('${product.id}')" style="cursor: pointer;">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                ${product.subtitle ? `<p class="product-subtitle">${product.subtitle}</p>` : ''}
                <div class="product-rating">
                    <span class="rating-stars">⭐ ${product.rating}</span>
                    <span class="rating-count">(${product.ratingCount})</span>
                </div>
                ${product.weight ? `<span class="weight-badge">${product.weight}</span>` : ''}
                <div class="price-section">
                    <span class="current-price">₹${product.currentPrice}</span>
                    <span class="old-price">${product.oldPrice ? `₹${product.oldPrice}` : ''}</span>
                </div>
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); openProductModal('${product.id}')">
                    Add
                </button>
            </div>
        </div>
    `;
}

// Add product to cart
function addToCart(productId) {
    console.log('Adding product to cart:', productId);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCartToStorage();
    updateCartUI();
    
    // Add visual feedback
    const button = document.querySelector(`button[onclick="addToCart('${productId}')"]`);
    if (button) {
        button.textContent = 'Added!';
        button.style.background = '#5e6f52';
        setTimeout(() => {
            button.textContent = 'Add';
            button.style.background = '';
        }, 1000);
    }
}

// Remove item from cart
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    saveCartToStorage();
    updateCartUI();
}

// Update item quantity
function updateQuantity(itemId, change) {
    const item = cart.find(item => item.id === itemId);
    if (!item) return;

    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(itemId);
    } else {
        saveCartToStorage();
        updateCartUI();
    }
}

// Update cart UI
function updateCartUI() {
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Update cart count
    cartCount.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
    
    if (cart.length === 0) {
        cartEmpty.style.display = 'block';
        cartTotal.style.display = 'none';
        cartItems.innerHTML = '';
    } else {
        cartEmpty.style.display = 'none';
        cartTotal.style.display = 'block';
        
        // Render cart items
        cartItems.innerHTML = cart.map(item => createCartItemHTML(item)).join('');
        
        // Update total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalAmount.textContent = `₹${total}`;
    }
}

// Create cart item HTML
function createCartItemHTML(item) {
    return `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                ${item.variantTitle && item.variantTitle !== 'Default' ? `<div class="cart-item-variant">${item.variantTitle}</div>` : ''}
                <div class="cart-item-price">₹${item.price}</div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// Save cart to localStorage
function saveCartToStorage() {
    const cartKey = getUserCartKey();
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

// Load cart from localStorage
function loadCartFromStorage() {
    const cartKey = getUserCartKey();
    const savedCart = localStorage.getItem(cartKey);
    if (savedCart) {
        cart = JSON.parse(savedCart);
    } else {
        cart = [];
    }
}

// Get user-specific cart key
function getUserCartKey() {
    if (isLoggedIn && currentUser) {
        return `ayurLeafCart_${currentUser.id}`;
    }
    return 'ayurLeafGuestCart';
}

// Clear cart for current user
function clearCurrentUserCart() {
    const cartKey = getUserCartKey();
    localStorage.removeItem(cartKey);
    
    // Also clear any old guest cart to prevent persistence
    localStorage.removeItem('ayurLeafCart_guest');
    
    cart = [];
    updateCartUI();
}

// Search functionality
function initSearch() {
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput && searchBtn) {
        const performSearch = () => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                renderProducts(products);
                return;
            }
            
            const filteredProducts = products.filter(product => 
                product.name.toLowerCase().includes(searchTerm)
            );
            
            productGrid.innerHTML = filteredProducts.length > 0 
                ? filteredProducts.map(product => createProductCard(product)).join('')
                : '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">No products found</div>';
        };
        
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initShop();
    initSearch();
});

// Export functions for onclick handlers
globalThis.addToCart = addToCart;
globalThis.removeFromCart = removeFromCart;
globalThis.updateQuantity = updateQuantity;
globalThis.openProductModal = openProductModal;
globalThis.closeProductModal = closeProductModal;
globalThis.selectVariant = selectVariant;
globalThis.addSelectedToCart = addSelectedToCart;

// Auth functions for onclick handlers
globalThis.toggleProfileDropdown = toggleProfileDropdown;
globalThis.openLoginModal = openLoginModal;
globalThis.closeLoginModal = closeLoginModal;
globalThis.openRegisterModal = openRegisterModal;
globalThis.closeRegisterModal = closeRegisterModal;
globalThis.switchToLogin = switchToLogin;
globalThis.switchToRegister = switchToRegister;
globalThis.handleLogin = handleLogin;
globalThis.handleRegister = handleRegister;
globalThis.handleLogout = handleLogout;
globalThis.showForgotPassword = showForgotPassword;

// Helper function to extract variant price consistently
function getVariantPrice(variant) {
    if (!variant) return 0;
    
    // Debug: Log calculated_price structure
    console.log('Variant calculated_price:', variant.calculated_price);
    
    let price = 0;
    
    // Priority 1: calculated_price.calculated_amount (Medusa v2)
    if (variant.calculated_price?.calculated_amount) {
        price = variant.calculated_price.calculated_amount / 100;
    }
    // Priority 2: prices array (fallback)
    else if (variant.prices?.[0]?.amount) {
        price = variant.prices[0].amount / 100;
    }
    
    return price;
}

// Modal functions
function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    selectedProduct = product;
    selectedVariant = null;

    // Populate modal with product data
    document.getElementById('modalProductImage').src = product.image;
    document.getElementById('modalProductImage').alt = product.name;
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductSubtitle').textContent = product.subtitle || '';
    document.getElementById('modalRatingStars').textContent = `⭐ ${product.rating}`;
    document.getElementById('modalRatingCount').textContent = `(${product.ratingCount})`;
    document.getElementById('modalProductDescription').textContent = product.description || 'No description available.';

    // Populate variants
    const variantsList = document.getElementById('modalVariantsList');
    if (product.variants && product.variants.length > 0) {
        // Debug: Log variant structure
        console.log('Product variants:', product.variants);
        
        variantsList.innerHTML = product.variants.map(variant => {
            // Debug: Log each variant
            console.log('Variant:', variant);
            console.log('Variant calculated_price:', variant.calculated_price);
            
            const price = getVariantPrice(variant);
            const priceText = price > 0 ? `₹${price}` : 'Price unavailable';
            
            return `
                <div class="variant-option" onclick="selectVariant('${variant.id}')" data-variant-id="${variant.id}">
                    <span class="variant-title">${variant.title || 'Default'}</span>
                    <span class="variant-price">${priceText}</span>
                </div>
            `;
        }).join('');
        
        // Set initial price to first variant
        if (product.variants[0]) {
            const firstVariantPrice = getVariantPrice(product.variants[0]);
            const priceText = firstVariantPrice > 0 ? `₹${firstVariantPrice}` : 'Price unavailable';
            document.getElementById('modalPrice').textContent = priceText;
        }
    } else {
        variantsList.innerHTML = '<p>No variants available</p>';
        document.getElementById('modalPrice').textContent = `₹${product.currentPrice}`;
    }

    // Hide error message
    document.getElementById('modalErrorMessage').style.display = 'none';

    // Show modal
    document.getElementById('productModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = '';
    selectedProduct = null;
    selectedVariant = null;
}

function selectVariant(variantId) {
    if (!selectedProduct) return;

    selectedVariant = selectedProduct.variants.find(v => v.id === variantId);
    
    // Update visual selection
    document.querySelectorAll('.variant-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`[data-variant-id="${variantId}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }

    // Update price
    if (selectedVariant) {
        const price = getVariantPrice(selectedVariant);
        const priceText = price > 0 ? `₹${price}` : 'Price unavailable';
        document.getElementById('modalPrice').textContent = priceText;
    }

    // Hide error message
    document.getElementById('modalErrorMessage').style.display = 'none';
}

function addSelectedToCart() {
    if (!selectedProduct) return;

    let variantToAdd = selectedVariant;
    
    // If no variant selected but product has variants, show error
    if (!variantToAdd && selectedProduct.variants && selectedProduct.variants.length > 0) {
        document.getElementById('modalErrorMessage').style.display = 'block';
        return;
    }

    // If no variants, use the product itself
    if (!variantToAdd) {
        variantToAdd = {
            id: selectedProduct.id,
            title: 'Default',
            prices: [{ amount: selectedProduct.currentPrice * 100 }],
            calculated_price: selectedProduct.currentPrice * 100
        };
    }

    // Create cart item
    const cartItem = {
        id: `${selectedProduct.id}-${variantToAdd.id}`,
        productId: selectedProduct.id,
        variantId: variantToAdd.id,
        name: selectedProduct.name,
        variantTitle: variantToAdd.title,
        image: selectedProduct.image,
        price: getVariantPrice(variantToAdd),
        quantity: 1
    };

    // Check if item already exists in cart
    const existingItem = cart.find(item => item.id === cartItem.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push(cartItem);
    }

    saveCartToStorage();
    updateCartUI();

    // Show success feedback
    const button = document.getElementById('modalAddToCart');
    const originalText = button.textContent;
    button.textContent = 'Added!';
    button.style.background = '#5e6f52';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
    }, 1000);

    // Close modal after a short delay
    setTimeout(() => {
        closeProductModal();
    }, 1500);
}

// ====================
// AUTHENTICATION FUNCTIONS
// ====================

// Medusa API configuration
const MEDUSA_API_URL = 'http://localhost:9000';
const PUBLISHABLE_API_KEY = 'pk_14ad2a13987db9ab348a44f58d1c42a18414d926fc29a04eac76a438a4c57c6a';

// Load auth state from localStorage
function loadAuthState() {
    const savedUser = localStorage.getItem('ayurLeafUser');
    const savedToken = localStorage.getItem('ayurLeafAuthToken');
    
    if (savedUser && savedToken) {
        try {
            currentUser = JSON.parse(savedUser);
            isLoggedIn = true;
            console.log('Loaded auth state:', { user: currentUser, hasToken: !!savedToken });
        } catch (error) {
            console.error('Error parsing saved user data:', error);
            // Clear corrupted data
            localStorage.removeItem('ayurLeafUser');
            localStorage.removeItem('ayurLeafAuthToken');
        }
    }
}

// Save auth state to localStorage
function saveAuthState(user, token) {
    if (user && token) {
        currentUser = user;
        isLoggedIn = true;
        localStorage.setItem('ayurLeafUser', JSON.stringify(user));
        localStorage.setItem("ayurLeafAuthToken","custom-auth-token");
        localStorage.setItem('ayurLeafAuthToken', token);
        console.log('Saved auth state:', { user: currentUser, hasToken: !!token });
    } else {
        currentUser = null;
        isLoggedIn = false;
        localStorage.removeItem('ayurLeafUser');
        localStorage.removeItem('ayurLeafAuthToken');
    }
}

// Update profile dropdown based on auth state
function updateProfileDropdown() {
    const dropdownContent = document.getElementById('dropdownContent');
    if (!dropdownContent) return;
    
    if (isLoggedIn && currentUser) {
        dropdownContent.innerHTML = `
            <div class="dropdown-item" onclick="handleAccount()">
                <i class="fas fa-user"></i>
                <span>Account</span>
            </div>
            <div class="dropdown-item" onclick="handleOrderHistory()">
                <i class="fas fa-box"></i>
                <span>Order History</span>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item logout-item" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </div>
        `;
    } else {
        dropdownContent.innerHTML = `
            <div class="dropdown-item" onclick="openLoginModal()">
                <i class="fas fa-sign-in-alt"></i>
                <span>Login</span>
            </div>
            <div class="dropdown-item" onclick="openRegisterModal()">
                <i class="fas fa-user-plus"></i>
                <span>Register</span>
            </div>
        `;
    }
}

// Toggle profile dropdown
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (!dropdown) return;
    
    dropdown.classList.toggle('active');
    
    // Close dropdown when clicking outside
    if (dropdown.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOutside);
        }, 100);
    }
}

// Close dropdown when clicking outside
function closeDropdownOutside(event) {
    const dropdown = document.getElementById('profileDropdown');
    const profileBtn = document.querySelector('.profile-btn');
    
    if (dropdown && !dropdown.contains(event.target) && !profileBtn.contains(event.target)) {
        dropdown.classList.remove('active');
        document.removeEventListener('click', closeDropdownOutside);
    }
}

// Open login modal
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Close profile dropdown
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('active');
    }
}

// Close login modal
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset form
        const form = document.getElementById('loginForm');
        if (form) form.reset();
    }
}

// Open register modal
function openRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Close profile dropdown
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('active');
    }
}

// Close register modal
function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset form
        const form = document.getElementById('registerForm');
        if (form) form.reset();
    }
}

// Switch to login modal
function switchToLogin() {
    closeRegisterModal();
    setTimeout(() => {
        openLoginModal();
    }, 300);
}

// Switch to register modal
function switchToRegister() {
    closeLoginModal();
    setTimeout(() => {
        openRegisterModal();
    }, 300);
}

// Handle login
async function handleLogin(event) {

    event.preventDefault();

    const formData =
    new FormData(event.target);

    const email =
    formData.get("email");

    const password =
    formData.get("password");

    if (!email || !password) {

        showNotification(
            "Please fill all fields",
            "error"
        );

        return;
    }

    const submitBtn =
    event.target.querySelector(
        'button[type="submit"]'
    );

    const originalText =
    submitBtn.textContent;

    submitBtn.textContent =
    "Signing In...";

    submitBtn.disabled = true;

    try {

        const response =
        await fetch(
            "http://localhost:7000/api/users/login",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data =
        await response.json();

        console.log(data);

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Login failed"
            );
        }

        const user = data.user;

        localStorage.setItem(
            "ayurLeafUser",
            JSON.stringify(user)
        );

        localStorage.setItem(
            "ayurLeafAuthToken",
            "custom-auth-token"
        );

        currentUser = user;

        isLoggedIn = true;

        updateProfileDropdown();

        loadCartFromStorage();

        updateCartUI();

        closeLoginModal();

        showNotification(
            `Welcome ${user.first_name}`,
            "success"
        );

        setTimeout(() => {

            if (
                user.role === "admin"
            ) {

                window.location.href =
                "./admin.html";

            } else if (
                user.role === "courier"
            ) {

                window.location.href =
                "./courier.html";

            } else {

                window.location.href =
                "./shop.html";
            }

        }, 1000);

    } catch(error) {

        console.error(error);

        showNotification(
            error.message,
            "error"
        );

    } finally {

        submitBtn.textContent =
        originalText;

        submitBtn.disabled = false;
    }
}
// Handle register
async function handleRegister(event) {

    event.preventDefault();

    const formData =
    new FormData(event.target);

    const firstName =
    formData.get("firstName");

    const lastName =
    formData.get("lastName");

    const email =
    formData.get("email");

    const password =
    formData.get("password");

    if (
        !firstName ||
        !lastName ||
        !email ||
        !password
    ) {

        showNotification(
            "Please fill all fields",
            "error"
        );

        return;
    }

    try {

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

                    first_name:
                    firstName,

                    last_name:
                    lastName,

                    email,

                    password,

                    role: "user"
                })
            }
        );

        const data =
        await response.json();

        console.log(data);

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Registration failed"
            );
        }

        closeRegisterModal();

        showNotification(
            "Account created successfully",
            "success"
        );

        setTimeout(() => {

            openLoginModal();

        }, 1000);

    } catch(error) {

        console.error(error);

        showNotification(
            error.message,
            "error"
        );
    }
}
// Handle logout
function handleLogout() {
    console.log('Logging out user:', currentUser);
    
    // Get current token before clearing
    const currentToken = localStorage.getItem('ayurLeafAuthToken');
    
    // Set logout flag to prevent cart persistence
    sessionStorage.setItem('ayurLeafJustLoggedOut', 'true');
    
    // Clear current user's cart completely
    clearCurrentUserCart();
    
    // If we have a token, try to call logout API (optional but good practice)
    if (currentToken && currentUser) {
        fetch(`${MEDUSA_API_URL}/auth/customer`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': PUBLISHABLE_API_KEY,
                'Authorization': `Bearer ${currentToken}`
            }
        })
        .then(response => {
            console.log('Logout API response:', response.status);
            // Don't throw error for logout - always clear local state
        })
        .catch(error => {
            console.log('Logout API call failed (continuing with local logout):', error);
            // Continue with local logout even if API call fails
        })
        .finally(() => {
            // Clear auth state regardless of API call result
            clearAuthState();
        });
    } else {
        // No token, just clear local state
        clearAuthState();
    }
}

// Clear auth state and update UI
function clearAuthState() {
    currentUser = null;
    isLoggedIn = false;
    
    // Clear auth storage
    localStorage.removeItem('ayurLeafUser');
    localStorage.removeItem('ayurLeafAuthToken');
    
    updateProfileDropdown();
    
    // Reset cart to empty state
    cart = [];
    updateCartUI();
    
    // Close dropdown
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('active');
    
    showNotification('You have been logged out successfully.', 'success');
    
    // Redirect to index.html after logout
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Handle account navigation
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

// Handle order history navigation
function handleOrderHistory() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('active');
    
    // Navigate to order history page
    window.location.href = 'orderHistory.html';
}

// Export to global scope for inline onclick handlers
window.handleOrderHistory = handleOrderHistory;

// Show forgot password (UI only for now)
function showForgotPassword() {
    showNotification('Password reset functionality coming soon! Please contact support.');
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Set color based on type
    const bgColor = type === 'error' ? '#dc3545' : '#5e6f52';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ====================
// ADDRESS MANAGEMENT FUNCTIONS
// ====================

// Checkout handler - opens address modal
function handleCheckout() {
    console.log('Checkout clicked, cart items:', cart.length);
    
    // Check if cart is empty
    if (cart.length === 0) {
        showNotification('Your cart is empty. Add items before checkout.', 'error');
        return;
    }
    
    // Check if user is logged in
    if (!isLoggedIn || !currentUser) {
        showNotification('Please login to proceed with checkout.', 'error');
        setTimeout(() => {
            openLoginModal();
        }, 1000);
        return;
    }
    
    // Open address modal
    openAddressModal();
}

// Open address modal
function openAddressModal() {
    console.log('Opening address modal for user:', currentUser?.id);
    const modal = document.getElementById('addressModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Reset modal state
        resetAddressModal();
        
        // Load addresses
        loadAddresses();
    }
}

// Close address modal
function closeAddressModal() {
    const modal = document.getElementById('addressModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset state
        resetAddressModal();
    }
}

// Reset address modal state
function resetAddressModal() {
    selectedAddress = null;
    editingAddress = null;
    
    // Show list section by default
    showAddressList();
    
    // Clear form
    const form = document.getElementById('addressForm');
    if (form) form.reset();
    
    // Clear form errors
    clearFormErrors();
}

// Show address list section
function showAddressList() {
    document.getElementById('addressListSection').style.display = 'block';
    document.getElementById('addressFormSection').style.display = 'none';
    document.getElementById('selectedAddressSection').style.display = 'none';
    
    // Reset form
    const form = document.getElementById('addressForm');
    if (form) form.reset();
    
    editingAddress = null;
    updateFormTitle();
}

// Show address form section
function showAddressForm() {
    document.getElementById('addressListSection').style.display = 'none';
    document.getElementById('addressFormSection').style.display = 'block';
    document.getElementById('selectedAddressSection').style.display = 'none';
    
    updateFormTitle();
    clearFormErrors();
}

// Show selected address section
function showSelectedAddressSection() {
    document.getElementById('addressListSection').style.display = 'none';
    document.getElementById('addressFormSection').style.display = 'none';
    document.getElementById('selectedAddressSection').style.display = 'block';
    
    displaySelectedAddress();
}

// Update form title based on editing state
function updateFormTitle() {
    const titleElement = document.getElementById('addressFormTitle');
    const saveBtn = document.getElementById('saveAddressBtn');
    
    if (editingAddress) {
        titleElement.textContent = 'Edit Address';
        saveBtn.textContent = 'Update Address';
    } else {
        titleElement.textContent = 'Add New Address';
        saveBtn.textContent = 'Save Address';
    }
}

// Load addresses from Medusa API
async function loadAddresses() {

    try {

        const response = await fetch(
            `http://localhost:7000/api/address/${currentUser.id}`
        );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message
            );
        }

        addresses =
            data.addresses || [];

        renderAddressList();

    } catch (error) {

        console.error(
            "Error loading addresses:",
            error
        );

        showNotification(
            "Failed to load addresses",
            "error"
        );
    }
}
// Render address list
function renderAddressList() {
    const addressList = document.getElementById('addressList');
    const noAddresses = document.getElementById('noAddresses');
    
    if (addresses.length === 0) {
        addressList.style.display = 'none';
        noAddresses.style.display = 'block';
    } else {
        addressList.style.display = 'grid';
        noAddresses.style.display = 'none';
        
        addressList.innerHTML = addresses.map(address => createAddressCard(address)).join('');
    }
}

// Create address card HTML
function createAddressCard(address) {
    const isSelected = selectedAddress && selectedAddress.id === address.id;
    
    return `
        <div class="address-card ${isSelected ? 'selected' : ''}" data-address-id="${address.id}">
            <div class="address-card-header">
                <div>
                    <div class="address-name">${address.first_name} ${address.last_name || ''}</div>
                    <div class="address-phone">${address.phone || 'No phone'}</div>
                </div>
                <div class="address-actions">
                    <button class="address-action-btn edit" onclick="editAddress('${address.id}')" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="address-action-btn delete" onclick="deleteAddress('${address.id}')" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                            <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="address-details">
                <div class="address-line">${address.address_1}</div>
                ${address.address_2 ? `<div class="address-line">${address.address_2}</div>` : ''}
                <div class="address-city-state">${address.city}, ${address.province}</div>
                <div class="address-pincode">${address.postal_code}</div>
                ${address.metadata?.landmark ? `<div class="address-landmark">Landmark: ${address.metadata.landmark}</div>` : ''}
            </div>
            <button class="select-address-btn" onclick="selectAddress('${address.id}')">
                Select Address
            </button>
        </div>
    `;
}

// Select address
function selectAddress(addressId) {

    console.log(
        "Selecting address:",
        addressId
    );

    selectedAddress =
    addresses.find(addr => {

        return (
            String(addr.id) ===
            String(addressId)
        );
    });

    console.log(
        "Selected Address:",
        selectedAddress
    );

    if (!selectedAddress) {

        showNotification(
            "Address not found",
            "error"
        );

        return;
    }

    currentCheckoutAddress =
        selectedAddress;

    renderAddressList();

    // SHOW CONFIRM SECTION
    document.getElementById(
        "addressListSection"
    ).style.display = "none";

    document.getElementById(
        "addressFormSection"
    ).style.display = "none";

    document.getElementById(
        "selectedAddressSection"
    ).style.display = "block";

    displaySelectedAddress();
}
// Edit address
function editAddress(addressId) {
    console.log('Editing address:', addressId);
    editingAddress = addresses.find(addr => addr.id === addressId);
    
    if (editingAddress) {
        console.log('Editing address data:', editingAddress);
        
        // Populate form
        document.getElementById('fullName').value = `${editingAddress.first_name} ${editingAddress.last_name || ''}`.trim();
        document.getElementById('phoneNumber').value = editingAddress.phone || '';
        document.getElementById('addressLine').value = editingAddress.address_1 || '';
        document.getElementById('city').value = editingAddress.city || '';
        document.getElementById('state').value = editingAddress.province || '';
        document.getElementById('pincode').value = editingAddress.postal_code || '';
        document.getElementById('landmark').value = editingAddress.metadata?.landmark || '';
        
        // Show form
        showAddressForm();
    }
}

// Delete address
async function deleteAddress(addressId) {

    try {

        const response =
        await fetch(
            `http://localhost:7000/api/address/${addressId}`,
            {
                method: "DELETE"
            }
        );

        const data =
        await response.json();

        if (!response.ok) {

            throw new Error(
                data.message
            );
        }

        addresses =
        addresses.filter(
            addr => addr.id !== addressId
        );

        renderAddressList();

        showNotification(
            "Address deleted",
            "success"
        );

    } catch(error) {

        console.error(error);

        showNotification(
            "Delete failed",
            "error"
        );
    }
}
// Handle address form submission
function handleAddressSubmit(event) {
    event.preventDefault();
    
    console.log('Address form submitted');
    
    // Validate form
    if (!validateAddressForm()) {
        console.log('Form validation failed');
        return;
    }
    
    const formData = new FormData(event.target);
    const addressData = {
        first_name: formData.get('fullName').split(' ')[0],
        last_name: formData.get('fullName').split(' ').slice(1).join(' '),
        phone: formData.get('phoneNumber'),
        address_1: formData.get('addressLine'),
        city: formData.get('city'),
        province: formData.get('state'),
        postal_code: formData.get('pincode'),
        metadata: {
            landmark: formData.get('landmark')
        }
    };
    
    // Remove empty landmark from metadata
    if (!addressData.metadata.landmark) {
        delete addressData.metadata.landmark;
    }
    
    console.log('Address data to save:', addressData);
    
    if (editingAddress) {
        // Update existing address
        updateAddress(editingAddress.id, addressData);
    } else {
        // Create new address
        createAddress(addressData);
    }
}

// Validate address form
function validateAddressForm() {
    let isValid = true;
    clearFormErrors();
    
    // Full Name validation
    const fullName = document.getElementById('fullName').value.trim();
    if (!fullName) {
        showFormError('fullNameError', 'Full name is required');
        isValid = false;
    } else if (fullName.length < 2) {
        showFormError('fullNameError', 'Full name must be at least 2 characters');
        isValid = false;
    }
    
    // Phone validation
    const phone = document.getElementById('phoneNumber').value.trim();
    if (!phone) {
        showFormError('phoneNumberError', 'Phone number is required');
        isValid = false;
    } else if (!/^[6-9]\d{9}$/.test(phone)) {
        showFormError('phoneNumberError', 'Please enter a valid 10-digit phone number');
        isValid = false;
    }
    
    // Address validation
    const addressLine = document.getElementById('addressLine').value.trim();
    if (!addressLine) {
        showFormError('addressLineError', 'Address line is required');
        isValid = false;
    } else if (addressLine.length < 5) {
        showFormError('addressLineError', 'Address must be at least 5 characters');
        isValid = false;
    }
    
    // City validation
    const city = document.getElementById('city').value.trim();
    if (!city) {
        showFormError('cityError', 'City is required');
        isValid = false;
    } else if (city.length < 2) {
        showFormError('cityError', 'City must be at least 2 characters');
        isValid = false;
    }
    
    // State validation
    const state = document.getElementById('state').value.trim();
    if (!state) {
        showFormError('stateError', 'State is required');
        isValid = false;
    } else if (state.length < 2) {
        showFormError('stateError', 'State must be at least 2 characters');
        isValid = false;
    }
    
    // Pincode validation
    const pincode = document.getElementById('pincode').value.trim();
    if (!pincode) {
        showFormError('pincodeError', 'Pincode is required');
        isValid = false;
    } else if (!/^\d{6}$/.test(pincode)) {
        showFormError('pincodeError', 'Please enter a valid 6-digit pincode');
        isValid = false;
    }
    
    return isValid;
}

// Show form error
function showFormError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// Clear form errors
function clearFormErrors() {
    const errorElements = document.querySelectorAll('.form-error');
    errorElements.forEach(element => {
        element.textContent = '';
    });
}

// Create new address
async function createAddress(addressData) {

    try {

        const response = await fetch(
            "http://localhost:7000/api/address/create",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({

                    customer_id:
                    currentUser.id,

                    ...addressData
                })
            }
        );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message
            );
        }

        showNotification(
            "Address saved successfully",
            "success"
        );

        loadAddresses();

        showAddressList();

    } catch (error) {

        console.error(
            "Error creating address:",
            error
        );

        showNotification(
            "Failed to save address",
            "error"
        );
    }
}
// Update existing address
async function updateAddress(
    addressId,
    addressData
) {

    try {

        const response =
        await fetch(
            `http://localhost:7000/api/address/${addressId}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                    "application/json"
                },

                body: JSON.stringify(
                    addressData
                )
            }
        );

        const data =
        await response.json();

        if (!response.ok) {

            throw new Error(
                data.message
            );
        }

        const index =
        addresses.findIndex(
            addr => addr.id === addressId
        );

        if (index !== -1) {

            addresses[index] =
            data.address;
        }

        renderAddressList();

        showNotification(
            "Address updated",
            "success"
        );

        showAddressList();

    } catch(error) {

        console.error(error);

        showNotification(
            "Update failed",
            "error"
        );
    }
}
// Display selected address
function displaySelectedAddress() {
    const selectedCard = document.getElementById('selectedAddressCard');
    
    if (selectedAddress) {
        selectedCard.innerHTML = `
            <div class="address-card-header">
                <div>
                    <div class="address-name">${selectedAddress.first_name} ${selectedAddress.last_name || ''}</div>
                    <div class="address-phone">${selectedAddress.phone || 'No phone'}</div>
                </div>
            </div>
            <div class="address-details">
                <div class="address-line">${selectedAddress.address_1}</div>
                ${selectedAddress.address_2 ? `<div class="address-line">${selectedAddress.address_2}</div>` : ''}
                <div class="address-city-state">${selectedAddress.city}, ${selectedAddress.province}</div>
                <div class="address-pincode">${selectedAddress.postal_code}</div>
                ${selectedAddress.landmark ? `<div class="address-landmark">Landmark: ${selectedAddress.landmark}</div>` : ''}
            </div>
        `;
    }
}

// Confirm address selection
function confirmAddressSelection() {
    console.log('Address selection confirmed:', selectedAddress);
    
    if (!selectedAddress) {
        showNotification('Please select an address', 'error');
        return;
    }
    
    // Store selected address globally for persistence
    currentCheckoutAddress = selectedAddress;
    console.log('Stored currentCheckoutAddress before modal transition:', currentCheckoutAddress);
    
    // Store selected address for future use
    localStorage.setItem('ayurLeafSelectedAddress', JSON.stringify(selectedAddress));
    
    // Close address modal and open checkout summary
    closeAddressModal();
    
    setTimeout(() => {
        openCheckoutSummaryModal();
    }, 300);
}

// Export address management functions for onclick handlers
globalThis.handleCheckout = handleCheckout;
globalThis.openAddressModal = openAddressModal;
globalThis.closeAddressModal = closeAddressModal;
globalThis.showAddressList = showAddressList;
globalThis.showAddressForm = showAddressForm;
globalThis.selectAddress = selectAddress;
globalThis.editAddress = editAddress;
globalThis.deleteAddress = deleteAddress;
globalThis.handleAddressSubmit = handleAddressSubmit;
globalThis.confirmAddressSelection = confirmAddressSelection;

// ====================
// CHECKOUT SUMMARY FUNCTIONS
// ====================

// Open checkout summary modal
function openCheckoutSummaryModal() {
    console.log('Opening checkout summary modal');
    
    // Prepare checkout state
    prepareCheckoutState();
    
    const modal = document.getElementById('checkoutSummaryModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Render checkout summary
        renderCheckoutSummary();
    }
}

// Close checkout summary modal
function closeCheckoutSummaryModal() {
    const modal = document.getElementById('checkoutSummaryModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Prepare checkout state with current data
function prepareCheckoutState() {
    console.log('Preparing checkout state');
    console.log('Selected address:', selectedAddress);
    console.log('Current checkout address:', currentCheckoutAddress);
    console.log('Cart items:', cart);
    
    // Set selected address - use global persistent address
    checkoutState.address = currentCheckoutAddress || selectedAddress;
    
    console.log('Checkout address state:', checkoutState.address);
    
    // Set cart items
    checkoutState.items = [...cart];
    
    // Calculate subtotal
    checkoutState.subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Calculate grand total (subtotal + shipping)
    checkoutState.grandTotal = checkoutState.subtotal + checkoutState.shipping;
    
    console.log('Checkout state prepared:', checkoutState);
    console.log('Subtotal:', checkoutState.subtotal);
    console.log('Shipping:', checkoutState.shipping);
    console.log('Grand Total:', checkoutState.grandTotal);
}

// Render checkout summary
function renderCheckoutSummary() {
    console.log('Rendering checkout summary');
    
    // Render delivery address
    renderDeliveryAddress();
    
    // Render cart items
    renderCartItems();
    
    // Render price details
    renderPriceDetails();
}

// Render delivery address section
function renderDeliveryAddress() {
    const deliveryAddressCard = document.getElementById('deliveryAddressCard');
    
    console.log('Rendering delivery address, checkoutState.address:', checkoutState.address);
    
    if (checkoutState.address) {
        console.log('Rendering address details for:', checkoutState.address.first_name);
        deliveryAddressCard.innerHTML = `
            <div class="delivery-address-details">
                <div class="delivery-address-line">
                    <strong>${checkoutState.address.first_name} ${checkoutState.address.last_name || ''}</strong>
                </div>
                <div class="delivery-address-line">${checkoutState.address.phone || 'No phone'}</div>
                <div class="delivery-address-line">${checkoutState.address.address_1}</div>
                ${checkoutState.address.address_2 ? `<div class="delivery-address-line">${checkoutState.address.address_2}</div>` : ''}
                <div class="delivery-address-city-state">${checkoutState.address.city}, ${checkoutState.address.province}</div>
                <div class="delivery-address-pincode">${checkoutState.address.postal_code}</div>
                ${checkoutState.address.metadata?.landmark ? `<div class="delivery-address-line">Landmark: ${checkoutState.address.metadata.landmark}</div>` : ''}
            </div>
        `;
    } else {
        console.log('No address found in checkout state');
        deliveryAddressCard.innerHTML = '<p>No delivery address selected</p>';
    }
}

// Render cart items section
function renderCartItems() {
    const checkoutCartItems = document.getElementById('checkoutCartItems');
    
    if (checkoutState.items.length === 0) {
        checkoutCartItems.innerHTML = '<p>No items in cart</p>';
        return;
    }
    
    checkoutCartItems.innerHTML = checkoutState.items.map(item => `
        <div class="checkout-cart-item">
            <img src="${item.image}" alt="${item.name}" class="checkout-item-image">
            <div class="checkout-item-details">
                <div class="checkout-item-title">${item.name}</div>
                ${item.variantTitle && item.variantTitle !== 'Default' ? `<div class="checkout-item-variant">${item.variantTitle}</div>` : ''}
                <div class="checkout-item-quantity-price">
                    <span class="checkout-item-quantity">Qty: ${item.quantity}</span>
                    <span class="checkout-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Render price details section
function renderPriceDetails() {
    const totalItemsElement = document.getElementById('totalItems');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shippingCost');
    const grandTotalElement = document.getElementById('grandTotal');
    
    // Calculate total items count
    const totalItemsCount = checkoutState.items.reduce((count, item) => count + item.quantity, 0);
    
    // Update price elements
    totalItemsElement.textContent = totalItemsCount;
    subtotalElement.textContent = `₹${checkoutState.subtotal.toFixed(2)}`;
    shippingElement.textContent = `₹${checkoutState.shipping.toFixed(2)}`;
    grandTotalElement.textContent = `₹${checkoutState.grandTotal.toFixed(2)}`;
}

// Change delivery address
function changeDeliveryAddress() {
    console.log('Changing delivery address');
    
    // Close checkout summary modal
    closeCheckoutSummaryModal();
    
    // Open address modal with a slight delay for smooth transition
    setTimeout(() => {
        openAddressModal();
    }, 300);
}

// Back to address selection
function backToAddressSelection() {
    console.log('Back to address selection');
    
    // Close checkout summary modal
    closeCheckoutSummaryModal();
    
    // Open address modal with a slight delay for smooth transition
    setTimeout(() => {
        openAddressModal();
    }, 300);
}

// Proceed to payment - REAL MEDUSA ORDER CREATION FLOW (Phase 3)
function proceedToPayment() {
    console.log('🚀 Starting REAL Medusa order creation flow');
    console.log('Checkout state:', checkoutState);
    
    // Validate checkout state
    if (!checkoutState.address) {
        showNotification('Please select a delivery address', 'error');
        return;
    }
    
    if (checkoutState.items.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    // Validate user is logged in
    if (!isLoggedIn || !currentUser) {
        showNotification('Please login to place order', 'error');
        return;
    }
    
    console.log('✅ All validations passed, starting order creation...');
    
    // Show loading state
    const payButton = document.querySelector('.proceed-to-pay-btn');
    const originalText = payButton.textContent;
    payButton.textContent = 'Creating Order...';
    payButton.disabled = true;
    
    // Start the complete order creation flow
    createMedusaOrder()
        .then(orderResult => {
            console.log('🎉 Order created successfully:', orderResult);
            handleOrderSuccess(orderResult);
        })
        .catch(error => {
            console.error('❌ Order creation failed:', error);
            showNotification(error.message || 'Failed to create order. Please try again.', 'error');
        })
        .finally(() => {
            // Reset button state
            payButton.textContent = originalText;
            payButton.disabled = false;
        });
}

// REAL MEDUSA ORDER CREATION FLOW
async function createMedusaOrder() {
    console.log('📋 STEP 1: Creating Medusa cart...');
    
    try {
        // STEP 1: Create Medusa cart with authenticated session
        const token = localStorage.getItem('ayurLeafAuthToken');
        console.log('Creating cart with auth token:', token ? 'Token exists' : 'No token');
        
        const headers = {
            'Content-Type': 'application/json',
            'x-publishable-api-key': PUBLISHABLE_API_KEY
        };
        
        // Add authorization header if token exists for automatic customer association
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const cartResponse = await fetch(`${MEDUSA_API_URL}/store/carts`, {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({
                region_id: 'reg_01KRGDTG4A76Z2Z0R2V8RBHRV2' // Same region as products
            })
        });
        
        if (!cartResponse.ok) {
            throw new Error(`Failed to create cart: ${cartResponse.status} ${cartResponse.statusText}`);
        }
        
        const cartData = await cartResponse.json();
        console.log('✅ Cart created successfully:', cartData);
        const medusaCart = cartData.cart;
        
        // Debug: Check if customer is already associated with cart
        console.log('🔍 Checking cart state for customer association...');
        console.log('Cart customer info after creation:', medusaCart.customer);
        console.log('Cart email:', medusaCart.email);
        console.log('Full cart object:', medusaCart);
        
        // STEP 2: Add all cart items to Medusa cart
        console.log('📦 STEP 2: Adding items to cart...');
        await addItemsToCart(medusaCart.id, checkoutState.items);
        
        // STEP 3: Attach authenticated customer to cart (if not already associated)
        console.log('👤 STEP 3: Checking customer attachment...');
        
        // Check if customer is already associated before attempting attachment
        if (medusaCart.customer && medusaCart.customer.id === currentUser.id) {
            console.log('✅ Customer is already associated with cart, skipping attachment step');
        } 
        
        // STEP 4: Attach shipping address
        console.log('📍 STEP 4: Adding shipping address...');
        await addShippingAddressToCart(medusaCart.id, checkoutState.address);
        
        // STEP 5: Add shipping method
        console.log('🚚 STEP 5: Adding shipping method...');
        await addShippingMethodToCart(medusaCart.id);
        
        // STEP 6: Complete checkout with manual payment
        console.log('💳 STEP 6: Completing checkout with manual payment...');
        const paymentResult = await completeCheckout(medusaCart.id);
        
        // STEP 7: Return final order result
        console.log('📄 STEP 7: Order creation completed');
        return {
            order: paymentResult.order,
            cartId: medusaCart.id,
            totalAmount: checkoutState.grandTotal
        };
        
    } catch (error) {
        console.error('❌ Error in order creation flow:', error);
        throw error;
    }
}

// Add items to Medusa cart
async function addItemsToCart(cartId, items) {
    console.log(`Adding ${items.length} items to cart ${cartId}`);
    
    for (const item of items) {
        console.log(`Adding item: ${item.name} (Variant: ${item.variantId}, Qty: ${item.quantity})`);
        
        const lineItemResponse = await fetch(`${MEDUSA_API_URL}/store/carts/${cartId}/line-items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': PUBLISHABLE_API_KEY
            },
            credentials: 'include',
            body: JSON.stringify({
                variant_id: item.variantId,
                quantity: item.quantity
            })
        });
        
        if (!lineItemResponse.ok) {
            const errorData = await lineItemResponse.json().catch(() => ({}));
            throw new Error(`Failed to add item ${item.name}: ${lineItemResponse.status} ${lineItemResponse.statusText}. ${errorData.message || ''}`);
        }
        
        const lineItemData = await lineItemResponse.json();
        console.log(`✅ Added item ${item.name}:`, lineItemData);
    }
    
    console.log('✅ All items added to cart successfully');
}

// Attach authenticated customer to cart

// Add shipping address to cart
async function addShippingAddressToCart(cartId, address) {
    console.log(`Adding shipping address to cart ${cartId}:`, address);
    
    // Prepare shipping address payload for Medusa v2
    const addressPayload = {
        shipping_address: {
            first_name: address.first_name,
            last_name: address.last_name || '',
            address_1: address.address_1,
            address_2: address.address_2 || '',
            city: address.city,
            province: address.province,
            postal_code: address.postal_code,
            phone: address.phone,
            country_code: 'in', // Default to India (lowercase ISO format for Medusa)
            metadata: address.metadata || {}
        }
    };
    
    console.log('🔍 Shipping address payload:', JSON.stringify(addressPayload, null, 2));
    
    // Use correct Medusa v2 cart update endpoint
    const addressResponse = await fetch(`${MEDUSA_API_URL}/store/carts/${cartId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': PUBLISHABLE_API_KEY
        },
        credentials: 'include',
        body: JSON.stringify(addressPayload)
    });
    
    console.log('📤 Shipping address update request:', {
        url: `${MEDUSA_API_URL}/store/carts/${cartId}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': PUBLISHABLE_API_KEY
        },
        body: addressPayload
    });
    
    console.log('Shipping address response status:', addressResponse.status);
    console.log('Shipping address response headers:', Object.fromEntries(addressResponse.headers.entries()));
    
    if (!addressResponse.ok) {
        const errorData = await addressResponse.json().catch(() => ({}));
        console.error('❌ Shipping address error response:', errorData);
        throw new Error(`Failed to add shipping address: ${addressResponse.status} ${addressResponse.statusText}. ${errorData.message || ''}`);
    }
    
    const addressData = await addressResponse.json();
    console.log('✅ Shipping address added to cart successfully:', addressData);
    console.log('Updated cart object:', addressData.cart);
    
    return addressData.cart || addressData;
}

// Add shipping method to cart
async function addShippingMethodToCart(cartId) {
    console.log(`Adding shipping method to cart ${cartId}`);
    
    try {
        // First, fetch available shipping options for the cart
        // Try different possible Medusa v2 endpoints
        console.log('🚚 Fetching available shipping options...');
        
        // Try the standard Medusa v2 endpoint first
        let optionsUrl = `${MEDUSA_API_URL}/store/shipping-options?cart_id=${cartId}`;
        console.log(`📤 Trying standard endpoint: ${optionsUrl}`);
        
        let optionsResponse = await fetch(optionsUrl, {
            method: 'GET',
            headers: {
                'x-publishable-api-key': PUBLISHABLE_API_KEY
            },
            credentials: 'include'
        });
        
        console.log('📥 Standard endpoint response status:', optionsResponse.status);
        
        // If standard endpoint fails, try alternative v2 endpoint
        
        // If both fail, try cart-level shipping options
        if (!optionsResponse.ok) {
            console.log('⚠️ Alternative endpoint failed, trying cart-level...');
            optionsUrl = `${MEDUSA_API_URL}/store/carts/${cartId}`;
            console.log(`📤 Trying cart endpoint: ${optionsUrl}`);
            
            optionsResponse = await fetch(optionsUrl, {
                method: 'GET',
                headers: {
                    'x-publishable-api-key': PUBLISHABLE_API_KEY
                },
                credentials: 'include'
            });
            
            console.log('📥 Cart endpoint response status:', optionsResponse.status);
        }
        
        console.log('📥 Shipping options response status:', optionsResponse.status);
        console.log('📥 Shipping options response headers:', Object.fromEntries(optionsResponse.headers.entries()));
        
        if (!optionsResponse.ok) {
            const errorData = await optionsResponse.json().catch(() => ({}));
            console.error('❌ Shipping options error response:', errorData);
            throw new Error(`Failed to fetch shipping options: ${optionsResponse.status} ${optionsResponse.statusText}. ${errorData.message || ''}`);
        }
        
        const optionsData = await optionsResponse.json();
        console.log('📦 Available shipping options response:', optionsData);
        console.log('📦 Response structure:', Object.keys(optionsData));
        
        // Handle different response formats from different endpoints
        let shippingOptions = [];
        
        if (optionsData.shipping_options) {
            // Standard format
            shippingOptions = optionsData.shipping_options;
            console.log('📋 Using standard shipping_options format');
        } else if (optionsData.cart?.shipping_options) {
            // Cart-level format
            shippingOptions = optionsData.cart.shipping_options;
            console.log('📋 Using cart-level shipping_options format');
        } else if (Array.isArray(optionsData)) {
            // Direct array format
            shippingOptions = optionsData;
            console.log('📋 Using direct array format');
        } else if (optionsData.data?.shipping_options) {
            // Data wrapper format
            shippingOptions = optionsData.data.shipping_options;
            console.log('📋 Using data wrapper format');
        } else {
            console.warn('⚠️ Unknown shipping options response format');
            console.log('Available keys in response:', Object.keys(optionsData));
            
            // Try to find any array in the response
            for (const key in optionsData) {
                if (Array.isArray(optionsData[key])) {
                    shippingOptions = optionsData[key];
                    console.log(`📋 Found array in key: ${key}`);
                    break;
                }
            }
        }
        
        console.log(`📋 Found ${shippingOptions.length} shipping options:`, shippingOptions.map(opt => ({
            id: opt.id,
            name: opt.name,
            price: opt.amount || opt.price,
            type: opt.price_type || opt.type
        })));
        
        if (shippingOptions.length === 0) {
            console.warn('⚠️ No shipping options found, checking if cart has shipping methods...');
            if (shippingOptions.length === 0) {
    throw new Error('No shipping options available for this cart');
}
        }
        
        // Find a suitable shipping option (prefer flat rate standard shipping)
        let selectedOption = shippingOptions.find(option => 
            option.name.toLowerCase().includes('standard') || 
            option.name.toLowerCase().includes('manual') ||
            option.price_type === 'flat'
        );
        
        // If no preferred option found, use the first available option
        if (!selectedOption) {
            selectedOption = shippingOptions[0];
            console.log('⚠️ No preferred shipping option found, using first available');
        }
        
        console.log('✅ Selected shipping option:', {
            id: selectedOption.id,
            name: selectedOption.name,
            price: selectedOption.amount,
            type: selectedOption.price_type
        });
        
        // Add the selected shipping method to cart
        const shippingResponse = await fetch(`${MEDUSA_API_URL}/store/carts/${cartId}/shipping-methods`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': PUBLISHABLE_API_KEY
            },
            credentials: 'include',
            body: JSON.stringify({
                option_id: selectedOption.id,
                data: {} // Additional data if required
            })
        });
        
        if (!shippingResponse.ok) {
            const errorData = await shippingResponse.json().catch(() => ({}));
            throw new Error(`Failed to add shipping method: ${shippingResponse.status} ${shippingResponse.statusText}. ${errorData.message || ''}`);
        }
        
        const shippingData = await shippingResponse.json();
        console.log('✅ Shipping method added to cart successfully:', shippingData);
        console.log('📦 Updated cart after shipping method:', shippingData.cart);
        
    } catch (error) {
        console.error('❌ Error adding shipping method:', error);
        throw error;
    }
}

// Complete checkout with manual payment
async function completeCheckout(cartId) {

    console.log("Starting Razorpay payment...");

    try {

        const options = {

            key: "rzp_test_So7H4qKiXQch5g",

            amount: checkoutState.grandTotal * 100,

            currency: "INR",

            name: "Your Store",

            description: "Order Payment",

            handler: async function (response) {

                console.log("✅ Razorpay payment success:", response);
                // SAVE ORDER TO POSTGRESQL DATABASE

const backendOrderPayload = {

    customer: {
    name:
    currentUser.firstName ||
    currentUser.first_name ||
    currentUser.name ||
    "Customer",

    email:
        currentUser.email || "",

    phone:
        checkoutState.address?.phone || "",

    address: `
${checkoutState.address?.address_1 || ""}
${checkoutState.address?.city || ""}
${checkoutState.address?.province || ""}
${checkoutState.address?.postal_code || ""}
`.trim()
},

    items: checkoutState.items,

    subtotal: checkoutState.subtotal,

    shipping_charge: checkoutState.shipping,

    total_amount: checkoutState.grandTotal,

    payment_status: "paid",

    order_status: "pending",

    razorpay_payment_id: response.razorpay_payment_id
};

console.log("Sending order to backend:", backendOrderPayload);

const backendResponse = await fetch(
    "http://localhost:7000/api/orders",
    {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(backendOrderPayload)
    }
);

const backendData = await backendResponse.json();

console.log("Backend order response:", backendData);

if (!backendResponse.ok) {
    throw new Error("Failed to save order in database");
}

console.log("✅ Order saved in PostgreSQL");

                try {

    console.log("✅ PostgreSQL order completed");

    // CLEAR CART
    cart = [];

    updateCartUI();

    localStorage.removeItem(
        `ayurLeafCart_${currentUser.id}`
    );

    // SUCCESS MESSAGE
    alert(
        "Order placed successfully!"
    );

    // REDIRECT
    window.location.href =
        "./orderHistory.html";

} catch (err) {

    console.error(
        "Checkout cleanup failed:",
        err
    );
}
            },

            prefill: {
                name: currentUser?.first_name || "Customer",
                email: currentUser?.email || "",
                contact: checkoutState.address?.phone || ""
            },

            theme: {
                color: "#5e6f52"
            }
        };

        const rzp = new Razorpay(options);

        rzp.open();

    } catch (error) {

        console.error(
            "Razorpay Error:",
            error
        );

        showNotification(
            "Payment failed",
            "error"
        );
    }
}

// Handle successful order creation
function handleOrderSuccess(orderResult) {
    console.log('🎉 Handling successful order:', orderResult);
    
    const order = orderResult.order;
    const orderNumber = order.display_id || order.id;
    const totalAmount = orderResult.totalAmount;
    
    // Clear frontend cart
    clearCurrentUserCart();
    updateCartUI();
    
    // Reset checkout state
    checkoutState = {
        address: null,
        items: [],
        subtotal: 0,
        shipping: 50,
        grandTotal: 0
    };
    currentCheckoutAddress = null;
    selectedAddress = null;
    
    // Close checkout summary modal
    closeCheckoutSummaryModal();
    
    // Show success modal with order details
    showOrderSuccessModal(orderNumber, totalAmount);
    
    // Show notification
    showNotification(`Order #${orderNumber} placed successfully!`, 'success');
}

// Show order success modal
function showOrderSuccessModal(orderNumber, totalAmount) {
    console.log(`Showing success modal for order #${orderNumber}`);
    
    // Create success modal if it doesn't exist
    let successModal = document.getElementById('orderSuccessModal');
    
    if (!successModal) {
        successModal = document.createElement('div');
        successModal.id = 'orderSuccessModal';
        successModal.className = 'order-success-modal';
        successModal.innerHTML = `
            <div class="order-success-overlay" onclick="closeOrderSuccessModal()"></div>
            <div class="order-success-content">
                <div class="order-success-header">
                    <div class="success-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5e6f52" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <h2>Order Placed Successfully!</h2>
                    <p>Thank you for your purchase</p>
                </div>
                
                <div class="order-success-body">
                    <div class="order-details">
                        <div class="order-detail-row">
                            <span class="detail-label">Order Number:</span>
                            <span class="detail-value" id="successOrderNumber">#${orderNumber}</span>
                        </div>
                        <div class="order-detail-row">
                            <span class="detail-label">Total Amount:</span>
                            <span class="detail-value" id="successOrderTotal">₹${totalAmount.toFixed(2)}</span>
                        </div>
                        <div class="order-detail-row">
                            <span class="detail-label">Payment Status:</span>
                            <span class="detail-value payment-status">Paid (Manual)</span>
                        </div>
                        <div class="order-detail-row">
                            <span class="detail-label">Estimated Delivery:</span>
                            <span class="detail-value">3-5 business days</span>
                        </div>
                    </div>
                    
                    <div class="order-success-message">
                        <p>You will receive an order confirmation email shortly. Your order details will also appear in your order history.</p>
                    </div>
                </div>
                
                <div class="order-success-actions">
                    <button class="continue-shopping-btn" onclick="continueShopping()">
                        Continue Shopping
                    </button>
                    <button class="view-orders-btn" onclick="viewOrderHistory()">
                        View Orders
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(successModal);
        
        // Add styles for the success modal
        const style = document.createElement('style');
        style.textContent = `
            .order-success-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: none;
            }
            
            .order-success-modal.active {
                display: block;
            }
            
            .order-success-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            }
            
            .order-success-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                text-align: center;
            }
            
            .success-icon {
                margin-bottom: 20px;
            }
            
            .order-success-header h2 {
                color: #5e6f52;
                margin-bottom: 8px;
                font-size: 28px;
            }
            
            .order-success-header p {
                color: #666;
                margin-bottom: 30px;
            }
            
            .order-details {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                text-align: left;
            }
            
            .order-detail-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            
            .order-detail-row:last-child {
                border-bottom: none;
            }
            
            .detail-label {
                color: #666;
                font-weight: 500;
            }
            
            .detail-value {
                color: #333;
                font-weight: 600;
            }
            
            .payment-status {
                color: #5e6f52;
            }
            
            .order-success-message {
                color: #666;
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 30px;
            }
            
            .order-success-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
            }
            
            .continue-shopping-btn, .view-orders-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .continue-shopping-btn {
                background: #5e6f52;
                color: white;
            }
            
            .continue-shopping-btn:hover {
                background: #4a5a42;
            }
            
            .view-orders-btn {
                background: #f8f9fa;
                color: #333;
                border: 1px solid #dee2e6;
            }
            
            .view-orders-btn:hover {
                background: #e9ecef;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Update order details in modal
    document.getElementById('successOrderNumber').textContent = `#${orderNumber}`;
    document.getElementById('successOrderTotal').textContent = `₹${totalAmount.toFixed(2)}`;
    
    // Show modal
    successModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close order success modal
function closeOrderSuccessModal() {
    const modal = document.getElementById('orderSuccessModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Continue shopping after successful order
function continueShopping() {
    console.log('Continuing shopping after order success');
    closeOrderSuccessModal();
    // Redirect to shop page
    window.location.href = 'shop.html';
}


// Export checkout summary functions for onclick handlers
globalThis.openCheckoutSummaryModal = openCheckoutSummaryModal;
globalThis.closeCheckoutSummaryModal = closeCheckoutSummaryModal;
globalThis.changeDeliveryAddress = changeDeliveryAddress;
globalThis.backToAddressSelection = backToAddressSelection;
globalThis.proceedToPayment = proceedToPayment;

// Export order success modal functions for onclick handlers
globalThis.closeOrderSuccessModal = closeOrderSuccessModal;
globalThis.continueShopping = continueShopping;
globalThis.handleAccount =handleAccount;