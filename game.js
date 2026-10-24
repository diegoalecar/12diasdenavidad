(() => {
  "use strict";
  const TOTAL = 12;
  const PILES = 4;
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

  let placed = new Set();
  let piles = [];
  let drag = null;
  let gameFinished = false;
  const pad = n => String(n).padStart(2, "0");

  function shuffle(list) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function buildBoard() {
    envelopesEl.innerHTML = "";
    for (let n = 1; n <= TOTAL; n++) {
      const slot = document.createElement("div");
      slot.className = "envelope-slot";
      slot.dataset.number = String(n);
      slot.setAttribute("role", "group");
      slot.setAttribute("aria-label", `Sobre ${pad(n)}`);
      slot.innerHTML = `<img class="envelope-art" src="sobre-${pad(n)}.png" alt="Sobre ${pad(n)}">`;
      envelopesEl.appendChild(slot);
    }
  }

  function buildDeck() {
    deckEl.innerHTML = "";
    const shuffled = shuffle(Array.from({ length: TOTAL }, (_, i) => i + 1));
    piles = Array.from({ length: PILES }, () => []);
    shuffled.forEach((number, index) => piles[index % PILES].push(number));

    piles.forEach((pile, pileIndex) => {
      const pileEl = document.createElement("div");
      pileEl.className = "deck-pile";
      pileEl.dataset.pile = String(pileIndex);
      pileEl.setAttribute("aria-label", `Pila de postales ${pileIndex + 1}`);
      deckEl.appendChild(pileEl);
      renderPile(pileIndex);
    });
    syncDeck();
  }

  function renderPile(pileIndex) {
    const pileEl = deckEl.querySelector(`.deck-pile[data-pile="${pileIndex}"]`);
    if (!pileEl) return;
    pileEl.innerHTML = "";
    const pile = piles[pileIndex];
    pile.forEach((number, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "postcard";
      card.dataset.number = String(number);
      card.dataset.pile = String(pileIndex);
      card.dataset.stackIndex = String(index);
      card.style.setProperty("--stack-y", `${index * 25}px`);
      card.style.top = `${index * 25}px`;
      card.style.zIndex = String(index + 1);
      card.setAttribute("aria-label", `Arrastrar postal ${pad(number)} al sobre ${pad(number)}`);
      card.innerHTML = `<img src="postal-${pad(number)}.png" alt="Postal ${pad(number)}" draggable="false">`;
      card.addEventListener("pointerdown", startDrag);
      // Teclado y accesibilidad: al enfocar una carta, se puede elegir y luego activar su sobre con Enter.
      card.addEventListener("click", () => {
        if (!drag && !gameFinished) feedback.textContent = `Postal ${pad(number)}: arrástrala hasta el sobre ${pad(number)}.`;
      });
      pileEl.appendChild(card);
    });
  }

  function startDrag(event) {
    if (gameFinished || event.button !== 0) return;
    const card = event.currentTarget;
    const number = Number(card.dataset.number);
    if (placed.has(number)) return;
    event.preventDefault();

    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add("drag-ghost");
    ghost.classList.remove("selected");
    ghost.style.left = `${rect.left + rect.width / 2}px`;
    ghost.style.top = `${rect.top + rect.height / 2}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.top = `${event.clientY}px`;
    ghost.style.left = `${event.clientX}px`;
    document.body.appendChild(ghost);
    card.classList.add("selected");
    document.querySelectorAll(".envelope-slot").forEach(slot => slot.classList.add("target"));
    drag = { number, card, ghost, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
    feedback.textContent = `Postal ${pad(number)} seleccionada. Suéltala sobre el sobre ${pad(number)}.`;
    window.addEventListener("pointermove", moveDrag, { passive: false });
    window.addEventListener("pointerup", endDrag, { once: true });
    window.addEventListener("pointercancel", cancelDrag, { once: true });
  }

  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    drag.ghost.style.left = `${event.clientX}px`;
    drag.ghost.style.top = `${event.clientY}px`;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".envelope-slot");
    document.querySelectorAll(".envelope-slot").forEach(slot => slot.classList.toggle("drop-target", slot === target));
  }

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".envelope-slot");
    const number = drag.number;
    const card = drag.card;
    cleanupDrag();
    if (!target) {
      feedback.textContent = "Suelta la postal sobre el sobre que tenga el mismo número.";
      return;
    }
    const targetNumber = Number(target.dataset.number);
    if (targetNumber !== number) {
      feedback.textContent = `Ese es el sobre ${pad(targetNumber)}. Busca el sobre ${pad(number)}.`;
      target.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }],
        { duration: 240 }
      );
      return;
    }
    placeCard(number, target, card);
  }

  function cancelDrag() {
    if (!drag) return;
    cleanupDrag();
    feedback.textContent = "Inténtalo de nuevo: arrastra la postal hasta su sobre.";
  }

  function cleanupDrag() {
    if (!drag) return;
    drag.ghost.remove();
    drag.card.classList.remove("selected");
    document.querySelectorAll(".envelope-slot").forEach(slot => slot.classList.remove("target", "drop-target"));
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", cancelDrag);
    drag = null;
  }

  function placeCard(number, slot, card) {
    if (placed.has(number)) return;
    placed.add(number);
    const placedImg = document.createElement("img");
    placedImg.className = "postcard-placed";
    placedImg.src = `postal-${pad(number)}.png`;
    placedImg.alt = `Postal ${pad(number)} colocada`;
    slot.appendChild(placedImg);
    slot.classList.add("correct");

    const pileIndex = Number(card.dataset.pile);
    piles[pileIndex] = piles[pileIndex].filter(n => n !== number);
    renderPile(pileIndex);
    syncDeck();
    progressLabel.textContent = `${placed.size} de ${TOTAL} postales`;
    progressFill.style.width = `${placed.size / TOTAL * 100}%`;
    feedback.textContent = placed.size === TOTAL
      ? "¡Colección completa! Feliz Navidad de parte de Da-Gas."
      : `¡Muy bien! La postal ${pad(number)} ya está en su sobre.`;
    if (placed.size === TOTAL) finishGame();
  }

  function syncDeck() {
    const remaining = TOTAL - placed.size;
    deckCount.textContent = `${remaining} ${remaining === 1 ? "disponible" : "disponibles"}`;
  }

  function finishGame() {
    gameFinished = true;
    document.querySelectorAll(".envelope-slot").forEach((slot, index) => {
      setTimeout(() => {
        slot.animate(
          [{ filter: "brightness(1)" }, { filter: "brightness(1.55) drop-shadow(0 0 10px #ffdf81)" }, { filter: "brightness(1.15)" }],
          { duration: 650 }
        );
      }, index * 90);
    });
    winScreen.hidden = false;
    audio.currentTime = 0;
    audio.play().catch(() => {
      feedback.textContent = "¡Colección completa! No se pudo reproducir la canción. Revisa que cancion-navidad.mp3 esté en la raíz del repositorio.";
    });
  }

  function resetGame() {
    if (drag) cleanupDrag();
    placed = new Set();
    gameFinished = false;
    winScreen.hidden = true;
    audio.pause();
    audio.currentTime = 0;
    progressLabel.textContent = `0 de ${TOTAL} postales`;
    progressFill.style.width = "0%";
    feedback.textContent = "Busca una postal en el mazo y arrástrala hasta el sobre con el mismo número.";
    buildBoard();
    buildDeck();
  }

  restart.addEventListener("click", resetGame);
  playAgain.addEventListener("click", resetGame);
  buildBoard();
  buildDeck();
})();
