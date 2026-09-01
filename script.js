const views = document.querySelectorAll(".view");
const sideNav = document.querySelector("#sideNav");
const workspaceContent = document.querySelector("#workspaceContent");
const portalMenuToggle = document.querySelector("#portalMenuToggle");
const workspaceTitle = document.querySelector("#workspaceTitle");
const workspaceKicker = document.querySelector("#workspaceKicker");
const roleLabel = document.querySelector("#roleLabel");
const API_URL = "https://aav-car-rental-backend.onrender.com/api";

let currentUser = JSON.parse(localStorage.getItem("aavUser") || "null");
let authToken = localStorage.getItem("aavToken");

portalMenuToggle?.addEventListener("click", () => {
  const isOpen = sideNav.classList.toggle("mobile-open");

  portalMenuToggle.textContent =
    isOpen ? "✕" : "☰";

  portalMenuToggle.setAttribute(
    "aria-expanded",
    String(isOpen)
  );
});

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!(options.body instanceof FormData) && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.message || "Something went wrong. Please try again."
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

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

function showToast(message, type = "success") {
  let container = document.querySelector("#toastContainer");

  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `app-toast ${type}`;
  toast.setAttribute(
    "role",
    type === "error" ? "alert" : "status"
  );

  const icon =
    type === "success" ? "✓" :
    type === "error" ? "!" :
    type === "warning" ? "!" : "i";

  const title =
    type === "success" ? "Success" :
    type === "error" ? "Something went wrong" :
    type === "warning" ? "Please check" :
    "Notice";

  toast.innerHTML = `
    <div class="toast-icon"></div>

    <div class="toast-content">
      <strong class="toast-title"></strong>
      <span class="toast-message"></span>
    </div>

    <button
      type="button"
      class="toast-close"
      aria-label="Close notification">
      ×
    </button>
  `;

  toast.querySelector(".toast-icon").textContent = icon;
  toast.querySelector(".toast-title").textContent = title;
  toast.querySelector(".toast-message").textContent =
    String(message || "");

  container.appendChild(toast);

  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 3500);
}

function showConfirmModal({
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger"
} = {}) {
  return new Promise(resolve => {
    const previousActiveElement = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "confirmModalTitle");
    modal.setAttribute("aria-describedby", "confirmModalMessage");

    const icon = type === "danger" ? "!" : "?";

    modal.innerHTML = `
      <div class="confirm-icon ${type}">
        ${icon}
      </div>

      <div class="confirm-content">
        <h3 id="confirmModalTitle"></h3>
        <p id="confirmModalMessage"></p>
      </div>

      <div class="confirm-actions">
        <button
          type="button"
          class="secondary confirm-cancel">
        </button>

        <button
          type="button"
          class="primary confirm-submit">
        </button>
      </div>
    `;

    modal.querySelector("#confirmModalTitle").textContent = title;
    modal.querySelector("#confirmModalMessage").textContent = message;

    const cancelButton = modal.querySelector(".confirm-cancel");
    const confirmButton = modal.querySelector(".confirm-submit");

    cancelButton.textContent = cancelText;
    confirmButton.textContent = confirmText;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let closed = false;

    const close = result => {
      if (closed) return;
      closed = true;

      document.removeEventListener("keydown", handleKeydown);

      overlay.classList.remove("show");

      setTimeout(() => {
        overlay.remove();

        if (
          previousActiveElement &&
          typeof previousActiveElement.focus === "function"
        ) {
          previousActiveElement.focus();
        }

        resolve(result);
      }, 200);
    };

    const handleKeydown = event => {
      if (event.key === "Escape") {
        close(false);
        return;
      }

      if (event.key === "Tab") {
        const focusable = [cancelButton, confirmButton];
        const currentIndex = focusable.indexOf(document.activeElement);

        if (event.shiftKey) {
          if (currentIndex <= 0) {
            event.preventDefault();
            confirmButton.focus();
          }
        } else {
          if (currentIndex === focusable.length - 1) {
            event.preventDefault();
            cancelButton.focus();
          }
        }
      }
    };

    cancelButton.addEventListener("click", () => close(false));
    confirmButton.addEventListener("click", () => close(true));

    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        close(false);
      }
    });

    document.addEventListener("keydown", handleKeydown);

    requestAnimationFrame(() => {
      overlay.classList.add("show");
      cancelButton.focus();
    });
  });
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

async function editCustomerBooking(bookingId) {
  try {
    const bookings = await getMyBookings();

    const booking = bookings.find(
      item => Number(item.id) === Number(bookingId)
    );

    if (!booking) {
      console.error("Booking not found.");
      return;
    }

    editingBookingId = booking.id;
    selectedCar = booking.car || null;

    await renderPanel("bookings");

    const pickup = new Date(booking.pickup_date);
    const returned = new Date(booking.return_date);

    const pickupDate =
      pickup.toISOString().slice(0, 10);

    const pickupTime =
      pickup.toTimeString().slice(0, 5);

    const returnDate =
      returned.toISOString().slice(0, 10);

    const returnTime =
      returned.toTimeString().slice(0, 5);

    document.querySelector("#bookingVehicle").value =
      booking.car_id || "";

    document.querySelector("#pickupDate").value =
      pickupDate;

    document.querySelector("#pickupTime").value =
      pickupTime;

    document.querySelector("#returnDate").value =
      returnDate;

    document.querySelector("#returnTime").value =
      returnTime;

    if (booking.location) {
      document.querySelector("#tripDestination").value =
        booking.location;
    }

    calculateTotal();

  } catch (error) {
    console.error("Edit booking error:", error);

    showToast(
      error.message || "Unable to load this booking for editing.",
      "error"
    );
  }
}

async function cancelCustomerBooking(bookingId) {
  const confirmed = await showConfirmModal({
    title: "Cancel Booking",
    message: `Are you sure you want to cancel Booking BK-${bookingId}? This action cannot be undone.`,
    confirmText: "Cancel Booking",
    cancelText: "Keep Booking",
    type: "danger"
  });

  if (!confirmed) return;

  try {
    const response = await apiFetch(
      `/bookings/${bookingId}/cancel`,
      {
        method: "PATCH"
      }
    );

    // Clear cached booking/payment data
    myBookingsCache = null;
    myBookingsCacheTime = 0;

    bookingsCache = null;
    bookingsCacheTime = 0;

    paymentsCache = null;
    paymentsCacheTime = 0;

    // Reload My Bookings
    await renderPanel("my-bookings");

    showToast(
      response.message || "Booking cancelled successfully.",
      "success"
    );

  } catch (error) {
    console.error("Cancel booking error:", error);

    showToast(
      error.message || "Unable to cancel this booking.",
      "error"
    );
  }
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

function getVehicleImage(car) {
  const model = (car.model || "").toLowerCase();

  if (model === "vios") {
    return "assets/toyota-vios.jpg";
  }

  if (model === "veloz") {
    return "assets/toyota-veloz.jpg";
  }

  if (car.image?.startsWith("/storage/")) {
    return `https://aav-car-rental-backend.onrender.com${car.image}`;
  }

  return car.image || "";
}

function bookingStatusBadge(status) {
  const normalizedStatus =
    (status || "pending").toLowerCase();

  const classes = {
    pending: "reserved",
    confirmed: "available",
    ongoing: "reserved",
    completed: "available",
    cancelled: "trip"
  };

  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    ongoing: "Ongoing",
    completed: "Completed",
    cancelled: "Cancelled"
  };

  return `
    <span class="status ${classes[normalizedStatus] || "reserved"}">
      ${labels[normalizedStatus] || capitalize(normalizedStatus)}
    </span>
  `;
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
    showToast(
      error.message || "Unable to load customer requirements.",
      "error"
    );
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
    showToast(
      error.message || "Unable to open customer document.",
      "error"
    );
  }
}

