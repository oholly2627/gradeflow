const STORAGE_KEY = "gradeflow-data-v1";
const defaultData = {
  settings: { passingGrade: 70, teacherName: "Alex" },
  subjects: ["Biology 101", "World History"],
  students: [
    { id: "s1", name: "Maya Thompson", email: "maya.t@example.com", className: "Biology 101", createdAt: "2026-10-01" },
    { id: "s2", name: "Noah Williams", email: "noah.w@example.com", className: "Biology 101", createdAt: "2026-10-02" },
    { id: "s3", name: "Sofia Martinez", email: "sofia.m@example.com", className: "World History", createdAt: "2026-10-03" },
    { id: "s4", name: "Ethan Brown", email: "ethan.b@example.com", className: "World History", createdAt: "2026-10-04" }
  ],
  grades: [
    { id: "g1", studentId: "s1", assignment: "Cell structure lab", score: 94, maxPoints: 100, date: "2026-10-21" },
    { id: "g2", studentId: "s1", assignment: "Chapter 2 quiz", score: 89, maxPoints: 100, date: "2026-10-18" },
    { id: "g3", studentId: "s2", assignment: "Cell structure lab", score: 76, maxPoints: 100, date: "2026-10-21" },
    { id: "g4", studentId: "s2", assignment: "Chapter 2 quiz", score: 68, maxPoints: 100, date: "2026-10-18" },
    { id: "g5", studentId: "s3", assignment: "Primary sources essay", score: 91, maxPoints: 100, date: "2026-10-20" },
    { id: "g6", studentId: "s4", assignment: "Primary sources essay", score: 63, maxPoints: 100, date: "2026-10-20" }
  ],
  activity: [
    { text: "You recorded a grade for Maya Thompson", detail: "Cell structure lab · 94%", date: "2026-10-21" },
    { text: "You recorded a grade for Ethan Brown", detail: "Primary sources essay · 63%", date: "2026-10-20" },
    { text: "You added Sofia Martinez to your roster", detail: "World History", date: "2026-10-03" }
  ]
};
let data = loadData();
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultData);
    saved.students = (saved.students || []).map((student) => {
      const classes = [...new Set((student.classes || [student.className]).filter(Boolean))];
      return { ...student, classes, className: classes[0] || "" };
    });
    saved.subjects = [...new Set([...(saved.subjects || []), ...saved.students.flatMap((student) => student.classes)])];
    return saved;
  }
  catch { return structuredClone(defaultData); }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function studentGrades(studentId) { return data.grades.filter((grade) => grade.studentId === studentId); }
function average(studentId) {
  const grades = studentGrades(studentId);
  return grades.length ? Math.round(grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length) : null;
}
function formatDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function statusFor(score) {
  if (score === null) return ["No grades", "watch"];
  if (score >= 85) return ["On track", "good"];
  if (score >= data.settings.passingGrade) return ["Watch", "watch"];
  return ["Needs help", "help"];
}
function studentById(id) { return data.students.find((student) => student.id === id); }
const letterScores = { A: 97.5, B: 89.5, C: 79.5, D: 69.5, F: 32 };
function gradeLabel(grade) { return grade.letter || `${grade.score}%`; }
function notify(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2600); }

