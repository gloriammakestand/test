const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5wyzEXxKbCeS8SQWZQ7oz5lmPwszeLtW-TuQ5uzCV6GWcXP5IqOzjTqhIRg5yyLuRd86yLtXGMnoL/pub?output=csv'; 

let products = [];
let cart = { prod: null, size: '', color: '' };

// 1. Ambil Data & Deteksi Kolom Otomatis
async function initApp() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        
        // Membaca header (Baris 1) dan merapikannya
        const header = rows[0].split(',').map(h => h.trim().toLowerCase());
        const getIdx = (name) => header.indexOf(name);

        products = rows.slice(1).map(row => {
            // Regex agar koma di dalam tanda kutip tidak memecah kolom
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length < 5) return null;

            // Logika Ambil DP: Jika kolom 'dp' ada dan berisi angka, ambil nilainya.
            const dpIdx = getIdx('dp');
            const dpVal = (dpIdx !== -1 && cols[dpIdx]) ? parseInt(cols[dpIdx].replace(/[^\d]/g, "")) : 0;

            return {
                id: parseInt(cols[getIdx('id')]),
                name: cols[getIdx('name')].replace(/"/g, "").trim(),
                price: parseInt(cols[getIdx('price')].replace(/[^\d]/g, "")),
                dp: dpVal,
                badge: cols[getIdx('badge')].trim(),
                status: cols[getIdx('status')].replace(/"/g, "").trim(),
                colors: cols[getIdx('colors')].replace(/"/g, "").split('/').map(i => i.trim()),
                stock: cols[getIdx('stock')].replace(/"/g, "").split('/').map(i => i.trim()),
                thumbnail: cols[getIdx('thumbnail')].trim(),
                details: [cols[getIdx('details1')].trim(), cols[getIdx('details2')].trim()]
            };
        }).filter(p => p !== null);

        renderHome();
        setTimeout(() => document.getElementById('loader').classList.add('hide'), 1000);
    } catch (err) {
        console.error("Error Sync:", err);
        triggerError("GAGAL SYNC DATABASE!");
    }
}

// 2. Render Katalog di Beranda
function renderHome() {
    const container = document.getElementById('product-list');
    if (!container) return;
    container.innerHTML = '';
    
    products.forEach(p => {
        const isSold = p.badge === 'sold';
        // Label DP hanya muncul jika nilai DP > 0 (untuk Pre-Order)
        const dpLabel = (p.dp > 0) ? `<span style="color:#ffeb3b; font-size:12px; font-weight:700;"> (DP ${p.dp/1000}K)</span>` : '';
        
        container.innerHTML += `
            <div class="card">
                <div class="badge ${p.badge}">${p.status}</div>
                <img src="${p.thumbnail}" alt="${p.name}">
                <div style="padding:25px">
                    <h3 style="margin:0; font-size:20px; letter-spacing:1px;">${p.name}</h3>
                    <p style="opacity:0.6; margin:10px 0 20px; font-weight:600;">
                        ${isSold ? 'OUT OF STOCK' : 'Rp ' + p.price.toLocaleString('id-ID') + dpLabel}
                    </p>
                    <button ${isSold ? 'disabled' : ''} onclick="goDetail(${p.id})">${isSold ? 'HABIS' : 'SELECT'}</button>
                </div>
            </div>`;
    });
}

// 3. Logika Halaman Detail
function goDetail(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    
    cart = { prod: p, size: '', color: p.colors.length === 1 ? p.colors[0] : '' };
    
    // Tampilan DP di Detail
    const dpInfo = (p.dp > 0) ? `<br><span style="color:#ffeb3b; font-size:14px;">Minimal DP: Rp ${p.dp.toLocaleString('id-ID')}</span>` : '';
    
    document.getElementById('detName').innerText = p.name;
    document.getElementById('detPrice').innerHTML = `Rp ${p.price.toLocaleString('id-ID')}${dpInfo}`;
    document.getElementById('detImgs').innerHTML = p.details.map(img => `<img src="${img}">`).join('');
    
    // Render Warna
    let cHTML = `<div class="section-label">PILIH WARNA</div><div class="option-box">`;
    p.colors.forEach(c => cHTML += `<div class="${cart.color === c ? 'active' : ''}" onclick="selOpt('color','${c}',this)">${c}</div>`);
    document.getElementById('colorArea').innerHTML = cHTML + `</div>`;

    // Render Ukuran
    let sHTML = `<div class="section-label">PILIH UKURAN</div><div class="option-box">`;
    ["S", "M", "L", "XL", "XXL", "XXXL"].forEach(s => {
        const isAvail = p.stock.includes(s);
        sHTML += `<div class="${isAvail ? '' : 'disabled'}" onclick="${isAvail ? `selOpt('size','${s}',this)` : ''}">${s}</div>`;
    });
    document.getElementById('sizeArea').innerHTML = sHTML + `</div>`;
    
    showPage('detail');
}

// 4. Fungsi UI & Navigasi
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(id).scrollTop = 0;
}

function selOpt(type, val, el) {
    cart[type] = val;
    el.parentElement.querySelectorAll('div').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
}

function triggerError(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.classList.add('show');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => t.classList.remove('show'), 2500);
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
    document.getElementById('sumVar').innerText = `WARNA: ${cart.color} | SIZE: ${cart.size}`;
    
    // Tampilan tagihan di Summary
    const tagihan = (cart.prod.dp > 0) ? `DP: Rp ${cart.prod.dp.toLocaleString('id-ID')}` : `Total: Rp ${cart.prod.price.toLocaleString('id-ID')}`;
    document.getElementById('sumPrice').innerText = tagihan;
    document.getElementById('sumCust').innerHTML = `<strong>${n}</strong><br>${p}<br>${a}`;
    showPage('summary');
}

// 5. Checkout WhatsApp
function sendWA() {
    const n = document.getElementById('inName').value;
    const p = document.getElementById('inPhone').value;
    const a = document.getElementById('inAddress').value;
    const dpWA = (cart.prod.dp > 0) ? `\n*DP: Rp ${cart.prod.dp.toLocaleString('id-ID')}*` : `\n*Status: Lunas*`;
    
    const text = `*ORDER GLORIAM*\n\nProduk: ${cart.prod.name}\nWarna: ${cart.color}\nSize: ${cart.size}\nHarga: Rp ${cart.prod.price.toLocaleString('id-ID')}${dpWA}\n\n*Data Pengiriman*\nNama: ${n}\nWA: ${p}\nAlamat: ${a}`;
    window.open(`https://wa.me/6283898588562?text=${encodeURIComponent(text)}`);
}

// PWA Service Worker
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }
window.onload = initApp;
