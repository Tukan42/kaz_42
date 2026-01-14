// --- TELEGRAM INIT ---
if(window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp; tg.expand(); tg.ready();
}

let balance = 1000;
let stats = { games: 0, wins: 0, losses: 0 };
let isGameActive = false; 

window.onload = function() {
    updateBalanceUI();
    generateBackground();
    initKeno();
    updatePlinkoRisk();
    initTower();
};

function generateBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;
    for(let i=0; i<30; i++) {
        const el = document.createElement('div'); el.className = 'bg-number'; el.innerText = '42';
        el.style.left = Math.random()*100 + '%'; el.style.top = Math.random()*100 + '%';
        el.style.fontSize = (Math.random()*40+20) + 'px';
        el.style.transform = `rotate(${Math.random()*30-15}deg)`; container.appendChild(el);
    }
}
function updateBalanceUI() {
    document.getElementById('balance-display').innerText = balance;
    document.getElementById('profile-balance-view').innerText = balance;
}
function showMenu() { if(isGameActive && !confirm("Game in progress. Leave?")) return; hideAll(); document.getElementById('menu-section').classList.add('active'); }
function showProfile() { if(isGameActive) return; hideAll(); document.getElementById('profile-section').classList.add('active'); updateBalanceUI(); }
function openGame(id) { hideAll(); document.getElementById('game-'+id).classList.add('active'); }
function hideAll() { document.querySelectorAll('main, section').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); }); }

function showBalanceLog(amount) {
    const display = document.getElementById('balance-display');
    const rect = display.getBoundingClientRect();
    const el = document.createElement('div');
    const isPos = amount > 0;
    el.className = 'balance-float'; el.innerText = (isPos ? '+' : '') + amount;
    el.style.color = isPos ? '#4CAF50' : '#F44336';
    el.style.left = (rect.left + 20) + 'px'; el.style.top = rect.top + 'px';
    document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
}
function addBalance() { const val = parseInt(document.getElementById('add-balance-input').value); if(val>0){balance+=val; updateBalanceUI(); showBalanceLog(val); document.getElementById('add-balance-input').value = '';}}
function adjustBet(id, amt) { let el = document.getElementById(id); let val = parseInt(el.value)||0; val+=amt; if(val>balance) val=balance; el.value=val; if(id==='limbo') updateLimboCalc(); }
function setMaxBet(id) { document.getElementById(id).value = balance; if(id==='limbo') updateLimboCalc(); }
function getBet(id) { const val = parseInt(document.getElementById(id).value); if(isNaN(val)||val<=0){alert('Invalid bet');return null;} if(val>balance){alert('Funds low');return null;} return val; }
function updateStats(win) { stats.games++; if(win) stats.wins++; else stats.losses++; document.getElementById('stat-total').innerText=stats.games; document.getElementById('stat-wins').innerText=stats.wins; document.getElementById('stat-losses').innerText=stats.losses; }

/* ================= HI-LO ================= */
const suits = ['♠', '♥', '♦', '♣'];
const ranks = {11:'J', 12:'Q', 13:'K', 14:'A'};
let currentCard = null, hiloBet = 0, hiloPot = 0;

