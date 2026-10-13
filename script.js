/* ===================================================================
   Дублёр — лендинг. Все изменяемые данные — в CONFIG.
   =================================================================== */
const CONFIG = {
  brand: "Дублёр",
  legalName: "ООО «Дублёр»",
  legalFull: "Общество с ограниченной ответственностью «Дублёр»",
  ogrn: "0000000000000",
  inn: "0000000000",
  kpp: "000000000",
  address: "[индекс, город, улица, дом]",
  bank: "[банк, БИК, р/с, к/с]",
  director: "[ФИО генерального директора]",

  phone: "+7 (000) 000-00-00",   // как показывать
  phoneHref: "+70000000000",     // для ссылки tel:
  email: "info@example.ru",

  deadline: "2026-10-27T23:59:59+03:00", // до какого момента действуют условия
  deadlineText: "27 октября",

  // НДС: цены ниже указаны БЕЗ НДС, на сайте показываются с НДС по этой ставке.
  // 0 — освобождены (УСН, доход за прошлый год до 20 млн ₽ в 2026 г.); 5 или 7 — пониженные ставки УСН; 22 — общая.
  vatRate: 5,

  consentVersion: "13.10.2026",
  // Обработчик заявок: адрес на сервере в РФ, принимающий POST с JSON. Пока пусто — посетитель увидит телефон и почту.
  endpoint: ""
};

/* Цены без НДС */
const PACKAGES = {
  start: { name: "Старт",   works: 160000, support: 29000, hardware: 405000 },
  biz:   { name: "Бизнес",  works: 320000, support: 45000, hardware: 660000 },
  res:   { name: "Резерв+", works: 560000, support: 75000, hardware: 1130000 }
};
const PROCUREMENT_FEE = 0.10; // подбор и сопровождение закупки, доля от стоимости оборудования
const PAY_NAMES = { split: "по этапам", std: "50/50", pre: "предоплата", inst: "рассрочка 6 мес." };

/* ===== Вспомогательные ===== */
const vat = (net) => Math.round(net * (1 + CONFIG.vatRate / 100));
const num = (n) => Math.round(n).toLocaleString("ru-RU").replace(/ /g, " ");
const rub = (n) => num(n) + " ₽";
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const $ = (sel) => document.querySelector(sel);
const state = () => ({
  pkg: $('input[name="pkg"]:checked')?.value || "biz",
  support: $('input[name="support"]:checked')?.value || "on",
  pay: $('input[name="pay"]:checked')?.value || "split"
});
const requisitesLine = () => `ОГРН ${CONFIG.ogrn}, ИНН ${CONFIG.inn}, КПП ${CONFIG.kpp}`;

/* ===== Реквизиты и контакты ===== */
function fillContacts() {
  const map = {
    brand: CONFIG.brand,
    "legal-name": CONFIG.legalName,
    "legal-full": CONFIG.legalFull,
    requisites: requisitesLine(),
    address: "Юридический адрес: " + CONFIG.address,
    "deadline-text": CONFIG.deadlineText,
    "email-text": CONFIG.email,
    "consent-version": CONFIG.consentVersion
  };
  document.querySelectorAll("[data-fill]").forEach((el) => {
    const k = el.dataset.fill;
    if (k in map) el.textContent = map[k];
    if (k === "phone") { el.textContent = CONFIG.phone; el.setAttribute("href", "tel:" + CONFIG.phoneHref); }
    if (k === "email") { el.textContent = CONFIG.email; el.setAttribute("href", "mailto:" + CONFIG.email); }
  });
  document.querySelectorAll('[data-fill-href="tel"]').forEach((el) => el.setAttribute("href", "tel:" + CONFIG.phoneHref));
  const y = $("#year"); if (y) y.textContent = String(new Date().getFullYear());

  const rows = [
    ["Полное наименование", CONFIG.legalFull],
    ["Сокращённое наименование", CONFIG.legalName],
    ["ОГРН", CONFIG.ogrn], ["ИНН", CONFIG.inn], ["КПП", CONFIG.kpp],
    ["Юридический адрес", CONFIG.address],
    ["Банковские реквизиты", CONFIG.bank],
    ["Генеральный директор", CONFIG.director],
    ["Телефон", CONFIG.phone], ["Эл. почта", CONFIG.email],
    ["НДС", CONFIG.vatRate > 0 ? `Плательщик НДС, ставка ${CONFIG.vatRate}%` : "Не облагается (УСН)"]
  ];
  const dl = $("#req-list");
  if (dl) dl.replaceChildren(...rows.flatMap(([t, d]) => {
    const dt = document.createElement("dt"); dt.textContent = t;
    const dd = document.createElement("dd"); dd.textContent = d;
    return [dt, dd];
  }));
}

