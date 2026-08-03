const views = document.querySelectorAll(".view");
const sideNav = document.querySelector("#sideNav");
const workspaceContent = document.querySelector("#workspaceContent");
const workspaceTitle = document.querySelector("#workspaceTitle");
const workspaceKicker = document.querySelector("#workspaceKicker");
const roleLabel = document.querySelector("#roleLabel");
const API_URL = "http://127.0.0.1:8000/api";

let currentUser = JSON.parse(localStorage.getItem("aavUser") || "null");
let authToken = localStorage.getItem("aavToken");

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData) && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}

async function getUnreadNotificationCount() {

  if (!currentUser) return 0;

  try {

    const notifications = await apiFetch(`/notifications/${currentUser.id}`);

    unreadNotifications = notifications.filter(notification => !notification.is_read).length;

  } catch (error) {

    console.error("Failed to load notifications:", error);

    unreadNotifications = 0;

  }

}

function updateNotificationBadge() {
  const notificationButton = sideNav.querySelector(
    '[data-panel="notifications"]'
  );

  if (!notificationButton) return;

  let badge = notificationButton.querySelector(".notification-badge");

  if (unreadNotifications > 0) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "notification-badge";
      notificationButton.appendChild(badge);
    }

    badge.textContent = unreadNotifications;
  } else {
    badge?.remove();
  }
}

