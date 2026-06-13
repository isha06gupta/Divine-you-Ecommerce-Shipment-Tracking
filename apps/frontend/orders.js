const ordersContainer =
    document.getElementById("ordersContainer");

const orders =
    JSON.parse(localStorage.getItem("orders")) || [];

if (orders.length === 0) {

    ordersContainer.innerHTML =
        "<h2>No orders found</h2>";
}

else {

    orders.reverse().forEach(order => {

        const div = document.createElement("div");

        div.className = "order-card";

        div.innerHTML = `

            <h2>Order ID: ${order.id}</h2>

            <p>
                <strong>Payment ID:</strong>
                ${order.payment_id}
            </p>

            <p>
                <strong>Status:</strong>
                ${order.order_status}
            </p>

            <p>
                <strong>Payment:</strong>
                ${order.payment_status}
            </p>

            <p>
                <strong>Total:</strong>
                ₹${order.total}
            </p>

            <p>
                <strong>Date:</strong>
                ${new Date(order.created_at).toLocaleString()}
            </p>

            <h3>Items</h3>

            ${order.items.map(item => `

                <div class="item">

                    <p>
                        <strong>${item.name}</strong>
                    </p>

                    <p>
                        Qty: ${item.quantity}
                    </p>

                    <p>
                        Price: ₹${item.price}
                    </p>

                </div>

            `).join("")}
        `;

        ordersContainer.appendChild(div);
    });
}