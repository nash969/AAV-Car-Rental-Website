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

  carsCache = null;
  carsCacheTime = 0;

  bookingsCache = null;
  bookingsCacheTime = 0;

  paymentsCache = null;
  paymentsCacheTime = 0;

  myBookingsCache = null;
  myBookingsCacheTime = 0;

  setView("landing");
}

let carsCache = null;
let carsCacheTime = 0;

async function getCars(forceRefresh = false) {
  const now = Date.now();

  if (
    !forceRefresh &&
    carsCache &&
    now - carsCacheTime < 30000
  ) {
    return carsCache;
  }

  try {
    const response = await fetch(`${API_URL}/cars`);
    const cars = await response.json();

    carsCache = cars;
    carsCacheTime = now;

    return cars;
  } catch (error) {
    console.error("Error fetching cars:", error);

    return carsCache || [];
  }
}

let bookingsCache = null;
let bookingsCacheTime = 0;

async function getBookings(forceRefresh = false) {
  const now = Date.now();

  if (
    !forceRefresh &&
    bookingsCache &&
    now - bookingsCacheTime < 30000
  ) {
    return bookingsCache;
  }

  const bookings = await apiFetch("/bookings");

  bookingsCache = bookings;
  bookingsCacheTime = now;

  return bookings;
}

let paymentsCache = null;
let paymentsCacheTime = 0;

async function getPayments(forceRefresh = false) {
  const now = Date.now();

  if (
    !forceRefresh &&
    paymentsCache &&
    now - paymentsCacheTime < 30000
  ) {
    return paymentsCache;
  }

  const payments = await apiFetch("/payments");

  paymentsCache = payments;
  paymentsCacheTime = now;

  return payments;
}

let myBookingsCache = null;
let myBookingsCacheTime = 0;

async function getMyBookings(forceRefresh = false) {
  const now = Date.now();

  if (
    !forceRefresh &&
    myBookingsCache &&
    now - myBookingsCacheTime < 30000
  ) {
    return myBookingsCache;
  }

  const bookings = await apiFetch("/my/bookings");

  myBookingsCache = bookings;
  myBookingsCacheTime = now;

  return bookings;
}

let settingsCache = null;
let settingsCacheTime = 0;

async function getSystemSettings(forceRefresh = false) {

  const now = Date.now();

  if (
    !forceRefresh &&
    settingsCache &&
    now - settingsCacheTime < 30000
  ) {
    return settingsCache;
  }

  const settings = await apiFetch("/settings");

  settingsCache = settings;
  settingsCacheTime = now;

  return settings;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function filterEmployeeCustomers(value) {
  const search = value.toLowerCase().trim();

  const rows = document.querySelectorAll(
    "#employeeCustomersTable tbody tr"
  );

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();

    row.style.display =
      text.includes(search) ? "" : "none";
  });
}

async function viewCustomerRequirements(customerId) {
  try {
    const customer = await apiFetch(
      `/customers/${customerId}/requirements`
    );

    workspaceTitle.textContent = "Customer Verification";

    workspaceContent.innerHTML = `
      <section class="panel">
        <h3>Customer Information</h3>

        <div class="mini-list">
          <div>
            <span>Name</span>
            <strong>${customer.name || "—"}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>${customer.email || "—"}</strong>
          </div>

          <div>
            <span>Mobile</span>
            <strong>${customer.phone || "—"}</strong>
          </div>

          <div>
            <span>Address</span>
            <strong>${customer.address || "—"}</strong>
          </div>

          <div>
            <span>Driver's License Number</span>
            <strong>${customer.driver_license_number || "—"}</strong>
          </div>

          <div>
            <span>Verification Status</span>
            <strong>${capitalize(
              customer.verification_status || "pending"
            )}</strong>
          </div>
        </div>
      </section>

        <div class="form-grid">

          ${
            customer.government_id_path
              ? `
                <button
                  type="button"
                  class="secondary"
                  onclick="viewCustomerDocument(${customer.id}, 'government-id')">
                  View Government ID
                </button>
              `
              : `
                <button
                  type="button"
                  class="secondary"
                  disabled>
                  Government ID - Not Submitted
                </button>
              `
          }

          ${
            customer.driver_license_path
              ? `
                <button
                  type="button"
                  class="secondary"
                  onclick="viewCustomerDocument(${customer.id}, 'driver-license')">
                  View Driver's License
                </button>
              `
              : `
                <button
                  type="button"
                  class="secondary"
                  disabled>
                  Driver's License - Not Submitted
                </button>
              `
          }

          ${
            customer.selfie_id_path
              ? `
                <button
                  type="button"
                  class="secondary"
                  onclick="viewCustomerDocument(${customer.id}, 'selfie-id')">
                  View Selfie with ID
                </button>
              `
              : `
                <button
                  type="button"
                  class="secondary"
                  disabled>
                  Selfie with ID - Not Submitted
                </button>
              `
          }

          <button
            type="button"
            class="secondary"
            onclick="renderPanel('customers')">
            Back to Customers
          </button>

          <button
            type="button"
            class="primary"
            onclick="reviewCustomerVerification(${customer.id}, 'verified')">
            Verify Customer
          </button>

          <button
            type="button"
            class="secondary"
            onclick="reviewCustomerVerification(${customer.id}, 'rejected')">
            Reject Customer
          </button>
        </div>
      </section>
    `;

  } catch (error) {
    alert(error.message);
  }
}

