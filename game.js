(() => {
  "use strict";

  const TOTAL = 12;
  const envelopesEl = document.querySelector("#envelopes");
  const deckEl = document.querySelector("#deck");
  const deckCount = document.querySelector("#deck-count");
  const feedback = document.querySelector("#feedback");
  const restart = document.querySelector("#restart");
  const winScreen = document.querySelector("#win-screen");
  const playAgain = document.querySelector("#play-again");
  const audio = document.querySelector("#victory-audio");
  const progressLabel = document.querySelector("#progress-label");
  const progressFill = document.querySelector("#progress-fill");

  let placed = new Set();
  let deck = [];
  let drag = null;
  let gameFinished = false;
  const pad = n => String(n).padStart(2, "0");

  function setFeedback(message) {
    if (feedback) feedback.textContent = message;
  }

  function shuffle(list) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function buildBoard() {
    if (!envelopesEl) return;
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
    if (!deckEl) return;
    deckEl.innerHTML = "";
    deck = shuffle(Array.from({ length: TOTAL }, (_, i) => i + 1));

    const pileEl = document.createElement("div");
    pileEl.className = "deck-pile";
    pileEl.setAttribute("aria-label", "Baraja única de postales mezcladas");
    deckEl.appendChild(pileEl);
    renderDeck();
    syncDeck();
  }

  function renderDeck() {
    const pileEl = deckEl?.querySelector(".deck-pile");
    if (!pileEl) return;
    pileEl.innerHTML = "";

    deck.forEach((number, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "postcard";
      card.dataset.number = String(number);
      card.dataset.stackIndex = String(index);

      // Desplazamiento diagonal pequeño: se reconoce la carta superior y quedan
      // bordes visibles de las inferiores para poder tomar cualquiera de ellas.
      card.style.setProperty("--stack-x", `${index * 1.5}px`);
      card.style.setProperty("--stack-y", `${index * 2.5}px`);
      card.style.zIndex = String(index + 1);
      card.setAttribute("aria-label", `Arrastrar postal ${pad(number)} al sobre ${pad(number)}`);
      card.innerHTML = `<img src="postal-${pad(number)}.png" alt="Postal ${pad(number)}" draggable="false">`;
      card.addEventListener("pointerdown", startDrag);
      card.addEventListener("click", () => {
        if (!drag && !gameFinished) setFeedback(`Postal ${pad(number)}: arrástrala hasta el sobre ${pad(number)}.`);
      });
      pileEl.appendChild(card);
    });
  }

  function startDrag(event) {
    if (gameFinished || event.button !== 0 || drag) return;
    const card = event.currentTarget;
    const number = Number(card.dataset.number);
    if (placed.has(number)) return;
    event.preventDefault();

    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add("drag-ghost");
    ghost.classList.remove("selected");
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
    ghost.style.width = `${rect.width}px`;
    document.body.appendChild(ghost);

    card.classList.add("selected");
    document.querySelectorAll(".envelope-slot").forEach(slot => slot.classList.add("target"));
    drag = { number, card, ghost, pointerId: event.pointerId };
    setFeedback(`Postal ${pad(number)} seleccionada. Suéltala sobre el sobre ${pad(number)}.`);
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
    cleanupDrag();

    if (!target) {
      setFeedback("Suelta la postal sobre el sobre que tenga el mismo número.");
      return;
    }

    const targetNumber = Number(target.dataset.number);
    if (targetNumber !== number) {
      setFeedback(`Ese es el sobre ${pad(targetNumber)}. Busca el sobre ${pad(number)}.`);
      target.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }],
        { duration: 240 }
      );
      return;
    }

    placeCard(number, target);
  }

  function cancelDrag() {
    if (!drag) return;
    cleanupDrag();
    setFeedback("Inténtalo de nuevo: arrastra la postal hasta su sobre.");
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

  function placeCard(number, slot) {
    if (placed.has(number)) return;
    placed.add(number);

    const placedImg = document.createElement("img");
    placedImg.className = "postcard-placed";
    placedImg.src = `postal-${pad(number)}.png`;
    placedImg.alt = `Postal ${pad(number)} colocada`;
    slot.appendChild(placedImg);
    slot.classList.add("correct");

    deck = deck.filter(n => n !== number);
    renderDeck();
    syncDeck();

    if (progressLabel) progressLabel.textContent = `${placed.size} de ${TOTAL} postales`;
    if (progressFill) progressFill.style.width = `${placed.size / TOTAL * 100}%`;
    setFeedback(placed.size === TOTAL
      ? "¡Colección completa! Feliz Navidad de parte de Da-Gas."
      : `¡Muy bien! La postal ${pad(number)} ya está en su sobre.`);

    if (placed.size === TOTAL) finishGame();
  }

  function syncDeck() {
    const remaining = TOTAL - placed.size;
    if (deckCount) deckCount.textContent = `${remaining} ${remaining === 1 ? "disponible" : "disponibles"}`;
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
    if (winScreen) winScreen.hidden = false;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        setFeedback("¡Colección completa! No se pudo reproducir la canción. Revisa que cancion-navidad.mp3 esté en la raíz del repositorio.");
      });
    }
  }

  function resetGame() {
    if (drag) cleanupDrag();
    placed = new Set();
    gameFinished = false;
    if (winScreen) winScreen.hidden = true;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (progressLabel) progressLabel.textContent = `0 de ${TOTAL} postales`;
    if (progressFill) progressFill.style.width = "0%";
    setFeedback("Busca una postal en la baraja y arrástrala hasta el sobre con el mismo número.");
    buildBoard();
    buildDeck();
  }

  restart?.addEventListener("click", resetGame);
  playAgain?.addEventListener("click", resetGame);
  buildBoard();
  buildDeck();
})();
