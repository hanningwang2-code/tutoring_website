const loginForm = document.getElementById("admin-login-form");
const logoutButton = document.getElementById("admin-logout");
const adminStatus = document.getElementById("admin-status");
const bookingList = document.getElementById("admin-booking-list");
const bookingTemplate = document.getElementById("admin-booking-template");

function renderEmptyState(message) {
  bookingList.innerHTML = `<div class="empty-state">${message}</div>`;
}

function renderBookings(bookings) {
  if (!bookings.length) {
    renderEmptyState("No bookings have been submitted yet.");
    return;
  }

  bookingList.innerHTML = "";

  bookings.forEach((booking) => {
    const fragment = bookingTemplate.content.cloneNode(true);
    fragment.querySelector(".booking-card__id").textContent = `BK-${String(booking.id).padStart(3, "0")}`;
    fragment.querySelector(".booking-card__time").textContent = new Date(booking.createdAt).toLocaleString();
    fragment.querySelector(".booking-card__name").textContent = booking.contactName;
    fragment.querySelector(".booking-card__meta").textContent =
      `${booking.whoNeedsTutoring} • ${booking.gradeLevel} • ${booking.startTiming}`;
    fragment.querySelector(".booking-card__detail").textContent = `Needs help with: ${booking.focusArea}`;
    fragment.querySelector(".booking-card__address").textContent = `Address: ${booking.address}`;
    fragment.querySelector(".booking-card__contact").textContent =
      `Contact: ${booking.email} • ${booking.phone}`;
    bookingList.appendChild(fragment);
  });
}

async function loadBookings() {
  const response = await fetch("/api/admin/bookings", {
    credentials: "same-origin",
  });

  if (response.status === 401) {
    renderEmptyState("Sign in with the admin password to view submitted bookings.");
    return false;
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Unable to load bookings.");
  }

  renderBookings(result.bookings);
  return true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminStatus.textContent = "Signing in...";

  const formData = new FormData(loginForm);
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      password: formData.get("password"),
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    adminStatus.textContent = result.error || "Unable to sign in.";
    renderEmptyState("Sign in with the admin password to view submitted bookings.");
    return;
  }

  adminStatus.textContent = "Signed in. Loading bookings...";
  await loadBookings();
  adminStatus.textContent = "Signed in successfully.";
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", {
    method: "POST",
    credentials: "same-origin",
  });

  adminStatus.textContent = "Signed out.";
  renderEmptyState("Sign in with the admin password to view submitted bookings.");
});

loadBookings().catch((error) => {
  adminStatus.textContent = error.message;
  renderEmptyState("Unable to load bookings right now.");
});
