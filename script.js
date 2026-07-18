const STORAGE_KEY = "pickleball-randomizer-state-v1";

const defaultState = {
  players: [],
  currentMatch: null,
  history: [],
  theme: "dark",
};

let state = loadState();

const playerForm = document.getElementById("playerForm");
const playerNameInput = document.getElementById("playerName");
const playerList = document.getElementById("playerList");
const randomizeBtn = document.getElementById("randomizeBtn");
const clearMatchBtn = document.getElementById("clearMatchBtn");
const matchStatus = document.getElementById("matchStatus");
const matchView = document.getElementById("matchView");
const scoreboardView = document.getElementById("scoreboardView");
const finishMatchBtn = document.getElementById("finishMatchBtn");
const leaderboardView = document.getElementById("leaderboardView");
const historyView = document.getElementById("historyView");
const themeToggle = document.getElementById("themeToggle");

attachEvents();
render();

function attachEvents() {
  playerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addPlayer();
  });

  playerList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-remove-player]");
    if (!button) return;
    removePlayer(button.dataset.removePlayer);
  });

  randomizeBtn.addEventListener("click", randomizeMatch);
  clearMatchBtn.addEventListener("click", () => {
    state.currentMatch = null;
    saveState();
    render();
  });

  scoreboardView.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-score-action]");
    if (!button) return;
    const { scoreAction, teamIndex } = button.dataset;
    adjustScore(Number(teamIndex), scoreAction === "add" ? 1 : -1);
  });

  finishMatchBtn.addEventListener("click", finishMatch);
  themeToggle.addEventListener("click", toggleTheme);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return { ...defaultState };
    return {
      ...defaultState,
      ...saved,
      players: Array.isArray(saved.players) ? saved.players : [],
      history: Array.isArray(saved.history) ? saved.history : [],
      currentMatch: saved.currentMatch || null,
    };
  } catch (error) {
    console.warn("Unable to load saved app state", error);
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderPlayers();
  renderMatch();
  renderScoreboard();
  renderLeaderboard();
  renderHistory();
  renderTheme();
}

function renderPlayers() {
  if (!state.players.length) {
    playerList.innerHTML = '<div class="empty-state">No players yet. Add the first name to get started.</div>';
    return;
  }

  playerList.innerHTML = "";

  state.players.forEach((player, index) => {
    const item = document.createElement("div");
    item.className = "player-item";
    item.innerHTML = `
      <div class="player-meta">
        <span class="player-name">${escapeHtml(player.name)}</span>
        <span class="player-stats">W ${player.wins} • L ${player.losses} • G ${player.gamesPlayed}</span>
      </div>
      <button class="remove-btn" type="button" data-remove-player="${index}">Remove</button>
    `;
    playerList.appendChild(item);
  });
}

function renderMatch() {
  if (!state.currentMatch) {
    matchStatus.textContent = state.players.length < 4 ? "Add at least 4 players to begin" : "No active match";
    matchView.innerHTML = '<div class="empty-state">Create a new random doubles matchup to see teams and the bench here.</div>';
    return;
  }

  const [teamA, teamB] = state.currentMatch.teams;
  matchStatus.textContent = `Active match • ${state.currentMatch.selectedPlayers.join(" • ")}`;

  matchView.innerHTML = `
    <div class="team-grid">
      <div class="team-card">
        <h3>Team A</h3>
        ${teamA.map((player) => `<span class="player-chip">${escapeHtml(player)}</span>`).join("")}
      </div>
      <div class="team-card">
        <h3>Team B</h3>
        ${teamB.map((player) => `<span class="player-chip">${escapeHtml(player)}</span>`).join("")}
      </div>
    </div>
    <div class="team-card">
      <h3>Bench</h3>
      <div class="bench-list">
        ${state.currentMatch.bench.length ? state.currentMatch.bench.map((player) => `<span class="bench-chip">${escapeHtml(player)}</span>`).join("") : '<span class="bench-chip">No bench players</span>'}
      </div>
    </div>
  `;
}

function renderScoreboard() {
  if (!state.currentMatch) {
    scoreboardView.innerHTML = '<div class="empty-state">Start a match to enable live scoring.</div>';
    finishMatchBtn.disabled = true;
    return;
  }

  finishMatchBtn.disabled = false;
  const [teamA, teamB] = state.currentMatch.teams;

  scoreboardView.innerHTML = `
    <div class="score-row">
      <div>
        <strong>${escapeHtml(teamA.join(" + "))}</strong>
        <div class="history-meta">Team A</div>
      </div>
      <div class="score-badges">
        <span class="score-badge">${state.currentMatch.scores[0]}</span>
        <div class="score-btns">
          <button type="button" data-score-action="add" data-team-index="0">+</button>
          <button type="button" data-score-action="subtract" data-team-index="0">−</button>
        </div>
      </div>
    </div>
    <div class="score-row">
      <div>
        <strong>${escapeHtml(teamB.join(" + "))}</strong>
        <div class="history-meta">Team B</div>
      </div>
      <div class="score-badges">
        <span class="score-badge">${state.currentMatch.scores[1]}</span>
        <div class="score-btns">
          <button type="button" data-score-action="add" data-team-index="1">+</button>
          <button type="button" data-score-action="subtract" data-team-index="1">−</button>
        </div>
      </div>
    </div>
  `;
}

