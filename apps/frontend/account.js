const currentUser = JSON.parse(localStorage.getItem("divineYouUser"));
const token =
localStorage.getItem(
    "divineYouAuthToken"
);
if (!currentUser) window.location.href = "index.html";

const firstName = document.getElementById("firstName");
const lastName = document.getElementById("lastName");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const address = document.getElementById("address");

const city = document.getElementById("city");
const state = document.getElementById("state");
const pincode = document.getElementById("pincode");

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const avatarInitials = document.getElementById("avatarInitials");

const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");
const successMessage = document.getElementById("successMessage");

loadUserData();
loadStats();

function loadUserData() {

    firstName.value = currentUser.first_name || "";
    lastName.value = currentUser.last_name || "";
    email.value = currentUser.email || "";
    phone.value = currentUser.phone || "";
    address.value = currentUser.address || "";

    profileName.innerText =
    `${currentUser.first_name || ""} ${currentUser.last_name || ""}`;

    profileEmail.innerText =
    currentUser.email || "";

    if(currentUser.profile_photo){

        avatarInitials.innerHTML =
        `<img src="https://divine-you-ecommerce-shipment-tracking.onrender.com${currentUser.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;

    } else {

        avatarInitials.innerText =
        `${(currentUser.first_name || "U")[0]}${(currentUser.last_name || "U")[0]}`.toUpperCase();
    }
}

async function loadStats() {

    try {

        const response =
        await fetch(
    `https://divine-you-ecommerce-shipment-tracking.onrender.com/api/users/${currentUser.id}/stats`,
    {
        headers:{
            "Authorization": `Bearer ${token}`
        }
    }
);

        const data = await response.json();

        if(data.success){

            document.getElementById("totalOrders").innerText =
            data.stats.total;

            document.getElementById("deliveredOrders").innerText =
            data.stats.delivered;

            document.getElementById("pendingOrders").innerText =
            data.stats.pending;

            if(data.address){

    phone.value = data.address.phone || "";

    address.value =
    data.address.address_1 || "";

    city.value =
    data.address.city || "";

    state.value =
    data.address.province || "";

    pincode.value =
    data.address.postal_code || "";
}
        }

    } catch(error){

        console.error(error);
    }
}

editBtn.addEventListener("click", () => {

    firstName.disabled = false;
    lastName.disabled = false;
    phone.disabled = false;
    address.disabled = false;

    city.disabled = false;
    state.disabled = false;
    pincode.disabled = false;

    document.getElementById("currentPassword").disabled = false;
    document.getElementById("newPassword").disabled = false;
    document.getElementById("confirmPassword").disabled = false;

    saveBtn.disabled = false;

    editBtn.innerHTML =
    `<i class="fas fa-check"></i> Editing Enabled`;
});

