const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
});

const el = {
  sidebarStatus: document.getElementById("sidebarStatus"),
  sidebarSubtitle: document.getElementById("sidebarSubtitle"),
  sidebarProcessed: document.getElementById("sidebarProcessed"),
  sidebarPending: document.getElementById("sidebarPending"),
  activeCustomerName: document.getElementById("activeCustomerName"),
  activeCustomerRut: document.getElementById("activeCustomerRut"),
  activeCustomerOperation: document.getElementById("activeCustomerOperation"),
  activeCustomerCampaign: document.getElementById("activeCustomerCampaign"),
  activeCustomerExecutive: document.getElementById("activeCustomerExecutive"),
  activeCustomerPortfolio: document.getElementById("activeCustomerPortfolio"),
  activeCustomerChannel: document.getElementById("activeCustomerChannel"),
  activeCustomerDueDate: document.getElementById("activeCustomerDueDate"),
  heroChips: document.getElementById("heroChips"),
  metricExpected: document.getElementById("metricExpected"),
  metricTransferred: document.getElementById("metricTransferred"),
  metricState: document.getElementById("metricState"),
  metricDelay: document.getElementById("metricDelay"),
  monacoRefresh: document.getElementById("monacoRefresh"),
  workflowHint: document.getElementById("workflowHint"),
  customerSearch: document.getElementById("customerSearch"),
  customerList: document.getElementById("customerList"),
  stageRail: document.getElementById("stageRail"),
  snapshotCapital: document.getElementById("snapshotCapital"),
  snapshotMoratory: document.getElementById("snapshotMoratory"),
  snapshotFees: document.getElementById("snapshotFees"),
  snapshotTotal: document.getElementById("snapshotTotal"),
  transferAmount: document.getElementById("transferAmount"),
  commitmentDate: document.getElementById("commitmentDate"),
  paymentDate: document.getElementById("paymentDate"),
  toleranceAmount: document.getElementById("toleranceAmount"),
  selectedAmount: document.getElementById("selectedAmount"),
  lateInterest: document.getElementById("lateInterest"),
  expectedTotal: document.getElementById("expectedTotal"),
  differenceTotal: document.getElementById("differenceTotal"),
  toggleAllInstallments: document.getElementById("toggleAllInstallments"),
  installmentBody: document.getElementById("installmentBody"),
  evidenceInput: document.getElementById("evidenceInput"),
  fileList: document.getElementById("fileList"),
  evidenceState: document.getElementById("evidenceState"),
  ocrFileName: document.getElementById("ocrFileName"),
  ocrTransferId: document.getElementById("ocrTransferId"),
  ocrSenderName: document.getElementById("ocrSenderName"),
  ocrSenderRut: document.getElementById("ocrSenderRut"),
  ocrBankOrigin: document.getElementById("ocrBankOrigin"),
  ocrBankDest: document.getElementById("ocrBankDest"),
  ocrDate: document.getElementById("ocrDate"),
  ocrAmount: document.getElementById("ocrAmount"),
  ocrNote: document.getElementById("ocrNote"),
  validationState: document.getElementById("validationState"),
  validationChecklist: document.getElementById("validationChecklist"),
  exceptionCount: document.getElementById("exceptionCount"),
  exceptionList: document.getElementById("exceptionList"),
  auditTimeline: document.getElementById("auditTimeline"),
  toast: document.getElementById("toast"),
  saveDraftBtn: document.getElementById("saveDraftBtn"),
  createAgreementBtn: document.getElementById("createAgreementBtn"),
  markCartolaBtn: document.getElementById("markCartolaBtn"),
  openExceptionBtn: document.getElementById("openExceptionBtn"),
  approveBtn: document.getElementById("approveBtn"),
  addAuditBtn: document.getElementById("addAuditBtn"),
  sendFluxuBtn: document.getElementById("sendFluxuBtn"),
  downloadReportBtn: document.getElementById("downloadReportBtn"),
};

const stages = [
  {
    key: "identificacion",
    title: "Identificacion",
    desc: "Busqueda por RUT, operacion o cartera.",
  },
  {
    key: "acuerdo",
    title: "Acuerdo",
    desc: "Selec. de cuotas y definicion del compromiso.",
  },
  {
    key: "evidencia",
    title: "Evidencia",
    desc: "Carga del comprobante y extraccion OCR.",
  },
  {
    key: "cuadratura",
    title: "Cuadratura",
    desc: "Comparacion con Monaco y tolerancias.",
  },
  {
    key: "validacion",
    title: "Validacion",
    desc: "Revision operativa y derivacion si aplica.",
  },
  {
    key: "envio",
    title: "Envio",
    desc: "Publicacion del caso hacia Fluxu.",
  },
];

