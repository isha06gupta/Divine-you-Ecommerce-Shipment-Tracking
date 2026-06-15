document.addEventListener("DOMContentLoaded", () => {
    // Initialize authentication
    initAuth();
    
    // Options for the IntersectionObserver
    const observerOptions = {
        threshold: 0.1 // Trigger when 10% of the target is visible
    };

    // Callback function for the IntersectionObserver
    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            // Check if the target is intersecting
            if (entry.isIntersecting) {
                // Add the 'animate' class to trigger the animation
                entry.target.classList.add("animate");
                // Stop observing the target
                observer.unobserve(entry.target);
            }
        });
    };

    // Create a new IntersectionObserver
    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Get all elements to be observed
    const sections = document.querySelectorAll(".animate-on-scroll");
    sections.forEach(section => {
        observer.observe(section);
    });

    // Hero button now navigates to shop.html - no scroll behavior needed
    // Removed smooth scroll code as button now has direct href="shop.html"

    // Handle form submission
    const submitBtn = document.getElementById("submit-btn");
    const popup = document.getElementById("popup");
    const popupMessage = document.getElementById("popup-message");
    const closeBtn = document.querySelector(".close-btn");

    submitBtn.addEventListener("click", (event) => {
        event.preventDefault();

        // Get form values
const name = document.getElementById("name").value.trim();
const phone = document.getElementById("phone").value.trim();

// Validate form
if (name && phone) {

    popupMessage.textContent =
    "Thank you! You will receive updates about new products and wellness news soon.";

    // Clear form fields
    document.getElementById("name").value = "";
    document.getElementById("phone").value = "";

} else {

    popupMessage.textContent =
    "Please enter your name and phone number.";
}


        // Display popup
        popup.style.display = "block";
    });

    closeBtn.addEventListener("click", () => {
        popup.style.display = "none";
    });

    window.addEventListener("click", (event) => {
        if (event.target === popup) {
            popup.style.display = "none";
        }
    });
});

// Password toggle function
function togglePassword(inputId, toggleBtn) {
    const passwordInput = document.getElementById(inputId);
    const icon = toggleBtn.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// AUTHENTICATION FUNCTIONS
// Auth state

let currentUser = null;
let isLoggedIn = false;

// Initialize auth
function initAuth() {
    loadAuthState();
    updateProfileDropdown();
    
    // Export functions for global access
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
    globalThis.clearCurrentUserCart = clearCurrentUserCart;
    globalThis.togglePassword = togglePassword;
}

// Load auth state from localStorage
function loadAuthState() {
    const savedUser = localStorage.getItem('divineYouUser');
    const savedToken = localStorage.getItem('divineYouAuthToken');
    
    if (savedUser && savedToken) {
        try {
            currentUser = JSON.parse(savedUser);
            isLoggedIn = true;
            
        } catch (error) {
            console.error('Error parsing saved user data:', error);
            // Clear corrupted data
            localStorage.removeItem('divineYouUser');
            localStorage.removeItem('divineYouAuthToken');
        }
    }
}

// Save auth state to localStorage
function saveAuthState(user, token) {
    if (user && token) {
        currentUser = user;
        isLoggedIn = true;
        localStorage.setItem('divineYouUser', JSON.stringify(user));
        localStorage.setItem('divineYouAuthToken', token);
    } else {
        currentUser = null;
        isLoggedIn = false;
        localStorage.removeItem('divineYouUser');
        localStorage.removeItem('divineYouAuthToken');
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
    const phone =
    formData.get("phone");

    try {

        const response = await fetch(
            "https://divine-you-ecommerce-shipment-tracking.onrender.com/api/users/login",
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


        if (!response.ok) {

            throw new Error(
                data.message
            );
        }

        const user = data.user;

        localStorage.setItem(
            "divineYouUser",
            JSON.stringify(user)
        );
        localStorage.setItem(
    "divineYouAuthToken",
    data.token
);

        currentUser = user;

        isLoggedIn = true;

        showNotification(
            `Welcome ${user.first_name}`,
            "success"
        );

        closeLoginModal();

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
                "./index.html";
            }

        }, 1000);

    } catch (error) {

        console.error(error);

        showNotification(
            error.message,
            "error"
        );
    }
}

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

    try {

        const response = await fetch(
            "https://divine-you-ecommerce-shipment-tracking.onrender.com/api/users/register",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({

                    first_name: firstName,

                    last_name: lastName,

                    email: email,

                    password: password,
                    
                    phone: phone,

                    role: "user"
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
            "Registration Successful",
            "success"
        );

        closeRegisterModal();

        openLoginModal();

    } catch (error) {

        console.error(error);

        showNotification(
            error.message,
            "error"
        );
    }
}
// Handle logout
function handleLogout() {

    sessionStorage.setItem(
        'divineYouJustLoggedOut',
        'true'
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
    localStorage.removeItem('divineYouAuthToken');
    
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

    const dropdown =
        document.getElementById('profileDropdown');

    if (dropdown)
        dropdown.classList.remove('active');

    window.location.href =
        'orderHistory.html';
}

// Show forgot password (UI only for now)
function showForgotPassword() {
    showNotification('Password reset functionality coming soon! Please contact support.');
}

// ====================
// CART FUNCTIONS
// ====================

// Cart state
let cart = [];

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

// Update cart UI (placeholder for index.html)
function updateCartUI() {
    // This would update cart UI on index.html if needed
    // Currently cart UI is only on shop.html
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