/* ===== Цены с НДС в тексте страницы ===== */
function fillMoney() {
  document.querySelectorAll("[data-money]").forEach((el) => {
    const v = vat(Number(el.dataset.money));
    el.textContent = /₽/.test(el.textContent) ? rub(v) : num(v);
  });
  document.querySelectorAll("[data-vat-of]").forEach((el) => {
    const net = Number(el.dataset.vatOf);
    el.textContent = CONFIG.vatRate > 0 ? `в т. ч. НДС ${CONFIG.vatRate}% — ${rub(vat(net) - net)}` : "НДС не облагается";
  });
  document.querySelectorAll("[data-vat-note]").forEach((el) => {
    el.textContent = CONFIG.vatRate > 0
      ? `Цены наших работ и сопровождения указаны с НДС ${CONFIG.vatRate}%.`
      : "НДС не облагается (упрощённая система налогообложения).";
  });
}

/* ===== Обратный отсчёт ===== */
function countdown() {
  const el = $("#countdown");
  if (!el) return;
  const left = new Date(CONFIG.deadline).getTime() - Date.now();
  if (left <= 0) { el.textContent = "Срок предложения истёк, условия — по запросу."; return; }
  const days = Math.floor(left / 86400000);
  el.textContent = days < 1 ? "Остался последний день." : `${plural(days, "Остался", "Осталось", "Осталось")} ${days} ${plural(days, "день", "дня", "дней")}.`;
}

/* ===== «Сейчас / С Дублёром» на телефоне ===== */
function tabs() {
  const buttons = document.querySelectorAll(".switch [data-tab]");
  buttons.forEach((btn) => btn.addEventListener("click", () => {
    buttons.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
    $("#panel-before").classList.toggle("is-active", btn.dataset.tab === "before");
    $("#panel-after").classList.toggle("is-active", btn.dataset.tab === "after");
  }));
}

/* ===== Расчёт ===== */
function schedule(total, mode) {
  switch (mode) {
    case "pre": return { total: total * 0.95, rows: [["При подписании сметы, скидка 5%", total * 0.95]], note: "Экономия " + rub(total * 0.05) + "." };
    case "std": return { total, rows: [["При подписании сметы", total * 0.5], ["По акту сдачи", total * 0.5]], note: "" };
    case "inst": {
      const first = total * 0.4, rest = total * 0.6 * 1.08;
      return { total: first + rest, rows: [["При подписании сметы", first], ["Ежемесячно, 6 платежей после сдачи", rest / 6]],
        note: "Удорожание остатка 8% (" + rub(rest - total * 0.6) + "). Оформляется в договоре как коммерческий кредит." };
    }
    default: return { total, rows: [["При подписании сметы", total * 0.3], ["После запуска главной системы (до 5-го дня)", total * 0.4], ["По акту сдачи (до 14-го дня)", total * 0.3]],
      note: "Без переплаты: вы платите по мере того, как видите результат." };
  }
}
const li = (label, value, cls) => {
  const el = document.createElement("li"); if (cls) el.className = cls;
  const a = document.createElement("span"); a.textContent = label;
  const b = document.createElement("span"); b.textContent = value;
  el.append(a, b); return el;
};

