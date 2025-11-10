// app.js

const API_KEY = '7jmUWwXnZZ2zMlgwTATB1l8j01MfB9GH';
const SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';
const UPLOAD_URL = 'https://upload.giphy.com/v1/gifs';

// --- Referencias UI ---
const qInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const gallery = document.getElementById('gallery');
const themeBtn = document.getElementById('themeToggle');
const limitSelect = document.getElementById('limit');
const recBtns = document.querySelectorAll('.rec-btn');

// --- Grabadora ---
const preview = document.getElementById('preview');
const startRec = document.getElementById('startRec');
const stopRec = document.getElementById('stopRec');
const uploadRec = document.getElementById('uploadRec');
const uploadStatus = document.getElementById('uploadStatus');
const recTimer = document.getElementById('recTimer');

let recorder = null;
let mediaStream = null;
let recordedBlob = null;
let timerInterval = null;
let secondsElapsed = 0;

// ========================================================
// ================== TEMA ================================
// ========================================================
function initTheme() {
    const saved = localStorage.getItem('gifos:theme') || 'light';
    document.body.classList.toggle('dark', saved === 'dark');
}
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem(
    'gifos:theme',
    document.body.classList.contains('dark') ? 'dark' : 'light'
    );
});
initTheme();

// ========================================================
// ================== BUSCAR GIFs =========================
// ========================================================
async function searchGifs(query, limit = 24) {
    try {
    gallery.innerHTML = '<p style="grid-column:1/-1">Buscando...</p>';
    const res = await fetch(`${SEARCH_URL}?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}`);
    const data = await res.json();

    // 🔹 Guardar resultados en localStorage
    localStorage.setItem('gifos:lastSearch', JSON.stringify(data.data));

    renderGifs(data.data);
    } catch (e) {
    gallery.innerHTML = `<p style="color:tomato">Error: ${e.message}</p>`;
    }
}

function loadLastSearch() {
    const stored = localStorage.getItem('gifos:lastSearch');
    if (!stored) {
    gallery.innerHTML = '<p>No hay búsquedas recientes.</p>';
    return;
    }
    const gifs = JSON.parse(stored);
    renderGifs(gifs);
}

document.querySelectorAll('a[href="#gallery"]').forEach(link => {
    link.addEventListener('click', e => {
    e.preventDefault();
    loadLastSearch();
    document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
    });
});