function getCardHTML(val, suit) {
    let rank = ranks[val] || val;
    let color = (suit === '♥' || suit === '♦') ? 'red' : 'black';
    return `<div class="card ${color}"><div>${rank}</div><div style="font-size:40px">${suit}</div></div>`;
}
function startHiLo() {
    if(isGameActive) return;
    const bet = getBet('bet-hilo'); if(!bet) return;
    hiloBet = bet; hiloPot = bet;
    balance -= bet; updateBalanceUI(); showBalanceLog(-bet); isGameActive = true;
    
    currentCard = { val: Math.floor(Math.random()*13)+2, suit: suits[Math.floor(Math.random()*4)] };
    document.getElementById('hilo-card').innerHTML = getCardHTML(currentCard.val, currentCard.suit);
    document.getElementById('hilo-history').innerHTML = '';
    document.getElementById('hilo-info').innerText = "Make a choice";
    document.getElementById('hilo-info').style.color = "#FFD700";
    
    document.getElementById('btn-hilo-start').style.display = 'none';
    document.getElementById('hilo-controls').style.display = 'block';
    updateHiLoRates();
}
function updateHiLoRates() {
    let total = 52; let lower = (currentCard.val - 2) * 4; let higher = (14 - currentCard.val) * 4;
    let rateHi = higher > 0 ? (total / higher) * 0.94 : 0;
    let rateLo = lower > 0 ? (total / lower) * 0.94 : 0;
    document.getElementById('rate-hi').innerText = rateHi > 0 ? "x"+rateHi.toFixed(2) : "-";
    document.getElementById('rate-lo').innerText = rateLo > 0 ? "x"+rateLo.toFixed(2) : "-";
    document.querySelector('.btn-hi').disabled = (rateHi === 0);
    document.querySelector('.btn-lo').disabled = (rateLo === 0);
    document.getElementById('hilo-profit').innerText = `(${hiloPot} $)`
}
function guessHiLo(choice) {
    let oldVal = currentCard.val;
    let nextCard = { val: Math.floor(Math.random()*13)+2, suit: suits[Math.floor(Math.random()*4)] };
    let hist = document.getElementById('hilo-history');
    let mini = document.createElement('div'); mini.className = 'mini-card'; 
    mini.innerText = (ranks[oldVal] || oldVal) + currentCard.suit; hist.appendChild(mini);
    currentCard = nextCard;
    document.getElementById('hilo-card').innerHTML = getCardHTML(nextCard.val, nextCard.suit);
    
    let won = false;
    if(choice === 'hi' && nextCard.val > oldVal) won = true;
    if(choice === 'lo' && nextCard.val < oldVal) won = true;
    
    if(won) {
        let total = 52; let chance = (choice === 'hi') ? (14 - oldVal) * 4 : (oldVal - 2) * 4;
        let mult = (total / chance) * 0.94;
        hiloPot = Math.floor(hiloPot * mult);
        document.getElementById('hilo-info').innerText = "Correct! " + hiloPot + "$";
        document.getElementById('hilo-info').style.color = "#4CAF50";
        updateHiLoRates();
    } else {
        document.getElementById('hilo-info').innerText = "WRONG! Lost " + hiloBet + "$";
        document.getElementById('hilo-info').style.color = "#F44336";
        resetHiLo();
    }
}
function cashoutHiLo() {
    balance += hiloPot; updateBalanceUI(); showBalanceLog(hiloPot); updateStats(true);
    document.getElementById('hilo-info').innerText = "Cashed out " + hiloPot + "$";
    resetHiLo();
}
function resetHiLo() {
    document.getElementById('btn-hilo-start').style.display = 'block';
    document.getElementById('hilo-controls').style.display = 'none';
    isGameActive = false;
}

/* ================= LIMBO ================= */
document.getElementById('limbo-target').addEventListener('input', updateLimboCalc);
document.getElementById('bet-limbo').addEventListener('input', updateLimboCalc);
function updateLimboCalc() {
    let target = parseFloat(document.getElementById('limbo-target').value) || 1.01;
    if(target < 1.01) target = 1.01;
    document.getElementById('limbo-chance').innerText = (99 / target).toFixed(2) + "%";
}
function playLimbo() {
    let target = parseFloat(document.getElementById('limbo-target').value); if(target < 1.01) return;
    const bet = getBet('bet-limbo'); if(!bet) return;
    balance -= bet; updateBalanceUI(); showBalanceLog(-bet);
    let display = document.getElementById('limbo-result');
    let result = 0.99 / Math.random(); if(result>10000) result=10000;
    display.style.color = "#fff";
    let ticks = 0;
    let timer = setInterval(() => {
        display.innerText = (Math.random() * 100).toFixed(2) + "x"; ticks++;
        if(ticks > 5) {
            clearInterval(timer);
            display.innerText = result.toFixed(2) + "x";
            if(result >= target) {
                let win = Math.floor(bet * target);
                balance += win; updateBalanceUI(); showBalanceLog(win); updateStats(true);
                display.style.color = "#4CAF50";
            } else { display.style.color = "#F44336"; updateStats(false); }
        }
    }, 50);
}

