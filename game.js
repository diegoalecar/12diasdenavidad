(() => {
  const TOTAL = 12;
  const envelopesEl = document.querySelector("#envelopes");
  const deckEl = document.querySelector("#deck");
  const progressLabel = document.querySelector("#progress-label");
  const progressFill = document.querySelector("#progress-fill");
  const deckCount = document.querySelector("#deck-count");
  const feedback = document.querySelector("#feedback");
  const restart = document.querySelector("#restart");
  const winScreen = document.querySelector("#win-screen");
  const playAgain = document.querySelector("#play-again");
  const audio = document.querySelector("#victory-audio");

  let selected = null;
  let placed = new Set();
  let order = [];

  const pad = n => String(n).padStart(2, "0");
  const shuffle = list => {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  function buildBoard() {
    envelopesEl.innerHTML = "";
    for (let n = 1; n <= TOTAL; n++) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "envelope-slot";
      slot.dataset.number = n;
      slot.setAttribute("aria-label", `Sobre ${pad(n)}`);
      slot.innerHTML = `<img class="envelope-art" src="sobre-${pad(n)}.png" alt="">`;
      slot.addEventListener("click", () => placeSelected(n, slot));
      envelopesEl.appendChild(slot);
    }
  }

  function buildDeck() {
    deckEl.innerHTML = "";
    order = shuffle(Array.from({ length: TOTAL }, (_, i) => i + 1));
    order.forEach(n => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "postcard";
      card.dataset.number = n;
      card.setAttribute("aria-label", `Postal ${pad(n)}${placed.has(n) ? ", colocada" : ""}`);
      card.innerHTML = `<img src="postal-${pad(n)}.png" alt="Postal ${pad(n)}">`;
      card.addEventListener("click", () => selectCard(n, card));
      deckEl.appendChild(card);
    });
    syncDeck();
  }

  function selectCard(n, card) {
    if (placed.has(n)) return;
    selected = n;
    document.querySelectorAll(".postcard").forEach(el => el.classList.toggle("selected", Number(el.dataset.number) === n));
    document.querySelectorAll(".envelope-slot").forEach(el => el.classList.add("target"));
    feedback.textContent = `Postal ${pad(n)} seleccionada. Elige el sobre ${pad(n)}.`;
  }

  function placeSelected(n, slot) {
    if (placed.has(n)) return;
    if (selected === null) {
      feedback.textContent = "Primero selecciona una postal de la baraja.";
      slot.animate([{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }], { duration: 220 });
      return;
    }
    if (selected !== n) {
      feedback.textContent = "Ese no es su sobre. ¡Prueba con otro número!";
      slot.animate([{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: 260 });
      return;
    }

    const cardNum = selected;
    placed.add(cardNum);
    const placedImg = document.createElement("img");
    placedImg.className = "postcard-placed";
    placedImg.src = `postal-${pad(cardNum)}.png`;
    placedImg.alt = `Postal ${pad(cardNum)} colocada`;
    slot.appendChild(placedImg);
    slot.classList.add("correct");
    const cardButton = document.querySelector(`.postcard[data-number="${cardNum}"]`);
    if (cardButton) {
      cardButton.classList.remove("selected");
      cardButton.classList.add("used");
      cardButton.disabled = true;
    }
    selected = null;
    document.querySelectorAll(".envelope-slot").forEach(el => el.classList.remove("target"));
    syncDeck();
    progressLabel.textContent = `${placed.size} de ${TOTAL} postales`;
    progressFill.style.width = `${placed.size / TOTAL * 100}%`;
    feedback.textContent = placed.size === TOTAL ? "¡Colección completa!" : `¡Muy bien! La postal ${pad(cardNum)} está en su lugar.`;
    if (placed.size === TOTAL) finishGame();
  }

  function syncDeck() {
    const remaining = TOTAL - placed.size;
    deckCount.textContent = `${remaining} ${remaining === 1 ? "disponible" : "disponibles"}`;
  }

  function finishGame() {
    document.querySelectorAll(".envelope-slot").forEach((slot, i) => {
      setTimeout(() => {
        slot.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.55) drop-shadow(0 0 10px #ffdf81)" }, { filter: "brightness(1.15)" }], { duration: 650 });
      }, i * 90);
    });
    winScreen.hidden = false;
    // El navegador permite reproducir audio tras la interacción del usuario con el juego.
    audio.currentTime = 0;
    audio.play().catch(() => {
      feedback.textContent = "¡Colección completa! Toca la pantalla si deseas intentar reproducir la canción.";
    });
  }

  function resetGame() {
    selected = null;
    placed = new Set();
    winScreen.hidden = true;
    audio.pause();
    audio.currentTime = 0;
    progressLabel.textContent = `0 de ${TOTAL} postales`;
    progressFill.style.width = "0%";
    feedback.textContent = "Toca una postal para comenzar.";
    buildBoard();
    buildDeck();
  }

  restart.addEventListener("click", resetGame);
  playAgain.addEventListener("click", resetGame);
  buildBoard();
  buildDeck();
})();