// delete.js

// ====== Cambiar tema (oscuro / claro) ======
function initTheme() {
    const saved = localStorage.getItem('gifos:theme') || 'light';
    document.body.classList.toggle('dark', saved === 'dark');
}

const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem(
    'gifos:theme',
    document.body.classList.contains('dark') ? 'dark' : 'light'
    );
});

initTheme();

// ====== Cargar GIFs guardados ======
const cont = document.getElementById('deleteContainer');

function loadSavedGifs() {
    const gifs = JSON.parse(localStorage.getItem('gifos:saved') || '[]');
    cont.innerHTML = '';

    if (gifs.length === 0) {
    cont.innerHTML = '<p>No tenés GIFs guardados para eliminar.</p>';
    return;
    }

    gifs.forEach((g, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
        <img src="${g.url}" alt="Mi GIF">
        <button class="delete-btn" data-index="${i}">🗑️</button>
    `;
    cont.appendChild(div);
    });

    // Asignar eventos a cada botón
    document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        const idx = e.target.dataset.index;
        deleteGif(idx);
    });
    });
}

// ====== Eliminar individual ======
function deleteGif(index) {
    const key = 'gifos:saved';
    let gifs = JSON.parse(localStorage.getItem(key) || '[]');
    gifs.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(gifs));
    loadSavedGifs();
    showToast('🗑️ GIF eliminado');
}

// ====== Eliminar todos ======
const clearBtn = document.getElementById('clearAll');
clearBtn.addEventListener('click', () => {
    localStorage.removeItem('gifos:saved');
    loadSavedGifs();
    showToast('🧹 Todos los GIFs eliminados');
});

// ====== Toast ======
function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.className = 'toast';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2000);
}

// ====== Inicial ======
loadSavedGifs();