/* ================= DIAMONDS ================= */
const gems = ['💎', '💍', '🔮', '🔶', '🟢', '🔴', '🟣', '⚫', '⚪']; 
function playDiamonds() {
    if(isGameActive) return;
    const bet = getBet('bet-diamonds'); if(!bet) return;
    balance -= bet; updateBalanceUI(); showBalanceLog(-bet); isGameActive = true;
    document.querySelectorAll('.payout-item').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.gem-box').forEach(e => e.classList.remove('win'));
    document.getElementById('diamonds-msg').innerText = "Spinning...";
    let res = []; for(let i=0; i<5; i++) res.push(gems[Math.floor(Math.random() * gems.length)]);
    for(let i=1; i<=5; i++) {
        let el = document.getElementById('gem'+i); el.style.transform = "rotateY(90deg)";
        setTimeout(() => { el.innerText = res[i-1]; el.style.transform = "rotateY(0deg)"; }, 100 + (i*80));
    }
    setTimeout(() => { checkDiamondsWin(res, bet); }, 800);
}
function checkDiamondsWin(arr, bet) {
    let counts = {}; arr.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
    let max = 0; for(let k in counts) if(counts[k] > max) max = counts[k];
    let mult = 0; let elId = "";
    if(max === 5) { mult = 50; elId="pay-5"; } else if(max === 4) { mult = 10; elId="pay-4"; } else if(max === 3) { mult = 4; elId="pay-3"; } else if(max === 2) { 
        let pairs = 0; for(let k in counts) if(counts[k] === 2) pairs++;
        if(pairs >= 2) { mult = 2; elId="pay-2"; }
    }
    if(mult > 0) {
        let win = bet * mult; balance += win; updateBalanceUI(); showBalanceLog(win); updateStats(true);
        document.getElementById('diamonds-msg').innerText = `WON ${win}$ (x${mult})`;
        document.getElementById('diamonds-msg').style.color = "#4CAF50";
        if(document.getElementById(elId)) document.getElementById(elId).classList.add('active');
        for(let i=0; i<5; i++) if(counts[arr[i]] >= 2) document.getElementById('gb'+(i+1)).classList.add('win');
    } else {
        document.getElementById('diamonds-msg').innerText = "No luck";
        document.getElementById('diamonds-msg').style.color = "#888";
        updateStats(false);
    }
    isGameActive = false;
}

