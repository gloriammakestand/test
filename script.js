const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5wyzEXxKbCeS8SQWZQ7oz5lmPwszeLtW-TuQ5uzCV6GWcXP5IqOzjTqhIRg5yyLuRd86yLtXGMnoL/pub?output=csv'; 

let products = [];
let cart = { prod: null, size: '', color: '' };

// 1. SYNC DATA DARI GOOGLE SHEETS
async function initApp() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').map(r => r.trim()).filter(r => r !== '');
        
        const header = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ""));
        const getIdx = (name) => header.indexOf(name);

        products = rows.slice(1).map((row, index) => {
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ""));
            if (cols.length < 5) return null;

            return {
                id: parseInt(cols[getIdx('id')]) || (index + 1),
                name: cols[getIdx('name')] || "Produk",
                price: parseInt((cols[getIdx('price')] || "0").replace(/[^\d]/g, "")),
                dp: parseInt((cols[getIdx('dp')] || "0").replace(/[^\d]/g, "")) || 0,
                badge: (cols[getIdx('badge')] || "ready").toLowerCase(),
                status: cols[getIdx('status')] || "",
                colors: (cols[getIdx('colors')] || "").split('/').map(i => i.trim()),
                stock: (cols[getIdx('stock')] || "").split('/').map(i => i.trim()),
                thumbnail: cols[getIdx('thumbnail')] || "",
                details: [cols[getIdx('details1')] || "", cols[getIdx('details2')] || ""]
            };
        }).filter(p => p !== null);

        renderHome();
        setTimeout(() => document.getElementById('loader').classList.add('hide'), 800);
    } catch (err) {
        triggerError("KONEKSI GAGAL!");
    }
}

// 2. RENDER HOME
function renderHome() {
    const container = document.getElementById('product-list');
    if(!container) return;
    container.innerHTML = '';
    products.forEach(p => {
        const isSold = p.badge === 'sold';
        const dpTag = (p.dp > 0) ? `<span style="color:#ffeb3b; font-size:11px;"> (DP ${p.dp/1000}K)</span>` : '';
        container.innerHTML += `
            <div class="card" onclick="${isSold ? 'triggerError(\'STOK HABIS!\')' : `goDetail(${p.id})`}">
                <div class="badge ${p.badge}">${p.status}</div>
                <img src="${p.thumbnail}">
                <div style="padding:20px">
                    <h3 style="margin:0; font-size:18px;">${p.name}</h3>
                    <p style="color:#00c853; font-weight:700; margin:8px 0;">Rp ${p.price.toLocaleString('id-ID')}${dpTag}</p>
                </div>
            </div>`;
    });
}

// 3. DETAIL & OPSI
function goDetail(id) {
    const p = products.find(x => x.id === id);
    cart = { prod: p, size: '', color: p.colors.length === 1 ? p.colors[0] : '' };
    
    document.getElementById('detName').innerText = p.name;
    document.getElementById('detPrice').innerHTML = `Rp ${p.price.toLocaleString('id-ID')} ${(p.dp > 0 ? `<br><small style="color:#fbc02d">DP: Rp ${p.dp.toLocaleString('id-ID')}</small>` : '')}`;
    document.getElementById('detImgs').innerHTML = p.details.filter(i=>i!=="").map(i => `<img src="${i}">`).join('');
    
    let cHTML = `<div class="section-label">PILIH WARNA</div><div class="option-box">`;
    p.colors.forEach(c => cHTML += `<div class="${cart.color === c ? 'active' : ''}" onclick="selOpt('color','${c}',this)">${c}</div>`);
    document.getElementById('colorArea').innerHTML = cHTML + `</div>`;

    let sHTML = `<div class="section-label">PILIH UKURAN</div><div class="option-box">`;
    ["S", "M", "L", "XL", "XXL", "XXXL"].forEach(s => {
        const isAvail = p.stock.includes(s);
        sHTML += `<div class="${isAvail ? '' : 'disabled'}" onclick="${isAvail ? `selOpt('size','${s}',this)` : 'triggerError(\'UKURAN HABIS\')'}">${s}</div>`;
    });
    document.getElementById('sizeArea').innerHTML = sHTML + `</div>`;
    showPage('detail');
}

// 4. EFEK GETAR (VIBRATE) & NAVIGASI
function triggerError(msg) {
    // 1. Getar HP (Haptic)
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Pola getar: getar-diam-getar
    }

    // 2. Getar Layar (Visual)
    const activePage = document.querySelector('.page.active');
    activePage.classList.add('vibrate-screen'); 
    
    // 3. Munculkan Pesan
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');

    setTimeout(() => {
        t.classList.remove('show');
        activePage.classList.remove('vibrate-screen');
    }, 2000);
}

function selOpt(type, val, el) {
    // Getar halus saat pilih ukuran/warna
    if (navigator.vibrate) navigator.vibrate(40); 
    cart[type] = val;
    el.parentElement.querySelectorAll('div').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0,0);
}

function validateDetail() {
    if(!cart.color || !cart.size) return triggerError("PILIH WARNA & UKURAN!");
    showPage('form');
}

function validateForm() {
    const n = document.getElementById('inName').value;
    const p = document.getElementById('inPhone').value;
    const a = document.getElementById('inAddress').value;
    if(!n || !p || !a) return triggerError("LENGKAPI DATA!");
    
    document.getElementById('sumProd').innerText = cart.prod.name;
    document.getElementById('sumVar').innerText = `${cart.color} / SIZE ${cart.size}`;
    document.getElementById('sumPrice').innerText = (cart.prod.dp > 0) ? `DP: Rp ${cart.prod.dp.toLocaleString('id-ID')}` : `Total: Rp ${cart.prod.price.toLocaleString('id-ID')}`;
    document.getElementById('sumCust').innerHTML = `<strong>${n}</strong><br>${p}<br>${a}`;
    showPage('summary');
}

function sendWA() {
    const n = document.getElementById('inName').value;
    const p = document.getElementById('inPhone').value;
    const a = document.getElementById('inAddress').value;
    const dpPesan = (cart.prod.dp > 0) ? `\n*DP: Rp ${cart.prod.dp.toLocaleString('id-ID')}*` : `\n*Status: Lunas*`;
    const text = `*ORDER GLORIAM*\n\nProduk: ${cart.prod.name}\nWarna: ${cart.color}\nSize: ${cart.size}\nTotal: Rp ${cart.prod.price.toLocaleString('id-ID')}${dpPesan}\n\n*Data Pengiriman*\nNama: ${n}\nWA: ${p}\nAlamat: ${a}`;
    window.open(`https://wa.me/6283898588562?text=${encodeURIComponent(text)}`);
}

window.onload = initApp;