document.getElementById("accountForm").addEventListener("submit", async function(e){

    e.preventDefault();

    saveBtn.disabled = true;

    saveBtn.innerHTML =
    `<i class="fas fa-spinner fa-spin"></i> Saving...`;

    try {

        const currentPassword =
        document.getElementById("currentPassword").value;

        const newPassword =
        document.getElementById("newPassword").value;

        const confirmPassword =
        document.getElementById("confirmPassword").value;

        // PASSWORD UPDATE
        if(newPassword){

            if(newPassword !== confirmPassword){

                alert("Passwords do not match");

                saveBtn.disabled = false;

                return;
            }

            const passwordResponse =
            await fetch(
                `https://divine-you-ecommerce-shipment-tracking.onrender.com/api/users/${currentUser.id}/password`,
                {
                    method:"PUT",

                    headers:{
    "Content-Type":"application/json",
    "Authorization": `Bearer ${token}`
},

                    body:JSON.stringify({
                        currentPassword,
                        newPassword
                    })
                }
            );

            const passwordData =
            await passwordResponse.json();

            if(!passwordData.success){

                alert(passwordData.message);

                saveBtn.disabled = false;

                return;
            }
        }

        // CUSTOMER TABLE UPDATE
        const response =
        await fetch(
            `https://divine-you-ecommerce-shipment-tracking.onrender.com/api/users/${currentUser.id}`,
            {
                method:"PUT",

                headers:{
    "Content-Type":"application/json",
    "Authorization": `Bearer ${token}`
},

                body:JSON.stringify({

                    first_name:firstName.value,

                    last_name:lastName.value,

                    phone:phone.value,

                    address:
                    `${address.value}, ${city.value}, ${state.value} - ${pincode.value}`
                })
            }
        );

        const data = await response.json();

        // SHIPMENT ADDRESS UPDATE
        await fetch(
            `https://divine-you-ecommerce-shipment-tracking.onrender.com/api/address/update/${currentUser.id}`,
            {
                method:"PUT",

                headers:{
    "Content-Type":"application/json",
    "Authorization": `Bearer ${token}`
},

                body:JSON.stringify({

                    first_name:firstName.value,

                    last_name:lastName.value,

                    phone:phone.value,

                    address_1:address.value,

                    city:city.value,

                    province:state.value,

                    postal_code:pincode.value,

                    country_code:"IN"
                })
            }
        );

        if(data.success){

            const updatedUser = {
                ...currentUser,
                first_name:data.customer.first_name,
                last_name:data.customer.last_name,
                phone:data.customer.phone,
                address:data.customer.address,
                profile_photo:data.customer.profile_photo
            };

            localStorage.setItem(
                "divineYouUser",
                JSON.stringify(updatedUser)
            );

            successMessage.style.display = "block";

            setTimeout(() => {
                successMessage.style.display = "none";
            }, 3000);

        } else {

            alert("Failed to update profile");
        }

    } catch(error){

        console.error(error);

        alert("Server error");
    }

    saveBtn.disabled = false;

    saveBtn.innerHTML =
    `<i class="fas fa-save"></i> Save Changes`;
});

document.getElementById("profileUpload").addEventListener(
    "change",
    async function(e){

        const file = e.target.files[0];

        if(!file) return;

        const formData = new FormData();

        formData.append("photo", file);

        try {

            const response =
            await fetch(
                `https://divine-you-ecommerce-shipment-tracking.onrender.com/api/users/${currentUser.id}/photo`,
                {
                    method:"POST",body:formData,headers:{
    "Authorization": `Bearer ${token}`
},
                }
            );

            const data = await response.json();

            if(data.success){

                avatarInitials.innerHTML =
                `<img src="https://divine-you-ecommerce-shipment-tracking.onrender.com${data.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;

                const updatedUser = {
                    ...currentUser,
                    profile_photo:data.photo
                };

                localStorage.setItem(
                    "divineYouUser",
                    JSON.stringify(updatedUser)
                );
            }

        } catch(error){

            console.error(error);
        }
    }
);

document.getElementById("logoutBtn").addEventListener("click", function(){

    localStorage.removeItem("divineYouUser");

    window.location.href = "index.html";
});

pincode.addEventListener("input", async function(){

    const pin = pincode.value.trim();

    if(pin.length !== 6) return;

    try {

        const response =
        await fetch(
            `https://api.postalpincode.in/pincode/${pin}`
        );

        const data = await response.json();

        if(data[0].Status === "Success"){

            const postOffice =
            data[0].PostOffice[0];

            city.value =
            postOffice.District || "";

            state.value =
            postOffice.State || "";
        }

    } catch(error){

        console.error("Pincode fetch error", error);
    }
});
document.querySelectorAll(".password-toggle").forEach(icon => {

    icon.addEventListener("click", () => {

        const input =
        document.getElementById(
            icon.getAttribute("toggle")
        );

        if(input.type === "password"){

            input.type = "text";

            icon.classList.remove("fa-eye");

            icon.classList.add("fa-eye-slash");

        } else {

            input.type = "password";

            icon.classList.remove("fa-eye-slash");

            icon.classList.add("fa-eye");
        }
    });
});