async function reviewCustomerVerification(customerId, status) {
  try {
    const isVerify = status === "verified";

    const confirmed = await showConfirmModal({
      title: isVerify ? "Verify Customer" : "Reject Customer",
      message: isVerify
        ? "Are you sure you want to verify this customer?"
        : "Are you sure you want to reject this customer's verification?",
      confirmText: isVerify ? "Verify Customer" : "Reject Customer",
      cancelText: "Cancel",
      type: isVerify ? "warning" : "danger"
    });

    if (!confirmed) return;

    await apiFetch(`/customers/${customerId}/verification`, {
      method: "PATCH",
      body: JSON.stringify({
        status: status
      })
    });

    await renderPanel("customers");

    showToast(
      isVerify
        ? "Customer verified successfully."
        : "Customer verification rejected.",
      isVerify ? "success" : "warning"
    );

  } catch (error) {
    console.error("Customer verification error:", error);

    showToast(
      error.message || "Unable to update customer verification.",
      "error"
    );
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
    ["maintenance", "Maintenance", "i-file"],
    ["payments", "Payments", "i-card"],
    ["chat", "AI Chat Monitor", "i-chat"],
    ["reports", "Reports", "i-chart"],
    ["profile", "Profile", "i-user"],
    ["logout", "Logout", "i-log-out"]
  ],
  admin: [
    ["dashboard", "Dashboard", "i-home"], 
    ["employees", "Employees", "i-user"],
    ["customers", "Customers", "i-user"], 
    ["vehicle-management", "Vehicle Management", "i-car"],
    ["maintenance", "Maintenance", "i-file"],
    ["reservations", "Reservations", "i-file"], 
    ["payments", "Payments", "i-card"],
    ["tracking", "Vehicle Tracking", "i-map"], 
    ["reports", "Reports", "i-chart"],
    ["logs", "AI Assistant Logs", "i-chat"], 
    ["settings", "Settings", "i-file"],
    ["profile", "Profile", "i-user"], 
    ["logout", "Logout", "i-log-out"]
  ]
};


let currentRole = currentUser?.role || "customer";
let selectedCar = null;
let editingBookingId = null;
let editingCarId = null;
let bookingCars = [];
let unreadNotifications = 0;
let resetEmail = null;
let otpResendTimer = null;
let otpResendSeconds = 60;

function startOtpResendCountdown(seconds = 60) {
  const resendBtn = document.querySelector("#resendOtpBtn");

  if (!resendBtn) return;

  if (otpResendTimer) {
    clearInterval(otpResendTimer);
  }

  otpResendSeconds = seconds;

  resendBtn.disabled = true;
  resendBtn.textContent = `Resend in ${otpResendSeconds}s`;

  otpResendTimer = setInterval(() => {
    otpResendSeconds--;

    if (otpResendSeconds <= 0) {
      clearInterval(otpResendTimer);
      otpResendTimer = null;

      resendBtn.disabled = false;
      resendBtn.textContent = "Send Again";
      return;
    }

    resendBtn.textContent = `Resend in ${otpResendSeconds}s`;
  }, 1000);
}

const resendOtpBtn = document.querySelector("#resendOtpBtn");

resendOtpBtn?.addEventListener("click", async () => {
  if (!resetEmail || resendOtpBtn.disabled) return;

  resendOtpBtn.disabled = true;
  resendOtpBtn.textContent = "Sending...";

  try {
    await apiFetch("/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify({
        email: resetEmail
      })
    });

    // Reset OTP input
    const otpInput = document.querySelector("#otpCode");

    if (otpInput) {
      otpInput.value = "";
    }

    // Unlock Verify OTP button
    const verifyButton = document.querySelector(
      "#verifyOtpForm button[type='submit']"
    );

    if (verifyButton) {
      verifyButton.disabled = false;
      verifyButton.textContent = "Verify OTP";
    }

    // Remove previous OTP error/lock message
    const otpMessage = document.querySelector("#otpMessage");

    if (otpMessage) {
      otpMessage.textContent = "";
      otpMessage.style.display = "none";
    }

    // Restart resend cooldown
    startOtpResendCountdown(60);

  } catch (error) {
    console.error("Resend OTP error:", error);

    resendOtpBtn.disabled = false;
    resendOtpBtn.textContent = "Send Again";
  }
});

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
  const icons = {
    "i-home": `
      <path d="M3 11.5 12 4l9 7.5"></path>
      <path d="M5 10.5V20h14v-9.5"></path>
      <path d="M9 20v-6h6v6"></path>
    `,

    "i-car": `
      <path d="M5 17h14"></path>
      <path d="M6 17v2"></path>
      <path d="M18 17v2"></path>
      <path d="M4 13l2-5h12l2 5"></path>
      <path d="M4 13h16v4H4z"></path>
      <circle cx="7" cy="15" r="1"></circle>
      <circle cx="17" cy="15" r="1"></circle>
    `,

    "i-file": `
      <path d="M6 3h9l3 3v15H6z"></path>
      <path d="M14 3v4h4"></path>
      <path d="M9 12h6"></path>
      <path d="M9 16h6"></path>
    `,

    "i-card": `
      <rect x="3" y="5" width="18" height="14" rx="2"></rect>
      <path d="M3 10h18"></path>
      <path d="M7 15h4"></path>
    `,

    "i-chat": `
      <path d="M4 5h16v11H9l-5 4z"></path>
      <path d="M8 10h.01"></path>
      <path d="M12 10h.01"></path>
      <path d="M16 10h.01"></path>
    `,

    "i-bell": `
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
      <path d="M10 21h4"></path>
    `,

    "i-user": `
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"></path>
    `,

    "i-log-out": `
      <path d="M10 17l5-5-5-5"></path>
      <path d="M15 12H3"></path>
      <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"></path>
    `,

    "i-chart": `
      <path d="M4 20V10"></path>
      <path d="M10 20V4"></path>
      <path d="M16 20v-7"></path>
      <path d="M22 20H2"></path>
    `,

    "i-map": `
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"></path>
      <path d="M9 3v15"></path>
      <path d="M15 6v15"></path>
    `
  };

  return `
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round">
      ${icons[id] || icons["i-file"]}
    </svg>
  `;
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

    if (panel === "bookings" && currentRole === "customer") {
      editingBookingId = null;
    }

  // Reset Edit Vehicle mode when the admin manually opens
  // Vehicle Management from the sidebar
    if (panel === "vehicle-management") {
      editingCarId = null;
    }

    if (window.innerWidth <= 720) {
      sideNav.classList.remove("mobile-open");

      if (portalMenuToggle) {
        portalMenuToggle.textContent = "☰";
        portalMenuToggle.setAttribute(
          "aria-expanded",
          "false"
        );
      }
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

      // Restrict login based on selected portal
      if (
        selectedLoginType === "customer" &&
        data.user.role !== "customer"
      ) {
        showToast(
          "This account is for Staff Login. Please use the Staff Login option.",
          "warning"
        );
        return;
      }

      if (
        selectedLoginType === "staff" &&
        !["admin", "employee"].includes(data.user.role)
      ) {
        showToast(
          "This account is for Customer Login. Please use the Customer Login option.",
          "warning"
        );
        return;
      }

      currentUser = data.user;
      authToken = data.token;

      localStorage.setItem("aavUser", JSON.stringify(currentUser));
      localStorage.setItem("aavToken", authToken);

      await openPortal(data.user.role);

      showToast(
        `Welcome back, ${data.user.name}!`,
        "success"
      );

    } else {
      showToast(
        data.message || "Invalid email or password.",
        "error"
      );
    }

  } catch (error) {
    console.error(error);

    showToast(
      "Cannot connect to the server. Please try again.",
      "error"
    );
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
    showToast(
      "Passwords do not match. Please check both password fields.",
      "warning"
    );
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

    showToast(
      "Account created successfully. You can now log in.",
      "success"
    );

    form.reset();

    setView("login");

  } catch (error) {

    console.error("Registration error:", error);

    showToast(
      error.message || "Unable to create your account. Please try again.",
      "error"
    );
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

    setView("verify-otp");

    setTimeout(() => {
      startOtpResendCountdown(60);
    }, 0);

  } catch (error) {

    console.error("Forgot password error:", error);

    if (error.status === 429 && error.data?.retry_after) {
      resetEmail = email;

      setView("verify-otp");

      setTimeout(() => {
        startOtpResendCountdown(error.data.retry_after);
      }, 0);
    }

  }
});

