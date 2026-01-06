// State
let players = [];
let games = [];
let unavailablePlayers = [];
let currentGame = 0;
let showNameMenu = false;
let showPlayerMenu = false;
let showPrintView = false;
let editingGroups = false;
let swapSelection = null;

// Constants
const MATCHUPS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
const GROUPS = ['A', 'B', 'C', 'D'];

// Initialize
function init() {
  players = getInitialPlayers();
  games = getInitialGames();
  unavailablePlayers = getInitialUnavailable();
  render();
}

function getInitialUnavailable() {
  const saved = localStorage.getItem('tournamentUnavailable');
  return saved ? JSON.parse(saved) : [];
}

function getInitialPlayers() {
  const saved = localStorage.getItem('tournamentPlayers');
  return saved ? JSON.parse(saved) : [
    'Player 1', 'Player 2', 'Player 3', 'Player 4',
    'Player 5', 'Player 6', 'Player 7', 'Player 8',
    'Player 9', 'Player 10', 'Player 11', 'Player 12',
    'Player 13', 'Player 14', 'Player 15', 'Player 16'
  ];
}

function getInitialGames() {
  const saved = localStorage.getItem('tournamentGames');
  if (saved) {
    const parsedGames = JSON.parse(saved);
    while (parsedGames.length < 6) {
      parsedGames.push(createEmptyGame(parsedGames.length + 1));
    }
    return parsedGames;
  }
  return Array.from({ length: 6 }, (_, idx) => createEmptyGame(idx + 1));
}

function createEmptyGame(num) {
  return {
    name: `Game ${num}`,
    groups: { A: [], B: [], C: [], D: [] },
    matches: {
      A: Array.from({ length: 6 }, () => ({ home: '', away: '' })),
      B: Array.from({ length: 6 }, () => ({ home: '', away: '' })),
      C: Array.from({ length: 6 }, () => ({ home: '', away: '' })),
      D: Array.from({ length: 6 }, () => ({ home: '', away: '' }))
    },
    knockouts: {
      semi1: { score1: '', score2: '' },
      semi2: { score1: '', score2: '' },
      final: { score1: '', score2: '' }
    }
  };
}

// Persistence
function saveToStorage() {
  localStorage.setItem('tournamentPlayers', JSON.stringify(players));
  localStorage.setItem('tournamentGames', JSON.stringify(games));
  localStorage.setItem('tournamentUnavailable', JSON.stringify(unavailablePlayers));
}

// Actions
function updatePlayerName(index, value) {
  const oldName = players[index];
  players[index] = value;
  // Update name in all games' groups
  games.forEach(game => {
    ['A', 'B', 'C', 'D'].forEach(group => {
      const idx = game.groups[group].indexOf(oldName);
      if (idx !== -1) {
        game.groups[group][idx] = value;
      }
    });
  });
  saveToStorage();
}

function updateGameName(index, value) {
  games[index].name = value;
  saveToStorage();
  render();
}

function togglePlayerAvailability(playerName) {
  const idx = unavailablePlayers.indexOf(playerName);
  if (idx === -1) {
    unavailablePlayers.push(playerName);
  } else {
    unavailablePlayers.splice(idx, 1);
  }
  saveToStorage();
  render();
}

function isPlayerUnavailable(playerName) {
  return unavailablePlayers.includes(playerName);
}

function gameHasResults(gameIndex) {
  const game = games[gameIndex];
  for (const group of ['A', 'B', 'C', 'D']) {
    for (const match of game.matches[group]) {
      if (match.home !== '' || match.away !== '') return true;
    }
  }
  return false;
}

function toggleEditGroups() {
  editingGroups = !editingGroups;
  swapSelection = null;
  render();
}

