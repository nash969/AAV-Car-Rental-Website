const views = document.querySelectorAll(".view");
const sideNav = document.querySelector("#sideNav");
const workspaceContent = document.querySelector("#workspaceContent");
const workspaceTitle = document.querySelector("#workspaceTitle");
const workspaceKicker = document.querySelector("#workspaceKicker");
const roleLabel = document.querySelector("#roleLabel");


const accounts = {
  "admin@aavrental.com": { password: "Admin@123", role: "admin", name: "System Admin" },
  "employee@aavrental.com": { password: "Employee@123", role: "employee", name: "AAV Employee" },
  "customer@aavrental.com": { password: "Customer@123", role: "customer", name: "AAV Customer" }
};


const roleMenus = {
  customer: [
    ["dashboard", "Dashboard", "i-home"], ["vehicles", "Browse Vehicles", "i-car"],
    ["bookings", "My Bookings", "i-file"], ["payments", "Payments", "i-card"],
    ["tracking", "Vehicle Tracking", "i-map"], ["assistant", "AI Assistant", "i-chat"],
    ["notifications", "Notifications", "i-bell"], ["profile", "Profile", "i-user"], ["logout", "Logout", "i-log-out"]
  ],
  employee: [
    ["dashboard", "Dashboard", "i-home"], ["reservations", "Reservations", "i-file"],
    ["customers", "Customers", "i-user"], ["vehicles", "Vehicles", "i-car"],
    ["payments", "Payments", "i-card"], ["tracking", "Vehicle Tracking", "i-map"],
    ["chat", "AI Chat Monitor", "i-chat"], ["reports", "Reports", "i-chart"],
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


let currentRole = "customer";


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
  if (panel) renderPanel(panel);
});


document.querySelector("#loginForm").addEventListener("submit", event => {
  event.preventDefault();
  const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
  const password = document.querySelector("#loginPassword").value;
  const account = accounts[email];
  if (!account || account.password !== password) {
    alert("Invalid demo credentials. Please use one of the sample accounts.");
    return;
  }
  openPortal(account.role);
});


function openPortal(role) {
  currentRole = role;
  roleLabel.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  sideNav.innerHTML = roleMenus[role].map(([id, label, iconId]) => `
    <button type="button" data-panel="${id}">
      ${icon(iconId)}
      <span>${label}</span>
    </button>
  `).join("");
  setView("portal");
  renderPanel("dashboard");
}


function renderPanel(panel) {
  if (panel === "logout") {
    setView("landing");
    return;
  }
  sideNav.querySelectorAll("button").forEach(button => button.classList.toggle("active", button.dataset.panel === panel));
  const title = panel.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
  workspaceKicker.textContent = currentRole;
  workspaceTitle.textContent = currentRole === "admin" ? `Admin ${title}` : currentRole === "employee" ? `Employee ${title}` : `Customer ${title}`;
  workspaceContent.innerHTML = panels[currentRole]?.[panel]?.() || sharedPanel(panel);
}


const vehicleCards = () => `
  <div class="filters">
    <select><option>Vehicle Type</option><option>SUV</option><option>Sedan</option></select>
    <select><option>Price Range</option><option>₱1,500 - ₱2,500</option><option>₱3,000 - ₱5,000</option></select>
    <select><option>Transmission</option><option>Automatic</option><option>Manual</option></select>
    <select><option>Fuel</option><option>Gasoline</option><option>Diesel</option></select>
    <select><option>Availability</option><option>Available</option><option>Reserved</option></select>
  </div>
  <div class="vehicle-grid">
    ${vehicleCard("./assets/toyota-suv.jpg", "Toyota Fortuner", "SUV", "Automatic", "Diesel", "7 seats", "₱4,500/day", "Available")}
    ${vehicleCard("./assets/toyota-vios.jpg", "Toyota Vios", "Sedan", "Automatic", "Gasoline", "5 seats", "₱2,000/day", "Reserved")}
    ${vehicleCard("./assets/toyota-suv.jpg", "Toyota Rush", "SUV", "Automatic", "Gasoline", "7 seats", "₱3,500/day", "Available")}
  </div>`;