async function viewCustomerDocument(customerId, type) {
  try {
    const response = await fetch(
      `${API_URL}/customers/${customerId}/documents/${type}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "image/*"
        }
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.message || "Unable to open customer document."
      );
    }

    const blob = await response.blob();
    const documentUrl = URL.createObjectURL(blob);

    window.open(documentUrl, "_blank");

    setTimeout(() => {
      URL.revokeObjectURL(documentUrl);
    }, 60000);

  } catch (error) {
    alert(error.message);
  }
}

async function reviewCustomerVerification(customerId, status) {
  try {
    const actionText =
      status === "verified"
        ? "verify this customer"
        : "reject this customer";

    const confirmed = confirm(
      `Are you sure you want to ${actionText}?`
    );

    if (!confirmed) return;

    await apiFetch(`/customers/${customerId}/verification`, {
      method: "PATCH",
      body: JSON.stringify({
        status: status
      })
    });

    alert(
      status === "verified"
        ? "Customer verified successfully."
        : "Customer verification rejected."
    );

    await renderPanel("customers");

  } catch (error) {
    alert(error.message);
  }
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
    ["dashboard", "Dashboard", "i-home"],
    ["reservations", "Reservations", "i-file"],
    ["rentals", "Rentals", "i-car"],
    ["customers", "Customers", "i-user"],
    ["vehicles", "Vehicles", "i-car"],
    ["payments", "Payments", "i-card"],
    ["chat", "AI Chat Monitor", "i-chat"],
    ["reports", "Reports", "i-chart"],
    ["profile", "Profile", "i-user"],
    ["logout", "Logout", "i-log-out"]
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
let editingCarId = null;
let bookingCars = [];
let unreadNotifications = 0;
let resetEmail = null;

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

  const siteHeader = document.querySelector("#siteHeader");
  const siteFooter = document.querySelector("footer");

  if (siteHeader) {
    siteHeader.style.display = id === "landing" ? "" : "none";
  }

  if (siteFooter) {
    siteFooter.style.display = id === "landing" ? "" : "none";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}


document.addEventListener("click", event => {
  const route = event.target.closest("[data-route]")?.dataset.route;
  const panel = event.target.closest("[data-panel]")?.dataset.panel;
  if (route) {
    if (route === "landing") setView("landing");
    if (route === "login") setView("login");
    if (route === "register") setView("register");
    if (route === "forgot-password") setView("forgot-password");
    if (route === "verify-otp") setView("verify-otp");
    if (route === "reset-password") setView("reset-password");
  }
  if (event.target.closest("[data-action='logout']")) {
    logout();
  }
  if (panel) {

  // Reset Edit Vehicle mode when the admin manually opens
  // Vehicle Management from the sidebar
    if (panel === "vehicle-management") {
      editingCarId = null;
    }

    renderPanel(panel);
  }
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

document.querySelector("#registerForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.reportValidity()) {
    return;
  }

  const password = document.querySelector("#registerPassword").value;
  const passwordConfirmation = document.querySelector("#registerPasswordConfirmation").value;

  if (password !== passwordConfirmation) {
    alert("Passwords do not match.");
    return;
  }

  const formData = new FormData(form);

  formData.set(
    "name",
    `${formData.get("first_name")} ${formData.get("last_name")}`.trim()
  );

  try {

    const response = await apiFetch("/register", {
      method: "POST",
      body: formData
    });

    console.log("Registration response:", response);

    alert("Account created successfully. You can now log in.");

    form.reset();

    setView("login");

  } catch (error) {

    console.error("Registration error:", error);

    alert(error.message);
  }
});

document.querySelector("#forgotPasswordForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document.querySelector("#forgotEmail").value;

  try {

    const response = await apiFetch("/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify({
        email: email
      })
    });

    console.log("OTP Response:", response);

    resetEmail = email;

    alert(
      "OTP sent successfully! Please check your email."
    );

    setView("verify-otp");

  } catch (error) {

    console.error("Forgot password error:", error);

    alert(error.message);
  }
});

document.querySelector("#verifyOtpForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const otp = document.querySelector("#otpCode").value.trim();

  if (!resetEmail) {
    alert("Please request a new OTP first.");
    setView("forgot-password");
    return;
  }

  try {
    const response = await apiFetch("/forgot-password/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        email: resetEmail,
        otp: otp
      })
    });

    console.log("Verify OTP Response:", response);

    alert("OTP verified successfully!");

    setView("reset-password");

  } catch (error) {
    console.error("Verify OTP error:", error);
    alert(error.message);
  }
});

document.querySelector("#resetPasswordForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const password = document.querySelector("#newPassword").value;
  const confirmPassword = document.querySelector("#confirmNewPassword").value;

  if (!resetEmail) {
    alert("Password reset session expired. Please request a new OTP.");
    setView("forgot-password");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    const response = await apiFetch("/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify({
        email: resetEmail,
        password: password,
        password_confirmation: confirmPassword
      })
    });

    alert(response.message || "Password updated successfully!");

    resetEmail = null;

    document.querySelector("#resetPasswordForm").reset();
    document.querySelector("#verifyOtpForm").reset();
    document.querySelector("#forgotPasswordForm").reset();

    setView("login");

  } catch (error) {
    console.error("Reset password error:", error);
    alert(error.message);
  }
});

async function openPortal(role) {
  currentRole = role;
  await getUnreadNotificationCount();
  roleLabel.textContent = currentUser?.name || role.charAt(0).toUpperCase() + role.slice(1);

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

  if (panel === "tracking" && currentRole === "admin") {
    setTimeout(async () => {

      const select =
        document.querySelector("#trackingVehicle");

      if (!select || !select.value) return;

      await changeTrackedVehicle(select.value);

    }, 0);
  }

  if (panel === "payments" && currentRole === "customer") {
    setTimeout(() => {
      updatePaymentBreakdown();
    }, 0);
  }
}

async function saveVehicle(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  // Convert availability to Laravel-friendly value
  formData.set(
    "available",
    formData.get("available") === "1" ? "1" : "0"
  );

  try {

    let response;

    if (editingCarId) {

      // Laravel file uploads are safer through POST + _method=PATCH
      formData.append("_method", "PATCH");

      response = await apiFetch(`/cars/${editingCarId}`, {
        method: "POST",
        body: formData
      });

    } else {

      response = await apiFetch("/cars", {
        method: "POST",
        body: formData
      });

    }

    console.log("Vehicle saved:", response);

    if (editingCarId) {
      alert("Vehicle updated successfully!");
    } else {
      alert("Vehicle added successfully!");
    }

    editingCarId = null;

    form.reset();

    await getCars(true);

    await renderPanel("vehicle-management");

  } catch (error) {

    console.error("Error saving vehicle:", error);

    alert(error.message || "Failed to save vehicle.");
  }
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
        car.image
          ? (
              car.image.startsWith("/storage/")
                ? `http://127.0.0.1:8000${car.image}`
                : car.image
            )
          : "",
        capitalize(car.brand) + " " + capitalize(car.model),
        capitalize(car.brand),
        capitalize(car.transmission),
        capitalize(car.fuel_type),
        car.seats + " seats",
        car.rates && car.rates.length > 0
        ? "Starts at ₱" + Math.min(...car.rates.map(rate => Number(rate.price))).toLocaleString("en-PH")
        : "Rate unavailable",
        car.available ? "Available" : "Reserved"
        )
      ).join("")
    }

  </div>`;
}

async function employeeVehicleCards() {
  const cars = await getCars();

  return `
    <div class="filters">

      <select
        id="employeeVehicleType"
        onchange="filterEmployeeVehicles()">
        <option value="">Vehicle Type</option>
        <option value="SUV">SUV</option>
        <option value="sedan">Sedan</option>
      </select>

      <select
        id="employeePriceRange"
        onchange="filterEmployeeVehicles()">
        <option value="">Price Range</option>
        <option value="1500-2500">₱1,500 - ₱2,500</option>
        <option value="2501-5000">₱2,501 - ₱5,000</option>
      </select>

      <select
        id="employeeTransmission"
        onchange="filterEmployeeVehicles()">
        <option value="">Transmission</option>
        <option value="automatic">Automatic</option>
        <option value="manual">Manual</option>
      </select>

      <select
        id="employeeFuel"
        onchange="filterEmployeeVehicles()">
        <option value="">Fuel</option>
        <option value="gasoline">Gasoline</option>
        <option value="diesel">Diesel</option>
      </select>

      <select
        id="employeeAvailability"
        onchange="filterEmployeeVehicles()">
        <option value="">Availability</option>
        <option value="available">Available</option>
        <option value="reserved">Reserved</option>
      </select>

    </div>

    <div class="vehicle-grid" id="employeeVehicleGrid">
      ${cars.map(car => {

        const image = car.image
          ? (
              car.image.startsWith("/storage/")
                ? `http://127.0.0.1:8000${car.image}`
                : car.image
            )
          : "";

        const name =
          `${capitalize(car.brand)} ${capitalize(car.model)}`;

        const price =
          car.rates && car.rates.length > 0
            ? "Starts at ₱" +
              Math.min(
                ...car.rates.map(rate => Number(rate.price))
              ).toLocaleString("en-PH")
            : "Rate unavailable";

        const availability =
          car.available ? "Available" : "Reserved";

        const statusClass =
          car.available ? "available" : "reserved";

        return `
          <article class="vehicle-card">

            <img src="${image}" alt="${name}">

            <div class="vehicle-body">

              <span class="status ${statusClass}">
                ${availability}
              </span>

              <h3>${name}</h3>

              <p>
                ${capitalize(car.brand)} ·
                ${capitalize(car.transmission)} ·
                ${capitalize(car.fuel_type)} ·
                ${car.seats} seats
              </p>

              <div class="price-row">
                <strong>${price}</strong>
              </div>

            </div>

          </article>
        `;
      }).join("")}
    </div>
  `;
}

async function filterEmployeeVehicles() {
  const cars = await getCars();

  const type = document.querySelector("#employeeVehicleType")?.value || "";
  const priceRange = document.querySelector("#employeePriceRange")?.value || "";
  const transmission = document.querySelector("#employeeTransmission")?.value || "";
  const fuel = document.querySelector("#employeeFuel")?.value || "";
  const availability = document.querySelector("#employeeAvailability")?.value || "";

  const filteredCars = cars.filter(car => {

    const carType = (car.vehicle_type || "").toLowerCase();
    const selectedType = type.toLowerCase();

    const carTransmission = (car.transmission || "").toLowerCase();
    const carFuel = (car.fuel_type || "").toLowerCase();

    const carAvailability =
      car.available ? "available" : "reserved";

    const carPrice =
      car.rates && car.rates.length > 0
        ? Math.min(...car.rates.map(rate => Number(rate.price)))
        : Number(car.price_per_day || 0);

    const matchesType =
      !selectedType || carType === selectedType;

    const matchesTransmission =
      !transmission || carTransmission === transmission;

    const matchesFuel =
      !fuel || carFuel === fuel;

    const matchesAvailability =
      !availability || carAvailability === availability;

    let matchesPrice = true;

    if (priceRange === "1500-2500") {
      matchesPrice = carPrice >= 1500 && carPrice <= 2500;
    }

    if (priceRange === "2501-5000") {
      matchesPrice = carPrice >= 2501 && carPrice <= 5000;
    }

    return (
      matchesType &&
      matchesPrice &&
      matchesTransmission &&
      matchesFuel &&
      matchesAvailability
    );
  });

  renderEmployeeVehicleCards(filteredCars);
}

function renderEmployeeVehicleCards(cars) {

  const vehicleGrid = document.querySelector("#employeeVehicleGrid");

  if (!vehicleGrid) return;

  if (cars.length === 0) {
    vehicleGrid.innerHTML = `
      <section class="panel">
        <p>No vehicles match the selected filters.</p>
      </section>
    `;
    return;
  }

  vehicleGrid.innerHTML = cars.map(car => {

    const image = car.image
      ? (
          car.image.startsWith("/storage/")
            ? `http://127.0.0.1:8000${car.image}`
            : car.image
        )
      : "";

    const name =
      `${capitalize(car.brand)} ${capitalize(car.model)}`;

    const price =
      car.rates && car.rates.length > 0
        ? "Starts at ₱" +
          Math.min(
            ...car.rates.map(rate => Number(rate.price))
          ).toLocaleString("en-PH")
        : "Rate unavailable";

    const availability =
      car.available ? "Available" : "Reserved";

    const statusClass =
      car.available ? "available" : "reserved";

    return `
      <article class="vehicle-card">

        <img src="${image}" alt="${name}">

        <div class="vehicle-body">

          <span class="status ${statusClass}">
            ${availability}
          </span>

          <h3>${name}</h3>

          <p>
            ${capitalize(car.brand)} ·
            ${capitalize(car.transmission)} ·
            ${capitalize(car.fuel_type)} ·
            ${car.seats} seats
          </p>

          <div class="price-row">
            <strong>${price}</strong>
          </div>

        </div>

      </article>
    `;
  }).join("");
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

function adminVehicleCard(id, img, name, type, transmission, fuel, seats, price, availability) {
  const statusClass = availability === "Available" ? "available" : "reserved";

  return `
    <article class="vehicle-card">

      <img src="${img || './assets/no-image.jpg'}" alt="${name}">

      <div class="vehicle-body">

        <span class="status ${statusClass}">
          ${availability}
        </span>

        <h3>${name}</h3>

        <p>
          ${type} · ${transmission} · ${fuel} · ${seats}
        </p>

        <div class="price-row">
          <strong>${price}</strong>

          <div class="vehicle-actions">

            <button
              type="button"
              class="secondary"
              onclick="editVehicle(${id})">
              Edit
            </button>

            <button
              type="button"
              class="secondary"
              onclick="deleteVehicle(${id}, '${name}')">
              Delete
            </button>

          </div>
        </div>

      </div>

    </article>
  `;
}

async function adminVehicleCards() {

  const cars = await getCars();

  return `
    <div class="filters">
      <select><option>Vehicle Type</option></select>
      <select><option>Price Range</option></select>
      <select><option>Transmission</option></select>
      <select><option>Fuel</option></select>
      <select><option>Availability</option></select>
    </div>

    <div class="vehicle-grid">

      ${cars.map(car =>
        adminVehicleCard(
          car.id,
          car.image
            ? (
                car.image.startsWith("/storage/")
                  ? `http://127.0.0.1:8000${car.image}`
                  : car.image
              )
            : "",
          capitalize(car.brand) + " " + capitalize(car.model),
          capitalize(car.brand),
          capitalize(car.transmission),
          capitalize(car.fuel_type),
          car.seats + " seats",
          car.rates && car.rates.length > 0
            ? "Starts at ₱" + Math.min(
                ...car.rates.map(rate => Number(rate.price))
              ).toLocaleString("en-PH")
            : "Rate unavailable",
          car.available ? "Available" : "Unavailable"
        )
      ).join("")}

    </div>
  `;
}

async function deleteVehicle(carId, carName) {

  const confirmed = confirm(
    `Are you sure you want to delete ${carName}?`
  );

  if (!confirmed) return;

  try {

    await apiFetch(`/cars/${carId}`, {
      method: "DELETE"
    });

    alert(`${carName} deleted successfully.`);

    await getCars(true);

    await renderPanel("vehicle-management");

  } catch (error) {

    console.error("Error deleting vehicle:", error);

    alert(error.message || "Failed to delete vehicle.");
  }
}

async function editVehicle(carId) {

  const cars = await getCars();

  const car = cars.find(car =>
    Number(car.id) === Number(carId)
  );

  if (!car) {
    alert("Vehicle not found.");
    return;
  }

  editingCarId = car.id;

  const form = document.querySelector("#vehicleForm");

  form.brand.value = car.brand || "";
  form.model.value = car.model || "";
  form.year.value = car.year || "";
  form.fuel_type.value = car.fuel_type || "";
  form.transmission.value = car.transmission || "";
  form.seats.value = car.seats || "";
  form.available.value = car.available ? "1" : "0";

  const within12 = car.rates?.find(rate =>
  rate.location === "within" && rate.duration === "12hrs"
  );

  const within24 = car.rates?.find(rate =>
    rate.location === "within" && rate.duration === "24hrs"
  );

  const outside12 = car.rates?.find(rate =>
    rate.location === "outside" && rate.duration === "12hrs"
  );

 const outside24 = car.rates?.find(rate =>
  rate.location === "outside" && rate.duration === "24hrs"
  );

  const unli24 = car.rates?.find(rate =>
    rate.location === "unli" && rate.duration === "24hrs"
  );

  form.within_12hrs.value = within12?.price || "";
  form.within_24hrs.value = within24?.price || "";
  form.outside_12hrs.value = outside12?.price || "";
  form.outside_24hrs.value = outside24?.price || "";
  form.unli_24hrs.value = unli24?.price || "";

  const button = form.querySelector("button[type='submit']");
  button.textContent = "Update Vehicle";

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function metrics(items) {
  return `<div class="metrics">${items.map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>`;
}


function table(title, headers, rows) {
  return `<section class="table-card"><h3>${title}</h3><table class="data-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
}


