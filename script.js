// --- SYSTEM ---
const App = {
    balance: 1000,
    stats: { games: 0, wins: 0, losses: 0 },
    activeGame: null,

    init: function() {
        if(window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.expand();
            window.Telegram.WebApp.ready();
        }
        this.updateUI();
        this.renderBackground();
        this.initAllGames();
        this.renderQuickBets();
        this.renderNavBars();
    },

    updateUI: function() {
        document.getElementById('balance-display').innerText = this.balance;
        document.getElementById('profile-balance-view').innerText = this.balance;
    },

    renderBackground: function() {
        const c = document.getElementById('bg-container');
        if(!c) return;
        for(let i=0; i<30; i++) {
            const el = document.createElement('div');
            el.className='bg-number'; el.innerText='42';
            el.style.left = Math.random()*100+'%'; el.style.top = Math.random()*100+'%';
            el.style.fontSize = (Math.random()*40+20)+'px';
            el.style.transform = `rotate(${Math.random()*30-15}deg)`;
            c.appendChild(el);
        }
    },

    initAllGames: function() {
        GameKeno.init();
        GamePlinko.updateRisk();
        GameTower.init();
    },

    renderQuickBets: function() {
        document.querySelectorAll('.quick-bets').forEach(el => {
            const id = el.getAttribute('data-target');
            el.innerHTML = `
                <button onclick="App.adjBet('${id}', 100)">+100</button>
                <button onclick="App.adjBet('${id}', 500)">+500</button>
                <button onclick="App.maxBet('${id}')" class="btn-max">MAX</button>
            `;
        });
    },

    renderNavBars: function() {
        const games = [
            {id:'rocket', icon:'🚀'}, {id:'plinko', icon:'📐'}, {id:'mines', icon:'💣'},
            {id:'tower', icon:'🏛️'}, {id:'diamonds', icon:'💎'}, {id:'slots', icon:'🍒'}, 
            {id:'dice', icon:'🎲'}, {id:'coin', icon:'🪙'}, {id:'limbo', icon:'🚀'}, 
            {id:'hilo', icon:'🃏'}
        ];
        document.querySelectorAll('.game-nav-bar').forEach(nav => {
            nav.innerHTML = games.map(g => `<button onclick="App.openGame('${g.id}')">${g.icon}</button>`).join('');
        });
    },

    showMenu: function() {
        if(this.activeGame) {
            GameRocket.reset(); // Force reset rocket always
            this.activeGame = null;
        }
        this.hideAll();
        document.getElementById('menu-section').classList.add('active');
    },

    showProfile: function() {
        if(this.activeGame) return;
        this.hideAll();
        document.getElementById('profile-section').classList.add('active');
    },

    openGame: function(id) {
        if(this.activeGame) GameRocket.reset();
        this.hideAll();
        document.getElementById('game-'+id).classList.add('active');
        this.activeGame = id;
        
        // Highlight nav
        document.querySelectorAll('.game-nav-bar button').forEach(b => b.classList.remove('active'));
        // Re-init logic
        setTimeout(() => {
            if(id === 'plinko') GamePlinko.updateRisk();
            if(id === 'tower') GameTower.init();
            if(id === 'keno') GameKeno.init();
        }, 50);
    },

    hideAll: function() {
        document.querySelectorAll('main, section').forEach(el => {
            el.classList.remove('active'); el.classList.add('hidden');
        });
    },

    showError: function(msg) {
        document.getElementById('error-text').innerText = msg;
        document.getElementById('error-modal').classList.remove('hidden');
    },
    closeError: function() { document.getElementById('error-modal').classList.add('hidden'); },

    showLog: function(amt) {
        const rect = document.getElementById('balance-display').getBoundingClientRect();
        const el = document.createElement('div');
        el.className = 'balance-float'; el.innerText = (amt>0?'+':'') + amt;
        el.style.color = amt>0 ? '#4CAF50' : '#F44336';
        el.style.left = (rect.left+20)+'px'; el.style.top = rect.top+'px';
        document.body.appendChild(el); setTimeout(()=>el.remove(),1000);
    },

    addBalance: function() {
        const val = parseInt(document.getElementById('add-balance-input').value);
        if(val>0) { this.balance+=val; this.updateUI(); this.showLog(val); document.getElementById('add-balance-input').value=''; }
    },
    adjBet: function(id, amt) {
        let el = document.getElementById(id); let val = (parseInt(el.value)||0)+amt;
        if(val>this.balance) val=this.balance; el.value=val;
    },
    maxBet: function(id) { document.getElementById(id).value = this.balance; },
    getBet: function(id) {
        const val = parseInt(document.getElementById(id).value);
        if(isNaN(val)||val<=0) { this.showError('Неверная ставка'); return null; }
        if(val>this.balance) { this.showError('Недостаточно средств'); return null; }
        return val;
    },
    updateStats: function(win) {
        this.stats.games++; if(win) this.stats.wins++; else this.stats.losses++;
        document.getElementById('stat-total').innerText=this.stats.games;
        document.getElementById('stat-wins').innerText=this.stats.wins;
        document.getElementById('stat-losses').innerText=this.stats.losses;
    }
};

