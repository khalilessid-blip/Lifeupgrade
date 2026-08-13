/* ============================================================
   LIFE UPGRADE — TESTS.JS
   Prototype local
============================================================ */

const TEST_STATS_KEY = "lifeUpgradeTestStats";
const TEST_HISTORY_KEY = "lifeUpgradeTestHistory";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let timerInterval = null;
let focusInterval = null;


/* ============================================================
   STORAGE
============================================================ */

function defaultStats() {
  return {
    tests: 0,
    memory: 0,
    focusMinutes: 0,
    bestReasoning: 0
  };
}

function getStats() {
  try {
    return JSON.parse(localStorage.getItem(TEST_STATS_KEY)) || defaultStats();
  } catch {
    return defaultStats();
  }
}

function saveStats(stats) {
  localStorage.setItem(TEST_STATS_KEY, JSON.stringify(stats));
  renderStats();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(TEST_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function addHistory(type, name, score) {
  const history = getHistory();

  history.unshift({
    type,
    name,
    score,
    date: new Date().toLocaleString("fr-FR")
  });

  localStorage.setItem(
    TEST_HISTORY_KEY,
    JSON.stringify(history.slice(0, 30))
  );

  renderHistory();
}

function renderStats() {
  const stats = getStats();

  const tests = $("#summaryTests");
  const memory = $("#summaryMemory");
  const focus = $("#summaryFocus");
  const best = $("#summaryBest");

  if (tests) tests.textContent = stats.tests;
  if (memory) memory.textContent = stats.memory;
  if (focus) focus.textContent = stats.focusMinutes + "m";
  if (best) best.textContent = stats.bestReasoning
    ? stats.bestReasoning + "/100"
    : "—";
}

function renderHistory() {
  const container = $("#historyList");

  if (!container) return;

  const history = getHistory();

  if (!history.length) {
    container.innerHTML = `
      <div class="history-empty">
        Aucun résultat enregistré pour le moment.
        Lance un test ou un exercice.
      </div>
    `;
    return;
  }

  container.innerHTML = history.map((item) => `
    <div class="history-row">
      <div>
        <strong>${item.name}</strong>
        <div style="color:var(--muted);margin-top:2px">
          ${item.type}
        </div>
      </div>

      <div>
        ${item.score}
      </div>

      <div style="color:var(--muted)">
        ${item.date}
      </div>
    </div>
  `).join("");
}

function clearHistory() {
  if (!confirm("Effacer l'historique local des tests et exercices ?")) {
    return;
  }

  localStorage.removeItem(TEST_HISTORY_KEY);
  localStorage.removeItem(TEST_STATS_KEY);

  renderStats();
  renderHistory();
}


/* ============================================================
   MODAL
============================================================ */

function openTestWindow() {
  $("#testOverlay").classList.add("open");
}

function closeTestWindow() {
  clearInterval(timerInterval);
  clearInterval(focusInterval);

  $("#testOverlay").classList.remove("open");
}

$("#testOverlay")?.addEventListener("click", (event) => {
  if (event.target === $("#testOverlay")) {
    closeTestWindow();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeTestWindow();
  }
});


/* ============================================================
   REASONING QUESTION BANKS
============================================================ */

const reasoningTests = {

  logic: {
    title: "Raisonnement logique",
    time: 45,

    questions: [
      {
        q: "Tous les A sont B. Aucun B n'est C. Un A peut-il être C ?",
        a: ["Oui", "Non", "Toujours", "Seulement parfois"],
        correct: 1
      },
      {
        q: "Si A est plus grand que B et B plus grand que C, quelle proposition est nécessairement vraie ?",
        a: ["C > A", "A > C", "A = C", "B > A"],
        correct: 1
      },
      {
        q: "Paul arrive avant Léa. Léa arrive avant Marc. Qui arrive en dernier ?",
        a: ["Paul", "Léa", "Marc", "Impossible à déterminer"],
        correct: 2
      },
      {
        q: "Tous les tulipes sont des fleurs. Certaines fleurs sont rouges. Peut-on conclure que certaines tulipes sont rouges ?",
        a: ["Oui", "Non nécessairement", "Toujours", "Toutes"],
        correct: 1
      },
      {
        q: "Si Paul vient, Sarah vient. Sarah n'est pas venue. Que peut-on conclure ?",
        a: [
          "Paul est venu",
          "Paul n'est pas venu",
          "Sarah est venue",
          "On ne sait rien sur Paul"
        ],
        correct: 1
      },
      {
        q: "Aucun chat n'est un poisson. Félix est un chat. Félix peut-il être un poisson ?",
        a: ["Oui", "Non", "Parfois", "Seulement dans certains cas"],
        correct: 1
      },
      {
        q: "Marie est plus âgée que Luc. Luc est plus âgé que Tom. Qui est le plus jeune ?",
        a: ["Marie", "Luc", "Tom", "Impossible"],
        correct: 2
      },
      {
        q: "Rouge est avant Bleu. Vert est après Bleu. Quel ordre respecte les deux règles ?",
        a: [
          "Rouge - Bleu - Vert",
          "Vert - Bleu - Rouge",
          "Bleu - Rouge - Vert",
          "Rouge - Vert - Bleu"
        ],
        correct: 0
      },
      {
        q: "Tous les X sont Y. Certains Y sont Z. Peut-on conclure que certains X sont Z ?",
        a: ["Oui", "Non nécessairement", "Toujours", "Tous les X sont Z"],
        correct: 1
      },
      {
        q: "Si aujourd'hui est lundi, quel jour sera-t-on dans 10 jours ?",
        a: ["Mercredi", "Jeudi", "Vendredi", "Samedi"],
        correct: 1
      },
      {
        q: "Alice est devant Benoît mais derrière Chloé. Qui est devant Alice ?",
        a: ["Benoît", "Chloé", "Personne", "Impossible"],
        correct: 1
      },
      {
        q: "Si aucune voiture rouge n'est électrique et que cette voiture est rouge, que sait-on ?",
        a: [
          "Elle est électrique",
          "Elle n'est pas électrique",
          "Elle est forcément bleue",
          "Rien"
        ],
        correct: 1
      },
      {
        q: "Trois personnes sont alignées. Nora n'est pas première. Sam est après Nora. Quelle position peut occuper Nora ?",
        a: ["Seulement première", "Deuxième", "Seulement troisième", "Aucune"],
        correct: 1
      },
      {
        q: "Tous les livres de cette étagère sont en français. Ce livre vient de cette étagère. Il est donc :",
        a: ["En anglais", "En français", "Bilingue", "Impossible"],
        correct: 1
      },
      {
        q: "Si P implique Q et P est vrai, alors Q est :",
        a: ["Vrai", "Faux", "Impossible", "Sans rapport"],
        correct: 0
      }
    ]
  },


  numeric: {
    title: "Raisonnement numérique",
    time: 45,

    questions: [
      {
        q: "2, 4, 8, 16, ?",
        a: ["24", "30", "32", "36"],
        correct: 2
      },
      {
        q: "3, 6, 11, 18, 27, ?",
        a: ["36", "38", "40", "42"],
        correct: 1
      },
      {
        q: "5, 10, 20, 40, ?",
        a: ["50", "60", "70", "80"],
        correct: 3
      },
      {
        q: "50 % de 240 vaut :",
        a: ["100", "110", "120", "140"],
        correct: 2
      },
      {
        q: "100 diminué de 25 % vaut :",
        a: ["65", "70", "75", "80"],
        correct: 2
      },
      {
        q: "1, 4, 9, 16, ?",
        a: ["20", "24", "25", "36"],
        correct: 2
      },
      {
        q: "12 × 8 vaut :",
        a: ["84", "92", "96", "108"],
        correct: 2
      },
      {
        q: "Une voiture parcourt 180 km en 3 heures. Sa vitesse moyenne est :",
        a: ["50 km/h", "60 km/h", "70 km/h", "80 km/h"],
        correct: 1
      },
      {
        q: "2, 5, 10, 17, 26, ?",
        a: ["35", "36", "37", "38"],
        correct: 2
      },
      {
        q: "Un article coûte 80 €. Après une réduction de 10 %, il coûte :",
        a: ["70 €", "72 €", "74 €", "78 €"],
        correct: 1
      },
      {
        q: "7 + 7 × 2 vaut :",
        a: ["21", "28", "42", "18"],
        correct: 0
      },
      {
        q: "Si 4 cahiers coûtent 12 €, combien coûtent 10 cahiers au même prix unitaire ?",
        a: ["24 €", "28 €", "30 €", "32 €"],
        correct: 2
      },
      {
        q: "10, 20, 40, 80, ?",
        a: ["100", "120", "140", "160"],
        correct: 3
      },
      {
        q: "Le quart de 200 vaut :",
        a: ["25", "40", "50", "75"],
        correct: 2
      },
      {
        q: "Une quantité passe de 50 à 60. L'augmentation est de :",
        a: ["10 %", "15 %", "20 %", "25 %"],
        correct: 2
      }
    ]
  },


  verbal: {
    title: "Raisonnement verbal",
    time: 45,

    questions: [
      {
        q: "Livre est à lire ce que musique est à :",
        a: ["Voir", "Écouter", "Courir", "Dessiner"],
        correct: 1
      },
      {
        q: "Quel mot est l'intrus ?",
        a: ["Chien", "Chat", "Cheval", "Table"],
        correct: 3
      },
      {
        q: "Rapide est l'opposé de :",
        a: ["Lent", "Court", "Grand", "Fort"],
        correct: 0
      },
      {
        q: "Main est à gant ce que pied est à :",
        a: ["Chapeau", "Chaussure", "Chemise", "Ceinture"],
        correct: 1
      },
      {
        q: "Médecin est à hôpital ce que professeur est à :",
        a: ["Gare", "École", "Usine", "Banque"],
        correct: 1
      },
      {
        q: "Quel mot est le plus proche de « précis » ?",
        a: ["Vague", "Exact", "Lent", "Large"],
        correct: 1
      },
      {
        q: "Jour est à nuit ce que chaud est à :",
        a: ["Froid", "Soleil", "Été", "Feu"],
        correct: 0
      },
      {
        q: "Oiseau est à voler ce que poisson est à :",
        a: ["Courir", "Nager", "Sauter", "Marcher"],
        correct: 1
      },
      {
        q: "Lequel appartient à une autre catégorie ?",
        a: ["Rouge", "Bleu", "Vert", "Cercle"],
        correct: 3
      },
      {
        q: "Cause est à conséquence ce que question est à :",
        a: ["Réponse", "Problème", "Doute", "Silence"],
        correct: 0
      },
      {
        q: "Clé est à serrure ce que mot de passe est à :",
        a: ["Compte", "Chaise", "Livre", "Route"],
        correct: 0
      },
      {
        q: "Quel mot complète le mieux : froid, frais, tiède, ...",
        a: ["Glacé", "Chaud", "Sec", "Sombre"],
        correct: 1
      },
      {
        q: "Architecte est à bâtiment ce qu'auteur est à :",
        a: ["Livre", "Voiture", "École", "Musique"],
        correct: 0
      },
      {
        q: "Quel terme est le plus proche de « améliorer » ?",
        a: ["Détériorer", "Optimiser", "Ignorer", "Supprimer"],
        correct: 1
      },
      {
        q: "Semence est à plante ce qu'idée est à :",
        a: ["Projet", "Sommeil", "Route", "Pluie"],
        correct: 0
      }
    ]
  }
};


/*
  Challenge mixte = 30 questions :
  10 logique + 10 numérique + 10 verbal
*/
reasoningTests.mixed = {
  title: "Challenge mixte",
  time: 45,
  questions: [
    ...reasoningTests.logic.questions.slice(0, 10),
    ...reasoningTests.numeric.questions.slice(0, 10),
    ...reasoningTests.verbal.questions.slice(0, 10)
  ]
};


/* ============================================================
   REASONING ENGINE
============================================================ */

let reasoningState = null;

function startReasoningTest(type) {
  const test = reasoningTests[type];

  if (!test) return;

  reasoningState = {
    type,
    index: 0,
    answers: Array(test.questions.length).fill(null),
    times: Array(test.questions.length).fill(0),
    remaining: test.time
  };

  openTestWindow();
  renderReasoningQuestion();
}

function renderReasoningQuestion() {
  clearInterval(timerInterval);

  const test = reasoningTests[reasoningState.type];
  const question = test.questions[reasoningState.index];

  reasoningState.remaining = test.time;

  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      ${test.title}
    </div>

    <div class="test-top">

      <div style="flex:1">

        <div class="question-number">
          Question ${reasoningState.index + 1} / ${test.questions.length}
        </div>

        <div class="test-progress" style="margin-top:7px">
          <i style="width:${((reasoningState.index + 1) / test.questions.length) * 100}%"></i>
        </div>

      </div>

      <div id="questionTimer" class="timer-box">
        ${test.time}s
      </div>

    </div>

    <div class="question-title">
      ${question.q}
    </div>

    <div class="answers">
      ${question.a.map((answer, index) => `
        <button
          class="answer-button"
          onclick="answerReasoningQuestion(${index})"
        >
          ${String.fromCharCode(65 + index)}. ${answer}
        </button>
      `).join("")}
    </div>

    <div class="test-note">
      Temps conseillé : ${test.time} secondes.
      À 0, la question est enregistrée comme non répondue.
    </div>
  `;

  timerInterval = setInterval(() => {
    reasoningState.remaining--;

    const timer = $("#questionTimer");

    if (!timer) return;

    timer.textContent = reasoningState.remaining + "s";

    timer.classList.remove("warning", "danger");

    if (reasoningState.remaining <= 10) {
      timer.classList.add("danger");
    } else if (reasoningState.remaining <= 20) {
      timer.classList.add("warning");
    }

    if (reasoningState.remaining <= 0) {
      clearInterval(timerInterval);

      reasoningState.times[reasoningState.index] = test.time;

      nextReasoningQuestion();
    }

  }, 1000);
}

function answerReasoningQuestion(answerIndex) {
  const test = reasoningTests[reasoningState.type];

  reasoningState.answers[reasoningState.index] = answerIndex;

  reasoningState.times[reasoningState.index] =
    test.time - reasoningState.remaining;

  clearInterval(timerInterval);

  nextReasoningQuestion();
}

function nextReasoningQuestion() {
  const test = reasoningTests[reasoningState.type];

  if (reasoningState.index < test.questions.length - 1) {
    reasoningState.index++;
    renderReasoningQuestion();
  } else {
    showReasoningResult();
  }
}

function showReasoningResult() {
  clearInterval(timerInterval);

  const test = reasoningTests[reasoningState.type];

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  test.questions.forEach((question, index) => {
    const answer = reasoningState.answers[index];

    if (answer === null) {
      unanswered++;
    } else if (answer === question.correct) {
      correct++;
    } else {
      wrong++;
    }
  });

  const total = test.questions.length;

  const score = Math.round((correct / total) * 100);

  const totalTime = reasoningState.times.reduce(
    (sum, value) => sum + value,
    0
  );

  const averageTime = Math.round(totalTime / total);

  const stats = getStats();

  stats.tests++;
  stats.bestReasoning = Math.max(
    stats.bestReasoning,
    score
  );

  saveStats(stats);

  addHistory(
    "Raisonnement",
    test.title,
    score + "/100"
  );

  let message = "";

  if (score >= 85) {
    message = "Très bonne performance sur cette série.";
  } else if (score >= 70) {
    message = "Bonne performance globale.";
  } else if (score >= 50) {
    message = "Résultat intermédiaire. Certaines catégories peuvent être renforcées.";
  } else {
    message = "Cette série a été difficile. L'entraînement permet de se familiariser avec ces formats.";
  }

  $("#testWindowContent").innerHTML = `
    <div class="result-screen">

      <div class="eyebrow">
        TEST TERMINÉ
      </div>

      <h2>
        ${test.title}
      </h2>

      <div class="result-score">
        ${score}/100
      </div>

      <div class="result-label">
        Score Life Upgrade
      </div>

      <div class="result-grid">

        <div class="result-stat">
          <span>CORRECTES</span>
          <strong>${correct}</strong>
        </div>

        <div class="result-stat">
          <span>INCORRECTES</span>
          <strong>${wrong}</strong>
        </div>

        <div class="result-stat">
          <span>NON RÉPONDUES</span>
          <strong>${unanswered}</strong>
        </div>

        <div class="result-stat">
          <span>TEMPS MOYEN</span>
          <strong>${averageTime}s</strong>
        </div>

      </div>

      <p>
        ${message}
      </p>

      <p style="margin-top:10px;font-size:11px">
        Ce résultat décrit uniquement ta performance à ce test Life Upgrade.
        Il ne constitue pas un test officiel de QI.
      </p>

      <div class="result-actions">

        <button
          class="button secondary"
          onclick="startReasoningTest('${reasoningState.type}')"
        >
          Recommencer
        </button>

        <button
          class="button primary"
          onclick="closeTestWindow()"
        >
          Voir mes résultats
        </button>

      </div>

    </div>
  `;
}


/* ============================================================
   DIGIT MEMORY
============================================================ */

let memoryState = null;

function startDigitMemory(reverse) {
  clearInterval(timerInterval);

  const length = 5;

  const digits = Array.from(
    { length },
    () => Math.floor(Math.random() * 10)
  );

  memoryState = {
    type: reverse ? "reverse" : "digits",
    digits,
    reverse
  };

  openTestWindow();

  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      MEMORY LAB
    </div>

    <h2>
      ${reverse ? "Séquence inversée" : "Séquence de chiffres"}
    </h2>

    <p style="margin-top:8px">
      ${reverse
        ? "Mémorise la séquence. Tu devras ensuite l'écrire dans l'ordre inverse."
        : "Mémorise la séquence. Tu devras ensuite la reproduire exactement."
      }
    </p>

    <div class="memory-stage">

      <div class="memory-sequence">
        ${digits.join(" ")}
      </div>

    </div>

    <div
      id="memoryCountdown"
      class="timer-box"
      style="width:100px;margin:auto"
    >
      5s
    </div>
  `;

  let remaining = 5;

  timerInterval = setInterval(() => {
    remaining--;

    const countdown = $("#memoryCountdown");

    if (countdown) {
      countdown.textContent = remaining + "s";
    }

    if (remaining <= 0) {
      clearInterval(timerInterval);
      askDigitMemory();
    }
  }, 1000);
}

function askDigitMemory() {
  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      MEMORY LAB
    </div>

    <h2>
      À toi
    </h2>

    <p style="margin-top:8px">
      ${memoryState.reverse
        ? "Entre la séquence dans l'ordre inverse."
        : "Entre la séquence dans le même ordre."
      }
    </p>

    <div class="memory-stage">

      <input
        id="digitMemoryAnswer"
        class="memory-input"
        inputmode="numeric"
        autocomplete="off"
        placeholder="Ta réponse"
      >

    </div>

    <div style="text-align:center">

      <button
        class="button primary"
        onclick="checkDigitMemory()"
      >
        Valider
      </button>

    </div>
  `;

  setTimeout(() => {
    $("#digitMemoryAnswer")?.focus();
  }, 50);
}

function checkDigitMemory() {
  const input = $("#digitMemoryAnswer");

  const answer = (input?.value || "").replace(/\D/g, "");

  const expected = (
    memoryState.reverse
      ? [...memoryState.digits].reverse()
      : memoryState.digits
  ).join("");

  const success = answer === expected;

  const stats = getStats();
  stats.memory++;
  saveStats(stats);

  addHistory(
    "Mémoire",
    memoryState.reverse
      ? "Séquence inversée"
      : "Séquence de chiffres",
    success ? "Réussie" : "À retravailler"
  );

  $("#testWindowContent").innerHTML = `
    <div class="result-screen">

      <div class="result-score">
        ${success ? "✓" : "✕"}
      </div>

      <h2>
        ${success ? "Bonne réponse" : "À retravailler"}
      </h2>

      <p style="margin-top:10px">
        Séquence attendue :
        <strong>${expected}</strong>
      </p>

      <p>
        Ta réponse :
        <strong>${answer || "aucune"}</strong>
      </p>

      <div class="result-actions">

        <button
          class="button primary"
          onclick="startDigitMemory(${memoryState.reverse})"
        >
          Nouvelle séquence
        </button>

        <button
          class="button secondary"
          onclick="closeTestWindow()"
        >
          Terminer
        </button>

      </div>

    </div>
  `;
}


/* ============================================================
   GRID MEMORY
============================================================ */

function startGridMemory() {
  clearInterval(timerInterval);

  const active = [];

  while (active.length < 5) {
    const value = Math.floor(Math.random() * 16);

    if (!active.includes(value)) {
      active.push(value);
    }
  }

  memoryState = {
    type: "grid",
    active,
    selected: []
  };

  openTestWindow();

  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      MÉMOIRE VISUELLE
    </div>

    <h2>
      Mémorise les cases
    </h2>

    <p style="margin-top:8px">
      Les cinq cases violettes disparaîtront dans 4 secondes.
    </p>

    <div class="memory-stage">

      <div class="memory-grid">

        ${Array.from({ length: 16 }, (_, index) => `
          <div
            class="memory-cell ${active.includes(index) ? "active" : ""}"
          ></div>
        `).join("")}

      </div>

    </div>
  `;

  setTimeout(showGridRecall, 4000);
}

function showGridRecall() {
  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      MÉMOIRE VISUELLE
    </div>

    <h2>
      Retrouve les cinq cases
    </h2>

    <p style="margin-top:8px">
      Clique sur les positions dont tu te souviens.
    </p>

    <div class="memory-stage">

      <div class="memory-grid">

        ${Array.from({ length: 16 }, (_, index) => `
          <button
            class="memory-cell"
            data-grid-index="${index}"
            onclick="toggleGridCell(this, ${index})"
          ></button>
        `).join("")}

      </div>

    </div>

    <div style="text-align:center">

      <button
        class="button primary"
        onclick="checkGridMemory()"
      >
        Valider
      </button>

    </div>
  `;
}

function toggleGridCell(button, index) {
  const selected = memoryState.selected;

  if (selected.includes(index)) {
    memoryState.selected = selected.filter(
      (value) => value !== index
    );

    button.classList.remove("selected");
    return;
  }

  if (selected.length >= 5) return;

  selected.push(index);

  button.classList.add("selected");
}

function checkGridMemory() {
  const correct = memoryState.selected.filter(
    (value) => memoryState.active.includes(value)
  ).length;

  const score = Math.round((correct / 5) * 100);

  const stats = getStats();
  stats.memory++;
  saveStats(stats);

  addHistory(
    "Mémoire",
    "Grille visuelle",
    score + "/100"
  );

  $("#testWindowContent").innerHTML = `
    <div class="result-screen">

      <div class="result-score">
        ${score}/100
      </div>

      <h2>
        Mémoire visuelle
      </h2>

      <p>
        Tu as retrouvé ${correct} case(s) sur 5.
      </p>

      <div class="result-actions">

        <button
          class="button primary"
          onclick="startGridMemory()"
        >
          Recommencer
        </button>

        <button
          class="button secondary"
          onclick="closeTestWindow()"
        >
          Terminer
        </button>

      </div>

    </div>
  `;
}


/* ============================================================
   WORD MEMORY
============================================================ */

const wordPools = [
  [
    "montagne",
    "orange",
    "piano",
    "rivière",
    "bateau",
    "lampe",
    "forêt",
    "cheval",
    "fenêtre",
    "nuage"
  ],
  [
    "jardin",
    "violon",
    "soleil",
    "table",
    "océan",
    "citron",
    "livre",
    "train",
    "étoile",
    "maison"
  ]
];

const distractorWords = [
  "chaise",
  "avion",
  "tomate",
  "route",
  "ordinateur",
  "plage",
  "stylo",
  "porte",
  "lune",
  "guitare"
];

function startWordMemory() {
  const words = wordPools[
    Math.floor(Math.random() * wordPools.length)
  ];

  memoryState = {
    type: "words",
    words,
    selected: []
  };

  openTestWindow();

  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      MÉMOIRE DE MOTS
    </div>

    <h2>
      Mémorise ces dix mots
    </h2>

    <p style="margin-top:8px">
      Tu disposes de 20 secondes.
    </p>

    <div class="memory-stage">

      <div class="word-grid">

        ${words.map((word) => `
          <div class="word-item">
            ${word}
          </div>
        `).join("")}

      </div>

    </div>

    <div
      id="wordTimer"
      class="timer-box"
      style="width:100px;margin:auto"
    >
      20s
    </div>
  `;

  let remaining = 20;

  timerInterval = setInterval(() => {
    remaining--;

    const timer = $("#wordTimer");

    if (timer) {
      timer.textContent = remaining + "s";
    }

    if (remaining <= 0) {
      clearInterval(timerInterval);
      showWordRecall();
    }
  }, 1000);
}

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function showWordRecall() {
  const choices = shuffle([
    ...memoryState.words,
    ...distractorWords
  ]);

  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      MÉMOIRE DE MOTS
    </div>

    <h2>
      Quels mots étaient présents ?
    </h2>

    <p style="margin-top:8px">
      Sélectionne exactement dix mots.
    </p>

    <div class="memory-stage">

      <div class="word-grid">

        ${choices.map((word) => `
          <button
            class="word-choice"
            data-word="${word}"
            onclick="toggleWordChoice(this, '${word}')"
          >
            ${word}
          </button>
        `).join("")}

      </div>

    </div>

    <div style="text-align:center">

      <button
        class="button primary"
        onclick="checkWordMemory()"
      >
        Valider
      </button>

    </div>
  `;
}

function toggleWordChoice(button, word) {
  if (memoryState.selected.includes(word)) {
    memoryState.selected = memoryState.selected.filter(
      (value) => value !== word
    );

    button.classList.remove("selected");
    return;
  }

  if (memoryState.selected.length >= 10) return;

  memoryState.selected.push(word);

  button.classList.add("selected");
}

function checkWordMemory() {
  const correct = memoryState.selected.filter(
    (word) => memoryState.words.includes(word)
  ).length;

  const score = Math.round((correct / 10) * 100);

  const stats = getStats();
  stats.memory++;
  saveStats(stats);

  addHistory(
    "Mémoire",
    "Liste de mots",
    score + "/100"
  );

  $("#testWindowContent").innerHTML = `
    <div class="result-screen">

      <div class="result-score">
        ${score}/100
      </div>

      <h2>
        Mémoire de mots
      </h2>

      <p>
        ${correct} mot(s) correct(s) sur 10.
      </p>

      <div class="result-actions">

        <button
          class="button primary"
          onclick="startWordMemory()"
        >
          Nouvelle série
        </button>

        <button
          class="button secondary"
          onclick="closeTestWindow()"
        >
          Terminer
        </button>

      </div>

    </div>
  `;
}


/* ============================================================
   PAIRS GAME
============================================================ */

let pairState = null;

function startPairs() {
  const symbols = [
    "★",
    "●",
    "▲",
    "◆",
    "☀",
    "☂",
    "♫",
    "✦"
  ];

  const cards = shuffle([
    ...symbols,
    ...symbols
  ]);

  pairState = {
    cards,
    revealed: [],
    matched: [],
    moves: 0,
    start: Date.now(),
    locked: false
  };

  openTestWindow();
  renderPairs();
}

function renderPairs() {
  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      JEU DES PAIRES
    </div>

    <h2>
      Retrouve les huit paires
    </h2>

    <p style="margin-top:8px">
      Coups : ${pairState.moves}
    </p>

    <div class="memory-stage">

      <div class="pairs-grid">

        ${pairState.cards.map((symbol, index) => {

          const revealed =
            pairState.revealed.includes(index);

          const matched =
            pairState.matched.includes(index);

          return `
            <button
              class="
                pair-card
                ${revealed ? "revealed" : ""}
                ${matched ? "matched" : ""}
              "
              onclick="flipPair(${index})"
              ${matched ? "disabled" : ""}
            >
              ${revealed || matched ? symbol : "?"}
            </button>
          `;
        }).join("")}

      </div>

    </div>
  `;
}

function flipPair(index) {
  if (pairState.locked) return;

  if (
    pairState.revealed.includes(index) ||
    pairState.matched.includes(index)
  ) {
    return;
  }

  pairState.revealed.push(index);

  renderPairs();

  if (pairState.revealed.length < 2) return;

  pairState.moves++;

  const [first, second] = pairState.revealed;

  if (
    pairState.cards[first] ===
    pairState.cards[second]
  ) {
    pairState.matched.push(first, second);
    pairState.revealed = [];

    if (pairState.matched.length === pairState.cards.length) {
      setTimeout(showPairsResult, 300);
    } else {
      renderPairs();
    }

    return;
  }

  pairState.locked = true;

  setTimeout(() => {
    pairState.revealed = [];
    pairState.locked = false;
    renderPairs();
  }, 800);
}

function showPairsResult() {
  const seconds = Math.round(
    (Date.now() - pairState.start) / 1000
  );

  const stats = getStats();
  stats.memory++;
  saveStats(stats);

  addHistory(
    "Mémoire",
    "Jeu des paires",
    pairState.moves + " coups"
  );

  $("#testWindowContent").innerHTML = `
    <div class="result-screen">

      <div class="result-score">
        ${pairState.moves}
      </div>

      <h2>
        coups
      </h2>

      <p>
        Toutes les paires ont été trouvées en ${seconds} secondes.
      </p>

      <div class="result-actions">

        <button
          class="button primary"
          onclick="startPairs()"
        >
          Rejouer
        </button>

        <button
          class="button secondary"
          onclick="closeTestWindow()"
        >
          Terminer
        </button>

      </div>

    </div>
  `;
}


/* ============================================================
   STROOP
============================================================ */

const stroopColors = [
  {
    name: "ROUGE",
    color: "#d6535f"
  },
  {
    name: "BLEU",
    color: "#3f69d8"
  },
  {
    name: "VERT",
    color: "#1c9a71"
  },
  {
    name: "ORANGE",
    color: "#e68a2e"
  }
];

let stroopState = null;

function startStroop() {
  stroopState = {
    index: 0,
    correct: 0,
    total: 15,
    start: Date.now()
  };

  openTestWindow();
  renderStroop();
}

function renderStroop() {
  if (stroopState.index >= stroopState.total) {
    showStroopResult();
    return;
  }

  const word = stroopColors[
    Math.floor(Math.random() * stroopColors.length)
  ];

  let ink = stroopColors[
    Math.floor(Math.random() * stroopColors.length)
  ];

  while (ink.name === word.name) {
    ink = stroopColors[
      Math.floor(Math.random() * stroopColors.length)
    ];
  }

  stroopState.correctColor = ink.name;

  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      STROOP
    </div>

    <div class="question-number">
      Essai ${stroopState.index + 1} / ${stroopState.total}
    </div>

    <h2 style="margin-top:10px">
      Choisis la couleur du texte
    </h2>

    <div
      class="stroop-word"
      style="color:${ink.color}"
    >
      ${word.name}
    </div>

    <div class="stroop-buttons">

      ${stroopColors.map((color) => `
        <button
          class="answer-button"
          onclick="answerStroop('${color.name}')"
        >
          ${color.name}
        </button>
      `).join("")}

    </div>
  `;
}

function answerStroop(answer) {
  if (answer === stroopState.correctColor) {
    stroopState.correct++;
  }

  stroopState.index++;

  renderStroop();
}

function showStroopResult() {
  const score = Math.round(
    (stroopState.correct / stroopState.total) * 100
  );

  const seconds = Math.round(
    (Date.now() - stroopState.start) / 1000
  );

  addHistory(
    "Concentration",
    "Stroop",
    score + "/100"
  );

  $("#testWindowContent").innerHTML = `
    <div class="result-screen">

      <div class="result-score">
        ${score}/100
      </div>

      <h2>
        Stroop terminé
      </h2>

      <p>
        ${stroopState.correct}/${stroopState.total} réponses correctes
        en ${seconds} secondes.
      </p>

      <div class="result-actions">

        <button
          class="button primary"
          onclick="startStroop()"
        >
          Recommencer
        </button>

        <button
          class="button secondary"
          onclick="closeTestWindow()"
        >
          Terminer
        </button>

      </div>

    </div>
  `;
}


/* ============================================================
   RAPID COMPARISON
============================================================ */

let comparisonState = null;

function randomDigits(length = 7) {
  return Array.from(
    { length },
    () => Math.floor(Math.random() * 10)
  ).join("");
}

function startComparison() {
  comparisonState = {
    index: 0,
    total: 15,
    correct: 0,
    start: Date.now()
  };

  openTestWindow();
  renderComparison();
}

function renderComparison() {
  clearInterval(timerInterval);

  if (comparisonState.index >= comparisonState.total) {
    showComparisonResult();
    return;
  }

  const first = randomDigits();

  const identical = Math.random() > 0.5;

  let second = first;

  if (!identical) {
    const position = Math.floor(
      Math.random() * first.length
    );

    let replacement = String(
      Math.floor(Math.random() * 10)
    );

    while (replacement === first[position]) {
      replacement = String(
        Math.floor(Math.random() * 10)
      );
    }

    second =
      first.slice(0, position) +
      replacement +
      first.slice(position + 1);
  }

  comparisonState.expected = identical;
  comparisonState.remaining = 5;

  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      COMPARAISON RAPIDE
    </div>

    <div class="test-top">

      <div class="question-number">
        Essai ${comparisonState.index + 1} / ${comparisonState.total}
      </div>

      <div
        id="comparisonTimer"
        class="timer-box"
      >
        5s
      </div>

    </div>

    <div class="memory-stage">

      <div>

        <div
          style="
            font-size:31px;
            font-weight:900;
            letter-spacing:4px;
          "
        >
          ${first}
        </div>

        <div
          style="
            margin-top:15px;
            font-size:31px;
            font-weight:900;
            letter-spacing:4px;
          "
        >
          ${second}
        </div>

      </div>

    </div>

    <div class="answers">

      <button
        class="answer-button"
        onclick="answerComparison(true)"
      >
        Identiques
      </button>

      <button
        class="answer-button"
        onclick="answerComparison(false)"
      >
        Différentes
      </button>

    </div>
  `;

  timerInterval = setInterval(() => {
    comparisonState.remaining--;

    const timer = $("#comparisonTimer");

    if (timer) {
      timer.textContent =
        comparisonState.remaining + "s";
    }

    if (comparisonState.remaining <= 0) {
      clearInterval(timerInterval);

      comparisonState.index++;

      renderComparison();
    }
  }, 1000);
}

function answerComparison(answer) {
  clearInterval(timerInterval);

  if (answer === comparisonState.expected) {
    comparisonState.correct++;
  }

  comparisonState.index++;

  renderComparison();
}

function showComparisonResult() {
  const score = Math.round(
    (comparisonState.correct / comparisonState.total) * 100
  );

  addHistory(
    "Concentration",
    "Comparaison rapide",
    score + "/100"
  );

  $("#testWindowContent").innerHTML = `
    <div class="result-screen">

      <div class="result-score">
        ${score}/100
      </div>

      <h2>
        Comparaison terminée
      </h2>

      <p>
        ${comparisonState.correct}/${comparisonState.total}
        réponses correctes.
      </p>

      <div class="result-actions">

        <button
          class="button primary"
          onclick="startComparison()"
        >
          Recommencer
        </button>

        <button
          class="button secondary"
          onclick="closeTestWindow()"
        >
          Terminer
        </button>

      </div>

    </div>
  `;
}


/* ============================================================
   FOCUS TIMER
============================================================ */

let focusState = null;

function openFocusTimer() {
  openTestWindow();

  $("#testWindowContent").innerHTML = `
    <div class="eyebrow">
      FOCUS TIMER
    </div>

    <h2>
      Choisis ta session
    </h2>

    <p style="margin-top:8px">
      Avant de commencer, choisis une seule tâche à accomplir.
    </p>

    <div style="margin-top:18px">

      <input
        id="focusGoal"
        class="memory-input"
        style="font-size:16px;width:100%"
        placeholder="Ex. terminer la présentation..."
      >

    </div>

    <div class="focus-options">

      <button
        class="answer-button"
        onclick="startFocusSession(10)"
      >
        10 min
      </button>

      <button
        class="answer-button"
        onclick="startFocusSession(25)"
      >
        25 min
      </button>

      <button
        class="answer-button"
        onclick="startFocusSession(45)"
      >
        45 min
      </button>

      <button
        class="answer-button"
        onclick="startFocusSession(60)"
      >
        60 min
      </button>

    </div>
  `;
}

function startFocusSession(minutes) {
  const goal =
    ($("#focusGoal")?.value || "").trim();

  focusState = {
    minutes,
    goal: goal || "Session de concentration",
    seconds: minutes * 60,
    startedAt: Date.now()
  };

  renderFocusSession();

  focusInterval = setInterval(() => {
    focusState.seconds--;

    const clock = $("#focusClock");

    if (clock) {
      clock.textContent =
        formatTime(focusState.seconds);
    }

    if (focusState.seconds <= 0) {
      clearInterval(focusInterval);
      finishFocusSession(true);
    }

  }, 1000);
}

function renderFocusSession() {
  $("#testWindowContent").innerHTML = `
    <div class="result-screen">

      <div class="eyebrow">
        FOCUS SESSION
      </div>

      <h2>
        ${focusState.goal}
      </h2>

      <div
        id="focusClock"
        class="focus-clock"
      >
        ${formatTime(focusState.seconds)}
      </div>

      <p>
        Une seule tâche.
        Éloigne les distractions jusqu'à la fin de la session.
      </p>

      <div class="result-actions">

        <button
          class="button secondary"
          onclick="finishFocusSession(false)"
        >
          Terminer maintenant
        </button>

      </div>

    </div>
  `;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const remainingSeconds = (seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function finishFocusSession(completed) {
  clearInterval(focusInterval);

  const elapsedSeconds = Math.max(
    0,
    focusState.minutes * 60 - focusState.seconds
  );

  const elapsedMinutes = Math.max(
    1,
    Math.round(elapsedSeconds / 60)
  );

  const stats = getStats();

  stats.focusMinutes += elapsedMinutes;

  saveStats(stats);

  addHistory(
    "Concentration",
    "Focus Timer",
    elapsedMinutes + " min"
  );

  $("#testWindowContent").innerHTML = `
    <div class="result-screen">

      <div class="result-score">
        ${elapsedMinutes}
      </div>

      <h2>
        minutes de focus
      </h2>

      <p>
        ${completed
          ? "Session terminée."
          : "Session arrêtée avant la fin."
        }
      </p>

      <p style="margin-top:8px">
        Objectif :
        <strong>${focusState.goal}</strong>
      </p>

      <div class="result-actions">

        <button
          class="button primary"
          onclick="openFocusTimer()"
        >
          Nouvelle session
        </button>

        <button
          class="button secondary"
          onclick="closeTestWindow()"
        >
          Terminer
        </button>

      </div>

    </div>
  `;
}


/* ============================================================
   INITIALISATION
============================================================ */

renderStats();
renderHistory();
