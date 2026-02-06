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
let trailX = 0, trailY = 0;

document.addEventListener('mousemove', (e) => {
    trailX = e.clientX;
    trailY = e.clientY;
    trail.style.left = trailX - 10 + 'px';
    trail.style.top = trailY - 10 + 'px';
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
    
    // Dopo 4.5 secondi (durata dell'animazione), mostra il video
    setTimeout(() => {
        semiRing.style.display = 'none';
        loadingText.style.display = 'none';
        introVideo.style.display = 'block';
        introVideo.play().catch(e => console.log('Play blocked:', e));
    }, 4500);
});

// Quando il video finisce, mostra la home con dissolvenza
introVideo.addEventListener('ended', () => {
    introVideo.classList.add('fade-out');
    
    setTimeout(() => {
        introScreen.style.display = 'none';
        mainContent.style.display = 'block';
    }, 1500);
});