function selectPlayerForSwap(gameIndex, group, playerIndex) {
  if (!swapSelection) {
    swapSelection = { gameIndex, group, playerIndex };
  } else {
    // Perform swap
    const sel = swapSelection;
    const player1 = games[sel.gameIndex].groups[sel.group][sel.playerIndex];
    const player2 = games[gameIndex].groups[group][playerIndex];
    games[sel.gameIndex].groups[sel.group][sel.playerIndex] = player2;
    games[gameIndex].groups[group][playerIndex] = player1;
    swapSelection = null;
    editingGroups = false;
    saveToStorage();
  }
  render();
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function randomizeGroups(gameIndex) {
  const shuffled = shuffleArray(players);
  games[gameIndex].groups = {
    A: shuffled.slice(0, 4),
    B: shuffled.slice(4, 8),
    C: shuffled.slice(8, 12),
    D: shuffled.slice(12, 16)
  };
  saveToStorage();
  render();
}

function randomizeAllGames() {
  games = games.map(game => {
    const shuffled = shuffleArray(players);
    return {
      ...game,
      groups: {
        A: shuffled.slice(0, 4),
        B: shuffled.slice(4, 8),
        C: shuffled.slice(8, 12),
        D: shuffled.slice(12, 16)
      }
    };
  });
  saveToStorage();
  render();
}

function updateMatchScore(gameIndex, group, matchIndex, field, value) {
  games[gameIndex].matches[group][matchIndex][field] = value;
  saveToStorage();
  render();
}

function updateKnockout(gameIndex, stage, field, value) {
  games[gameIndex].knockouts[stage][field] = value;
  saveToStorage();
  render();
}

function clearAllData() {
  if (window.confirm('Are you sure you want to clear ALL tournament data? This cannot be undone!')) {
    localStorage.removeItem('tournamentPlayers');
    localStorage.removeItem('tournamentGames');
    localStorage.removeItem('tournamentUnavailable');
    window.location.reload();
  }
}

function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    players: players,
    games: games,
    unavailablePlayers: unavailablePlayers
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tournament-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.players || !data.games) {
          alert('Invalid tournament file');
          return;
        }
        if (confirm('This will replace all current data. Continue?')) {
          players = data.players;
          games = data.games;
          unavailablePlayers = data.unavailablePlayers || [];
          saveToStorage();
          render();
        }
      } catch (err) {
        alert('Failed to read file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function setCurrentGame(idx) {
  currentGame = idx;
  render();
}

function toggleNameMenu() {
  showNameMenu = !showNameMenu;
  render();
}

function togglePlayerMenu() {
  showPlayerMenu = !showPlayerMenu;
  render();
}

function togglePrintView() {
  showPrintView = !showPrintView;
  render();
}

function printFixturesAndResults() {
  showPrintView = true;
  render();
  setTimeout(() => window.print(), 100);
}

// Calculations
function calculateStandings(gameIndex, group) {
  const groupData = games[gameIndex];
  if (!groupData.groups[group] || groupData.groups[group].length === 0) {
    return [];
  }

  const standings = groupData.groups[group].map(player => ({
    player,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    for: 0,
    against: 0,
    points: 0
  }));

  const groupPlayers = groupData.groups[group];

  groupData.matches[group].forEach((match, idx) => {
    const [homeIdx, awayIdx] = MATCHUPS[idx];
    const homePlayer = groupPlayers[homeIdx];
    const awayPlayer = groupPlayers[awayIdx];
    const homeUnavail = isPlayerUnavailable(homePlayer);
    const awayUnavail = isPlayerUnavailable(awayPlayer);

    let homeScore, awayScore;

    // Handle forfeits
    if (homeUnavail && awayUnavail) {
      // Both unavailable - no match played
      return;
    } else if (homeUnavail) {
      homeScore = 0;
      awayScore = 3;
    } else if (awayUnavail) {
      homeScore = 3;
      awayScore = 0;
    } else {
      // Normal match - use entered scores
      if (match.home === '' && match.away === '') return;
      homeScore = parseInt(match.home) || 0;
      awayScore = parseInt(match.away) || 0;
    }

    standings[homeIdx].played++;
    standings[awayIdx].played++;
    standings[homeIdx].for += homeScore;
    standings[homeIdx].against += awayScore;
    standings[awayIdx].for += awayScore;
    standings[awayIdx].against += homeScore;

    if (homeScore > awayScore) {
      standings[homeIdx].won++;
      standings[homeIdx].points += 3;
      standings[awayIdx].lost++;
    } else if (homeScore < awayScore) {
      standings[awayIdx].won++;
      standings[awayIdx].points += 3;
      standings[homeIdx].lost++;
    } else {
      standings[homeIdx].drawn++;
      standings[awayIdx].drawn++;
      standings[homeIdx].points += 1;
      standings[awayIdx].points += 1;
    }
  });

  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.for - a.against;
    const diffB = b.for - b.against;
    if (diffB !== diffA) return diffB - diffA;
    return b.for - a.for;
  });
}