/* ================= ROCKET ================= */
let rocketTimer, rocketMult=1.00, currentRocketBet = 0;
function playRocket() {
    if(isGameActive) return;
    const bet = getBet('bet-rocket'); if(!bet) return;
    currentRocketBet = bet; balance -= bet; updateBalanceUI(); showBalanceLog(-bet); isGameActive = true;
    document.getElementById('btn-rocket-play').classList.add('hidden');
    document.getElementById('btn-rocket-cashout').classList.remove('hidden');
    document.getElementById('rocket-status-text').innerText = "FLYING...";
    document.getElementById('rocket-status-text').style.color = "#FFD700";
    const rocketObj = document.getElementById('rocket-obj');
    const rocketIcon = document.getElementById('rocket-icon');
    const svgLine = document.getElementById('rocket-line');
    const particles = document.getElementById('rocket-particles');
    particles.innerHTML = ''; rocketMult = 1.00;
    rocketObj.style.left = '0%'; rocketObj.style.bottom = '0%'; 
    rocketIcon.innerText = '🚀'; rocketIcon.style.transform = 'rotate(0deg)';
    svgLine.setAttribute('d', 'M0,100'); 
    let time = 0; let maxX = 100; let maxY = 100; 
    rocketTimer = setInterval(() => {
        time += 0.05; rocketMult += 0.001 * Math.exp(time * 0.12);
        document.getElementById('rocket-multiplier-center').innerText = rocketMult.toFixed(2)+'x';
        let rawX = time * 10; let rawY = Math.pow(time, 2.2) * 0.5;
        if (rawX > maxX * 0.8) maxX = rawX / 0.8; if (rawY > maxY * 0.8) maxY = rawY / 0.8;
        let cssX = (rawX / maxX) * 100; let cssY = (rawY / maxY) * 100;
        rocketObj.style.left = cssX + '%'; rocketObj.style.bottom = cssY + '%';
        let pTime = time - 0.05; let pX = pTime * 10; let pY = Math.pow(pTime, 2.2) * 0.5;
        let angle = Math.atan2(rawY-pY, rawX-pX) * 180 / Math.PI; 
        rocketIcon.style.transform = `rotate(${angle-15}deg)`;
        let svg = document.getElementById('rocket-svg'); svg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
        let svgY = maxY - rawY; let d = svgLine.getAttribute('d'); if(d === 'M0,100') d = `M0,${maxY}`; 
        svgLine.setAttribute('d', d + ` L${rawX},${svgY}`);
        if(Math.random()>0.5) {
            let p = document.createElement('div'); p.className='particle';
            p.style.left = cssX+'%'; p.style.bottom = cssY+'%';
            particles.appendChild(p); setTimeout(()=>p.remove(),800);
        }
        if(Math.random() < 0.002 * rocketMult) crashRocket();
    }, 20);
}
function crashRocket() {
    clearInterval(rocketTimer); isGameActive = false; updateStats(false);
    document.getElementById('rocket-icon').innerText = '💥';
    document.getElementById('rocket-status-text').innerText = "CRASHED";
    document.getElementById('rocket-status-text').style.color = "red";
    document.getElementById('btn-rocket-play').classList.remove('hidden');
    document.getElementById('btn-rocket-cashout').classList.add('hidden');
}
function cashoutRocket() {
    if(!isGameActive) return;
    clearInterval(rocketTimer); isGameActive = false; updateStats(true);
    let win = Math.floor(currentRocketBet * rocketMult);
    balance += win; updateBalanceUI(); showBalanceLog(win);
    document.getElementById('rocket-status-text').innerText = `WON +${win}`;
    document.getElementById('rocket-status-text').style.color = "#4CAF50";
    document.getElementById('btn-rocket-play').classList.remove('hidden');
    document.getElementById('btn-rocket-cashout').classList.add('hidden');
}

/* ================= TOWER ================= */
let towerLevel = 0, towerPot = 0; const towerMults = [1.5, 2.3, 3.5, 6.0, 10.0];
function initTower() {
    const grid = document.getElementById('tower-grid'); grid.innerHTML = '';
    for(let i=0; i<5; i++) {
        let row = document.createElement('div'); row.className = 'tower-row';
        for(let j=0; j<3; j++) {
            let cell = document.createElement('div'); cell.className = 'tower-cell disabled';
            cell.innerText = '❓'; cell.onclick = () => clickTower(i, j, cell);
            row.appendChild(cell);
        } grid.appendChild(row);
    }
}
function playTower() {
    if(isGameActive) return;
    const bet = getBet('bet-tower'); if(!bet) return;
    balance -= bet; updateBalanceUI(); showBalanceLog(-bet); isGameActive = true;
    towerLevel = 0; towerPot = bet;
    document.getElementById('btn-tower-play').classList.add('hidden');
    document.getElementById('btn-tower-cashout').classList.remove('hidden');
    document.getElementById('tower-msg').innerText = "Choose a tile";
    const rows = document.querySelectorAll('.tower-row');
    rows.forEach(r => r.querySelectorAll('.tower-cell').forEach(c => { c.className = 'tower-cell disabled'; c.innerText = '❓'; }));
    enableTowerRow(0);
}
function enableTowerRow(level) {
    const rows = document.querySelectorAll('.tower-row'); if(level >= 5) return;
    rows[level].querySelectorAll('.tower-cell').forEach(c => c.className = 'tower-cell');
    document.querySelectorAll('.tower-level').forEach(l => l.classList.remove('active-level'));
    document.querySelectorAll('.tower-level')[level].classList.add('active-level');
}
function clickTower(rowIdx, colIdx, cell) {
    if(!isGameActive || rowIdx !== towerLevel) return;
    if(cell.classList.contains('safe') || cell.classList.contains('bomb')) return;
    let isBomb = Math.random() < 0.33;
    if(isBomb) {
        cell.className = 'tower-cell bomb'; cell.innerText = '💀';
        isGameActive = false; updateStats(false);
        document.getElementById('tower-msg').innerText = "GAME OVER";
        document.getElementById('btn-tower-play').classList.remove('hidden');
        document.getElementById('btn-tower-cashout').classList.add('hidden');
        cell.parentElement.querySelectorAll('.tower-cell').forEach(c => { if(c !== cell) { c.className = 'tower-cell safe'; c.innerText = '💎'; } });
    } else {
        cell.className = 'tower-cell safe'; cell.innerText = '💎';
        let mult = towerMults[towerLevel]; towerPot = Math.floor(getBet('bet-tower') * mult); 
        document.getElementById('tower-msg').innerText = `Potential: ${towerPot}$`;
        towerLevel++; if(towerLevel >= 5) { cashoutTower(); } else { enableTowerRow(towerLevel); }
    }
}
function cashoutTower() {
    if(!isGameActive) return;
    balance += towerPot; updateBalanceUI(); showBalanceLog(towerPot);
    isGameActive = false; updateStats(true);
    document.getElementById('btn-tower-play').classList.remove('hidden');
    document.getElementById('btn-tower-cashout').classList.add('hidden');
    document.getElementById('tower-msg').innerText = `WON ${towerPot}$`;
}