async function charts(cars = null, payments = null) {

  if (!cars || !payments) {
    [cars, payments] = await Promise.all([
      getCars(),
      getPayments()
    ]);
  }

  // =========================
  // VEHICLE AVAILABILITY
  // =========================

  const totalVehicles = cars.length;

  const availableVehicles = cars.filter(
    car => Boolean(car.available)
  ).length;

  const unavailableVehicles =
    totalVehicles - availableVehicles;

  const availablePercent =
    totalVehicles > 0
      ? Math.round((availableVehicles / totalVehicles) * 100)
      : 0;

  const unavailablePercent =
    totalVehicles > 0
      ? 100 - availablePercent
      : 0;


  // =========================
  // MONTHLY REVENUE
  // =========================

  const approvedPayments = payments.filter(
    payment => payment.status === "approved"
  );

  const monthlyRevenue = {};

  approvedPayments.forEach(payment => {

    const date = new Date(payment.created_at);

    const monthKey = date.toLocaleDateString("en-PH", {
      month: "short",
      year: "numeric"
    });

    if (!monthlyRevenue[monthKey]) {
      monthlyRevenue[monthKey] = 0;
    }

    monthlyRevenue[monthKey] += Number(payment.amount || 0);

  });


  const revenueEntries = Object.entries(monthlyRevenue)
    .sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);

      return dateA - dateB;
    });

  const maxRevenue = revenueEntries.length > 0
    ? Math.max(...revenueEntries.map(([month, amount]) => amount))
    : 0;


  const revenueBars = revenueEntries.length > 0

    ? revenueEntries.map(([month, amount]) => {

        const height =
          maxRevenue > 0
            ? Math.max((amount / maxRevenue) * 100, 5)
            : 5;

        return `
          <div class="revenue-bar-item">

            <div class="revenue-bar-track">

              <div
                class="revenue-bar-fill"
                style="height:${height}%"
                title="${month}: ${formatPeso(amount)}">
              </div>

            </div>

            <div class="revenue-amount">
              ${formatPeso(amount)}
            </div>

            <div class="revenue-month">
              ${month}
            </div>

          </div>
        `;

      }).join("")

    : `
        <div class="form-help">
          No approved payment records yet.
        </div>
      `;


  // =========================
  // DISPLAY
  // =========================

  return `
    <div class="dashboard-grid">

      <section class="chart-card">

        <h3>Monthly Revenue Chart</h3>

        <div class="revenue-chart-wrapper">

          <div class="revenue-y-axis">
            <span>${formatPeso(maxRevenue)}</span>
            <span>${formatPeso(maxRevenue * 0.75)}</span>
            <span>${formatPeso(maxRevenue * 0.50)}</span>
            <span>${formatPeso(maxRevenue * 0.25)}</span>
            <span>₱0.00</span>
          </div>

          <div class="revenue-chart">

            <div class="revenue-grid">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div class="revenue-bars">
              ${revenueBars}
            </div>

          </div>

        </div>

      </section>


      <section class="chart-card">

        <h3>Vehicle Availability</h3>

        <div class="mini-list">

          <div>
            <span>Available Vehicles</span>
            <strong>${availableVehicles}</strong>
          </div>

          <div>
            <span>Unavailable / Reserved</span>
            <strong>${unavailableVehicles}</strong>
          </div>

          <div>
            <span>Total Vehicles</span>
            <strong>${totalVehicles}</strong>
          </div>

          <div>
            <span>Availability Rate</span>
            <strong>${availablePercent}%</strong>
          </div>

        </div>

        <div
          class="donut"
          style="
            background:
              conic-gradient(
                #111 ${availablePercent}%,
                #ddd ${availablePercent}% 100%
              );
          "
        ></div>

        <div class="form-help">
          Available: ${availablePercent}% ·
          Unavailable: ${unavailablePercent}%
        </div>

      </section>

    </div>
  `;
}

function adminCharts(payments, cars, bookings) {

  const available = cars.filter(car => Boolean(car.available)).length;
  const unavailable = cars.length - available;

  const total = cars.length || 1;

  const availablePercent = (available / total) * 100;

  return `
    <div class="dashboard-grid">

      <section class="chart-card">
        <h3>Monthly Revenue Chart</h3>
        <p class="form-help">
          Revenue chart will use approved payment records.
        </p>
      </section>

      <section class="chart-card">
        <h3>Vehicle Availability</h3>

        <div class="mini-list">
          <div>
            <span>Available</span>
            <strong>${available}</strong>
          </div>

          <div>
            <span>Unavailable / Reserved</span>
            <strong>${unavailable}</strong>
          </div>

          <div>
            <span>Availability Rate</span>
            <strong>${availablePercent.toFixed(0)}%</strong>
          </div>
        </div>

      </section>

    </div>
  `;
}