function getGroupWinner(gameIndex, group) {
  const standings = calculateStandings(gameIndex, group);
  return standings.length > 0 && standings[0].played > 0 ? standings[0].player : '';
}

function getSemiFinalWinner(gameIndex, semi) {
  const semiData = games[gameIndex].knockouts[semi];
  if (semiData.score1 === '' || semiData.score2 === '') return '';
  const score1 = parseInt(semiData.score1) || 0;
  const score2 = parseInt(semiData.score2) || 0;

  const winnerA = getGroupWinner(gameIndex, 'A');
  const winnerB = getGroupWinner(gameIndex, 'B');
  const winnerC = getGroupWinner(gameIndex, 'C');
  const winnerD = getGroupWinner(gameIndex, 'D');

  if (semi === 'semi1') {
    if (score1 > score2) return winnerA;
    if (score2 > score1) return winnerB;
  } else {
    if (score1 > score2) return winnerC;
    if (score2 > score1) return winnerD;
  }
  return '';
}

function getAutoFilledKnockouts(gameIndex) {
  const winnerA = getGroupWinner(gameIndex, 'A');
  const winnerB = getGroupWinner(gameIndex, 'B');
  const winnerC = getGroupWinner(gameIndex, 'C');
  const winnerD = getGroupWinner(gameIndex, 'D');

  return {
    semi1: {
      player1: winnerA,
      player2: winnerB,
      score1: games[gameIndex].knockouts.semi1.score1,
      score2: games[gameIndex].knockouts.semi1.score2
    },
    semi2: {
      player1: winnerC,
      player2: winnerD,
      score1: games[gameIndex].knockouts.semi2.score1,
      score2: games[gameIndex].knockouts.semi2.score2
    },
    final: {
      player1: getSemiFinalWinner(gameIndex, 'semi1'),
      player2: getSemiFinalWinner(gameIndex, 'semi2'),
      score1: games[gameIndex].knockouts.final.score1,
      score2: games[gameIndex].knockouts.final.score2
    }
  };
}

function calculateOverallStandings() {
  const overall = {};

  players.forEach(player => {
    overall[player] = { player, wins: 0 };
  });

  games.forEach((game, gameIdx) => {
    const autoKO = getAutoFilledKnockouts(gameIdx);
    const final = autoKO.final;
    const scores = game.knockouts.final;

    if (scores.score1 !== '' && scores.score2 !== '') {
      const score1 = parseInt(scores.score1) || 0;
      const score2 = parseInt(scores.score2) || 0;
      if (score1 > score2 && final.player1) {
        overall[final.player1].wins++;
      } else if (score2 > score1 && final.player2) {
        overall[final.player2].wins++;
      }
    }
  });

  return Object.values(overall)
    .sort((a, b) => b.wins - a.wins)
    .filter(p => p.wins > 0);
}

function isGroupComplete(gameIdx, group) {
  return games[gameIdx].matches[group].every(match => match.home !== '' && match.away !== '');
}

