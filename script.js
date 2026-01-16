if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js", { scope: "./" })
    .then((reg) => console.log("Service Worker registered:", reg))
    .catch((err) => console.error("Service Worker registration failed:", err));
}

function flashWhiteScreen() {
  const flash = document.getElementById("screenFlash");
  flash.style.opacity = "1";
  setTimeout(() => {
    flash.style.opacity = "0";
  }, 200);
}

// ---------- Form Controls ----------
let currentExercise = null;
let boostedFlag = false;

function openForm(exerciseName) {
  const formWrapper = document.getElementById("myForm");
  const form = document.querySelector("#myForm .form-container");
  const title = document.getElementById("formTitle");

  if (!formWrapper || !form || !title) {
    console.warn("Form or form elements not found.");
    return;
  }

  const setsInput = form.elements["sets"];
  const repsInput = form.elements["reps"];
  const weightInput = form.elements["weight"];
  const machineInput = form.elements["machine"];

  currentExercise = exerciseName;
  boostedFlag = false;

  formWrapper.style.display = "block";
  form.setAttribute("data-exercise", exerciseName);
  title.textContent = exerciseName;

  let history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];

  // Pick most recent machine for this exercise (if any)
  const recentAnyMachine = history.find(
    (entry) =>
      entry &&
      typeof entry.exercise === "string" &&
      entry.exercise.trim().toLowerCase() === exerciseName.trim().toLowerCase()
  );

  if (recentAnyMachine && recentAnyMachine.machine) {
    machineInput.value = recentAnyMachine.machine;
  } else {
    machineInput.value = "";
  }

  prefillForExerciseAndMachine(exerciseName, machineInput.value, {
    setsInput,
    repsInput,
    weightInput,
  });
}
// make absolutely sure it's on window
window.openForm = openForm;

function prefillForExerciseAndMachine(exerciseName, machineName, inputs) {
  const { setsInput, repsInput, weightInput } = inputs;
  let history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];

  if (!machineName) {
    setsInput.value = "";
    repsInput.value = "";
    weightInput.value = "";
    return;
  }

  const recentEntry = history.find(
    (entry) =>
      entry &&
      typeof entry.exercise === "string" &&
      entry.exercise.trim().toLowerCase() ===
        exerciseName.trim().toLowerCase() &&
      entry.machine === machineName
  );

  if (recentEntry) {
    setsInput.value = recentEntry.sets ?? "";
    repsInput.value = recentEntry.reps ?? "";
    weightInput.value = recentEntry.weight ?? "";
  } else {
    setsInput.value = "";
    repsInput.value = "";
    weightInput.value = "";
  }
}

function closeForm() {
  const formWrapper = document.getElementById("myForm");
  if (formWrapper) {
    formWrapper.style.display = "none";
  }
}

// ---------- Form Submission + Popup Behavior + Group Toggles ----------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#myForm .form-container");
  const title = document.getElementById("formTitle");
  const machineSelect = document.getElementById("machineSelect");

  // Toggle boosted via exercise name (+)
  if (title) {
    title.addEventListener("click", () => {
      boostedFlag = !boostedFlag;
      title.textContent = boostedFlag
        ? `${currentExercise} +`
        : currentExercise;
    });
  }

  // Machine change → reload prefill
  if (machineSelect && form) {
    machineSelect.addEventListener("change", () => {
      const setsInput = form.elements["sets"];
      const repsInput = form.elements["reps"];
      const weightInput = form.elements["weight"];
      prefillForExerciseAndMachine(currentExercise, machineSelect.value, {
        setsInput,
        repsInput,
        weightInput,
      });
    });
  }

  // Form submit → save entry
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const entry = {
        date: new Date().toISOString().split("T")[0],
        exercise:
          currentExercise ||
          document.getElementById("formTitle").textContent ||
          "Custom Entry",
        sets: form.elements["sets"].value,
        reps: form.elements["reps"].value,
        weight: form.elements["weight"].value,
        machine: form.elements["machine"].value,
        boosted: boostedFlag === true,
      };

      let history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];
      history.unshift(entry);
      localStorage.setItem("fitnessHistory", JSON.stringify(history));
      flashWhiteScreen();

      form.reset();
      boostedFlag = false;
      closeForm();
      renderHistoryTable();
    });
  }

  // 🔹 Restore expandable exercise groups
  document.querySelectorAll(".group-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const content = toggle.nextElementSibling;
      content.classList.toggle("show");
    });
  });

  // Initial history render (if on history page)
  renderHistoryTable();
});

