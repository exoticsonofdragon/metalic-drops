// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
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

document.querySelectorAll('.feature-card, .product-card, .review-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s, transform 0.6s';
    observer.observe(card);
});

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

document.addEventListener('mousemove', (e) => {
    trailX = e.clientX;
    trailY = e.clientY;
    trail.style.left = trailX - 10 + 'px';
    trail.style.top = trailY - 10 + 'px';
    if (customCursor) {
        customCursor.style.left = trailX + 'px';
        customCursor.style.top = trailY + 'px';
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
if (shopNowBtn && productsSection) {
    shopNowBtn.addEventListener('click', () => {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    });
}

// Favorites
const favoritesBtn = document.querySelector('.btn-favorites');
const favoritesPanel = document.getElementById('favorites-panel');
const favoritesList = document.getElementById('favorites-list');
const favoritesEmpty = document.getElementById('favorites-empty');
const favoritesCount = document.getElementById('favorites-count');
const favoritesClose = document.querySelector('.favorites-close');
const favoriteItems = new Set();

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

document.querySelectorAll('.fav-heart').forEach((heart) => {
    heart.addEventListener('click', () => {
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
});

// Intro screen
const introScreen = document.getElementById('intro-screen');
const verifyBtn = document.getElementById('verify-btn');
const mainContent = document.getElementById('main-content');
const semiRing = document.querySelector('.semi-ring');
const loadingText = document.getElementById('loading-text');
const introVideo = document.getElementById('intro-video');

verifyBtn.addEventListener('click', () => {
    verifyBtn.style.display = 'none';
    semiRing.style.display = 'block';
    loadingText.style.display = 'block';
    
    // Dopo 2.5 secondi (durata dell'animazione), mostra il video
    setTimeout(() => {
        semiRing.style.display = 'none';
        loadingText.style.display = 'none';
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