const customers = [
  {
    id: "op-20418",
    name: "Inversiones Globales S.A.",
    rut: "76.452.XXX-X",
    operation: "OP-20418",
    campaign: "Recupero castigo",
    cartera: "Phoenix",
    executive: "Mariana Soto",
    channel: "WhatsApp / llamada",
    dueDate: "2026-07-10",
    commitmentDate: "2026-07-09",
    paymentDate: "2026-07-09",
    transferAmount: 3021000,
    tolerance: 10000,
    statusLabel: "Cuadrado",
    stageIndex: 3,
    monacoRefresh: "2026-07-08T08:15:00",
    monaco: {
      capital: 2860000,
      moratory: 121000,
      fees: 40000,
      dailyLateFee: 4500,
      total: 3021000,
    },
    installments: [
      {
        id: 1,
        number: "014 / 036",
        dueDate: "2026-06-15",
        capital: 950000,
        moratory: 35000,
        fee: 10000,
        status: "vencida",
        selected: true,
      },
      {
        id: 2,
        number: "015 / 036",
        dueDate: "2026-06-30",
        capital: 950000,
        moratory: 42000,
        fee: 10000,
        status: "vencida",
        selected: true,
      },
      {
        id: 3,
        number: "016 / 036",
        dueDate: "2026-07-08",
        capital: 960000,
        moratory: 44000,
        fee: 10000,
        status: "vigente",
        selected: true,
      },
      {
        id: 4,
        number: "017 / 036",
        dueDate: "2026-07-15",
        capital: 960000,
        moratory: 46000,
        fee: 10000,
        status: "pendiente",
        selected: false,
      },
    ],
    evidence: [
      {
        name: "comprobante_transferencia_op20418.pdf",
        type: "PDF",
        size: "284 KB",
      },
      {
        name: "cartola_julio_2026.png",
        type: "PNG",
        size: "1.2 MB",
      },
    ],
    ocr: {
      fileName: "comprobante_transferencia_op20418.pdf",
      transferId: "TRX-910284",
      senderName: "Inversiones Globales S.A.",
      senderRut: "76.452.XXX-X",
      bankOrigin: "Banco Estado",
      bankDest: "Banco de Chile",
      date: "2026-07-09",
      amount: 3021000,
      note: "Pago de tres cuotas",
    },
    exceptions: [
      {
        code: "E-03",
        title: "Mora actualizada",
        desc: "El pago fue recibido fuera de la fecha compromiso y requiere recorte automatico de mora.",
      },
    ],
    audit: [
      {
        time: "08:12",
        title: "Cliente seleccionado",
        desc: "Se cargo el caso OP-20418 desde el listado de recupero.",
      },
      {
        time: "08:15",
        title: "Monaco sincronizado",
        desc: "Se refresco la fotografia de deuda oficial y se fijo el total exigible.",
      },
      {
        time: "08:20",
        title: "Comprobante asociado",
        desc: "Se adjunto el comprobante de transferencia y la cartola de respaldo.",
      },
    ],
  },
  {
    id: "op-11230",
    name: "Transportes del Sur Ltda.",
    rut: "77.321.XXX-X",
    operation: "OP-11230",
    campaign: "Cartera PME",
    cartera: "Mesa Sur",
    executive: "Javier Lagos",
    channel: "Correo / llamada",
    dueDate: "2026-07-12",
    commitmentDate: "2026-07-11",
    paymentDate: "2026-07-12",
    transferAmount: 1450000,
    tolerance: 10000,
    statusLabel: "Excedente",
    stageIndex: 4,
    monacoRefresh: "2026-07-08T09:05:00",
    monaco: {
      capital: 1325000,
      moratory: 76000,
      fees: 49000,
      dailyLateFee: 2800,
      total: 1450000,
    },
    installments: [
      {
        id: 1,
        number: "022 / 048",
        dueDate: "2026-06-22",
        capital: 650000,
        moratory: 28000,
        fee: 24000,
        status: "vencida",
        selected: true,
      },
      {
        id: 2,
        number: "023 / 048",
        dueDate: "2026-07-05",
        capital: 675000,
        moratory: 28000,
        fee: 25000,
        status: "vigente",
        selected: true,
      },
      {
        id: 3,
        number: "024 / 048",
        dueDate: "2026-07-19",
        capital: 675000,
        moratory: 24000,
        fee: 25000,
        status: "pendiente",
        selected: false,
      },
    ],
    evidence: [
      {
        name: "trx-55218.jpg",
        type: "JPG",
        size: "820 KB",
      },
    ],
    ocr: {
      fileName: "trx-55218.jpg",
      transferId: "TRX-55218",
      senderName: "Transportes del Sur Ltda.",
      senderRut: "77.321.XXX-X",
      bankOrigin: "Banco Santander",
      bankDest: "Banco de Chile",
      date: "2026-07-12",
      amount: 1460000,
      note: "Monto excede en 10 mil",
    },
    exceptions: [
      {
        code: "E-07",
        title: "Excedente",
        desc: "El monto OCR supera el total esperado y debe ir a revision manual.",
      },
      {
        code: "E-11",
        title: "Validacion de banco",
        desc: "La cartola no confirma aun el banco origen del comprobante.",
      },
    ],
    audit: [
      {
        time: "09:12",
        title: "Caso observado",
        desc: "La diferencia detectada supera la tolerancia configurada para el flujo.",
      },
      {
        time: "09:20",
        title: "Excepcion abierta",
        desc: "Se habilito la bandeja de revision por excedente y banco pendiente.",
      },
    ],
  },
  {
    id: "op-30449",
    name: "Clinica Horizonte SpA",
    rut: "96.980.XXX-X",
    operation: "OP-30449",
    campaign: "Regularizacion",
    cartera: "Servicios",
    executive: "Sofia Rivas",
    channel: "Portal / correo",
    dueDate: "2026-07-14",
    commitmentDate: "2026-07-13",
    paymentDate: "2026-07-13",
    transferAmount: 980000,
    tolerance: 5000,
    statusLabel: "Pendiente de validacion",
    stageIndex: 2,
    monacoRefresh: "2026-07-08T10:30:00",
    monaco: {
      capital: 875000,
      moratory: 71000,
      fees: 34000,
      dailyLateFee: 1800,
      total: 980000,
    },
    installments: [
      {
        id: 1,
        number: "008 / 024",
        dueDate: "2026-06-10",
        capital: 420000,
        moratory: 29000,
        fee: 16000,
        status: "vencida",
        selected: true,
      },
      {
        id: 2,
        number: "009 / 024",
        dueDate: "2026-07-09",
        capital: 455000,
        moratory: 42000,
        fee: 18000,
        status: "vigente",
        selected: true,
      },
      {
        id: 3,
        number: "010 / 024",
        dueDate: "2026-07-21",
        capital: 455000,
        moratory: 24000,
        fee: 18000,
        status: "pendiente",
        selected: false,
      },
    ],
    evidence: [
      {
        name: "correo_respaldo.eml",
        type: "EML",
        size: "92 KB",
      },
      {
        name: "comprobante_980000.png",
        type: "PNG",
        size: "744 KB",
      },
    ],
    ocr: {
      fileName: "comprobante_980000.png",
      transferId: "TRX-73190",
      senderName: "Clinica Horizonte SpA",
      senderRut: "96.980.XXX-X",
      bankOrigin: "Banco de Chile",
      bankDest: "Banco de Chile",
      date: "2026-07-13",
      amount: 980000,
      note: "Pago normalizado",
    },
    exceptions: [],
    audit: [
      {
        time: "10:31",
        title: "OCR en curso",
        desc: "Se reconocio el archivo y se completo la informacion base del comprobante.",
      },
      {
        time: "10:34",
        title: "Caso listo para revisar",
        desc: "La cuadratura coincide con el total esperado y espera aprobacion final.",
      },
    ],
  },
];