/* --- GAMES --- */

const GameRocket = {
    timer: null, mult: 1.00, active: false, bet: 0,
    play: function() {
        if(this.active) return;
        const bet = App.getBet('bet-rocket'); if(!bet) return;
        this.bet = bet; App.balance-=bet; App.updateUI(); App.showLog(-bet); this.active=true;
        
        document.getElementById('btn-rocket-play').classList.add('hidden');
        document.getElementById('btn-rocket-cashout').classList.remove('hidden');
        document.getElementById('rocket-status-text').innerText = "FLYING...";
        document.getElementById('rocket-status-text').style.color = "#FFD700";
        
        const obj = document.getElementById('rocket-obj');
        const line = document.getElementById('rocket-line');
        const icon = document.getElementById('rocket-icon');
        
        document.getElementById('rocket-particles').innerHTML = '';
        obj.style.left='0%'; obj.style.bottom='0%'; icon.innerText='🚀'; icon.style.transform='rotate(0deg)';
        
        let time=0, maxX=100, maxY=100;
        let pathData = "M0,300"; line.setAttribute('d', pathData);

        this.mult = 1.00;
        this.timer = setInterval(() => {
            time+=0.05; this.mult += 0.001 * Math.exp(time*0.12);
            document.getElementById('rocket-multiplier-center').innerText = this.mult.toFixed(2)+'x';
            
            let rx = time*10, ry = Math.pow(time, 2.2)*0.5;
            if(rx > maxX*0.8) maxX=rx/0.8; if(ry > maxY*0.8) maxY=ry/0.8;
            
            obj.style.left = (rx/maxX)*100+'%'; obj.style.bottom = (ry/maxY)*100+'%';
            
            let angle = Math.atan2(ry - (Math.pow(time-0.05, 2.2)*0.5), rx - ((time-0.05)*10)) * 180 / Math.PI;
            icon.style.transform = `rotate(${angle-15}deg)`;
            
            document.getElementById('rocket-svg').setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
            line.setAttribute('d', line.getAttribute('d') + ` L${rx},${maxY-ry}`);
            
            if(Math.random()>0.5) this.spawnParticle((rx/maxX)*100, (ry/maxY)*100);
            if(Math.random() < 0.002 * this.mult) this.crash();
        }, 20);
    },
    spawnParticle: function(x, y) {
        let p = document.createElement('div'); p.className='particle';
        p.style.left=x+'%'; p.style.bottom=y+'%';
        document.getElementById('rocket-particles').appendChild(p);
        setTimeout(()=>p.remove(), 800);
    },
    crash: function() {
        clearInterval(this.timer); this.active=false; App.updateStats(false);
        document.getElementById('rocket-icon').innerText='💥';
        document.getElementById('rocket-status-text').innerText="CRASHED";
        document.getElementById('rocket-status-text').style.color="red";
        document.getElementById('btn-rocket-play').classList.remove('hidden');
        document.getElementById('btn-rocket-cashout').classList.add('hidden');
    },
    cashout: function() {
        if(!this.active) return;
        clearInterval(this.timer); this.active=false; App.updateStats(true);
        let win = Math.floor(this.bet * this.mult);
        App.balance += win; App.updateUI(); App.showLog(win);
        document.getElementById('rocket-status-text').innerText=`WON +${win}`;
        document.getElementById('rocket-status-text').style.color="#4CAF50";
        document.getElementById('btn-rocket-play').classList.remove('hidden');
        document.getElementById('btn-rocket-cashout').classList.add('hidden');
    },
    reset: function() {
        clearInterval(this.timer); this.active=false;
        document.getElementById('btn-rocket-play').classList.remove('hidden');
        document.getElementById('btn-rocket-cashout').classList.add('hidden');
        document.getElementById('rocket-status-text').innerText="WAITING";
        document.getElementById('rocket-obj').style.left='0%';
        document.getElementById('rocket-obj').style.bottom='0%';
    }
};

