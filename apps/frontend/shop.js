// Product data - fetched from Medusa backend
let products = [];

// Cart state
let cart = [];

// Modal state
let selectedProduct = null;
let selectedVariant = null;
let modalImageIndex = 0;
// Auth state
let currentUser =
JSON.parse(
    localStorage.getItem(
        "divineYouUser"
    )
) || null;
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
    localStorage.removeItem('divineYouCart_guest');
    
    // If user is not logged in, ensure guest cart is empty on fresh load
    if (!isLoggedIn) {
        const guestCart = localStorage.getItem('divineYouGuestCart');
        if (guestCart) {
            try {
                const parsed = JSON.parse(guestCart);
                // Only keep guest cart if it has items and user wasn't just logged out
                // This prevents showing old cart after logout
                if (parsed.length > 0) {
                    // Check if we have a logout flag
                    const wasLoggedOut = sessionStorage.getItem('divineYouJustLoggedOut');
                    if (wasLoggedOut === 'true') {
                        localStorage.removeItem('divineYouGuestCart');
                        sessionStorage.removeItem('divineYouJustLoggedOut');
                    }
                }
            } catch (e) {
                localStorage.removeItem('divineYouGuestCart');
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

    fetch("https://divine-you.onrender.com/api/products")

    .then(response => {

        if (!response.ok) {
            throw new Error(
                `Failed to load products: ${response.status}`
            );
        }

        return response.json();
    })

    .then(data => {

        products = data.products.map((product, index) => ({

            id: product.id,

            name: product.title,

            subtitle: product.subtitle || "",

            images:
                product.images && product.images.length > 0
                    ? product.images.map(img => img.image_url)
                    : [
                        "https://via.placeholder.com/300x200?text=Product"
                    ],

            image:
                product.images &&
                product.images.length > 0
                    ? product.images[0].image_url
                    : "https://via.placeholder.com/300x200?text=Product",

            description: product.description || "",

            variants: product.variants || [],

            currentPrice:
                Number(product.variants?.[0]?.price || 0),

            oldPrice: "",

            rating: 5,

            ratingCount:
                [128, 342, 517, 289, 196, 423, 267, 389][index % 8],

            weight:
                product.variants?.[0]?.title || ""

        }));

        renderProducts(products);

    })

    .catch(error => {

        console.error("Error fetching products:", error);

        productGrid.innerHTML =
            '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Failed to load products</div>';
    });
}
// Render products to the grid
function renderProducts(products) {
    productGrid.innerHTML = products.map(product => createProductCard(product)).join('');
}

// Create product card HTML
function createProductCard(product) {

    const images = product.images || [product.image];

    return `
        <div class="product-card">

            <div
                class="product-image-slider"
                onclick="openProductModal('${product.id}')"
            >

                <button
                    class="slider-btn left"
                    onclick="
                        event.stopPropagation();
                        changeSlide('${product.id}', -1)
                    "
                >
                    &#10094;
                </button>

                <img
                    src="${images[0]}"
                    alt="${product.name}"
                    class="product-image"
                    id="image-${product.id}"
                    data-index="0"
                >

                <button
                    class="slider-btn right"
                    onclick="
                        event.stopPropagation();
                        changeSlide('${product.id}', 1)
                    "
                >
                    &#10095;
                </button>

            </div>

            <div
                class="product-info"
                onclick="openProductModal('${product.id}')"
                style="cursor:pointer;"
            >

                <h3 class="product-name">
                    ${product.name}
                </h3>

                ${
                    product.subtitle
                    ?
                    `<p class="product-subtitle">
                        ${product.subtitle}
                    </p>`
                    :
                    ''
                }

                <div class="product-rating">
                    <span class="rating-stars">
                        ⭐ ${product.rating}
                    </span>

                    <span class="rating-count">
                        (${product.ratingCount})
                    </span>
                </div>

                ${
                    product.weight
                    ?
                    `<span class="weight-badge">
                        ${product.weight}
                    </span>`
                    :
                    ''
                }

                <div class="price-section">
                    <span class="current-price">
                        ₹${product.currentPrice}
                    </span>

                    <span class="old-price">
                        ${
                            product.oldPrice
                            ?
                            `₹${product.oldPrice}`
                            :
                            ''
                        }
                    </span>
                </div>

                <button
                    class="add-to-cart-btn"
                    onclick="
                        event.stopPropagation();
                        openProductModal('${product.id}')
                    "
                >
                    Add
                </button>

            </div>

        </div>
    `;
}
function changeSlide(productId, direction) {

    const product =
        products.find(
             p => String(p.id) === String(productId)
        );

    if (
        !product ||
        !product.images ||
        product.images.length === 0
    ) {
        return;
    }

    const imageElement =
        document.getElementById(
            `image-${productId}`
        );

    let currentIndex =
        parseInt(
            imageElement.dataset.index
        );

    currentIndex += direction;

    if (
        currentIndex <
        0
    ) {
        currentIndex =
        product.images.length - 1;
    }

    if (
        currentIndex >=
        product.images.length
    ) {
        currentIndex = 0;
    }

    imageElement.src =
        product.images[currentIndex];

    imageElement.dataset.index =
        currentIndex;
}

window.changeSlide =
    changeSlide;

// Add product to cart
function addToCart(productId) {
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
        return `divineYouCart_${currentUser.id}`;
    }
    return 'divineYouGuestCart';
}

// Clear cart for current user
function clearCurrentUserCart() {
    const cartKey = getUserCartKey();
    localStorage.removeItem(cartKey);
    
    // Also clear any old guest cart to prevent persistence
    localStorage.removeItem('divineYouCart_guest');
    
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

    // PostgreSQL format
    if (variant.price) {
        return Number(variant.price);
    }

    // Medusa v2
    if (variant.calculated_price?.calculated_amount) {
        return variant.calculated_price.calculated_amount / 100;
    }

    // Medusa fallback
    if (variant.prices?.[0]?.amount) {
        return variant.prices[0].amount / 100;
    }

    return 0;
}

// Modal functions
function openProductModal(productId) {

const product = products.find(
    p => String(p.id) === String(productId)
);    if (!product) return;

    selectedProduct = product;
    selectedVariant = null;

    // Populate modal with product data
    modalImageIndex = 0;

const modalImage =
document.getElementById(
    'modalProductImage'
);

modalImage.src =
    product.images[0];

modalImage.alt =
    product.name;

modalImage.dataset.index = 0;
window.changeSlide = changeSlide;
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductSubtitle').textContent = product.subtitle || '';
    document.getElementById('modalRatingStars').textContent = `⭐ ${product.rating}`;
    document.getElementById('modalRatingCount').textContent = `(${product.ratingCount})`;
    document.getElementById('modalProductDescription').textContent = product.description || 'No description available.';

    function changeModalSlide(direction) {

    if (
        !selectedProduct ||
        !selectedProduct.images ||
        selectedProduct.images.length === 0
    ) {
        return;
    }

    modalImageIndex += direction;

    if (modalImageIndex < 0) {

        modalImageIndex =
            selectedProduct.images.length - 1;
    }

    if (
        modalImageIndex >=
        selectedProduct.images.length
    ) {

        modalImageIndex = 0;
    }

    const modalImage =
        document.getElementById(
            'modalProductImage'
        );

    modalImage.src =
        selectedProduct.images[
            modalImageIndex
        ];

    modalImage.dataset.index =
        modalImageIndex;
}

window.changeModalSlide =
    changeModalSlide;
    // Populate variants
    const variantsList = document.getElementById('modalVariantsList');
    if (product.variants && product.variants.length > 0) {
        
        variantsList.innerHTML = product.variants.map(variant => {
            
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

    selectedVariant = selectedProduct.variants.find( v => String(v.id) === String(variantId));
    
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

// AUTHENTICATION FUNCTIONS
// Load auth state from localStorage
function loadAuthState() {

    const savedUser =
        localStorage.getItem(
            'divineYouUser'
        );

    if (savedUser) {

        try {

            currentUser =
                JSON.parse(savedUser);

            isLoggedIn = true;

        } catch (error) {

            console.error(
                'Error parsing saved user data:',
                error
            );

            localStorage.removeItem(
                'divineYouUser'
            );

            isLoggedIn = false;

            currentUser = null;
        }

    } else {

        isLoggedIn = false;

        currentUser = null;
    }
}

// Save auth state to localStorage
function saveAuthState(user) {

    if (user) {

        currentUser = user;

        isLoggedIn = true;

        localStorage.setItem(
            'divineYouUser',
            JSON.stringify(user)
        );

    } else {

        currentUser = null;

        isLoggedIn = false;

        localStorage.removeItem(
            'divineYouUser'
        );
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
                "https://divine-you.onrender.com/api/users/login",
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

        window.loginResponse = data;

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Login failed"
            );
        }

        const user =
            data.user;
localStorage.setItem(
    "divineYouAuthToken",
    data.token
);
        // SAVE USER
        localStorage.setItem(
            "divineYouUser",
            JSON.stringify(user)
        );

        currentUser = user;

        isLoggedIn = true;

        // UPDATE UI
        updateProfileDropdown();

        loadCartFromStorage();

        updateCartUI();

        closeLoginModal();

        showNotification(
            `Welcome ${user.first_name}`,
            "success"
        );

        // REDIRECT
        setTimeout(() => {

            if (
                user.role &&
                user.role.toLowerCase() === "admin"
            ) {

                window.location.href =
                    "./admin.html";

            } else if (
                user.role &&
                user.role.toLowerCase() === "courier"
            ) {

                window.location.href =
                    "./courier.html";

            } else {

                window.location.href =
                    "./shop.html";
            }

        }, 1000);

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        showNotification(
            error.message ||
            "Login failed",
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
            "https://divine-you.onrender.com/api/users/register",
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

function handleLogout() {

    sessionStorage.setItem(
        "divineYouJustLoggedOut",
        "true"
    );

    clearCurrentUserCart();

    clearAuthState();
}
// Clear auth state and update UI
function clearAuthState() {
    currentUser = null;
    isLoggedIn = false;
    
    // Clear auth storage
    localStorage.removeItem('divineYouUser');
    
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

    // Check if cart is empty
    if (cart.length === 0) {

        showNotification(
            'Your cart is empty. Add items before checkout.',
            'error'
        );

        return;
    }

    // ALWAYS REFRESH AUTH STATE
    currentUser =
    JSON.parse(
        localStorage.getItem(
            "divineYouUser"
        )
    ) || null;

    const authToken =
    localStorage.getItem(
        "divineYouAuthToken"
    );

    // CHECK LOGIN
    if (
        !currentUser ||
        !authToken
    ) {

        showNotification(
            'Please login to proceed with checkout.',
            'error'
        );

        setTimeout(() => {

            openLoginModal();

        }, 1000);

        return;
    }

    // FORCE LOGIN STATE TRUE
    isLoggedIn = true;

    // Open address modal
    openAddressModal();
}

// Open address modal
function openAddressModal() {
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
            `https://divine-you.onrender.com/api/address/${currentUser.id}`
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


    selectedAddress =
    addresses.find(addr => {

        return (
            String(addr.id) ===
            String(addressId)
        );
    });

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
    editingAddress = addresses.find(addr => addr.id === addressId);
    
    if (editingAddress) {       
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
            `https://divine-you.onrender.com/api/address/${addressId}`,
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
    
    // Validate form
    if (!validateAddressForm()) {
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
            "https://divine-you.onrender.com/api/address/create",
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
            `https://divine-you.onrender.com/api/address/${addressId}`,
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
    if (!selectedAddress) {
        showNotification('Please select an address', 'error');
        return;
    }
    
    // Store selected address globally for persistence
    currentCheckoutAddress = selectedAddress;
    
    // Store selected address for future use
    localStorage.setItem('divineYouSelectedAddress', JSON.stringify(selectedAddress));
    
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
    
    // Set selected address - use global persistent address
    checkoutState.address = currentCheckoutAddress || selectedAddress;
    
    
    // Set cart items
    checkoutState.items = [...cart];
    
    // Calculate subtotal
    checkoutState.subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Calculate grand total (subtotal + shipping)
    checkoutState.grandTotal = checkoutState.subtotal + checkoutState.shipping;
    
}

// Render checkout summary
function renderCheckoutSummary() {
    
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
    
    
    if (checkoutState.address) {
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
    // Close checkout summary modal
    closeCheckoutSummaryModal();
    
    // Open address modal with a slight delay for smooth transition
    setTimeout(() => {
        openAddressModal();
    }, 300);
}

// Back to address selection
function backToAddressSelection() {
    
    // Close checkout summary modal
    closeCheckoutSummaryModal();
    
    // Open address modal with a slight delay for smooth transition
    setTimeout(() => {
        openAddressModal();
    }, 300);
}

// Proceed to payment - REAL MEDUSA ORDER CREATION FLOW (Phase 3)
function proceedToPayment() {    
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

    // Show loading state
    const payButton = document.querySelector('.proceed-to-pay-btn');
    const originalText = payButton.textContent;
    payButton.textContent = 'Creating Order...';
    payButton.disabled = true;
    
    // Start the complete order creation flow
    completeCheckout()
    .then(orderResult => {
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

// Complete checkout with manual payment
async function completeCheckout() {

    try {

        return new Promise((resolve, reject) => {

            const options = {

                key: "rzp_test_So7H4qKiXQch5g",

                amount: checkoutState.grandTotal * 100,

                currency: "INR",

                name: "Divine You",

                description: "Order Payment",

                handler: async function (response) {

                    try {

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

                            razorpay_payment_id:
                                response.razorpay_payment_id
                        };

                        const token =
localStorage.getItem(
    "divineYouAuthToken"
);

const backendResponse =
await fetch(
    "https://divine-you.onrender.com/api/orders",
    {
        method: "POST",

        headers: {
            "Content-Type":
            "application/json",

            "Authorization":
            `Bearer ${token}`
        },

        body: JSON.stringify(
            backendOrderPayload
        )
    }
);

                        const backendData =
                            await backendResponse.json();

                        if (!backendResponse.ok) {

                            throw new Error(
                                backendData.message ||
                                "Failed to save order"
                            );
                        }


                        // CLEAR CART

                        cart = [];

                        updateCartUI();

                        localStorage.removeItem(
                            `divineYouCart_${currentUser.id}`
                        );

                        // IMPORTANT RETURN

                        resolve({
    order: backendData.order || backendData,
    paymentId:
        response.razorpay_payment_id,

    totalAmount:
        checkoutState.grandTotal
});

                        // REDIRECT

                        setTimeout(() => {

                            window.location.href =
                                "./orderHistory.html";

                        }, 1000);

                    } catch (err) {

                        console.error(
                            "Payment handler error:",
                            err
                        );

                        reject(err);
                    }
                },

                prefill: {

                    name:
                        currentUser?.first_name ||
                        currentUser?.firstName ||
                        "Customer",

                    email:
                        currentUser?.email || "",

                    contact:
                        checkoutState.address?.phone || ""
                },

                theme: {
                    color: "#5e6f52"
                },

                modal: {

                    ondismiss: function () {

                        reject(
                            new Error(
                                "Payment popup closed by user"
                            )
                        );
                    }
                }
            };

            const rzp = new Razorpay(options);

            rzp.open();
        });

    } catch (error) {

        console.error(
            "Razorpay Error:",
            error
        );

        showNotification(
            "Payment failed",
            "error"
        );

        throw error;
    }
}

// Handle successful order creation
function handleOrderSuccess(orderResult) {
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

}

// Show order success modal
function showOrderSuccessModal(orderNumber, totalAmount) {
    
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