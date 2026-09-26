(function () {
  "use strict";
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;

  var LS_EMPLOYEES = "att_employees_v1";
  var LS_RECORDS = "att_records_v1";
  var LS_SETTINGS = "att_settings_v1";

  var STATUS = {
    present: { label: "حاضر", short: "ح", color: "#22C55E" },
    absent: { label: "غائب", short: "غ", color: "#EF4444" },
    late: { label: "متأخر", short: "ت", color: "#F59E0B" },
    leave: { label: "إجازة", short: "إ", color: "#3B82F6" },
    sick: { label: "مرضي", short: "م", color: "#A855F7" }
  };
  var STATUS_ORDER = ["present", "absent", "late", "leave", "sick"];
  var WEEKDAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  var WEEKDAY_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  var MONTH_NAMES = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  function toISO(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function parseISO(s) {
    var parts = s.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  function fmtDMY(d) { return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function fmtNow() {
    var d = new Date();
    return fmtDMY(d) + " - " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }
  function getWeekStart(d) {
    var day = d.getDay();
    var diff = (day + 1) % 7;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  }
  function getWeekDays(anyDateISO) {
    var start = getWeekStart(parseISO(anyDateISO));
    var days = [];
    for (var i = 0; i < 7; i++) days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    return days;
  }
  function getMonthDays(year, monthIndex0) {
    var n = new Date(year, monthIndex0 + 1, 0).getDate();
    var days = [];
    for (var i = 1; i <= n; i++) days.push(new Date(year, monthIndex0, i));
    return days;
  }

  var COLORS = {
    bg: "#0F1420",
    panel: "#171E2E",
    panel2: "#1B2436",
    border: "#2A3346",
    text: "#E7ECF7",
    textDim: "#8B93A7",
    accent: "#4C7CF3",
    accentDim: "#28365E"
  };

  function Btn(props) {
    var style = Object.assign({
      border: "1px solid " + (props.border || COLORS.border),
      background: props.active ? (props.activeColor || COLORS.accent) : (props.bg || "transparent"),
      color: props.active ? "#fff" : (props.color || COLORS.text),
      padding: props.small ? "6px 10px" : "9px 16px",
      borderRadius: "10px",
      fontSize: props.small ? "12px" : "13.5px",
      fontWeight: "700",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      transition: "all .15s",
      boxShadow: props.active ? "0 8px 18px " + (props.activeColor || COLORS.accent) + "55" : "none"
    }, props.style || {});
    return h("button", { onClick: props.onClick, style: style, type: "button", disabled: props.disabled }, props.children);
  }

  function Card(props) {
    return h("div", { style: Object.assign({ background: COLORS.panel, border: "1px solid " + COLORS.border, borderRadius: "16px", padding: "18px", animation: "fadeIn .25s ease" }, props.style || {}) }, props.children);
  }

  function buildRangeData(employees, records, days) {
    var perEmployee = employees.map(function (emp) {
      var counts = { present: 0, absent: 0, late: 0, leave: 0, sick: 0, unmarked: 0 };
      var cells = days.map(function (d) {
        var iso = toISO(d);
        var st = (records[emp.id] || {})[iso] || null;
        if (st && counts.hasOwnProperty(st)) counts[st]++;
        else counts.unmarked++;
        return { date: d, status: st };
      });
      return { employee: emp, cells: cells, counts: counts };
    });

    var totalsByDay = days.map(function (d, idx) {
      var t = { present: 0, absent: 0, late: 0, leave: 0, sick: 0 };
      perEmployee.forEach(function (row) {
        var st = row.cells[idx].status;
        if (st && t.hasOwnProperty(st)) t[st]++;
      });
      return t;
    });

    var grand = { present: 0, absent: 0, late: 0, leave: 0, sick: 0 };
    perEmployee.forEach(function (row) {
      STATUS_ORDER.forEach(function (k) { grand[k] += row.counts[k]; });
    });
    var markedTotal = grand.present + grand.absent + grand.late + grand.leave + grand.sick;
    var attendanceRate = markedTotal > 0 ? Math.round(((grand.present + grand.late) / markedTotal) * 100) : 0;
    return { perEmployee: perEmployee, totalsByDay: totalsByDay, grand: grand, attendanceRate: attendanceRate };
  }

  function StatusDot(status) {
    var meta = STATUS[status];
    return h("span", { key: status }, [
      h("span", { key: "d", className: "pr-dot", style: { background: meta.color } }),
      meta.label
    ]);
  }

  function ReportHeader(props) {
    return h("div", { className: "pr-header" }, [
      h("div", { key: "l" }, [h("p", { key: "t", className: "pr-title" }, props.title), h("p", { key: "s", className: "pr-sub" }, props.subtitle)]),
      h("div", { key: "r", className: "pr-meta" }, [h("div", { key: "1" }, "الشركة: " + props.companyName), h("div", { key: "2" }, "تاريخ الإصدار: " + fmtNow())])
    ]);
  }

  function InfoBar(props) {
    return h("div", { className: "pr-infobar" }, props.items.map(function (it, i) { return h("div", { key: i, className: "pr-info-card" }, [it.label, h("b", { key: "b" }, it.value)]); }));
  }

  function Legend() {
    return h("div", { className: "pr-legend" }, STATUS_ORDER.map(function (k) { return StatusDot(k); }).concat([h("span", { key: "u" }, [h("span", { key: "d", className: "pr-dot", style: { background: "#ccc" } }), "بدون تسجيل"]) ]));
  }

  function SummaryCards(data) {
    var g = data.grand;
    var cards = [
      { label: "أيام الحضور", num: g.present, color: STATUS.present.color },
      { label: "أيام الغياب", num: g.absent, color: STATUS.absent.color },
      { label: "مرات التأخير", num: g.late, color: STATUS.late.color },
      { label: "نسبة الالتزام", num: data.attendanceRate + "%", color: COLORS.accent }
    ];
    return h("div", { className: "pr-summary" }, cards.map(function (c, i) {
      return h("div", { key: i, className: "pr-summary-card" }, [
        h("div", { key: "n", className: "pr-summary-num", style: { color: c.color } }, c.num),
        h("div", { key: "l", className: "pr-summary-label" }, c.label)
      ]);
    }));
  }

  function Badge(status) {
    if (!status) return h("span", { style: { color: "#bbb" } }, "—");
    var meta = STATUS[status];
    return h("span", { className: "pr-status-badge", style: { background: meta.color, color: "#fff" } }, meta.short);
  }

  function WeeklyTable(data, days) {
    return h("table", { key: "table" }, [
      h("thead", { key: "thead" }, h("tr", null, [h("th", { key: "name" }, "الموظف")].concat(days.map(function (d, i) { return h("th", { key: i }, WEEKDAY_SHORT[d.getDay()] + " " + pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1)); })).concat([h("th", { key: "tot" }, "الحضور / الغياب")] ))),
      h("tbody", { key: "tbody" }, data.perEmployee.map(function (row, ri) {
        return h("tr", { key: ri }, [h("td", { key: "name" }, row.employee.name)].concat(row.cells.map(function (c, ci) { return h("td", { key: ci }, Badge(c.status)); })).concat([h("td", { key: "tot" }, row.counts.present + " / " + row.counts.absent)]));
      })),
      h("tfoot", { key: "tfoot" }, h("tr", null, [h("td", { key: "l" }, "الإجمالي")].concat(data.totalsByDay.map(function (t, i) { return h("td", { key: i }, t.present + "ح / " + t.absent + "غ"); })).concat([h("td", { key: "g" }, data.grand.present + " / " + data.grand.absent)])))
    ]);
  }

  function MonthlyTable(data, days) {
    return h("table", { key: "table" }, [
      h("thead", { key: "thead" }, h("tr", null, [h("th", { key: "name" }, "الموظف")].concat(days.map(function (d, i) { return h("th", { key: i }, d.getDate()); })).concat([h("th", { key: "tot" }, "ح / غ / ت")] ))),
      h("tbody", { key: "tbody" }, data.perEmployee.map(function (row, ri) {
        return h("tr", { key: ri }, [h("td", { key: "name" }, row.employee.name)].concat(row.cells.map(function (c, ci) { return h("td", { key: ci }, Badge(c.status)); })).concat([h("td", { key: "tot" }, row.counts.present + " / " + row.counts.absent + " / " + row.counts.late)]));
      })),
      h("tfoot", { key: "tfoot" }, h("tr", null, [h("td", { key: "l" }, "الإجمالي")].concat(data.totalsByDay.map(function (t, i) { return h("td", { key: i }, t.present); })).concat([h("td", { key: "g" }, data.grand.present + " / " + data.grand.absent + " / " + data.grand.late)])))
    ]);
  }

  function ReportFooter() {
    return h("div", { className: "pr-footer" }, [
      h("div", { key: "l" }, "تم إنشاء هذا التقرير آليًا بواسطة نظام سجل الحضور - " + fmtNow()),
      h("div", { key: "r" }, ["توقيع المسؤول: ", h("span", { key: "s", className: "pr-sign-line" })])
    ]);
  }

  function Notes(list) {
    return h("div", { className: "pr-notes" }, [
      h("div", { key: "t", className: "pr-notes-title" }, "ملاحظات"),
      h("ul", { key: "u" }, list.map(function (n, i) { return h("li", { key: i }, n); }))
    ]);
  }

  function WeeklyReportBody(props) {
    var days = getWeekDays(props.anchorISO);
    var data = buildRangeData(props.employees, props.records, days);
    var periodLabel = fmtDMY(days[0]) + " إلى " + fmtDMY(days[6]);
    return h("div", null, [
      h(ReportHeader, { key: "h", title: "التقرير الأسبوعي للحضور والانصراف", subtitle: "الأسبوع: " + periodLabel, companyName: props.companyName }),
      h(InfoBar, { key: "i", items: [{ label: "الفترة", value: periodLabel }, { label: "عدد الموظفين", value: props.employees.length }, { label: "أيام العمل", value: 7 }, { label: "نسبة الالتزام", value: data.attendanceRate + "%" }] }),
      h(Legend, { key: "lg" }),
      h(SummaryCards, Object.assign({ key: "s" }, data)),
      h("div", { key: "tw", style: { overflowX: "auto" } }, WeeklyTable(data, days)),
      h(Notes, { key: "n", list: ["الرمز (—) يعني عدم تسجيل حالة حضور لهذا اليوم.", "يشمل الأسبوع الأيام من السبت إلى الجمعة."] }),
      h(ReportFooter, { key: "f" })
    ]);
  }

  function MonthlyReportBody(props) {
    var days = getMonthDays(props.year, props.month);
    var data = buildRangeData(props.employees, props.records, days);
    var periodLabel = MONTH_NAMES[props.month] + " " + props.year;
    return h("div", null, [
      h(ReportHeader, { key: "h", title: "التقرير الشهري للحضور والانصراف", subtitle: "الشهر: " + periodLabel, companyName: props.companyName }),
      h(InfoBar, { key: "i", items: [{ label: "الشهر", value: periodLabel }, { label: "عدد الموظفين", value: props.employees.length }, { label: "عدد الأيام", value: days.length }, { label: "نسبة الالتزام", value: data.attendanceRate + "%" }] }),
      h(Legend, { key: "lg" }),
      h(SummaryCards, Object.assign({ key: "s" }, data)),
      h("div", { key: "tw", style: { overflowX: "auto" } }, MonthlyTable(data, days)),
      h(Notes, { key: "n", list: ["الرمز (—) يعني عدم تسجيل حالة حضور لهذا اليوم.", "ح = حاضر، غ = غائب، ت = متأخر."] }),
      h(ReportFooter, { key: "f" })
    ]);
  }

  function PreviewModal(props) {
    return h("div", { className: "no-print", style: { position: "fixed", inset: 0, background: "rgba(4,7,14,.72)", zIndex: 999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px", overflowY: "auto" } }, h("div", { style: { width: "100%", maxWidth: "1000px" } }, [
      h("div", { key: "bar", style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } }, [
        h("div", { key: "t", style: { color: "#fff", fontWeight: "700" } }, "معاينة قبل الطباعة"),
        h("div", { key: "b", style: { display: "flex", gap: "8px" } }, [
          h(Btn, { key: "p", onClick: props.onPrint, activeColor: COLORS.accent, active: true }, "🖨️ طباعة / حفظ PDF"),
          h(Btn, { key: "c", onClick: props.onClose }, "إغلاق")
        ])
      ]),
      h("div", { key: "sheet", style: { background: "#fff", borderRadius: "10px", padding: "22px", boxShadow: "0 20px 60px rgba(0,0,0,.5)" } }, props.children)
    ]));
  }

  function AttendanceView(props) {
    var employees = props.employees, records = props.records, setRecords = props.setRecords, settings = props.settings;
    var dateState = useState(toISO(new Date()));
    var date = dateState[0], setDate = dateState[1];
    var filterState = useState("all");
    var filter = filterState[0], setFilter = filterState[1];

    function setStatus(empId, status) {
      var next = JSON.parse(JSON.stringify(records));
      if (!next[empId]) next[empId] = {};
      if (next[empId][date] === status) delete next[empId][date];
      else next[empId][date] = status;
      setRecords(next);
    }

    var visible = employees.filter(function (emp) {
      var current = (records[emp.id] || {})[date] || null;
      return filter === "all" || current === filter;
    });

    if (employees.length === 0) {
      return h(Card, null, h("p", { style: { color: COLORS.textDim } }, "أضف موظفين أولًا من تبويب \"الموظفون\" حتى تتمكن من تسجيل الحضور."));
    }

    return h("div", null, [
      h("div", { key: "top", style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" } }, [
        h("label", { key: "l", style: { color: COLORS.textDim, fontSize: "13px" } }, "التاريخ:"),
        h("input", { key: "d", type: "date", value: date, onChange: function (e) { setDate(e.target.value); }, style: { background: COLORS.panel2, border: "1px solid " + COLORS.border, color: COLORS.text, borderRadius: "8px", padding: "8px 10px", fontSize: "13px" } }),
        h("span", { key: "day", style: { color: COLORS.textDim, fontSize: "13px" } }, WEEKDAY_NAMES[parseISO(date).getDay()]),
        h("div", { key: "filter", style: { display: "flex", gap: "6px", flexWrap: "wrap", marginRight: "auto" } }, [
          h(Btn, { key: "all", small: true, active: filter === "all", activeColor: settings.primaryColor || COLORS.accent, onClick: function () { setFilter("all"); } }, "الكل"),
          STATUS_ORDER.map(function (k) {
            return h(Btn, { key: k, small: true, active: filter === k, activeColor: STATUS[k].color, onClick: function () { setFilter(k); } }, STATUS[k].label);
          })
        ])
      ]),
      h("div", { key: "list", style: { display: "flex", flexDirection: "column", gap: "10px" } }, visible.map(function (emp) {
        var current = (records[emp.id] || {})[date] || null;
        return h(Card, { key: emp.id, style: { padding: "12px 14px" } }, h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" } }, [
          h("div", { key: "n" }, [
            h("div", { key: "nm", style: { fontWeight: "700" } }, emp.name),
            emp.jobTitle ? h("div", { key: "jt", style: { fontSize: "12px", color: COLORS.textDim } }, emp.jobTitle) : null
          ]),
          h("div", { key: "btns", style: { display: "flex", gap: "6px", flexWrap: "wrap" } }, STATUS_ORDER.map(function (k) {
            var meta = STATUS[k];
            return h(Btn, { key: k, small: true, active: current === k, activeColor: meta.color, onClick: function () { setStatus(emp.id, k); } }, meta.label);
          }))
        ]));
      }))
    ]);
  }

  function EmployeesView(props) {
    var employees = props.employees, setEmployees = props.setEmployees;
    var nameState = useState("");
    var name = nameState[0], setName = nameState[1];
    var jobState = useState("");
    var job = jobState[0], setJob = jobState[1];

    function addEmployee() {
      if (!name.trim()) return;
      var emp = { id: "e" + Date.now() + Math.floor(Math.random() * 1000), name: name.trim(), jobTitle: job.trim() };
      setEmployees(employees.concat([emp]));
      setName("");
      setJob("");
    }
    function removeEmployee(id) {
      setEmployees(employees.filter(function (e) { return e.id !== id; }));
    }

    var inputStyle = { background: COLORS.panel2, border: "1px solid " + COLORS.border, color: COLORS.text, borderRadius: "8px", padding: "9px 12px", fontSize: "13.5px", flex: "1", minWidth: "160px" };

    return h("div", null, [
      h(Card, { key: "add", style: { marginBottom: "16px" } }, h("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } }, [
        h("input", { key: "n", placeholder: "اسم الموظف", value: name, onChange: function (e) { setName(e.target.value); }, style: inputStyle }),
        h("input", { key: "j", placeholder: "المسمى الوظيفي (اختياري)", value: job, onChange: function (e) { setJob(e.target.value); }, style: inputStyle }),
        h(Btn, { key: "b", onClick: addEmployee, active: true, activeColor: COLORS.accent }, "+ إضافة موظف")
      ])),
      employees.length === 0 ? h("p", { key: "empty", style: { color: COLORS.textDim } }, "لا يوجد موظفون بعد.") : h("div", { key: "list", style: { display: "flex", flexDirection: "column", gap: "8px" } }, employees.map(function (emp) {
        return h(Card, { key: emp.id, style: { padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexDirection: "row" } }, [
          h("div", { key: "n" }, [
            h("div", { key: "nm", style: { fontWeight: "700" } }, emp.name),
            emp.jobTitle ? h("div", { key: "jt", style: { fontSize: "12px", color: COLORS.textDim } }, emp.jobTitle) : null
          ]),
          h(Btn, { key: "del", small: true, color: "#F87171", onClick: function () { removeEmployee(emp.id); } }, "حذف")
        ]);
      }))
    ]);
  }

  function ReportsView(props) {
    var employees = props.employees, records = props.records, companyName = props.companyName;
    var tabState = useState("weekly");
    var tab = tabState[0], setTab = tabState[1];
    var weekAnchorState = useState(toISO(new Date()));
    var weekAnchor = weekAnchorState[0], setWeekAnchor = weekAnchorState[1];
    var now = new Date();
    var monthState = useState(now.getMonth());
    var month = monthState[0], setMonth = monthState[1];
    var yearState = useState(now.getFullYear());
    var year = yearState[0], setYear = yearState[1];
    var previewState = useState(false);
    var preview = previewState[0], setPreview = previewState[1];

    var inputStyle = { background: COLORS.panel2, border: "1px solid " + COLORS.border, color: COLORS.text, borderRadius: "8px", padding: "8px 10px", fontSize: "13px" };

    function doPrint() {
      document.body.setAttribute("data-print-mode", tab);
      window.print();
    }

    return h("div", null, [
      h("div", { key: "tabs", style: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" } }, [
        h(Btn, { key: "w", active: tab === "weekly", activeColor: COLORS.accent, onClick: function () { setTab("weekly"); } }, "تقرير أسبوعي"),
        h(Btn, { key: "m", active: tab === "monthly", activeColor: COLORS.accent, onClick: function () { setTab("monthly"); } }, "تقرير شهري")
      ]),
      h(Card, { key: "controls" }, tab === "weekly" ? h("div", { style: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" } }, [
        h("label", { key: "l", style: { color: COLORS.textDim, fontSize: "13px" } }, "اختر أي يوم ضمن الأسبوع:"),
        h("input", { key: "d", type: "date", value: weekAnchor, onChange: function (e) { setWeekAnchor(e.target.value); }, style: inputStyle }),
        h("span", { key: "r", style: { color: COLORS.textDim, fontSize: "13px" } }, "الأسبوع: " + fmtDMY(getWeekDays(weekAnchor)[0]) + " إلى " + fmtDMY(getWeekDays(weekAnchor)[6])),
        h(Btn, { key: "pv", active: true, activeColor: COLORS.accent, onClick: function () { setPreview(true); } }, "👁️ معاينة وطباعة PDF")
      ]) : h("div", { style: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" } }, [
        h("label", { key: "l", style: { color: COLORS.textDim, fontSize: "13px" } }, "الشهر:"),
        h("select", { key: "ms", value: month, onChange: function (e) { setMonth(Number(e.target.value)); }, style: inputStyle }, MONTH_NAMES.map(function (mn, i) { return h("option", { key: i, value: i }, mn); })),
        h("label", { key: "yl", style: { color: COLORS.textDim, fontSize: "13px" } }, "السنة:"),
        h("input", { key: "y", type: "number", value: year, onChange: function (e) { setYear(Number(e.target.value)); }, style: Object.assign({}, inputStyle, { width: "100px" }) }),
        h(Btn, { key: "pv", active: true, activeColor: COLORS.accent, onClick: function () { setPreview(true); } }, "👁️ معاينة وطباعة PDF")
      ])),
      employees.length === 0 ? h("p", { key: "warn", style: { color: COLORS.textDim, marginTop: "12px" } }, "لا يوجد موظفون بعد، أضف موظفين لعرض بيانات التقرير.") : null,
      preview ? h(PreviewModal, { key: "modal", onClose: function () { setPreview(false); }, onPrint: doPrint }, tab === "weekly" ? h(WeeklyReportBody, { employees: employees, records: records, anchorISO: weekAnchor, companyName: companyName }) : h(MonthlyReportBody, { employees: employees, records: records, month: month, year: year, companyName: companyName })) : null,
      h("div", { key: "pw", className: "printable-report-weekly" }, h(WeeklyReportBody, { employees: employees, records: records, anchorISO: weekAnchor, companyName: companyName })),
      h("div", { key: "pm", className: "printable-report-monthly" }, h(MonthlyReportBody, { employees: employees, records: records, month: month, year: year, companyName: companyName }))
    ]);
  }

  function SettingsView(props) {
    var settings = props.settings, setSettings = props.setSettings;
    var companyName = settings.companyName || "اسم الشركة";
    var inputStyle = { background: COLORS.panel2, border: "1px solid " + COLORS.border, color: COLORS.text, borderRadius: "10px", padding: "10px 12px", fontSize: "14px", width: "100%" };
    var colors = ["#4C7CF3", "#22C55E", "#F59E0B", "#A855F7", "#EF4444", "#14B8A6"];
    return h("div", null, [
      h(Card, { key: "card", style: { maxWidth: "700px" } }, [
        h("h3", { key: "h", style: { marginTop: 0, marginBottom: "18px" } }, "إعدادات النظام"),
        h("div", { key: "grid", style: { display: "grid", gap: "18px" } }, [
          h("div", { key: "company" }, [
            h("label", { style: { display: "block", marginBottom: "8px", color: COLORS.textDim } }, "اسم الشركة"),
            h("input", { value: companyName, onChange: function (e) { setSettings(Object.assign({}, settings, { companyName: e.target.value })); }, style: inputStyle })
          ]),
          h("div", { key: "logo" }, [
            h("label", { style: { display: "block", marginBottom: "8px", color: COLORS.textDim } }, "رابط الشعار (اختياري)"),
            h("input", { value: settings.logo || "", onChange: function (e) { setSettings(Object.assign({}, settings, { logo: e.target.value })); }, placeholder: "https://example.com/logo.png", style: inputStyle })
          ]),
          h("div", { key: "color" }, [
            h("label", { style: { display: "block", marginBottom: "8px", color: COLORS.textDim } }, "لون التمييز"),
            h("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } }, colors.map(function (c) {
              return h("button", { key: c, type: "button", onClick: function () { setSettings(Object.assign({}, settings, { primaryColor: c })); }, style: { width: "36px", height: "36px", borderRadius: "50%", border: settings.primaryColor === c ? "3px solid #fff" : "2px solid " + COLORS.border, background: c, boxShadow: "0 6px 18px " + c + "55" } });
            }))
          ])
        ]),
        h("div", { key: "actions", style: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" } }, [
          h(Btn, { key: "reset", color: "#FCA5A5", onClick: function () { setSettings({ companyName: "اسم الشركة", logo: "", primaryColor: "#4C7CF3" }); }, style: { borderColor: "#FCA5A5" } }, "إعادة تعيين"),
          settings.logo ? h("img", { key: "logoPreview", src: settings.logo, alt: "logo", style: { maxWidth: "120px", maxHeight: "52px", objectFit: "contain", borderRadius: "8px", border: "1px solid " + COLORS.border, background: "#fff" } }) : null
        ])
      ])
    ]);
  }

  function exportExcel(employees, records) {
    if (!window.XLSX) {
      window.alert("مكتبة Excel غير متاحة في هذا المتصفح.");
      return;
    }

    var rows = [];
    employees.forEach(function (emp) {
      var map = records[emp.id] || {};
      var dates = Object.keys(map).sort();
      if (!dates.length) {
        rows.push({ "الموظف": emp.name, "المسمى الوظيفي": emp.jobTitle || "", "التاريخ": "", "الحالة": "بدون تسجيل" });
        return;
      }
      dates.forEach(function (date) {
        rows.push({ "الموظف": emp.name, "المسمى الوظيفي": emp.jobTitle || "", "التاريخ": date, "الحالة": STATUS[map[date]].label || map[date] });
      });
    });

    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "سجل الحضور");
    XLSX.writeFile(wb, "سجل_الحضور_" + toISO(new Date()) + ".xlsx");
  }

  function App() {
    var pageState = useState("attendance");
    var page = pageState[0], setPage = pageState[1];

    var employeesState = useState(function () {
      var saved = loadJSON(LS_EMPLOYEES, null);
      if (saved && saved.length) return saved;
      return [
        { id: "e1", name: "أحمد محمد", jobTitle: "محاسب" },
        { id: "e2", name: "سارة علي", jobTitle: "موارد بشرية" },
        { id: "e3", name: "خالد ناصر", jobTitle: "مبرمج" }
      ];
    });
    var employees = employeesState[0], setEmployees = employeesState[1];

    var recordsState = useState(function () { return loadJSON(LS_RECORDS, {}); });
    var records = recordsState[0], setRecords = recordsState[1];

    var settingsState = useState(function () { return loadJSON(LS_SETTINGS, { companyName: "اسم الشركة", logo: "", primaryColor: "#4C7CF3" }); });
    var settings = settingsState[0], setSettings = settingsState[1];

    useEffect(function () { saveJSON(LS_EMPLOYEES, employees); }, [employees]);
    useEffect(function () { saveJSON(LS_RECORDS, records); }, [records]);
    useEffect(function () { saveJSON(LS_SETTINGS, settings); }, [settings]);
    useEffect(function () {
      function onAfterPrint() { document.body.removeAttribute("data-print-mode"); }
      window.addEventListener("afterprint", onAfterPrint);
      return function () { window.removeEventListener("afterprint", onAfterPrint); };
    }, []);

    var tabs = [
      { id: "attendance", label: "حضور اليوم" },
      { id: "employees", label: "الموظفون" },
      { id: "reports", label: "التقارير" },
      { id: "settings", label: "الإعدادات" }
    ];

    function doPrintWeekly() {
      document.body.setAttribute("data-print-mode", "weekly");
      window.print();
    }

    function doExportExcel() { exportExcel(employees, records); }

    return h(React.Fragment, null, [
      h("div", { key: "shell", className: "app-shell", style: { minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Cairo', sans-serif", padding: "20px" } }, h("div", { style: { maxWidth: "1100px", margin: "0 auto" } }, [
        h("div", { key: "header", style: { marginBottom: "20px" } }, [
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" } }, [
            h("div", { key: "title", style: { display: "flex", alignItems: "center", gap: "12px" } }, [
              settings.logo ? h("img", { key: "logo", src: settings.logo, alt: "logo", style: { maxHeight: "42px", maxWidth: "120px", objectFit: "contain", borderRadius: "8px", background: "#fff", padding: "4px 6px" } }) : null,
              h("h1", { key: "t", style: { margin: 0, fontSize: "24px", fontWeight: "800" } }, "📋 سجل الحضور")
            ]),
            h("div", { key: "tools", style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, [
              h(Btn, { key: "excel", active: true, activeColor: "#22C55E", onClick: doExportExcel }, "⬇️ Excel"),
              h(Btn, { key: "pdf", active: true, activeColor: settings.primaryColor || COLORS.accent, onClick: doPrintWeekly }, "🖨️ PDF")
            ])
          ]),
          h("input", { key: "c", value: settings.companyName, onChange: function (e) { setSettings(Object.assign({}, settings, { companyName: e.target.value })); }, style: { background: "transparent", border: "none", borderBottom: "1px dashed " + COLORS.border, color: COLORS.textDim, fontSize: "13px", padding: "4px 0", width: "260px", marginTop: "8px" } })
        ]),
        h("div", { key: "nav", style: { display: "flex", gap: "8px", marginBottom: "18px", borderBottom: "1px solid " + COLORS.border, paddingBottom: "12px", flexWrap: "wrap" } }, tabs.map(function (t) { return h(Btn, { key: t.id, active: page === t.id, activeColor: settings.primaryColor || COLORS.accent, onClick: function () { setPage(t.id); } }, t.label); })),
        page === "attendance" ? h(AttendanceView, { employees: employees, records: records, setRecords: setRecords, settings: settings }) : page === "employees" ? h(EmployeesView, { employees: employees, setEmployees: setEmployees }) : page === "reports" ? h(ReportsView, { employees: employees, records: records, companyName: settings.companyName }) : h(SettingsView, { settings: settings, setSettings: setSettings })
      ]))
    ].concat(page === "reports" ? [] : [h("div", { key: "pw-hidden", className: "printable-report-weekly" }, h(WeeklyReportBody, { employees: employees, records: records, anchorISO: toISO(new Date()), companyName: settings.companyName })), h("div", { key: "pm-hidden", className: "printable-report-monthly" }, h(MonthlyReportBody, { employees: employees, records: records, month: new Date().getMonth(), year: new Date().getFullYear(), companyName: settings.companyName }))]));
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