const panels = {
  customer: {
    dashboard: async () => {

  const [carsHTML, bookings, payments] = await Promise.all([
    vehicleCards(),
    getMyBookings(),
    getPayments()
  ]);

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
        const bookings = await getMyBookings();
        const payments = await getPayments();

        const settings = await getSystemSettings();

        const reservationFeePerDay =
          Number(settings.reservation_fee || 500);
        if (!bookings.length) {
          return `
            <section class="panel">
              <h3>My Bookings</h3>
              <p>You have no bookings yet.</p>
            </section>
          `;
        }

        const rows = bookings.map(booking => {

          const bookingPayments = payments.filter(payment =>
            Number(payment.booking_id) === Number(booking.id)
          );

          const approvedPaid = bookingPayments
            .filter(payment => payment.status === "approved")
            .reduce(
              (total, payment) => total + Number(payment.amount || 0),
              0
            );

          const hasPendingPayment = bookingPayments.some(
            payment => payment.status === "pending"
          );

          const pickup = new Date(booking.pickup_date);
          const returned = new Date(booking.return_date);

          const hours = (returned - pickup) / (1000 * 60 * 60);

          const reservationDays =
            Math.max(1, Math.ceil(hours / 24));

          const requiredReservationFee =
            reservationDays * reservationFeePerDay;

          const remainingBalance =
            Math.max(
              0,
              Number(booking.total_price || 0) - approvedPaid
            );

          let paymentState;

          if (remainingBalance <= 0) {
            paymentState =
              `<span class="status available">Fully Paid</span>`;
          }
          else if (hasPendingPayment) {
            paymentState =
              `<span class="status reserved">Payment for Verification</span>`;
          }
          else if (approvedPaid >= requiredReservationFee) {
            paymentState =
              `<span class="status reserved">Balance Due · ${formatPeso(remainingBalance)}</span>`;
          }
          else {
            paymentState =
              `<span class="status reserved">Reservation Required · ${formatPeso(requiredReservationFee)}</span>`;
          }

          return [
            "BK-" + booking.id,

            booking.car
              ? capitalize(booking.car.brand) + " " + capitalize(booking.car.model)
              : "Vehicle unavailable",

            new Date(booking.pickup_date).toLocaleString("en-PH"),

            new Date(booking.return_date).toLocaleString("en-PH"),

            formatPeso(booking.total_price),

            paymentState
          ];
        });

        return table(
          "My Bookings",
          ["Booking ID", "Vehicle", "Pickup", "Return", "Total", "Payment Status"],
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

  const verificationStatus =
    currentUser?.verification_status || "pending";

  const isVerified =
    verificationStatus === "verified";

  const verificationMessage =
    verificationStatus === "rejected"
      ? "Your account verification was rejected. Please contact AAV Car Rental Services before making a booking."
      : verificationStatus === "pending"
      ? "Your account is still pending verification. You can browse vehicles, but booking is disabled until your account is verified."
      : "";

  const vehicleOptions = [
    `<option value="">Select a vehicle</option>`,
    ...bookingCars.map(car => {
      const name = `${capitalize(car.brand)} ${capitalize(car.model)}`;
      return `<option value="${car.id}" ${Number(selectedCar?.id) === Number(car.id) ? "selected" : ""}>${name}</option>`;
    })
  ].join("");

  return `

  ${
  !isVerified
    ? `
      <section class="panel">
        <h3>Account Verification Required</h3>
        <p>${verificationMessage}</p>
      </section>
    `
    : ""
}

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
          <option value="unli">Unli Mileage</option>
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
        onclick="submitBooking()"
        ${!isVerified ? "disabled" : ""}>
        ${isVerified ? "Submit Booking" : "Verification Required"}
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
  dashboard: async () => {

    const [cars, bookings, payments] = await Promise.all([
      getCars(),
      getBookings(),
      getPayments()
    ]);

    const today = new Date().toISOString().slice(0, 10);

    const todaysPickups = bookings.filter(booking =>
      booking.pickup_date?.slice(0, 10) === today
    ).length;

    const todaysPickupRows = bookings
      .filter(booking =>
        booking.pickup_date?.slice(0, 10) === today
      )
      .map(booking => [
        booking.user?.name || "Unknown customer",

        booking.car
          ? `${capitalize(booking.car.brand)} ${capitalize(booking.car.model)}`
          : "Vehicle unavailable",

        new Date(booking.pickup_date).toLocaleTimeString("en-PH", {
          hour: "numeric",
          minute: "2-digit"
        }),

        capitalize(booking.status || "pending")
      ]);
    
    const todaysReturnRows = bookings
      .filter(booking =>
        booking.return_date?.slice(0, 10) === today
      )
      .map(booking => [
        booking.user?.name || "Unknown customer",

        booking.car
          ? `${capitalize(booking.car.brand)} ${capitalize(booking.car.model)}`
          : "Vehicle unavailable",

        new Date(booking.return_date).toLocaleTimeString("en-PH", {
          hour: "numeric",
          minute: "2-digit"
        }),

        capitalize(booking.status || "pending")
      ]);

    const todaysReturns = bookings.filter(booking =>
      booking.return_date?.slice(0, 10) === today
    ).length;

    const pendingReservations = bookings.filter(booking =>
      booking.status?.toLowerCase() === "pending"
    ).length;

    const activeRentals = bookings.filter(booking =>
      ["confirmed", "ongoing"].includes(
        booking.status?.toLowerCase()
      )
    ).length;

    const availableVehicles = cars.filter(car =>
      Boolean(car.available)
    ).length;

    const pendingPayments = payments.filter(payment =>
      payment.status === "pending"
    ).length;

    return `
      ${metrics([
        ["Today's Pickups", todaysPickups],
        ["Today's Returns", todaysReturns],
        ["Pending Reservations", pendingReservations],
        ["Active Rentals", activeRentals],
        ["Available Vehicles", availableVehicles],
        ["Pending Payments", pendingPayments]
      ])}

      ${table(
        "Today's Pickups",
        ["Customer", "Vehicle", "Pickup Time", "Status"],
        todaysPickupRows.length
          ? todaysPickupRows
          : [["—", "No pickups scheduled today", "—", "—"]]
      )}

       ${table(
        "Today's Returns",
        ["Customer", "Vehicle", "Return Time", "Status"],
        todaysReturnRows.length
          ? todaysReturnRows
          : [["—", "No returns scheduled today", "—", "—"]]
      )}
    `;
  },
  reservations: async () => {

    const settings = await getSystemSettings();

    const reservationFeePerDay =
      Number(settings.reservation_fee || 500);

    const bookings = await getBookings();

    const rows = bookings.map(booking => [
      "BK-" + booking.id,

      booking.user?.name || "Unknown customer",

      booking.car
        ? `${capitalize(booking.car.brand)} ${capitalize(booking.car.model)}`
        : "Vehicle unavailable",

      new Date(booking.pickup_date).toLocaleString("en-PH"),

      new Date(booking.return_date).toLocaleString("en-PH"),

      capitalize(booking.status || "pending")
    ]);

    return table(
      "Reservations",
      [
        "Booking ID",
        "Customer",
        "Vehicle",
        "Pickup",
        "Return",
        "Status"
      ],
      rows.length
        ? rows
        : [[
            "—",
            "No reservations found",
            "—",
            "—",
            "—",
            "—"
          ]]
    );
  },
  
  rentals: async () => {

    const bookings = await getBookings();

    const rentalBookings = bookings.filter(booking =>
      ["confirmed", "ongoing", "completed"].includes(
        booking.status?.toLowerCase()
      )
    );

    const rows = rentalBookings.map(booking => {

      const status = booking.status?.toLowerCase();

      let action = "—";

      if (status === "confirmed") {
        action = `
          <button
            type="button"
            class="primary"
            onclick="updateRentalStatus(${booking.id}, 'ongoing')">
            Start Rental
          </button>
        `;
      }

      if (status === "ongoing") {
        action = `
          <button
            type="button"
            class="primary"
            onclick="updateRentalStatus(${booking.id}, 'completed')">
            Complete Rental
          </button>
        `;
      }

      if (status === "completed") {
        action = `<span class="status available">Completed</span>`;
      }

      return [
        "BK-" + booking.id,

        booking.user?.name || "Unknown customer",

        booking.car
          ? `${capitalize(booking.car.brand)} ${capitalize(booking.car.model)}`
          : "Vehicle unavailable",

        new Date(booking.pickup_date).toLocaleString("en-PH"),

        new Date(booking.return_date).toLocaleString("en-PH"),

        capitalize(booking.status || "confirmed"),

        action
      ];
    });

    return table(
      "Rentals",
      [
        "Booking ID",
        "Customer",
        "Vehicle",
        "Pickup",
        "Return",
        "Rental Status",
        "Action"
      ],
      rows.length
        ? rows
        : [[
            "—",
            "No active or completed rentals found",
            "—",
            "—",
            "—",
            "—",
            "—"
          ]]
    );
  },
  customers: async () => {

    const customers = await apiFetch("/customers");

    const rows = customers.map(customer => {

      const status = customer.verification_status || "pending";

      const statusBadge =
        status === "verified"
          ? `<span class="status available">Verified</span>`
          : status === "rejected"
          ? `<span class="status trip">Rejected</span>`
          : `<span class="status reserved">Pending</span>`;

      return [
        customer.name || "Unknown customer",
        customer.email || "—",
        customer.phone || "—",
        statusBadge
      ];
    });

    const customerRows = rows.length
      ? rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${cell}</td>`).join("")}
          </tr>
        `).join("")
      : `
          <tr>
            <td>—</td>
            <td>No customers found</td>
            <td>—</td>
          </tr>
        `;

    return `
      <section class="table-card">

        <div style="margin-bottom: 18px;">
          <input
            type="search"
            placeholder="Search customer by name, email, or mobile..."
            oninput="filterEmployeeCustomers(this.value)"
            style="width: 100%;"
          >
        </div>

        <h3>Customers</h3>

        <table
          class="data-table"
          id="employeeCustomersTable"
        >
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Verification Status</th>
            </tr>
          </thead>

          <tbody>
            ${customerRows}
          </tbody>
        </table>

      </section>
    `;
  },
    vehicles: employeeVehicleCards,
    payments: () => paymentPanel(),
    chat: async () => {

      const logs = await apiFetch("/chat-logs");

      const rows = logs.map(log => [

        log.user?.name || "Unknown customer",

        log.message,

        log.source || "—",

        new Date(log.created_at).toLocaleString("en-PH"),

        `
          <button
            type="button"
            class="secondary"
            onclick="viewChatDetails(${log.id})">
            View Details
          </button>
        `
      ]);

      return table(
        "AI Chat Monitor",
        [
          "Customer",
          "Question",
          "Source",
          "Date & Time",
          "Action"
        ],
        rows.length
          ? rows
          : [[
              "—",
              "No chat logs found",
              "—",
              "—",
              "—"
            ]]
      );
    },
    reports: () => reportsPanel(),
    profile: () => profilePanel("Employee")
  },
  admin: {
    dashboard: async () => {
      const [cars, bookings, payments] = await Promise.all([
        getCars(),
        getBookings(),
        getPayments()
      ]);

      const totalVehicles = cars.length;

      const availableVehicles = cars.filter(car =>
        Boolean(car.available)
      ).length;

      const pendingReservations = bookings.filter(booking =>
        booking.status?.toLowerCase() === "pending"
      ).length;

      const activeRentals = bookings.filter(booking =>
        ["confirmed", "ongoing"].includes(
          booking.status?.toLowerCase()
        )
      ).length;

      const pendingPayments = payments.filter(payment =>
        payment.status === "pending"
      ).length;

      const approvedRevenue = payments
        .filter(payment => payment.status === "approved")
        .reduce((total, payment) => total + Number(payment.amount || 0), 0);

      const recentBookings = bookings
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map(booking => [
          booking.user?.name || "Customer",
          booking.car
            ? `${capitalize(booking.car.brand)} ${capitalize(booking.car.model)}`
            : "Vehicle unavailable",
          capitalize(booking.status || "pending")
        ]);

      return `
        ${metrics([
          ["Approved Payments", formatPeso(approvedRevenue)],
          ["Total Vehicles", totalVehicles],
          ["Available Vehicles", availableVehicles],
          ["Active Rentals", activeRentals],
          ["Pending Reservations", pendingReservations],
          ["Pending Payments", pendingPayments]
        ])}

        ${adminCharts(payments, cars, bookings)}

        ${table(
          "Recent Bookings",
          ["Customer", "Vehicle", "Status"],
          recentBookings.length
            ? recentBookings
            : [["—", "No bookings yet", "—"]]
        )}
      `;
    },

    employees: async () => {
      return table(
        "Employees",
        ["Name", "Email", "Mobile", "Role"],
        [
          ["—", "No employees found", "—", "—"]
        ]
      );
    },

    customers: async () => {

      const customers = await apiFetch("/customers");

      const rows = customers.map(customer => {

        const verificationStatus =
          customer.verification_status || "pending";

        const statusBadge =
          verificationStatus === "verified"
            ? `<span class="status available">Verified</span>`
            : verificationStatus === "rejected"
            ? `<span class="status trip">Rejected</span>`
            : `<span class="status reserved">Pending</span>`;

        const action = `
          <button
            type="button"
            class="secondary"
            onclick="viewCustomerRequirements(${customer.id})">
            View Requirements
          </button>
        `;

        return [
          customer.name || "Unknown customer",
          customer.email || "—",
          customer.phone || "—",
          statusBadge,
          action
        ];
      });

      return table(
        "Customer Verification",
        [
          "Name",
          "Email",
          "Mobile",
          "Verification Status",
          "Action"
        ],
        rows.length
          ? rows
          : [[
              "—",
              "No customers found",
              "—",
              "—",
              "—"
            ]]
      );
    },
    "vehicle-management": async () => {

  const carsHTML = await adminVehicleCards();

  return `
  <section class="panel">
    <h3>Vehicle Information</h3>

    <form id="vehicleForm" class="form-grid" onsubmit="saveVehicle(event)">

      <label>
        Brand
        <input
          name="brand"
          type="text"
          placeholder="e.g. Toyota"
          required
        >
      </label>

      <label>
        Model
        <input
          name="model"
          type="text"
          placeholder="e.g. Vios"
          required
        >
      </label>

      <label>
        Year
        <input
          name="year"
          type="number"
          placeholder="e.g. 2024"
          required
        >
      </label>

      <label>
        Fuel Type
        <select name="fuel_type" required>
          <option value="">Select fuel type</option>
          <option value="gasoline">Gasoline</option>
          <option value="diesel">Diesel</option>
        </select>
      </label>

      <label>
        Transmission
        <select name="transmission" required>
          <option value="">Select transmission</option>
          <option value="automatic">Automatic</option>
          <option value="manual">Manual</option>
        </select>
      </label>

      <label>
        Seating Capacity
        <input
          name="seats"
          type="number"
          min="1"
          placeholder="e.g. 5"
          required
        >
      </label>

      <div class="wide">
        <h3>Rental Rates</h3>
      </div>

      <label>
        Within Manila - 12 Hours
        <input
          name="within_12hrs"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 1800"
          required
        >
      </label>

      <label>
        Within Manila - 24 Hours
        <input
          name="within_24hrs"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 2000"
          required
        >
      </label>

      <label>
        Outside Manila - 12 Hours
        <input
          name="outside_12hrs"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 2000"
          required
        >
      </label>

      <label>
        Outside Manila - 24 Hours
        <input
          name="outside_24hrs"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 2500"
          required
        >
      </label>

      <label>
        Unli Mileage - 24 Hours
        <input
          name="unli_24hrs"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 2899"
          required
        >
      </label>

      <label>
        Availability
        <select name="available" required>
          <option value="1">Available</option>
          <option value="0">Unavailable</option>
        </select>
      </label>

      <label class="wide">
        Upload Vehicle Image
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        >
      </label>

      <button class="primary wide" type="submit">
        Add Vehicle
      </button>

    </form>
  </section>

  ${carsHTML}
  `;
},    
    reservations: async () => {

      const [bookings, payments] = await Promise.all([
        getBookings(),
        getPayments()
      ]); 

      const settings = await getSystemSettings();

      const reservationFeePerDay =
        Number(settings.reservation_fee || 500);

      const rows = bookings.map(booking => {

        const bookingPayments = payments.filter(payment =>
          Number(payment.booking_id) === Number(booking.id)
        );

        const approvedPaid = bookingPayments
          .filter(payment => payment.status === "approved")
          .reduce(
            (total, payment) => total + Number(payment.amount || 0),
            0
          );

        const hasPendingPayment = bookingPayments.some(
          payment => payment.status === "pending"
        );

        const totalPrice = Number(booking.total_price || 0);

        const remainingBalance = Math.max(
          0,
          totalPrice - approvedPaid
        );

        const pickup = new Date(booking.pickup_date);
        const returned = new Date(booking.return_date);

        const hours =
          (returned - pickup) / (1000 * 60 * 60);

        const reservationDays =
          Math.max(1, Math.ceil(hours / 24));

        const reservationFee =
          reservationDays * reservationFeePerDay;

        let paymentState;

        if (totalPrice <= 0) {

          paymentState =
            `<span class="status reserved">No Valid Total</span>`;

        } else if (remainingBalance <= 0) {

          paymentState =
            `<span class="status available">Fully Paid</span>`;
        } else if (hasPendingPayment) {

          paymentState =
            `<span class="status reserved">For Verification</span>`;

        } else if (approvedPaid >= reservationFee) {

          paymentState =
            `<span class="status reserved">Balance Due · ${formatPeso(remainingBalance)}</span>`;

        } else {

          paymentState =
            `<span class="status reserved">Reservation Required · ${formatPeso(reservationFee)}</span>`;
        }

        return [
          "BK-" + booking.id,

          booking.user?.name || "Unknown customer",

          booking.car
            ? capitalize(booking.car.brand) + " " +
              capitalize(booking.car.model)
            : "Vehicle unavailable",

          new Date(booking.pickup_date).toLocaleString("en-PH"),

          new Date(booking.return_date).toLocaleString("en-PH"),

          formatPeso(totalPrice),

          paymentState,

          `<span class="status reserved">${capitalize(booking.status || "pending")}</span>`
        ];
      });

      return table(
        "Reservations",
        [
          "Booking ID",
          "Customer",
          "Vehicle",
          "Pickup",
          "Return",
          "Total",
          "Payment Status",
          "Booking Status"
        ],
        rows.length
          ? rows
          : [[
              "—",
              "No bookings found",
              "—",
              "—",
              "—",
              "—",
              "—",
              "—"
            ]]
      );
    },
    
    payments: () => paymentPanel(),
    tracking: () => trackingPanel(),
    reports: () => reportsPanel(),
    logs: () => panels.employee.chat(),
    settings: async () => {

      const settings = await apiFetch("/settings");

      return `
        <section class="panel">
          <h3>System Settings</h3>

          <form
            class="form-grid"
            onsubmit="saveSystemSettings(event)"
          >

            <label>
              Reservation Fee
              <input
                type="number"
                id="settingsReservationFee"
                value="${Number(settings.reservation_fee)}"
                min="0"
                required
              >
            </label>

            <label>
              Payment Methods
              <input
                type="text"
                id="settingsPaymentMethods"
                value="${settings.payment_methods || ""}"
                required
              >
            </label>

            <label class="wide">
              Rental Policy
              <textarea
                id="settingsRentalPolicy"
              >${settings.rental_policy || ""}</textarea>
            </label>

            <button
              class="primary wide"
              type="submit"
            >
              Update Settings
            </button>

          </form>

        </section>
      `;
    },    
    profile: () => profilePanel("Admin")
  }
};

async function saveSystemSettings(event) {

  event.preventDefault();

  try {

    const reservationFee =
      document.querySelector("#settingsReservationFee").value;

    const paymentMethods =
      document.querySelector("#settingsPaymentMethods").value.trim();

    const rentalPolicy =
      document.querySelector("#settingsRentalPolicy").value.trim();

    const response = await apiFetch("/settings", {
      method: "PATCH",
      body: JSON.stringify({
        reservation_fee: reservationFee,
        payment_methods: paymentMethods,
        rental_policy: rentalPolicy
      })
    });

    settingsCache = response.settings;
    settingsCacheTime = Date.now();

    alert(
      response.message ||
      "Settings updated successfully."
    );

    await renderPanel("settings");

  } catch (error) {

    console.error("Failed to update settings:", error);

    alert(
      error.message ||
      "Failed to update settings."
    );
  }
}


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
    const payments = await getPayments();
    if (currentRole === "admin") return adminPaymentPanel(payments);
    if (currentRole === "employee") return employeePaymentPanel(payments);
    return await customerPaymentPanel(payments);
  } catch (error) {
    return `<section class="panel"><h3>Payments unavailable</h3><p>${error.message}</p></section>`;
  }
}

async function customerPaymentPanel(payments) {
  const settings = await getSystemSettings();

  const reservationFeePerDay =
    Number(settings.reservation_fee || 500);

  const bookings = await getMyBookings();
  const pendingBookingIds = new Set(
  payments
    .filter(payment => payment.status === "pending")
    .map(payment => payment.booking_id)
  );

  const payableBookings = bookings.filter(booking => {
    if (booking.status === "rejected") {
      return false;
    }

    if (pendingBookingIds.has(booking.id)) {
      return false;
    }

    const approvedPaid = payments
      .filter(payment =>
        Number(payment.booking_id) === Number(booking.id) &&
        payment.status === "approved"
      )
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);

    const remainingBalance =
      Number(booking.total_price || 0) - approvedPaid;

    return remainingBalance > 0;
  });
  const bookingOptions = payableBookings.length
  ? payableBookings.map(booking => {

      const pickup = new Date(booking.pickup_date);
      const returned = new Date(booking.return_date);

      const hours = (returned - pickup) / (1000 * 60 * 60);

      // Minimum ₱500, then another ₱500 per started 24-hour block
      const reservationDays = Math.max(1, Math.ceil(hours / 24));
      const reservationFee =
        reservationDays * reservationFeePerDay;

      const approvedPaid = payments
        .filter(payment =>
          Number(payment.booking_id) === Number(booking.id) &&
          payment.status === "approved"
        )
        .reduce(
          (total, payment) => total + Number(payment.amount || 0),
          0
        );

      const totalPrice = Number(booking.total_price || 0);
      const remainingBalance = Math.max(0, totalPrice - approvedPaid);

      return `
        <option
          value="${booking.id}"
          data-total="${totalPrice}"
          data-reservation="${reservationFee}"
          data-paid="${approvedPaid}"
          data-remaining="${remainingBalance}"
        >
          #${booking.id} · ${booking.car.brand} ${booking.car.model}
          (${formatPeso(totalPrice)})
        </option>
      `;
    }).join("")
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
      <h3>1. Scan to Pay</h3>

      <div class="payment-methods">

        <div class="payment-qr-card">
          <strong>GCash</strong>

          <img
            src="./assets/gcash-qr.jpg"
            alt="GCash QR Code"
            class="payment-qr"
          >

          <span>Scan the QR code to pay via GCash.</span>
        </div>

        <div class="payment-qr-card">
          <strong>Bank Transfer</strong>

          <img
            src="./assets/eastwest-qr.jpg"
            alt="EastWest Bank QR Code"
            class="payment-qr"
          >

          <span>Scan the QR code to pay via bank transfer.</span>
        </div>

      </div>
      <p class="payment-reminder">
      <strong>Reminder:</strong> Please verify the payment details shown in the QR code before sending your payment.
      </p>
      <p class="form-help">Pay the reservation fee shown for your booking, then upload a clear screenshot or photo of the successful transaction. The admin verifies it before approving the reservation.</p>
      <h3>2. Send payment confirmation</h3>
      <form id="paymentForm" class="form-grid" onsubmit="submitPayment(event)">
        <label>
          Booking
          <select
            name="booking_id"
            id="paymentBooking"
            onchange="updatePaymentBreakdown()"
            required
            ${payableBookings.length ? "" : "disabled"}
          >
            ${bookingOptions}
          </select>
        </label>
        <div class="wide mini-list" id="paymentBreakdown">
          <div>
            <span>Total Rental Cost</span>
            <strong id="paymentTotal">₱0.00</strong>
          </div>

          <div>
            <span>Required Reservation Fee</span>
            <strong id="paymentReservation">₱0.00</strong>
          </div>

          <div>
            <span>Approved Payment</span>
            <strong id="paymentPaid">₱0.00</strong>
          </div>

          <div>
            <span>Remaining Balance</span>
            <strong id="paymentRemaining">₱0.00</strong>
          </div>
        </div>
        <label>Payment method<select name="method" required><option value="gcash">GCash</option><option value="bank_transfer">Bank transfer</option></select></label>
        <label>Amount sent (₱)<input name="amount" type="number" min="1" step="0.01" placeholder="e.g. 500" required></label>
        <label>Date and time paid<input name="paid_at" type="datetime-local" max="${localDateTimeNow()}" required></label>
        <label>Payer / sender name<input name="payer_name" maxlength="255" autocomplete="name" required></label>
        <label>Transaction reference no.<input name="reference_number" maxlength="100" required></label>
        <label class="wide">Receipt or proof of payment<input name="proof" type="file" accept="image/jpeg,image/png,image/webp" required><small>JPG, PNG, or WebP only · maximum 5 MB</small></label>
        <label class="check wide"><input name="customer_confirmed" type="checkbox" required> I confirm that I have already sent this payment and that the details and proof are accurate.</label>
        <div id="paymentMessage" class="wide form-help"></div>
        <button class="primary wide" type="submit" ${payableBookings.length ? "" : "disabled"}>Send confirmation to admin</button>
      </form>
    </section>

  </div>${table("My payment confirmations", ["Submitted", "Booking", "Method", "Amount", "Status"], history.length ? history : [["—", "No confirmations yet", "—", "—", "—"]])}`;
}

function updatePaymentBreakdown() {
  const select = document.querySelector("#paymentBooking");

  if (!select || !select.value) return;

  const option = select.options[select.selectedIndex];

  const total = Number(option.dataset.total || 0);
  const reservation = Number(option.dataset.reservation || 0);
  const paid = Number(option.dataset.paid || 0);
  const remaining = Number(option.dataset.remaining || 0);
  const reservationPaid = paid >= reservation;
  const amountInput = document.querySelector('input[name="amount"]');

  document.querySelector("#paymentTotal").textContent =
    formatPeso(total);

  document.querySelector("#paymentReservation").innerHTML =
    reservationPaid
      ? `${formatPeso(reservation)} <span class="status approved">Paid</span>`
      : `${formatPeso(reservation)} <span class="status pending">Required</span>`;

  document.querySelector("#paymentPaid").textContent =
    formatPeso(paid);

  document.querySelector("#paymentRemaining").textContent =
    formatPeso(remaining);

  if (amountInput) {
    if (reservationPaid) {
      amountInput.placeholder =
        `Remaining balance: ${formatPeso(remaining)}`;

      amountInput.max = remaining;
    } else {
      amountInput.placeholder =
        `Reservation fee: ${formatPeso(reservation)}`;

      amountInput.max = reservation;
    }
  }
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

    `${payment.submitter?.name || "Customer"}
      <br>
      <small>Booking #${payment.booking_id}</small>`,

    payment.method === "gcash"
      ? "GCash"
      : "Bank transfer",

    formatPeso(payment.amount),

    paymentStatus(payment.status),

    `
      <button
        type="button"
        class="secondary"
        onclick="viewEmployeePayment(${payment.id})">
        View Details
      </button>
    `
  ]);

  return table(
    "Payment confirmations",
    [
      "ID",
      "Customer / booking",
      "Method",
      "Amount",
      "Status",
      "Action"
    ],
    rows.length
      ? rows
      : [[
          "—",
          "No payments submitted",
          "—",
          "—",
          "—",
          "—"
        ]]
  );
}

