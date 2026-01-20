// ---------- Service Worker ----------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
}

// ---------- Small Utility ----------
function flashWhiteScreen() {
  const flash = document.getElementById("screenFlash");
  flash.style.opacity = "1";
  setTimeout(() => (flash.style.opacity = "0"), 200);
}

// ---------- Global State ----------
let currentExercise = null;
let boostedFlag = false;

// ---------- Prefill Helper ----------
function prefillForExerciseAndMachine(exerciseName, machineName, inputs) {
  const { setsInput, repsInput, weightInput } = inputs;
  const history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];

  if (!machineName) {
    setsInput.value = "";
    repsInput.value = "";
    weightInput.value = "";
    return;
  }

  const recentEntry = history.find(
    (entry) =>
      entry &&
      entry.exercise?.trim().toLowerCase() ===
        exerciseName.trim().toLowerCase() &&
      entry.machine === machineName,
  );

  setsInput.value = recentEntry?.sets ?? "";
  repsInput.value = recentEntry?.reps ?? "";
  weightInput.value = recentEntry?.weight ?? "";
}

// ---------- Popup Controls ----------
function openForm(exerciseName) {
  const wrapper = document.getElementById("myForm");
  const form = document.querySelector("#myForm .form-container");
  const title = document.getElementById("formTitle");

  if (!wrapper || !form || !title) return;

  currentExercise = exerciseName;
  boostedFlag = false;

  wrapper.style.display = "block";
  form.setAttribute("data-exercise", exerciseName);
  title.textContent = exerciseName;

  const history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];
  const recent = history.find(
    (e) =>
      e.exercise?.trim().toLowerCase() === exerciseName.trim().toLowerCase(),
  );

  const machineInput = form.elements["machine"];
  machineInput.value = recent?.machine ?? "";

  prefillForExerciseAndMachine(exerciseName, machineInput.value, {
    setsInput: form.elements["sets"],
    repsInput: form.elements["reps"],
    weightInput: form.elements["weight"],
  });
}

function closeForm() {
  const wrapper = document.getElementById("myForm");
  if (wrapper) wrapper.style.display = "none";
}

// ---------- History Rendering ----------
function renderHistoryTable() {
  const section = document.getElementById("history");
  if (!section) return;

  const old = document.getElementById("historyTable");
  if (old) old.remove();

  const table = document.createElement("table");
  table.id = "historyTable";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Exercise</th>
        <th>Sets</th>
        <th>Reps/Mins</th>
        <th>Weight/Setting</th>
        <th>Machine</th>
        <th>Delete</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");
  const history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];

  history.forEach((e) => {
    if (e.date) e.date = e.date.trim();
    if (typeof e.boosted === "undefined") e.boosted = false;
  });

  history.sort((a, b) => new Date(a.date) - new Date(b.date));

  let lastDate = null;
  let toggle = false;

  history.forEach((entry) => {
    if (entry.date !== lastDate) {
      toggle = !toggle;
      lastDate = entry.date;
    }

    const row = document.createElement("tr");
    row.style.backgroundColor = toggle ? "#ffffff" : "#bbbbbbff";

    const makeCell = (text, editable = false) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (editable) td.addEventListener("click", () => makeEditable(td));
      return td;
    };

    row.appendChild(makeCell(entry.date, true));

    const exerciseCell = makeCell(
      entry.boosted ? `${entry.exercise} +` : entry.exercise,
    );
    exerciseCell.addEventListener("click", () => {
      entry.boosted = !entry.boosted;
      exerciseCell.textContent = entry.boosted
        ? `${entry.exercise} +`
        : entry.exercise;
      saveHistoryFromTable();
    });
    row.appendChild(exerciseCell);

    row.appendChild(makeCell(entry.sets, true));
    row.appendChild(makeCell(entry.reps, true));
    row.appendChild(makeCell(entry.weight, true));
    row.appendChild(makeCell(entry.machine, true));

    const del = document.createElement("td");
    const btn = document.createElement("button");
    btn.className = "delButton";
    btn.textContent = "✖";
btn.onclick = () => {
  const h = JSON.parse(localStorage.getItem("fitnessHistory")) || [];

  const rows = Array.from(document.querySelectorAll("#historyTable tbody tr"));
  const domIndex = rows.indexOf(row);
  const arrayIndex = h.length - 1 - domIndex;

  console.log("Delete mapping:", { domIndex, arrayIndex, arrayLength: h.length });

  if (arrayIndex >= 0 && arrayIndex < h.length) {
    h.splice(arrayIndex, 1);
    localStorage.setItem("fitnessHistory", JSON.stringify(h));
  }

  // Remove from UI
  row.remove();

  // 🔥 Critical: update localStorage based on new DOM
  saveHistoryFromTable();
};


    del.appendChild(btn);
    row.appendChild(del);

    tbody.insertBefore(row, tbody.firstChild);
  });

  section.appendChild(table);
}

