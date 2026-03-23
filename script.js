const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5wyzEXxKbCeS8SQWZQ7oz5lmPwszeLtW-TuQ5uzCV6GWcXP5IqOzjTqhIRg5yyLuRd86yLtXGMnoL/pub?output=csv'; // MASUKKAN LINK CSV DI SINI

let products = [];
let cart = { prod: null, size: '', color: '' };

// 1. Ambil Data Google Sheets
async function initApp() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').slice(1); 
        
        products = rows.map(row => {
            const cols = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            if (cols.length < 10) return null;
            return {
                id: parseInt(cols[0]),
                name: cols[1].replace(/"/g, "").trim(),
                price: parseInt(cols[2]),
                badge: cols[3].trim(),
                status: cols[4].replace(/"/g, "").trim(),
                colors: cols[5].replace(/"/g, "").split('/').map(i => i.trim()),
                stock: cols[6].replace(/"/g, "").split('/').map(i => i.trim()),
                thumbnail: cols[7].trim(),
                details: [cols[8].trim(), cols[9].trim()]
            };
        }).filter(p => p !== null);

        renderHome();
        document.getElementById('loader').classList.add('hide');
    } catch (err) {
        console.error("Gagal sinkronisasi Sheets", err);
        triggerError("KONEKSI BERMASALAH!");
    }
}

// 2. Render Katalog Beranda
function renderHome() {
    const container = document.getElementById('product-list');
    container.innerHTML = '';
    products.forEach(p => {
        const isSold = p.badge === 'sold';
        container.innerHTML += `
            <div class="card">
                <div class="badge ${p.badge}">${p.status}</div>
                <img src="${p.thumbnail}">
                <div style="padding:20px">
                    <h3 style="margin:0;">${p.name}</h3>
                    <p style="opacity:0.5; margin:10px 0;">${isSold ? 'HABIS' : 'Rp' + p.price.toLocaleString('id-ID')}</p>
                    <button ${isSold ? 'disabled' : ''} onclick="goDetail(${p.id})">${isSold ? 'OUT OF STOCK' : 'PILIH'}</button>
                </div>
            </div>`;
    });
}

// 3. Logika Navigasi & Detail
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(id).scrollTop = 0;
}

function goDetail(id) {
    const p = products.find(x => x.id === id);
    cart = { prod: p, size: '', color: p.colors.length === 1 ? p.colors[0] : '' };
    
    document.getElementById('detName').innerText = p.name;
    document.getElementById('detPrice').innerText = `Rp${p.price.toLocaleString('id-ID')}`;
    document.getElementById('detImgs').innerHTML = p.details.map(img => `<img src="${img}">`).join('');
    
    let cHTML = `<div class="section-label">PILIH WARNA</div><div class="option-box">`;
    p.colors.forEach(c => cHTML += `<div class="${cart.color === c ? 'active' : ''}" onclick="selOpt('color','${c}',this)">${c}</div>`);
    document.getElementById('colorArea').innerHTML = cHTML + `</div>`;

    let sHTML = `<div class="section-label">PILIH UKURAN</div><div class="option-box">`;
    ["S", "M", "L", "XL", "XXL", "XXXL"].forEach(s => {
        const isAvail = p.stock.includes(s);
        sHTML += `<div class="${isAvail ? '' : 'disabled'}" onclick="${isAvail ? `selOpt('size','${s}',this)` : ''}">${s}</div>`;
    });
    document.getElementById('sizeArea').innerHTML = sHTML + `</div>`;
    showPage('detail');
}

function selOpt(type, val, el) {
    cart[type] = val;
    el.parentElement.querySelectorAll('div').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
}

function triggerError(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.classList.add('show');
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
    document.getElementById('sumVar').innerText = `WARNA: ${cart.color} | UKURAN: ${cart.size}`;
    document.getElementById('sumPrice').innerText = `Rp${cart.prod.price.toLocaleString('id-ID')}`;
    document.getElementById('sumCust').innerHTML = `<strong>${n}</strong><br>${p}<br>${a}`;
    showPage('summary');
}

function sendWA() {
    const n = document.getElementById('inName').value;
    const p = document.getElementById('inPhone').value;
    const a = document.getElementById('inAddress').value;
    const text = `*ORDER GLORIAM*\n\nProduk: ${cart.prod.name}\nWarna: ${cart.color}\nUkuran: ${cart.size}\n\n*Penerima*\nNama: ${n}\nWA: ${p}\nAlamat: ${a}`;
    window.open(`https://wa.me/6283898588562?text=${encodeURIComponent(text)}`);
}

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js'); }
window.onload = initApp;