async function viewEmployeePayment(paymentId) {
  try {
    const payments = await getPayments();

    const payment = payments.find(
      item => Number(item.id) === Number(paymentId)
    );

    if (!payment) {
      alert("Payment record not found.");
      return;
    }

    const customerName =
      payment.submitter?.name || "Customer";

    const vehicleName =
      payment.booking?.car
        ? `${capitalize(payment.booking.car.brand)} ${capitalize(payment.booking.car.model)}`
        : "Vehicle unavailable";

    const method =
      payment.method === "gcash"
        ? "GCash"
        : "Bank Transfer";

    workspaceTitle.textContent = "Payment Details";

    workspaceContent.innerHTML = `
      <section class="panel">

        <h3>Payment Information</h3>

        <div class="mini-list">

          <div>
            <span>Payment ID</span>
            <strong>#${payment.id}</strong>
          </div>

          <div>
            <span>Customer</span>
            <strong>${customerName}</strong>
          </div>

          <div>
            <span>Booking</span>
            <strong>BK-${payment.booking_id}</strong>
          </div>

          <div>
            <span>Vehicle</span>
            <strong>${vehicleName}</strong>
          </div>

          <div>
            <span>Payment Method</span>
            <strong>${method}</strong>
          </div>

          <div>
            <span>Amount</span>
            <strong>${formatPeso(payment.amount)}</strong>
          </div>

          <div>
            <span>Payer / Sender Name</span>
            <strong>${payment.payer_name || "—"}</strong>
          </div>

          <div>
            <span>Reference Number</span>
            <strong>${payment.reference_number || "—"}</strong>
          </div>

          <div>
            <span>Date & Time Paid</span>
            <strong>
              ${
                payment.paid_at
                  ? new Date(payment.paid_at).toLocaleString("en-PH")
                  : "—"
              }
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong>${paymentStatus(payment.status)}</strong>
          </div>

        </div>

      </section>

      <section class="panel">

        <h3>Payment Proof</h3>

        <div class="form-grid">

          <button
            type="button"
            class="primary"
            onclick="showPaymentProof(${payment.id})">
            View Payment Proof
          </button>

          <button
            type="button"
            class="secondary"
            onclick="renderPanel('payments')">
            Back to Payments
          </button>

        </div>

      </section>
    `;

  } catch (error) {
    alert(error.message);
  }
}

