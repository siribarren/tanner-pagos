const rows = [
  {
    id: 1,
    number: "015 / 036",
    dueDate: "15 May, 2024",
    capital: 195000,
    interest: 30000,
    status: "vigente",
    selected: true,
  },
  {
    id: 2,
    number: "016 / 036",
    dueDate: "15 Jun, 2024",
    capital: 195000,
    interest: 30000,
    status: "vencida",
    selected: true,
  },
  {
    id: 3,
    number: "017 / 036",
    dueDate: "15 Jul, 2024",
    capital: 195000,
    interest: 25000,
    status: "pendiente",
    selected: false,
  },
  {
    id: 4,
    number: "018 / 036",
    dueDate: "15 Ago, 2024",
    capital: 195000,
    interest: 25000,
    status: "pendiente",
    selected: false,
  },
];

const transferredAmount = 500000;
const selectedIds = new Set(rows.filter((row) => row.selected).map((row) => row.id));

const els = {
  rows: document.getElementById("installmentRows"),
  search: document.getElementById("searchInput"),
  toggleAll: document.getElementById("toggleAll"),
  selectedAmount: document.getElementById("selectedAmount"),
  differenceAmount: document.getElementById("differenceAmount"),
  differenceState: document.getElementById("differenceState"),
  suggestionText: document.getElementById("suggestionText"),
  tableMeta: document.getElementById("tableMeta"),
  customerSummary: document.getElementById("customerSummary"),
  toast: document.getElementById("toast"),
  saveDraftBtn: document.getElementById("saveDraftBtn"),
  continueBtn: document.getElementById("continueBtn"),
  suggestionBtn: document.getElementById("suggestionBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  filterBtn: document.getElementById("filterBtn"),
};

const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const fmt = (value) => currency.format(value).replace(/\s/g, "");

function statusLabel(status) {
  if (status === "vigente") return "VIGENTE";
  if (status === "vencida") return "VENCIDA";
  return "PENDIENTE";
}

function statusClass(status) {
  if (status === "vigente") return "badge--success";
  if (status === "vencida") return "badge--danger";
  return "badge--warning";
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2400);
}

function getVisibleRows() {
  const query = els.search.value.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) => {
    return [row.number, row.dueDate, row.status, fmt(row.capital), fmt(row.interest)]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function recompute() {
  const selectedRows = rows.filter((row) => selectedIds.has(row.id));
  const selectedAmount = selectedRows.reduce((sum, row) => sum + row.capital + row.interest, 0);
  const difference = selectedAmount - transferredAmount;
  const absoluteDifference = Math.abs(difference);
  const isPerfect = absoluteDifference <= 100;
  const isClose = absoluteDifference <= 1000;

  els.selectedAmount.textContent = fmt(selectedAmount);
  els.differenceAmount.textContent = `${difference < 0 ? "-" : ""}${fmt(absoluteDifference)}`;

  if (isPerfect) {
    els.differenceState.textContent = "Estado: Coincidencia exacta";
    els.suggestionText.textContent = "La conciliacion quedo alineada. Puedes avanzar con la validacion.";
  } else if (isClose) {
    els.differenceState.textContent = "Estado: Diferencia menor";
    els.suggestionText.textContent = "La diferencia es minima. Revisa el redondeo antes de seguir.";
  } else if (difference < 0) {
    els.differenceState.textContent = "Estado: Inconsistente";
    els.suggestionText.textContent =
      "El monto transferido es mayor a lo seleccionado. Agrega la siguiente cuota para cubrir el saldo.";
  } else {
    els.differenceState.textContent = "Estado: Excedente";
    els.suggestionText.textContent =
      "El monto seleccionado supera el abono recibido. Quita una cuota o deriva a excepcion.";
  }

  const visibleRows = getVisibleRows();
  els.tableMeta.textContent = `Mostrando ${visibleRows.length} de ${rows.length} cuotas encontradas`;
  els.toggleAll.checked = visibleRows.length > 0 && visibleRows.every((row) => selectedIds.has(row.id));
}

function renderRows() {
  const visibleRows = getVisibleRows();
  els.rows.innerHTML = visibleRows
    .map((row) => {
      const selected = selectedIds.has(row.id);
      return `
        <tr data-id="${row.id}" data-selected="${selected}">
          <td><input class="row-check" type="checkbox" ${selected ? "checked" : ""} aria-label="Seleccionar cuota ${row.number}"></td>
          <td>${row.number}</td>
          <td>${row.dueDate}</td>
          <td>${fmt(row.capital)}</td>
          <td>${fmt(row.interest)}</td>
          <td><span class="badge ${statusClass(row.status)}">${statusLabel(row.status)}</span></td>
        </tr>
      `;
    })
    .join("");

  els.rows.querySelectorAll("tr").forEach((tr) => {
    const id = Number(tr.dataset.id);
    const checkbox = tr.querySelector("input");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedIds.add(id);
      } else {
        selectedIds.delete(id);
      }
      renderRows();
      recompute();
    });

    tr.addEventListener("click", (event) => {
      if (event.target instanceof HTMLInputElement) return;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  recompute();
}

els.search.addEventListener("input", renderRows);
els.toggleAll.addEventListener("change", () => {
  const visibleRows = getVisibleRows();
  visibleRows.forEach((row) => {
    if (els.toggleAll.checked) {
      selectedIds.add(row.id);
    } else {
      selectedIds.delete(row.id);
    }
  });
  renderRows();
  recompute();
});

els.saveDraftBtn.addEventListener("click", () => showToast("Borrador guardado con exito"));
els.downloadBtn.addEventListener("click", () => showToast("Reporte listo para descargar"));
els.filterBtn.addEventListener("click", () => showToast("Panel de filtros disponible en la siguiente iteracion"));
els.continueBtn.addEventListener("click", () => showToast("Avanzando a validacion"));
els.suggestionBtn.addEventListener("click", () => {
  const nextRow = rows.find((row) => !selectedIds.has(row.id));
  if (nextRow) {
    selectedIds.add(nextRow.id);
    renderRows();
    recompute();
    showToast(`Se agrego la cuota ${nextRow.number}`);
  } else {
    showToast("No hay mas cuotas para sugerir");
  }
});

els.customerSummary.textContent = "Cliente: Inversiones Globales S.A. (RUT: 76.452.XXX-X)";

renderRows();
