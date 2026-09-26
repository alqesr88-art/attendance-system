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
  var C = { bg: "#0F1420", panel: "#171E2E", panel2: "#1B2436", border: "#2A3346", text: "#E7ECF7", dim: "#8B93A7", accent: "#4C7CF3" };

  function load(k, fallback) {
    try {
      var v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dateFromISO(s) {
    var p = s.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function displayDate(s) { return s ? s.split("-").reverse().join("/") : ""; }
  function daysBetween(from, to) {
    var a = dateFromISO(from);
    var b = dateFromISO(to);
    var out = [];
    for (var d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      out.push(new Date(d));
    }
    return out;
  }
  function today() { return iso(new Date()); }
  function firstDayOfMonth() {
    var d = new Date();
    return iso(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function inputStyle() {
    return {
      background: C.panel2,
      border: "1px solid " + C.border,
      color: C.text,
      borderRadius: 9,
      padding: "9px 11px",
      fontFamily: "inherit",
      fontSize: 13
    };
  }

  function Btn(p) {
    var style = {
      border: "1px solid " + (p.active ? p.activeColor || C.accent : C.border),
      background: p.active ? p.activeColor || C.accent : "transparent",
      color: p.color || (p.active ? "#fff" : C.text),
      padding: p.small ? "6px 10px" : "9px 15px",
      borderRadius: 9,
      fontWeight: 700,
      cursor: "pointer",
      fontSize: p.small ? 12 : 13,
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    };
    Object.assign(style, p.style || {});
    return h("button", { type: "button", onClick: p.onClick, style: style }, p.children);
  }

  function Card(p) {
    var style = {
      background: C.panel,
      border: "1px solid " + C.border,
      borderRadius: 16,
      padding: 18,
      animation: "fadeIn .25s ease"
    };
    Object.assign(style, p.style || {});
    return h("div", { style: style }, p.children);
  }

  function Stat(p) {
    return h("div", { style: { background: C.panel2, border: "1px solid " + C.border, borderRadius: 13, padding: "15px 12px", textAlign: "center", flex: 1, minWidth: 130 } }, [
      h("div", { key: "v", style: { color: p.color || C.accent, fontSize: 25, fontWeight: 800 } }, p.value),
      h("div", { key: "l", style: { color: C.dim, fontSize: 12, marginTop: 3 } }, p.label)
    ]);
  }

  function exportExcel(employees, records, from, to, employeeId) {
    if (!window.XLSX) {
      window.alert("مكتبة Excel غير متاحة.");
      return;
    }
    var rows = [];
    var dates = daysBetween(from, to);
    var filtered = employees.filter(function (e) { return employeeId === "all" || e.id === employeeId; });
    filtered.forEach(function (emp) {
      dates.forEach(function (d) {
        var st = (records[emp.id] || {})[iso(d)] || "";
        rows.push({
          "الموظف": emp.name,
          "المسمى الوظيفي": emp.jobTitle || "",
          "التاريخ": iso(d),
          "اليوم": WEEKDAYS[d.getDay()],
          "الحالة": st ? STATUS[st].label : "بدون تسجيل"
        });
      });
    });
    var ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 24 }, { wch: 20 }, { wch: 15 }, { wch: 14 }, { wch: 16 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقرير");
    XLSX.writeFile(wb, "تقرير_الحضور_" + from + "_" + to + ".xlsx");
  }

  function Attendance(props) {
    var employees = props.employees;
    var records = props.records;
    var setRecords = props.setRecords;
    var ds = useState(today());
    var selectedDate = ds[0];
    var setSelectedDate = ds[1];
    var fs = useState("all");
    var filter = fs[0];
    var setFilter = fs[1];

    var visible = employees.filter(function (e) { return filter === "all" || e.id === filter; });

    function mark(id, status) {
      var next = JSON.parse(JSON.stringify(records));
      next[id] = next[id] || {};
      if (next[id][selectedDate] === status) {
        delete next[id][selectedDate];
      } else {
        next[id][selectedDate] = status;
      }
      setRecords(next);
    }

    return h("div", null, [
      h(Card, { key: "controls", style: { marginBottom: 14 } }, h("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, [
        h("label", { style: { color: C.dim } }, "التاريخ"),
        h("input", { type: "date", value: selectedDate, onChange: function (e) { setSelectedDate(e.target.value); }, style: inputStyle() }),
        h("b", { style: { color: C.dim } }, WEEKDAYS[dateFromISO(selectedDate).getDay()]),
        h("select", { value: filter, onChange: function (e) { setFilter(e.target.value); }, style: Object.assign({ marginRight: "auto" }, inputStyle()) }, [h("option", { key: "all", value: "all" }, "كل الموظفين")].concat(employees.map(function (e) { return h("option", { key: e.id, value: e.id }, e.name); })))
      ])),
      visible.map(function (emp) {
        var current = (records[emp.id] || {})[selectedDate];
        return h(Card, { key: emp.id, style: { padding: "13px 15px", marginBottom: 10 } }, h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } }, [
          h("div", { key: "info" }, [h("strong", null, emp.name), emp.jobTitle ? h("small", { style: { display: "block", color: C.dim } }, emp.jobTitle) : null]),
          h("div", { key: "btns", style: { display: "flex", gap: 6, flexWrap: "wrap" } }, ORDER.map(function (k) {
            return h(Btn, { key: k, small: true, active: current === k, activeColor: STATUS[k].color, onClick: function () { mark(emp.id, k); } }, STATUS[k].label);
          }))
        ]));
      }),
      !visible.length ? h(Card, { key: "empty" }, "لا يوجد موظفون مطابقون للفلتر.") : null
    ]);
  }

  function Employees(props) {
    var employees = props.employees;
    var setEmployees = props.setEmployees;
    var ns = useState("");
    var name = ns[0];
    var setName = ns[1];
    var js = useState("");
    var job = js[0];
    var setJob = js[1];

    function add() {
      if (!name.trim()) return;
      setEmployees(employees.concat({
        id: "e" + Date.now(),
        name: name.trim(),
        jobTitle: job.trim()
      }));
      setName("");
      setJob("");
    }

    return h("div", null, [
      h(Card, { key: "add", style: { marginBottom: 15 } }, h("div", { style: { display: "flex", gap: 9, flexWrap: "wrap" } }, [
        h("input", { placeholder: "اسم الموظف", value: name, onChange: function (e) { setName(e.target.value); }, style: Object.assign({ flex: 1, minWidth: 180 }, inputStyle()) }),
        h("input", { placeholder: "المسمى الوظيفي", value: job, onChange: function (e) { setJob(e.target.value); }, style: Object.assign({ flex: 1, minWidth: 180 }, inputStyle()) }),
        h(Btn, { active: true, onClick: add }, "+ إضافة موظف")
      ])),
      employees.map(function (emp) {
        return h(Card, { key: emp.id, style: { padding: "12px 15px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" } }, [
          h("span", { key: "n" }, [h("b", null, emp.name), emp.jobTitle ? " — " + emp.jobTitle : ""]),
          h(Btn, { key: "d", small: true, color: "#F87171", onClick: function () { setEmployees(employees.filter(function (x) { return x.id !== emp.id; })); } }, "حذف")
        ]);
      })
    ]);
  }

  function AdvancedReports(props) {
    var employees = props.employees;
    var records = props.records;
    var fs = useState(firstDayOfMonth());
    var from = fs[0];
    var setFrom = fs[1];
    var ts = useState(today());
    var to = ts[0];
    var setTo = ts[1];
    var es = useState("all");
    var employeeId = es[0];
    var setEmployeeId = es[1];
    var ss = useState("all");
    var statusFilter = ss[0];
    var setStatusFilter = ss[1];

    var days = from && to && from <= to ? daysBetween(from, to) : [];
    var selected = employees.filter(function (e) { return employeeId === "all" || e.id === employeeId; });
    var stats = { present: 0, absent: 0, late: 0, leave: 0, sick: 0, unmarked: 0 };
    var rows = [];

    selected.forEach(function (emp) {
      days.forEach(function (d) {
        var day = iso(d);
        var st = (records[emp.id] || {})[day] || "unmarked";
        stats[st] = (stats[st] || 0) + 1;
        if (statusFilter === "all" || st === statusFilter) {
          rows.push({ employee: emp, date: day, status: st });
        }
      });
    });

    var marked = stats.present + stats.absent + stats.late + stats.leave + stats.sick;
    var rate = marked ? Math.round((stats.present + stats.late) * 100 / marked) : 0;

    return h("div", null, [
      h(Card, { key: "filters", style: { marginBottom: 15 } }, [
        h("div", { key: "row1", style: { display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" } }, [
          h("strong", null, "تقرير متقدم"),
          h("span", { style: { color: C.dim } }, "من"),
          h("input", { type: "date", value: from, onChange: function (e) { setFrom(e.target.value); }, style: inputStyle() }),
          h("span", { style: { color: C.dim } }, "إلى"),
          h("input", { type: "date", value: to, onChange: function (e) { setTo(e.target.value); }, style: inputStyle() }),
          h("select", { value: employeeId, onChange: function (e) { setEmployeeId(e.target.value); }, style: inputStyle() }, [h("option", { key: "all", value: "all" }, "كل الموظفين")].concat(employees.map(function (e) { return h("option", { key: e.id, value: e.id }, e.name); }))),
          h(Btn, { active: true, activeColor: "#22C55E", onClick: function () { exportExcel(employees, records, from, to, employeeId); } }, "⬇️ تصدير Excel")
        ]),
        h("div", { key: "row2", style: { display: "flex", gap: 7, flexWrap: "wrap", marginTop: 14 } }, [h(Btn, { small: true, active: statusFilter === "all", onClick: function () { setStatusFilter("all"); } }, "كل الحالات")].concat(ORDER.map(function (k) {
          return h(Btn, { key: k, small: true, active: statusFilter === k, activeColor: STATUS[k].color, onClick: function () { setStatusFilter(k); } }, STATUS[k].label);
        })))
      ]),
      h("div", { key: "stats", style: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 } }, [
        h(Stat, { key: "rate", label: "نسبة الالتزام", value: rate + "%", color: C.accent }),
        h(Stat, { key: "marked", label: "إجمالي المسجل", value: marked, color: "#22C55E" }),
        h(Stat, { key: "present", label: "الحضور", value: stats.present, color: "#22C55E" }),
        h(Stat, { key: "absent", label: "الغياب", value: stats.absent, color: "#EF4444" }),
        h(Stat, { key: "late", label: "التأخير", value: stats.late, color: "#F59E0B" })
      ]),
      h(Card, { key: "table", style: { overflowX: "auto" } }, [
        h("h3", { style: { marginTop: 0 } }, "تفاصيل الفترة (" + rows.length + " سجل)"),
        h("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: 600 } }, [
          h("thead", null, h("tr", null, ["الموظف", "المسمى", "التاريخ", "اليوم", "الحالة"].map(function (col) {
            return h("th", { key: col, style: { textAlign: "right", padding: 10, borderBottom: "1px solid " + C.border, color: C.dim } }, col);
          }))),
          h("tbody", null, rows.map(function (r, i) {
            return h("tr", { key: i }, [
              h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border } }, r.employee.name),
              h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border, color: C.dim } }, r.employee.jobTitle || "—"),
              h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border } }, displayDate(r.date)),
              h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border } }, WEEKDAYS[dateFromISO(r.date).getDay()]),
              h("td", { style: { padding: 9, borderBottom: "1px solid " + C.border, color: r.status === "unmarked" ? C.dim : STATUS[r.status].color, fontWeight: 700 } }, r.status === "unmarked" ? "بدون تسجيل" : STATUS[r.status].label)
            ]);
          }))
        ])
      ])
    ]);
  }

  function Settings(props) {
    var s = props.settings;
    var set = props.setSettings;
    return h(Card, { style: { maxWidth: 700 } }, [
      h("h3", { style: { marginTop: 0 } }, "إعدادات النظام"),
      h("label", { style: { display: "block", color: C.dim, margin: "12px 0 6px" } }, "اسم الشركة"),
      h("input", { value: s.companyName || "", onChange: function (e) { set(Object.assign({}, s, { companyName: e.target.value })); }, style: Object.assign({ width: "100%" }, inputStyle()) }),
      h("label", { style: { display: "block", color: C.dim, margin: "12px 0 6px" } }, "رابط الشعار"),
      h("input", { value: s.logo || "", onChange: function (e) { set(Object.assign({}, s, { logo: e.target.value })); }, style: Object.assign({ width: "100%" }, inputStyle()) })
    ]);
  }

  function App() {
    var ps = useState("attendance");
    var page = ps[0];
    var setPage = ps[1];
    var es = useState(function () {
      return load(KEYS.employees, [
        { id: "e1", name: "أحمد محمد", jobTitle: "محاسب" },
        { id: "e2", name: "سارة علي", jobTitle: "موارد بشرية" },
        { id: "e3", name: "خالد ناصر", jobTitle: "مبرمج" }
      ]);
    });
    var employees = es[0];
    var setEmployees = es[1];
    var rs = useState(function () { return load(KEYS.records, {}); });
    var records = rs[0];
    var setRecords = rs[1];
    var ss = useState(function () { return load(KEYS.settings, { companyName: "اسم الشركة", logo: "", primaryColor: C.accent }); });
    var settings = ss[0];
    var setSettings = ss[1];

    useEffect(function () { save(KEYS.employees, employees); }, [employees]);
    useEffect(function () { save(KEYS.records, records); }, [records]);
    useEffect(function () { save(KEYS.settings, settings); }, [settings]);

    var tabs = [
      { id: "attendance", label: "حضور اليوم" },
      { id: "employees", label: "الموظفون" },
      { id: "reports", label: "التقارير المتقدمة" },
      { id: "settings", label: "الإعدادات" }
    ];

    return h("div", { className: "app-shell", style: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Cairo', sans-serif", padding: 20, direction: "rtl" } }, h("div", { style: { maxWidth: 1100, margin: "auto" } }, [
      h("header", { key: "h", style: { marginBottom: 20 } }, [
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" } }, [
          h("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, [
            settings.logo ? h("img", { src: settings.logo, alt: "logo", style: { maxHeight: 42, maxWidth: 110, background: "#fff", borderRadius: 8, padding: 4 } }) : null,
            h("h1", { style: { margin: 0, fontSize: 28 } }, "📋 سجل الحضور")
          ]),
          h("span", { style: { color: C.dim } }, settings.companyName)
        ]),
        h("p", { style: { color: C.dim, margin: "7px 0 0" } }, "إدارة الحضور والتقارير المتقدمة")
      ]),
      h("nav", { key: "n", style: { display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid " + C.border, paddingBottom: 12, marginBottom: 18 } }, tabs.map(function (t) {
        return h(Btn, { key: t.id, active: page === t.id, activeColor: settings.primaryColor || C.accent, onClick: function () { setPage(t.id); } }, t.label);
      })),
      h("main", { key: "m" }, [
        page === "attendance" ? h(Attendance, { employees: employees, records: records, setRecords: setRecords }) : null,
        page === "employees" ? h(Employees, { employees: employees, setEmployees: setEmployees }) : null,
        page === "reports" ? h(AdvancedReports, { employees: employees, records: records }) : null,
        page === "settings" ? h(Settings, { settings: settings, setSettings: setSettings }) : null
      ])
    ]));
  }

  try {
    var root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(h(App));
    window.__mounted = true;
  } catch (err) {
    window.__lastError = err && err.message ? err.message : String(err);
    if (window.showFallback) window.showFallback();
  }
})();
