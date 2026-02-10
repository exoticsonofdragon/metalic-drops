let performanceMode = false;
const performanceStorageKey = 'performanceMode';
const performanceToggle = document.getElementById('performance-toggle');
let startStarsAnimation = null;
let updateStarsTheme = null;

// Animated tab title (fake marquee)
const titleBase = 'Metalic Drops Marketplace • Powered by not.exotic.ton • ';
let titleOffset = 0;
setInterval(() => {
    titleOffset = (titleOffset + 1) % titleBase.length;
    document.title = titleBase.slice(titleOffset) + titleBase.slice(0, titleOffset);
}, 220);

let themeLight = false;
const themeStorageKey = 'themeMode';
const themeToggle = document.getElementById('theme-toggle');

function applyThemeMode(isLight) {
    themeLight = isLight;
    document.body.classList.toggle('theme-light', isLight);
    if (themeToggle) {
        themeToggle.setAttribute('aria-pressed', String(isLight));
    }
    if (typeof updateStarsTheme === 'function') {
        updateStarsTheme();
    }
}

function setThemeMode(isLight) {
    applyThemeMode(isLight);
    try {
        localStorage.setItem(themeStorageKey, isLight ? '1' : '0');
    } catch (err) {
        // ignore storage failures
    }
}

try {
    const savedTheme = localStorage.getItem(themeStorageKey) === '1';
    applyThemeMode(savedTheme);
} catch (err) {
    applyThemeMode(false);
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        setThemeMode(!themeLight);
    });
}

function applyPerformanceMode(enabled) {
    performanceMode = enabled;
    document.body.classList.toggle('performance-mode', enabled);
    if (performanceToggle) {
        performanceToggle.classList.toggle('active', enabled);
        performanceToggle.setAttribute('aria-pressed', String(enabled));
    }

    if (enabled) {
        document.querySelectorAll('.feature-card, .product-card, .review-card').forEach(card => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    } else if (typeof startStarsAnimation === 'function') {
        startStarsAnimation();
    }
}

function setPerformanceMode(enabled) {
    applyPerformanceMode(enabled);
    try {
        localStorage.setItem(performanceStorageKey, enabled ? '1' : '0');
    } catch (err) {
        // ignore storage failures
    }
}

try {
    const savedPerformance = localStorage.getItem(performanceStorageKey) === '1';
    applyPerformanceMode(savedPerformance);
} catch (err) {
    applyPerformanceMode(false);
}

if (performanceToggle) {
    performanceToggle.addEventListener('click', () => {
        setPerformanceMode(!performanceMode);
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) {
            return;
        }
        target.scrollIntoView({
            behavior: performanceMode ? 'auto' : 'smooth'
        });
    });
});

// Add fade-in animation on scroll
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

function setupRevealCards(cards) {
    cards.forEach(card => {
        if (performanceMode) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            card.style.transition = 'none';
            return;
        }
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s, transform 0.6s';
        observer.observe(card);
    });
}

setupRevealCards(document.querySelectorAll('.feature-card, .review-card'));

// Button hover effects
document.querySelectorAll('.btn-buy, .btn-primary, .btn-secondary').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
        btn.style.animation = 'pulse 1s infinite';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.animation = '';
    });
});

// Keyframes for pulse (added via JS for simplicity)
const style = document.createElement('style');
style.textContent = `
@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}
`;
document.head.appendChild(style);

// Mouse trail
const trail = document.getElementById('trail');
const customCursor = document.getElementById('custom-cursor');
let trailX = 0, trailY = 0;
let mouseActive = false;

document.addEventListener('mousemove', (e) => {
    if (performanceMode) {
        return;
    }
    trailX = e.clientX;
    trailY = e.clientY;
    mouseActive = true;
    trail.style.left = trailX + 'px';
    trail.style.top = trailY + 'px';
    if (customCursor) {
        customCursor.style.left = trailX + 'px';
        customCursor.style.top = trailY + 'px';
    }
});