const state = {
  activeCustomerId: customers[0].id,
  selectedInstallments: new Set(),
  stageIndex: customers[0].stageIndex,
  files: [...customers[0].evidence],
  audit: [...customers[0].audit],
  exceptions: [...customers[0].exceptions],
  search: "",
};

function fmtMoney(value) {
  return currency.format(Number(value || 0));
}

function fmtShortDate(value) {
  return dateFmt.format(new Date(`${value}T12:00:00`));
}

function fmtTime(value) {
  return timeFmt.format(new Date(`2026-07-08T${value}:00`));
}

function parseDate(value) {
  return new Date(`${value}T12:00:00`);
}

function diffDays(a, b) {
  const ms = parseDate(a).getTime() - parseDate(b).getTime();
  return Math.round(ms / 86400000);
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    el.toast.classList.remove("is-visible");
  }, 2500);
}

function getCustomer(id) {
  return customers.find((customer) => customer.id === id) ?? customers[0];
}

function getActiveCustomer() {
  return getCustomer(state.activeCustomerId);
}

function getSelectedIdsForCustomer(customer) {
  if (customer.id === state.activeCustomerId) {
    return state.selectedInstallments;
  }

  return new Set(customer.installments.filter((installment) => installment.selected).map((installment) => installment.id));
}