// Rendering
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderGroupMatches(gameIndex, groupName) {
  const groupData = games[gameIndex];
  const groupPlayers = groupData.groups[groupName];

  if (!groupPlayers || groupPlayers.length === 0) {
    return '<div class="text-gray-400 italic">No players assigned yet</div>';
  }

  let html = '<div><h4 class="font-semibold mb-2">Match Results:</h4><div class="space-y-2 text-sm">';

  MATCHUPS.forEach((matchup, idx) => {
    const match = groupData.matches[groupName][idx];
    const homePlayer = groupPlayers[matchup[0]];
    const awayPlayer = groupPlayers[matchup[1]];
    const homeUnavail = isPlayerUnavailable(homePlayer);
    const awayUnavail = isPlayerUnavailable(awayPlayer);
    const isForfeit = homeUnavail || awayUnavail;

    let homeValue = match.home;
    let awayValue = match.away;

    // Show forfeit scores
    if (homeUnavail && !awayUnavail) {
      homeValue = '0';
      awayValue = '3';
    } else if (awayUnavail && !homeUnavail) {
      homeValue = '3';
      awayValue = '0';
    } else if (homeUnavail && awayUnavail) {
      homeValue = '-';
      awayValue = '-';
    }

    const homeClass = homeUnavail ? 'line-through text-gray-400' : '';
    const awayClass = awayUnavail ? 'line-through text-gray-400' : '';
    const inputClass = isForfeit ? 'bg-gray-200 text-gray-500' : '';

    html += `
      <div class="flex items-center gap-2">
        <span class="w-28 text-right truncate ${homeClass}">${escapeHtml(homePlayer)}</span>
        <input type="number" min="0" value="${escapeHtml(homeValue)}"
          onchange="updateMatchScore(${gameIndex}, '${groupName}', ${idx}, 'home', this.value)"
          class="w-14 border rounded px-2 py-1 text-center ${inputClass}" ${isForfeit ? 'disabled' : ''} />
        <span>-</span>
        <input type="number" min="0" value="${escapeHtml(awayValue)}"
          onchange="updateMatchScore(${gameIndex}, '${groupName}', ${idx}, 'away', this.value)"
          class="w-14 border rounded px-2 py-1 text-center ${inputClass}" ${isForfeit ? 'disabled' : ''} />
        <span class="w-28 truncate ${awayClass}">${escapeHtml(awayPlayer)}</span>
        ${isForfeit ? '<span class="text-xs text-red-500 ml-1">Forfeit</span>' : ''}
      </div>
    `;
  });

  html += '</div>';

  // Standings table
  const standings = calculateStandings(gameIndex, groupName);
  html += `
    <div class="mt-4">
      <h4 class="font-semibold mb-2">Group Table:</h4>
      <table class="w-full text-xs">
        <thead class="bg-gray-100">
          <tr>
            <th class="text-left px-1 py-1">Player</th>
            <th class="px-1 py-1">P</th>
            <th class="px-1 py-1">W</th>
            <th class="px-1 py-1">D</th>
            <th class="px-1 py-1">L</th>
            <th class="px-1 py-1">F</th>
            <th class="px-1 py-1">A</th>
            <th class="px-1 py-1">GD</th>
            <th class="px-1 py-1">Pts</th>
          </tr>
        </thead>
        <tbody>
  `;

  standings.forEach((standing, idx) => {
    const isUnavail = isPlayerUnavailable(standing.player);
    const rowClass = idx === 0 ? 'bg-green-50 font-semibold' : '';
    const nameClass = isUnavail ? 'line-through text-gray-400' : '';
    html += `
      <tr class="${rowClass}">
        <td class="px-1 py-1 truncate max-w-[100px] ${nameClass}">${escapeHtml(standing.player)}</td>
        <td class="text-center px-1 py-1">${standing.played}</td>
        <td class="text-center px-1 py-1">${standing.won}</td>
        <td class="text-center px-1 py-1">${standing.drawn}</td>
        <td class="text-center px-1 py-1">${standing.lost}</td>
        <td class="text-center px-1 py-1">${standing.for}</td>
        <td class="text-center px-1 py-1">${standing.against}</td>
        <td class="text-center px-1 py-1">${standing.for - standing.against}</td>
        <td class="text-center px-1 py-1">${standing.points}</td>
      </tr>
    `;
  });

  html += '</tbody></table></div></div>';
  return html;
}

