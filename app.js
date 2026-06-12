const state = {
  index: null,
  reportCache: new Map(),
  currentDate: null,
};

const money = (value) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const num = (value, digits = 2) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));

const pct = (value) => `${num(value, 1)}%`;

function getDateEntry(date) {
  return state.index.dates.find((entry) => entry.date === date);
}

async function getReport(date) {
  if (state.reportCache.has(date)) {
    return state.reportCache.get(date);
  }

  const entry = getDateEntry(date);
  if (!entry) {
    return null;
  }

  const response = await fetch(entry.file, { cache: "no-store" });
  const report = await response.json();
  state.reportCache.set(date, report);
  return report;
}

function renderKpis(report) {
  const items = [
    ["Costo MO", money(report.summary.labor_total_cost)],
    ["Costo diesel", money(report.summary.diesel_total_cost)],
    ["Costo total", money(report.summary.total_operating_cost)],
    ["Jornales", num(report.summary.labor_total_jornales)],
    ["Horas extra", num(report.summary.labor_total_hex, 1)],
    ["Litros", num(report.summary.diesel_total_liters)],
    ["Avance ha", num(report.summary.diesel_total_avance_ha)],
    ["Observaciones", num(report.summary.observation_count, 0)],
  ];

  document.querySelector("#kpi-grid").innerHTML = items
    .map(
      ([label, value]) => `
        <article class="kpi">
          <div class="kpi-label">${label}</div>
          <div class="kpi-value">${value}</div>
        </article>
      `,
    )
    .join("");
}

function renderAlerts(report) {
  const rows = report.highlights.strongest_variations.length
    ? report.highlights.strongest_variations
    : report.detail.labor.slice(0, 4);

  document.querySelector("#alerts-list").innerHTML = rows
    .map(
      (row) => `
        <article class="stack-item">
          <strong>${row.labor}</strong>
          <div>${row.cuadro}</div>
          <div class="stack-meta">
            <span>${row.rendimiento ? `${num(row.rendimiento, 2)} ha` : "Sin rendimiento"}</span>
            <span>${row.costo_ha ? `${money(row.costo_ha)}/ha` : "Sin costo/ha"}</span>
            ${row.var_costo_ha_pct != null ? `<span class="badge">Var ${pct(row.var_costo_ha_pct)}</span>` : ""}
          </div>
        </article>
      `,
    )
    .join("");
}

function renderQuestions(report) {
  const rows = report.detail.questions.length
    ? report.detail.questions
    : [{ tema: "Sin preguntas", pregunta: "No hubo preguntas criticas para esta fecha." }];

  document.querySelector("#questions-list").innerHTML = rows
    .map(
      (row) => `
        <article class="stack-item">
          <strong>${row.tema}</strong>
          <div>${row.pregunta}</div>
          ${row.tipo ? `<div class="stack-meta"><span>${row.tipo}</span></div>` : ""}
        </article>
      `,
    )
    .join("");
}

