// Démineur : logique de jeu + rendu du plateau.
(() => {
    const LEVELS = {
        facile: { rows: 9, cols: 9, mines: 10 },
        moyen: { rows: 16, cols: 16, mines: 40 },
        expert: { rows: 16, cols: 30, mines: 99 },
    };
    const LONG_PRESS_MS = 400;

    const boardEl = document.getElementById('board');
    const minesLeftEl = document.getElementById('mines-left');
    const timerEl = document.getElementById('timer');
    const statusEl = document.getElementById('status');
    const restartBtn = document.getElementById('restart');
    const levelInputs = document.querySelectorAll('input[name="level"]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let level, cells, state, flags, revealedCount, timerId, startedAt, focusIndex;

    const index = (r, c) => r * level.cols + c;

    function neighbours(i) {
        const r = Math.floor(i / level.cols);
        const c = i % level.cols;
        const result = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < level.rows && nc >= 0 && nc < level.cols) result.push(index(nr, nc));
            }
        }
        return result;
    }

    // Les mines sont posées au premier clic, jamais sur la case cliquée ni autour.
    function placeMines(safeIndex) {
        const forbidden = new Set([safeIndex, ...neighbours(safeIndex)]);
        const candidates = cells.map((_, i) => i).filter(i => !forbidden.has(i));
        for (let n = 0; n < level.mines; n++) {
            const pick = n + Math.floor(Math.random() * (candidates.length - n));
            [candidates[n], candidates[pick]] = [candidates[pick], candidates[n]];
            cells[candidates[n]].mine = true;
        }
        cells.forEach((cell, i) => {
            cell.adjacent = neighbours(i).filter(n => cells[n].mine).length;
        });
    }

    function newGame() {
        level = LEVELS[document.querySelector('input[name="level"]:checked').value];
        cells = Array.from({ length: level.rows * level.cols }, () => ({
            mine: false, adjacent: 0, revealed: false, flagged: false,
        }));
        state = 'ready';
        flags = 0;
        revealedCount = 0;
        focusIndex = 0;
        stopTimer();
        timerEl.textContent = '0';
        setStatus('Cliquez sur une case pour commencer. Clic droit ou appui long pour poser un drapeau.');
        document.body.dataset.state = state;
        render();
    }

    function render() {
        boardEl.dataset.level = document.querySelector('input[name="level"]:checked').value;
        boardEl.setAttribute('aria-rowcount', level.rows);
        boardEl.setAttribute('aria-colcount', level.cols);
        boardEl.replaceChildren();
        for (let r = 0; r < level.rows; r++) {
            const row = document.createElement('div');
            row.setAttribute('role', 'row');
            row.className = 'row';
            for (let c = 0; c < level.cols; c++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'cell';
                btn.dataset.index = index(r, c);
                btn.setAttribute('role', 'gridcell');
                btn.tabIndex = index(r, c) === focusIndex ? 0 : -1;
                row.appendChild(btn);
            }
            boardEl.appendChild(row);
        }
        updateCounters();
        cells.forEach((_, i) => paint(i));
    }

    function cellEl(i) {
        return boardEl.querySelector(`[data-index="${i}"]`);
    }

    function paint(i, delay = 0) {
        const cell = cells[i];
        const el = cellEl(i);
        el.className = 'cell';
        el.textContent = '';
        el.style.removeProperty('--delay');
        if (delay) el.style.setProperty('--delay', `${delay}ms`);
        if (cell.revealed) {
            el.classList.add('revealed');
            if (cell.mine) {
                el.classList.add('mine');
                el.textContent = '✸';
                el.setAttribute('aria-label', 'Mine');
            } else if (cell.adjacent) {
                el.dataset.n = cell.adjacent;
                el.textContent = cell.adjacent;
                el.setAttribute('aria-label', `${cell.adjacent} mine${cell.adjacent > 1 ? 's' : ''} autour`);
            } else {
                el.setAttribute('aria-label', 'Vide');
            }
        } else if (cell.flagged) {
            el.classList.add('flagged');
            el.setAttribute('aria-label', 'Drapeau');
        } else {
            el.setAttribute('aria-label', 'Case cachée');
        }
    }

    function reveal(start) {
        if (state === 'won' || state === 'lost') return;
        const cell = cells[start];
        if (cell.flagged) return;

        if (state === 'ready') {
            placeMines(start);
            state = 'playing';
            document.body.dataset.state = state;
            startTimer();
            setStatus('');
        }

        if (cell.revealed) {
            chord(start);
            return;
        }
        if (cell.mine) {
            lose(start);
            return;
        }

        // Propagation itérative depuis les cases vides.
        const stack = [start];
        while (stack.length) {
            const i = stack.pop();
            const current = cells[i];
            if (current.revealed || current.flagged) continue;
            current.revealed = true;
            revealedCount++;
            paint(i);
            if (current.adjacent === 0) stack.push(...neighbours(i));
        }

        if (revealedCount === cells.length - level.mines) win();
    }

    // Clic sur un chiffre déjà découvert : si les drapeaux autour correspondent, on découvre le reste.
    function chord(i) {
        const around = neighbours(i);
        const flagged = around.filter(n => cells[n].flagged).length;
        if (flagged !== cells[i].adjacent) return;
        around.filter(n => !cells[n].revealed && !cells[n].flagged).forEach(reveal);
    }

    function toggleFlag(i) {
        if (state === 'won' || state === 'lost') return;
        const cell = cells[i];
        if (cell.revealed) return;
        cell.flagged = !cell.flagged;
        flags += cell.flagged ? 1 : -1;
        paint(i);
        updateCounters();
    }

    function lose(hit) {
        state = 'lost';
        stopTimer();
        document.body.dataset.state = state;
        const mines = cells.map((c, i) => i).filter(i => cells[i].mine && i !== hit);
        cells[hit].revealed = true;
        paint(hit);
        cellEl(hit).classList.add('hit');
        const hitRow = Math.floor(hit / level.cols);
        const hitCol = hit % level.cols;
        mines.forEach(i => {
            cells[i].revealed = !cells[i].flagged;
            const distance = Math.hypot(Math.floor(i / level.cols) - hitRow, i % level.cols - hitCol);
            if (!cells[i].flagged) paint(i, reducedMotion ? 0 : Math.round(distance * 45));
        });
        cells.forEach((c, i) => {
            if (c.flagged && !c.mine) cellEl(i).classList.add('wrong');
        });
        setStatus('Mine touchée. Lancez une nouvelle partie pour retenter.');
    }

    function win() {
        state = 'won';
        stopTimer();
        document.body.dataset.state = state;
        cells.forEach((c, i) => {
            if (c.mine && !c.flagged) {
                c.flagged = true;
                paint(i);
            }
        });
        flags = level.mines;
        updateCounters();
        setStatus(`Terrain déminé en ${timerEl.textContent} s.`);
    }

    function updateCounters() {
        minesLeftEl.textContent = level.mines - flags;
    }

    function setStatus(text) {
        statusEl.textContent = text;
    }

    function startTimer() {
        startedAt = Date.now();
        timerId = setInterval(() => {
            timerEl.textContent = Math.min(999, Math.floor((Date.now() - startedAt) / 1000));
        }, 250);
    }

    function stopTimer() {
        clearInterval(timerId);
        timerId = null;
    }

    function moveFocus(i) {
        const previous = cellEl(focusIndex);
        if (previous) previous.tabIndex = -1;
        focusIndex = i;
        const next = cellEl(i);
        next.tabIndex = 0;
        next.focus();
    }

    // Souris
    boardEl.addEventListener('click', e => {
        const el = e.target.closest('.cell');
        if (!el || el.dataset.longPressed) {
            if (el) delete el.dataset.longPressed;
            return;
        }
        reveal(Number(el.dataset.index));
    });
    boardEl.addEventListener('contextmenu', e => {
        const el = e.target.closest('.cell');
        if (!el) return;
        e.preventDefault();
        toggleFlag(Number(el.dataset.index));
    });

    // Tactile : appui long = drapeau
    let pressTimer;
    boardEl.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'touch') return;
        const el = e.target.closest('.cell');
        if (!el) return;
        pressTimer = setTimeout(() => {
            el.dataset.longPressed = 'true';
            toggleFlag(Number(el.dataset.index));
            if (navigator.vibrate) navigator.vibrate(20);
        }, LONG_PRESS_MS);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type =>
        boardEl.addEventListener(type, () => clearTimeout(pressTimer)));

    // Clavier : flèches pour se déplacer, Entrée/Espace pour découvrir, F pour le drapeau
    boardEl.addEventListener('keydown', e => {
        const el = e.target.closest('.cell');
        if (!el) return;
        const i = Number(el.dataset.index);
        const r = Math.floor(i / level.cols);
        const c = i % level.cols;
        const moves = {
            ArrowUp: [Math.max(0, r - 1), c],
            ArrowDown: [Math.min(level.rows - 1, r + 1), c],
            ArrowLeft: [r, Math.max(0, c - 1)],
            ArrowRight: [r, Math.min(level.cols - 1, c + 1)],
        };
        if (moves[e.key]) {
            e.preventDefault();
            moveFocus(index(...moves[e.key]));
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            toggleFlag(i);
        }
    });
    boardEl.addEventListener('focusin', e => {
        const el = e.target.closest('.cell');
        if (el && Number(el.dataset.index) !== focusIndex) moveFocus(Number(el.dataset.index));
    });

    restartBtn.addEventListener('click', newGame);
    levelInputs.forEach(input => input.addEventListener('change', newGame));

    newGame();
})();