document.querySelector("#verifyOtpForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const form = event.currentTarget;
  const otpInput = document.querySelector("#otpCode");
  const otp = otpInput.value.trim();
  const verifyButton = form.querySelector('button[type="submit"]');

  // Create inline message area once
  let messageBox = document.querySelector("#otpMessage");

  if (!messageBox) {
    messageBox = document.createElement("div");
    messageBox.id = "otpMessage";

    messageBox.style.marginTop = "12px";
    messageBox.style.padding = "10px 12px";
    messageBox.style.borderRadius = "8px";
    messageBox.style.fontSize = "14px";
    messageBox.style.display = "none";

    verifyButton.insertAdjacentElement("afterend", messageBox);
  }

  function showOtpMessage(message, type = "error") {
    messageBox.textContent = message;
    messageBox.style.display = "block";

    if (type === "success") {
      messageBox.style.background = "#ecfdf3";
      messageBox.style.color = "#166534";
      messageBox.style.border = "1px solid #bbf7d0";
    } else {
      messageBox.style.background = "#fef2f2";
      messageBox.style.color = "#991b1b";
      messageBox.style.border = "1px solid #fecaca";
    }
  }

  if (!resetEmail) {
    showOtpMessage(
      "Your password reset session has expired. Please request a new OTP."
    );

    setTimeout(() => {
      setView("forgot-password");
    }, 1500);

    return;
  }

  if (!/^\d{6}$/.test(otp)) {
    showOtpMessage("Please enter a valid 6-digit OTP.");
    otpInput.focus();
    return;
  }

  verifyButton.disabled = true;
  verifyButton.textContent = "Verifying...";

  try {
    const response = await apiFetch("/forgot-password/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        email: resetEmail,
        otp: otp
      })
    });

    console.log("Verify OTP Response:", response);

    showOtpMessage(
      response.message || "OTP verified successfully.",
      "success"
    );

    verifyButton.textContent = "Verified";

    setTimeout(() => {
      setView("reset-password");
    }, 800);

  } catch (error) {
    console.error("Verify OTP error:", error);

    showOtpMessage(
      error.message || "Unable to verify OTP. Please try again."
    );

    // If maximum attempts reached, lock verification
    if (error.status === 429) {
      verifyButton.disabled = true;
      verifyButton.textContent = "Request New OTP";
    } else {
      verifyButton.disabled = false;
      verifyButton.textContent = "Verify OTP";
    }
  }
});

document.querySelector("#resetPasswordForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const password = document.querySelector("#newPassword").value;
  const confirmPassword = document.querySelector("#confirmNewPassword").value;

  if (!resetEmail) {
    showToast(
      "Password reset session expired. Please request a new OTP.",
      "warning"
    );

    setView("forgot-password");
    return;
  }

  if (password !== confirmPassword) {
    showToast(
      "Passwords do not match. Please check both password fields.",
      "warning"
    );
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

    resetEmail = null;

    document.querySelector("#resetPasswordForm").reset();
    document.querySelector("#verifyOtpForm").reset();
    document.querySelector("#forgotPasswordForm").reset();

    setView("login");

    showToast(
      response.message || "Password updated successfully! You can now log in.",
      "success"
    );

  } catch (error) {
    console.error("Reset password error:", error);

    showToast(
      error.message || "Unable to reset your password. Please try again.",
      "error"
    );
  }
});

async function openPortal(role) {
  currentRole = role;

  const chatFab = document.querySelector("#chatFab");
  const chatWindow = document.querySelector("#chatWindow");

  if (chatFab) {
    chatFab.style.display = role === "customer" ? "" : "none";
  }

  if (chatWindow && role !== "customer") {
    chatWindow.classList.remove("open");
  }

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

  if (panel === "bookings" && currentRole === "customer") {
    setTimeout(() => {
      loadBookingRentalPolicy();
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
      showToast(
        "Vehicle updated successfully.",
        "success"
      );
    } else {
      showToast(
        "Vehicle added successfully.",
        "success"
      );
    }

    editingCarId = null;

    form.reset();

    await getCars(true);

    await renderPanel("vehicle-management");

  } catch (error) {

    console.error("Error saving vehicle:", error);

    showToast(
      error.message || "Failed to save vehicle.",
      "error"
    );
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
        getVehicleImage(car),
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

        const image = getVehicleImage(car);

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

    const image = getVehicleImage(car);

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
          getVehicleImage(car),
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
  const confirmed = await showConfirmModal({
    title: "Delete Vehicle",
    message: `Are you sure you want to delete ${carName}? This action cannot be undone.`,
    confirmText: "Delete Vehicle",
    cancelText: "Keep Vehicle",
    type: "danger"
  });

  if (!confirmed) return;

  try {
    await apiFetch(`/cars/${carId}`, {
      method: "DELETE"
    });

    await getCars(true);

    await renderPanel("vehicle-management");

    showToast(
      `${carName} deleted successfully.`,
      "success"
    );

  } catch (error) {
    console.error("Error deleting vehicle:", error);

    showToast(
      error.message || "Failed to delete vehicle.",
      "error"
    );
  }
}

async function editVehicle(carId) {

  const cars = await getCars();

  const car = cars.find(car =>
    Number(car.id) === Number(carId)
  );

  if (!car) {
    showToast(
      "Vehicle not found.",
      "error"
    );
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

    const date = new Date(
      payment.paid_at || payment.created_at
    );

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

        <h3>Current Vehicle Status</h3>

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
                #f4510b ${availablePercent}%,
                #ddd ${availablePercent}% 100%
              );
          "
        >
          <span class="donut-value">${Math.round(availablePercent)}%</span>
        </div>

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

  const approvedPayments = payments.filter(
    payment => payment.status === "approved"
  );

  const monthlyRevenue = {};

  approvedPayments.forEach(payment => {
    const date = new Date(payment.created_at);

    const key = date.toLocaleDateString("en-PH", {
      month: "short",
      year: "numeric"
    });

    monthlyRevenue[key] =
      (monthlyRevenue[key] || 0) + Number(payment.amount || 0);
  });

  const revenueEntries = Object.entries(monthlyRevenue);

  const maxRevenue = Math.max(
    ...revenueEntries.map(([, amount]) => amount),
    1
  );

  return `
    <div class="dashboard-grid">

      <section class="chart-card">
        <h3>Monthly Revenue Chart</h3>

        ${
          revenueEntries.length
            ? `
              <div class="dashboard-chart-wrapper">

                <div class="dashboard-revenue-y-axis">
                  <span>${formatPeso(maxRevenue)}</span>
                  <span>${formatPeso(maxRevenue * 0.75)}</span>
                  <span>${formatPeso(maxRevenue * 0.50)}</span>
                  <span>${formatPeso(maxRevenue * 0.25)}</span>
                  <span>₱0</span>
                </div>

                <div class="dashboard-chart-area">

                  <div class="dashboard-chart-grid">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <div class="dashboard-revenue-bars">
                    ${revenueEntries.map(([month, amount]) => `
                      <div class="dashboard-revenue-item">

                        <div class="dashboard-revenue-value">
                          ${formatPeso(amount)}
                        </div>

                        <div class="dashboard-revenue-track">
                          <div
                            class="dashboard-revenue-fill"
                            style="height: ${(amount / maxRevenue) * 100}%;">
                          </div>
                        </div>

                        <div class="dashboard-revenue-month">
                          ${month}
                        </div>

                      </div>
                    `).join("")}
                  </div>

                </div>

              </div>
            `
            : `
              <p class="form-help">
                No approved revenue data yet.
              </p>
            `
        }
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

        <div
          class="dashboard-availability-donut"
          style="
            background: conic-gradient(
              var(--orange) 0% ${availablePercent}%,
              #e5e7eb ${availablePercent}% 100%
            );
          "
        >
          <div class="dashboard-availability-center">
            <strong>${availablePercent.toFixed(0)}%</strong>
            <span>Available</span>
          </div>
        </div>

        <div class="dashboard-availability-summary">
          Available: ${availablePercent.toFixed(0)}% ·
          Unavailable: ${(100 - availablePercent).toFixed(0)}%
        </div>

      </section>

    </div>
  `;
}

function maintenanceStatusBadge(status) {
  const normalizedStatus = status || "setup_required";

  const labels = {
    setup_required: "Setup Required",
    inspection_required: "Inspection Required",
    schedule_review_required: "Schedule Review Required",
    under_maintenance: "Under Maintenance",
    good: "Good",
    due_soon: "Due Soon",
    due: "Due",
    overdue: "Overdue"
  };

  return `
    <span class="maintenance-status ${normalizedStatus}">
      ${labels[normalizedStatus] || "Unknown"}
    </span>
  `;
}

async function maintenancePanel() {
  try {
    const vehicles = await apiFetch("/maintenance/vehicles");

    return `
      <section class="panel">
        <h3>Vehicle Maintenance</h3>

        <p class="form-help">
          Monitor vehicle mileage and scheduled maintenance.
        </p>

        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Current Mileage</th>
                <th>Next Service</th>
                <th>Remaining KM</th>
                <th>Due Date</th>
                <th>Availability</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              ${vehicles.map(vehicle => {
                const maintenance = vehicle.maintenance || {};
                const initialized = vehicle.maintenance_initialized;

                return `
                  <tr>
                    <td>
                      ${capitalize(vehicle.brand)}
                      ${capitalize(vehicle.model)}
                    </td>

                    <td>
                      ${initialized
                        ? `${Number(vehicle.current_mileage).toLocaleString("en-PH")} km`
                        : "Not set"}
                    </td>

                    <td>
                      ${maintenance.next_service || "—"}
                    </td>

                    <td>
                      ${maintenance.remaining_km !== null &&
                        maintenance.remaining_km !== undefined
                        ? `${Number(maintenance.remaining_km).toLocaleString("en-PH")} km`
                        : "—"}
                    </td>

                    <td>
                      ${
                        maintenance.next_inspection_date
                          ? new Date(
                              `${maintenance.next_inspection_date}T00:00:00`
                            ).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })
                          : initialized
                            ? "Inspection date unknown"
                            : "—"
                      }
                    </td>

                    <td>
                      ${
                        vehicle.available
                          ? `<span class="maintenance-status good">Available</span>`
                          : `<span class="maintenance-status under_maintenance">Unavailable</span>`
                      }
                    </td>

                    <td>
                      ${maintenanceStatusBadge(
                        !initialized
                          ? "setup_required"
                          : vehicle.has_ongoing_maintenance
                            ? "under_maintenance"
                            : maintenance.status
                      )}

                      ${
                        vehicle.has_ongoing_maintenance &&
                        vehicle.ongoing_maintenance_service
                          ? `
                            <div class="maintenance-service-label">
                              ${vehicle.ongoing_maintenance_service}
                            </div>
                          `
                          : ""
                      }
                    </td>

                    <td>
                      ${
                        initialized
                          ? `
                          <div class="maintenance-actions">
                           ${
                              !vehicle.has_ongoing_maintenance
                                ? `
                                  <button
                                    type="button"
                                    class="secondary"
                                    onclick="openMileageUpdate(
                                      ${vehicle.id},
                                      ${Number(vehicle.current_mileage)}
                                    )">
                                    Update Mileage
                                  </button>
                                `
                                : ""
                            }

                            ${
                              !vehicle.has_ongoing_maintenance
                                ? `
                                  <button
                                    type="button"
                                    class="primary"
                                    onclick="openStartMaintenance(${vehicle.id})">
                                    Start Maintenance
                                  </button>
                                `
                                : `
                                  <button
                                    type="button"
                                    class="primary"
                                    onclick="openCompleteMaintenance(
                                      ${vehicle.ongoing_maintenance_id}
                                    )">
                                    Complete Maintenance
                                  </button>
                                `
                            }

                            <button
                              type="button"
                              class="secondary"
                              onclick="openMaintenanceHistory(${vehicle.id})">
                              View History
                            </button>
                          </div>
                          `
                          : `
                            ${
                              currentRole === "admin"
                                ? `
                                  <button
                                    type="button"
                                    class="primary"
                                    onclick="openMaintenanceSetup(${vehicle.id})">
                                    Setup Maintenance
                                  </button>
                                `
                                : `
                                  <span class="maintenance-service-label">
                                    Admin setup required
                                  </span>
                                `
                            }
                          `
                      }
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;

  } catch (error) {
    console.error("Maintenance panel error:", error);

    return `
      <section class="panel">
        <h3>Vehicle Maintenance</h3>
        <p class="form-help">
          Unable to load maintenance information.
        </p>
      </section>
    `;
  }
}

