const bookingForm = document.getElementById("booking-form");
const formStatus = document.getElementById("form-status");
const startRange = document.getElementById("startRange");
const startRangeValue = document.getElementById("startRangeValue");

const startOptions = [
  "As soon as possible",
  "Within the next week",
  "In the next 2 to 3 weeks",
  "Next month",
  "Just exploring for later",
];

function updateStartLabel() {
  startRangeValue.textContent = startOptions[Number(startRange.value)] || startOptions[2];
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "Saving your booking request...";

  const formData = new FormData(bookingForm);
  const payload = {
    whoNeedsTutoring: formData.get("whoNeedsTutoring"),
    gradeLevel: formData.get("gradeLevel"),
    startTiming: startOptions[Number(formData.get("startRange"))] || startOptions[2],
    startDate: formData.get("startDate") || "",
    address: formData.get("address")?.toString().trim(),
    focusArea: formData.get("focusArea")?.toString().trim(),
    contactName: formData.get("contactName")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    phone: formData.get("phone")?.toString().trim(),
  };

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to save your booking request.");
    }

    formStatus.textContent = `${result.message} Reference: ${result.bookingId}.`;
    bookingForm.reset();
    startRange.value = "2";
    updateStartLabel();
  } catch (error) {
    formStatus.textContent = error.message;
  }
});

bookingForm.addEventListener("reset", () => {
  window.setTimeout(() => {
    formStatus.textContent = "";
    startRange.value = "2";
    updateStartLabel();
  }, 0);
});

startRange.addEventListener("input", updateStartLabel);
updateStartLabel();