/* ================= WHEEL ================= */
let wheelSpinning = false;
function playWheel(multiplier) {
    if(isGameActive || wheelSpinning) return;
    const bet = getBet('bet-wheel'); if(!bet) return;
    balance -= bet; updateBalanceUI(); showBalanceLog(-bet); isGameActive = true; wheelSpinning = true;
    const wheel = document.getElementById('wheel-circle');
    let extraSpins = 5 * 360; let finalAngle = Math.floor(Math.random() * 360);
    wheel.style.transform = `rotate(${extraSpins + finalAngle}deg)`;
    setTimeout(() => {
        let actualAngle = (360 - (finalAngle % 360)) % 360;
        let winningMult = 0;
        if(actualAngle >= 0 && actualAngle < 90) winningMult = 2;
        else if(actualAngle >= 90 && actualAngle < 180) winningMult = 3;
        else if(actualAngle >= 180 && actualAngle < 270) winningMult = 5;
        else if(actualAngle >= 270 && actualAngle < 360) winningMult = 50;
        
        let won = (multiplier === winningMult);
        if(won) {
            let winAmount = bet * multiplier;
            balance += winAmount; updateBalanceUI(); showBalanceLog(winAmount); updateStats(true);
            document.getElementById('wheel-msg').innerText = `WON ${winAmount}$`;
            document.getElementById('wheel-msg').style.color = "#4CAF50";
        } else {
            updateStats(false);
            document.getElementById('wheel-msg').innerText = "LOST";
            document.getElementById('wheel-msg').style.color = "#F44336";
        }
        wheelSpinning = false; isGameActive = false;
        wheel.style.transition = 'none'; wheel.style.transform = `rotate(${finalAngle % 360}deg)`;
        setTimeout(() => { wheel.style.transition = 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)'; }, 50);
    }, 4000);
}

/* ================= PLINKO ================= */
const plinkoRows = 8;
const plinkoRisks = {
    low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29]
};
let pegCoords = [];
function updatePlinkoRisk() {
    const risk = document.getElementById('plinko-risk').value;
    const multsDiv = document.getElementById('plinko-multipliers');
    const board = document.getElementById('plinko-board');
    multsDiv.innerHTML = ''; board.innerHTML = ''; pegCoords = [];
    const boardW = 320; const startY = 30; const gapX = 30; const gapY = 25;
    for(let i=0; i<plinkoRows; i++) {
        let pegsInRow = i + 3; let rowWidth = (pegsInRow - 1) * gapX; let startX = (boardW - rowWidth) / 2;
        for(let j=0; j < pegsInRow; j++) {
            let peg = document.createElement('div'); peg.className='plinko-peg';
            let px = startX + j * gapX; let py = startY + i * gapY;
            peg.style.left = px + 'px'; peg.style.top = py + 'px';
            board.appendChild(peg); pegCoords.push({x: px, y: py});
        }
    }
    plinkoRisks[risk].forEach(v => {
        let m = document.createElement('div'); m.className='plinko-mult'; m.innerText=v+'x';
        if(v >= 10) m.className += ' high-pay'; else if(v < 1) m.className += ' low-pay'; else m.style.background = '#444';
        multsDiv.appendChild(m);
    });
}
function playPlinko() {
    const bet = getBet('bet-plinko'); if(!bet) return;
    balance -= bet; updateBalanceUI(); showBalanceLog(-bet); dropBall(bet);
}
function dropBall(bet) {
    const board = document.getElementById('plinko-board');
    const ball = document.createElement('div'); ball.className='plinko-ball';
    board.appendChild(ball);
    let x = 160; let y = 0; let vx = (Math.random() - 0.5) * 1; let vy = 0;
    const gravity = 0.25; const friction = 0.98; const bounce = 0.6;
    let interval = setInterval(() => {
        vy += gravity; vx *= friction; x += vx; y += vy;
        for(let p of pegCoords) {
            let dx = x - p.x; let dy = y - p.y;
            if (dx*dx + dy*dy < 80) {
                let angle = Math.atan2(dy, dx);
                let speed = Math.sqrt(vx*vx + vy*vy);
                vx = Math.cos(angle) * speed * bounce + (Math.random() - 0.5) * 1.5;
                vy = Math.sin(angle) * speed * bounce;
                x += vx; y += vy;
            }
        }
        if(x < 5) { x=5; vx = -vx * 0.6; } if(x > 315) { x=315; vx = -vx * 0.6; }
        ball.style.top = y + 'px'; ball.style.left = x + 'px';
        if (y > 250) {
            clearInterval(interval); ball.remove();
            let bucket = Math.floor(x / (320/9)); if (bucket < 0) bucket = 0; if (bucket > 8) bucket = 8;
            const risk = document.getElementById('plinko-risk').value;
            const mult = plinkoRisks[risk][bucket];
            const win = Math.floor(bet * mult);
            balance += win; updateBalanceUI(); updateStats(win > bet); if(win > 0) showBalanceLog(win);
            const msg = document.getElementById('plinko-msg');
            msg.innerText = `x${mult} | ${win}$`; msg.style.color = mult >= 1 ? '#4CAF50' : '#F44336';
        }
    }, 16);
}

