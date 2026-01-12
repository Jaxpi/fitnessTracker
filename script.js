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
function openForm(exerciseName) {
  const form = document.getElementById("myForm"); // ensure this is a <form id="myForm">
  const title = document.getElementById("formTitle");

  // Input elements (use name attributes for consistency)
  const setsInput = document.querySelector('#myForm [name="sets"]');
  const repsInput = document.querySelector('#myForm [name="reps"]');
  const weightInput = document.querySelector('#myForm [name="weight"]');
  const machineInput = document.querySelector('#myForm [name="machine"]');

  if (
    !form ||
    !title ||
    !setsInput ||
    !repsInput ||
    !weightInput ||
    !machineInput
  ) {
    console.warn("Form or inputs not found. Check IDs and name attributes.");
    return;
  }

  // Show form and set title
  form.style.display = "block";
  form.setAttribute("data-exercise", exerciseName);
  title.textContent = exerciseName;

  // Pull history and find most recent matching entry
  let history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];

  // Because you unshift new entries, the first match is the most recent
  const recentEntry = history.find(
    (entry) =>
      entry &&
      typeof entry.exercise === "string" &&
      entry.exercise.trim().toLowerCase() === exerciseName.trim().toLowerCase()
  );

  // Prefill or clear
  if (recentEntry) {
    setsInput.value = recentEntry.sets ?? "";
    repsInput.value = recentEntry.reps ?? "";
    weightInput.value = recentEntry.weight ?? "";
    machineInput.value = recentEntry.machine ?? "";
  } else {
    setsInput.value = "";
    repsInput.value = "";
    weightInput.value = "";
    machineInput.value = "";
  }
}

function closeForm() {
  const form = document.getElementById("myForm");
  if (form) {
    form.style.display = "none";
  }
}

// ---------- Form Submission ----------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".form-container");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const entry = {
        date: new Date().toISOString().split("T")[0],
        exercise:
          document.getElementById("formTitle").textContent || "Custom Entry",
        sets: form.elements["sets"].value,
        reps: form.elements["reps"].value,
        weight: form.elements["weight"].value,
        machine: form.elements["machine"].value,
      };

      let history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];
      history.unshift(entry); // Add to top
      localStorage.setItem("fitnessHistory", JSON.stringify(history));
      flashWhiteScreen();

      form.reset();
      closeForm();
    });
  }

  // ---------- History Page Rendering ----------
  const historySection = document.getElementById("history");
  if (historySection) {
    const table = document.createElement("table");
    table.id = "historyTable";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Date</th><th>Exercise</th><th>Sets</th><th>Reps/Mins</th><th>Weight/Setting</th><th>Machine</th><th>Delete</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");
    const history = JSON.parse(localStorage.getItem("fitnessHistory")) || [];
    history.forEach((entry) => (entry.date = entry.date.trim())); // optional cleanup
    history.sort((a, b) => new Date(a.date) - new Date(b.date)); // sort newest to oldest

    // Now render the table
    let lastDate = null;
    let toggle = false;

    history.forEach((entry) => {
      if (entry.date !== lastDate) {
        toggle = !toggle;
        lastDate = entry.date;
      }

      const row = document.createElement("tr");
      row.style.backgroundColor = toggle ? "#ffffff" : "#bbbbbbff";

      Object.values(entry).forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        cell.addEventListener("click", () => makeEditable(cell));
        row.appendChild(cell);
      });

      const deleteCell = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delButton";
      deleteBtn.textContent = "✖";
      deleteBtn.onclick = () => {
        history.splice(history.indexOf(entry), 1);
        localStorage.setItem("fitnessHistory", JSON.stringify(history));
        row.remove();
      };
      deleteCell.appendChild(deleteBtn);
      row.appendChild(deleteCell);

      tbody.insertBefore(row, tbody.firstChild);
    });

    historySection.appendChild(table);
  }
});

// ---------- Editable Cell Logic ----------
function makeEditable(cell) {
  const originalText = cell.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = originalText;
  input.style.width = "100%";

  input.addEventListener("blur", () => {
    cell.textContent = input.value;
    updateLocalStorage();
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

// ---------- Update localStorage after edits ----------
function updateLocalStorage() {
  const rows = document.querySelectorAll("#historyTable tbody tr");
  const updatedHistory = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 6) return; // skip if row is malformed
    const entry = {
      date: cells[0].textContent,
      exercise: cells[1].textContent,
      sets: cells[2].textContent,
      reps: cells[3].textContent,
      weight: cells[4].textContent, // weight should come before machine
      machine: cells[5].textContent,
    };
    updatedHistory.push(entry);
  });

  localStorage.setItem("fitnessHistory", JSON.stringify(updatedHistory));
}

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".group-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const content = toggle.nextElementSibling;
      content.classList.toggle("show");
    });
  });
});

// ---------- Timer Logic ----------
let timerInterval = null;
let timerSeconds = 0;
let lastEnteredSeconds = 0; // remembers last countdown time
let countingDown = false;
let editingTimer = false;
let editDigits = ""; // raw MMSS digits while editing

const display = document.getElementById("timerDisplay");
const startStopBtn = document.getElementById("timerStartStop");
const resetBtn = document.getElementById("timerReset");
const hidden = document.getElementById("timerHiddenInput");

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

        // Play sound
        const beep = document.getElementById("timerBeep");
        if (beep) {
          // rewind to start in case it's been played before
          beep.currentTime = 0;
          beep.play().catch(() => {
            // ignore play errors (e.g. browser blocking)
          });
        }

        // Turn display red
        display.classList.add("timer-alert");
      }
    } else {
      timerSeconds++;
    }
    updateDisplay();
  }, 1000);
}

// ---------- Start / Stop ----------
startStopBtn.addEventListener("click", () => {
  if (timerInterval) {
    stopTimer();
  } else {
    startStopBtn.textContent = "Stop";
    startTimer();
  }
});

// ---------- Reset ----------
resetBtn.addEventListener("click", () => {
  stopTimer();
  display.classList.remove("timer-alert"); // ← add this

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

  const hidden = document.getElementById("timerHiddenInput");
  hidden.value = "";
  hidden.focus();   // ← triggers mobile keyboard

  display.textContent = "00:00";
});

hidden.addEventListener("input", () => {
  let raw = hidden.value.replace(/\D/g, "");

  // Keep only last 4 digits
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

// When the clock loses focus (e.g., click elsewhere), stop editing
display.addEventListener("blur", () => {
  editingTimer = false;
  // Ensure display matches current timerSeconds
  display.textContent = formatTime(timerSeconds);
});

// Make the display focusable so keydown works
display.tabIndex = 0;