document.addEventListener('mouseleave', () => {
    mouseActive = false;
});

// Background stars + mouse rays
const bg = document.querySelector('.bg-gradients');
if (bg) {
    const canvas = document.createElement('canvas');
    canvas.className = 'bg-stars-canvas';
    bg.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const stars = [];
    let starsAnimationId = null;
    const starCount = 160;
    const blueStarCount = 8;
    const mouse = { x: -9999, y: -9999 };
    let scrollOffset = 0;
    let scrollVelocity = 0;
    let lastWheelTs = 0;

    const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(bg.clientWidth * dpr);
        canvas.height = Math.floor(bg.clientHeight * dpr);
        canvas.style.width = `${bg.clientWidth}px`;
        canvas.style.height = `${bg.clientHeight}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const getStarTint = (isBlue) => {
        if (themeLight) {
            return 'rgba(0, 0, 0, 0.85)';
        }
        return isBlue ? 'rgba(90, 170, 255, 0.95)' : '#ffffff';
    };

    const getRayColor = () => (themeLight ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)');

    const initStars = () => {
        stars.length = 0;
        for (let i = 0; i < starCount + blueStarCount; i++) {
            const isBlue = i < blueStarCount;
            stars.push({
                x: Math.random() * bg.clientWidth,
                y: Math.random() * bg.clientHeight,
                tint: getStarTint(isBlue),
                ax: Math.random() * 10 + 4,
                ay: Math.random() * 10 + 4,
                ax2: Math.random() * 6 + 2,
                ay2: Math.random() * 6 + 2,
                r: Math.random() * 1.6 + 0.7,
                tw: Math.random() * 1.4 + 0.6,
                sp: Math.random() * 0.4 + 0.2,
                ph: Math.random() * Math.PI * 2,
                dx: (Math.random() * 0.5 - 0.25),
                dy: (Math.random() * 0.5 - 0.25),
                isBlue
            });
        }
    };

    updateStarsTheme = () => {
        stars.forEach((star) => {
            star.tint = getStarTint(star.isBlue);
        });
    };

    const draw = (t) => {
        if (performanceMode) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            starsAnimationId = null;
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const width = bg.clientWidth;
        const height = bg.clientHeight;
        const time = t * 0.001;
        const ambientX = Math.sin(time * 0.12) * 8 + Math.sin(time * 0.04 + 1.2) * 6;
        const ambientY = Math.cos(time * 0.1) * 6 + Math.sin(time * 0.05 + 0.7) * 5;

        scrollOffset += scrollVelocity;
        scrollVelocity *= 0.9;

        for (const s of stars) {
            const twinkle = 0.25 + s.tw * (0.5 + 0.5 * Math.sin(time * s.sp + s.ph));
            const waveX = Math.sin(time * 0.6 + s.ph) * s.ax + Math.sin(time * 0.18 + s.ph * 0.7) * s.ax2;
            const waveY = Math.cos(time * 0.5 + s.ph) * s.ay + Math.sin(time * 0.22 + s.ph * 1.3) * s.ay2;
            const x = (s.x + s.dx * time * 12 + waveX + ambientX) % width;
            const y = (s.y + s.dy * time * 12 + waveY + ambientY + scrollOffset) % height;
            const px = x < 0 ? x + width : x;
            const py = y < 0 ? y + height : y;

            ctx.globalAlpha = Math.min(1, twinkle);
            ctx.fillStyle = s.tint;
            ctx.beginPath();
            ctx.arc(px, py, s.r, 0, Math.PI * 2);
            ctx.fill();

            const dx = mouse.x - px;
            const dy = mouse.y - py;
            const dist = Math.hypot(dx, dy);
            if (dist < 140) {
                const alpha = (1 - dist / 140) * 0.65;
                ctx.globalAlpha = alpha;
            ctx.strokeStyle = getRayColor();
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        starsAnimationId = requestAnimationFrame(draw);
    };

    const onMouseMove = (e) => {
        if (performanceMode) {
            return;
        }
        const rect = bg.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    };

    const onMouseLeave = () => {
        mouse.x = -9999;
        mouse.y = -9999;
    };

    const onWheel = (e) => {
        if (performanceMode) {
            return;
        }
        const now = performance.now();
        if (now - lastWheelTs > 16) {
            scrollVelocity += e.deltaY * 0.12;
            lastWheelTs = now;
        }
    };

    resize();
    initStars();
    window.addEventListener('resize', () => {
        resize();
        initStars();
    });
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('wheel', onWheel, { passive: true });
    startStarsAnimation = () => {
        if (starsAnimationId || performanceMode) {
            return;
        }
        starsAnimationId = requestAnimationFrame(draw);
    };

    startStarsAnimation();
}

// Contact now button (delegated for dynamic products)
document.addEventListener('click', (event) => {
    const target = event.target.closest('.contact-now');
    if (!target) {
        return;
    }
    const link = target.getAttribute('data-link');
    if (link) {
        window.open(link, '_blank', 'noopener');
    }
});

// Join modal (navbar)
const discordBtn = document.querySelector('.navbar .btn-discord');
const joinModal = document.getElementById('join-modal');
const joinModalClose = document.querySelector('.modal-close');

function setJoinModal(open) {
    if (!joinModal) {
        return;
    }
    joinModal.classList.toggle('open', open);
    joinModal.setAttribute('aria-hidden', String(!open));
}

if (discordBtn) {
    discordBtn.addEventListener('click', () => setJoinModal(true));
}

if (joinModalClose) {
    joinModalClose.addEventListener('click', () => setJoinModal(false));
}

if (joinModal) {
    joinModal.addEventListener('click', (e) => {
        if (e.target === joinModal) {
            setJoinModal(false);
        }
    });
}

// Discord login (mock UI)
const discordLoginBtn = document.getElementById('discord-login-btn');
const discordUserBtn = document.getElementById('discord-user-btn');
const discordLogoutBtn = document.getElementById('discord-logout-btn');
const profileModal = document.getElementById('discord-profile-modal');
const profileClose = document.getElementById('profile-close');
const profileLogout = document.getElementById('profile-logout-btn');
const logoutConfirmModal = document.getElementById('logout-confirm-modal');
const logoutClose = document.getElementById('logout-close');
const logoutCancel = document.getElementById('logout-cancel-btn');
const logoutConfirm = document.getElementById('logout-confirm-btn');

const discordAvatar = document.getElementById('discord-avatar');
const discordUsername = document.getElementById('discord-username');
const profileAvatar = document.getElementById('profile-avatar');
const profileTitle = document.getElementById('profile-title');
const profileHandle = document.getElementById('profile-handle');
const profileStatus = document.getElementById('profile-status');
const profileBio = document.getElementById('profile-bio');
const profileStatusDetail = document.getElementById('profile-status-detail');
const profileLastOnline = document.getElementById('profile-last-online');
const profileCreated = document.getElementById('profile-created');

function applyDiscordProfile(user) {
    const data = user || {};
    const initials = data.initials || '';
    const avatarUrl = data.avatarUrl || '';

    if (discordAvatar) {
        discordAvatar.textContent = avatarUrl ? '' : initials;
        discordAvatar.style.backgroundImage = avatarUrl ? `url(${avatarUrl})` : '';
        discordAvatar.style.backgroundSize = avatarUrl ? 'cover' : '';
        discordAvatar.style.backgroundPosition = avatarUrl ? 'center' : '';
    }
    if (discordUsername) {
        discordUsername.textContent = data.username || '';
    }
    if (profileAvatar) {
        profileAvatar.textContent = avatarUrl ? '' : initials;
        profileAvatar.style.backgroundImage = avatarUrl ? `url(${avatarUrl})` : '';
        profileAvatar.style.backgroundSize = avatarUrl ? 'cover' : '';
        profileAvatar.style.backgroundPosition = avatarUrl ? 'center' : '';
    }
    if (profileTitle) {
        profileTitle.textContent = data.displayName || data.username || '';
    }
    if (profileHandle) {
        profileHandle.textContent = data.username || '';
    }
    if (profileStatus) {
        profileStatus.textContent = data.status || 'Unknown';
    }
    if (profileStatusDetail) {
        profileStatusDetail.textContent = data.status || 'Unknown';
    }
    if (profileBio) {
        profileBio.textContent = data.bio || '';
    }
    if (profileLastOnline) {
        profileLastOnline.textContent = data.lastOnline || 'Not available';
    }
    if (profileCreated) {
        profileCreated.textContent = data.createdAt || '';
    }
}

function clearDiscordProfile() {
    applyDiscordProfile({
        displayName: '',
        username: '',
        initials: '',
        status: 'Unknown',
        bio: '',
        role: '',
        lastOnline: 'Not available',
        createdAt: '',
        avatarUrl: ''
    });
}

function setDiscordLoggedIn(isLoggedIn, user) {
    if (discordLoginBtn) {
        discordLoginBtn.hidden = isLoggedIn;
    }
    if (discordUserBtn) {
        discordUserBtn.hidden = !isLoggedIn;
    }
    if (discordLogoutBtn) {
        discordLogoutBtn.hidden = !isLoggedIn;
    }
    if (isLoggedIn) {
        applyDiscordProfile(user);
    } else {
        clearDiscordProfile();
        setProfileModal(false);
    }
}

function setProfileModal(open) {
    if (!profileModal) {
        return;
    }
    profileModal.classList.toggle('open', open);
    profileModal.setAttribute('aria-hidden', String(!open));
    if (discordUserBtn) {
        discordUserBtn.setAttribute('aria-expanded', String(open));
    }
}

function setLogoutConfirm(open) {
    if (!logoutConfirmModal) {
        return;
    }
    logoutConfirmModal.classList.toggle('open', open);
    logoutConfirmModal.setAttribute('aria-hidden', String(!open));
}

function doLogout() {
    fetch('/logout', { method: 'POST' }).finally(() => {
        setLogoutConfirm(false);
        setProfileModal(false);
        setDiscordLoggedIn(false);
    });
}

if (discordLoginBtn) {
    discordLoginBtn.addEventListener('click', () => {
        window.location.href = '/auth/discord';
    });
}

if (discordUserBtn) {
    discordUserBtn.addEventListener('click', () => setProfileModal(true));
}

if (discordLogoutBtn) {
    discordLogoutBtn.addEventListener('click', () => {
        setLogoutConfirm(true);
    });
}

if (profileClose) {
    profileClose.addEventListener('click', () => setProfileModal(false));
}

if (profileLogout) {
    profileLogout.addEventListener('click', () => {
        setLogoutConfirm(true);
    });
}

if (profileModal) {
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            setProfileModal(false);
        }
    });
}

if (logoutClose) {
    logoutClose.addEventListener('click', () => setLogoutConfirm(false));
}

if (logoutCancel) {
    logoutCancel.addEventListener('click', () => setLogoutConfirm(false));
}

if (logoutConfirm) {
    logoutConfirm.addEventListener('click', () => doLogout());
}

if (logoutConfirmModal) {
    logoutConfirmModal.addEventListener('click', (e) => {
        if (e.target === logoutConfirmModal) {
            setLogoutConfirm(false);
        }
    });
}

fetch('/api/me', { credentials: 'include' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
        if (data && data.user) {
            setDiscordLoggedIn(true, data.user);
            skipIntroScreen();
        } else {
            setDiscordLoggedIn(false);
        }
    })
    .catch(() => {
        setDiscordLoggedIn(false);
    });

function skipIntroScreen() {
    if (introVideo) {
        introVideo.pause();
        introVideo.currentTime = 0;
        introVideo.style.display = 'none';
    }
    if (introScreen) {
        introScreen.style.display = 'none';
    }
    if (mainContent) {
        mainContent.style.display = 'block';
    }
}

// Home "Join Discord" direct link
const heroJoinBtn = document.querySelector('.hero .btn-secondary');
if (heroJoinBtn) {
    heroJoinBtn.addEventListener('click', () => {
        window.open('https://discord.gg/aTr2MsSVw5', '_blank');
    });
}

// Shop now -> products
const shopNowBtn = document.querySelector('.btn-primary');
const productsSection = document.getElementById('products');
const productGrid = document.getElementById('product-grid');
const favoriteItems = new Set();

function buildProductCard(product) {
    const card = document.createElement('div');
    card.className = `product-card ${product.available ? 'available' : 'out-of-stock'}`;

    const imageWrap = document.createElement('div');
    imageWrap.className = 'product-image';
    const img = document.createElement('img');
    const rawImage = String(product.image || '').trim();
    const isAbsolute = /^https?:\/\//i.test(rawImage) || rawImage.startsWith('data:') || rawImage.startsWith('/');
    img.src = rawImage ? (isAbsolute ? rawImage : `/${rawImage}`) : '';
    img.alt = product.imageAlt || product.name || 'Product';
    imageWrap.appendChild(img);
    card.appendChild(imageWrap);

    const heart = document.createElement('button');
    heart.className = 'fav-heart';
    heart.setAttribute('aria-label', 'Add to favorites');
    heart.dataset.product = product.name || 'Prodotto';
    const isFav = favoriteItems.has(heart.dataset.product);
    heart.textContent = isFav ? '♥' : '♡';
    if (isFav) {
        heart.classList.add('active');
    }
    card.appendChild(heart);

    if (product.badge) {
        const badge = document.createElement('span');
        badge.className = 'discount-badge';
        badge.textContent = product.badge;
        card.appendChild(badge);
    }

    const title = document.createElement('h3');
    title.textContent = product.name || 'Product';
    card.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = product.description || '';
    card.appendChild(desc);

    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = product.price || '—';
    if (product.originalPrice) {
        const original = document.createElement('span');
        original.className = 'original-price';
        original.textContent = product.originalPrice;
        price.appendChild(original);
    }
    card.appendChild(price);

    const status = document.createElement('span');
    status.className = `status ${product.available ? 'available' : 'out-of-stock'}`;
    status.textContent = product.status || (product.available ? 'Available' : 'Out of stock');
    card.appendChild(status);

    const button = document.createElement('button');
    button.className = 'btn-buy';
    button.textContent = product.cta || 'Buy Now';
    if (!product.available) {
        button.classList.add('disabled');
        button.disabled = true;
    }
    if (product.link) {
        button.classList.add('contact-now');
        button.setAttribute('data-link', product.link);
    }
    card.appendChild(button);

    return card;
}

function renderProducts(products) {
    if (!productGrid) {
        return;
    }
    productGrid.innerHTML = '';
    products.forEach((product) => {
        productGrid.appendChild(buildProductCard(product));
    });
    setupRevealCards(productGrid.querySelectorAll('.product-card'));
}

async function loadProducts() {
    if (!productGrid) {
        return;
    }
    try {
        const res = await fetch('/api/products');
        if (!res.ok) {
            throw new Error('Products fetch failed');
        }
        const products = await res.json();
        if (Array.isArray(products) && products.length > 0) {
            renderProducts(products);
            return;
        }
    } catch (err) {
        // fallback to existing markup
    }
    setupRevealCards(productGrid.querySelectorAll('.product-card'));
}

loadProducts();
if (shopNowBtn && productsSection) {
    shopNowBtn.addEventListener('click', () => {
        productsSection.scrollIntoView({ behavior: performanceMode ? 'auto' : 'smooth' });
    });
}

// Favorites
const favoritesBtn = document.querySelector('.btn-favorites');
const favoritesPanel = document.getElementById('favorites-panel');
const favoritesList = document.getElementById('favorites-list');
const favoritesEmpty = document.getElementById('favorites-empty');
const favoritesCount = document.getElementById('favorites-count');
const favoritesClose = document.querySelector('.favorites-close');

function renderFavorites() {
    if (!favoritesList || !favoritesEmpty) {
        return;
    }
    favoritesList.innerHTML = '';
    if (favoritesCount) {
        favoritesCount.textContent = String(favoriteItems.size);
    }
    if (favoriteItems.size === 0) {
        favoritesEmpty.style.display = 'block';
        return;
    }
    favoritesEmpty.style.display = 'none';
    favoriteItems.forEach((name) => {
        const li = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = name;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'favorites-remove';
        removeBtn.textContent = 'Rimuovi';
        removeBtn.addEventListener('click', () => {
            favoriteItems.delete(name);
            const heart = document.querySelector(`.fav-heart[data-product="${CSS.escape(name)}"]`);
            if (heart) {
                heart.classList.remove('active');
                heart.textContent = '♡';
            }
            renderFavorites();
        });
        li.appendChild(label);
        li.appendChild(removeBtn);
        favoritesList.appendChild(li);
    });
}

function setFavoritesOpen(isOpen) {
    if (!favoritesPanel) {
        return;
    }
    favoritesPanel.classList.toggle('open', isOpen);
    if (favoritesBtn) {
        favoritesBtn.setAttribute('aria-expanded', String(isOpen));
    }
    favoritesPanel.setAttribute('aria-hidden', String(!isOpen));
}

if (favoritesBtn && favoritesPanel) {
    favoritesBtn.addEventListener('click', () => {
        const isOpen = favoritesPanel.classList.contains('open');
        setFavoritesOpen(!isOpen);
    });
}

if (favoritesClose) {
    favoritesClose.addEventListener('click', () => setFavoritesOpen(false));
}

document.addEventListener('click', (e) => {
    if (!favoritesPanel || !favoritesBtn) {
        return;
    }
    if (!favoritesPanel.classList.contains('open')) {
        return;
    }
    const target = e.target;
    if (favoritesPanel.contains(target) || favoritesBtn.contains(target)) {
        return;
    }
    setFavoritesOpen(false);
});

document.addEventListener('click', (event) => {
    const heart = event.target.closest('.fav-heart');
    if (!heart) {
        return;
    }
    const name = heart.getAttribute('data-product') || 'Prodotto';
    const isActive = heart.classList.toggle('active');
    heart.textContent = isActive ? '♥' : '♡';
    if (isActive) {
        favoriteItems.add(name);
    } else {
        favoriteItems.delete(name);
    }
    renderFavorites();
});

// Intro screen
const introScreen = document.getElementById('intro-screen');
const verifyBtn = document.getElementById('verify-btn');
const mainContent = document.getElementById('main-content');
const ledOrbit = document.querySelector('.led-orbit');
const loadingText = document.getElementById('loading-text');
const introVideo = document.getElementById('intro-video');
const humanCheck = document.getElementById('human-check');
const verifyTitle = humanCheck ? humanCheck.querySelector('h2') : null;

verifyBtn.addEventListener('click', () => {
    verifyBtn.style.display = 'none';
    if (verifyTitle) {
        verifyTitle.style.display = 'none';
    }
    if (ledOrbit) {
        ledOrbit.style.display = 'block';
    }
    loadingText.style.display = 'block';
    
    // Dopo 2.5 secondi (durata dell'animazione), mostra il video
    setTimeout(() => {
        if (humanCheck) {
            humanCheck.style.display = 'none';
        }
        introVideo.style.display = 'block';
        introVideo.play().catch(e => console.log('Play blocked:', e));
    }, 2500);
});

// Quando il video finisce, mostra la home con dissolvenza
introVideo.addEventListener('ended', () => {
    introVideo.classList.add('fade-out');
    
    setTimeout(() => {
        introScreen.style.display = 'none';
        mainContent.style.display = 'block';
    }, 1500);
});