function renderPrintView() {
  let html = `
    <div class="print-view">
      <div class="no-print mb-4 flex gap-3">
        <button onclick="window.print()" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-semibold">
          Print Fixtures
        </button>
        <button onclick="togglePrintView()" class="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 font-semibold">
          Close Print View
        </button>
      </div>
  `;

  games.forEach((game, gameIdx) => {
    const pageBreak = gameIdx < games.length - 1 ? 'page-break' : '';
    html += `<div class="${pageBreak}">`;
    html += `<h2 class="text-xl font-bold border-b-2 border-gray-800 pb-1 mb-3">${escapeHtml(game.name)}</h2>`;

    // Groups A and B
    html += '<div class="group-container">';
    ['A', 'B'].forEach(group => {
      const groupPlayers = game.groups[group];
      if (groupPlayers.length === 0) return;

      html += `
        <div class="group-column">
          <h3 class="text-base font-bold mb-2">Group ${group}</h3>
          <p class="mb-2 text-xs"><strong>Players:</strong> ${groupPlayers.map(p => escapeHtml(p)).join(', ')}</p>
          <div>
      `;

      MATCHUPS.forEach((matchup, idx) => {
        const match = game.matches[group][idx];
        const hasScore = match.home !== '' && match.away !== '';
        html += `
          <div class="match-line">
            <span class="player-name text-right truncate">${escapeHtml(groupPlayers[matchup[0]])}</span>
            <div style="display: flex; align-items: center;">
              <div class="score-box">${hasScore ? escapeHtml(match.home) : ''}</div>
              <span style="margin: 0 3px; font-size: 14px; font-weight: bold;">-</span>
              <div class="score-box">${hasScore ? escapeHtml(match.away) : ''}</div>
            </div>
            <span class="player-name text-left truncate">${escapeHtml(groupPlayers[matchup[1]])}</span>
          </div>
        `;
      });

      html += '</div></div>';
    });
    html += '</div>';

    // Groups C and D
    html += '<div class="group-container">';
    ['C', 'D'].forEach(group => {
      const groupPlayers = game.groups[group];
      if (groupPlayers.length === 0) return;

      html += `
        <div class="group-column">
          <h3 class="text-base font-bold mb-2">Group ${group}</h3>
          <p class="mb-2 text-xs"><strong>Players:</strong> ${groupPlayers.map(p => escapeHtml(p)).join(', ')}</p>
          <div>
      `;

      MATCHUPS.forEach((matchup, idx) => {
        const match = game.matches[group][idx];
        const hasScore = match.home !== '' && match.away !== '';
        html += `
          <div class="match-line">
            <span class="player-name text-right truncate">${escapeHtml(groupPlayers[matchup[0]])}</span>
            <div style="display: flex; align-items: center;">
              <div class="score-box">${hasScore ? escapeHtml(match.home) : ''}</div>
              <span style="margin: 0 3px; font-size: 14px; font-weight: bold;">-</span>
              <div class="score-box">${hasScore ? escapeHtml(match.away) : ''}</div>
            </div>
            <span class="player-name text-left truncate">${escapeHtml(groupPlayers[matchup[1]])}</span>
          </div>
        `;
      });

      html += '</div></div>';
    });
    html += '</div>';

    // Knockout Stage
    const autoKO = getAutoFilledKnockouts(gameIdx);
    const ko = game.knockouts;
    const groupAComplete = isGroupComplete(gameIdx, 'A');
    const groupBComplete = isGroupComplete(gameIdx, 'B');
    const groupCComplete = isGroupComplete(gameIdx, 'C');
    const groupDComplete = isGroupComplete(gameIdx, 'D');
    const semi1HasScore = ko.semi1.score1 !== '' && ko.semi1.score2 !== '';
    const semi2HasScore = ko.semi2.score1 !== '' && ko.semi2.score2 !== '';
    const finalHasScore = ko.final.score1 !== '' && ko.final.score2 !== '';
    const semi1Complete = ko.semi1.score1 !== '' && ko.semi1.score2 !== '';
    const semi2Complete = ko.semi2.score1 !== '' && ko.semi2.score2 !== '';

    html += `
      <div class="knockout-section border-2 border-gray-800" style="margin-top: 15px; padding: 10px;">
        <h3 class="text-base font-bold mb-3">Knockout Stage</h3>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1;">
            <h4 class="text-sm mb-2">Semi-Final 1 (A vs B)</h4>
            <div class="match-line">
              <span class="player-name text-right truncate">${groupAComplete ? escapeHtml(autoKO.semi1.player1) : 'A'}</span>
              <div style="display: flex; align-items: center;">
                <div class="score-box">${semi1HasScore ? escapeHtml(ko.semi1.score1) : ''}</div>
                <span style="margin: 0 3px; font-size: 14px; font-weight: bold;">-</span>
                <div class="score-box">${semi1HasScore ? escapeHtml(ko.semi1.score2) : ''}</div>
              </div>
              <span class="player-name text-left truncate">${groupBComplete ? escapeHtml(autoKO.semi1.player2) : 'B'}</span>
            </div>
          </div>
          <div style="flex: 1;">
            <h4 class="text-sm mb-2">Semi-Final 2 (C vs D)</h4>
            <div class="match-line">
              <span class="player-name text-right truncate">${groupCComplete ? escapeHtml(autoKO.semi2.player1) : 'C'}</span>
              <div style="display: flex; align-items: center;">
                <div class="score-box">${semi2HasScore ? escapeHtml(ko.semi2.score1) : ''}</div>
                <span style="margin: 0 3px; font-size: 14px; font-weight: bold;">-</span>
                <div class="score-box">${semi2HasScore ? escapeHtml(ko.semi2.score2) : ''}</div>
              </div>
              <span class="player-name text-left truncate">${groupDComplete ? escapeHtml(autoKO.semi2.player2) : 'D'}</span>
            </div>
          </div>
        </div>
        <div style="margin-top: 12px; padding: 8px; background: #fff9c4; border: 2px solid #000;">
          <h4 class="text-sm font-bold mb-2">FINAL</h4>
          <div class="match-line" style="border: 2px solid #000;">
            <span class="player-name text-right truncate">${semi1Complete ? escapeHtml(autoKO.final.player1) : 'SF1'}</span>
            <div style="display: flex; align-items: center;">
              <div class="score-box" style="border-width: 2px;">${finalHasScore ? escapeHtml(ko.final.score1) : ''}</div>
              <span style="margin: 0 5px; font-size: 16px; font-weight: bold;">-</span>
              <div class="score-box" style="border-width: 2px;">${finalHasScore ? escapeHtml(ko.final.score2) : ''}</div>
            </div>
            <span class="player-name text-left truncate">${semi2Complete ? escapeHtml(autoKO.final.player2) : 'SF2'}</span>
          </div>
        </div>
      </div>
    `;

    html += '</div>';
  });

  html += '</div>';
  return html;
}