// ---------- History Page Rendering ----------
function renderHistoryTable() {
  const historySection = document.getElementById("history");
  if (!historySection) return;

  const existing = document.getElementById("historyTable");
  if (existing) existing.remove();

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

  history.forEach((entry) => {
    if (entry.date) entry.date = entry.date.trim();
    if (typeof entry.boosted === "undefined") entry.boosted = false;
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

    // Date
    const dateCell = document.createElement("td");
    dateCell.textContent = entry.date;
    dateCell.addEventListener("click", () => makeEditable(dateCell));
    row.appendChild(dateCell);

    // Exercise (+ if boosted) — click-to-toggle
    const exerciseCell = document.createElement("td");
    exerciseCell.textContent = entry.boosted
      ? `${entry.exercise} +`
      : entry.exercise;
    exerciseCell.addEventListener("click", () => {
      entry.boosted = !entry.boosted;
      exerciseCell.textContent = entry.boosted
        ? `${entry.exercise} +`
        : entry.exercise;
      saveHistoryFromTable();
    });
    row.appendChild(exerciseCell);

    // Sets
    const setsCell = document.createElement("td");
    setsCell.textContent = entry.sets;
    setsCell.addEventListener("click", () => makeEditable(setsCell));
    row.appendChild(setsCell);

    // Reps
    const repsCell = document.createElement("td");
    repsCell.textContent = entry.reps;
    repsCell.addEventListener("click", () => makeEditable(repsCell));
    row.appendChild(repsCell);

    // Weight
    const weightCell = document.createElement("td");
    weightCell.textContent = entry.weight;
    weightCell.addEventListener("click", () => makeEditable(weightCell));
    row.appendChild(weightCell);

    // Machine
    const machineCell = document.createElement("td");
    machineCell.textContent = entry.machine;
    machineCell.addEventListener("click", () => makeEditable(machineCell));
    row.appendChild(machineCell);

    // Delete
    const deleteCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delButton";
    deleteBtn.textContent = "✖";
    deleteBtn.onclick = () => {
      const history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];
      const index = history.indexOf(entry);
      if (index !== -1) {
        history.splice(index, 1);
        localStorage.setItem("fitnessHistory", JSON.stringify(history));
      }
      row.remove();
    };
    deleteCell.appendChild(deleteBtn);
    row.appendChild(deleteCell);

    tbody.insertBefore(row, tbody.firstChild);
  });

  historySection.appendChild(table);
}

// ---------- Editable Cell Logic ----------
function makeEditable(cell) {
  const originalText = cell.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = originalText;
  input.style.width = "100%";

  input.addEventListener("blur", () => {
    cell.textContent = input.value;
    saveHistoryFromTable();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
  });

  cell.textContent = "";
  cell.appendChild(input);
  input.focus();
}

// ---------- Rebuild history from table into localStorage ----------
function saveHistoryFromTable() {
  const rows = document.querySelectorAll("#historyTable tbody tr");
  const updatedHistory = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 7) return;

    const date = cells[0].textContent;
    let exerciseText = cells[1].textContent;
    let boosted = false;

    if (exerciseText.endsWith(" +")) {
      boosted = true;
      exerciseText = exerciseText.slice(0, -2);
    }

    const entry = {
      date,
      exercise: exerciseText,
      sets: cells[2].textContent,
      reps: cells[3].textContent,
      weight: cells[4].textContent,
      machine: cells[5].textContent,
      boosted,
    };
    updatedHistory.push(entry);
  });

  localStorage.setItem("fitnessHistory", JSON.stringify(updatedHistory));
}

// ---------- Timer Logic ----------
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
    const mins = String(Math.floor(sec / 60)).padStart(2, "0");
    const secs = String(sec % 60).padStart(2, "0");
    return `${mins}:${secs}`;
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
    if (timerInterval) {
      stopTimer();
    } else {
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
    let raw = hidden.value.replace(/\D/g, "");
    raw = raw.slice(-4);
    editDigits = raw;

    if (raw.length === 0) {
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