async function submitPayment(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const message = document.querySelector("#paymentMessage");

  if (!form.reportValidity()) return;

  const button = form.querySelector("button[type='submit']");

  if (message) {
    message.textContent = "";
  }

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

    await apiFetch("/payments", {
      method: "POST",
      body: paymentData
    });

    await getPayments(true);

    if (message) {
      message.textContent =
        "✅ Payment confirmation sent successfully. Please wait for admin verification.";
    }

    button.textContent = "Sent";

    setTimeout(() => {
      renderPanel("payments");
    }, 1500);

  } catch (error) {
    if (message) {
      message.textContent = "❌ " + error.message;
    }

    button.disabled = false;
    button.textContent = "Send confirmation to admin";
  }
}

async function reviewPayment(paymentId, status) {
  const reviewNote = status === "rejected" ? prompt("Why is this payment being rejected? This note will be shown to the customer.") : prompt("Optional approval note for the customer:") || "";
  if (status === "rejected" && !reviewNote?.trim()) return;
  try {
    await apiFetch(`/payments/${paymentId}/review`, { method: "PATCH", body: JSON.stringify({ status, review_note: reviewNote }) });
    await getPayments(true);
    await getBookings(true);
    alert(`Payment ${status}.`);
    renderPanel("payments");
  } catch (error) {
    alert(error.message);
  }
}

async function updateRentalStatus(bookingId, status) {
  try {
    const actionText = status === "ongoing"
      ? "start this rental"
      : "complete this rental";

    const confirmed = confirm(
      `Are you sure you want to ${actionText}?`
    );

    if (!confirmed) return;

    await apiFetch(`/bookings/${bookingId}/rental-status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: status
      })
    });

    await getBookings(true);
    await getCars(true);

    alert(
      status === "ongoing"
        ? "Rental started successfully."
        : "Rental completed successfully."
    );

    renderPanel("rentals");

  } catch (error) {
    alert(error.message);
  }
}

async function viewChatDetails(logId) {
  try {

    const logs = await apiFetch("/chat-logs");

    const log = logs.find(
      item => Number(item.id) === Number(logId)
    );

    if (!log) {
      alert("Chat log not found.");
      return;
    }

    const formattedResponse = (log.response || "No response")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^\*\s+/gm, "• ")
      .replace(/^-\s+/gm, "• ")
      .replace(/\n{2,}/g, "<br><br>")
      .replace(/\n/g, "<br>");

    workspaceTitle.textContent = "AI Chat Details";

    workspaceContent.innerHTML = `
      <section class="panel">

        <h3>Chat Information</h3>

        <div class="mini-list">

          <div>
            <span>Customer</span>
            <strong>
              ${log.user?.name || "Unknown customer"}
            </strong>
          </div>

          <div>
            <span>Source</span>
            <strong>${log.source || "—"}</strong>
          </div>

          <div>
            <span>Date & Time</span>
            <strong>
              ${new Date(log.created_at).toLocaleString("en-PH")}
            </strong>
          </div>

        </div>

      </section>

      <section class="panel">

        <h3>Customer Question</h3>

        <p>
          ${log.message || "No question available."}
        </p>

      </section>

      <section class="panel">

        <h3>AI Response</h3>

        <div>
          ${formattedResponse}
        </div>

      </section>

      <section class="panel">

        <button
          type="button"
          class="secondary"
          onclick="renderPanel(currentRole === 'admin' ? 'logs' : 'chat')">
          Back to AI Chat Logs
        </button>

      </section>
    `;

  } catch (error) {

    console.error("Failed to load chat details:", error);

    alert(
      error.message ||
      "Unable to load chat details."
    );
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

async function trackingPanel() {

  const cars = await getCars();

  const trackedCars = cars.filter(
    car => car.traccar_device_id
  );

  const vehicleOptions = trackedCars.map(car => `
    <option value="${car.id}">
      ${capitalize(car.brand)} ${capitalize(car.model)}
    </option>
  `).join("");

  return `
    <div class="tracking-layout">

      <section class="map-card">

        <div class="tracking-header">
          <h3>Interactive Map</h3>

          <label>
            Select Vehicle
            <select
              id="trackingVehicle"
              onchange="changeTrackedVehicle(this.value)"
            >
              ${vehicleOptions}
            </select>
          </label>
        </div>

        <div
          id="vehicleMap"
          class="map-visual">
        </div>

      </section>

      <aside class="panel">

        <h3>Vehicle Tracking</h3>

        <div class="summary-line">
          <span>Vehicle</span>
          <strong id="trackVehicle">-</strong>
        </div>

        <div class="summary-line">
          <span>Vehicle location</span>
          <strong id="trackLocation">Loading...</strong>
        </div>

        <div class="summary-line">
          <span>Current status</span>
          <strong id="trackStatus">-</strong>
        </div>

        <div class="summary-line">
          <span>Speed</span>
          <strong id="trackSpeed">-</strong>
        </div>

        <div class="summary-line">
          <span>Last updated</span>
          <strong id="trackUpdated">-</strong>
        </div>

      </aside>

    </div>
  `;
}

async function changeTrackedVehicle(vehicleId) {

  if (!vehicleId) return;

  const cars = await getCars();

  const car = cars.find(
    car => Number(car.id) === Number(vehicleId)
  );

  const trackVehicle =
    document.querySelector("#trackVehicle");

  if (trackVehicle && car) {
    trackVehicle.textContent =
      `${capitalize(car.brand)} ${capitalize(car.model)}`;
  }

  await initVehicleTracking(vehicleId);
}

let vehicleMapInstance = null;
let vehicleMarker = null;
let trackingInterval = null;
let animationFrame = null;

function animateMarkerTo(targetLatLng, durationMs) {
  if (!vehicleMarker) return;

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }

  const start = vehicleMarker.getLatLng();
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / durationMs, 1);

    const lat =
      start.lat + (targetLatLng[0] - start.lat) * t;

    const lng =
      start.lng + (targetLatLng[1] - start.lng) * t;

    vehicleMarker.setLatLng([lat, lng]);

    if (t < 1) {
      animationFrame = requestAnimationFrame(step);
    }
  }

  animationFrame = requestAnimationFrame(step);
}

async function initVehicleTracking(vehicleId = 2) {

  // Remove old map if tracking page was already opened before
  if (vehicleMapInstance) {
    vehicleMapInstance.remove();
    vehicleMapInstance = null;
  }

  vehicleMarker = null;

  if (trackingInterval) {
    clearInterval(trackingInterval);
  }

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }

  const POLL_INTERVAL_MS = 10000;

  // Create Leaflet map
  vehicleMapInstance = L.map("vehicleMap")
    .setView([14.5995, 120.9842], 14);

  // OpenStreetMap tiles
  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "© OpenStreetMap contributors",
    }
  ).addTo(vehicleMapInstance);


  async function poll() {
    try {

      const data = await apiFetch(
        `/vehicles/${vehicleId}/location`
      );

      const latlng = [
        Number(data.latitude),
        Number(data.longitude)
      ];

      // First location
      if (!vehicleMarker) {

        vehicleMarker = L.marker(latlng)
          .addTo(vehicleMapInstance);

        vehicleMapInstance.setView(latlng, 15);

      } else {

        // Smooth movement when new GPS location arrives
        animateMarkerTo(
          latlng,
          POLL_INTERVAL_MS * 0.9
        );

        vehicleMapInstance.panTo(latlng);
      }


      // Update tracking information
      document.querySelector("#trackLocation").textContent =
        `${Number(data.latitude).toFixed(5)}, ${Number(data.longitude).toFixed(5)}`;

      document.querySelector("#trackStatus").textContent =
        data.status ?? "Unknown";

      document.querySelector("#trackSpeed").textContent =
        `${data.speed ?? 0} kn`;

      document.querySelector("#trackUpdated").textContent =
        data.last_updated
          ? new Date(data.last_updated).toLocaleString()
          : "-";


    } catch (error) {

      console.error(
        "Failed to fetch vehicle location:",
        error
      );

      const locationElement =
        document.querySelector("#trackLocation");

      if (locationElement) {
        locationElement.textContent = "Unavailable";
      }
    }
  }


  // Fetch immediately
  await poll();

  // Then update every 10 seconds
  trackingInterval = setInterval(
    poll,
    POLL_INTERVAL_MS
  );
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

async function openNotificationDetails(notificationId) {

  try {

    const notifications =
      await apiFetch(`/notifications/${currentUser.id}`);

    const notification = notifications.find(
      item => Number(item.id) === Number(notificationId)
    );

    if (!notification) {
      alert("Notification not found.");
      return;
    }

    const booking = notification.booking;
    const payment = notification.payment;

    let relatedDetails = "";

    if (booking) {
      relatedDetails += `
        <div>
          <span>Booking ID</span>
          <strong>BK-${booking.id}</strong>
        </div>

        <div>
          <span>Vehicle</span>
          <strong>
            ${
              booking.car
                ? `${capitalize(booking.car.brand)} ${capitalize(booking.car.model)}`
                : "Vehicle unavailable"
            }
          </strong>
        </div>

        <div>
          <span>Pickup</span>
          <strong>
            ${new Date(booking.pickup_date).toLocaleString("en-PH")}
          </strong>
        </div>

        <div>
          <span>Return</span>
          <strong>
            ${new Date(booking.return_date).toLocaleString("en-PH")}
          </strong>
        </div>

        <div>
          <span>Total Price</span>
          <strong>${formatPeso(booking.total_price)}</strong>
        </div>

        <div>
          <span>Booking Status</span>
          <strong>${capitalize(booking.status)}</strong>
        </div>
      `;
    }

    if (payment) {
      relatedDetails += `
        <div>
          <span>Payment Amount</span>
          <strong>${formatPeso(payment.amount)}</strong>
        </div>

        <div>
          <span>Payment Method</span>
          <strong>${payment.method.toUpperCase()}</strong>
        </div>

        <div>
          <span>Reference Number</span>
          <strong>${payment.reference_number || "-"}</strong>
        </div>

        <div>
          <span>Payment Status</span>
          <strong>${capitalize(payment.status)}</strong>
        </div>
      `;
    }

    // Mark as read
    if (!notification.is_read) {

      await apiFetch(
        `/notifications/${notificationId}/read`,
        {
          method: "PUT"
        }
      );

      await getUnreadNotificationCount();
      updateNotificationBadge();
    }

    // Remove old modal if one already exists
    document.querySelector("#notificationDetailsModal")?.remove();

    // Create notification details popup
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div
        id="notificationDetailsModal"
        class="notification-modal-overlay"
        onclick="if(event.target === this) closeNotificationDetails()"
      >

        <div class="notification-modal">

          <div class="notification-modal-header">

            <div>
              <span class="notification-modal-icon">
                ${
                  notification.title.toLowerCase().includes("payment")
                    ? "💳"
                    : notification.title.toLowerCase().includes("booking")
                    ? "📅"
                    : "🔔"
                }
              </span>

              <h2>${notification.title}</h2>
            </div>

            <button
              type="button"
              class="notification-modal-close"
              onclick="closeNotificationDetails()"
            >
              ×
            </button>

          </div>

          <div class="notification-modal-body">

            <span class="status available">
              Notification Details
            </span>

            <p class="notification-modal-message">
              ${notification.message}
            </p>

            <div class="mini-list">

              ${relatedDetails}

              <div>
                <span>Notification Status</span>
                <strong>Read</strong>
              </div>

              <div>
                <span>Date & Time</span>
                <strong>
                  ${new Date(
                    notification.created_at
                  ).toLocaleString("en-PH")}
                </strong>
              </div>

            </div>

          </div>

          <div class="notification-modal-actions">

            <button
              type="button"
              class="primary"
              onclick="closeNotificationDetails()"
            >
              Close
            </button>

          </div>

        </div>

      </div>
      `
    );

  } catch (error) {

    console.error(
      "Failed to open notification:",
      error
    );

    alert("Unable to open notification details.");
  }
}

