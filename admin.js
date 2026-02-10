const loginSection = document.getElementById('admin-login');
const appSection = document.getElementById('admin-app');
const loginForm = document.getElementById('login-form');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('admin-logout');

const productForm = document.getElementById('product-form');
const formTitle = document.getElementById('form-title');
const formCancel = document.getElementById('form-cancel');
const listContainer = document.getElementById('products-list');
const imageUploadBtn = document.getElementById('image-upload-btn');
const imageUploadInput = document.getElementById('product-image-file');
const imageUploadName = document.getElementById('image-upload-name');

const fields = {
    name: document.getElementById('product-name'),
    description: document.getElementById('product-description'),
    price: document.getElementById('product-price'),
    originalPrice: document.getElementById('product-original-price'),
    image: document.getElementById('product-image'),
    badge: document.getElementById('product-badge'),
    status: document.getElementById('product-status'),
    cta: document.getElementById('product-cta'),
    link: document.getElementById('product-link'),
    available: document.getElementById('product-available')
};

let editingId = null;

function setAuth(isAdmin) {
    if (loginSection) {
        loginSection.hidden = isAdmin;
    }
    if (appSection) {
        appSection.hidden = !isAdmin;
    }
    if (logoutBtn) {
        logoutBtn.hidden = !isAdmin;
    }
}

function resetForm() {
    editingId = null;
    formTitle.textContent = 'Aggiungi Prodotto';
    formCancel.hidden = true;
    productForm.reset();
    fields.available.checked = true;
    if (imageUploadName) {
        imageUploadName.textContent = 'Nessun file';
    }
}

function fillForm(product) {
    editingId = product.id;
    formTitle.textContent = 'Modifica Prodotto';
    formCancel.hidden = false;
    fields.name.value = product.name || '';
    fields.description.value = product.description || '';
    fields.price.value = product.price || '';
    fields.originalPrice.value = product.originalPrice || '';
    fields.image.value = product.image || '';
    fields.badge.value = product.badge || '';
    fields.status.value = product.status || '';
    fields.cta.value = product.cta || '';
    fields.link.value = product.link || '';
    fields.available.checked = Boolean(product.available);
    if (imageUploadName) {
        imageUploadName.textContent = product.image ? 'Immagine salvata' : 'Nessun file';
    }
}

function renderProducts(products) {
    if (!listContainer) {
        return;
    }
    listContainer.innerHTML = '';
    products.forEach((product) => {
        const item = document.createElement('div');
        item.className = 'list-item';

        const info = document.createElement('div');
        const title = document.createElement('h3');
        title.textContent = product.name || 'Product';
        const meta = document.createElement('p');
        meta.textContent = `${product.price || '—'} • ${product.available ? 'Disponibile' : 'Non disponibile'}`;
        info.appendChild(title);
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'list-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'admin-btn secondary';
        editBtn.type = 'button';
        editBtn.textContent = 'Modifica';
        editBtn.addEventListener('click', () => fillForm(product));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'admin-btn secondary';
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Elimina';
        deleteBtn.addEventListener('click', async () => {
            if (!confirm(`Eliminare "${product.name}"?`)) {
                return;
            }
            await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
            await loadProducts();
        });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(info);
        item.appendChild(actions);
        listContainer.appendChild(item);
    });
}

async function loadProducts() {
    const res = await fetch('/api/products');
    const data = await res.json();
    renderProducts(Array.isArray(data) ? data : []);
}

async function checkAuth() {
    const res = await fetch('/api/admin/me');
    const data = await res.json();
    setAuth(Boolean(data.isAdmin));
    if (data.isAdmin) {
        await loadProducts();
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loginError.hidden = true;
        const password = loginPassword.value || '';
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (res.ok) {
            loginPassword.value = '';
            await checkAuth();
        } else {
            loginError.hidden = false;
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        resetForm();
        setAuth(false);
    });
}

if (productForm) {
    productForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            name: fields.name.value,
            description: fields.description.value,
            price: fields.price.value,
            originalPrice: fields.originalPrice.value,
            image: fields.image.value,
            badge: fields.badge.value,
            status: fields.status.value,
            cta: fields.cta.value,
            link: fields.link.value,
            available: fields.available.checked
        };

        if (editingId) {
            await fetch(`/api/products/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        resetForm();
        await loadProducts();
    });
}

if (formCancel) {
    formCancel.addEventListener('click', () => {
        resetForm();
    });
}

if (imageUploadBtn && imageUploadInput) {
    imageUploadBtn.addEventListener('click', () => {
        imageUploadInput.click();
    });
}

if (imageUploadInput) {
    imageUploadInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }
        if (imageUploadName) {
            imageUploadName.textContent = file.name;
        }
        const reader = new FileReader();
        reader.onload = () => {
            fields.image.value = String(reader.result || '');
        };
        reader.readAsDataURL(file);
    });
}

// Stars + cursor (admin)
const trail = document.getElementById('trail');
const customCursor = document.getElementById('custom-cursor');

document.addEventListener('mousemove', (e) => {
    if (trail) {
        trail.style.left = `${e.clientX}px`;
        trail.style.top = `${e.clientY}px`;
    }
    if (customCursor) {
        customCursor.style.left = `${e.clientX}px`;
        customCursor.style.top = `${e.clientY}px`;
    }
});

const bg = document.querySelector('.bg-gradients');
if (bg) {
    const canvas = document.createElement('canvas');
    canvas.className = 'bg-stars-canvas';
    bg.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const stars = [];
    const starCount = 140;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(bg.clientWidth * dpr);
        canvas.height = Math.floor(bg.clientHeight * dpr);
        canvas.style.width = `${bg.clientWidth}px`;
        canvas.style.height = `${bg.clientHeight}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initStars = () => {
        stars.length = 0;
        for (let i = 0; i < starCount; i += 1) {
            stars.push({
                x: Math.random() * bg.clientWidth,
                y: Math.random() * bg.clientHeight,
                r: Math.random() * 1.6 + 0.6,
                tw: Math.random() * 1.4 + 0.6,
                sp: Math.random() * 0.5 + 0.2,
                ph: Math.random() * Math.PI * 2,
                dx: (Math.random() * 0.5 - 0.25),
                dy: (Math.random() * 0.5 - 0.25)
            });
        }
    };

    const draw = (t) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const width = bg.clientWidth;
        const height = bg.clientHeight;
        const time = t * 0.001;

        for (const s of stars) {
            const twinkle = 0.25 + s.tw * (0.5 + 0.5 * Math.sin(time * s.sp + s.ph));
            const x = (s.x + s.dx * time * 12) % width;
            const y = (s.y + s.dy * time * 12) % height;
            const px = x < 0 ? x + width : x;
            const py = y < 0 ? y + height : y;

            ctx.globalAlpha = Math.min(1, twinkle);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, s.r, 0, Math.PI * 2);
            ctx.fill();

            const dx = mouse.x - px;
            const dy = mouse.y - py;
            const dist = Math.hypot(dx, dy);
            if (dist < 140) {
                const alpha = (1 - dist / 140) * 0.55;
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        requestAnimationFrame(draw);
    };

    const onMouseMove = (e) => {
        const rect = bg.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    };

    const onMouseLeave = () => {
        mouse.x = -9999;
        mouse.y = -9999;
    };

    resize();
    initStars();
    window.addEventListener('resize', () => {
        resize();
        initStars();
    });
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    requestAnimationFrame(draw);
}

checkAuth();
