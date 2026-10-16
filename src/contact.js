const requiredFields = ["name", "email", "service", "description"];

export async function deliverInquiry(endpoint, data, { timeoutMs = 12000, fetchImpl = fetch } = {}) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("A secure delivery endpoint is required.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const payload = Object.fromEntries(["name", "email", "company", "service", "budget", "contactMethod", "description"].map(field => [field, String(data[field] || "").trim()]));
  try {
    const response = await fetchImpl(url.href, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      redirect: "error",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Submission failed with status ${response.status}`);
  } finally {
    clearTimeout(timer);
  }
}

export function setupProjectForm(form, config) {
  const status = form.querySelector("#form-status");
  const submit = form.querySelector("[data-send]");
  const copy = form.querySelector("#copy-inquiry");
  const fallback = form.querySelector("#copy-fallback");
  const fallbackText = form.querySelector("#brief-text");
  let submitting = false;
  form.noValidate = true;
  form.elements.formStartedAt.value = String(Date.now());

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `form-status visible ${type}`;
  }

  function validateField(name) {
    const field = form.elements[name];
    const value = field.value.trim();
    let message = "";
    if (!value) message = "This field is required.";
    else if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = "Enter a valid email address.";
    else if (name === "description" && value.length < 30) message = "Add at least 30 characters so we can understand the request.";
    else if (field.maxLength > 0 && value.length > field.maxLength) message = `Use ${field.maxLength} characters or fewer.`;
    field.setAttribute("aria-invalid", String(Boolean(message)));
    form.querySelector(`#${name}-error`).textContent = message;
    return !message;
  }

  function validate() {
    const valid = requiredFields.map(validateField).every(Boolean);
    if (!valid) {
      showStatus("Please review the highlighted fields.", "error");
      form.querySelector('[aria-invalid="true"]')?.focus();
    }
    return valid;
  }

  form.addEventListener("input", event => {
    if (requiredFields.includes(event.target.name) && event.target.getAttribute("aria-invalid") === "true") validateField(event.target.name);
    fallback.hidden = true;
    fallbackText.value = "";
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitting) return;
    if (!config.contactEndpoint) {
      showStatus("Sending is not available yet. Copy your project brief to keep it. No message was sent.", "error");
      return;
    }
    if (!validate()) return;
    const data = Object.fromEntries(new FormData(form));
    if (data.website) return;
    if (Date.now() - Number(data.formStartedAt) < 2500) {
      showStatus("Please review your brief for a moment, then try sending again.", "error");
      return;
    }
    submitting = true;
    submit.disabled = true;
    submit.textContent = "Sending…";
    form.setAttribute("aria-busy", "true");
    showStatus("Sending your project inquiry…", "pending");
    try {
      await deliverInquiry(config.contactEndpoint, data);
      form.reset();
      form.elements.formStartedAt.value = String(Date.now());
      fallback.hidden = true;
      fallbackText.value = "";
      showStatus("Your inquiry was received. Thank you—we'll follow up using the details you provided.", "success");
    } catch (error) {
      showStatus(error.name === "AbortError"
        ? "Delivery could not be confirmed in time. Your brief is still here. Copy it for safekeeping and check before sending again."
        : "Delivery could not be confirmed. Your brief is still here; try again or copy it for safekeeping.", "error");
    } finally {
      submitting = false;
      submit.disabled = false;
      submit.textContent = "Send project inquiry";
      form.removeAttribute("aria-busy");
    }
  });

  copy.addEventListener("click", async () => {
    if (!validate()) return;
    const data = Object.fromEntries(new FormData(form));
    const service = form.elements.service.selectedOptions[0].textContent;
    const text = `Project brief for A&M Tech Solutions\n\nName: ${data.name.trim()}\nEmail: ${data.email.trim()}\nCompany: ${data.company.trim() || "Not provided"}\nService: ${service}\nBudget: ${data.budget || "Not provided"}\nPreferred contact: ${data.contactMethod}\n\nProject description:\n${data.description.trim()}`;
    try {
      await navigator.clipboard.writeText(text);
      fallback.hidden = true;
      showStatus("Project brief copied. No message was sent.", "success");
    } catch {
      fallback.hidden = false;
      fallbackText.value = text;
      fallbackText.focus();
      fallbackText.select();
      showStatus("Automatic copying is unavailable. Your brief is selected below so you can copy it manually. No message was sent.", "info");
    }
  });
  // Activate controls only after their progressive-enhancement handlers exist.
  submit.disabled = !config.contactEndpoint;
  copy.disabled = false;
}