function closeNotificationDetails() {
  const modal =
    document.querySelector("#notificationDetailsModal");

  if (modal) {
    modal.remove();
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
          <div class="notification-item ${notification.is_read ? "read" : "unread"}"
          onclick="openNotificationDetails(${notification.id})">

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


async function reportsPanel() {

  const [payments, bookings, cars] = await Promise.all([
    getPayments(),
    getBookings(),
    getCars()
  ]);

  const chartsHTML = await charts(cars, payments);

  // =========================
  // PAYMENT SUMMARY
  // =========================

  const approvedPayments = payments.filter(
    payment => payment.status === "approved"
  );

  const gcashPayments = approvedPayments.filter(
    payment => payment.method === "gcash"
  );

  const gcashTotal = gcashPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const bankPayments = approvedPayments.filter(
    payment => payment.method === "bank_transfer"
  );

  const bankTotal = bankPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const paymentRows = [
    [
      "GCash",
      gcashPayments.length,
      formatPeso(gcashTotal)
    ],
    [
      "Bank Transfer",
      bankPayments.length,
      formatPeso(bankTotal)
    ]
  ];


  // =========================
  // BOOKING TRENDS
  // =========================

  const bookingGroups = {};

  bookings.forEach(booking => {

    const date = new Date(booking.pickup_date);

    if (Number.isNaN(date.getTime())) {
      return;
    }

    const key =
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!bookingGroups[key]) {
      bookingGroups[key] = {
        date: new Date(
          date.getFullYear(),
          date.getMonth(),
          1
        ),
        bookings: [],
        vehicleIds: new Set()
      };
    }

    bookingGroups[key].bookings.push(booking);

    if (booking.car_id) {
      bookingGroups[key].vehicleIds.add(
        Number(booking.car_id)
      );
    }
  });

  const totalVehicles = cars.length;

  const bookingRows = Object.values(bookingGroups)
    .sort((a, b) => a.date - b.date)
    .map(group => {

      const month = group.date.toLocaleDateString(
        "en-PH",
        {
          month: "long",
          year: "numeric"
        }
      );

      const bookingCount = group.bookings.length;

      const utilization =
        totalVehicles > 0
          ? Math.round(
              (group.vehicleIds.size / totalVehicles) * 100
            )
          : 0;

      return [
        month,
        bookingCount,
        `${utilization}%`
      ];
    });


  // =========================
  // REPORT OUTPUT
  // =========================

  return `
    ${chartsHTML}

    <div class="dashboard-grid">

      ${table(
        "Booking Trends",
        ["Month", "Bookings", "Utilization"],
        bookingRows.length
          ? bookingRows
          : [["—", "0", "0%"]]
      )}

      ${table(
        "Payment Summary",
        ["Method", "Transactions", "Amount"],
        paymentRows
      )}

    </div>
  `;
}


function profilePanel(role) {

  const name = currentUser?.name || "";
  const email = currentUser?.email || "";
  const phone = currentUser?.phone || "";
  const address = currentUser?.address || "";
  const licenseNumber = currentUser?.driver_license_number || "";

  const governmentIdSubmitted = Boolean(currentUser?.government_id_path);
  const driverLicenseSubmitted = Boolean(currentUser?.driver_license_path);
  const selfieIdSubmitted = Boolean(currentUser?.selfie_id_path);

  return `
    <section class="panel">

      <h3>${role} Profile</h3>

      <h4>Personal Information</h4>

      <div class="form-grid">

        <label>
          Name
          <input value="${name}" readonly>
        </label>

        <label>
          Email
          <input value="${email}" readonly>
        </label>

        <label>
          Mobile
          <input value="${phone}" readonly>
        </label>

        <label>
          Address
          <input
            value="${address}"
            placeholder="No address added yet"
            readonly
          >
        </label>

      </div>

      ${
        role === "Customer"
          ? `
            <hr>

            <h4>Verification Information</h4>

            <div class="form-grid">

              <label>
                Driver's License Number
                <input
                  value="${licenseNumber}"
                  placeholder="No driver's license number"
                  readonly
                >
              </label>

            </div>

            <h4>Required Documents</h4>

            <div class="form-grid">

              <div>
                <strong>Government ID</strong>
                <p>
                  ${
                    governmentIdSubmitted
                      ? "✅ Submitted"
                      : "❌ Not submitted"
                  }
                </p>
              </div>

              <div>
                <strong>Driver's License</strong>
                <p>
                  ${
                    driverLicenseSubmitted
                      ? "✅ Submitted"
                      : "❌ Not submitted"
                  }
                </p>
              </div>

              <div>
                <strong>Selfie Holding ID</strong>
                <p>
                  ${
                    selfieIdSubmitted
                      ? "✅ Submitted"
                      : "❌ Not submitted"
                  }
                </p>
              </div>

            </div>
          `
          : ""
      }

    </section>
  `;
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
chatForm.addEventListener("submit", async event => {

  event.preventDefault();

  const question = chatInput.value.trim();

  if (!question) return;

  addChat("user", question);

  chatInput.value = "";

  const lowerQuestion = question.toLowerCase();

  if (
    lowerQuestion.includes("requirement") ||
    lowerQuestion.includes("requirements") ||
    lowerQuestion.includes("ano ang kailangan?") ||
    lowerQuestion.includes("anong mga kailangan?") ||
    lowerQuestion.includes("document") ||
    lowerQuestion.includes("documents") ||
    lowerQuestion.includes("id kailangan") ||
    lowerQuestion.includes("kailangan dalhin")
  ) {

    const requirementsReply =
      "Here are the rental requirements. Please check the image for the complete list.";

    addChat("bot", requirementsReply);
    addChatImage("assets/requirements.jpg");

    try {
      await apiFetch("/chat/log", {
        method: "POST",
        body: JSON.stringify({
          message: question,
          response: requirementsReply
        })
      });
    } catch (error) {
      console.error("Failed to save requirements chat log:", error);
    }

    return;
  }

  addChat("bot", "Typing...");

  try {

    const response = await apiFetch("/chat", {
      method: "POST",
      body: JSON.stringify({
        message: question
      })
    });

    console.log("Gemini Response:", response);

    const botReply =
      response.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn't generate a response.";

    chatLog.lastElementChild.remove();

    addChat("bot", botReply);

  } catch (error) {

    chatLog.lastElementChild.remove();

    addChat("bot", "Sorry, something went wrong while contacting the AI.");

    console.error(error);

  }

});


function addChat(type, text) {
  const p = document.createElement("p");
  p.className = type;

  if (type === "bot") {
    let formattedText = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^\*\s+/gm, "• ")
      .replace(/^-\s+/gm, "• ")
      .replace(/\n{2,}/g, "<br><br>")
      .replace(/\n/g, "<br>");

    p.innerHTML = formattedText;
  } else {
    p.textContent = text;
  }

  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function addChatImage(imagePath) {
  const div = document.createElement("div");
  div.className = "bot";

  const img = document.createElement("img");
  img.src = imagePath;
  img.alt = "AAV Car Rental Requirements";

  img.style.maxWidth = "100%";
  img.style.borderRadius = "10px";
  img.style.marginTop = "8px";

  div.appendChild(img);
  chatLog.appendChild(div);

  chatLog.scrollTop = chatLog.scrollHeight;
}


function aiReply(text) {
  const q = text.toLowerCase().trim();

  // LOCATION / OFFICE
  if (
    q.includes("location") ||
    q.includes("office") ||
    q.includes("saan ang") ||
    q.includes("saan located") ||
    q.includes("where can i find") ||
    q.includes("where is")
  ) {
    return "AAV Car Rental Services is located at 46 Pag-asa St., Brgy. Katuparan, Taguig City. Vehicle pickup and return are handled at this location.";
  }

  // VEHICLE RETURN
  if (
    q.includes("ibabalik") ||
    q.includes("return car") ||
    q.includes("return vehicle") ||
    q.includes("saan ibabalik")
  ) {
    return "The rented vehicle should be returned to AAV Car Rental Services at 46 Pag-asa St., Brgy. Katuparan, Taguig City, unless another return arrangement has been approved by AAV staff.";
  }

  // PAYMENT
  if (
    q.includes("bayad") ||
    q.includes("magbabayad") ||
    q.includes("payment") ||
    q.includes("pay") ||
    q.includes("gcash") ||
    q.includes("bank")
  ) {
    return "You can pay through the QR codes shown in the Payments section. After sending your payment, upload the receipt or proof of payment and wait for admin verification.";
  }

  // BOOKING PROCESS
  if (
    q.includes("how to book") ||
    q.includes("how do i book") ||
    q.includes("how can i book") ||
    q.includes("booking process") ||
    q.includes("how to reserve") ||
    q.includes("paano mag book") ||
    q.includes("paano magbook") ||
    q.includes("paano mag rent") ||
    q.includes("paano mag reserve")
  ) {
    return "To book a vehicle: choose an available vehicle, enter your pickup and return details, select your trip destination, review the rental cost, and submit the booking. After that, go to Payments and send your payment confirmation.";
  }

  // REQUIREMENTS
  if (
    q.includes("requirement") ||
    q.includes("requirements") ||
    q.includes("document") ||
    q.includes("documents") ||
    q.includes("license") ||
    q.includes("id")
  ) {
    return "Customers must provide the required identification and rental documents, including a valid driver's license and other verification documents requested by AAV Car Rental Services.";
  }

  // VEHICLES / AVAILABILITY
  if (
    q.includes("available vehicle") ||
    q.includes("available vehicles") ||
    q.includes("available car") ||
    q.includes("available cars") ||
    q.includes("anong sasakyan") ||
    q.includes("anong available") ||
    q.includes("what cars are available") ||
    q.includes("what vehicles are available")
  ) {
    return "You can check the Browse Vehicles section for the current available vehicles, rates, transmission, fuel type, seating capacity, and availability status.";
  }

  // PRICING
  if (
    q.includes("price") ||
    q.includes("rate") ||
    q.includes("cost") ||
    q.includes("magkano")
  ) {
    return "Rental rates depend on the selected vehicle, trip destination, and rental duration. You can see the starting rate in Browse Vehicles, and the exact total is automatically calculated in the Booking Form.";
  }

  return null;
}

async function calculateTotal() {

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
    const message = document.querySelector("#availabilityMessage");

    if (message) {
      message.textContent =
        "❌ Return date and time must be after pickup date and time.";
      message.style.color = "crimson";
    }

    document.querySelector("#rentalDuration").value = "";
    document.querySelector("#totalCost").value = "";

    return;
  }

  const hours = difference / (1000 * 60 * 60);

  let durationValue;
  let durationType;


  // UNLI MILEAGE
  // Always uses the 24-hour rate
  if (destination === "unli") {

    const days = Math.ceil(hours / 24);

    durationValue = days;
    durationType = "24hrs";

    document.querySelector("#rentalDuration").value =
      days === 1
        ? "24 Hours - Unli Mileage"
        : `${days} Days - Unli Mileage`;
  }


  // REGULAR WITHIN / OUTSIDE MANILA
  else {

    if (hours <= 12) {

      durationValue = 0.5;
      durationType = "12hrs";

      document.querySelector("#rentalDuration").value = "12 Hours";
    }

    else if (hours <= 24) {

      durationValue = 1;
      durationType = "24hrs";

      document.querySelector("#rentalDuration").value = "24 Hours";
    }

    else {

      const days = Math.ceil(hours / 24);

      durationValue = days;
      durationType = "24hrs";

      document.querySelector("#rentalDuration").value = `${days} Days`;
    }
  }


  const rate = selectedCar.rates?.find(item =>
    item.location === destination &&
    item.duration === durationType
  );


  if (!rate) {

    document.querySelector("#totalCost").value = "Rate unavailable";
    document.querySelector("#summaryReservation").textContent = "—";
    document.querySelector("#summaryTotal").textContent = "Rate unavailable";

    return;
  }


  const total =
    Number(rate.price) *
    (durationType === "12hrs" ? 1 : durationValue);


  document.querySelector("#totalCost").value =
    "₱" + total.toLocaleString();


  document.querySelector("#summaryDuration").textContent =
    document.querySelector("#rentalDuration").value;

  const settings = await getSystemSettings();

  const reservationFeePerDay =
    Number(settings.reservation_fee || 500);

  const reservationFee =
    Math.ceil(durationValue) * reservationFeePerDay;

  document.querySelector("#summaryReservation").textContent =
    "₱" + reservationFee.toLocaleString();


  document.querySelector("#summaryTotal").textContent =
    "₱" + total.toLocaleString();


  checkAvailability();
}

async function checkAvailability() {

  console.log("✅ checkAvailability is running");

  if (!selectedCar) return;

  const pickupDate = document.querySelector("#pickupDate").value;
  const returnDate = document.querySelector("#returnDate").value;
  const pickupTime = document.querySelector("#pickupTime").value;
  const returnTime = document.querySelector("#returnTime").value;

  const submitBtn = document.querySelector("#submitBookingBtn");
  const message = document.querySelector("#availabilityMessage");

  if (!submitBtn || !message) return;

  // Huwag muna mag-check hangga't incomplete ang schedule
  if (!pickupDate || !returnDate || !pickupTime || !returnTime) {
    message.textContent = "";
    submitBtn.disabled = false;
    return;
  }

  const pickupDateTime = `${pickupDate} ${pickupTime}:00`;
  const returnDateTime = `${returnDate} ${returnTime}:00`;

  try {

    const result = await apiFetch("/bookings/check-availability", {
      method: "POST",
      body: JSON.stringify({
        car_id: selectedCar.id,
        pickup_date: pickupDateTime,
        return_date: returnDateTime
      })
    });

    if (!result.available) {

      message.textContent =
        "❌ This vehicle is already reserved for the selected date and time. Please choose another schedule.";

      message.style.color = "crimson";
      submitBtn.disabled = true;

    } else {

      message.textContent =
        "✅ This vehicle is available for the selected date and time.";

      message.style.color = "green";
      submitBtn.disabled = false;
    }

  } catch (error) {

    console.error(error);

    message.textContent =
      "❌ Unable to check vehicle availability right now.";

    message.style.color = "crimson";
    submitBtn.disabled = true;
  }
}

async function submitBooking() {

  const message = document.querySelector("#availabilityMessage");

  const pickupDate = document.querySelector("#pickupDate").value;
  const returnDate = document.querySelector("#returnDate").value;
  const pickupTime = document.querySelector("#pickupTime").value;
  const returnTime = document.querySelector("#returnTime").value;
  const destination = document.querySelector("#tripDestination").value;

  // Clear previous message
  if (message) {
    message.textContent = "";
  }

  if (!selectedCar) {
    if (message) {
      message.textContent = "❌ Please select a vehicle first.";
      message.style.color = "crimson";
    }
    return;
  }

  if (!pickupDate) {
    message.textContent = "❌ Please select a pickup date.";
    message.style.color = "crimson";
    return;
  }

  if (!pickupTime) {
    message.textContent = "❌ Please select a pickup time.";
    message.style.color = "crimson";
    return;
  }

  if (!returnDate) {
    message.textContent = "❌ Please select a return date.";
    message.style.color = "crimson";
    return;
  }

  if (!returnTime) {
    message.textContent = "❌ Please select a return time.";
    message.style.color = "crimson";
    return;
  }

  if (!destination) {
    message.textContent = "❌ Please select a trip destination.";
    message.style.color = "crimson";
    return;
  }

  const pickup = new Date(`${pickupDate}T${pickupTime}`);
  const returned = new Date(`${returnDate}T${returnTime}`);

  const difference = returned - pickup;

  if (difference <= 0) {
    if (message) {
      message.textContent =
        "❌ Return date and time must be after pickup date and time.";
      message.style.color = "crimson";
    }
    return;
  }

  const hours = difference / (1000 * 60 * 60);

  let duration;

  if (destination === "unli") {
    duration = "24hrs";
  } else if (hours <= 12) {
    duration = "12hrs";
  } else {
    duration = "24hrs";
  }

  const bookingData = {
    car_id: selectedCar.id,
    pickup_date: `${pickupDate} ${pickupTime}:00`,
    return_date: `${returnDate} ${returnTime}:00`,
    location: destination,
    duration: duration
  };

  console.log(bookingData);

  const submitBtn = document.querySelector("#submitBookingBtn");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  }

  try {

    await apiFetch("/bookings", {
      method: "POST",
      body: JSON.stringify(bookingData)
    });

    await getMyBookings(true);
    await getBookings(true);

    if (message) {
      message.textContent =
        "✅ Booking submitted successfully. Redirecting to payment...";
      message.style.color = "green";
    }

    if (submitBtn) {
      submitBtn.textContent = "Submitted";
    }

    setTimeout(() => {
      renderPanel("payments");
    }, 1500);

  } catch (error) {

    console.error(error);

    if (message) {
      message.textContent = "❌ " + error.message;
      message.style.color = "crimson";
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Booking";
    }
  }
}