function renderMainView() {
  let html = `
    <h1 class="text-3xl font-bold mb-6 text-center">7th Whitburn Scouts Tournament Jan 2026</h1>

    <div class="mb-6 p-4 bg-white rounded-lg shadow">
      <h2 class="text-xl font-bold mb-4">Player List</h2>
      <div class="flex gap-3 flex-wrap">
        <button onclick="togglePlayerMenu()" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold">Edit Players</button>
        <button onclick="toggleNameMenu()" class="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 font-semibold">Name Games</button>
        <button onclick="printFixturesAndResults()" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-semibold">Print Fixtures & Results</button>
        <button onclick="exportData()" class="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-semibold">Export Data</button>
        <button onclick="importData()" class="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 font-semibold">Import Data</button>
        <button onclick="clearAllData()" class="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 font-semibold">Clear All Data</button>
      </div>
  `;

  if (showPlayerMenu) {
    html += `
      <div class="mt-4 p-4 bg-gray-50 rounded">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
    `;
    players.forEach((player, idx) => {
      const isUnavail = isPlayerUnavailable(player);
      html += `
        <div class="flex items-center gap-2">
          <input type="text" value="${escapeHtml(player)}"
            onchange="updatePlayerName(${idx}, this.value)"
            class="border rounded px-2 py-1 flex-1 ${isUnavail ? 'line-through text-gray-400' : ''}" />
          <label class="flex items-center gap-1 text-xs whitespace-nowrap">
            <input type="checkbox" ${isUnavail ? 'checked' : ''}
              onchange="togglePlayerAvailability('${escapeHtml(player)}')" />
            N/A
          </label>
        </div>
      `;
    });
    html += `
        </div>
        <div class="mt-3 flex gap-3">
          <button onclick="randomizeAllGames()" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold">Randomize All 6 Games</button>
          <button onclick="togglePlayerMenu()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">Done</button>
        </div>
      </div>
    `;
  }

  if (showNameMenu) {
    html += `
      <div class="mt-4 p-4 bg-gray-50 rounded">
        <h3 class="font-semibold mb-3">Game Names:</h3>
        <div class="grid gap-2">
    `;
    games.forEach((game, idx) => {
      html += `
        <div class="flex items-center gap-2">
          <label class="w-20 font-medium">Game ${idx + 1}:</label>
          <input type="text" value="${escapeHtml(game.name)}"
            onchange="updateGameName(${idx}, this.value)"
            class="flex-1 border rounded px-3 py-2"
            placeholder="e.g., Pool, Darts, Table Tennis" />
        </div>
      `;
    });
    html += `
        </div>
        <button onclick="toggleNameMenu()" class="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">Done</button>
      </div>
    `;
  }

  html += '</div>';

  // Game tabs
  html += '<div class="mb-6"><div class="flex gap-2 flex-wrap">';
  for (let idx = 0; idx < 6; idx++) {
    const active = currentGame === idx
      ? 'bg-blue-600 text-white'
      : 'bg-white text-gray-700 hover:bg-gray-100';
    html += `
      <button onclick="setCurrentGame(${idx})"
        class="px-4 py-2 rounded font-semibold ${active}">
        ${escapeHtml(games[idx].name)}
      </button>
    `;
  }
  html += '</div></div>';

  // Current game groups
  const hasResults = gameHasResults(currentGame);
  html += `
    <div class="mb-6 p-4 bg-white rounded-lg shadow">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">${escapeHtml(games[currentGame].name)}</h2>
        <div class="flex gap-2">
          ${editingGroups ? `
            <button onclick="toggleEditGroups()"
              class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm font-semibold">
              Cancel
            </button>
          ` : `
            <button onclick="toggleEditGroups()"
              class="${hasResults ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded text-sm font-semibold"
              ${hasResults ? 'disabled' : ''}>
              Edit Groups
            </button>
          `}
          <button onclick="randomizeGroups(${currentGame})"
            class="${hasResults ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded text-sm font-semibold"
            ${hasResults ? 'disabled' : ''}>
            Randomize This Game
          </button>
        </div>
      </div>
      ${editingGroups ? '<p class="text-sm text-blue-600 mb-3">Click two players to swap their positions</p>' : ''}
      <div class="grid md:grid-cols-2 gap-4">
  `;

  GROUPS.forEach(group => {
    const groupPlayers = games[currentGame].groups[group];
    let playerListHtml = '';
    if (groupPlayers.length > 0) {
      if (editingGroups) {
        playerListHtml = `<div class="mb-3 text-sm"><strong>Players:</strong><div class="mt-1 space-y-1">`;
        groupPlayers.forEach((player, idx) => {
          const isSelected = swapSelection &&
            swapSelection.gameIndex === currentGame &&
            swapSelection.group === group &&
            swapSelection.playerIndex === idx;
          playerListHtml += `
            <div class="flex items-center gap-2 ${isSelected ? 'bg-blue-100 rounded px-1' : ''}">
              <button onclick="selectPlayerForSwap(${currentGame}, '${group}', ${idx})"
                class="text-blue-600 hover:text-blue-800">↔</button>
              <span>${escapeHtml(player)}</span>
            </div>
          `;
        });
        playerListHtml += `</div></div>`;
      } else {
        playerListHtml = `<div class="mb-3 text-sm"><strong>Players:</strong> ${groupPlayers.map(p => escapeHtml(p)).join(', ')}</div>`;
      }
    }
    html += `
      <div class="p-3 bg-gray-50 rounded">
        <h3 class="font-bold mb-3">Group ${group}</h3>
        ${playerListHtml}
        ${renderGroupMatches(currentGame, group)}
      </div>
    `;
  });

  html += '</div></div>';

  // Knockout stage
  const autoKO = getAutoFilledKnockouts(currentGame);
  const ko = games[currentGame].knockouts;
  const groupAComplete = isGroupComplete(currentGame, 'A');
  const groupBComplete = isGroupComplete(currentGame, 'B');
  const groupCComplete = isGroupComplete(currentGame, 'C');
  const groupDComplete = isGroupComplete(currentGame, 'D');
  const semi1HasScore = ko.semi1.score1 !== '' && ko.semi1.score2 !== '';
  const semi2HasScore = ko.semi2.score1 !== '' && ko.semi2.score2 !== '';

  html += `
    <div class="p-4 bg-white rounded-lg shadow">
      <h2 class="text-2xl font-bold mb-4">Knockout Stage - ${escapeHtml(games[currentGame].name)}</h2>
      <p class="text-sm text-gray-600 mb-4">Group winners automatically advance to semi-finals. Semi-final winners advance to final.</p>

      <div class="space-y-6">
        <div>
          <h3 class="font-semibold mb-3">Semi-Final 1: (Group A Winner vs Group B Winner)</h3>
          <div class="flex items-center gap-2 mb-2">
            <input type="text" value="${groupAComplete ? escapeHtml(autoKO.semi1.player1) : ''}" readonly
              class="flex-1 border rounded px-3 py-2 bg-gray-50" placeholder="Group A Winner" />
            <input type="number" min="0" value="${escapeHtml(ko.semi1.score1)}"
              onchange="updateKnockout(${currentGame}, 'semi1', 'score1', this.value)"
              class="w-20 border rounded px-3 py-2 text-center" />
          </div>
          <div class="flex items-center gap-2">
            <input type="text" value="${groupBComplete ? escapeHtml(autoKO.semi1.player2) : ''}" readonly
              class="flex-1 border rounded px-3 py-2 bg-gray-50" placeholder="Group B Winner" />
            <input type="number" min="0" value="${escapeHtml(ko.semi1.score2)}"
              onchange="updateKnockout(${currentGame}, 'semi1', 'score2', this.value)"
              class="w-20 border rounded px-3 py-2 text-center" />
          </div>
        </div>

        <div>
          <h3 class="font-semibold mb-3">Semi-Final 2: (Group C Winner vs Group D Winner)</h3>
          <div class="flex items-center gap-2 mb-2">
            <input type="text" value="${groupCComplete ? escapeHtml(autoKO.semi2.player1) : ''}" readonly
              class="flex-1 border rounded px-3 py-2 bg-gray-50" placeholder="Group C Winner" />
            <input type="number" min="0" value="${escapeHtml(ko.semi2.score1)}"
              onchange="updateKnockout(${currentGame}, 'semi2', 'score1', this.value)"
              class="w-20 border rounded px-3 py-2 text-center" />
          </div>
          <div class="flex items-center gap-2">
            <input type="text" value="${groupDComplete ? escapeHtml(autoKO.semi2.player2) : ''}" readonly
              class="flex-1 border rounded px-3 py-2 bg-gray-50" placeholder="Group D Winner" />
            <input type="number" min="0" value="${escapeHtml(ko.semi2.score2)}"
              onchange="updateKnockout(${currentGame}, 'semi2', 'score2', this.value)"
              class="w-20 border rounded px-3 py-2 text-center" />
          </div>
        </div>

        <div class="pt-4 border-t-2 border-yellow-400">
          <h3 class="font-semibold mb-3 text-lg">Final:</h3>
          <div class="flex items-center gap-2 mb-2">
            <input type="text" value="${semi1HasScore ? escapeHtml(autoKO.final.player1) : ''}" readonly
              class="flex-1 border rounded px-3 py-2 bg-gray-50" placeholder="Semi-Final 1 Winner" />
            <input type="number" min="0" value="${escapeHtml(ko.final.score1)}"
              onchange="updateKnockout(${currentGame}, 'final', 'score1', this.value)"
              class="w-20 border rounded px-3 py-2 text-center" />
          </div>
          <div class="flex items-center gap-2">
            <input type="text" value="${semi2HasScore ? escapeHtml(autoKO.final.player2) : ''}" readonly
              class="flex-1 border rounded px-3 py-2 bg-gray-50" placeholder="Semi-Final 2 Winner" />
            <input type="number" min="0" value="${escapeHtml(ko.final.score2)}"
              onchange="updateKnockout(${currentGame}, 'final', 'score2', this.value)"
              class="w-20 border rounded px-3 py-2 text-center" />
          </div>
        </div>
      </div>
    </div>
  `;

  // Overall standings
  const overallStandings = calculateOverallStandings();
  html += `
    <div class="mt-8 p-4 bg-white rounded-lg shadow">
      <h2 class="text-2xl font-bold mb-4 text-center">Game Winner</h2>
  `;

  if (overallStandings.length > 0) {
    html += `
      <p class="text-4xl font-bold text-center">${escapeHtml(overallStandings[0].player)}</p>
    `;
  } else {
    html += '<p class="text-gray-500 text-center">No finals completed yet</p>';
  }

  html += '</div>';
  return html;
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = showPrintView ? renderPrintView() : renderMainView();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
