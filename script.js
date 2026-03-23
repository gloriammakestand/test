const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5wyzEXxKbCeS8SQWZQ7oz5lmPwszeLtW-TuQ5uzCV6GWcXP5IqOzjTqhIRg5yyLuRd86yLtXGMnoL/pub?output=csv'; 

let products = [];
let cart = { prod: null, size: '', color: '' };

// 1. Inisialisasi Aplikasi & Ambil Data dari Google Sheets
async function initApp() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').slice(1); // Lewati baris header
        
        products = rows.map(row => {
            // Regex untuk split koma tanpa merusak data di dalam tanda kutip
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length < 10) return null;

            return {
                id: parseInt(cols[0]),
                name: cols[1].replace(/"/g, "").trim(),
                price: parseInt(cols[2]),
                badge: cols[3].trim(),
                status: cols[4].replace(/"/g, "").trim(),
                // Memisahkan warna & stok menggunakan tanda "/"
                colors: cols[5].replace(/"/g, "").split('/').map(i => i.trim()),
                stock: cols[6].replace(/"/g, "").split('/').map(i => i.trim()),
                thumbnail: cols[7].trim(),
                details: [cols[8].trim(), cols[9].trim()]
            };
        }).filter(p => p !== null);

        renderHome();
        // Hilangkan loader setelah data siap
        setTimeout(() => document.getElementById('loader').classList.add('hide'), 1000);
    } catch (err) {
        console.error("Gagal Sync Database:", err);
        triggerError("KONEKSI DATABASE GAGAL!");
    }
}

// 2. Tampilkan Daftar Produk di Beranda
function renderHome() {
    const container = document.getElementById('product-list');
    if (!container) return;
    container.innerHTML = '';
    products.forEach(p => {
        const isSold = p.badge === 'sold';
        container.innerHTML += `
            <div class="card">
                <div class="badge ${p.badge}">${p.status}</div>
                <img src="${p.thumbnail}" alt="${p.name}">
                <div style="padding:25px">
                    <h3 style="margin:0; font-size:20px;">${p.name}</h3>
                    <p style="opacity:0.5; margin:10px 0 20px;">${isSold ? 'OUT OF STOCK' : 'Rp' + p.price.toLocaleString('id-ID')}</p>
                    <button ${isSold ? 'disabled' : ''} onclick="goDetail(${p.id})">${isSold ? 'HABIS' : 'SELECT'}</button>
                </div>
            </div>`;
    });
}

// 3. Fungsi Navigasi Antar Halaman
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(id).scrollTop = 0;
}

// 4. Logika Halaman Detail Produk
function goDetail(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    
    // Reset pilihan keranjang
    cart = { prod: p, size: '', color: p.colors.length === 1 ? p.colors[0] : '' };
    
    document.getElementById('detName').innerText = p.name;
    document.getElementById('detPrice').innerText = `Rp${p.price.toLocaleString('id-ID')}`;
    document.getElementById('detImgs').innerHTML = p.details.map(img => `<img src="${img}" alt="Detail">`).join('');
    
    // Render Pilihan Warna
    let cHTML = `<div class="section-label">PILIH WARNA</div><div class="option-box">`;
    p.colors.forEach(c => {
        if(c) cHTML += `<div class="${cart.color === c ? 'active' : ''}" onclick="selOpt('color','${c}',this)">${c}</div>`;
    });
    document.getElementById('colorArea').innerHTML = cHTML + `</div>`;

    // Render Pilihan Ukuran (Sesuai Stok di Sheets)
    let sHTML = `<div class="section-label">PILIH UKURAN</div><div class="option-box">`;
    ["S", "M", "L", "XL", "XXL", "XXXL"].forEach(s => {
        const isAvail = p.stock.includes(s);
        sHTML += `<div class="${isAvail ? '' : 'disabled'}" onclick="${isAvail ? `selOpt('size','${s}',this)` : ''}">${s}</div>`;
    });
    document.getElementById('sizeArea').innerHTML = sHTML + `</div>`;
    
    showPage('detail');
}

// Fungsi Memilih Opsi (Warna/Size)
function selOpt(type, val, el) {
    cart[type] = val;
    el.parentElement.querySelectorAll('div').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
}

// 5. Notifikasi Error & Getar (Toast)
function triggerError(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg; 
    t.classList.add('show');
    document.querySelector('.page.active').classList.add('vibrate-screen');
    
    // Fitur getar untuk HP
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    
    setTimeout(() => { 
        t.classList.remove('show'); 
        document.querySelector('.page.active').classList.remove('vibrate-screen'); 
    }, 2500);
}

// 6. Validasi Sebelum Pindah Halaman
function validateDetail() {
    if(!cart.color || !cart.size) return triggerError("PILIH WARNA & UKURAN!");
    showPage('form');
}

function validateForm() {
    const n = document.getElementById('inName').value;
    const p = document.getElementById('inPhone').value;
    const a = document.getElementById('inAddress').value;
    if(!n || !p || !a) return triggerError("LENGKAPI DATA PENGIRIMAN!");
    
    // Isi Summary Page
    document.getElementById('sumProd').innerText = cart.prod.name;
    document.getElementById('sumVar').innerText = `WARNA: ${cart.color} | SIZE: ${cart.size}`;
    document.getElementById('sumPrice').innerText = `Rp${cart.prod.price.toLocaleString('id-ID')}`;
    document.getElementById('sumCust').innerHTML = `<strong>${n}</strong><br>${p}<br>${a}`;
    showPage('summary');
}

// 7. Kirim Data ke WhatsApp
function sendWA() {
    const n = document.getElementById('inName').value;
    const p = document.getElementById('inPhone').value;
    const a = document.getElementById('inAddress').value;
    const text = `*ORDER GLORIAM*\n\nProduk: ${cart.prod.name}\nWarna: ${cart.color}\nSize: ${cart.size}\n\n*Data Pengiriman*\nNama: ${n}\nWhatsApp: ${p}\nAlamat: ${a}`;
    window.open(`https://wa.me/6283898588562?text=${encodeURIComponent(text)}`);
}

// Register PWA Service Worker
if ('serviceWorker' in navigator) { 
    navigator.serviceWorker.register('sw.js'); 
}

// Jalankan App saat halaman siap
window.onload = initApp;
