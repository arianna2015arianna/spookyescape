// Minimal but extendable game engine for Spooky Escape
(() => {
  // Simple sound feedback using WebAudio (no external assets)
  const audioContext = window.AudioContext ? new AudioContext() : null;
  function beep(freq = 440, time = 0.08, gain = 0.02) {
    if (!audioContext || window.__SPOOKY_MUTED) return;
    const o = audioContext.createOscillator();
    const g = audioContext.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(audioContext.destination);
    o.start();
    o.stop(audioContext.currentTime + time);
  }

  // Rooms & items definition (expandable)
  const rooms = {
    foyer: {
      title: "Foyer",
      desc: "A dusty foyer. A flickering chandelier throws shadows.\nExits: north to the Hall.",
      exits: { north: "hall" },
      items: [{ id: "note", name: "Torn Note", desc: "A note with scribbled letters: 'KEY hides...'", portable: true }]
    },
    hall: {
      title: "Grand Hall",
      desc: "The grand hall stretches into darkness. Portraits seem to watch you.\nExits: south to Foyer, east to Library, down to Cellar.",
      exits: { south: "foyer", east: "library", down: "cellar" },
      items: [{ id: "candle", name: "Half-burnt Candle", desc: "It might help you see.", portable: true }]
    },
    library: {
      title: "Library",
      desc: "Shelves of old books. A locked cabinet sits in the corner.",
      exits: { west: "hall" },
      items: [{ id: "key", name: "Rusty Key", desc: "Old but sturdy. Might open a lock.", portable: true }]
    },
    cellar: {
      title: "Cellar",
      desc: "Cold air and the smell of damp earth. A heavy chest is chained shut.",
      exits: { up: "hall" },
      items: [{ id: "chest", name: "Chained Chest", desc: "A heavy chest with a padlock. Use a key?", portable: false }]
    }
  };

  // Game state
  let state = {
    room: "foyer",
    inventory: []
  };

  // DOM references
  const roomTitle = document.getElementById("room-title");
  const roomDesc = document.getElementById("room-desc");
  const exitsEl = document.getElementById("exits");
  const itemsEl = document.getElementById("items");
  const inventoryEl = document.getElementById("inventory");
  const saveBtn = document.getElementById("saveBtn");
  const loadBtn = document.getElementById("loadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const muteBtn = document.getElementById("muteBtn");
  const lookBtn = document.getElementById("lookBtn");
  const takeBtn = document.getElementById("takeBtn");
  const useBtn = document.getElementById("useBtn");

  function getRoom() { return rooms[state.room]; }
  function render() {
    const r = getRoom();
    roomTitle.textContent = r.title;
    typeText(roomDesc, r.desc);
    // Exits
    exitsEl.innerHTML = "";
    for (const dir in r.exits) {
      const btn = document.createElement("button");
      btn.textContent = `${dir.toUpperCase()} → ${rooms[r.exits[dir]].title}`;
      btn.onclick = () => { moveTo(r.exits[dir]); };
      exitsEl.appendChild(btn);
    }
    // Items
    itemsEl.innerHTML = "";
    r.items.forEach((it) => {
      const btn = document.createElement("button");
      btn.innerHTML = `<strong>${it.name}</strong><div class="muted">${it.portable ? "Pick up" : "Inspect"}</div>`;
      btn.onclick = () => { inspectItem(it); };
      itemsEl.appendChild(btn);
    });
    renderInventory();
  }

  // Typewriter-ish text for atmosphere
  let typingTimeout = null;
  function typeText(el, text) {
    if (typingTimeout) { clearTimeout(typingTimeout); typingTimeout = null; }
    el.textContent = "";
    let i = 0;
    function step() {
      el.textContent = text.slice(0, i);
      i++;
      if (i <= text.length) {
        typingTimeout = setTimeout(step, 12 + (Math.random() * 18));
      }
    }
    step();
  }

  function moveTo(roomId) {
    state.room = roomId;
    beep(600, 0.05, 0.02);
    render();
  }

  function findItemInRoom(itemId) {
    const r = getRoom();
    return r.items.find(x => x.id === itemId);
  }

  function removeItemFromRoom(itemId) {
    const r = getRoom();
    r.items = r.items.filter(x => x.id !== itemId);
  }

  function renderInventory() {
    inventoryEl.innerHTML = "";
    if (!state.inventory.length) {
      const li = document.createElement("li");
      li.textContent = "(empty)";
      li.style.opacity = 0.6;
      inventoryEl.appendChild(li);
      return;
    }
    state.inventory.forEach(it => {
      const li = document.createElement("li");
      li.textContent = it.name;
      const use = document.createElement("button");
      use.textContent = "Use";
      use.onclick = () => useItem(it.id);
      li.appendChild(use);
      inventoryEl.appendChild(li);
    });
  }

  function inspectItem(item) {
    // If portable allow pick up; otherwise show description
    if (item.portable) {
      const take = confirm(`Take ${item.name}?`);
      if (take) {
        state.inventory.push(item);
        removeItemFromRoom(item.id);
        beep(880, 0.06, 0.03);
        render();
      }
    } else {
      alert(item.desc);
      beep(220, 0.12, 0.02);
      // special interaction: if chest and player has key, offer to unlock
      if (item.id === "chest") {
        const hasKey = state.inventory.some(i => i.id === "key");
        if (hasKey) {
          const open = confirm("Use Rusty Key to unlock the chest?");
          if (open) {
            state.inventory = state.inventory.filter(i => i.id !== "key");
            // reveal treasure (example)
            getRoom().items.push({ id: "treasure", name: "Ancient Locket", desc: "A locket containing a faded portrait.", portable: true });
            alert("You unlocked the chest and found an Ancient Locket!");
            beep(1320, 0.12, 0.05);
            render();
          }
        } else {
          alert("The chest is locked. A key is needed.");
        }
      }
    }
  }

  function useItem(itemId) {
    const it = state.inventory.find(i => i.id === itemId);
    if (!it) return;
    // Use cases by id
    if (it.id === "candle") {
      alert("You light the candle. The room seems less spooky.");
      beep(660, 0.08, 0.02);
    } else if (it.id === "note") {
      alert("The torn note reads: 'KEY hides in... library?'");
      beep(740, 0.05, 0.02);
    } else {
      alert(`You examine the ${it.name}. ${it.desc}`);
    }
  }

  function takeFirstPortable() {
    const r = getRoom();
    const p = r.items.find(i => i.portable);
    if (p) {
      state.inventory.push(p);
      removeItemFromRoom(p.id);
      beep(880, 0.06, 0.03);
      render();
    } else {
      alert("Nothing portable here.");
    }
  }

  function lookAround() {
    const r = getRoom();
    alert(r.desc);
    beep(440, 0.06, 0.01);
  }

  // Save & Load
  const SAVE_KEY = "spooky_escape_save_v1";
  function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    alert("Game saved.");
  }
  function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        state = JSON.parse(raw);
        beep(520, 0.06, 0.02);
        render();
      } catch (e) {
        alert("Failed to load save.");
      }
    } else {
      alert("No save found.");
    }
  }
  function resetGame() {
    if (!confirm("Reset game to initial state?")) return;
    // Reset rooms/items by reloading a clean copy (simple approach)
    location.reload();
  }

  // Input handlers
  document.addEventListener("keydown", (e) => {
    const map = { ArrowUp: "north", ArrowDown: "south", ArrowLeft: "west", ArrowRight: "east" };
    if (map[e.key]) {
      // if exit available in that direction, move
      const r = getRoom();
      if (r.exits[map[e.key]]) moveTo(r.exits[map[e.key]]);
    } else if (e.key === "l") lookAround();
    else if (e.key === "t") takeFirstPortable();
  });

  // On-screen control buttons
  document.querySelectorAll(".touch-controls button").forEach(b => {
    b.addEventListener("click", () => {
      const dir = b.dataset.dir;
      const r = getRoom();
      if (r.exits[dir]) moveTo(r.exits[dir]);
      else alert("No exit that way.");
    });
  });

  // Button wiring
  saveBtn.addEventListener("click", saveGame);
  loadBtn.addEventListener("click", loadGame);
  resetBtn.addEventListener("click", resetGame);
  lookBtn.addEventListener("click", lookAround);
  takeBtn.addEventListener("click", takeFirstPortable);
  useBtn.addEventListener("click", () => {
    if (!state.inventory.length) { alert("No items to use."); return; }
    // use first for quick demo
    useItem(state.inventory[0].id);
    render();
  });

  muteBtn.addEventListener("click", () => {
    window.__SPOOKY_MUTED = !window.__SPOOKY_MUTED;
    muteBtn.textContent = window.__SPOOKY_MUTED ? "Unmute" : "Mute";
  });

  // Inspect item by clicking: we added these handlers via render
  function inspectItemById(id) {
    const it = findItemInRoom(id);
    if (it) inspectItem(it);
  }

  // Initialization hook
  function init() {
    // Load saved state automatically if present
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      if (confirm("Load previous saved game?")) {
        loadGame();
        return;
      }
    }
    render();
  }

  // Expose for console debugging
  window.__spooky = { state, rooms, render };

  init();
})();