function sumSelected(customer) {
  const selectedIds = getSelectedIdsForCustomer(customer);
  return customer.installments
    .filter((installment) => selectedIds.has(installment.id))
    .reduce((sum, installment) => sum + installment.capital + installment.moratory + installment.fee, 0);
}

function computeLateInterest(customer) {
  const lateDays = Math.max(0, diffDays(customer.paymentDate, customer.commitmentDate));
  return lateDays * customer.monaco.dailyLateFee;
}

function buildValidation(customer, expectedTotal, lateInterest, difference) {
  const amountMatches = Number(el.ocrAmount.value || 0) === Number(el.transferAmount.value || 0);
  const bankMatches =
    el.ocrBankOrigin.value.trim().toLowerCase() !== "" &&
    el.ocrBankDest.value.trim().toLowerCase() !== "" &&
    el.ocrBankDest.value.trim().toLowerCase().includes("chile");
  const filesLoaded = state.files.length > 0;
  const tolerance = Number(el.toleranceAmount.value || 0);
  const exactMatch = Math.abs(difference) <= tolerance;
  const dateLate = diffDays(el.paymentDate.value, el.commitmentDate.value);

  const items = [
    {
      ok: filesLoaded,
      title: "Evidencia adjunta",
      desc: filesLoaded
        ? `${state.files.length} archivo(s) disponible(s) para trazabilidad.`
        : "No hay comprobante cargado todavia.",
    },
    {
      ok: amountMatches,
      title: "Monto OCR vs transferencia",
      desc: amountMatches
        ? "El monto reconocido por OCR coincide con el monto ingresado."
        : `OCR ${fmtMoney(el.ocrAmount.value)} vs transferencia ${fmtMoney(el.transferAmount.value)}.`,
    },
    {
      ok: bankMatches,
      title: "Banco origen / destino",
      desc: bankMatches
        ? "Los bancos del comprobante y de destino estan consistentes."
        : "Revisar banco origen o destino antes del envio.",
    },
    {
      ok: exactMatch,
      warn: Math.abs(difference) <= tolerance * 2,
      title: "Tolerancia Tanner",
      desc: exactMatch
        ? "La diferencia entra en la tolerancia operativa."
        : `Quedan ${fmtMoney(Math.abs(difference))} fuera de tolerancia.`,
    },
    {
      ok: dateLate >= 0,
      title: "Fecha de pago",
      desc:
        dateLate >= 0
          ? dateLate === 0
            ? "El pago cae en la fecha compromiso."
            : `Pago con ${dateLate} dia(s) de atraso, se recalcula la mora.`
          : "El pago fue cargado antes de la fecha compromiso.",
    },
  ];

  return items;
}