const GamePlinko = {
    rows: 8, pegCoords: [], risks: {low:[5.6,2.1,1.1,1,0.5,1,1.1,2.1,5.6], medium:[13,3,1.3,0.7,0.4,0.7,1.3,3,13], high:[29,4,1.5,0.3,0.2,0.3,1.5,4,29]},
    updateRisk: function() {
        const risk = document.getElementById('plinko-risk').value;
        const board = document.getElementById('plinko-board');
        const mults = document.getElementById('plinko-multipliers');
        if(!board) return;
        board.innerHTML=''; mults.innerHTML=''; this.pegCoords=[];
        
        const boardW=320, startY=30, gapX=30, gapY=25;
        for(let i=0; i<this.rows; i++) {
            let pegs=i+3, rowW=(pegs-1)*gapX, startX=(boardW-rowW)/2;
            for(let j=0; j<pegs; j++) {
                let p = document.createElement('div'); p.className='plinko-peg';
                let px=startX+j*gapX, py=startY+i*gapY;
                p.style.left=px+'px'; p.style.top=py+'px';
                board.appendChild(p); this.pegCoords.push({x:px, y:py});
            }
        }
        this.risks[risk].forEach(v => {
            let m=document.createElement('div'); m.className='plinko-mult'; m.innerText=v+'x';
            if(v>=10) m.className+=' high-pay'; else if(v<1) m.className+=' low-pay'; else m.style.background='#444';
            mults.appendChild(m);
        });
    },
    play: function() {
        const bet = App.getBet('bet-plinko'); if(!bet) return;
        App.balance-=bet; App.updateUI(); App.showLog(-bet);
        
        const ball = document.createElement('div'); ball.className='plinko-ball';
        document.getElementById('plinko-board').appendChild(ball);
        
        let x=160, y=0, vx=(Math.random()-0.5), vy=0;
        let int = setInterval(() => {
            vy+=0.25; vx*=0.98; x+=vx; y+=vy;
            for(let p of this.pegCoords) {
                let dx=x-p.x, dy=y-p.y;
                if(dx*dx+dy*dy < 80) {
                    let a = Math.atan2(dy, dx);
                    let s = Math.sqrt(vx*vx+vy*vy);
                    vx = Math.cos(a)*s*0.6 + (Math.random()-0.5)*1.5;
                    vy = Math.sin(a)*s*0.6;
                    x+=vx; y+=vy;
                }
            }
            if(x<5) { x=5; vx*=-0.6; } if(x>315) { x=315; vx*=-0.6; }
            ball.style.top=y+'px'; ball.style.left=x+'px';
            
            if(y>250) {
                clearInterval(int); ball.remove();
                let b = Math.floor(x/(320/9)); if(b<0)b=0; if(b>8)b=8;
                let m = this.risks[document.getElementById('plinko-risk').value][b];
                let w = Math.floor(bet*m);
                App.balance+=w; App.updateUI(); if(w>0) App.showLog(w); App.updateStats(w>bet);
                let msg = document.getElementById('plinko-msg');
                msg.innerText=`x${m} | ${w}`; msg.style.color = m>=1?'#4CAF50':'#F44336';
            }
        }, 16);
    }
};