function vehicleCard(img, name, type, transmission, fuel, seats, price, availability) {
  const statusClass = availability === "Available" ? "available" : "reserved";
  return `<article class="vehicle-card">
    <img src="${img}" alt="${name}">
    <div class="vehicle-body">
      <span class="status ${statusClass}">${availability}</span>
      <h3>${name}</h3>
      <p>${type} · ${transmission} · ${fuel} · ${seats}</p>
      <div class="price-row"><strong>${price}</strong><button type="button" data-panel="bookings">Book Now</button></div>
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
    dashboard: () => `${metrics([["Active Bookings", "2"], ["Pending Payments", "1"], ["Completed Rentals", "8"], ["Reward Points", "420"]])}
      <div class="dashboard-grid"><section class="panel"><h3>Featured Cars</h3>${vehicleCards()}</section>
      <section class="panel"><h3>Upcoming Reservations</h3><div class="mini-list"><div><strong>Toyota Rush</strong><span>Jul 16 - Jul 20</span></div><div><strong>Toyota Vios</strong><span>Pending approval</span></div></div><h3>Recent Activity</h3><div class="mini-list"><div><span>Payment receipt uploaded</span><strong>Today</strong></div><div><span>Booking approved</span><strong>Yesterday</strong></div></div></section></div>`,
    vehicles: vehicleCards,
    bookings: () => `<div class="booking-layout"><section class="panel"><h3>Booking Form</h3><div class="form-grid"><label>Vehicle<select><option>Toyota Rush</option><option>Toyota Vios</option></select></label><label>Pickup Date<input type="date" value="2026-07-16"></label><label>Return Date<input type="date" value="2026-07-20"></label><label>Pickup Location<input value="AAV Taguig Office"></label><label>Return Location<input value="AAV Taguig Office"></label><label>Rental Duration<input value="4 days"></label><label>Total Cost<input value="₱14,000"></label><button class="primary wide" type="button">Submit Booking</button></div></section>${bookingSummary()}</div>${table("Booking Status", ["Vehicle", "Dates", "Status"], [["Toyota Rush", "Jul 16 - Jul 20", "<span class='status reserved'>Pending</span>"], ["Toyota Vios", "Jun 02 - Jun 04", "<span class='status available'>Completed</span>"]])}`,
    payments: () => paymentPanel(),
    tracking: () => trackingPanel(),
    assistant: () => `<section class="panel"><h3>AI Customer Assistant</h3><p>Use the floating assistant in the lower-right corner. Try asking “What SUVs are available?” or “What documents are required?”</p></section>`,
    notifications: () => notificationsPanel(),
    profile: () => profilePanel("Customer")
  },
  employee: {
    dashboard: () => `${metrics([["Today's Reservations", "7"], ["Pending Bookings", "12"], ["Active Rentals", "9"], ["Vehicles Available", "18"], ["Vehicles on Trip", "6"], ["Payments Received", "₱58K"]])}<div class="dashboard-grid">${table("Recent Reservations", ["Customer", "Vehicle", "Status"], [["Juan D.", "Toyota Rush", "Approved"], ["Maria S.", "Toyota Vios", "Pending"], ["Ken A.", "Fortuner", "Ongoing"]])}${table("Recent Payments", ["Customer", "Method", "Status"], [["Juan D.", "GCash", "Verified"], ["Maria S.", "EastWest", "Pending"], ["Ken A.", "GCash", "Verified"]])}</div>`,
    reservations: () => table("Reservations", ["Booking ID", "Customer", "Vehicle", "Status"], [["BK-1024", "Juan Dela Cruz", "Toyota Rush", "Pending"], ["BK-1025", "Maria Santos", "Toyota Vios", "Approved"], ["BK-1026", "Ken Alvarez", "Fortuner", "Ongoing"]]),
    customers: () => table("Customer Requests", ["Customer", "Requirement", "Status"], [["Juan D.", "Driver's license", "Verified"], ["Maria S.", "Payment receipt", "Review"], ["Ken A.", "Selfie holding ID", "Verified"]]),
    vehicles: vehicleCards,
    payments: () => paymentPanel(),
    tracking: () => trackingPanel(),
    chat: () => table("AI Chat Monitor", ["Customer", "Question", "AI Response"], [["Customer", "What SUVs are available?", "Fortuner, Montero Sport, Everest"], ["Customer", "Documents required?", "Government ID, license, selfie holding ID"]]),
    reports: () => reportsPanel(),
    profile: () => profilePanel("Employee")
  },
  admin: {
    dashboard: () => `${metrics([["Total Revenue", "₱428K"], ["Total Vehicles", "32"], ["Active Rentals", "9"], ["Pending Reservations", "12"], ["Customer Growth", "+18%"], ["Most Rented", "Toyota Vios"]])}${charts()}<div class="dashboard-grid">${table("Recent Bookings", ["Customer", "Vehicle", "Status"], [["Juan D.", "Toyota Rush", "Pending"], ["Maria S.", "Vios", "Approved"], ["Ken A.", "Fortuner", "Ongoing"]])}${table("Recent Customers", ["Name", "Mobile", "Status"], [["Juan Dela Cruz", "+639274589432", "Verified"], ["Maria Santos", "+639991234567", "New"], ["Ken Alvarez", "+639181112222", "Active"]])}</div>`,
    employees: () => table("Employees", ["Name", "Role", "Status"], [["Abigail De Mesa", "Manager", "Active"], ["AAV Staff", "Employee", "Active"]]),
    customers: () => table("Customers", ["Name", "License", "Rentals"], [["Juan Dela Cruz", "N01-23-456789", "4"], ["Maria Santos", "N02-45-789123", "2"]]),
    "vehicle-management": () => `<section class="panel"><h3>Vehicle Information</h3><div class="form-grid"><label>Plate Number<input value="NJG 5062"></label><label>Vehicle Name<input value="Toyota Vios"></label><label>Brand<input value="Toyota"></label><label>Model<input value="Vios"></label><label>Year<input value="2024"></label><label>Color<input value="Silver"></label><label>Fuel Type<select><option>Gasoline</option><option>Diesel</option></select></label><label>Transmission<select><option>Automatic</option><option>Manual</option></select></label><label>Seating Capacity<input value="5"></label><label>Rental Price<input value="₱2,000/day"></label><label>Availability<select><option>Available</option><option>Reserved</option><option>On Trip</option><option>Maintenance</option></select></label><label>Upload Vehicle Images<input type="file"></label><button class="primary wide" type="button">Save Vehicle</button></div></section>${vehicleCards()}`,
    reservations: () => panels.employee.reservations(),
    payments: () => paymentPanel(),
    tracking: () => trackingPanel(),
    reports: () => reportsPanel(),
    logs: () => panels.employee.chat(),
    settings: () => `<section class="panel"><h3>System Settings</h3><div class="form-grid"><label>Reservation Fee<input value="₱500/day"></label><label>Payment Methods<input value="GCash, Bank Transfer"></label><label class="wide">Rental Policy<textarea>Reservation is not refundable if client wishes to cancel. Fee is deductible from total rent amount.</textarea></label><button class="primary wide" type="button">Update Settings</button></div></section>`,
    profile: () => profilePanel("Admin")
  }
};


function bookingSummary() {
  return `<aside class="panel"><h3>Booking Summary</h3><div class="summary-line"><span>Vehicle</span><strong>Toyota Rush</strong></div><div class="summary-line"><span>Duration</span><strong>4 days</strong></div><div class="summary-line"><span>Reservation Fee</span><strong>₱2,000</strong></div><div class="summary-line"><span>Total Cost</span><strong>₱14,000</strong></div><p><span class="status reserved">Pending</span> Approval required before pickup.</p></aside>`;
}


function paymentPanel() {
  return `<div class="payment-layout"><section class="panel"><h3>Payment Methods</h3><div class="mini-list"><div><strong>GCash</strong><span>09999118689 · Abigail De Mesa</span></div><div><strong>Bank Transfer</strong><span>EastWest · 200066882957 · Abigail De Mesa</span></div></div><h3>Upload Payment Receipt</h3><div class="form-grid"><label>Reservation Fee<input value="₱500/day"></label><label>Payment Method<select><option>GCash</option><option>Bank Transfer</option></select></label><label class="wide">Receipt<input type="file"></label><button class="primary wide" type="button">Submit Receipt</button></div></section><aside class="panel"><img src="./assets/payment-options.jpg" alt="AAV payment options" style="border-radius:14px;filter:grayscale(100%);"><p>Payment Status: <span class="status reserved">For Verification</span></p><button class="secondary full" type="button">Download Receipt</button></aside></div>${table("Transaction History", ["Date", "Method", "Amount", "Status"], [["Jul 09", "GCash", "₱2,000", "Pending"], ["Jun 04", "EastWest", "₱4,000", "Verified"]])}`;
}


function trackingPanel() {
  return `<div class="tracking-layout"><section class="map-card"><h3>Interactive Map</h3><div class="map-visual"><span class="route-line"></span><span class="pin pickup"></span><span class="pin destination"></span><span class="pin car">${icon("i-car")}</span></div></section><aside class="panel"><h3>Vehicle Tracking</h3><div class="summary-line"><span>Vehicle location</span><strong>BGC, Taguig</strong></div><div class="summary-line"><span>Current status</span><strong>On Trip</strong></div><div class="summary-line"><span>Pickup point</span><strong>AAV Office</strong></div><div class="summary-line"><span>Destination</span><strong>NAIA Terminal 3</strong></div><div class="summary-line"><span>Estimated Arrival Time</span><strong>28 min</strong></div><div class="mini-list"><div><span>Available</span><strong>18</strong></div><div><span>Reserved</span><strong>7</strong></div><div><span>Returned</span><strong>11</strong></div><div><span>Maintenance</span><strong>2</strong></div></div></aside></div>`;
}


function notificationsPanel() {
  return `<section class="panel"><h3>Notifications</h3><div class="mini-list"><div><strong>Booking Approved</strong><span>Toyota Rush reservation confirmed.</span></div><div><strong>Booking Rejected</strong><span>One request needs updated documents.</span></div><div><strong>Payment Verified</strong><span>GCash receipt has been verified.</span></div><div><strong>Vehicle Returned</strong><span>Toyota Vios marked returned.</span></div><div><strong>Account Updates</strong><span>Profile verification completed.</span></div></div></section>`;
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
  if (q.includes("suv")) return "Currently available SUVs include Toyota Fortuner, Mitsubishi Montero Sport, and Ford Everest. The Toyota Rush is also listed as available in this prototype.";
  if (q.includes("document") || q.includes("require")) return "Please upload a valid government ID, driver's license, proof of billing, company ID if applicable, and a selfie while holding your ID. You may also need the QR code from the LTO-LTMS portal.";
  if (q.includes("price") || q.includes("rate") || q.includes("cost")) return "Sample daily rates are Toyota Vios at ₱2,000/day, Toyota Rush at ₱3,500/day, and Toyota Fortuner at ₱4,500/day. A ₱500/day reservation fee is deductible from the total rent amount.";
  if (q.includes("book")) return "To book, create a customer account, choose a vehicle, submit pickup and return details, upload requirements, pay the reservation fee, then wait for approval.";
  if (q.includes("payment") || q.includes("gcash") || q.includes("bank")) return "Payment methods include GCash 09999118689 and EastWest bank transfer 200066882957 under Abigail De Mesa. Upload a receipt so staff can verify it.";
  if (q.includes("policy") || q.includes("cancel") || q.includes("refund")) return "The reservation fee is deductible from the total rental amount but is forfeited if the renter cancels the booking.";
  return "I can answer questions about available vehicles, rental requirements, rental pricing, booking process, payment methods, rental policies, and frequently asked questions.";
}

