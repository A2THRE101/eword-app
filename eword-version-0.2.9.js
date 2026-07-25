(() => {
  const VERSION = "0.2.9";

  document.title = `Eword Mobile Preview ${VERSION}`;

  document.querySelectorAll(".eyebrow").forEach((label) => {
    if (label.textContent.startsWith("Eword Mobile")) {
      label.textContent = `Eword Mobile ${VERSION}`;
    }
  });

  moveTimelineAboveDashboardData();
  installConfirmationModeToggle();
  installEnhancedEntrySubmit();
  injectEnhancementStyles();

  function moveTimelineAboveDashboardData() {
    const dashboard = document.querySelector("#dashboardScreen");
    const timeline = dashboard?.querySelector(".debt-timeline");
    const balance = dashboard?.querySelector(".balance-band");

    if (!dashboard || !timeline || !balance) return;
    dashboard.insertBefore(timeline, balance);
  }

  function installConfirmationModeToggle() {
    const form = document.querySelector("#entryForm");
    const submitButton = form?.querySelector(".primary-action");
    if (!form || !submitButton || document.querySelector("#entryNeedsConfirmation")) return;

    const field = document.createElement("label");
    field.className = "form-field toggle-field";
    field.innerHTML = `
      <span>Режим записи</span>
      <span class="toggle-control">
        <input id="entryNeedsConfirmation" type="checkbox" checked />
        <span class="toggle-track" aria-hidden="true"></span>
        <strong id="entryConfirmationLabel">Требует подтверждения</strong>
      </span>
    `;

    form.insertBefore(field, submitButton);

    const checkbox = field.querySelector("#entryNeedsConfirmation");
    const label = field.querySelector("#entryConfirmationLabel");
    checkbox.addEventListener("change", () => updateToggleLabel(checkbox, label));
    updateToggleLabel(checkbox, label);
  }

  function installEnhancedEntrySubmit() {
    const form = document.querySelector("#entryForm");
    if (!form || form.dataset.enhancedSubmit === "true") return;

    form.dataset.enhancedSubmit = "true";
    form.addEventListener("submit", handleEnhancedSubmit, true);
  }

  function handleEnhancedSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const person = nodes.entryPerson.value.trim();
    const amountKopecks = parseAmountToKopecks(nodes.entryAmount.value);
    const issueDate = nodes.entryIssueDate.value;
    const dueDate = nodes.entryDueDate.value;
    const note = nodes.entryNote.value.trim();
    const needsConfirmation = document.querySelector("#entryNeedsConfirmation")?.checked ?? true;

    if (!person || !issueDate || !dueDate || !note || !Number.isInteger(amountKopecks) || amountKopecks <= 0) {
      nodes.entryStatus.textContent = "Заполните все обязательные поля.";
      return;
    }

    const loan = {
      id: `loan-${Date.now()}`,
      person,
      direction: nodes.entryDirection.value,
      amountKopecks,
      paidKopecks: 0,
      dueDate,
      status: needsConfirmation ? "pending" : "active",
      note,
      createdAt: issueDate,
      confirmedByOther: !needsConfirmation,
      isInternal: !needsConfirmation,
    };

    loans.unshift(loan);

    if (needsConfirmation) {
      confirmations.unshift({
        id: `confirm-${Date.now()}`,
        type: "Новый займ",
        title: `${person} подтверждает ${formatMoney(amountKopecks)}`,
        description: "Запись создана вручную и ожидает подтверждения второй стороны.",
      });
      nodes.entryStatus.textContent = "Запись создана и ожидает подтверждения.";
    } else {
      nodes.entryStatus.textContent = "Внутренняя запись создана и сразу подтверждена.";
    }

    nodes.entryForm.reset();
    resetConfirmationToggle();
    state.filter = "all";
    state.sort = "created";
    nodes.sortSelect.value = "created";
    setScreen("journal");
  }

  function resetConfirmationToggle() {
    const checkbox = document.querySelector("#entryNeedsConfirmation");
    const label = document.querySelector("#entryConfirmationLabel");
    if (!checkbox || !label) return;

    checkbox.checked = true;
    updateToggleLabel(checkbox, label);
  }

  function updateToggleLabel(checkbox, label) {
    label.textContent = checkbox.checked ? "Требует подтверждения" : "Внутренняя запись";
  }

  function injectEnhancementStyles() {
    if (document.querySelector("#eword-enhancement-styles")) return;

    const style = document.createElement("style");
    style.id = "eword-enhancement-styles";
    style.textContent = `
      #dashboardScreen .debt-timeline {
        margin-top: 0;
        margin-bottom: 10px;
      }

      .toggle-field {
        align-items: center;
      }

      .toggle-control {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 9px;
        min-width: 0;
      }

      .toggle-control input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .toggle-track {
        position: relative;
        flex: 0 0 auto;
        width: 44px;
        height: 24px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--surface-2);
        transition: background 160ms ease, border-color 160ms ease;
      }

      .toggle-track::after {
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--muted);
        transition: transform 160ms ease, background 160ms ease;
      }

      .toggle-control input:checked + .toggle-track {
        border-color: var(--accent);
        background: rgba(255, 122, 26, 0.24);
      }

      .toggle-control input:checked + .toggle-track::after {
        transform: translateX(20px);
        background: var(--accent);
      }

      .toggle-control strong {
        overflow: hidden;
        max-width: 150px;
        color: var(--ink);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.2;
        text-align: right;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    document.head.append(style);
  }
})();
