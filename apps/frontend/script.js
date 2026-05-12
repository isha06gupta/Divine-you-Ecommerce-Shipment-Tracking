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
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const address = document.getElementById("address").value.trim();
        const volunteer = document.getElementById("volunteer").checked;
        const sponsor = document.getElementById("sponsor").checked;
        const partner = document.getElementById("partner").checked;

        // Validate form
        if (name && email && phone && address && (volunteer || sponsor || partner)) {
            popupMessage.textContent = "Thank you for joining us! Your membership details have been submitted successfully. Together, we can make a difference!";

            // Clear form fields
            document.getElementById("name").value = "";
            document.getElementById("email").value = "";
            document.getElementById("phone").value = "";
            document.getElementById("address").value = "";
            document.getElementById("volunteer").checked = false;
            document.getElementById("sponsor").checked = false;
            document.getElementById("partner").checked = false;
        } else {
            popupMessage.textContent = "Oops! Please ensure all fields are filled out correctly before submitting the form.";
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

// ====================
// AUTHENTICATION FUNCTIONS
// ====================

// Medusa API configuration
const MEDUSA_API_URL = 'http://localhost:9000';
const PUBLISHABLE_API_KEY = 'pk_b2efd7f24ed19b2bad9b653386611f37d7bbe788288ab8cd4f27cc199cf64acb';

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
function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    // Basic validation
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing In...';
    submitBtn.disabled = true;
    
    // Call Medusa login API
    fetch(`${MEDUSA_API_URL}/auth/customer/emailpass`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': PUBLISHABLE_API_KEY
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(response => {
        console.log('Login response status:', response.status);
        return response.json().then(data => {
            if (!response.ok) {
                // Handle different error types
                if (response.status === 401) {
                    throw new Error('Invalid email or password. Please try again.');
                } else if (response.status === 400) {
                    throw new Error(data.message || 'Invalid login data. Please check your credentials.');
                } else {
                    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
                }
            }
            return data;
        });
    })
    .then(data => {
        console.log('Login response:', data);
        
        // Extract token from login response
        const token = data.token;
        
        if (!token) {
            throw new Error('No authentication token received from server');
        }
        
        // Store token temporarily
        localStorage.setItem('ayurLeafAuthToken', token);
        
        console.log("Stored token:", token);
        
        // STEP 2: Exchange token for authenticated session
        return fetch(`${MEDUSA_API_URL}/auth/session`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-publishable-api-key': PUBLISHABLE_API_KEY
            },
            credentials: 'include'
        });
    })
    .then(response => {
        console.log('Auth session response status:', response.status);
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(`Failed to establish authenticated session: ${response.status} ${response.statusText}`);
            }
            console.log('Auth session response:', data);
            return data;
        });
    })
    .then(sessionData => {
        // STEP 3: Fetch customer data using authenticated session
        console.log('Document cookies before customer fetch:', document.cookie);
        
        return fetch(`${MEDUSA_API_URL}/store/customers/me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'x-publishable-api-key': PUBLISHABLE_API_KEY
            }
        });
    })
    .then(response => {
        console.log('Customer fetch response status:', response.status);
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(`Failed to fetch customer data: ${response.status} ${response.statusText}`);
            }
            return data;
        });
    })
    .then(customerData => {
        console.log('Customer data response:', customerData);
        
        // Extract customer from the response
        const customer = customerData.customer;
        
        if (!customer || !customer.id) {
            throw new Error('Invalid customer data received');
        }
        
        // Create user object for frontend
        const user = {
            id: customer.id,
            email: customer.email,
            name: customer.first_name || customer.metadata?.full_name || customer.email.split('@')[0],
            firstName: customer.first_name,
            lastName: customer.last_name,
            phone: customer.phone,
            metadata: customer.metadata,
            createdAt: customer.created_at
        };
        
        // Get stored token for reference
        const token = localStorage.getItem('ayurLeafAuthToken');
        
        // Save complete auth state
        saveAuthState(user, token);
        
        // Load user-specific cart
        loadCartFromStorage();
        updateCartUI();
        
        updateProfileDropdown();
        closeLoginModal();
        
        // Show success message
        showNotification(`Welcome back, ${user.name}!`, 'success');
    })
    .catch(error => {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed. Please try again.', 'error');
    })
    .finally(() => {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

// Handle register
function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    
    // Basic validation
    if (!name || !email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    // Call Medusa registration API
    fetch(`${MEDUSA_API_URL}/auth/customer/emailpass/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': PUBLISHABLE_API_KEY
        },
        body: JSON.stringify({
            email: email,
            password: password,
            // Store full name in metadata
            metadata: {
                full_name: name
            }
        })
    })
    .then(response => {
        console.log('Registration response status:', response.status);
        return response.json().then(data => {
            if (!response.ok) {
                // Handle different error types
                if (response.status === 400 && data.type === 'duplicate_error') {
                    throw new Error('An account with this email already exists. Please sign in instead.');
                } else if (response.status === 400) {
                    throw new Error(data.message || 'Invalid registration data. Please check your information.');
                } else {
                    throw new Error(`Registration failed: ${response.status} ${response.statusText}`);
                }
            }
            return data;
        });
    })
    .then(data => {
        console.log('Registration response:', data);
        
        // Extract token from registration response
        const token = data.token;
        
        if (!token) {
            throw new Error('No authentication token received from registration');
        }
        
        console.log('Registration token:', token);
        
        // STEP 2: Exchange token for authenticated session
        return fetch(`${MEDUSA_API_URL}/auth/session`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-publishable-api-key': PUBLISHABLE_API_KEY
            },
            credentials: 'include'
        });
    })
    .then(response => {
        console.log('Auth session response status:', response.status);
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(`Failed to establish authenticated session: ${response.status} ${response.statusText}`);
            }
            console.log('Auth session response:', data);
            return data;
        });
    })
    .then(sessionData => {
        // STEP 3: Create actual customer entity
        console.log('Creating customer entity...');
        
        // Split full name into first_name and last_name
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        return fetch(`${MEDUSA_API_URL}/store/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': PUBLISHABLE_API_KEY
            },
            credentials: 'include',
            body: JSON.stringify({
                email: email,
                first_name: firstName,
                last_name: lastName
            })
        });
    })
    .then(response => {
        console.log('Customer creation response status:', response.status);
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(`Failed to create customer entity: ${response.status} ${response.statusText}`);
            }
            console.log('Customer creation response:', data);
            return data;
        });
    })
    .then(customerData => {
        console.log('Registration flow completed successfully');
        
        // Registration successful - don't auto-login
        closeRegisterModal();
        showNotification('Account created successfully! Please sign in to continue.', 'success');
        
        setTimeout(() => {
            openLoginModal();
        }, 1500);
    })
    .catch(error => {
        console.error('Registration error:', error);
        showNotification(error.message || 'Registration failed. Please try again.', 'error');
    })
    .finally(() => {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
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
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('active');
    
    showNotification('Account page coming soon!');
}

// Handle order history navigation
function handleOrderHistory() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('active');
    
    showNotification('Order history coming soon!');
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