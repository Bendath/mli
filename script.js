/* ========================================
   MLI Artist — Main JavaScript
   "Varm Stue" Edition
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- Navigation scroll effect ---
    const nav = document.querySelector('.nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // --- Mobile menu toggle ---
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        // Close menu on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // --- Scroll fade-in animation (with stagger support) ---
    const fadeEls = document.querySelectorAll('.fade-in');
    if (fadeEls.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        fadeEls.forEach(el => observer.observe(el));
    }

    // --- Gallery items: staggered fade-in + add fade-in class ---
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach((item, i) => {
        item.classList.add('fade-in');
        item.style.setProperty('--stagger', i);
    });
    // Re-observe newly added fade-in elements
    if (galleryItems.length > 0) {
        const galleryObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    galleryObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });
        galleryItems.forEach(item => galleryObserver.observe(item));
    }

    // --- Hero Parallax ---
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            const heroHeight = document.querySelector('.hero')?.offsetHeight || 700;
            if (scrolled < heroHeight) {
                heroBg.style.transform = `translateY(${scrolled * 0.3}px) scale(1.02)`;
            }
        }, { passive: true });
    }

    // --- Floating Ember Particles ---
    const embersCanvas = document.getElementById('hero-embers');
    if (embersCanvas) {
        const ctx = embersCanvas.getContext('2d');
        let embers = [];
        let animFrame;
        const EMBER_COUNT = 35;

        function resizeCanvas() {
            const hero = embersCanvas.parentElement;
            embersCanvas.width = hero.offsetWidth;
            embersCanvas.height = hero.offsetHeight;
        }

        function createEmber() {
            return {
                x: Math.random() * embersCanvas.width,
                y: embersCanvas.height + Math.random() * 40,
                size: Math.random() * 3 + 1,
                speedY: -(Math.random() * 0.8 + 0.2),
                speedX: (Math.random() - 0.5) * 0.6,
                opacity: Math.random() * 0.6 + 0.2,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.02 + 0.01,
                life: 0,
                maxLife: Math.random() * 300 + 200,
                // Warm colors: golden to amber to soft orange
                hue: Math.random() * 30 + 25, // 25-55 range
                saturation: Math.random() * 30 + 60,
                lightness: Math.random() * 20 + 55,
            };
        }

        function initEmbers() {
            embers = [];
            for (let i = 0; i < EMBER_COUNT; i++) {
                const e = createEmber();
                e.y = Math.random() * embersCanvas.height; // Spread initially
                e.life = Math.random() * e.maxLife;
                embers.push(e);
            }
        }

        function drawEmbers() {
            ctx.clearRect(0, 0, embersCanvas.width, embersCanvas.height);

            embers.forEach((e, i) => {
                e.x += e.speedX + Math.sin(e.pulse) * 0.3;
                e.y += e.speedY;
                e.pulse += e.pulseSpeed;
                e.life++;

                // Fade in and out based on life
                let lifeFade = 1;
                if (e.life < 30) lifeFade = e.life / 30;
                if (e.life > e.maxLife - 40) lifeFade = (e.maxLife - e.life) / 40;

                const currentOpacity = e.opacity * (0.6 + Math.sin(e.pulse) * 0.4) * lifeFade;

                if (currentOpacity > 0.01) {
                    // Glow layer
                    const glowSize = e.size * 4;
                    const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, glowSize);
                    glow.addColorStop(0, `hsla(${e.hue}, ${e.saturation}%, ${e.lightness}%, ${currentOpacity * 0.4})`);
                    glow.addColorStop(1, `hsla(${e.hue}, ${e.saturation}%, ${e.lightness}%, 0)`);
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, glowSize, 0, Math.PI * 2);
                    ctx.fill();

                    // Core
                    ctx.fillStyle = `hsla(${e.hue}, ${e.saturation}%, ${e.lightness + 15}%, ${currentOpacity})`;
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Recycle ember when it dies or goes off screen
                if (e.life >= e.maxLife || e.y < -20 || e.x < -20 || e.x > embersCanvas.width + 20) {
                    embers[i] = createEmber();
                }
            });

            animFrame = requestAnimationFrame(drawEmbers);
        }

        resizeCanvas();
        initEmbers();
        drawEmbers();

        window.addEventListener('resize', () => {
            resizeCanvas();
            initEmbers();
        });

        // Pause when not visible for performance
        const heroSection = document.querySelector('.hero');
        if (heroSection) {
            const heroObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (!animFrame) drawEmbers();
                    } else {
                        cancelAnimationFrame(animFrame);
                        animFrame = null;
                    }
                });
            }, { threshold: 0.1 });
            heroObserver.observe(heroSection);
        }
    }

    // --- Gallery Lightbox ---
    const lightbox = document.getElementById('lightbox');

    if (galleryItems.length > 0 && lightbox) {
        const lightboxImg = lightbox.querySelector('.lightbox-img');
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        let currentIndex = 0;
        const images = Array.from(galleryItems).map(item => item.querySelector('img').src);

        function openLightbox(index) {
            currentIndex = index;
            lightboxImg.src = images[currentIndex];
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }

        function navigate(direction) {
            currentIndex = (currentIndex + direction + images.length) % images.length;
            lightboxImg.src = images[currentIndex];
        }

        galleryItems.forEach((item, i) => {
            item.addEventListener('click', () => openLightbox(i));
        });

        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
        if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });

        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigate(-1);
            if (e.key === 'ArrowRight') navigate(1);
        });
    }

    // --- Booking Form ---
    const bookingForm = document.getElementById('booking-form');
    let lastSubmitTime = 0;
    const SUBMIT_COOLDOWN = 30000; // 30 seconds

    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Honeypot check — bots fill this hidden field, humans don't
            const honeypot = document.getElementById('booking-website');
            if (honeypot && honeypot.value) {
                showToast('Tak! Din bookingforespørgsel er modtaget.');
                bookingForm.reset();
                return; // Silently reject bot submission
            }

            // Rate limiting — max 1 submission per 30 seconds
            const now = Date.now();
            if (now - lastSubmitTime < SUBMIT_COOLDOWN) {
                const remaining = Math.ceil((SUBMIT_COOLDOWN - (now - lastSubmitTime)) / 1000);
                showToast(`Vent venligst ${remaining} sekunder før du sender igen.`);
                return;
            }
            const name = document.getElementById('booking-name').value.trim();
            const email = document.getElementById('booking-email').value.trim();
            const phone = document.getElementById('booking-phone').value.trim();
            const wantsCallback = document.getElementById('booking-callback').checked;
            const date = document.getElementById('booking-date').value;
            const timeStart = document.getElementById('booking-time-start').value;
            const timeEnd = document.getElementById('booking-time-end').value;
            const eventType = document.getElementById('booking-event').value.trim();
            const location = document.getElementById('booking-location').value.trim();
            const guests = document.getElementById('booking-guests').value;
            const organization = document.getElementById('booking-org').value.trim();
            const message = document.getElementById('booking-message').value.trim();

            if (!name || !email || !date || !timeStart || !timeEnd || !eventType || !location) {
                showToast('Udfyld venligst alle påkrævede felter.');
                return;
            }

            if (wantsCallback && !phone) {
                showToast('Udfyld venligst dit telefonnummer, hvis du ønsker opringning.');
                return;
            }

            // Send booking to server API
            const bookingData = {
                name,
                email,
                phone,
                wantsCallback,
                date,
                timeStart,
                timeEnd,
                eventType,
                location,
                guests: guests || '',
                organization,
                message,
            };

            fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData),
            })
                .then(res => {
                    if (!res.ok) throw new Error('Server error');
                    return res.json();
                })
                .then(() => {
                    lastSubmitTime = Date.now();
                    bookingForm.reset();
                    showToast('Tak! Din bookingforespørgsel er modtaget. Du hører fra os snart.');
                })
                .catch(() => {
                    showToast('Noget gik galt. Prøv igen eller kontakt os direkte på e.blomgren@outlook.dk');
                });
        });
    }

    // --- Toast notification ---
    function showToast(message) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // --- Set active nav link ---
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });

});