function openMaintenanceSetup(vehicleId) {
  const existingModal = document.querySelector("#maintenanceSetupModal");
  existingModal?.remove();

  const modal = document.createElement("div");
  modal.id = "maintenanceSetupModal";
  modal.className = "modal-backdrop";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <h3>Setup Vehicle Maintenance</h3>
          <p class="form-help">
            Enter the vehicle's actual odometer reading to begin maintenance tracking.
          </p>
        </div>
      </div>

      <form
        id="maintenanceSetupForm"
        onsubmit="submitMaintenanceSetup(event, ${vehicleId})">

        <div class="form-grid">

          <label>
            Current Odometer (km)
            <input
              type="number"
              name="current_mileage"
              min="0"
              step="1"
              required
              placeholder="Enter actual mileage">
          </label>

          <label>
            Last Inspection Date
            <input
              type="date"
              name="last_inspection_date">
            <small class="form-help">
              Optional if the last inspection date is unknown.
            </small>
          </label>

        </div>

        <div
          id="maintenanceSetupMessage"
          class="form-help"
          style="display:none; margin-top:16px;">
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="secondary"
            onclick="closeMaintenanceSetup()">
            Cancel
          </button>

          <button
            type="submit"
            class="primary">
            Initialize Maintenance
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeMaintenanceSetup() {
  document.querySelector("#maintenanceSetupModal")?.remove();
}

async function submitMaintenanceSetup(event, vehicleId) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const messageBox = document.querySelector("#maintenanceSetupMessage");

  const currentMileage = form.current_mileage.value.trim();
  const lastInspectionDate = form.last_inspection_date.value;

  if (messageBox) {
    messageBox.style.display = "none";
    messageBox.textContent = "";
  }

  if (currentMileage === "") {
    if (messageBox) {
      messageBox.textContent = "Please enter the current odometer reading.";
      messageBox.style.display = "block";
    }

    form.current_mileage.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Initializing...";

  try {
    await apiFetch(`/maintenance/vehicles/${vehicleId}/initialize`, {
      method: "POST",
      body: JSON.stringify({
        current_mileage: Number(currentMileage),
        last_inspection_date: lastInspectionDate || null
      })
    });

    closeMaintenanceSetup();

    await renderPanel("maintenance");

  } catch (error) {
    console.error("Maintenance setup error:", error);

    if (messageBox) {
      messageBox.textContent =
        error.message || "Unable to initialize maintenance tracking.";

      messageBox.style.display = "block";
    }

    submitButton.disabled = false;
    submitButton.textContent = "Initialize Maintenance";
  }
}

function openMileageUpdate(vehicleId, currentMileage) {
  const existingModal = document.querySelector("#mileageUpdateModal");
  existingModal?.remove();

  const modal = document.createElement("div");
  modal.id = "mileageUpdateModal";
  modal.className = "modal-backdrop";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3>Update Vehicle Mileage</h3>
        <p class="form-help">
          Current recorded mileage:
          <strong>${Number(currentMileage).toLocaleString("en-PH")} km</strong>
        </p>
      </div>

      <form
        id="mileageUpdateForm"
        onsubmit="submitMileageUpdate(event, ${vehicleId}, ${currentMileage})">

        <div class="form-grid">
          <label>
            New Odometer Reading (km)
            <input
              type="number"
              name="current_mileage"
              min="${currentMileage}"
              step="1"
              required
              placeholder="Enter new mileage">
          </label>
        </div>

        <div
          id="mileageUpdateMessage"
          class="form-help"
          style="display:none; margin-top:16px;">
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="secondary"
            onclick="closeMileageUpdate()">
            Cancel
          </button>

          <button
            type="submit"
            class="primary">
            Update Mileage
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeMileageUpdate() {
  document.querySelector("#mileageUpdateModal")?.remove();
}

async function submitMileageUpdate(event, vehicleId, previousMileage) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const messageBox = document.querySelector("#mileageUpdateMessage");

  const newMileage = Number(form.current_mileage.value);

  if (messageBox) {
    messageBox.style.display = "none";
    messageBox.textContent = "";
  }

  // Frontend protection against decreasing odometer
  if (newMileage < Number(previousMileage)) {
    if (messageBox) {
      messageBox.textContent =
        `Mileage cannot be lower than the current ${Number(previousMileage).toLocaleString("en-PH")} km.`;
      messageBox.style.display = "block";
    }

    form.current_mileage.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Updating...";

  try {
    await apiFetch(`/maintenance/vehicles/${vehicleId}/mileage`, {
      method: "PATCH",
      body: JSON.stringify({
        current_mileage: newMileage
      })
    });

    closeMileageUpdate();

    await renderPanel("maintenance");

  } catch (error) {
    console.error("Mileage update error:", error);

    if (messageBox) {
      messageBox.textContent =
        error.message || "Unable to update vehicle mileage.";

      messageBox.style.display = "block";
    }

    submitButton.disabled = false;
    submitButton.textContent = "Update Mileage";
  }
}

async function openStartMaintenance(vehicleId) {
  const existingModal = document.querySelector("#startMaintenanceModal");
  existingModal?.remove();

  const modal = document.createElement("div");
  modal.id = "startMaintenanceModal";
  modal.className = "modal-backdrop";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3>Start Vehicle Maintenance</h3>
        <p class="form-help">
          Select the maintenance service to be performed.
        </p>
      </div>

      <form
        id="startMaintenanceForm"
        onsubmit="submitStartMaintenance(event, ${vehicleId})">

        <div class="form-grid">

          <label>
            Maintenance Schedule
            <select
              name="maintenance_schedule_id"
              id="maintenanceScheduleSelect">
              <option value="">Loading schedules...</option>
            </select>
          </label>

          <label>
            Service Type
            <input
              type="text"
              name="service_type"
              maxlength="255"
              required
              placeholder="e.g. Preventive Maintenance">
          </label>

          <label>
            Notes
            <textarea
              name="notes"
              rows="4"
              placeholder="Optional maintenance notes"></textarea>
          </label>

        </div>

        <div
          id="startMaintenanceMessage"
          class="form-help"
          style="display:none; margin-top:16px;">
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="secondary"
            onclick="closeStartMaintenance()">
            Cancel
          </button>

          <button
            type="submit"
            class="primary">
            Start Maintenance
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  try {
    const schedules = await apiFetch("/maintenance/schedules");

    const scheduleSelect = document.querySelector(
      "#maintenanceScheduleSelect"
    );

    if (scheduleSelect) {
      scheduleSelect.innerHTML = `
        <option value="">Unscheduled / General Maintenance</option>

        ${schedules.map(schedule => `
          <option value="${schedule.id}">
            ${schedule.service_name}
          </option>
        `).join("")}
      `;
    }

  } catch (error) {
    console.error("Maintenance schedules error:", error);

    const scheduleSelect = document.querySelector(
      "#maintenanceScheduleSelect"
    );

    const messageBox = document.querySelector(
      "#startMaintenanceMessage"
    );

    if (scheduleSelect) {
      scheduleSelect.innerHTML = `
        <option value="">Unable to load schedules</option>
      `;
      scheduleSelect.disabled = true;
    }

    if (messageBox) {
      messageBox.textContent =
        "Unable to load maintenance schedules.";

      messageBox.style.display = "block";
    }
  }
}

function closeStartMaintenance() {
  document.querySelector("#startMaintenanceModal")?.remove();
}

async function submitStartMaintenance(event, vehicleId) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const messageBox = document.querySelector("#startMaintenanceMessage");

  const scheduleId = form.maintenance_schedule_id.value;
  const serviceType = form.service_type.value.trim();
  const notes = form.notes.value.trim();

  if (messageBox) {
    messageBox.style.display = "none";
    messageBox.textContent = "";
  }

  if (!serviceType) {
    if (messageBox) {
      messageBox.textContent = "Please enter the service type.";
      messageBox.style.display = "block";
    }

    form.service_type.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Starting...";

  try {
    await apiFetch(`/maintenance/vehicles/${vehicleId}/start`, {
      method: "POST",
      body: JSON.stringify({
        maintenance_schedule_id: scheduleId
          ? Number(scheduleId)
          : null,
        service_type: serviceType,
        notes: notes || null
      })
    });

    closeStartMaintenance();

    await renderPanel("maintenance");

  } catch (error) {
    console.error("Start maintenance error:", error);

    if (messageBox) {
      messageBox.textContent =
        error.message || "Unable to start vehicle maintenance.";

      messageBox.style.display = "block";
    }

    submitButton.disabled = false;
    submitButton.textContent = "Start Maintenance";
  }
}

function openCompleteMaintenance(maintenanceId) {
  const existingModal = document.querySelector("#completeMaintenanceModal");
  existingModal?.remove();

  const modal = document.createElement("div");
  modal.id = "completeMaintenanceModal";
  modal.className = "modal-backdrop";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3>Complete Vehicle Maintenance</h3>
        <p class="form-help">
          Record the maintenance work completed and any findings.
        </p>
      </div>

      <form
        id="completeMaintenanceForm"
        onsubmit="submitCompleteMaintenance(event, ${maintenanceId})">

        <div class="form-grid">

          <label>
            Services Performed
            <textarea
              name="services_performed"
              rows="4"
              required
              placeholder="Describe the maintenance services completed"></textarea>
          </label>

          <label>
            Findings
            <textarea
              name="findings"
              rows="4"
              placeholder="Optional issues or observations found during inspection"></textarea>
          </label>

          <label>
            Notes
            <textarea
              name="notes"
              rows="3"
              placeholder="Optional additional notes"></textarea>
          </label>

        </div>

        <div
          id="completeMaintenanceMessage"
          class="form-help"
          style="display:none; margin-top:16px;">
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="secondary"
            onclick="closeCompleteMaintenance()">
            Cancel
          </button>

          <button
            type="submit"
            class="primary">
            Complete Maintenance
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeCompleteMaintenance() {
  document.querySelector("#completeMaintenanceModal")?.remove();
}

async function submitCompleteMaintenance(event, maintenanceId) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const messageBox = document.querySelector(
    "#completeMaintenanceMessage"
  );

  const servicesPerformed =
    form.services_performed.value.trim();

  const findings =
    form.findings.value.trim();

  const notes =
    form.notes.value.trim();

  if (messageBox) {
    messageBox.style.display = "none";
    messageBox.textContent = "";
  }

  if (!servicesPerformed) {
    if (messageBox) {
      messageBox.textContent =
        "Please enter the services performed.";
      messageBox.style.display = "block";
    }

    form.services_performed.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Completing...";

  try {
    await apiFetch(`/maintenance/${maintenanceId}/complete`, {
      method: "PATCH",
      body: JSON.stringify({
        services_performed: servicesPerformed,
        findings: findings || null,
        notes: notes || null
      })
    });

    closeCompleteMaintenance();

    await renderPanel("maintenance");

  } catch (error) {
    console.error("Complete maintenance error:", error);

    if (messageBox) {
      messageBox.textContent =
        error.message ||
        "Unable to complete vehicle maintenance.";

      messageBox.style.display = "block";
    }

    submitButton.disabled = false;
    submitButton.textContent = "Complete Maintenance";
  }
}

async function openMaintenanceHistory(vehicleId) {
  const existingModal = document.querySelector("#maintenanceHistoryModal");
  existingModal?.remove();

  const modal = document.createElement("div");
  modal.id = "maintenanceHistoryModal";
  modal.className = "modal-backdrop";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3>Maintenance History</h3>
        <p class="form-help">
          Loading maintenance records...
        </p>
      </div>

      <div id="maintenanceHistoryContent">
        <p class="form-help">Please wait...</p>
      </div>

      <div class="modal-actions">
        <button
          type="button"
          class="secondary"
          onclick="closeMaintenanceHistory()">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  try {
    const records = await apiFetch("/maintenance");

    const vehicleRecords = records.filter(record =>
      Number(record.car_id) === Number(vehicleId)
    );

    const content = document.querySelector(
      "#maintenanceHistoryContent"
    );

    if (!content) return;

    if (!vehicleRecords.length) {
      content.innerHTML = `
        <p class="form-help">
          No maintenance history found for this vehicle.
        </p>
      `;

      return;
    }

    content.innerHTML = `
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Mileage</th>
              <th>Services Performed</th>
              <th>Findings</th>
              <th>Status</th>
              <th>Performed By</th>
            </tr>
          </thead>

          <tbody>
            ${vehicleRecords.map(record => `
              <tr>
                <td>
                  ${
                    record.completed_date ||
                    record.scheduled_date ||
                    "—"
                  }
                </td>

                <td>
                  ${record.service_type || "—"}
                </td>

                <td>
                  ${Number(record.mileage || 0).toLocaleString("en-PH")} km
                </td>

                <td>
                  ${record.services_performed || "—"}
                </td>

                <td>
                  ${record.findings || "—"}
                </td>

                <td>
                  ${capitalize(record.status || "—")}
                </td>

                <td>
                  ${record.performer?.name || "—"}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

  } catch (error) {
    console.error("Maintenance history error:", error);

    const content = document.querySelector(
      "#maintenanceHistoryContent"
    );

    if (content) {
      content.innerHTML = `
        <p class="form-help">
          Unable to load maintenance history.
        </p>
      `;
    }
  }
}

function closeMaintenanceHistory() {
  document.querySelector("#maintenanceHistoryModal")?.remove();
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
          
          const bookingStatus =
            (booking.status || "").toLowerCase();

          let paymentState;

          if (bookingStatus === "cancelled") {
            paymentState =
              `<span class="status trip">Cancelled</span>`;
          }
          else if (remainingBalance <= 0) {
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
         
          const actions =
            bookingStatus === "pending" && bookingPayments.length === 0
              ? `
                  <div class="booking-actions">
                    <button
                      type="button"
                      class="secondary small"
                      onclick="editCustomerBooking(${booking.id})">
                      Edit
                    </button>

                    <button
                      type="button"
                      class="secondary small"
                      onclick="cancelCustomerBooking(${booking.id})">
                      Cancel
                    </button>
                  </div>
                `
              : "—";

          return [
            "BK-" + booking.id,

            booking.car
              ? capitalize(booking.car.brand) + " " + capitalize(booking.car.model)
              : "Vehicle unavailable",

            new Date(booking.pickup_date).toLocaleString("en-PH"),

            new Date(booking.return_date).toLocaleString("en-PH"),

            formatPeso(booking.total_price),

            paymentState,

            actions
            ];
        });

        return table(
          "My Bookings",
          [
            "Booking ID",
            "Vehicle",
            "Pickup",
            "Return",
            "Total",
            "Payment Status",
            "Actions"
          ],
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
        ${
          !isVerified
            ? "Verification Required"
            : editingBookingId
            ? "Update Booking"
            : "Submit Booking"
        }
      </button>

      <p id="availabilityMessage" class="booking-status-message wide"></p>

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
      booking.status?.toLowerCase() === "ongoing"
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

      bookingStatusBadge(booking.status)
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
    maintenance: () => maintenancePanel(),
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
        booking.status?.toLowerCase() === "ongoing"
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
    maintenance: () => maintenancePanel(),

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

        if ((booking.status || "").toLowerCase() === "cancelled") {
          paymentState = "—";
        }
        else if (totalPrice <= 0) {

          paymentState =
            `<span class="status reserved">No Valid Total</span>`;

        } 
        else if (remainingBalance <= 0) {

          paymentState =
            `<span class="status available">Fully Paid</span>`;
        } 
        else if (hasPendingPayment) {

          paymentState =
            `<span class="status reserved">For Verification</span>`;

        } 
        else if (approvedPaid >= reservationFee) {

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

    showToast(
      response.message || "Settings updated successfully.",
      "success"
    );

    await renderPanel("settings");

  } catch (error) {

    console.error("Failed to update settings:", error);

    showToast(
      error.message || "Failed to update settings.",
      "error"
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

    <div class="rental-policy-box">
      <strong>Rental Policy</strong>
      <p id="bookingRentalPolicy">Loading policy...</p>
    </div>

  </aside>`;
}

async function loadBookingRentalPolicy() {
  try {
    const settings = await getSystemSettings();

    const policyElement =
      document.querySelector("#bookingRentalPolicy");

    if (!policyElement) return;

    policyElement.textContent =
      settings.rental_policy ||
      "Please contact AAV Car Rental Services for the current rental policy.";

  } catch (error) {
    console.error("Failed to load rental policy:", error);
  }
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

  const paymentMethods = (settings.payment_methods || "")
    .split(",")
    .map(method => method.trim())
    .filter(Boolean);

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
    payment.method === "cash"
      ? "Cash"
      : payment.method === "gcash"
        ? "GCash"
        : "Bank Transfer",
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
            src="./assets/gcash-qr.png"
            alt="GCash QR Code"
            class="payment-qr"
          >

          <span>Scan the QR code to pay via GCash.</span>

          <a
            href="./assets/gcash-qr.png"
            download="AAV-GCash-QR.png"
            class="qr-download-btn"
          >
            Save QR
          </a>
        </div>

        <div class="payment-qr-card">
          <strong>Bank Transfer</strong>

          <img
            src="./assets/eastwest-qr.png"
            alt="EastWest Bank QR Code"
            class="payment-qr"
          >

          <span>Scan the QR code to pay via bank transfer.</span>

          <a
            href="./assets/eastwest-qr.png"
            download="AAV-Bank-Transfer-QR.png"
            class="qr-download-btn"
          >
            Save QR
          </a>
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
        <label>
          Payment method
          <select name="method" required>
            ${paymentMethods.map(method => {
              const value = method
                .toLowerCase()
                .replace(/\s+/g, "_");

              return `<option value="${value}">${method}</option>`;
            }).join("")}
          </select>
        </label>

        <label>
          Amount sent (₱)
          <input
            name="amount"
            id="paymentAmount"
            type="number"
            min="1"
            step="0.01"
            placeholder="Enter amount"
            required
          >
        </label>

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
  const bookingSelect = document.querySelector("#paymentBooking");

  if (!bookingSelect) return;

  const selectedOption =
    bookingSelect.options[bookingSelect.selectedIndex];

  if (!selectedOption || !selectedOption.value) return;

  const total = Number(selectedOption.dataset.total || 0);
  const reservation = Number(selectedOption.dataset.reservation || 0);
  const paid = Number(selectedOption.dataset.paid || 0);
  const remaining = Number(selectedOption.dataset.remaining || 0);

  const totalElement = document.querySelector("#paymentTotal");
  const reservationElement = document.querySelector("#paymentReservation");
  const paidElement = document.querySelector("#paymentPaid");
  const remainingElement = document.querySelector("#paymentRemaining");
  const amountInput = document.querySelector("#paymentAmount");

  if (totalElement) {
    totalElement.textContent = formatPeso(total);
  }

  if (reservationElement) {
    reservationElement.textContent = formatPeso(reservation);
  }

  if (paidElement) {
    paidElement.textContent = formatPeso(paid);
  }

  if (remainingElement) {
    remainingElement.textContent = formatPeso(remaining);
  }

  if (amountInput) {
    const amountToPay = Math.min(reservation, remaining);

    amountInput.value = amountToPay;
    amountInput.max = remaining;
  }
}

async function openCashPaymentBookings() {
  try {
    const [bookings, payments] = await Promise.all([
      getBookings(true),
      getPayments(true)
    ]);

    const eligibleBookings = bookings
      .map(booking => {
        const approvedPaid = payments
          .filter(payment =>
            Number(payment.booking_id) === Number(booking.id) &&
            payment.status === "approved"
          )
          .reduce(
            (total, payment) =>
              total + Number(payment.amount || 0),
            0
          );

        const totalPrice = Number(booking.total_price || 0);

        const remainingBalance = Math.max(
          0,
          totalPrice - approvedPaid
        );

        return {
          booking,
          approvedPaid,
          totalPrice,
          remainingBalance
        };
      })
      .filter(item =>
        item.booking.status === "confirmed" &&
        item.approvedPaid > 0 &&
        item.remainingBalance > 0
      );

    workspaceTitle.textContent = "Record Cash Payment";

    if (!eligibleBookings.length) {
      workspaceContent.innerHTML = `
        <section class="panel">
          <h3>Record Cash Payment</h3>

          <p class="form-help">
            No confirmed bookings currently have a remaining balance.
          </p>

          <button
            class="secondary"
            type="button"
            onclick="renderPanel('payments')"
          >
            Back to Payments
          </button>
        </section>
      `;

      return;
    }

    const rows = eligibleBookings.map(item => {
      const booking = item.booking;

      const customerName =
        booking.user?.name || "Customer";

      const vehicleName = booking.car
        ? `${capitalize(booking.car.brand)} ${capitalize(booking.car.model)}`
        : "Vehicle unavailable";

      const safeCustomerName =
        customerName.replace(/'/g, "\\'");

      return [
        `BK-${booking.id}`,

        customerName,

        vehicleName,

        formatPeso(item.totalPrice),

        formatPeso(item.approvedPaid),

        `<strong>${formatPeso(item.remainingBalance)}</strong>`,

        `
          <button
            class="primary small"
            type="button"
            onclick="recordCashPayment(
              ${booking.id},
              ${item.remainingBalance},
              '${safeCustomerName}'
            )"
          >
            Record Cash
          </button>
        `
      ];
    });

    workspaceContent.innerHTML = `
      <section class="panel">

        <div style="margin-bottom: 20px;">
          <h3>Bookings with Remaining Balance</h3>

          <p class="form-help">
            Select a booking after receiving the customer's remaining balance in cash.
          </p>
        </div>

        ${table(
          "Cash Payment Records",
          [
            "Booking",
            "Customer",
            "Vehicle",
            "Total Cost",
            "Paid",
            "Remaining",
            "Action"
          ],
          rows
        )}

        <div style="margin-top: 20px;">
          <button
            class="secondary"
            type="button"
            onclick="renderPanel('payments')"
          >
            Back to Payments
          </button>
        </div>

      </section>
    `;

  } catch (error) {
    console.error("Failed to load cash payment bookings:", error);
    showToast(
      error.message || "Failed to load cash payment bookings.",
      "error"
    );
  }
}

function recordCashPayment(bookingId, remainingBalance, customerName) {
  const modal = document.querySelector("#cashPaymentModal");

  document.querySelector("#cashPaymentBookingId").value = bookingId;
  document.querySelector("#cashPaymentRemaining").value = remainingBalance;

  document.querySelector("#cashBookingId").textContent =
    `BK-${bookingId}`;

  document.querySelector("#cashCustomerName").textContent =
    customerName;

  document.querySelector("#cashRemainingBalance").textContent =
    formatPeso(remainingBalance);

  const amountInput =
    document.querySelector("#cashPaymentAmount");

  amountInput.value = remainingBalance;
  amountInput.max = remainingBalance;

  modal.classList.add("open");
}

function closeCashPaymentModal() {
  const modal = document.querySelector("#cashPaymentModal");

  modal.classList.remove("open");

  document.querySelector("#cashPaymentForm")?.reset();
}

document.querySelector("#cashPaymentForm")?.addEventListener("submit", async function (event) {
  event.preventDefault();

  const bookingId =
    Number(document.querySelector("#cashPaymentBookingId").value);

  const remainingBalance =
    Number(document.querySelector("#cashPaymentRemaining").value);

  const amount =
    Number(document.querySelector("#cashPaymentAmount").value);

  const customerName =
    document.querySelector("#cashCustomerName").textContent.trim();

  if (!amount || amount <= 0) {
    showToast(
      "Please enter a valid cash amount.",
      "warning"
    );
    return;
  }

  if (amount > remainingBalance) {
    showToast(
      `Cash payment cannot exceed the remaining balance of ${formatPeso(remainingBalance)}.`,
      "warning"
    );
    return;
  }

  try {
    const response = await apiFetch("/payments/cash", {
      method: "POST",
      body: JSON.stringify({
        booking_id: bookingId,
        amount: amount,
        payer_name: customerName
      })
    });

    closeCashPaymentModal();

    const successMessage = document.createElement("div");

    successMessage.className = "cash-success-message";
    successMessage.textContent =
      "✓ " + (response.message || "Cash payment recorded successfully.");

    document.body.appendChild(successMessage);

    setTimeout(() => {
      successMessage.remove();
    }, 3000);

    paymentsCache = null;
    paymentsCacheTime = 0;

    await openCashPaymentBookings();

  } catch (error) {
    console.error("Cash payment failed:", error);

    showToast(
      error.message || "Failed to record cash payment.",
      "error"
    );
  }
});

function adminPaymentPanel(payments) {
  const cashPaymentSection = `
    <section class="panel">
      <h3>Record Cash Payment</h3>
      <p class="form-help">
        Record the remaining balance paid by the customer in cash.
      </p>

      <button
        class="primary"
        type="button"
        onclick="openCashPaymentBookings()">
        Record Cash Payment
      </button>
    </section>
  `;
  const pending = payments.filter(payment => payment.status === "pending");
  const rows = pending.map(payment => [
    `#${payment.id}`,
    `${payment.submitter?.name || "Customer"}<br><small>Booking #${payment.booking_id} · ${payment.booking?.car?.brand || ""} ${payment.booking?.car?.model || ""}</small>`,
    `${payment.method === "gcash" ? "GCash" : "Bank transfer"}<br><small>${payment.reference_number}</small>`,
    `${formatPeso(payment.amount)}<br><small>${payment.payer_name} · ${new Date(payment.paid_at).toLocaleString("en-PH")}</small>`,
    `<button class="secondary small" type="button" onclick="showPaymentProof(${payment.id})">View proof</button> <button class="primary small" type="button" onclick="reviewPayment(${payment.id}, 'approved')">Approve</button> <button class="link-button" type="button" onclick="reviewPayment(${payment.id}, 'rejected')">Reject</button>`,
  ]);
  const history = payments
    .filter(payment => payment.status !== "pending")
    .map(payment => [
      `#${payment.id}`,
      `BK-${payment.booking_id}`,

      payment.submitter?.name || "Customer",

      payment.method === "cash"
        ? "Cash"
        : payment.method === "gcash"
          ? "GCash"
          : "Bank Transfer",

      formatPeso(payment.amount),

      paymentStatus(payment.status),

      payment.review_note || "—",
    ]);
return `
  ${cashPaymentSection}

  ${metrics([
    ["Awaiting review", String(pending.length)],
    ["Approved", String(payments.filter(p => p.status === "approved").length)],
    ["Rejected", String(payments.filter(p => p.status === "rejected").length)]
  ])}

  ${table(
    "Payment confirmations awaiting review",
    ["ID", "Customer / booking", "Method / reference", "Amount / sender", "Review"],
    rows.length
      ? rows
      : [["—", "No payments awaiting review", "—", "—", "—"]]
  )}

  ${table(
    "Reviewed payment history",
    ["Payment ID", "Booking ID", "Customer", "Method", "Amount", "Status", "Admin note"],
    history.length
      ? history
      : [["—", "No reviewed payments", "—", "—", "—", "—"]]
  )}
`;
}

function employeePaymentPanel(payments) {

  const rows = payments.map(payment => [

    `#${payment.id}`,

    `${payment.submitter?.name || "Customer"}
      <br>
      <small>Booking #${payment.booking_id}</small>`,

    payment.method === "gcash"
      ? "GCash"
      : payment.method === "bank_transfer"
      ? "Bank transfer"
      : payment.method === "cash"
      ? "Cash"
      : capitalize(payment.method || "Unknown"),

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
      showToast(
        "Payment record not found.",
        "error"
      );
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
        : payment.method === "bank_transfer"
        ? "Bank Transfer"
        : payment.method === "cash"
        ? "Cash"
        : capitalize(payment.method || "Unknown");

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

          ${
            payment.method === "cash"
              ? `
                <div class="form-help">
                  No payment proof required for cash payment.
                </div>
              `
              : `
                <button
                  type="button"
                  class="primary"
                  onclick="showPaymentProof(${payment.id})">
                  View Payment Proof
                </button>
              `
          }

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
    showToast(
      error.message || "Unable to process the payment.",
      "error"
    );
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
  const reviewNote =
    status === "approved"
      ? "Payment verified and approved."
      : "Payment rejected.";

  try {
    await apiFetch(`/payments/${paymentId}/review`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        review_note: reviewNote
      })
    });

    await getPayments(true);
    await getBookings(true);

    showToast(
      status === "approved"
        ? "Payment approved successfully."
        : "Payment rejected successfully.",
      status === "approved" ? "success" : "warning"
    );

    renderPanel("payments");

  } catch (error) {
    console.error("Payment review error:", error);

    showToast(
      error.message || "Unable to update payment status. Please try again.",
      "error"
    );
  }
}

async function updateRentalStatus(bookingId, status) {
  try {
    const confirmed = await showConfirmModal({
      title: status === "ongoing"
        ? "Start Rental"
        : "Complete Rental",
      message: status === "ongoing"
        ? "Are you sure you want to start this rental?"
        : "Are you sure you want to complete this rental?",
      confirmText: status === "ongoing"
        ? "Start Rental"
        : "Complete Rental",
      cancelText: "Cancel",
      type: "warning"
    });

    if (!confirmed) return;

    await apiFetch(`/bookings/${bookingId}/rental-status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: status
      })
    });

    await getBookings(true);
    await getCars(true);

    showToast(
      status === "ongoing"
        ? "Rental started successfully."
        : "Rental completed successfully.",
      "success"
    );

    renderPanel("rentals");

  } catch (error) {
    console.error("Rental status update error:", error);

    showToast(
      error.message || "Unable to update the rental status. Please try again.",
      "error"
    );
  }
}

async function viewChatDetails(logId) {
  try {

    const logs = await apiFetch("/chat-logs");

    const log = logs.find(
      item => Number(item.id) === Number(logId)
    );

    if (!log) {
      showToast(
        "Chat log not found.",
        "error"
      );
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

    showToast(
      error.message || "Unable to load chat details.",
      "error"
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
    showToast(
      error.message || "Unable to load the payment proof.",
      "error"
    );
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

      <section class="tracking-map-card">

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
      showToast(
        "Notification not found.",
        "error"
      );
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

    showToast(
      "Unable to open notification details.",
      "error"
    );
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

  const cashPayments = approvedPayments.filter(
    payment => payment.method === "cash"
  );

  const cashTotal = cashPayments.reduce(
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
    ],
    [
      "Cash",
      cashPayments.length,
      formatPeso(cashTotal)
    ]
  ];


  // =========================
  // BOOKING TRENDS
  // =========================

  const bookingGroups = {};

  bookings.forEach(booking => {

    if (!["confirmed", "ongoing", "completed"].includes(
      (booking.status || "").toLowerCase()
    )) {
      return;
    }

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
        ["Month", "Bookings", "Fleet Used"],
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

            <div class="profile-documents">

              <div>
                <strong>Government ID</strong>
                <p>
                  ${
                    governmentIdSubmitted
                      ? `<span class="document-status submitted">✓ Submitted</span>`
                      : `<span class="document-status missing">Not Submitted</span>`
                  }
                </p>
              </div>

              <div>
                <strong>Driver's License</strong>
                <p>
                  ${
                    driverLicenseSubmitted
                      ? `<span class="document-status submitted">✓ Submitted</span>`
                      : `<span class="document-status missing">Not Submitted</span>`
                  }
                </p>
              </div>

              <div>
                <strong>Selfie Holding ID</strong>
                <p>
                  ${
                    selfieIdSubmitted
                      ? `<span class="document-status submitted">✓ Submitted</span>`
                      : `<span class="document-status missing">Not Submitted</span>`
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

function useChatSuggestion(question) {
  chatInput.value = question;
  chatForm.requestSubmit();
}


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
        "This vehicle is already reserved for the selected date and time. Please choose another schedule.";

      message.className = "booking-status-message unavailable wide";
      submitBtn.disabled = true;

    } else {

      message.textContent =
        "This vehicle is available for the selected date and time.";

      message.className = "booking-status-message available wide";
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

    const isEditing = editingBookingId !== null;

    const endpoint = isEditing
      ? `/bookings/${editingBookingId}/customer-update`
      : "/bookings";

    const method = isEditing
      ? "PATCH"
      : "POST";

    await apiFetch(endpoint, {
      method: method,
      body: JSON.stringify(bookingData)
    });

    await getMyBookings(true);
    await getBookings(true);

    if (message) {
      message.textContent = isEditing
        ? "✅ Booking updated successfully."
        : "✅ Booking submitted successfully. Redirecting to payment...";

      message.style.color = "green";
    }

    if (submitBtn) {
      submitBtn.textContent = isEditing
        ? "Updated"
        : "Submitted";
    }

    setTimeout(() => {
      if (isEditing) {
        editingBookingId = null;
        renderPanel("my-bookings");
      } else {
        renderPanel("payments");
      }
    }, 1500);

  } catch (error) {

    console.error(error);

    if (message) {
      message.textContent = "❌ " + error.message;
      message.style.color = "crimson";
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = isEditing
        ? "Update Booking"
        : "Submit Booking";
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

    /* ===========================
     Landing Vehicle Details Modal
  =========================== */

  const carModal = document.querySelector("#carModal");
  const modalImage = document.querySelector("#modalImage");
  const modalTitle = document.querySelector("#modalTitle");
  const modalRates = document.querySelector("#modalRates");

  const landingVehicles = {
    vios: {
      name: "Toyota Vios",
      image: "./assets/toyota-vios.jpg",
      rates: [
        ["Metro Manila — 12 Hrs", "₱1,499"],
        ["Metro Manila — 24 Hrs", "₱1,999"],
        ["Outside Metro Manila — 12 Hrs", "₱1,999"],
        ["Outside Metro Manila — 24 Hrs", "₱2,499"],
        ["Unlimited Mileage", "₱2,899"]
      ]
    },

    veloz: {
      name: "Toyota Veloz",
      image: "./assets/toyota-veloz.jpg",
      rates: [
        ["Metro Manila — 12 Hrs", "₱2,399"],
        ["Metro Manila — 24 Hrs", "₱2,799"],
        ["Outside Metro Manila — 12 Hrs", "₱2,799"],
        ["Outside Metro Manila — 24 Hrs", "₱3,299"],
        ["Unlimited Mileage", "₱3,799"]
      ]
    }
  };

  function openCarModal(carKey) {
    const vehicle = landingVehicles[carKey];

    if (!vehicle || !carModal) return;

    modalImage.src = vehicle.image;
    modalImage.alt = vehicle.name;
    modalTitle.textContent = vehicle.name;

    modalRates.innerHTML = vehicle.rates
      .map(([label, value]) => `
        <div>
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `)
      .join("");

    carModal.classList.add("open");
    carModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeCarModal() {
    if (!carModal) return;

    carModal.classList.remove("open");
    carModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  document.querySelectorAll(".view-details").forEach(button => {
    button.addEventListener("click", () => {
      openCarModal(button.dataset.car);
    });
  });

  document.querySelectorAll("#carModal [data-close-modal]").forEach(control => {
    control.addEventListener("click", closeCarModal);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && carModal?.classList.contains("open")) {
      closeCarModal();
    }
  });
})();

let selectedLoginType = "customer";

// Navbar Login Dropdown
const loginDropdownBtn = document.getElementById("loginDropdownBtn");
const loginDropdownMenu = document.getElementById("loginDropdownMenu");

loginDropdownBtn?.addEventListener("click", () => {
  loginDropdownMenu?.classList.toggle("open");
});

document.addEventListener("click", (event) => {
  const clickedInsideDropdown = event.target.closest(".login-dropdown");

  if (!clickedInsideDropdown) {
    loginDropdownMenu?.classList.remove("open");
  }
});

const navCustomerLogin = document.getElementById("navCustomerLogin");

navCustomerLogin?.addEventListener("click", () => {
  selectedLoginType = "customer";

  updateLoginMode();

  loginDropdownMenu?.classList.remove("open");

  setView("login");
});

const navStaffLogin = document.getElementById("navStaffLogin");

navStaffLogin?.addEventListener("click", () => {
  selectedLoginType = "staff";

  updateLoginMode();

  loginDropdownMenu?.classList.remove("open");

  setView("login");
});

function updateLoginMode() {
  const loginFormTitle = document.getElementById("loginFormTitle");
  const loginWelcomeText = document.getElementById("loginWelcomeText");
  const customerRegisterLink = document.getElementById("customerRegisterLink");

  if (selectedLoginType === "staff") {
    if (loginFormTitle) loginFormTitle.textContent = "Staff Login";

    if (loginWelcomeText) {
      loginWelcomeText.textContent =
        "Sign in using your authorized Admin or Employee account.";
    }

    if (customerRegisterLink) {
      customerRegisterLink.style.display = "none";
    }
  } else {
    if (loginFormTitle) loginFormTitle.textContent = "Customer Login";

    if (loginWelcomeText) {
      loginWelcomeText.textContent =
        "Sign in to your customer account to manage your bookings.";
    }

    if (customerRegisterLink) {
      customerRegisterLink.style.display = "";
    }
  }
}