const STORAGE_KEY = "gradeflow-data-v2";
const defaultData = {
  settings: { passingGrade: 70, teacherName: "Alex" },
  subjects: [],
  students: [],
  grades: [],
  activity: []
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
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }
function buildSchedule(assignments) {
  const days = ["Tuesday", "Wednesday", "Thursday", "Friday"];
  return assignments.flatMap((assignment, assignmentIndex) => {
    const reading = assignment.match(/^(.*?\b(?:read|reading)\b.*?)(?:\s*\(?\s*(\d+)\s*pages?\s*\)?\s*)$/i);
    const title = reading?.[1].trim() || assignment;
    const pageCount = reading ? Number(reading[2]) : 0;
    const lessonCount = Number(assignment.match(/(\d+)\s+lessons?/i)?.[1] || 0);
    if (!reading && lessonCount > 1) {
      const lessonsPerDay = Math.floor(lessonCount / days.length);
      const extraLessons = lessonCount % days.length;
      let startLesson = 1;
      return days.flatMap((day, dayIndex) => {
        const count = lessonsPerDay + (dayIndex < extraLessons ? 1 : 0);
        if (!count) return [];
        const endLesson = startLesson + count - 1;
        const item = { assignment: `${assignment} (lessons ${startLesson}-${endLesson})`, day };
        startLesson = endLesson + 1;
        return [item];
      });
    }
    if (pageCount <= 40) return [{ assignment, day: days[assignmentIndex % days.length] }];
    const pagesPerDay = Math.floor(pageCount / days.length);
    const extraPages = pageCount % days.length;
    let startPage = 1;
    return days.map((day, index) => {
      const count = pagesPerDay + (index < extraPages ? 1 : 0);
      const endPage = startPage + count - 1;
      const item = { assignment: `${title} (pages ${startPage}-${endPage})`, day };
      startPage = endPage + 1;
      return item;
    });
  });
}
function notify(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2600); }

function render() {
  renderSidebarStudents();
  renderStudentSubjects();
  renderGradeClasses();
  renderGradeStudents();
  $("#passing-grade").value = data.settings.passingGrade;
  $("#teacher-name").value = data.settings.teacherName;
}
function renderSidebarStudents() {
  const list = $("#sidebar-students");
  list.innerHTML = data.students.map((student) => `<button class="sidebar-student" data-profile-student="${student.id}"><span class="student-avatar">${initials(student.name)}</span><span>${student.name}</span></button>`).join("");
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
  $("#students-table").innerHTML = students.map((student, index) => `<tr><td><button class="student-link" data-edit-student="${student.id}"><div class="student-cell"><span class="student-avatar ${index % 2 ? "alt" : ""}">${initials(student.name)}</span>${student.name}</div></button></td><td><button class="action-menu delete-student" data-id="${student.id}" title="Remove student">···</button></td></tr>`).join("");
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
  const scheduleInput = student.scheduleInput || "";
  const schedule = scheduleInput
    ? buildSchedule(scheduleInput.split(/\r?\n/).map((assignment) => assignment.trim()).filter(Boolean))
    : (student.schedule || []);
  const days = ["Tuesday", "Wednesday", "Thursday", "Friday"];
  $("#student-profile-page").innerHTML = `<div class="page-heading"><div><p class="eyebrow">Student profile</p><h1>${escapeHtml(student.name)}</h1><p class="muted">${escapeHtml(student.email || "No email added")}</p></div><button class="secondary-button" data-profile-edit="${student.id}">Edit profile</button></div><div class="card profile-section schedule-planner"><h2>Build a weekly schedule</h2><p class="muted">Input assignments one per line. For reading assignments, include the page count, such as “Read chapter 3 - 80 pages”; anything over 40 pages is split evenly across Tuesday through Friday.</p><form data-schedule-form="${student.id}"><label>Schedule input<textarea name="assignments" rows="7" placeholder="Read chapter 3 - 80 pages&#10;Finish science worksheet&#10;Practice vocabulary">${escapeHtml(scheduleInput)}</textarea></label><button class="primary-button" type="submit">Build weekly schedule</button></form></div><div class="card profile-section"><h2>Tuesday through Friday schedule</h2><p class="muted">Output generated from the schedule input above.</p>${schedule.length ? `<div class="schedule-grid">${days.map((day) => `<div class="schedule-day"><h3>${day}</h3><div class="schedule-items">${schedule.filter((item) => item.day === day).map((item) => `<div class="schedule-item">${escapeHtml(item.assignment)}</div>`).join("") || `<p class="muted">No assignments</p>`}</div></div>`).join("")}</div>` : `<p class="muted">No schedule yet. Add assignments above to create one.</p>`}</div>`;
  $$(".view-panel").forEach((panel) => panel.classList.toggle("hidden", panel.id !== "student-profile-view"));
}
function openModal(id) {
  if (data.students.length === 0 && id === "grade-modal") { notify("Add a student before recording a grade."); return; }
  const modal = $(`#${id}`);
  if (!modal) return;
  if (id === "student-modal") {
    $("#student-form").reset();
    setTimeout(() => $("#student-form input[name='name']").focus(), 0);
  }
  modal.classList.remove("hidden");
}
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
function addStudent(name) {
  const student = { id: `s${Date.now()}`, name, email: "", className: "", classes: [], schedule: [], createdAt: new Date().toISOString().slice(0, 10) };
  data.students.push(student);
  saveData();
  renderSidebarStudents();
  return student;
}
function download(filename, content) { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "application/json" })); link.download = filename; link.click(); URL.revokeObjectURL(link.href); }
function exportCsv() { const rows = [["Student", "Class", "Assignment", "Grade", "Date"]]; data.grades.forEach((grade) => { const student = studentById(grade.studentId); rows.push([student?.name || "", student?.className || "", grade.assignment, gradeLabel(grade), grade.date]); }); const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "gradeflow-export.csv"; link.click(); URL.revokeObjectURL(link.href); notify("Gradebook exported."); }