/* ================= MINES ================= */
let minesActive = false, minesMap = [], minesPot = 0, minesCount = 5;
function startMines() {
    if(minesActive) return;
    const bet=getBet('bet-mines'); if(!bet)return;
    balance-=bet; updateBalanceUI(); showBalanceLog(-bet); minesActive=true;
    minesCount = parseInt(document.getElementById('mines-count-select').value);
    minesPot=bet; updateMinesUI();
    document.getElementById('btn-mines-start').classList.add('hidden');
    document.getElementById('btn-mines-cashout').classList.remove('hidden');
    const grid = document.getElementById('mines-grid'); grid.innerHTML='';
    minesMap = Array(25-minesCount).fill(0).concat(Array(minesCount).fill(1)).sort(()=>Math.random()-0.5);
    minesMap.forEach((val, index) => {
        let c = document.createElement('div'); c.className='mine-cell';
        c.onclick = () => clickMine(c, val); grid.appendChild(c);
    });
}
function clickMine(cell, val) {
    if(!minesActive || cell.classList.contains('revealed')) return;
    cell.classList.add('revealed');
    if(val === 1) { 
        cell.classList.add('bomb'); cell.innerText = '💣';
        minesActive = false; updateStats(false);
        document.getElementById('mines-potential-win').innerText="LOST";
        document.getElementById('mines-potential-win').style.color="red";
        revealAllMines(false);
    } else {
        cell.classList.add('safe'); cell.innerText = '💎';
        minesPot = Math.floor(minesPot * (1 + minesCount / 20)); updateMinesUI();
    }
}
function cashoutMines() {
    if(minesActive) { 
        balance += minesPot; updateBalanceUI(); showBalanceLog(minesPot);
        minesActive = false; updateStats(true);
        document.getElementById('mines-potential-win').innerText=`WON: ${minesPot}`;
        document.getElementById('mines-potential-win').style.color="#4CAF50";
        revealAllMines(true);
    }
}
function revealAllMines(isWin) {
    document.getElementById('btn-mines-start').classList.remove('hidden');
    document.getElementById('btn-mines-cashout').classList.add('hidden');
    document.querySelectorAll('.mine-cell').forEach((c, i) => {
        if(c.classList.contains('revealed')) return;
        c.classList.add('revealed', 'dimmed');
        if(minesMap[i] === 1) { c.classList.add('bomb'); c.innerText = '💣'; } 
        else { c.classList.add('safe'); c.innerText = '💎'; }
    });
}
function updateMinesUI() {
    const el = document.getElementById('mines-potential-win');
    el.innerText = minesPot + ' $'; el.style.color = '#FFD700';
}