function renderCustomerList() {
  const term = state.search.trim().toLowerCase();
  const filtered = customers.filter((customer) => {
    if (!term) return true;
    return [customer.name, customer.rut, customer.operation, customer.campaign, customer.cartera]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  el.customerList.innerHTML = filtered
    .map((customer) => {
      const active = customer.id === state.activeCustomerId ? "is-active" : "";
      const total = customer.monaco.total;
      const settlement = sumSelected(customer);
      const diff = settlement - total;
      const badge = Math.abs(diff) <= customer.tolerance ? "badge--success" : diff > 0 ? "badge--warning" : "badge--danger";
      const label = Math.abs(diff) <= customer.tolerance ? "Cuadrado" : diff > 0 ? "Excedente" : "Faltante";

      return `
        <button class="customer-card ${active}" type="button" data-customer-id="${customer.id}">
          <div class="customer-card__top">
            <div>
              <div class="customer-card__name">${customer.name}</div>
              <div class="customer-card__meta">
                <span>${customer.rut}</span>
                <span>${customer.operation}</span>
                <span>${customer.campaign}</span>
              </div>
            </div>
            <span class="status-pill ${badge}">${label}</span>
          </div>
          <div class="customer-card__body">
            <div class="mini-stat">
              <span>Monaco</span>
              <strong>${fmtMoney(total)}</strong>
            </div>
            <div class="mini-stat">
              <span>Transferido</span>
              <strong>${fmtMoney(customer.transferAmount)}</strong>
            </div>
            <div class="mini-stat">
              <span>Cuotas</span>
              <strong>${customer.installments.length}</strong>
            </div>
          </div>
        </button>
      `;
    })
    .join("");

  el.customerList.querySelectorAll("[data-customer-id]").forEach((button) => {
    button.addEventListener("click", () => selectCustomer(button.dataset.customerId));
  });
}

function renderHeroChips(customer) {
  const lateDays = Math.max(0, diffDays(customer.paymentDate, customer.commitmentDate));
  const chips = [
    `<span class="chip chip--blue">Monaco como fuente oficial</span>`,
    `<span class="chip chip--aqua">${customer.installments.filter((item) => item.selected).length} cuotas seleccionadas</span>`,
    `<span class="chip chip--green">${lateDays > 0 ? `${lateDays} dia(s) de atraso` : "Sin atraso"}</span>`,
  ];
  el.heroChips.innerHTML = chips.join("");
}

function renderStageRail(customer) {
  el.stageRail.innerHTML = stages
    .map((stage, index) => {
      const klass = index < state.stageIndex ? "is-done" : index === state.stageIndex ? "is-active" : "is-pending";
      return `
        <button class="stage ${klass}" type="button" data-stage="${index}">
          <div class="stage__title">${stage.title}</div>
          <div class="stage__desc">${stage.desc}</div>
        </button>
      `;
    })
    .join("");

  el.stageRail.querySelectorAll("[data-stage]").forEach((button) => {
    button.addEventListener("click", () => {
      state.stageIndex = Number(button.dataset.stage);
      getActiveCustomer().stageIndex = state.stageIndex;
      updateWorkflowHint();
      renderStageRail(getActiveCustomer());
    });
  });
}

function renderInstallments(customer) {
  el.installmentBody.innerHTML = customer.installments
    .map((installment) => {
      const selected = state.selectedInstallments.has(installment.id);
      const total = installment.capital + installment.moratory + installment.fee;
      const statusClass =
        installment.status === "vencida"
          ? "badge--danger"
          : installment.status === "vigente"
            ? "badge--success"
            : "badge--warning";

      return `
        <tr class="${selected ? "is-selected" : ""}" data-installment-id="${installment.id}">
          <td>
            <input
              type="checkbox"
              class="installment-toggle"
              ${selected ? "checked" : ""}
              aria-label="Seleccionar cuota ${installment.number}"
            />
          </td>
          <td>${installment.number}</td>
          <td>${fmtShortDate(installment.dueDate)}</td>
          <td>${fmtMoney(installment.capital)}</td>
          <td>${fmtMoney(installment.moratory)}</td>
          <td>${fmtMoney(installment.fee)}</td>
          <td><strong>${fmtMoney(total)}</strong></td>
          <td><span class="badge ${statusClass}">${installment.status.toUpperCase()}</span></td>
        </tr>
      `;
    })
    .join("");

  el.installmentBody.querySelectorAll("tr").forEach((row) => {
    const toggle = row.querySelector(".installment-toggle");
    const id = Number(row.dataset.installmentId);

    toggle.addEventListener("change", () => {
      if (toggle.checked) {
        state.selectedInstallments.add(id);
      } else {
        state.selectedInstallments.delete(id);
      }
      renderEverything();
      addAuditEntry("Cuotas actualizadas", `Se ${toggle.checked ? "agrego" : "quito"} la cuota ${id} del acuerdo.`);
    });

    row.addEventListener("click", (event) => {
      if (event.target instanceof HTMLInputElement) return;
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  el.toggleAllInstallments.checked = customer.installments.every((installment) => state.selectedInstallments.has(installment.id));
}

function renderEvidence(customer) {
  el.fileList.innerHTML = state.files
    .map(
      (file) => `
        <div class="file-item">
          <div>
            <div class="file-item__name">${file.name}</div>
            <div class="file-item__meta">${file.type} | ${file.size}</div>
          </div>
          <span class="status-pill status-pill--info">Adjunto</span>
        </div>
      `,
    )
    .join("");

  el.ocrFileName.value = customer.ocr.fileName;
  el.ocrTransferId.value = customer.ocr.transferId;
  el.ocrSenderName.value = customer.ocr.senderName;
  el.ocrSenderRut.value = customer.ocr.senderRut;
  el.ocrBankOrigin.value = customer.ocr.bankOrigin;
  el.ocrBankDest.value = customer.ocr.bankDest;
  el.ocrDate.value = customer.ocr.date;
  el.ocrAmount.value = customer.ocr.amount;
  el.ocrNote.value = customer.ocr.note;
}

function renderSnapshot(customer) {
  el.activeCustomerName.textContent = customer.name;
  el.activeCustomerRut.textContent = `RUT ${customer.rut}`;
  el.activeCustomerOperation.textContent = `Operacion ${customer.operation}`;
  el.activeCustomerCampaign.textContent = customer.campaign;
  el.activeCustomerExecutive.textContent = customer.executive;
  el.activeCustomerPortfolio.textContent = customer.cartera;
  el.activeCustomerChannel.textContent = customer.channel;
  el.activeCustomerDueDate.textContent = fmtShortDate(customer.dueDate);
  el.snapshotCapital.textContent = fmtMoney(customer.monaco.capital);
  el.snapshotMoratory.textContent = fmtMoney(customer.monaco.moratory);
  el.snapshotFees.textContent = fmtMoney(customer.monaco.fees);
  el.snapshotTotal.textContent = fmtMoney(customer.monaco.total);
  el.monacoRefresh.textContent = `Monaco sincronizado ${new Date(customer.monacoRefresh).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function updateMetrics(customer) {
  const selectedTotal = sumSelected(customer);
  const lateInterest = computeLateInterest(customer);
  const expectedTotal = selectedTotal + lateInterest;
  const transferAmount = Number(el.transferAmount.value || 0);
  const diff = transferAmount - expectedTotal;
  const tolerance = Number(el.toleranceAmount.value || 0);
  const lateDays = Math.max(0, diffDays(el.paymentDate.value, el.commitmentDate.value));
  const withinTolerance = Math.abs(diff) <= tolerance;
  const exactTransfer = Math.abs(Number(el.ocrAmount.value || 0) - transferAmount) <= 0;

  el.selectedAmount.textContent = fmtMoney(selectedTotal);
  el.lateInterest.textContent = fmtMoney(lateInterest);
  el.expectedTotal.textContent = fmtMoney(expectedTotal);
  el.differenceTotal.textContent = `${diff < 0 ? "-" : "+"}${fmtMoney(Math.abs(diff))}`;
  el.metricExpected.textContent = fmtMoney(expectedTotal);
  el.metricTransferred.textContent = fmtMoney(transferAmount);
  el.metricDelay.textContent = `${lateDays} dia(s)`;

  if (withinTolerance && exactTransfer) {
    el.metricState.textContent = "Cuadrado";
    el.validationState.textContent = "Listo para enviar";
    el.validationState.className = "status-pill status-pill--success";
  } else if (diff > tolerance) {
    el.metricState.textContent = "Excedente";
    el.validationState.textContent = "Requiere ajuste";
    el.validationState.className = "status-pill status-pill--warning";
  } else {
    el.metricState.textContent = "Faltante";
    el.validationState.textContent = "En revision";
    el.validationState.className = "status-pill status-pill--danger";
  }

  el.sidebarStatus.textContent = withinTolerance ? "3 casos listos" : "Caso activo en revisión";
  el.sidebarSubtitle.textContent =
    lateDays > 0 ? `Se recalcula mora por ${lateDays} dia(s) de atraso.` : "El caso no tiene atraso sobre el compromiso.";

  return { selectedTotal, lateInterest, expectedTotal, diff, withinTolerance, exactTransfer };
}

function renderValidation(customer, metrics) {
  const items = buildValidation(customer, metrics.expectedTotal, metrics.lateInterest, metrics.diff);

  el.validationChecklist.innerHTML = items
    .map((item) => {
      const stateClass = item.ok ? "is-ok" : item.warn ? "is-warn" : "is-bad";
      const icon = item.ok ? "OK" : item.warn ? "!" : "X";
      return `
        <div class="check-item ${stateClass}">
          <div class="check-item__icon">${icon}</div>
          <div class="check-item__copy">
            <strong>${item.title}</strong>
            <span>${item.desc}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderExceptions() {
  el.exceptionList.innerHTML = state.exceptions.length
    ? state.exceptions
        .map(
          (item) => `
            <div class="exception-item">
              <div class="exception-item__top">
                <div>
                  <div class="exception-item__title">${item.code} | ${item.title}</div>
                  <div class="exception-item__desc">${item.desc}</div>
                </div>
                <span class="status-pill status-pill--danger">Abierta</span>
              </div>
            </div>
          `,
        )
        .join("")
    : `
      <div class="exception-item">
        <div class="exception-item__top">
          <div>
            <div class="exception-item__title">Sin excepciones abiertas</div>
            <div class="exception-item__desc">El caso activo quedo dentro de la tolerancia configurada.</div>
          </div>
          <span class="status-pill status-pill--success">OK</span>
        </div>
      </div>
    `;

  el.exceptionCount.textContent = `${state.exceptions.length} abierta${state.exceptions.length === 1 ? "" : "s"}`;
}

function renderAudit() {
  el.auditTimeline.innerHTML = state.audit
    .slice()
    .reverse()
    .map(
      (item) => `
        <div class="audit-item">
          <div class="audit-item__time">${item.time}</div>
          <strong>${item.title}</strong>
          <div class="audit-item__desc">${item.desc}</div>
        </div>
      `,
    )
    .join("");
}

function updateWorkflowHint() {
  const customer = getActiveCustomer();
  const stage = stages[state.stageIndex];
  el.workflowHint.textContent = `${stage.title} | ${customer.statusLabel}`;
}

function addAuditEntry(title, desc) {
  const now = new Date();
  const entry = {
    time: now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    title,
    desc,
  };
  state.audit.push(entry);
  renderAudit();
}

function selectCustomer(customerId) {
  const customer = getCustomer(customerId);
  state.activeCustomerId = customer.id;
  state.stageIndex = customer.stageIndex;
  state.selectedInstallments = new Set(customer.installments.filter((item) => item.selected).map((item) => item.id));
  state.files = [...customer.evidence];
  state.audit = customer.audit;
  state.exceptions = customer.exceptions;
  applySelectedCustomerDefaults(customer);
  renderEverything();
  showToast(`Caso ${customer.operation} cargado`);
}

function exportReport() {
  const customer = getActiveCustomer();
  const metrics = updateMetrics(customer);
  const report = {
    cliente: customer.name,
    rut: customer.rut,
    operacion: customer.operation,
    cartera: customer.cartera,
    stage: stages[state.stageIndex].title,
    monto_transferido: Number(el.transferAmount.value || 0),
    monto_esperado: metrics.expectedTotal,
    diferencia: metrics.diff,
    cuotas_seleccionadas: customer.installments
      .filter((item) => state.selectedInstallments.has(item.id))
      .map((item) => item.number),
    ocr: {
      archivo: el.ocrFileName.value,
      id_transferencia: el.ocrTransferId.value,
      banco_origen: el.ocrBankOrigin.value,
      banco_destino: el.ocrBankDest.value,
      fecha: el.ocrDate.value,
      monto: Number(el.ocrAmount.value || 0),
    },
    timestamp: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tanner_resumen_${customer.operation}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Resumen descargado");
}

function updateSidebarCounts() {
  const ready = customers.filter((customer) => Math.abs(sumSelected(customer) - customer.monaco.total) <= customer.tolerance).length;
  const pending = customers.length - ready;
  el.sidebarProcessed.textContent = String(customers.length * 8);
  el.sidebarPending.textContent = String(pending);
  el.sidebarStatus.textContent = `${ready} casos listos`;
}

function renderEverything() {
  const customer = getActiveCustomer();
  renderCustomerList();
  renderSnapshot(customer);
  renderHeroChips(customer);
  renderStageRail(customer);
  renderInstallments(customer);
  renderEvidence(customer);
  const metrics = updateMetrics(customer);
  renderValidation(customer, metrics);
  renderExceptions();
  renderAudit();
  updateWorkflowHint();
  updateSidebarCounts();
}

function syncCustomerInputs() {
  const customer = getActiveCustomer();
  customer.transferAmount = Number(el.transferAmount.value || 0);
  customer.commitmentDate = el.commitmentDate.value;
  customer.paymentDate = el.paymentDate.value;
  customer.tolerance = Number(el.toleranceAmount.value || 0);
  customer.ocr.fileName = el.ocrFileName.value;
  customer.ocr.transferId = el.ocrTransferId.value;
  customer.ocr.senderName = el.ocrSenderName.value;
  customer.ocr.senderRut = el.ocrSenderRut.value;
  customer.ocr.bankOrigin = el.ocrBankOrigin.value;
  customer.ocr.bankDest = el.ocrBankDest.value;
  customer.ocr.date = el.ocrDate.value;
  customer.ocr.amount = Number(el.ocrAmount.value || 0);
  customer.ocr.note = el.ocrNote.value;
}

function applySelectedCustomerDefaults(customer) {
  el.transferAmount.value = customer.transferAmount;
  el.commitmentDate.value = customer.commitmentDate;
  el.paymentDate.value = customer.paymentDate;
  el.toleranceAmount.value = customer.tolerance;
}

function markCartola() {
  const customer = getActiveCustomer();
  addAuditEntry("Cartola marcada", `Se fijo la conciliacion sobre ${customer.operation} y quedo lista para trazabilidad.`);
  showToast("Cartola marcada como conciliada");
}

function createAgreement() {
  const customer = getActiveCustomer();
  state.stageIndex = Math.max(state.stageIndex, 1);
  customer.stageIndex = state.stageIndex;
  addAuditEntry("Acuerdo creado", `Se genero el acuerdo de pago para ${customer.operation}.`);
  showToast("Acuerdo generado");
  renderEverything();
}

function openException() {
  const customer = getActiveCustomer();
  const entry = {
    code: `E-${String(state.exceptions.length + 1).padStart(2, "0")}`,
    title: "Revision manual",
    desc: `Caso ${customer.operation} derivado por discrepancia o validacion bancaria pendiente.`,
  };
  state.exceptions.unshift(entry);
  state.stageIndex = Math.max(state.stageIndex, 4);
  customer.stageIndex = state.stageIndex;
  addAuditEntry("Excepcion abierta", `Se derivo ${customer.operation} a revision manual.`);
  showToast("Derivado a excepcion");
  renderEverything();
}

function approveAndSend() {
  const customer = getActiveCustomer();
  const metrics = updateMetrics(customer);
  if (!metrics.withinTolerance || !metrics.exactTransfer) {
    openException();
    return;
  }

  state.stageIndex = stages.length - 1;
  customer.stageIndex = state.stageIndex;
  addAuditEntry("Enviado a Fluxu", `El caso ${customer.operation} se envió con exito a Fluxu.`);
  showToast("Caso enviado a Fluxu");
  renderEverything();
}

function bindEvents() {
  el.customerSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderCustomerList();
  });

  el.transferAmount.addEventListener("input", () => {
    syncCustomerInputs();
    renderEverything();
  });
  el.commitmentDate.addEventListener("change", () => {
    syncCustomerInputs();
    renderEverything();
  });
  el.paymentDate.addEventListener("change", () => {
    syncCustomerInputs();
    renderEverything();
  });
  el.toleranceAmount.addEventListener("input", () => {
    syncCustomerInputs();
    renderEverything();
  });

  [el.ocrFileName, el.ocrTransferId, el.ocrSenderName, el.ocrSenderRut, el.ocrBankOrigin, el.ocrBankDest, el.ocrDate, el.ocrAmount, el.ocrNote].forEach(
    (input) => {
      input.addEventListener("input", () => {
        syncCustomerInputs();
        renderEverything();
      });
    },
  );

  el.toggleAllInstallments.addEventListener("change", () => {
    const customer = getActiveCustomer();
    customer.installments.forEach((installment) => {
      if (el.toggleAllInstallments.checked) {
        state.selectedInstallments.add(installment.id);
      } else {
        state.selectedInstallments.delete(installment.id);
      }
    });
    renderEverything();
    addAuditEntry("Cuotas masivas", el.toggleAllInstallments.checked ? "Se seleccionaron todas las cuotas." : "Se limpiaron todas las cuotas.");
  });

  el.evidenceInput.addEventListener("change", (event) => {
    const customer = getActiveCustomer();
    const pickedFiles = Array.from(event.target.files || []);
    if (!pickedFiles.length) return;

    const mapped = pickedFiles.map((file) => ({
      name: file.name,
      type: (file.type || "archivo").split("/").pop().toUpperCase(),
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    }));

    state.files = [...mapped, ...state.files];
    customer.evidence = [...state.files];
    el.evidenceState.textContent = "Evidencia cargada";
    addAuditEntry("Evidencia agregada", `${pickedFiles.length} archivo(s) nuevo(s) se sumaron al caso.`);
    renderEverything();
    event.target.value = "";
  });

  el.saveDraftBtn.addEventListener("click", () => {
    const customer = getActiveCustomer();
    syncCustomerInputs();
    addAuditEntry("Borrador guardado", `Se guardo un snapshot operativo del caso ${customer.operation}.`);
    showToast("Borrador guardado");
  });

  el.createAgreementBtn.addEventListener("click", createAgreement);
  el.markCartolaBtn.addEventListener("click", markCartola);
  el.openExceptionBtn.addEventListener("click", openException);
  el.approveBtn.addEventListener("click", approveAndSend);
  el.addAuditBtn.addEventListener("click", () => {
    const customer = getActiveCustomer();
    addAuditEntry("Nota manual", `Se agrego una nota de seguimiento para ${customer.operation}.`);
    showToast("Nota registrada");
  });
  el.sendFluxuBtn.addEventListener("click", approveAndSend);
  el.downloadReportBtn.addEventListener("click", exportReport);
}

function init() {
  const customer = getActiveCustomer();
  state.selectedInstallments = new Set(customer.installments.filter((item) => item.selected).map((item) => item.id));
  applySelectedCustomerDefaults(customer);
  bindEvents();
  syncCustomerInputs();
  renderEverything();
}

init();