function formatPeso(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function paymentStatus(status) {
  const labels = { pending: "For verification", approved: "Approved", rejected: "Rejected" };
  const classes = { pending: "reserved", approved: "available", rejected: "trip" };
  return `<span class="status ${classes[status] || "reserved"}">${labels[status] || status}</span>`;
}

function localDateTimeNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function logout() {
  localStorage.removeItem("aavUser");
  localStorage.removeItem("aavToken");
  currentUser = null;
  authToken = null;
  setView("landing");
}

async function getCars() {
  try {
    const response = await fetch(`${API_URL}/cars`);
    const cars = await response.json();

    return cars;
  } catch (error) {
    console.error("Error fetching cars:", error);
    return [];
  }
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}


const accounts = {
  "admin@aavrental.com": { password: "Admin@123", role: "admin", name: "System Admin" },
  "employee@aavrental.com": { password: "Employee@123", role: "employee", name: "AAV Employee" },
  "customer@aavrental.com": { password: "Customer@123", role: "customer", name: "AAV Customer" }
};


const roleMenus = {
  customer: [
    ["dashboard", "Dashboard", "i-home"], ["vehicles", "Browse Vehicles", "i-car"],
    ["my-bookings", "My Bookings", "i-file"], ["payments", "Payments", "i-card"],
    ["assistant", "AI Assistant", "i-chat"], ["notifications", "Notifications", "i-bell"], ["profile", "Profile", "i-user"], ["logout", "Logout", "i-log-out"]
  ],
  employee: [
    ["dashboard", "Dashboard", "i-home"], ["reservations", "Reservations", "i-file"],
    ["customers", "Customers", "i-user"], ["vehicles", "Vehicles", "i-car"],
    ["payments", "Payments", "i-card"], ["chat", "AI Chat Monitor", "i-chat"], ["reports", "Reports", "i-chart"],
    ["profile", "Profile", "i-user"], ["logout", "Logout", "i-log-out"]
  ],
  admin: [
    ["dashboard", "Dashboard", "i-home"], ["employees", "Employees", "i-user"],
    ["customers", "Customers", "i-user"], ["vehicle-management", "Vehicle Management", "i-car"],
    ["reservations", "Reservations", "i-file"], ["payments", "Payments", "i-card"],
    ["tracking", "Vehicle Tracking", "i-map"], ["reports", "Reports", "i-chart"],
    ["logs", "AI Assistant Logs", "i-chat"], ["settings", "Settings", "i-file"],
    ["profile", "Profile", "i-user"], ["logout", "Logout", "i-log-out"]
  ]
};


let currentRole = currentUser?.role || "customer";
let selectedCar = null;
let bookingCars = [];
let unreadNotifications = 0;

async function openBooking(carId) {

  const cars = await getCars();

  selectedCar = cars.find(car => Number(car.id) === Number(carId));
  bookingCars = cars.filter(car => Boolean(car.available));
  renderPanel("bookings");
}

function selectBookingVehicle(carId) {
  selectedCar = bookingCars.find(car => Number(car.id) === Number(carId)) || null;
  const summaryVehicle = document.querySelector("#summaryVehicle");
  if (summaryVehicle) {
    summaryVehicle.textContent = selectedCar
      ? `${capitalize(selectedCar.brand)} ${capitalize(selectedCar.model)}`
      : "Select Vehicle";
  }
  calculateTotal();
}


function icon(id) {
  return `<svg aria-hidden="true"><use href="#${id}"></use></svg>`;
}


function setView(id) {
  views.forEach(view => view.classList.toggle("active", view.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}


document.addEventListener("click", event => {
  const route = event.target.closest("[data-route]")?.dataset.route;
  const panel = event.target.closest("[data-panel]")?.dataset.panel;
  if (route) {
    if (route === "landing") setView("landing");
    if (route === "login") setView("login");
    if (route === "register") setView("register");
  }
  if (event.target.closest("[data-action='logout']")) {
    logout();
  }
  if (panel) renderPanel(panel);
});


document.querySelector("#loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.querySelector("#loginEmail").value;
    const password = document.querySelector("#loginPassword").value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem("aavUser", JSON.stringify(currentUser));
            localStorage.setItem("aavToken", authToken);
            alert("Login successful!");
            openPortal(data.user.role);
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.error(error);
        alert("Cannot connect to the server.");
    }
});


async function openPortal(role) {
  currentRole = role;
  await getUnreadNotificationCount();
  roleLabel.textContent = role.charAt(0).toUpperCase() + role.slice(1);

  sideNav.innerHTML = roleMenus[role].map(([id, label, iconId]) => `
    <button type="button" data-panel="${id}">
      ${icon(iconId)}
      <span>${label}</span>

      ${
        id === "notifications" && unreadNotifications > 0
        ? `<span class="notification-badge">${unreadNotifications}</span>`
        : ""
      }
    </button>
  `).join("");

  setView("portal");

  await renderPanel("dashboard");
}


async function renderPanel(panel) {

  if (panel === "logout") {
    logout();
    return;
  }

  sideNav.querySelectorAll("button")
    .forEach(button => 
      button.classList.toggle("active", button.dataset.panel === panel)
    );

  const title = panel.split("-")
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(" ");

  workspaceKicker.textContent = currentRole;

  workspaceTitle.textContent =
    currentRole === "admin"
    ? `Admin ${title}`
    : currentRole === "employee"
    ? `Employee ${title}`
    : `Customer ${title}`;

  const content = await panels[currentRole][panel]();

  workspaceContent.innerHTML = content;
}


async function vehicleCards() {

  const cars = await getCars();

  return `
  <div class="filters">
    <select><option>Vehicle Type</option><option>SUV</option><option>Sedan</option></select>
    <select><option>Price Range</option><option>₱1,500 - ₱2,500</option><option>₱3,000 - ₱5,000</option></select>
    <select><option>Transmission</option><option>Automatic</option><option>Manual</option></select>
    <select><option>Fuel</option><option>Gasoline</option><option>Diesel</option></select>
    <select><option>Availability</option><option>Available</option><option>Reserved</option></select>
  </div>

  <div class="vehicle-grid">

    ${
     cars.map(car =>
      vehicleCard(
        car.id,
        car.image,
        capitalize(car.brand) + " " + capitalize(car.model),
        capitalize(car.brand),
        capitalize(car.transmission),
        capitalize(car.fuel_type),
        car.seats + " seats",
        "₱" + Number(car.price_per_day).toLocaleString() + "/day",
        car.available ? "Available" : "Reserved"
        )
      ).join("")
    }

  </div>`;
}

function vehicleCard(id, img, name, type, transmission, fuel, seats, price, availability) {
  const statusClass = availability === "Available" ? "available" : "reserved";
  return `<article class="vehicle-card">
    <img src="${img}" alt="${name}">
    <div class="vehicle-body">
      <span class="status ${statusClass}">${availability}</span>
      <h3>${name}</h3>
      <p>${type} · ${transmission} · ${fuel} · ${seats}</p>
      <div class="price-row">
        <strong>${price}</strong>
        <button type="button" onclick="openBooking(${id})">Book Now</button></div>
      </div>
    </article>`;
}


function metrics(items) {
  return `<div class="metrics">${items.map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>`;
}


function table(title, headers, rows) {
  return `<section class="table-card"><h3>${title}</h3><table class="data-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
}


function charts() {
  return `<div class="dashboard-grid">
    <section class="chart-card"><h3>Monthly Revenue Chart</h3><div class="chart-bars"><span style="height:44%"></span><span style="height:62%"></span><span style="height:51%"></span><span style="height:78%"></span><span style="height:86%"></span><span style="height:68%"></span></div></section>
    <section class="chart-card"><h3>Vehicle Availability Chart</h3><div class="donut"></div></section>
  </div>`;
}


const panels = {
  customer: {
    dashboard: async () => {

  const carsHTML = await vehicleCards();

  const bookings = await apiFetch("/my/bookings");
  const payments = await apiFetch("/payments");

  const activeBookings = bookings.filter(booking =>
    ["pending", "confirmed", "ongoing"].includes(
      booking.status.toLowerCase()
    )
  ).length;

  const pendingPayments = payments.filter(payment =>
    payment.status === "pending"
  ).length;

  const completedRentals = bookings.filter(booking =>
    booking.status.toLowerCase() === "completed"
  ).length;

  const upcomingBookings = bookings
  .filter(booking =>
    ["pending", "confirmed"].includes(
      booking.status.toLowerCase()
    )
  )
  .sort((a, b) =>
    new Date(a.pickup_date) - new Date(b.pickup_date)
  )
  .slice(0, 3);

  const recentActivities = [
    ...bookings.map(booking => ({
      type: "booking",
      text:
        "Booking " +
        capitalize(booking.status),
      date: new Date(booking.created_at)
    })),

    ...payments.map(payment => ({
      type: "payment",
      text:
        payment.status === "approved"
          ? "Payment approved"
          : payment.status === "pending"
          ? "Payment submitted"
          : "Payment rejected",
      date: new Date(payment.created_at)
    }))
  ]
  .sort((a, b) => b.date - a.date)
  .slice(0, 5);

  return `${metrics([
    ["Active Bookings", activeBookings],
    ["Pending Payments", pendingPayments],
    ["Completed Rentals", completedRentals]
  ])}

  <div class="dashboard-grid">

    <section class="panel">
      <h3>Featured Cars</h3>
      ${carsHTML}
    </section>


    <section class="panel">
      <h3>Upcoming Reservations</h3>

      <div class="mini-list">
        ${
          upcomingBookings.length > 0
            ? upcomingBookings.map(booking => {

                const vehicleName = booking.car
                  ? capitalize(booking.car.brand) + " " + capitalize(booking.car.model)
                  : "Vehicle unavailable";

                const pickupDate = new Date(
                  booking.pickup_date
                ).toLocaleDateString("en-PH");

                const returnDate = new Date(
                  booking.return_date
                ).toLocaleDateString("en-PH");

                const bookingStatus = capitalize(booking.status);

                return `
                  <div>
                    <strong>${vehicleName}</strong>

                    <span>
                      ${pickupDate} - ${returnDate}
                      • ${bookingStatus}
                    </span>
                  </div>
                `;
              }).join("")
            : `
                <div>
                  <span>No upcoming reservations.</span>
                </div>
              `
        }
      </div>

      <h3>Recent Activity</h3>

      <div class="mini-list">
        ${
          recentActivities.length > 0
            ? recentActivities.map(activity => `
                <div>
                  <span>${activity.text}</span>

                  <strong>
                    ${activity.date.toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </strong>
                </div>
              `).join("")
            : `
                <div>
                  <span>No recent activity.</span>
                </div>
              `
        }
      </div>
    </section>

  </div>`;
},

    vehicles: vehicleCards,

    "my-bookings": async () => {

      try {
        const bookings = await apiFetch("/my/bookings");

        if (!bookings.length) {
          return `
            <section class="panel">
              <h3>My Bookings</h3>
              <p>You have no bookings yet.</p>
            </section>
          `;
        }

        const rows = bookings.map(booking => [
          "BK-" + booking.id,
          booking.car
            ? capitalize(booking.car.brand) + " " + capitalize(booking.car.model)
            : "Vehicle unavailable",
          new Date(booking.pickup_date).toLocaleDateString("en-PH"),
          new Date(booking.return_date).toLocaleDateString("en-PH"),
          formatPeso(booking.total_price),
          booking.status
        ]);

        return table(
          "My Bookings",
          ["Booking ID", "Vehicle", "Pickup", "Return", "Total", "Status"],
          rows
        );

      } catch (error) {
        return `
          <section class="panel">
            <h3>My Bookings</h3>
            <p>${error.message}</p>
          </section>
        `;
      }
    },

    bookings: async () => {

  bookingCars = (await getCars()).filter(car => Boolean(car.available));
  if (selectedCar) {
    selectedCar = bookingCars.find(car => Number(car.id) === Number(selectedCar.id)) || null;
  }

  let vehicleName = selectedCar 
    ? capitalize(selectedCar.brand) + " " + capitalize(selectedCar.model)
    : "Select Vehicle";

  const vehicleOptions = [
    `<option value="">Select a vehicle</option>`,
    ...bookingCars.map(car => {
      const name = `${capitalize(car.brand)} ${capitalize(car.model)}`;
      return `<option value="${car.id}" ${Number(selectedCar?.id) === Number(car.id) ? "selected" : ""}>${name}</option>`;
    })
  ].join("");

  return `
<div class="booking-layout">

  <section class="panel">
    <h3>Booking Form</h3>

    <div class="form-grid">
      <label>
        Vehicle
        <select id="bookingVehicle" onchange="selectBookingVehicle(this.value)" required>
          ${vehicleOptions}
        </select>
      </label>

      <label>
        Pickup Date
        <input type="date"id="pickupDate" onchange="calculateTotal()">
      </label>

      <label>
        Pickup Time
        <input type="time"id="pickupTime" onchange="calculateTotal()">
      </label>

      <label>
        Return Date
        <input type="date" id="returnDate" onchange="calculateTotal()">
      </label>

      <label>
        Return Time
        <input type="time"id="returnTime" onchange="calculateTotal()">
      </label>

      <label>
        Pickup Location
        <input type="text" value="AAV Taguig Office">
      </label>

      <label>
        Return Location
        <input type="text" value="AAV Taguig Office">
      </label>

      <label>
        Trip Destination
        <select id="tripDestination" onchange="calculateTotal()">
          <option value="">Select Destination</option>
          <option value="within">Within Manila</option>
          <option value="outside">Outside Manila</option>
        </select>
      </label>

      <label>
        Rental Duration
          <input
            type="text"
            id="rentalDuration"
            placeholder="Auto Computed"
            readonly
          >
      </label>

      <label class="wide">
        Total Cost
        <input
          type="text"
          id="totalCost"
          value="₱0"
          readonly>
      </label>

      <button
        id="submitBookingBtn"
        class="primary wide"
        type="button"
        onclick="submitBooking()">
        Submit Booking
      </button>

      <p id="availabilityMessage" style="color:red; margin-top:10px;"></p>

    </div>

  </section>

  ${bookingSummary()}

</div>
  `;
},
    payments: () => paymentPanel(),

    assistant: () => `
      <section class="panel">
        <h3>AI Customer Assistant</h3>
        <p>Use the floating assistant in the lower-right corner. Try asking "What SUVs are available?" or "What documents are required?"</p>
      </section>
    `,

    notifications: () => notificationsPanel(),

    profile: () => profilePanel("Customer")
  },
  employee: {
    dashboard: () => `${metrics([["Today's Reservations", "7"], ["Pending Bookings", "12"], ["Active Rentals", "9"], ["Vehicles Available", "18"], ["Vehicles on Trip", "6"], ["Payments Received", "₱58K"]])}<div class="dashboard-grid">${table("Recent Reservations", ["Customer", "Vehicle", "Status"], [["Juan D.", "Toyota Veloz", "Approved"], ["Maria S.", "Toyota Vios", "Pending"], ["Ken A.", "Fortuner", "Ongoing"]])}${table("Recent Payments", ["Customer", "Method", "Status"], [["Juan D.", "GCash", "Verified"], ["Maria S.", "EastWest", "Pending"], ["Ken A.", "GCash", "Verified"]])}</div>`,
    reservations: () => table("Reservations", ["Booking ID", "Customer", "Vehicle", "Status"], [["BK-1024", "Juan Dela Cruz", "Toyota Toyota Veloz", "Pending"], ["BK-1025", "Maria Santos", "Toyota Vios", "Approved"], ["BK-1026", "Ken Alvarez", "Fortuner", "Ongoing"]]),
    customers: () => table("Customer Requests", ["Customer", "Requirement", "Status"], [["Juan D.", "Driver's license", "Verified"], ["Maria S.", "Payment receipt", "Review"], ["Ken A.", "Selfie holding ID", "Verified"]]),
    vehicles: vehicleCards,
    payments: () => paymentPanel(),
    chat: () => table("AI Chat Monitor", ["Customer", "Question", "AI Response"], [["Customer", "What SUVs are available?", "Fortuner, Montero Sport, Everest"], ["Customer", "Documents required?", "Government ID, license, selfie holding ID"]]),
    reports: () => reportsPanel(),
    profile: () => profilePanel("Employee")
  },
  admin: {
    dashboard: () => `${metrics([["Total Revenue", "₱428K"], ["Total Vehicles", "32"], ["Active Rentals", "9"], ["Pending Reservations", "12"], ["Customer Growth", "+18%"], ["Most Rented", "Toyota Vios"]])}${charts()}<div class="dashboard-grid">${table("Recent Bookings", ["Customer", "Vehicle", "Status"], [["Juan D.", "Toyota Veloz", "Pending"], ["Maria S.", "Vios", "Approved"], ["Ken A.", "Fortuner", "Ongoing"]])}${table("Recent Customers", ["Name", "Mobile", "Status"], [["Juan Dela Cruz", "+639274589432", "Verified"], ["Maria Santos", "+639991234567", "New"], ["Ken Alvarez", "+639181112222", "Active"]])}</div>`,
    employees: () => table("Employees", ["Name", "Role", "Status"], [["Abigail De Mesa", "Manager", "Active"], ["AAV Staff", "Employee", "Active"]]),
    customers: () => table("Customers", ["Name", "License", "Rentals"], [["Juan Dela Cruz", "N01-23-456789", "4"], ["Maria Santos", "N02-45-789123", "2"]]),
"vehicle-management": async () => {

  const carsHTML = await vehicleCards();

  return `
  <section class="panel">
    <h3>Vehicle Information</h3>

    <div class="form-grid">
      <label>Plate Number<input value="NJG 5062"></label>
      <label>Vehicle Name<input value="Toyota Vios"></label>
      <label>Brand<input value="Toyota"></label>
      <label>Model<input value="Vios"></label>
      <label>Year<input value="2024"></label>
      <label>Color<input value="Silver"></label>

      <label>
        Fuel Type
        <select>
          <option>Gasoline</option>
          <option>Diesel</option>
        </select>
      </label>

      <label>
        Transmission
        <select>
          <option>Automatic</option>
          <option>Manual</option>
        </select>
      </label>

      <label>Seating Capacity<input value="5"></label>
      <label>Rental Price<input value="₱2,000/day"></label>

      <label>
        Availability
        <select>
          <option>Available</option>
          <option>Reserved</option>
          <option>On Trip</option>
          <option>Maintenance</option>
        </select>
      </label>

      <label>Upload Vehicle Images<input type="file"></label>

      <button class="primary wide" type="button">
        Save Vehicle
      </button>
    </div>
  </section>

  ${carsHTML}
  `;
},    
    reservations: async () => {

      const bookings = await apiFetch("/bookings");

      const rows = bookings.map(booking => [
        "BK-" + booking.id,
        booking.user.name,
        booking.car.brand + " " + booking.car.model,
        booking.status
      ]);

      return table(
        "Reservations",
        ["Booking ID", "Customer", "Vehicle", "Status"],
        rows
      );
    },
    
    payments: () => paymentPanel(),
    tracking: () => trackingPanel(),
    reports: () => reportsPanel(),
    logs: () => panels.employee.chat(),
    settings: () => `<section class="panel"><h3>System Settings</h3><div class="form-grid"><label>Reservation Fee<input value="₱500/day"></label><label>Payment Methods<input value="GCash, Bank Transfer"></label><label class="wide">Rental Policy<textarea>Reservation is not refundable if client wishes to cancel. Fee is deductible from total rent amount.</textarea></label><button class="primary wide" type="button">Update Settings</button></div></section>`,
    profile: () => profilePanel("Admin")
  }
};


function bookingSummary() {

  let vehicleName = selectedCar 
    ? capitalize(selectedCar.brand) + " " + capitalize(selectedCar.model)
    : "Select Vehicle";

  const duration =
    document.querySelector("#rentalDuration")?.value || "-";

  const totalCost =
    document.querySelector("#totalCost")?.value || "₱0";

  return `
  <aside class="panel">
    <h3>Booking Summary</h3>

    <div class="summary-line">
      <span>Vehicle</span>
      <strong id="summaryVehicle">${vehicleName}</strong>
    </div>

    <div class="summary-line">
      <span>Duration</span>
      <strong id="summaryDuration">${duration}</strong>
    </div>

    <div class="summary-line">
      <span>Reservation Fee</span>
      <strong id="summaryReservation">₱0</strong>
    </div>

    <div class="summary-line">
      <span>Total Cost</span>
      <strong id="summaryTotal">${totalCost}</strong>
    </div>

    <p>
      <span class="status reserved">Pending</span>
      Approval required before pickup.
    </p>

  </aside>`;
}


function legacyPaymentPanel() {
  return `<div class="payment-layout"><section class="panel"><h3>Payment Methods</h3><div class="mini-list"><div><strong>GCash</strong><span>09999118689 · Abigail De Mesa</span></div><div><strong>Bank Transfer</strong><span>EastWest · 200066882957 · Abigail De Mesa</span></div></div><h3>Upload Payment Receipt</h3><div class="form-grid"><label>Reservation Fee<input value="₱500/day"></label><label>Payment Method<select><option>GCash</option><option>Bank Transfer</option></select></label><label class="wide">Receipt<input type="file"></label><button class="primary wide" type="button">Submit Receipt</button></div></section><aside class="panel"><img src="./assets/payment-options.jpg" alt="AAV payment options" style="border-radius:14px;filter:grayscale(100%);"><p>Payment Status: <span class="status reserved">For Verification</span></p><button class="secondary full" type="button">Download Receipt</button></aside></div>${table("Transaction History", ["Date", "Method", "Amount", "Status"], [["Jul 09", "GCash", "₱2,000", "Pending"], ["Jun 04", "EastWest", "₱4,000", "Verified"]])}`;
}


async function paymentPanel() {
  if (!authToken || !currentUser) {
    return `<section class="panel"><h3>Sign in required</h3><p>Please sign in before submitting a payment confirmation.</p></section>`;
  }

  try {
    const payments = await apiFetch("/payments");
    if (currentRole === "admin") return adminPaymentPanel(payments);
    if (currentRole === "employee") return employeePaymentPanel(payments);
    return await customerPaymentPanel(payments);
  } catch (error) {
    return `<section class="panel"><h3>Payments unavailable</h3><p>${error.message}</p></section>`;
  }
}

async function customerPaymentPanel(payments) {
  const bookings = await apiFetch("/my/bookings");
  const openBookingIds = new Set(payments.filter(payment => ["pending", "approved"].includes(payment.status)).map(payment => payment.booking_id));
  const payableBookings = bookings.filter(booking => !openBookingIds.has(booking.id) && booking.status !== "rejected");
  const bookingOptions = payableBookings.length
    ? payableBookings.map(booking => `<option value="${booking.id}">#${booking.id} · ${booking.car.brand} ${booking.car.model} (${formatPeso(booking.total_price)})</option>`).join("")
    : `<option value="">No booking awaiting payment</option>`;
  const history = payments.map(payment => [
    new Date(payment.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
    payment.booking?.car ? `#${payment.booking_id} · ${payment.booking.car.brand} ${payment.booking.car.model}` : `Booking #${payment.booking_id}`,
    payment.method === "gcash" ? "GCash" : "Bank transfer",
    formatPeso(payment.amount),
    paymentStatus(payment.status),
  ]);

  return `<div class="payment-layout">
    <section class="panel">
      <h3>1. Scan or transfer to AAV</h3>
      <div class="payment-methods">
        <div><strong>GCash</strong><span>Account name: Abigail De Mesa</span><span>Number: 0999 911 8689</span></div>
        <div><strong>Bank transfer</strong><span>EastWest Bank</span><span>Account name: Abigail De Mesa</span><span>Account no.: 200066882957</span></div>
      </div>
      <p class="form-help">Pay the reservation fee shown for your booking, then upload a clear screenshot or photo of the successful transaction. The admin verifies it before approving the reservation.</p>
      <h3>2. Send payment confirmation</h3>
      <form id="paymentForm" class="form-grid" onsubmit="submitPayment(event)">
        <label>Booking<select name="booking_id" required ${payableBookings.length ? "" : "disabled"}>${bookingOptions}</select></label>
        <label>Payment method<select name="method" required><option value="gcash">GCash</option><option value="bank_transfer">Bank transfer</option></select></label>
        <label>Amount sent (₱)<input name="amount" type="number" min="1" step="0.01" placeholder="e.g. 500" required></label>
        <label>Date and time paid<input name="paid_at" type="datetime-local" max="${localDateTimeNow()}" required></label>
        <label>Payer / sender name<input name="payer_name" maxlength="255" autocomplete="name" required></label>
        <label>Transaction reference no.<input name="reference_number" maxlength="100" required></label>
        <label class="wide">Receipt or proof of payment<input name="proof" type="file" accept="image/jpeg,image/png,image/webp" required><small>JPG, PNG, or WebP only · maximum 5 MB</small></label>
        <label class="check wide"><input name="customer_confirmed" type="checkbox" required> I confirm that I have already sent this payment and that the details and proof are accurate.</label>
        <button class="primary wide" type="submit" ${payableBookings.length ? "" : "disabled"}>Send confirmation to admin</button>
      </form>
    </section>
    <aside class="panel payment-reference">
      <h3>Scan to pay</h3>
      <img src="./assets/payment-options.jpg" alt="GCash and bank transfer QR codes" onerror="this.hidden=true">
      <p>Add the GCash and bank QR image as <code>assets/payment-options.jpg</code>. Customers can scan it directly from this screen.</p>
      <p><strong>Payment status:</strong> Payment proofs stay <em>For verification</em> until an admin checks and approves them.</p>
    </aside>
  </div>${table("My payment confirmations", ["Submitted", "Booking", "Method", "Amount", "Status"], history.length ? history : [["—", "No confirmations yet", "—", "—", "—"]])}`;
}

function adminPaymentPanel(payments) {
  const pending = payments.filter(payment => payment.status === "pending");
  const rows = pending.map(payment => [
    `#${payment.id}`,
    `${payment.submitter?.name || "Customer"}<br><small>Booking #${payment.booking_id} · ${payment.booking?.car?.brand || ""} ${payment.booking?.car?.model || ""}</small>`,
    `${payment.method === "gcash" ? "GCash" : "Bank transfer"}<br><small>${payment.reference_number}</small>`,
    `${formatPeso(payment.amount)}<br><small>${payment.payer_name} · ${new Date(payment.paid_at).toLocaleString("en-PH")}</small>`,
    `<button class="secondary small" type="button" onclick="showPaymentProof(${payment.id})">View proof</button> <button class="primary small" type="button" onclick="reviewPayment(${payment.id}, 'approved')">Approve</button> <button class="link-button" type="button" onclick="reviewPayment(${payment.id}, 'rejected')">Reject</button>`,
  ]);
  const history = payments.filter(payment => payment.status !== "pending").map(payment => [
    `#${payment.id}`,
    payment.submitter?.name || "Customer",
    formatPeso(payment.amount),
    paymentStatus(payment.status),
    payment.review_note || "—",
  ]);
  return `${metrics([["Awaiting review", String(pending.length)], ["Approved", String(payments.filter(p => p.status === "approved").length)], ["Rejected", String(payments.filter(p => p.status === "rejected").length)]])}${table("Payment confirmations awaiting review", ["ID", "Customer / booking", "Method / reference", "Amount / sender", "Review"], rows.length ? rows : [["—", "No payments awaiting review", "—", "—", "—"]])}${table("Reviewed payment history", ["ID", "Customer", "Amount", "Status", "Admin note"], history.length ? history : [["—", "No reviewed payments", "—", "—", "—"]])}`;
}

function employeePaymentPanel(payments) {
  const rows = payments.map(payment => [
    `#${payment.id}`,
    `${payment.submitter?.name || "Customer"}<br><small>Booking #${payment.booking_id}</small>`,
    payment.method === "gcash" ? "GCash" : "Bank transfer",
    formatPeso(payment.amount),
    paymentStatus(payment.status),
  ]);
  return table("Payment confirmations", ["ID", "Customer / booking", "Method", "Amount", "Status"], rows.length ? rows : [["—", "No payments submitted", "—", "—", "—"]]);
}

async function submitPayment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Sending…";
  try {
    const paymentData = new FormData(form);
    const paidAt = paymentData.get("paid_at");
    const paidAtDate = new Date(paidAt);
    if (Number.isNaN(paidAtDate.getTime())) {
      throw new Error("Please enter a valid payment date and time.");
    }
    paymentData.set("paid_at", paidAtDate.toISOString());

    await apiFetch("/payments", { method: "POST", body: paymentData });
    alert("Payment confirmation sent. It will remain for verification until an admin approves it.");
    renderPanel("payments");
  } catch (error) {
    alert(error.message);
    button.disabled = false;
    button.textContent = "Send confirmation to admin";
  }
}

async function reviewPayment(paymentId, status) {
  const reviewNote = status === "rejected" ? prompt("Why is this payment being rejected? This note will be shown to the customer.") : prompt("Optional approval note for the customer:") || "";
  if (status === "rejected" && !reviewNote?.trim()) return;
  try {
    await apiFetch(`/payments/${paymentId}/review`, { method: "PATCH", body: JSON.stringify({ status, review_note: reviewNote }) });
    alert(`Payment ${status}.`);
    renderPanel("payments");
  } catch (error) {
    alert(error.message);
  }
}

async function showPaymentProof(paymentId) {
  try {
    const response = await fetch(`${API_URL}/payments/${paymentId}/proof`, { headers: { Authorization: `Bearer ${authToken}` } });
    if (!response.ok) throw new Error("Unable to load the payment proof.");
    const url = URL.createObjectURL(await response.blob());
    window.open(url, "_blank", "noopener");
  } catch (error) {
    alert(error.message);
  }
}

function trackingPanel() {
  return `<div class="tracking-layout"><section class="map-card"><h3>Interactive Map</h3><div class="map-visual"><span class="route-line"></span><span class="pin pickup"></span><span class="pin destination"></span><span class="pin car">${icon("i-car")}</span></div></section><aside class="panel"><h3>Vehicle Tracking</h3><div class="summary-line"><span>Vehicle location</span><strong>BGC, Taguig</strong></div><div class="summary-line"><span>Current status</span><strong>On Trip</strong></div><div class="summary-line"><span>Pickup point</span><strong>AAV Office</strong></div><div class="summary-line"><span>Destination</span><strong>NAIA Terminal 3</strong></div><div class="summary-line"><span>Estimated Arrival Time</span><strong>28 min</strong></div><div class="mini-list"><div><span>Available</span><strong>18</strong></div><div><span>Reserved</span><strong>7</strong></div><div><span>Returned</span><strong>11</strong></div><div><span>Maintenance</span><strong>2</strong></div></div></aside></div>`;
}

async function markNotificationAsRead(notificationId) {
  try {
    await apiFetch(`/notifications/${notificationId}/read`, {
      method: "PUT"
    });

    await getUnreadNotificationCount();

    updateNotificationBadge();

    await renderPanel("notifications");

  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}


async function notificationsPanel() {

  console.log("Current User:", currentUser);

  const notifications = await apiFetch(`/notifications/${currentUser.id}`);

  console.log("Notifications:", notifications);

  if (!notifications.length) {
    return `
      <section class="panel">
        <h3>Notifications</h3>
        <p>No notifications yet.</p>
      </section>
    `;
  }

  return `
    <section class="panel">
      <h3>Notifications</h3>

      <div class="mini-list">

        ${notifications.map(notification => `
          <div class="notification-item ${notification.is_read ? "read" : "unread"} 
          "onclick="markNotificationAsRead(${notification.id})">

            <strong>

              ${
                notification.title.toLowerCase().includes("payment")
                  ? "💳"
                  : notification.title.toLowerCase().includes("booking")
                  ? "📅"
                  : "🔔"
              }

              ${notification.title}

              ${
                !notification.is_read
                  ? `<span class="notification-dot"></span>`
                  : ""
              }

            </strong>

            <span>${notification.message}</span>

            <small>
              ${new Date(notification.created_at).toLocaleString()}
            </small>

          </div>
        `).join("")}

      </div>

    </section>
  `;
}


function reportsPanel() {
  return `${charts()}<div class="dashboard-grid">${table("Booking Trends", ["Month", "Bookings", "Utilization"], [["May", "82", "68%"], ["June", "96", "74%"], ["July", "121", "81%"]])}${table("Payment Summary", ["Method", "Transactions", "Amount"], [["GCash", "84", "₱210K"], ["Bank Transfer", "42", "₱168K"]])}</div>`;
}


function profilePanel(role) {
  return `<section class="panel"><h3>${role} Profile</h3><div class="form-grid"><label>Name<input value="${role === "Customer" ? "AAV Customer" : role === "Admin" ? "System Admin" : "AAV Employee"}"></label><label>Email<input value="${role.toLowerCase()}@aavrental.com"></label><label>Mobile<input value="+639274589432"></label><label>Address<input value="46 Pag-asa St., Brgy. Katuparan, Taguig City"></label><button class="primary wide" type="button">Save Profile</button></div></section>`;
}


function sharedPanel(panel) {
  if (panel === "notifications") return notificationsPanel();
  return `<section class="panel"><h3>${panel}</h3><p>This prototype screen is ready for expansion.</p></section>`;
}


const chatFab = document.querySelector("#chatFab");
const chatWindow = document.querySelector("#chatWindow");
const chatClose = document.querySelector("#chatClose");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatLog = document.querySelector("#chatLog");


chatFab.addEventListener("click", () => chatWindow.classList.toggle("open"));
chatClose.addEventListener("click", () => chatWindow.classList.remove("open"));
chatForm.addEventListener("submit", event => {
  event.preventDefault();
  const question = chatInput.value.trim();
  if (!question) return;
  addChat("user", question);
  addChat("bot", aiReply(question));
  chatInput.value = "";
});


function addChat(type, text) {
  const p = document.createElement("p");
  p.className = type;
  p.textContent = text;
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}


function aiReply(text) {
  const q = text.toLowerCase();
  if (q.includes("suv")) return "Currently available SUVs include Toyota Fortuner, Mitsubishi Montero Sport, and Ford Everest. The Toyota Veloz is also listed as available in this prototype.";
  if (q.includes("document") || q.includes("require")) return "Please upload a valid government ID, driver's license, proof of billing, company ID if applicable, and a selfie while holding your ID. You may also need the QR code from the LTO-LTMS portal.";
  if (q.includes("price") || q.includes("rate") || q.includes("cost")) return "Sample daily rates are Toyota Vios at ₱2,000/day, Toyota Veloz at ₱3,500/day, and Toyota Fortuner at ₱4,500/day. A ₱500/day reservation fee is deductible from the total rent amount.";
  if (q.includes("book")) return "To book, create a customer account, choose a vehicle, submit pickup and return details, upload requirements, pay the reservation fee, then wait for approval.";
  if (q.includes("payment") || q.includes("gcash") || q.includes("bank")) return "Payment methods include GCash 09999118689 and EastWest bank transfer 200066882957 under Abigail De Mesa. Upload a receipt so staff can verify it.";
  if (q.includes("policy") || q.includes("cancel") || q.includes("refund")) return "The reservation fee is deductible from the total rental amount but is forfeited if the renter cancels the booking.";
  return "I can answer questions about available vehicles, rental requirements, rental pricing, booking process, payment methods, rental policies, and frequently asked questions.";
}

function calculateTotal() {

  console.log("calculateTotal is running");

  if (!selectedCar) return;

  const pickupDate = document.querySelector("#pickupDate").value;
  const pickupTime = document.querySelector("#pickupTime").value;

  const returnDate = document.querySelector("#returnDate").value;
  const returnTime = document.querySelector("#returnTime").value;
  const destination = document.querySelector("#tripDestination").value;

  if (!pickupDate || !pickupTime || !returnDate || !returnTime || !destination) {

    document.querySelector("#rentalDuration").value = "";
    document.querySelector("#totalCost").value = "";

    return;
  }

  const pickup = new Date(`${pickupDate}T${pickupTime}`);
  const returned = new Date(`${returnDate}T${returnTime}`);

  const difference = returned - pickup;

  if (difference <= 0) {
    alert("Return date/time must be after pickup date/time.");
    return;
  }

  const hours = difference / (1000 * 60 * 60);

  let durationValue;

  if (hours <= 12) {
    durationValue = 0.5;
    document.querySelector("#rentalDuration").value = "12 Hours";
  }
  else if (hours <= 24) {
      durationValue = 1;
      document.querySelector("#rentalDuration").value = "24 Hours";
  }
  else {
      const days = Math.ceil(hours / 24);
      durationValue = days;
      document.querySelector("#rentalDuration").value = `${days} Days`;
  }

  const durationType = durationValue === 0.5 ? "12hrs" : "24hrs";
  const rate = selectedCar.rates?.find(item => item.location === destination && item.duration === durationType);

  if (!rate) {
    document.querySelector("#totalCost").value = "Rate unavailable";
    document.querySelector("#summaryReservation").textContent = "—";
    document.querySelector("#summaryTotal").textContent = "Rate unavailable";
    return;
  }

  const total = Number(rate.price) * (durationType === "12hrs" ? 1 : durationValue);

  document.querySelector("#totalCost").value = "₱" + total.toLocaleString();

  document.querySelector("#summaryDuration").textContent =
    document.querySelector("#rentalDuration").value;

  document.querySelector("#summaryReservation").textContent =
    "₱" + (durationValue * 500).toLocaleString();

  document.querySelector("#summaryTotal").textContent =
    "₱" + total.toLocaleString();
    checkAvailability();
}

async function checkAvailability() {

  console.log("✅ checkAvailability is running");

  if (!selectedCar) return;

  const pickupDate = document.querySelector("#pickupDate").value;
  const returnDate = document.querySelector("#returnDate").value;

  if (!pickupDate || !returnDate) return;

  try {

    const result = await apiFetch("/bookings/check-availability", {
      method: "POST",
      body: JSON.stringify({
        car_id: selectedCar.id,
        pickup_date: pickupDate,
        return_date: returnDate
      })
    });

    console.log("Availability Result:", result);

    const submitBtn = document.querySelector("#submitBookingBtn");
    const message = document.querySelector("#availabilityMessage");

  if (!result.available) {

    message.textContent = "❌ This vehicle is already reserved for the selected dates.";
    submitBtn.disabled = true;

  } else {

    message.textContent = "";
    submitBtn.disabled = false;

  }

  } catch (error) {

    console.error(error);

  }

}

async function submitBooking() {

  const pickupDate = document.querySelector("#pickupDate").value;
  const returnDate = document.querySelector("#returnDate").value;
  const pickupTime = document.querySelector("#pickupTime").value;
  const returnTime = document.querySelector("#returnTime").value;
  const destination = document.querySelector("#tripDestination").value;


  if (!selectedCar) {
    alert("Please select a vehicle first.");
    return;
  }


  if (!pickupDate || !pickupTime || !returnDate || !returnTime || !destination) {
    alert("Please complete the pickup/return date and time, then select a trip destination.");
    return;
  }

  const pickup = new Date(`${pickupDate}T${pickupTime}`);
  const returned = new Date(`${returnDate}T${returnTime}`);

  const difference = returned - pickup;
  if (difference <= 0) {
    alert("Return date and time must be after pickup date and time.");
    return;
  }
  const hours = difference / (1000 * 60 * 60);

  let duration;

  if (hours <= 12) {
      duration = "12hrs";
  } else {
      duration = "24hrs";
  }

  const bookingData = {
  car_id: selectedCar.id,
  pickup_date: pickupDate,
  return_date: returnDate,
  location: destination,
  duration: duration
  };

  console.log(bookingData);


  try {

    await apiFetch("/bookings", { method: "POST", body: JSON.stringify(bookingData) });
    alert("Booking submitted successfully. You can now send your payment confirmation.");
    renderPanel("payments");


  } catch (error) {

    console.error(error);

    alert(error.message);
  }

}

const registerForm = document.querySelector("#registerForm");

registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const firstName = document.querySelector("#firstName").value;
    const lastName = document.querySelector("#lastName").value;
    const email = document.querySelector("#registerEmail").value;
    const phone = document.querySelector("#registerPhone").value;
    const password = document.querySelector("#registerPassword").value;

    const name = firstName + " " + lastName;

    try {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            name: name,
            email: email,
            phone: phone,
            password: password
        })
    });

    const data = await response.json();

    if (response.ok) {
        alert("Registration successful!");
        setView("login");
    } else {
        console.log(data);
        alert("Registration failed.");
    }

  } catch (error) {
    console.error(error);
    alert("Cannot connect to the server.");
  }
});