const GameMines = {
    active: false, map: [], pot: 0, count: 5,
    start: function() {
        if(this.active) return;
        const bet = App.getBet('bet-mines'); if(!bet) return;
        App.balance-=bet; App.updateUI(); App.showLog(-bet); this.active=true;
        this.count = parseInt(document.getElementById('mines-count-select').value);
        this.pot = bet; this.updateUI();
        
        document.getElementById('btn-mines-start').classList.add('hidden');
        document.getElementById('btn-mines-cashout').classList.remove('hidden');
        
        const g = document.getElementById('mines-grid'); g.innerHTML='';
        this.map = Array(25-this.count).fill(0).concat(Array(this.count).fill(1)).sort(()=>Math.random()-0.5);
        this.map.forEach((v, i) => {
            let c = document.createElement('div'); c.className='mine-cell';
            c.onclick = () => this.click(c, v, i); g.appendChild(c);
        });
    },
    click: function(c, v, i) {
        if(!this.active || c.classList.contains('revealed')) return;
        c.classList.add('revealed');
        if(v===1) {
            c.classList.add('bomb'); c.innerText='💣';
            this.end(false);
        } else {
            c.classList.add('safe'); c.innerText='💎';
            this.pot = Math.floor(this.pot * (1 + this.count/20));
            this.updateUI();
        }
    },
    cashout: function() { if(this.active) { App.balance+=this.pot; App.updateUI(); App.showLog(this.pot); this.end(true); } },
    end: function(win) {
        this.active=false; App.updateStats(win);
        document.getElementById('btn-mines-start').classList.remove('hidden');
        document.getElementById('btn-mines-cashout').classList.add('hidden');
        document.getElementById('mines-potential-win').innerText = win ? `WON: ${this.pot}` : "LOST";
        document.getElementById('mines-potential-win').style.color = win ? "#4CAF50" : "red";
        document.querySelectorAll('.mine-cell').forEach((c, i) => {
            if(!c.classList.contains('revealed')) {
                c.classList.add('revealed', 'dimmed');
                c.innerText = this.map[i]===1 ? '💣' : '💎';
                c.classList.add(this.map[i]===1 ? 'bomb' : 'safe');
            }
        });
    },
    updateUI: function() { document.getElementById('mines-potential-win').innerText = this.pot + ' $'; document.getElementById('mines-potential-win').style.color='#FFD700'; }
};