// ---------- Editable Cells ----------
function makeEditable(cell) {
  const original = cell.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = original;
  input.style.width = "100%";

  input.addEventListener("blur", () => {
    cell.textContent = input.value;
    saveHistoryFromTable();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
  });

  cell.textContent = "";
  cell.appendChild(input);
  input.focus();
}

function saveHistoryFromTable() {
  const rows = document.querySelectorAll("#historyTable tbody tr");
  const updated = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 7) return;

    let exerciseText = cells[1].textContent;
    let boosted = false;

    if (exerciseText.endsWith(" +")) {
      boosted = true;
      exerciseText = exerciseText.slice(0, -2);
    }

    updated.push({
      date: cells[0].textContent,
      exercise: exerciseText,
      sets: cells[2].textContent,
      reps: cells[3].textContent,
      weight: cells[4].textContent,
      machine: cells[5].textContent,
      boosted,
    });
  });

  localStorage.setItem("fitnessHistory", JSON.stringify(updated));
}

// ---------- DOMContentLoaded ----------
document.addEventListener("DOMContentLoaded", () => {
  // Expandable groups
  document.querySelectorAll(".group-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      toggle.nextElementSibling.classList.toggle("show");
    });
  });

  // Popup boosted toggle
  const title = document.getElementById("formTitle");
  if (title) {
    title.addEventListener("click", () => {
      boostedFlag = !boostedFlag;
      title.textContent = boostedFlag
        ? `${currentExercise} +`
        : currentExercise;
    });
  }

  // Machine change → prefill
  const form = document.querySelector("#myForm .form-container");
  const machineSelect = document.getElementById("machineSelect");

  if (machineSelect && form) {
    machineSelect.addEventListener("change", () => {
      prefillForExerciseAndMachine(currentExercise, machineSelect.value, {
        setsInput: form.elements["sets"],
        repsInput: form.elements["reps"],
        weightInput: form.elements["weight"],
      });
    });
  }

  // Form submit
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const entry = {
        date: new Date().toISOString().split("T")[0],
        exercise: currentExercise || "Custom Entry",
        sets: form.elements["sets"].value,
        reps: form.elements["reps"].value,
        weight: form.elements["weight"].value,
        machine: form.elements["machine"].value,
        boosted: boostedFlag,
      };

      const history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];
      history.unshift(entry);
      localStorage.setItem("fitnessHistory", JSON.stringify(history));

      flashWhiteScreen();
      form.reset();
      boostedFlag = false;
      closeForm();
      renderHistoryTable();
    });
  }

  renderHistoryTable();
});

// ---------- Timer (Safe Wrapped) ----------
let timerInterval = null;
let timerSeconds = 0;
let lastEnteredSeconds = 0;
let countingDown = false;
let editingTimer = false;
let editDigits = "";

const display = document.getElementById("timerDisplay");
const startStopBtn = document.getElementById("timerStartStop");
const resetBtn = document.getElementById("timerReset");
const hidden = document.getElementById("timerHiddenInput");

if (display && startStopBtn && resetBtn && hidden) {
  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function updateDisplay() {
    display.textContent = formatTime(timerSeconds);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    startStopBtn.textContent = "Start";
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      if (countingDown) {
        timerSeconds--;
        if (timerSeconds <= 0) {
          timerSeconds = 0;
          stopTimer();

          const beep = document.getElementById("timerBeep");
          if (beep) {
            beep.currentTime = 0;
            beep.play().catch(() => {});
          }

          display.classList.add("timer-alert");
        }
      } else {
        timerSeconds++;
      }
      updateDisplay();
    }, 1000);
  }

  startStopBtn.addEventListener("click", () => {
    if (timerInterval) stopTimer();
    else {
      startStopBtn.textContent = "Stop";
      startTimer();
    }
  });

  resetBtn.addEventListener("click", () => {
    stopTimer();
    display.classList.remove("timer-alert");

    if (lastEnteredSeconds > 0) {
      timerSeconds = lastEnteredSeconds;
      countingDown = true;
    } else {
      timerSeconds = 0;
      countingDown = false;
    }

    updateDisplay();
  });

  display.addEventListener("click", () => {
    editingTimer = true;
    editDigits = "";
    display.classList.remove("timer-alert");

    hidden.value = "";
    hidden.focus();
    display.textContent = "00:00";
  });

  hidden.addEventListener("input", () => {
    let raw = hidden.value.replace(/\D/g, "").slice(-4);
    editDigits = raw;

    if (!raw.length) {
      timerSeconds = 0;
      lastEnteredSeconds = 0;
      countingDown = false;
      display.textContent = "00:00";
      return;
    }

    raw = raw.padStart(4, "0");
    const mins = parseInt(raw.slice(0, 2), 10);
    const secs = parseInt(raw.slice(2, 4), 10);

    timerSeconds = mins * 60 + secs;
    lastEnteredSeconds = timerSeconds;
    countingDown = timerSeconds > 0;

    display.textContent = formatTime(timerSeconds);
  });

  display.addEventListener("blur", () => {
    editingTimer = false;
    display.textContent = formatTime(timerSeconds);
  });

  display.tabIndex = 0;
}
