(function () {
  "use strict";

  const friends = [
    { name: "Daniel", image: "imagens/Daniel.png", ratio: 547 / 811 },
    { name: "Henrique", image: "imagens/Henrique.png", ratio: 580 / 592 },
    { name: "Luis", image: "imagens/Luis.png", ratio: 454 / 770 },
    { name: "TH", image: "imagens/TH.png", ratio: 362 / 359 }
  ];

  const screens = {
    home: document.getElementById("homeScreen"),
    friends: document.getElementById("friendScreen"),
    difficulty: document.getElementById("difficultyScreen"),
    game: document.getElementById("gameScreen")
  };

  const stepDots = Array.from(document.querySelectorAll(".step-dot"));
  const friendGrid = document.getElementById("friendGrid");
  const puzzleBoard = document.getElementById("puzzleBoard");
  const winModal = document.getElementById("winModal");
  const toast = document.getElementById("toast");

  const state = {
    screen: "home",
    friend: null,
    size: 3,
    pieces: [],
    selectedIndex: null,
    dragIndex: null,
    moves: 0,
    seconds: 0,
    timerId: null,
    playing: false
  };

  function setScreen(name) {
    Object.entries(screens).forEach(([key, screen]) => {
      const isActive = key === name;
      screen.hidden = !isActive;
      screen.classList.toggle("active", isActive);
    });

    state.screen = name;
    const step = name === "home" ? 0 : name === "friends" ? 1 : name === "difficulty" ? 2 : 3;
    stepDots.forEach((dot, index) => dot.classList.toggle("active", index === step));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderFriends() {
    friendGrid.innerHTML = "";

    friends.forEach((friend, index) => {
      const card = document.createElement("button");
      card.className = "friend-card";
      card.type = "button";
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", `Escolher a foto de ${friend.name}`);
      card.innerHTML = `
        <span class="friend-photo">
          <img src="${friend.image}" alt="Retrato de ${friend.name}">
          <span class="friend-number">${String(index + 1).padStart(2, "0")}</span>
          <span class="select-mark" aria-hidden="true">→</span>
        </span>
        <span class="friend-info">
          <strong>${friend.name}</strong>
          <small>Retrato ${String(index + 1).padStart(2, "0")}</small>
        </span>
      `;
      card.addEventListener("click", () => chooseFriend(friend));
      friendGrid.appendChild(card);
    });
  }

  function chooseFriend(friend) {
    state.friend = friend;
    document.getElementById("difficultyPreview").src = friend.image;
    document.getElementById("difficultyPreview").alt = `Foto de ${friend.name}`;
    document.getElementById("difficultyFriendName").textContent = friend.name;
    setScreen("difficulty");
  }

  function shufflePieces(total) {
    const solved = Array.from({ length: total }, (_, index) => index);
    let shuffled;

    do {
      shuffled = [...solved];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
      }
    } while (shuffled.every((piece, index) => piece === index));

    return shuffled;
  }

  function startGame(size) {
    state.size = Number(size);
    state.pieces = shufflePieces(state.size * state.size);
    state.selectedIndex = null;
    state.moves = 0;
    state.seconds = 0;
    state.playing = true;

    clearInterval(state.timerId);
    updateStats();

    document.getElementById("gameFriendName").textContent = state.friend.name;
    document.getElementById("gridStat").textContent = `${state.size}×${state.size}`;
    document.getElementById("boardPieceCount").textContent = `${state.size}×${state.size} · ${state.size * state.size} peças`;
    document.getElementById("boardFigure").textContent = `Fig. — ${state.friend.name}`;
    puzzleBoard.style.setProperty("--grid-size", state.size);
    puzzleBoard.style.setProperty("--image-ratio", state.friend.ratio);

    setScreen("game");
    renderBoard();
    state.timerId = setInterval(() => {
      if (!state.playing) return;
      state.seconds += 1;
      document.getElementById("timer").textContent = formatTime(state.seconds);
    }, 1000);
  }

  function renderBoard() {
    puzzleBoard.innerHTML = "";

    state.pieces.forEach((correctIndex, boardIndex) => {
      const row = Math.floor(correctIndex / state.size);
      const column = correctIndex % state.size;
      const piece = document.createElement("button");

      piece.type = "button";
      piece.className = "puzzle-piece";
      piece.draggable = true;
      piece.dataset.index = boardIndex;
      piece.setAttribute("aria-label", `Peça ${boardIndex + 1} de ${state.pieces.length}`);
      piece.style.backgroundImage = `url("${state.friend.image}")`;
      piece.style.backgroundSize = `${state.size * 100}% ${state.size * 100}%`;
      piece.style.backgroundPosition = `${state.size === 1 ? 0 : (column / (state.size - 1)) * 100}% ${state.size === 1 ? 0 : (row / (state.size - 1)) * 100}%`;

      if (state.selectedIndex === boardIndex) piece.classList.add("selected");

      piece.addEventListener("click", () => handlePieceClick(boardIndex));
      piece.addEventListener("dragstart", (event) => handleDragStart(event, boardIndex));
      piece.addEventListener("dragover", handleDragOver);
      piece.addEventListener("dragleave", handleDragLeave);
      piece.addEventListener("drop", (event) => handleDrop(event, boardIndex));
      piece.addEventListener("dragend", handleDragEnd);
      puzzleBoard.appendChild(piece);
    });
  }

  function handlePieceClick(index) {
    if (!state.playing) return;

    if (state.selectedIndex === null) {
      state.selectedIndex = index;
      renderBoard();
      return;
    }

    if (state.selectedIndex === index) {
      state.selectedIndex = null;
      renderBoard();
      return;
    }

    swapPieces(state.selectedIndex, index);
  }

  function swapPieces(firstIndex, secondIndex) {
    [state.pieces[firstIndex], state.pieces[secondIndex]] = [state.pieces[secondIndex], state.pieces[firstIndex]];
    state.selectedIndex = null;
    state.moves += 1;
    updateStats();
    renderBoard();

    if (isSolved()) finishGame();
  }

  function handleDragStart(event, index) {
    if (!state.playing) return;
    state.dragIndex = index;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    const invisiblePreview = document.createElement("canvas");
    invisiblePreview.width = 1;
    invisiblePreview.height = 1;
    event.dataTransfer.setDragImage(invisiblePreview, 0, 0);
    requestAnimationFrame(() => event.currentTarget.classList.add("dragging"));
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    event.currentTarget.classList.add("drop-target");
  }

  function handleDragLeave(event) {
    event.currentTarget.classList.remove("drop-target");
  }

  function handleDrop(event, targetIndex) {
    event.preventDefault();
    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
    clearDragStyles();
    if (Number.isInteger(sourceIndex) && sourceIndex !== targetIndex) swapPieces(sourceIndex, targetIndex);
  }

  function handleDragEnd() {
    clearDragStyles();
    state.dragIndex = null;
  }

  function clearDragStyles() {
    document.querySelectorAll(".puzzle-piece").forEach((piece) => {
      piece.classList.remove("dragging", "drop-target");
    });
  }

  function isSolved() {
    return state.pieces.every((piece, index) => piece === index);
  }

  function updateStats() {
    document.getElementById("moveCount").textContent = String(state.moves).padStart(3, "0");
    document.getElementById("timer").textContent = formatTime(state.seconds);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainder = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  function finishGame() {
    state.playing = false;
    clearInterval(state.timerId);
    document.getElementById("finalMoves").textContent = state.moves;
    document.getElementById("finalTime").textContent = formatTime(state.seconds);
    document.getElementById("winMessage").textContent = `O retrato de ${state.friend.name} ficou inteiro de novo. Essa amizade sobreviveu ao ${state.size}×${state.size}.`;
    document.getElementById("winPortrait").src = state.friend.image;
    document.getElementById("winPortrait").alt = `Retrato completo de ${state.friend.name}`;
    setTimeout(() => {
      winModal.hidden = false;
      document.getElementById("playAgainButton").focus();
    }, 350);
  }

  function closeWinModal() {
    winModal.hidden = true;
  }

  function confirmRestart() {
    if (state.moves > 0) showToast("Tabuleiro embaralhado de novo!");
    startGame(state.size);
  }

  let toastTimeout;
  function showToast(message) {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 2100);
  }

  document.getElementById("startButton").addEventListener("click", () => setScreen("friends"));
  document.getElementById("brandButton").addEventListener("click", () => {
    state.playing = false;
    clearInterval(state.timerId);
    closeWinModal();
    setScreen("home");
  });

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
      state.playing = false;
      clearInterval(state.timerId);
      setScreen(button.dataset.back);
    });
  });

  document.querySelectorAll("[data-size]").forEach((button) => {
    button.addEventListener("click", () => startGame(button.dataset.size));
  });

  document.getElementById("restartButton").addEventListener("click", confirmRestart);
  document.getElementById("changeFriendButton").addEventListener("click", () => {
    state.playing = false;
    clearInterval(state.timerId);
    setScreen("friends");
  });

  document.getElementById("playAgainButton").addEventListener("click", () => {
    closeWinModal();
    startGame(state.size);
  });

  document.getElementById("chooseAnotherButton").addEventListener("click", () => {
    closeWinModal();
    setScreen("friends");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !winModal.hidden) closeWinModal();
  });

  renderFriends();
  setScreen("home");
}());