function render() {
  renderStudents();
  renderAssignments();
  renderFilters();
  renderStudentSubjects();
  renderGradeClasses();
  renderGradeStudents();
  $("#passing-grade").value = data.settings.passingGrade;
  $("#teacher-name").value = data.settings.teacherName;
}
function renderPerformance() {
  const body = $("#performance-table");
  body.innerHTML = data.students.slice(0, 5).map((student, index) => {
    const score = average(student.id); const [status, statusClass] = statusFor(score);
    return `<tr><td><div class="student-cell"><span class="student-avatar ${index % 3 === 1 ? "alt" : index % 3 === 2 ? "green-alt" : ""}">${initials(student.name)}</span>${student.name}</div></td><td><span class="score">${score === null ? "—" : `${score}%`}</span>${score !== null ? `<span class="score-bar ${score < 70 ? "low" : score < 85 ? "medium" : ""}"><i style="width:${score}%"></i></span>` : ""}</td><td><span class="status-pill ${statusClass}">${status}</span></td></tr>`;
  }).join("");
  $("#performance-empty").classList.toggle("hidden", data.students.length > 0);
}
function renderDistribution() {
  const buckets = [0, 0, 0, 0];
  data.students.forEach((student) => { const score = average(student.id) ?? 0; buckets[score >= 90 ? 0 : score >= 80 ? 1 : score >= 70 ? 2 : 3]++; });
  const max = Math.max(...buckets, 1);
  $("#distribution-chart").innerHTML = buckets.map((count, index) => `<div class="bar-group"><span class="bar-label">${count}</span><div class="bar" style="height:${Math.max(6, count / max * 140)}px"></div><span>${["A", "B", "C", "D/F"][index]}</span></div>`).join("");
}
function renderActivity() {
  $("#activity-list").innerHTML = data.activity.slice(0, 5).map((item) => `<div class="activity-row"><span class="activity-badge">${item.text.includes("added") ? "♙" : "✓"}</span><div><p>${item.text}</p><small>${item.detail}</small></div><time>${formatDate(item.date)}</time></div>`).join("") || `<div class="empty-state">No activity yet.</div>`;
}
function renderStudents() {
  const search = ($("#student-search")?.value || "").toLowerCase(); const classFilter = $("#class-filter")?.value || "all";
  const students = data.students.filter((student) => `${student.name} ${student.email} ${(student.classes || [student.className]).join(" ")}`.toLowerCase().includes(search) && (classFilter === "all" || (student.classes || [student.className]).includes(classFilter)));
  $("#students-table").innerHTML = students.map((student, index) => { const score = average(student.id); return `<tr><td><button class="student-link" data-edit-student="${student.id}"><div class="student-cell"><span class="student-avatar ${index % 2 ? "alt" : ""}">${initials(student.name)}</span>${student.name}</div></button></td><td>${student.email || "—"}</td><td class="score">${score === null ? "—" : `${score}%`}</td><td>${formatDate(data.grades.filter((grade) => grade.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date))[0]?.date || student.createdAt)}</td><td><button class="action-menu delete-student" data-id="${student.id}" title="Remove student">···</button></td></tr>`; }).join("");
  $("#students-empty").classList.toggle("hidden", students.length > 0);
}
function renderFilters() {
  const current = $("#class-filter").value; const classes = [...new Set(data.students.flatMap((student) => student.classes || [student.className]).filter(Boolean))];
  $("#class-filter").innerHTML = `<option value="all">All classes</option>${classes.map((name) => `<option value="${name}">${name}</option>`).join("")}`;
  $("#class-filter").value = classes.includes(current) ? current : "all";
}
function renderGradeClasses() {
  $("#grade-class").innerHTML = data.subjects.length
    ? data.subjects.map((subject) => `<option value="${subject}">${subject}</option>`).join("")
    : `<option value="">Add a subject first</option>`;
}
function renderGradeStudents() {
  const selectedClass = $("#grade-class").value;
  const students = data.students.filter((student) => !selectedClass || (student.classes || [student.className]).includes(selectedClass));
  $("#grade-student").innerHTML = students.length
    ? students.map((student) => `<option value="${student.id}">${student.name}</option>`).join("")
    : `<option value="">No students in this class</option>`;
}
function renderStudentSubjects() {
  $("#edit-student-classes").innerHTML = data.subjects.map((subject) => `<label class="class-checkbox"><input type="checkbox" name="classes" value="${subject}"> ${subject}</label>`).join("") || `<span class="muted">Add a subject first.</span>`;
}
function openStudentProfile(student) {
  const classes = student.classes || [student.className];
  const grades = studentGrades(student.id).slice().sort((a, b) => b.date.localeCompare(a.date));
  const score = average(student.id);
  $("#student-profile-content").innerHTML = `<p class="eyebrow">Student profile</p><div class="profile-heading"><div class="student-cell"><span class="student-avatar">${initials(student.name)}</span><div><h2>${student.name}</h2><p class="muted">${student.email || "No email added"}</p></div></div><button class="secondary-button" data-profile-edit="${student.id}">Edit profile</button></div><div class="profile-stats"><div><span class="stat-label">Average score</span><strong>${score === null ? "—" : `${score}%`}</strong></div><div><span class="stat-label">Assignments</span><strong>${grades.length}</strong></div></div><div class="profile-section"><h3>Classes</h3><p class="muted">${classes.join(", ") || "No classes assigned"}</p></div><div class="profile-section"><h3>Grades and scores</h3>${grades.length ? `<div class="profile-grades">${grades.map((grade) => `<div class="profile-grade"><div><strong>${grade.assignment}</strong><small>${grade.className || classes[0] || ""} · ${formatDate(grade.date)}</small></div><strong class="${grade.score < data.settings.passingGrade ? "warning" : ""}">${gradeLabel(grade)}</strong></div>`).join("")}</div>` : `<p class="muted">No grades recorded yet.</p>`}</div>`;
  $("#student-profile-modal").classList.remove("hidden");
}
function renderAssignments() {
  const list = $("#assignments-list");
  list.innerHTML = data.grades.slice().sort((a, b) => b.date.localeCompare(a.date)).map((grade) => { const student = studentById(grade.studentId); return `<div class="assignment-row"><div class="assignment-name">${grade.assignment}<small>${student?.name || "Unknown student"} · ${student?.className || ""}</small></div><div class="assignment-meta">${formatDate(grade.date)}</div><div class="assignment-score ${grade.score < data.settings.passingGrade ? "warning" : ""}">${gradeLabel(grade)}</div></div>`; }).join("");
  list.classList.toggle("hidden", data.grades.length === 0); $("#assignments-empty").classList.toggle("hidden", data.grades.length > 0);
}
function openModal(id) { if (data.students.length === 0 && id === "grade-modal") { notify("Add a student before recording a grade."); return; } $(`#${id}`).classList.remove("hidden"); }
function closeModal(modal) {
  modal.classList.add("hidden");
  modal.querySelector("form")?.reset();
  if (modal.id === "grade-modal") {
    $("#percent-grade-field").classList.remove("hidden");
    $("#letter-grade-field").classList.add("hidden");
    $("#max-points-field").classList.remove("hidden");
    $("#grade-score").required = true;
    $("#grade-letter").required = false;
    $("#max-points").required = true;
  }
}
function addActivity(text, detail) { data.activity.unshift({ text, detail, date: new Date().toISOString().slice(0, 10) }); }
function download(filename, content) { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "application/json" })); link.download = filename; link.click(); URL.revokeObjectURL(link.href); }
function exportCsv() { const rows = [["Student", "Class", "Assignment", "Grade", "Date"]]; data.grades.forEach((grade) => { const student = studentById(grade.studentId); rows.push([student?.name || "", student?.className || "", grade.assignment, gradeLabel(grade), grade.date]); }); const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "gradeflow-export.csv"; link.click(); URL.revokeObjectURL(link.href); notify("Gradebook exported."); }