/* ================= SLOTS ================= */
let isSlotSpinning = false;
function playSlots() {
    if(isSlotSpinning) return;
    const bet=getBet('bet-slots'); if(!bet)return;
    balance-=bet; updateBalanceUI(); showBalanceLog(-bet); isSlotSpinning=true;
    const cols = [document.getElementById('col1'),document.getElementById('col2'),document.getElementById('col3')];
    const s=['🍒','7️⃣','💎','🍇','🍋'];
    let i=0;
    let t=setInterval(()=>{
        cols.forEach(c=>{c.innerText=s[Math.floor(Math.random()*s.length)]; c.classList.add('blur-spin');});
        i++; if(i>15) {
            clearInterval(t); cols.forEach(c=>c.classList.remove('blur-spin'));
            let r1=cols[0].innerText, r2=cols[1].innerText, r3=cols[2].innerText;
            let win=0;
            if(r1===r2 && r2===r3) win=bet*10; else if(r1===r2 || r2===r3 || r1===r3) win=bet*2;
            balance+=win; updateBalanceUI(); updateStats(win>0); if(win>0) showBalanceLog(win);
            isSlotSpinning=false;
            document.getElementById('slots-result').innerText = win>0 ? `WON ${win}$` : "No Luck";
        }
    }, 80);
}

/* ================= DICE ================= */
let isDiceRolling = false;
function playDice(high) {
    if(isDiceRolling) return;
    const bet=getBet('bet-dice'); if(!bet)return;
    balance-=bet; updateBalanceUI(); showBalanceLog(-bet); isDiceRolling=true;
    const cube = document.getElementById('dice-cube');
    let roll = Math.floor(Math.random()*6)+1;
    let rx = Math.random()*720+720; let ry = Math.random()*720+720;
    cube.style.transition = "transform 1s cubic-bezier(0.2,0.8,0.2,1)";
    cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    setTimeout(()=>{
        const rots={1:[0,0],2:[0,-90],3:[0,-180],4:[0,90],5:[-90,0],6:[90,0]};
        cube.style.transition="transform 0.5s ease-out";
        cube.style.transform=`rotateX(${rots[roll][0]}deg) rotateY(${rots[roll][1]}deg)`;
        setTimeout(()=>{
            let win = (high && roll>3) || (!high && roll<=3);
            if(win) { balance+=bet*2; showBalanceLog(bet*2); }
            updateBalanceUI(); updateStats(win); isDiceRolling=false;
            document.getElementById('dice-msg').innerText = win ? `WIN (${roll})` : `LOSE (${roll})`;
        },500);
    },1000);
}

/* ================= COIN ================= */
let isCoinFlipping = false;
function playCoin(choice) {
    if(isCoinFlipping) return;
    const bet=getBet('bet-coin'); if(!bet)return;
    balance-=bet; updateBalanceUI(); showBalanceLog(-bet); isCoinFlipping=true;
    const coin=document.getElementById('coin');
    let heads = Math.random()<0.5;
    coin.style.transition='none'; coin.style.transform='rotateY(0deg)';
    setTimeout(()=>{
        coin.style.transition='transform 2s ease-out';
        coin.style.transform=`rotateY(${heads?1800:1980}deg)`;
    },50);
    setTimeout(()=>{
        let win = (choice==='heads' && heads) || (choice==='tails' && !heads);
        if(win) { balance+=bet*2; showBalanceLog(bet*2); }
        updateBalanceUI(); updateStats(win); isCoinFlipping=false;
        document.getElementById('coin-msg').innerText = win ? "YOU WON" : "YOU LOST";
    },2000);
}