/* ===========================================================
   Landing page interactions (header scroll state, mobile nav,
   scroll-reveal animation, active-section highlighting, and
   back-to-top button). Added when merging in the new marketing
   landing page design. Does not touch auth/booking/portal logic.
=========================================================== */
(function () {
  const siteHeader = document.querySelector("#siteHeader");
  const menuToggle = document.querySelector("#menuToggle");
  const navPanel = document.querySelector("#navPanel");
  const backToTop = document.querySelector("#backToTop");
  const landingRoot = document.querySelector("#landing");

  function closeMenu() {
    if (!menuToggle || !navPanel) return;
    menuToggle.classList.remove("active");
    navPanel.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    siteHeader?.classList.remove("menu-active");
  }

  if (menuToggle && navPanel) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navPanel.classList.toggle("open");
      menuToggle.classList.toggle("active", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("menu-open", isOpen);
      siteHeader?.classList.toggle("menu-active", isOpen);
    });
  }

  // Header scroll shadow/background, plus back-to-top visibility
  function onScroll() {
    if (siteHeader) siteHeader.classList.toggle("scrolled", window.scrollY > 12);
    if (backToTop) backToTop.classList.toggle("visible", window.scrollY > 480);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Any in-page anchor link (header nav, footer nav) that points to a
  // section living inside #landing: switch to the landing view first
  // (in case the user is on login/register/portal), then smooth-scroll.
  document.querySelectorAll("a[href^='#']").forEach(link => {
    const targetId = link.getAttribute("href").slice(1);
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target || !landingRoot || !landingRoot.contains(target)) return;

    link.addEventListener("click", event => {
      event.preventDefault();
      setView("landing");
      closeMenu();
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  // Scroll-reveal animation for elements marked with class="reveal"
  const revealTargets = document.querySelectorAll(".reveal");
  if (revealTargets.length && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    revealTargets.forEach(el => revealObserver.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add("visible"));
  }

  // Highlight the current section's nav link while scrolling the landing page
  const navLinks = document.querySelectorAll(".nav-panel a[href^='#']");
  const sections = Array.from(navLinks)
    .map(link => document.getElementById(link.getAttribute("href").slice(1)))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const link = document.querySelector(`.nav-panel a[href="#${id}"]`);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    sections.forEach(section => sectionObserver.observe(section));
  }
})();