function renderGifs(items) {
    if (!items || items.length === 0) {
    gallery.innerHTML = '<p style="grid-column:1/-1">No se encontraron resultados.</p>';
    return;
    }
    gallery.innerHTML = '';
    items.forEach(it => {
    const url = it.images?.downsized_medium?.url || it.images?.original?.url;
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
        <img loading="lazy" src="${url}" alt="${it.title || 'gif'}">
        <div class="meta">
        <span>${(it.title || '—').slice(0, 20)}</span>
        <button data-gif='${encodeURIComponent(url)}'>Guardar</button>
        </div>`;
    gallery.appendChild(card);
    });
}

// ========================================================
// ================ EVENTOS ===============================
searchBtn.addEventListener('click', () => {
    const q = qInput.value.trim();
    if (!q) return;
    searchGifs(q, parseInt(limitSelect.value, 10));
});
qInput.addEventListener('keydown', e => e.key === 'Enter' && searchBtn.click());

// --- Botones recomendados ---
recBtns.forEach(btn =>
    btn.addEventListener('click', e => {
    const term = e.target.dataset.term;
    searchGifs(term, parseInt(limitSelect.value, 10));
    })
);

// ========================================================
// ================== GRABADORA ===========================
// ========================================================
async function startCamera() {
    if (mediaStream) return;
    try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    preview.srcObject = mediaStream;
    } catch (err) {
    console.error('Error al acceder a la cámara', err);
    uploadStatus.textContent = 'Acceso a cámara denegado';
    }
}

function stopCamera() {
    if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
    preview.srcObject = null;
    }
}



function resetTimer() {
    clearInterval(timerInterval);
    secondsElapsed = 0;
    recTimer.textContent = '00:00';
}

function startTimer() {
  resetTimer(); // 🔹 asegúrate de empezar limpio
    timerInterval = setInterval(() => {
    secondsElapsed++;
    const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const s = String(secondsElapsed % 60).padStart(2, '0');
    recTimer.textContent = `${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

startRec.addEventListener('click', async () => {
    await startCamera();
    resetTimer(); // 🔹 reinicia SIEMPRE antes de grabar
    recorder = RecordRTC(mediaStream, { type: 'gif', frameRate: 6, quality: 10, width: 360 });
    recorder.startRecording();

 startTimer(); // 🔹 arranca el cronómetro
    startRec.disabled = true;
    stopRec.disabled = false;
    uploadRec.disabled = true;
    uploadStatus.textContent = '🎥 Grabando...';
});

stopRec.addEventListener('click', () => {
  stopTimer(); // 🔹 detenemos el tiempo inmediatamente

    if (!recorder) return;
        recorder.stopRecording(() => {
        recordedBlob = recorder.getBlob();
        resetTimer(); // 🔹 vuelve a 00:00 tras detener
        stopCamera();
        startRec.disabled = false;
        stopRec.disabled = true;
        uploadRec.disabled = false;
        uploadStatus.textContent = 'Grabación finalizada. 🎬';
        const url = URL.createObjectURL(recordedBlob);
        preview.src = url;
    });
});



uploadRec.addEventListener('click', async () => {
    if (!recordedBlob) {
    uploadStatus.textContent = 'No hay GIF para subir.';
    return;
    }

    uploadStatus.textContent = '⬆️ Subiendo a Giphy...';

    try {
    const form = new FormData();
    form.append('file', recordedBlob, 'miGif.gif');
    const res = await fetch(`${UPLOAD_URL}?api_key=${API_KEY}`, { method: 'POST', body: form });
    const json = await res.json();

    if (json.data?.id) {
        const gifId = json.data.id;
        const gifRes = await fetch(`https://api.giphy.com/v1/gifs/${gifId}?api_key=${API_KEY}`);
        const gifJson = await gifRes.json();
        const gifUrl = gifJson.data?.images?.downsized_medium?.url;

        if (gifUrl) {
        const key = 'gifos:saved';
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.unshift({ url: gifUrl, savedAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(arr.slice(0, 100)));
        }

        uploadStatus.textContent = `✅ GIF subido y guardado (ID: ${gifId})`;
        showToast('🎉 GIF subido y guardado en Mis GIFs');
    } else {
        uploadStatus.textContent = 'Subida completada (sin ID)';
    }
    } catch (e) {
    uploadStatus.textContent = '❌ Error subiendo GIF: ' + e.message;
    }

    recorder = null;
    recordedBlob = null;
});

// ========================================================
// ================== TOAST ===============================
function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.className = 'toast';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
    }, 2500);
}
function loadMyGifs() {
    const cont = document.getElementById('myGifsContainer');
    if (!cont) return;

    const gifs = JSON.parse(localStorage.getItem('gifos:saved') || '[]');
    cont.innerHTML = '';

    if (gifs.length === 0) {
        cont.innerHTML = '<p>No tenés GIFs guardados todavía.</p>';
    return;
    }

    gifs.forEach(g => {
        const img = document.createElement('img');
        img.src = g.url;
        img.alt = 'Mi GIF subido';
    cont.appendChild(img);
    });
}


// Cargar automáticamente al abrir index.html
//window.addEventListener('DOMContentLoaded', loadMyGifs);

// ========================================================
// ================== INICIAL =============================
(async () => {
    await searchGifs('memes', 24);
})();
// ====== Mostrar solo Mis GIFs cuando se hace clic ======
const myGifsLink = document.getElementById('myGifsLink');
if (myGifsLink) {
    myGifsLink.addEventListener('click', e => {
    e.preventDefault();
    gallery.innerHTML = ''; // limpiar galería de búsqueda
    document.getElementById('myGifs').scrollIntoView({ behavior: 'smooth' });
    loadMyGifs(); // cargar los tuyos recién ahora
    });
}