$$(".nav-item, [data-view]").forEach((button) => button.addEventListener("click", () => { const view = button.dataset.view; if (!view) return; $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view)); $$(".view-panel").forEach((panel) => panel.classList.toggle("hidden", panel.id !== `${view}-view`)); }));
$$("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop"))));
$$(".modal-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(backdrop); }));
$("#student-form").addEventListener("submit", (event) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get("name") || "").trim(); if (!name) { notify("Enter a student name."); return; } const student = addStudent(name); render(); closeModal($("#student-modal")); notify(`${student.name} added.`); });
$("#edit-student-form").addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.target); const student = studentById(form.get("studentId")); const classes = form.getAll("classes"); if (!student || !classes.length) { notify("Choose at least one class."); return; } student.name = String(form.get("name") || "").trim(); student.email = String(form.get("email") || "").trim(); student.classes = classes; student.className = classes[0]; saveData(); render(); closeModal($("#edit-student-modal")); openStudentProfile(student); notify(`${student.name} updated.`); });
$("#grade-type").addEventListener("change", (event) => { const isLetter = event.target.value === "letter"; $("#percent-grade-field").classList.toggle("hidden", isLetter); $("#letter-grade-field").classList.toggle("hidden", !isLetter); $("#max-points-field").classList.toggle("hidden", isLetter); $("#grade-score").required = !isLetter; $("#grade-letter").required = isLetter; $("#max-points").required = !isLetter; });
$("#grade-class").addEventListener("change", renderGradeStudents);
$("#grade-form").addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.target); const student = studentById(form.get("studentId")); if (!student || !(student.classes || [student.className]).includes(form.get("className"))) { notify("Choose a student from the selected class."); return; } const letter = form.get("gradeType") === "letter" ? form.get("letter") : null; const score = letter ? letterScores[letter] : Number(form.get("score")); const grade = { id: `g${Date.now()}`, studentId: student.id, className: form.get("className"), assignment: form.get("assignment").trim(), score, letter, maxPoints: Number(form.get("maxPoints")), date: new Date().toISOString().slice(0, 10) }; data.grades.push(grade); addActivity(`You recorded a grade for ${student.name}`, `${grade.className} · ${grade.assignment} · ${gradeLabel(grade)}`); saveData(); render(); closeModal($("#grade-modal")); notify("Grade saved."); });
$("#export-settings").addEventListener("click", () => { download("gradeflow-backup.json", JSON.stringify(data, null, 2)); notify("Backup downloaded."); });
$("#save-settings").addEventListener("click", () => { data.settings.passingGrade = Math.max(0, Math.min(100, Number($("#passing-grade").value) || 70)); data.settings.teacherName = $("#teacher-name").value.trim() || "Teacher"; saveData(); render(); notify("Preferences saved."); });
$("#import-file").addEventListener("change", (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = JSON.parse(reader.result); if (!imported.students || !imported.grades) throw new Error("Invalid backup"); imported.subjects = [...new Set([...(imported.subjects || []), ...imported.students.map((student) => student.className).filter(Boolean)])]; data = imported; saveData(); render(); notify("Backup imported."); } catch { notify("That file is not a valid GradeFlow backup."); } }; reader.readAsText(file); });
$("#clear-data").addEventListener("click", () => { if (confirm("Clear all students, grades, subjects, and activity from this browser?")) { data = { settings: { passingGrade: 70, teacherName: "Teacher" }, subjects: [], students: [], grades: [], activity: [] }; saveData(); render(); notify("Local gradebook cleared."); } });
document.addEventListener("click", (event) => { const modalButton = event.target.closest("[data-modal]"); if (modalButton) { openModal(modalButton.dataset.modal); return; } const profileButton = event.target.closest("[data-profile-student]"); if (profileButton) { const student = studentById(profileButton.dataset.profileStudent); if (student) openStudentProfile(student); return; } const editButton = event.target.closest("[data-profile-edit]"); if (editButton) { const student = studentById(editButton.dataset.profileEdit); if (!student) return; $("#edit-student-id").value = student.id; $("#edit-student-name").value = student.name; $("#edit-student-email").value = student.email || ""; $$("#edit-student-classes input").forEach((input) => { input.checked = (student.classes || [student.className]).includes(input.value); }); $("#edit-student-modal").classList.remove("hidden"); return; } });
document.addEventListener("submit", (event) => { const scheduleForm = event.target.closest("[data-schedule-form]"); if (!scheduleForm) return; event.preventDefault(); const student = studentById(scheduleForm.dataset.scheduleForm); const assignments = String(new FormData(scheduleForm).get("assignments") || "").split(/\r?\n/).map((assignment) => assignment.trim()).filter(Boolean); if (!student) return; if (!assignments.length) { notify("Enter at least one assignment."); return; } student.scheduleInput = assignments.join("\n"); student.schedule = buildSchedule(assignments); saveData(); openStudentProfile(student); notify("Weekly schedule created."); });
$("#theme-toggle").addEventListener("click", () => { document.body.classList.toggle("dark"); localStorage.setItem("gradeflow-theme", document.body.classList.contains("dark") ? "dark" : "light"); });
if (localStorage.getItem("gradeflow-theme") === "dark") document.body.classList.add("dark");
render();