function buildLaborTable(report) {
  const rows = report.detail.labor;
  return `
    <table>
      <thead>
        <tr>
          <th>Cuadro</th>
          <th>Labor</th>
          <th>Jornales</th>
          <th>Hrs extra</th>
          <th>Costo</th>
          <th>Rend.</th>
          <th>Costo/ha</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${row.cuadro}</td>
                <td>${row.labor}</td>
                <td>${num(row.jornales)}</td>
                <td>${num(row.horas_extras, 1)}</td>
                <td>${money(row.costo_total)}</td>
                <td>${row.rendimiento != null ? num(row.rendimiento, 2) : "-"}</td>
                <td>${row.costo_ha != null ? money(row.costo_ha) : "-"}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function buildDieselTable(report) {
  const rows = report.detail.diesel;
  return `
    <table>
      <thead>
        <tr>
          <th>Unidad</th>
          <th>Operador</th>
          <th>Actividad</th>
          <th>Cuadro</th>
          <th>Litros</th>
          <th>Avance ha</th>
          <th>Lts/ha</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${row.unidad}</td>
                <td>${row.operador}</td>
                <td>${row.actividad}</td>
                <td>${row.cuadro}</td>
                <td>${num(row.litros)}</td>
                <td>${row.avance_ha != null ? num(row.avance_ha, 2) : "-"}</td>
                <td>${row.lts_ha != null ? num(row.lts_ha, 2) : "-"}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function buildProgressCards(rows, currentDate) {
  const byCuadro = new Map();
  rows.forEach((row) => {
    if (!byCuadro.has(row.cuadro)) {
      byCuadro.set(row.cuadro, []);
    }
    byCuadro.get(row.cuadro).push(row);
  });

  return [...byCuadro.entries()]
    .map(([cuadro, items]) => {
      const plan = items[0]?.crop_plan || "Sin plan";
      const list = items
        .filter((item) => item.actividad !== "Sin actividad con avance capturado")
        .map(
          (item) => `
            <article class="progress-item ${item.ultimo_reporte === currentDate ? "is-today" : ""}">
              <div class="progress-item-head">
                <span>${item.actividad}</span>
                <span>${item.avance_acum_ha != null ? `${num(item.avance_acum_ha, 2)} ha` : "-"}</span>
              </div>
              <div class="progress-item-meta">
                <span>${item.status}</span>
                <span>${item.pasadas_estimadas != null ? `${num(item.pasadas_estimadas, 2)} pasadas` : "Sin pasadas"}</span>
                <span>${item.ultimo_reporte || "Sin fecha"}</span>
              </div>
            </article>
          `,
        )
        .join("");

      return `
        <section class="progress-card">
          <div class="progress-top">
            <div class="progress-title">
              <h3>${cuadro}</h3>
              <span class="badge">${items.length} actividades</span>
            </div>
            <div class="progress-plan">${plan}</div>
          </div>
          <div class="progress-list">${list || '<article class="progress-item">Sin actividades registradas</article>'}</div>
        </section>
      `;
    })
    .join("");
}

function renderHighlights(report) {
  document.querySelector("#top-labor-list").innerHTML = report.highlights.labor_top_cost
    .slice(0, 6)
    .map(
      (row) => `
        <article class="stack-item">
          <strong>${row.labor}</strong>
          <div>${row.cuadro}</div>
          <div class="stack-meta"><span>${money(row.costo_total)}</span></div>
        </article>
      `,
    )
    .join("");

  document.querySelector("#top-diesel-list").innerHTML = report.highlights.diesel_top_cost
    .slice(0, 6)
    .map(
      (row) => `
        <article class="stack-item">
          <strong>${row.actividad}</strong>
          <div>Unidad ${row.unidad} - ${row.cuadro}</div>
          <div class="stack-meta"><span>${money(row.costo_diesel || 0)}</span></div>
        </article>
      `,
    )
    .join("");
}

async function renderReport() {
  const report = await getReport(state.currentDate);
  if (!report) return;

  document.querySelector("#hero-note").textContent = `Ultima fecha visible: ${state.index.meta.latest_date}. Actualmente viendo ${report.date}.`;
  renderKpis(report);
  renderAlerts(report);
  renderQuestions(report);
  renderHighlights(report);
  document.querySelector("#labor-table").innerHTML = buildLaborTable(report);
  document.querySelector("#diesel-table").innerHTML = buildDieselTable(report);
  document.querySelector("#tractor-progress").innerHTML = buildProgressCards(report.progress.tractor, report.date);
  document.querySelector("#labor-progress").innerHTML = buildProgressCards(report.progress.labor, report.date);
}

function bindTabs() {
  document.querySelector("#tabbar").addEventListener("click", (event) => {
    const button = event.target.closest(".tab-button");
    if (!button) return;
    const tab = button.dataset.tab;

    document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("is-active"));

    button.classList.add("is-active");
    document.querySelector(`#tab-${tab}`).classList.add("is-active");
  });
}

function bindDateSelector() {
  const select = document.querySelector("#report-date");
  select.innerHTML = state.index.meta.dates_available
    .map((date) => `<option value="${date}">${date}</option>`)
    .join("");
  select.value = state.currentDate;
  select.addEventListener("change", async (event) => {
    state.currentDate = event.target.value;
    await renderReport();
  });
}

async function init() {
  const response = await fetch("./data/index.json", { cache: "no-store" });
  state.index = await response.json();
  state.currentDate = state.index.meta.latest_date;
  bindDateSelector();
  bindTabs();
  await renderReport();
}

init();
