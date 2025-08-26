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
  const form = document.getElementById("myForm");
  const title = document.getElementById("formTitle");
  if (form && title) {
    form.style.display = "block";
    form.setAttribute("data-exercise", exerciseName);
    title.textContent = exerciseName;
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

    const grouped = {};
    history.forEach((entry) => {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    });

    const dates = Object.keys(grouped);
    let lastDate = null;
    let toggle = false;

    dates.forEach((date) => {
      grouped[date].forEach((entry) => {
        // Toggle color only when the date changes
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
      machine: cells[4].textContent,
      weight: cells[5].textContent,
    };
    updatedHistory.push(entry);
  });

  localStorage.setItem("fitnessHistory", JSON.stringify(updatedHistory));
}

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("Install prompt captured");
  // You can now show a custom install button and call deferredPrompt.prompt() when clicked
});