const GameTower = {
    level: 0, pot: 0, mults: [1.5, 2.3, 3.5, 6.0, 10.0], active: false,
    init: function() {
        const g = document.getElementById('tower-grid'); if(!g) return;
        g.innerHTML = '';
        for(let i=0; i<5; i++) {
            let r = document.createElement('div'); r.className='tower-row';
            for(let j=0; j<3; j++) {
                let c = document.createElement('div'); c.className='tower-cell disabled';
                c.innerText='❓'; c.onclick = () => this.click(i, c); r.appendChild(c);
            } g.appendChild(r);
        }
    },
    play: function() {
        if(this.active) return;
        const bet = App.getBet('bet-tower'); if(!bet) return;
        App.balance-=bet; App.updateUI(); App.showLog(-bet); this.active=true;
        this.level=0; this.pot=bet;
        document.getElementById('btn-tower-play').classList.add('hidden');
        document.getElementById('btn-tower-cashout').classList.remove('hidden');
        document.getElementById('tower-msg').innerText = "Climb!";
        this.init(); this.enableRow(0);
    },
    enableRow: function(l) {
        if(l>=5) return;
        const rows = document.querySelectorAll('.tower-row');
        rows[l].querySelectorAll('.tower-cell').forEach(c => c.className='tower-cell');
        document.querySelectorAll('.tower-level').forEach((e, i) => {
            e.classList.toggle('active-level', i===l);
        });
    },
    click: function(idx, cell) {
        if(!this.active || idx !== this.level) return;
        if(cell.classList.contains('safe') || cell.classList.contains('bomb')) return;
        
        if(Math.random() < 0.33) { // Loss
            cell.className = 'tower-cell bomb'; cell.innerText = '💀';
            this.end(false);
            cell.parentElement.querySelectorAll('.tower-cell').forEach(c => {
                if(c!==cell) { c.className='tower-cell safe'; c.innerText='💎'; }
            });
        } else {
            cell.className = 'tower-cell safe'; cell.innerText = '💎';
            this.pot = Math.floor(parseInt(document.getElementById('bet-tower').value) * this.mults[this.level]);
            document.getElementById('tower-msg').innerText = `Pot: ${this.pot}`;
            this.level++;
            if(this.level>=5) this.cashout(); else this.enableRow(this.level);
        }
    },
    cashout: function() { if(this.active) { App.balance+=this.pot; App.updateUI(); App.showLog(this.pot); this.end(true); } },
    end: function(win) {
        this.active=false; App.updateStats(win);
        document.getElementById('btn-tower-play').classList.remove('hidden');
        document.getElementById('btn-tower-cashout').classList.add('hidden');
        document.getElementById('tower-msg').innerText = win ? `WON ${this.pot}` : "GAME OVER";
    }
};

const GameKeno = {
    sel: [], active: false,
    init: function() {
        const g = document.getElementById('keno-grid'); if(!g) return;
        g.innerHTML=''; this.sel=[];
        for(let i=1; i<=40; i++) {
            let c=document.createElement('div'); c.className='keno-cell'; c.innerText=i;
            c.onclick=()=>this.select(c, i); g.appendChild(c);
        }
        document.getElementById('keno-count').innerText='0';
    },
    select: function(el, n) {
        if(this.active) return;
        if(this.sel.includes(n)) { this.sel=this.sel.filter(x=>x!==n); el.classList.remove('selected'); }
        else { if(this.sel.length>=10) return; this.sel.push(n); el.classList.add('selected'); }
        document.getElementById('keno-count').innerText=this.sel.length;
    },
    play: function() {
        if(this.active || this.sel.length===0) return;
        const bet = App.getBet('bet-keno'); if(!bet) return;
        App.balance-=bet; App.updateUI(); App.showLog(-bet); this.active=true;
        
        document.querySelectorAll('.keno-cell').forEach(c => c.classList.remove('hit','miss'));
        let draw=[], i=0;
        while(draw.length<10) { let n=Math.floor(Math.random()*40)+1; if(!draw.includes(n)) draw.push(n); }
        
        let hits=0;
        let t = setInterval(() => {
            let n = draw[i];
            let el = document.querySelectorAll('.keno-cell')[n-1];
            if(this.sel.includes(n)) { el.classList.add('hit'); hits++; } else { el.classList.add('miss'); }
            i++;
            if(i>=10) {
                clearInterval(t);
                let m=0;
                if(hits===4) m=1.5; else if(hits===5) m=3; else if(hits===6) m=10; else if(hits>=7) m=50;
                let w = Math.floor(bet*m);
                if(w>0) { App.balance+=w; App.updateUI(); App.showLog(w); App.updateStats(true); } else App.updateStats(false);
                document.getElementById('keno-msg').innerText = `Hits: ${hits} | Won: ${w}`;
                this.active=false;
            }
        }, 100);
    }
};