$$(".nav-item, [data-view]").forEach((button) => button.addEventListener("click", () => { const view = button.dataset.view; if (!view) return; $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view)); $$(".view-panel").forEach((panel) => panel.classList.toggle("hidden", panel.id !== `${view}-view`)); }));
$$("[data-modal]").forEach((button) => button.addEventListener("click", () => openModal(button.dataset.modal)));
$$("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop"))));
$$(".modal-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(backdrop); }));
$("#student-form").addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.target); const student = { id: `s${Date.now()}`, name: form.get("name").trim(), email: "", className: "", classes: [], createdAt: new Date().toISOString().slice(0, 10) }; data.students.push(student); addActivity(`You added ${student.name} to your roster`, "No classes assigned"); saveData(); render(); closeModal($("#student-modal")); notify(`${student.name} added to your roster.`); });
$("#edit-student-form").addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.target); const student = studentById(form.get("studentId")); const classes = form.getAll("classes"); if (!student || !classes.length) { notify("Choose at least one class."); return; } student.name = form.get("name").trim(); student.email = form.get("email").trim(); student.classes = classes; student.className = classes[0]; addActivity(`You updated ${student.name}'s classes`, classes.join(" · ")); saveData(); render(); closeModal($("#edit-student-modal")); notify(`${student.name}'s classes updated.`); });
$("#grade-type").addEventListener("change", (event) => { const isLetter = event.target.value === "letter"; $("#percent-grade-field").classList.toggle("hidden", isLetter); $("#letter-grade-field").classList.toggle("hidden", !isLetter); $("#max-points-field").classList.toggle("hidden", isLetter); $("#grade-score").required = !isLetter; $("#grade-letter").required = isLetter; $("#max-points").required = !isLetter; });
$("#grade-class").addEventListener("change", renderGradeStudents);
$("#grade-form").addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.target); const student = studentById(form.get("studentId")); if (!student || !(student.classes || [student.className]).includes(form.get("className"))) { notify("Choose a student from the selected class."); return; } const letter = form.get("gradeType") === "letter" ? form.get("letter") : null; const score = letter ? letterScores[letter] : Number(form.get("score")); const grade = { id: `g${Date.now()}`, studentId: student.id, className: form.get("className"), assignment: form.get("assignment").trim(), score, letter, maxPoints: Number(form.get("maxPoints")), date: new Date().toISOString().slice(0, 10) }; data.grades.push(grade); addActivity(`You recorded a grade for ${student.name}`, `${grade.className} · ${grade.assignment} · ${gradeLabel(grade)}`); saveData(); render(); closeModal($("#grade-modal")); notify("Grade saved."); });
$("#student-search").addEventListener("input", renderStudents); $("#class-filter").addEventListener("change", renderStudents);
$("#export-settings").addEventListener("click", () => { download("gradeflow-backup.json", JSON.stringify(data, null, 2)); notify("Backup downloaded."); });
$("#save-settings").addEventListener("click", () => { data.settings.passingGrade = Math.max(0, Math.min(100, Number($("#passing-grade").value) || 70)); data.settings.teacherName = $("#teacher-name").value.trim() || "Teacher"; saveData(); render(); notify("Preferences saved."); });
$("#import-file").addEventListener("change", (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = JSON.parse(reader.result); if (!imported.students || !imported.grades) throw new Error("Invalid backup"); imported.subjects = [...new Set([...(imported.subjects || []), ...imported.students.map((student) => student.className).filter(Boolean)])]; data = imported; saveData(); render(); notify("Backup imported."); } catch { notify("That file is not a valid GradeFlow backup."); } }; reader.readAsText(file); });
$("#clear-data").addEventListener("click", () => { if (confirm("Clear all students, grades, subjects, and activity from this browser?")) { data = { settings: { passingGrade: 70, teacherName: "Teacher" }, subjects: [], students: [], grades: [], activity: [] }; saveData(); render(); notify("Local gradebook cleared."); } });
document.addEventListener("click", (event) => { const profileButton = event.target.closest("[data-edit-student]"); if (profileButton) { const student = studentById(profileButton.dataset.editStudent); if (student) openStudentProfile(student); return; } const editButton = event.target.closest("[data-profile-edit]"); if (editButton) { const student = studentById(editButton.dataset.profileEdit); if (!student) return; const classes = student.classes || [student.className]; closeModal($("#student-profile-modal")); $("#edit-student-id").value = student.id; $("#edit-student-name").value = student.name; $("#edit-student-email").value = student.email || ""; $$("#edit-student-classes input").forEach((input) => { input.checked = classes.includes(input.value); }); $("#edit-student-modal").classList.remove("hidden"); return; } });
$("#theme-toggle").addEventListener("click", () => { document.body.classList.toggle("dark"); localStorage.setItem("gradeflow-theme", document.body.classList.contains("dark") ? "dark" : "light"); });
if (localStorage.getItem("gradeflow-theme") === "dark") document.body.classList.add("dark");
render();
