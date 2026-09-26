(function () {
  "use strict";
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;

  var KEYS = { employees: "att_employees_v1", records: "att_records_v1", settings: "att_settings_v1" };
  var STATUS = {
    present: { label: "حاضر", short: "ح", color: "#22C55E" },
    absent: { label: "غائب", short: "غ", color: "#EF4444" },
    late: { label: "متأخر", short: "ت", color: "#F59E0B" },
    leave: { label: "إجازة", short: "إ", color: "#3B82F6" },
    sick: { label: "مرضي", short: "م", color: "#A855F7" }
  };
  var ORDER = ["present", "absent", "late", "leave", "sick"];
  var WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  var MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  var C = { bg: "#0F1420", panel: "#171E2E", panel2: "#1B2436", border: "#2A3346", text: "#E7ECF7", dim: "#8B93A7", accent: "#4C7CF3" };

  function load(k, fallback) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function date(s) { var p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function displayDate(s) { return s ? s.split("-").reverse().join("/") : ""; }
  function daysBetween(from, to) { var a = date(from), b = date(to), out = []; for (var d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) out.push(new Date(d)); return out; }
  function firstDayOfMonth() { var d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)); }
  function today() { return iso(new Date()); }
  function inputStyle() { return { background: C.panel2, border: "1px solid " + C.border, color: C.text, borderRadius: 9, padding: "9px 11px", fontFamily: "inherit", fontSize: 13 }; }
  function Btn(p) { return h("button", { type: "button", onClick: p.onClick, style: Object.assign({ border: "1px solid " + (p.active ? p.activeColor || C.accent : C.border), background: p.active ? p.activeColor || C.accent : "transparent", color: p.color || "#fff", padding: p.small ? "6px 10px" : "9px 15px", borderRadius: 9, fontWeight: 700, cursor: "pointer" }, p.style || {}) }, p.children); }
  function Card(p) { return h("div", { style: Object.assign({ background: C.panel, border: "1px solid " + C.border, borderRadius: 16, padding: 18, animation: "fadeIn .25s ease" }, p.style || {}) }, p.children); }
  function Stat(p) { return h("div", { style: { background: C.panel2, border: "1px solid " + C.border, borderRadius: 13, padding: "15px 12px", textAlign: "center", flex: 1, minWidth: 130 } }, [h("div", { style: { color: p.color || C.accent, fontSize: 25, fontWeight: 800 } }, p.value), h("div", { style: { color: C.dim, fontSize: 12, marginTop: 3 } }, p.label)]); }

  function ExcelExport(employees, records, from, to, employeeId) {
    if (!window.XLSX) return window.alert("مكتبة Excel غير متاحة.");
    var rows = [], dates = daysBetween(from, to);
    employees.filter(function (e) { return employeeId === "all" || e.id === employeeId; }).forEach(function (e) {
      dates.forEach(function (d) { var s = (records[e.id] || {})[iso(d)] || ""; rows.push({ "الموظف": e.name, "المسمى الوظيفي": e.jobTitle || "", "التاريخ": iso(d), "اليوم": WEEKDAYS[d.getDay()], "الحالة": s ? STATUS[s].label : "بدون تسجيل" }); });
    });
    var ws = XLSX.utils.json_to_sheet(rows); ws["!cols"] = [{ wch: 24 }, { wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 16 }];
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "التقرير"); XLSX.writeFile(wb, "تقرير_الحضور_" + from + "_" + to + ".xlsx");
  }

  function Attendance(props) {
    var employees = props.employees, records = props.records, setRecords = props.setRecords, settings = props.settings;
    var ds = useState(today()), selectedDate = ds[0], setSelectedDate = ds[1];
    var fs = useState("all"), filter = fs[0], setFilter = fs[1];
    var visible = employees.filter(function (e) { return filter === "all" || e.id === filter; });
    function mark(id, status) { var next = JSON.parse(JSON.stringify(records)); next[id] = next[id] || {}; if (next[id][selectedDate] === status) delete next[id][selectedDate]; else next[id][selectedDate] = status; setRecords(next); }
    return h("div", null, [
      h(Card, { key: "controls", style: { marginBottom: 14 } }, h("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, [
        h("label", { style: { color: C.dim } }, "التاريخ"), h("input", { type: "date", value: selectedDate, onChange: function (e) { setSelectedDate(e.target.value); }, style: inputStyle() }), h("b", { style: { color: C.dim } }, WEEKDAYS[date(selectedDate).getDay()]),
        h("select", { value: filter, onChange: function (e) { setFilter(e.target.value); }, style: Object.assign({}, inputStyle(), { marginRight: "auto" }) }, [h("option", { value: "all" }, "كل الموظفين")].concat(employees.map(function (e) { return h("option", { key: e.id, value: e.id }, e.name); })))
      ])),
      visible.map(function (e) { var current = (records[e.id] || {})[selectedDate]; return h(Card, { key: e.id, style: { padding: "13px 15px", marginBottom: 10 } }, h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } }, [h("div", null, [h("strong", null, e.name), e.jobTitle ? h("small", { style: { display: "block", color: C.dim } }, e.jobTitle) : null]), h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, ORDER.map(function (k) { return h(Btn, { key: k, small: true, active: current === k, activeColor: STATUS[k].color, onClick: function () { mark(e.id, k); } }, STATUS[k].label); }))])); }),
      !visible.length ? h(Card, null, "لا يوجد موظفون مطابقون للفلتر.") : null
    ]);
  }

  function Employees(props) {
    var ns = useState(""), name = ns[0], setName = ns[1], js = useState(""), job = js[0], setJob = js[1];
    function add() { if (!name.trim()) return; props.setEmployees(props.employees.concat({ id: "e" + Date.now(), name: name.trim(), jobTitle: job.trim() })); setName(""); setJob(""); }
    return h("div", null, [h(Card, { style: { marginBottom: 15 } }, h("div", { style: { display: "flex", gap: 9, flexWrap: "wrap" } }, [h("input", { placeholder: "اسم الموظف", value: name, onChange: function (e) { setName(e.target.value); }, style: Object.assign({}, inputStyle(), { flex: 1, minWidth: 180 }) }), h("input", { placeholder: "المسمى الوظيفي", value: job, onChange: function (e) { setJob(e.target.value); }, style: Object.assign({}, inputStyle(), { flex: 1, minWidth: 180 }) }), h(Btn, { active: true, onClick: add }, "+ إضافة موظف")])), props.employees.map(function (e) { return h(Card, { key: e.id, style: { padding: "12px 15px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" } }, [h("span", null, [h("b", null, e.name), e.jobTitle ? " — " + e.jobTitle : ""]), h(Btn, { small: true, color: "#F87171", onClick: function () { props.setEmployees(props.employees.filter(function (x) { return x.id !== e.id; })); } }, "حذف")]); })]);
  }

  function AdvancedReports(props) {
    var employees = props.employees, records = props.records, settings = props.settings;
    var fs = useState(firstDayOfMonth()), from = fs[0], setFrom = fs[1], ts = useState(today()), to = ts[0], setTo = ts[1];
    var es = useState("all"), employeeId = es[0], setEmployeeId = es[1], ss = useState("all"), statusFilter = ss[0], setStatusFilter = ss[1];
    var days = from && to && from <= to ? daysBetween(from, to) : [];
    var selected = employees.filter(function (e) { return employeeId === "all" || e.id === employeeId; });
    var stats = { present: 0, absent: 0, late: 0, leave: 0, sick: 0, unmarked: 0 };
    var rows = [];
    selected.forEach(function (e) { days.forEach(function (d) { var day = iso(d), s = (records[e.id] || {})[day] || "unmarked"; stats[s] = (stats[s] || 0) + 1; if (statusFilter === "all" || s === statusFilter) rows.push({ employee: e, date: day, status: s }); }); });
    var marked = stats.present + stats.absent + stats.late + stats.leave + stats.sick;
    var rate = marked ? Math.round((stats.present + stats.late) * 100 / marked) : 0;
    return h("div", null, [
      h(Card, { key: "filters", style: { marginBottom: 15 } }, [
        h("div", { style: { display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" } }, [h("strong", null, "تقرير متقدم"), h("span", { style: { color: C.dim } }, "من"), h("input", { type: "date", value: from, onChange: function (e) { setFrom(e.target.value); }, style: inputStyle() }), h("span", { style: { color: C.dim } }, "إلى"), h("input", { type: "date", value: to, onChange: function (e) { setTo(e.target.value); }, style: inputStyle() }), h("select", { value: employeeId, onChange: function (e) { setEmployeeId(e.target.value); }, style: inputStyle() }, [h("option", { value: "all" }, "كل الموظفين")].concat(employees.map(function (e) { return h("option", { key: e.id, value: e.id }, e.name); }))), h(Btn, { active: true, activeColor: "#22C55E", onClick: function () { ExcelExport(employees, records, from, to, employeeId); } }, "⬇️ تصدير النتائج")]),
        h("div", { style: { display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 } }, [h(Btn, { small: true, active: statusFilter === "all", onClick: function () { setStatusFilter("all"); } }, "كل الحالات")].concat(ORDER.map(function (k) { return h(Btn, { key: k, small: true, active: statusFilter === k, activeColor: STATUS[k].color, onClick: function () { setStatusFilter(k); } }, STATUS[k].label); })))
      ]),
      h("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 } }, [h(Stat, { label: "نسبة الالتزام", value: rate + "%", color: C.accent }), h(Stat, { label: "إجمالي المسجل", value: marked, color: "#22C55E" }), h(Stat, { label: "الحضور", value: stats.present, color: "#22C55E" }), h(Stat, { label: "الغياب", value: stats.absent, color: "#EF4444" }), h(Stat, { label: "التأخير", value: stats.late, color: "#F59E0B" })]),
      h(Card, { style: { marginBottom: 15 } }, [h("h3", { style: { marginTop: 0 } }, "ملخص الحالات"), h("div", { style: { display: "flex", height: 18, borderRadius: 10, overflow: "hidden", background: C.panel2, marginBottom: 13 } }, ORDER.map(function (k) { return stats[k] ? h("div", { key: k, title: STATUS[k].label + ": " + stats[k], style: { width: (stats[k] * 100 / Math.max(1, marked)) + "%", background: STATUS[k].color } }) : null; })), h("div", { style: { display: "flex", gap: 15, flexWrap: "wrap", color: C.dim, fontSize: 13 } }, ORDER.map(function (k) { return h("span", { key: k }, [h("i", { style: { display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: STATUS[k].color, marginLeft: 5 } }), STATUS[k].label + ": " + stats[k]]); }))]),
      h(Card, { style: { overflowX: "auto" } }, [h("h3", { style: { marginTop: 0 } }, "تفاصيل الفترة (" + rows.length + " سجل)"), h("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: 600 } }, [h("thead", null, h("tr", null, ["الموظف", "المسمى", "التاريخ", "اليوم", "الحالة"].map(function (x) { return h("th", { key: x, style: { textAlign: "right", padding: 10, borderBottom: "1px solid " + C.border, color: C.dim } }, x); }))), h("tbody", null, rows.map(function (r, i) { return h("tr", { key: i }, [h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border } }, r.employee.name), h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border, color: C.dim } }, r.employee.jobTitle || "—"), h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border } }, displayDate(r.date)), h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border } }, WEEKDAYS[date(r.date).getDay()]), h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border, color: r.status === "unmarked" ? C.dim : STATUS[r.status].color, fontWeight: 700 } }, r.status === "unmarked" ? "بدون تسجيل" : STATUS[r.status].label)]); }))])])
    ]);
  }

  function Settings(props) { var s = props.settings, set = props.setSettings; return h(Card, { style: { maxWidth: 700 } }, [h("h3", { style: { marginTop: 0 } }, "إعدادات النظام"), h("label", { style: { display: "block", color: C.dim, margin: "12px 0 6px" } }, "اسم الشركة"), h("input", { value: s.companyName || "", onChange: function (e) { set(Object.assign({}, s, { companyName: e.target.value })); }, style: Object.assign({}, inputStyle(), { width: "100%" }) }), h("label", { style: { display: "block", color: C.dim, margin: "12px 0 6px" } }, "رابط الشعار"), h("input", { value: s.logo || "", onChange: function (e) { set(Object.assign({}, s, { logo: e.target.value })); }, style: Object.assign({}, inputStyle(), { width: "100%" }) })]); }

  function App() {
    var ps = useState("attendance"), page = ps[0], setPage = ps[1];
    var es = useState(function () { return load(KEYS.employees, [{ id: "e1", name: "أحمد محمد", jobTitle: "محاسب" }, { id: "e2", name: "سارة علي", jobTitle: "موارد بشرية" }, { id: "e3", name: "خالد ناصر", jobTitle: "مبرمج" }]); }), employees = es[0], setEmployees = es[1];
    var rs = useState(function () { return load(KEYS.records, {}); }), records = rs[0], setRecords = rs[1];
    var ss = useState(function () { return load(KEYS.settings, { companyName: "اسم الشركة", logo: "", primaryColor: C.accent }); }), settings = ss[0], setSettings = ss[1];
    useEffect(function () { save(KEYS.employees, employees); }, [employees]); useEffect(function () { save(KEYS.records, records); }, [records]); useEffect(function () { save(KEYS.settings, settings); }, [settings]);
    var tabs = [{ id: "attendance", label: "حضور اليوم" }, { id: "employees", label: "الموظفون" }, { id: "reports", label: "التقارير المتقدمة" }, { id: "settings", label: "الإعدادات" }];
    return h("div", { className: "app-shell", style: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Cairo', sans-serif", padding: 20, direction: "rtl" } }, h("div", { style: { maxWidth: 1100, margin: "auto" } }, [
      h("header", { style: { marginBottom: 20 } }, [h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" } }, [h("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, [settings.logo ? h("img", { src: settings.logo, alt: "logo", style: { maxHeight: 42, maxWidth: 110, background: "#fff", borderRadius: 8, padding: 4 } }) : null, h("h1", { style: { margin: 0, fontSize: 28 } }, "📋 سجل الحضور")]), h("span", { style: { color: C.dim } }, settings.companyName)]), h("p", { style: { color: C.dim, margin: "7px 0 0" } }, "إدارة الحضور والتقارير بواجهة واحدة")]),
      h("nav", { style: { display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid " + C.border, paddingBottom: 12, marginBottom: 18 } }, tabs.map(function (t) { return h(Btn, { key: t.id, active: page === t.id, activeColor: settings.primaryColor || C.accent, onClick: function () { setPage(t.id); } }, t.label); })),
      page === "attendance" ? h(Attendance, { employees: employees, records: records, setRecords: setRecords, settings: settings }) : page === "employees" ? h(Employees, { employees: employees, setEmployees: setEmployees }) : page === "reports" ? h(AdvancedReports, { employees: employees, records: records, settings: settings }) : h(Settings, { settings: settings, setSettings: setSettings })
    ]));
  }
  try { ReactDOM.createRoot(document.getElementById("root")).render(h(App)); window.__mounted = true; } catch (err) { window.__lastError = err && err.message ? err.message : String(err); if (window.showFallback) window.showFallback(); }
})();