/* --- SIMPLE GAMES --- */
const GameDiamonds = {
    gems: ['💎', '💍', '🔮', '🔶', '🟢', '🔴'],
    play: function() {
        if(App.activeGame && App.activeGame !== 'diamonds') return;
        const bet = App.getBet('bet-diamonds'); if(!bet) return;
        App.balance-=bet; App.updateUI(); App.showLog(-bet); App.activeGame='diamonds';
        
        document.querySelectorAll('.payout-item').forEach(e=>e.classList.remove('active'));
        document.querySelectorAll('.gem-box').forEach(e=>e.classList.remove('win'));
        
        let res=[]; for(let i=0; i<5; i++) res.push(this.gems[Math.floor(Math.random()*this.gems.length)]);
        
        for(let i=1; i<=5; i++) {
            let el = document.getElementById('gem'+i);
            el.style.transform="rotateY(90deg)";
            setTimeout(()=>{ el.innerText=res[i-1]; el.style.transform="rotateY(0deg)"; }, 100+i*80);
        }
        setTimeout(()=>this.check(res, bet), 800);
    },
    check: function(arr, bet) {
        let counts={}; arr.forEach(x=>{counts[x]=(counts[x]||0)+1});
        let max=0; for(let k in counts) if(counts[k]>max) max=counts[k];
        let m=0, id='';
        
        if(max===5){m=50;id='pay-5'} else if(max===4){m=10;id='pay-4'} else if(max===3){m=3;id='pay-3'}
        else if(max===2) {
            let p=0; for(let k in counts) if(counts[k]===2) p++;
            if(p>=2){m=2;id='pay-3'} else m=0.5;
        }
        
        if(m>0) {
            let w=Math.floor(bet*m); App.balance+=w; App.updateUI(); App.showLog(w); App.updateStats(true);
            document.getElementById('diamonds-msg').innerText=`WON ${w}`;
            if(id) document.getElementById(id).classList.add('active');
        } else {
            document.getElementById('diamonds-msg').innerText="LOST"; App.updateStats(false);
        }
        App.activeGame=null;
    }
};

const GameSlots = {
    sym: ['🍒','🍒','🍒','🍋','🍋','🍇','💎','7️⃣'],
    play: function() {
        if(App.activeGame) return;
        const bet = App.getBet('bet-slots'); if(!bet) return;
        App.balance-=bet; App.updateUI(); App.showLog(-bet); App.activeGame='slots';
        
        const cols=[document.getElementById('col1'),document.getElementById('col2'),document.getElementById('col3')];
        let i=0;
        let t = setInterval(()=>{
            cols.forEach(c=>{ c.innerText=this.sym[Math.floor(Math.random()*this.sym.length)]; c.classList.add('blur-spin'); });
            i++; if(i>15) {
                clearInterval(t); cols.forEach(c=>c.classList.remove('blur-spin'));
                this.check(cols, bet);
            }
        }, 80);
    },
    check: function(cols, bet) {
        let r1=cols[0].innerText, r2=cols[1].innerText, r3=cols[2].innerText;
        let w=0;
        if(r1=='7️⃣'&&r2=='7️⃣'&&r3=='7️⃣') w=bet*50;
        else if(r1===r2 && r2===r3) w=bet*5;
        else if(r1===r2 || r2===r3 || r1===r3) w=Math.floor(bet*1.5);
        
        if(w>0) { App.balance+=w; App.updateUI(); App.showLog(w); App.updateStats(true); document.getElementById('slots-result').innerText=`WON ${w}`; }
        else { App.updateStats(false); document.getElementById('slots-result').innerText="LOST"; }
        App.activeGame=null;
    }
};

const GameDice = {
    play: function(high) {
        if(App.activeGame) return;
        const bet=App.getBet('bet-dice'); if(!bet) return;
        App.balance-=bet; App.updateUI(); App.showLog(-bet); App.activeGame='dice';
        
        const c = document.getElementById('dice-cube');
        let r = Math.floor(Math.random()*6)+1;
        c.style.transition="transform 1s"; c.style.transform=`rotateX(${Math.random()*720}deg) rotateY(${Math.random()*720}deg)`;
        
        setTimeout(()=>{
            const rots={1:[0,0],2:[0,-90],3:[0,-180],4:[0,90],5:[-90,0],6:[90,0]};
            c.style.transform=`rotateX(${rots[r][0]}deg) rotateY(${rots[r][1]}deg)`;
            setTimeout(()=>{
                let win = (high && r>3) || (!high && r<=3);
                if(win) { let w=bet*2; App.balance+=w; App.updateUI(); App.showLog(w); }
                App.updateStats(win); document.getElementById('dice-msg').innerText = win ? `WIN (${r})` : `LOSE (${r})`;
                App.activeGame=null;
            }, 500);
        }, 1000);
    }
};