function renderLeaderboard() {
  const sortedPlayers = [...state.players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return b.gamesPlayed - a.gamesPlayed;
  });

  if (!sortedPlayers.length) {
    leaderboardView.innerHTML = '<div class="empty-state">Leaderboard will appear once players are added.</div>';
    return;
  }

  leaderboardView.innerHTML = sortedPlayers
    .map((player, index) => `
      <div class="leader-item">
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="leader-rank">${index + 1}</span>
          <div>
            <div class="player-name">${escapeHtml(player.name)}</div>
            <div class="history-meta">${player.gamesPlayed} games • ${player.wins} wins • ${player.losses} losses</div>
          </div>
        </div>
        <strong>${player.wins} W</strong>
      </div>
    `)
    .join("");
}

function renderHistory() {
  if (!state.history.length) {
    historyView.innerHTML = '<div class="empty-state">Match history will appear here after you finish a game.</div>';
    return;
  }

  historyView.innerHTML = state.history
    .slice(0, 8)
    .map((item) => `
      <div class="history-item">
        <div>
          <div class="player-name">${escapeHtml(item.winnerLabel || "Tie")}</div>
          <div class="history-meta">${escapeHtml(item.teams[0].join(" + "))} vs ${escapeHtml(item.teams[1].join(" + "))}</div>
        </div>
        <div class="history-meta">${item.score[0]} - ${item.score[1]} • ${formatDate(item.finishedAt)}</div>
      </div>
    `)
    .join("");
}

function renderTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  themeToggle.textContent = state.theme === "dark" ? "🌙 Dark mode" : "☀️ Light mode";
}

function addPlayer() {
  const rawName = playerNameInput.value.trim();

  if (!rawName) {
    matchStatus.textContent = "Please enter a player name.";
    return;
  }

  const normalizedName = rawName.toLowerCase();
  const alreadyExists = state.players.some((player) => player.name.toLowerCase() === normalizedName);

  if (alreadyExists) {
    matchStatus.textContent = `${rawName} is already in the roster.`;
    return;
  }

  state.players.push({
    name: rawName,
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
  });

  playerNameInput.value = "";
  matchStatus.textContent = `${rawName} added to the roster.`;
  saveState();
  render();
}

function removePlayer(nameIndex) {
  const player = state.players[Number(nameIndex)];
  if (!player) return;

  const removedName = player.name;
  state.players.splice(Number(nameIndex), 1);

  if (state.currentMatch && state.currentMatch.selectedPlayers.includes(removedName)) {
    state.currentMatch = null;
  }

  matchStatus.textContent = `${removedName} removed.`;
  saveState();
  render();
}

function randomizeMatch() {
  if (state.players.length < 4) {
    matchStatus.textContent = "You need at least 4 players to create a match.";
    return;
  }

  const randomizedPlayers = shuffle(state.players.map((player) => player.name));
  const selectedPlayers = randomizedPlayers.slice(0, 4);
  const bench = randomizedPlayers.slice(4);
  const teamA = selectedPlayers.slice(0, 2);
  const teamB = selectedPlayers.slice(2, 4);

  state.currentMatch = {
    selectedPlayers,
    teams: [teamA, teamB],
    bench,
    scores: [0, 0],
  };

  matchStatus.textContent = "New match generated.";
  saveState();
  render();
}

function adjustScore(teamIndex, delta) {
  if (!state.currentMatch) return;
  const nextScore = state.currentMatch.scores[teamIndex] + delta;
  state.currentMatch.scores[teamIndex] = Math.max(0, nextScore);
  saveState();
  renderScoreboard();
}

function finishMatch() {
  if (!state.currentMatch) return;

  const [scoreA, scoreB] = state.currentMatch.scores;
  const winnerIndex = scoreA > scoreB ? 0 : scoreB > scoreA ? 1 : null;
  const winnerLabel = winnerIndex === null
    ? "Tie game"
    : `${state.currentMatch.teams[winnerIndex].join(" + ")}`;

  state.players.forEach((player) => {
    const playerName = player.name;
    const isInMatch = state.currentMatch.selectedPlayers.includes(playerName);
    if (!isInMatch) return;

    player.gamesPlayed += 1;

    if (winnerIndex === null) return;

    const playerTeamIndex = state.currentMatch.teams[0].includes(playerName) ? 0 : 1;
    if (playerTeamIndex === winnerIndex) {
      player.wins += 1;
    } else {
      player.losses += 1;
    }
  });

  state.history.unshift({
    finishedAt: new Date().toISOString(),
    teams: state.currentMatch.teams.map((team) => [...team]),
    score: [...state.currentMatch.scores],
    winnerLabel,
  });

  state.history = state.history.slice(0, 10);
  state.currentMatch = null;
  matchStatus.textContent = "Match finished and stats updated.";
  saveState();
  render();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveState();
  renderTheme();
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
