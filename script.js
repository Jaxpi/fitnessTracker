if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('Service Worker registered:', reg))
    .catch(err => console.error('Service Worker registration failed:', err));
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
          <th>Date</th><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th><th>Machine</th><th>✖</th>
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
    dates.forEach((date, index) => {
      const bgColor = index % 2 === 0 ? "#ffffff" : "#f0f0f0";

      grouped[date].forEach((entry, entryIndex) => {
        const row = document.createElement("tr");
        row.style.backgroundColor = bgColor;

        Object.values(entry).forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          cell.addEventListener("click", () => makeEditable(cell));
          row.appendChild(cell);
        });

        const deleteCell = document.createElement("td");
          const deleteBtn = document.createElement("delButton");
          deleteBtn.className = "delButton";
        deleteBtn.textContent = "✖";
        deleteBtn.onclick = () => {
          history.splice(history.indexOf(entry), 1);
          localStorage.setItem("fitnessHistory", JSON.stringify(history));
          row.remove();
        };
        deleteCell.appendChild(deleteBtn);
        row.appendChild(deleteCell);

        tbody.appendChild(row);
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