const GameCoin = {
    play: function(ch) {
        if(App.activeGame) return;
        const bet=App.getBet('bet-coin'); if(!bet) return;
        App.balance-=bet; App.updateUI(); App.showLog(-bet); App.activeGame='coin';
        
        const c = document.getElementById('coin');
        let h = Math.random()<0.5;
        c.style.transition='transform 2s'; c.style.transform=`rotateY(${h?1800:1980}deg)`;
        
        setTimeout(()=>{
            let win = (ch==='heads' && h) || (ch==='tails' && !h);
            if(win) { let w=bet*2; App.balance+=w; App.updateUI(); App.showLog(w); }
            App.updateStats(win); document.getElementById('coin-msg').innerText = win ? "WON" : "LOST";
            App.activeGame=null; c.style.transition='none'; c.style.transform='rotateY(0deg)';
        }, 2000);
    }
};

const GameLimbo = {
    play: function() {
        let t = parseFloat(document.getElementById('limbo-target').value);
        if(t<1.01) return;
        const bet=App.getBet('bet-limbo'); if(!bet) return;
        App.balance-=bet; App.updateUI(); App.showLog(-bet);
        
        let res = 0.99 / Math.random(); if(res>10000) res=10000;
        let d = document.getElementById('limbo-result'); d.style.color='#fff';
        let i=0, inv = setInterval(()=>{
            d.innerText=(Math.random()*100).toFixed(2)+'x'; i++;
            if(i>5) {
                clearInterval(inv); d.innerText=res.toFixed(2)+'x';
                if(res>=t) { let w=Math.floor(bet*t); App.balance+=w; App.updateUI(); App.showLog(w); App.updateStats(true); d.style.color='#4CAF50'; }
                else { App.updateStats(false); d.style.color='#F44336'; }
            }
        }, 50);
    }
};

const GameHiLo = {
    card: null, pot: 0,
    start: function() {
        if(App.activeGame) return;
        const bet=App.getBet('bet-hilo'); if(!bet) return;
        this.pot=bet; App.balance-=bet; App.updateUI(); App.showLog(-bet); App.activeGame='hilo';
        this.card = {v:Math.floor(Math.random()*13)+2, s:['♠','♥','♦','♣'][Math.floor(Math.random()*4)]};
        this.render();
        document.getElementById('btn-hilo-start').style.display='none';
        document.getElementById('hilo-controls').style.display='block';
    },
    render: function() {
        let r={11:'J',12:'Q',13:'K',14:'A'}[this.card.v]||this.card.v;
        let c=(this.card.s=='♥'||this.card.s=='♦')?'red':'black';
        document.getElementById('hilo-card').innerHTML=`<div class="card ${c}"><div>${r}</div><div style="font-size:40px">${this.card.s}</div></div>`;
    },
    guess: function(ch) {
        let old=this.card.v;
        this.card = {v:Math.floor(Math.random()*13)+2, s:['♠','♥','♦','♣'][Math.floor(Math.random()*4)]};
        this.render();
        let win = (ch==='hi' && this.card.v > old) || (ch==='lo' && this.card.v < old);
        if(win) {
            this.pot = Math.floor(this.pot * 1.5); 
            document.getElementById('hilo-info').innerText=`Correct! Pot: ${this.pot}`;
        } else {
            document.getElementById('hilo-info').innerText="Wrong!";
            this.reset();
        }
    },
    cashout: function() {
        App.balance+=this.pot; App.updateUI(); App.showLog(this.pot); App.updateStats(true);
        this.reset();
    },
    reset: function() {
        document.getElementById('btn-hilo-start').style.display='block';
        document.getElementById('hilo-controls').style.display='none';
        App.activeGame=null;
    }
};

App.init();