function updateCalc() {
  const s = state();
  const p = PACKAGES[s.pkg];
  const works = vat(p.works);
  const sched = schedule(works, s.pay);
  const fee = vat(p.hardware * PROCUREMENT_FEE);
  const supportMonth = vat(p.support);
  const on = s.support === "on";

  $("#pay-list").replaceChildren(...sched.rows.map(([l, v]) => li(l, rub(v))));
  $("#pay-note").textContent = sched.note;

  const year = [
    li(`Работы, пакет «${p.name}»${CONFIG.vatRate ? ", с НДС" : ""}`, rub(sched.total)),
    li("Подбор и сопровождение закупки (10%)", rub(fee)),
    li("Оборудование — платите продавцу напрямую, ориентир", rub(p.hardware)),
    on ? li("Сопровождение, 12 месяцев", rub(supportMonth * 12)) : li("Сопровождение — отказ", "0 ₽", "is-off")
  ];
  $("#year-list").replaceChildren(...year);
  $("#year-total").textContent = rub(sched.total + fee + p.hardware + (on ? supportMonth * 12 : 0));
  $("#month-total").textContent = on ? rub(supportMonth) : `0 ₽ + вызовы по ${rub(vat(5000))}/ч`;

  $("#sup-price").textContent = rub(supportMonth) + "/мес";
  $("#optout-note").hidden = on;
  const st = $("#support-state");
  if (st) st.textContent = on ? "Сейчас в расчёте: с сопровождением." : "Сейчас в расчёте: без сопровождения.";
  document.querySelectorAll("[data-support]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.support === s.support)));

  const choice = $("#form-choice");
  if (choice) choice.textContent = `Ваш выбор: пакет «${p.name}», оплата ${PAY_NAMES[s.pay]}, ${on ? "с сопровождением" : "без сопровождения"}. Изменить можно в расчёте выше.`;
}

function calc() {
  document.querySelectorAll('input[name="pkg"], input[name="pay"], input[name="support"]').forEach((i) => i.addEventListener("change", updateCalc));
  document.querySelectorAll("[data-support]").forEach((btn) => btn.addEventListener("click", () => {
    const r = document.getElementById(btn.dataset.support === "off" ? "sup-off" : "sup-on");
    r.checked = true; updateCalc();
    document.getElementById("support-seg").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }));
  updateCalc();
}

/* ===== Окна: согласие, политика, реквизиты ===== */
function dialogs() {
  document.querySelectorAll("[data-open]").forEach((btn) => btn.addEventListener("click", () => {
    const d = document.getElementById(btn.dataset.open);
    if (!d) return;
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }));
  document.querySelectorAll("dialog").forEach((d) => {
    d.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => (d.close ? d.close() : d.removeAttribute("open"))));
    d.addEventListener("click", (e) => { if (e.target === d && d.close) d.close(); });
  });
}

/* ===== Заявка ===== */
function form() {
  const f = $("#form"), phone = $("#f-phone"), phoneErr = $("#f-phone-err");
  const consent = $("#f-consent"), consentErr = $("#f-consent-err");
  const result = $("#form-result"), submit = $("#f-submit");
  const show = (text, warn) => { result.textContent = text; result.classList.toggle("is-warn", !!warn); result.hidden = false; };
  const mark = (input, err, bad) => { if (bad) { input.setAttribute("aria-invalid", "true"); err.hidden = false; } else { input.removeAttribute("aria-invalid"); err.hidden = true; } };

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phoneBad = phone.value.replace(/\D/g, "").length < 10;
    const consentBad = !consent.checked;
    mark(phone, phoneErr, phoneBad); mark(consent, consentErr, consentBad);
    if (phoneBad) { phone.focus(); return; }
    if (consentBad) { consent.focus(); return; }

    const s = state();
    const data = {
      name: f.name.value.trim(), phone: phone.value.trim(), company: f.company.value.trim(),
      down: [...f.querySelectorAll('input[name="down"]:checked')].map((i) => i.value),
      package: s.pkg, support: s.support, payment: s.pay,
      consent: { given: true, version: CONFIG.consentVersion, at: new Date().toISOString() },
      page: location.href
    };

    if (!CONFIG.endpoint) {
      console.warn("Заявка не отправлена: в script.js не указан CONFIG.endpoint.", data);
      show(`Онлайн-отправка заявок пока не подключена. Позвоните или напишите нам: ${CONFIG.phone}, ${CONFIG.email}.`, true);
      return;
    }
    submit.disabled = true; submit.textContent = "Отправляем…";
    try {
      const r = await fetch(CONFIG.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error(String(r.status));
      f.reset(); updateCalc();
      show("Заявка отправлена. Мы перезвоним, чтобы согласовать время выезда.");
    } catch (_) {
      show(`Заявку не удалось отправить. Позвоните нам: ${CONFIG.phone}.`, true);
    } finally {
      submit.disabled = false; submit.textContent = "Вызвать специалиста";
    }
  });
  phone.addEventListener("input", () => { if (phone.value.replace(/\D/g, "").length >= 10) mark(phone, phoneErr, false); });
  consent.addEventListener("change", () => { if (consent.checked) mark(consent, consentErr, false); });
}

function start() {
  fillContacts(); fillMoney(); countdown(); setInterval(countdown, 60000);
  tabs(); calc(); dialogs(); form();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
