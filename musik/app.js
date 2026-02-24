/* ========================================
   MLI Musik App — Nordic Audio Player
   ======================================== */

(function () {
    'use strict';

    // ========== ELEMENTS ==========
    const audio = document.getElementById('audio');
    const btnPlay = document.getElementById('btn-play');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const btnRewind = document.getElementById('btn-rewind');
    const btnForward = document.getElementById('btn-forward');
    const btnVolume = document.getElementById('btn-volume');
    const iconVolOn = document.getElementById('icon-vol-on');
    const iconVolOff = document.getElementById('icon-vol-off');
    const volumeSlider = document.getElementById('volume-slider');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    const playerCard = document.getElementById('player-card');
    const trackList = document.getElementById('track-list');
    const visualizerCanvas = document.getElementById('visualizer-canvas');
    const particlesCanvas = document.getElementById('particles-canvas');

    // ========== STATE ==========
    let isPlaying = false;
    let audioContext = null;
    let analyser = null;
    let source = null;
    let visualizerInitialized = false;
    const trackTitle = document.querySelector('.track-title');
    const trackArtist = document.querySelector('.track-artist');

    // ========== FORMAT TIME ==========
    function formatTime(s) {
        if (isNaN(s) || !isFinite(s)) return '0:00';
        const min = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    // ========== AUDIO PLAYER ==========
    audio.volume = parseFloat(volumeSlider.value);

    // Debug: log audio errors
    audio.addEventListener('error', (e) => {
        const err = audio.error;
        console.error('Audio error:', err ? `code=${err.code} message=${err.message}` : e);
        console.error('Audio src was:', audio.src);
    });

    audio.addEventListener('canplay', () => {
        console.log('Audio ready to play:', audio.src);
    });

    audio.addEventListener('loadedmetadata', () => {
        timeTotal.textContent = formatTime(audio.duration);
        // Update duration in track list for the active item
        const activeItem = trackList.querySelector('.track-item.active');
        if (activeItem) {
            const durEl = activeItem.querySelector('.track-duration');
            if (durEl) durEl.textContent = formatTime(audio.duration);
        }
    });

    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = pct + '%';
            timeCurrent.textContent = formatTime(audio.currentTime);
        }
    });

    audio.addEventListener('ended', () => {
        // Auto-advance to next track
        const items = Array.from(trackList.querySelectorAll('.track-item:not(.disabled)'));
        const activeIdx = items.findIndex(i => i.classList.contains('active'));
        if (activeIdx < items.length - 1) {
            playTrackItem(items[activeIdx + 1]);
        } else {
            isPlaying = false;
            updatePlayState();
        }
    });

    // Play / Pause
    function togglePlay() {
        if (!visualizerInitialized) {
            initVisualizer();
        }
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(() => { });
        }
        isPlaying = !isPlaying;
        updatePlayState();
    }

    function updatePlayState() {
        iconPlay.style.display = isPlaying ? 'none' : 'block';
        iconPause.style.display = isPlaying ? 'block' : 'none';
        if (isPlaying) {
            playerCard.classList.add('playing');
        } else {
            playerCard.classList.remove('playing');
        }
    }

    btnPlay.addEventListener('click', togglePlay);

    // Rewind / Forward
    btnRewind.addEventListener('click', () => {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
    });

    btnForward.addEventListener('click', () => {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
    });

    // Progress bar click
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pct * (audio.duration || 0);
    });

    // Volume
    volumeSlider.addEventListener('input', () => {
        audio.volume = parseFloat(volumeSlider.value);
        updateVolumeIcon();
    });

    btnVolume.addEventListener('click', () => {
        if (audio.volume > 0) {
            audio.dataset.prevVolume = audio.volume;
            audio.volume = 0;
            volumeSlider.value = 0;
        } else {
            audio.volume = parseFloat(audio.dataset.prevVolume || 0.7);
            volumeSlider.value = audio.volume;
        }
        updateVolumeIcon();
    });

    function updateVolumeIcon() {
        const muted = audio.volume === 0;
        iconVolOn.style.display = muted ? 'none' : 'block';
        iconVolOff.style.display = muted ? 'block' : 'none';
    }

    // Play a specific track item
    function playTrackItem(item) {
        if (!item || item.classList.contains('disabled')) return;

        const src = item.dataset.src;
        const title = item.dataset.title || '';
        const artist = item.dataset.artist || 'MLI';

        // Update audio source
        audio.src = src;
        audio.load();

        // Update Now Playing info
        if (trackTitle) trackTitle.textContent = title;
        if (trackArtist) trackArtist.innerHTML = artist + ' &mdash; Emelie Blomgren';

        // Init visualizer on first play
        if (!visualizerInitialized) initVisualizer();

        audio.play().catch(() => { });
        isPlaying = true;
        updatePlayState();

        // Update active track in list
        trackList.querySelectorAll('.track-item').forEach(t => t.classList.remove('active'));
        item.classList.add('active');
    }

    // Track list click
    if (trackList) {
        trackList.addEventListener('click', (e) => {
            const item = e.target.closest('.track-item');
            playTrackItem(item);
        });
    }

    // ========== AUDIO VISUALIZER ==========
    function initVisualizer() {
        if (visualizerInitialized) return;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            visualizerInitialized = true;
            drawVisualizer();
        } catch (err) {
            console.warn('Audio visualizer not available:', err);
        }
    }

    function drawVisualizer() {
        if (!analyser) return;

        const ctx = visualizerCanvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function render() {
            requestAnimationFrame(render);

            // Resize canvas to container
            const rect = visualizerCanvas.parentElement.getBoundingClientRect();
            if (visualizerCanvas.width !== rect.width || visualizerCanvas.height !== rect.height) {
                visualizerCanvas.width = rect.width;
                visualizerCanvas.height = rect.height;
            }

            analyser.getByteFrequencyData(dataArray);

            const W = visualizerCanvas.width;
            const H = visualizerCanvas.height;

            ctx.clearRect(0, 0, W, H);

            const barCount = Math.min(bufferLength, 64);
            const barWidth = W / barCount;
            const gap = 1;

            for (let i = 0; i < barCount; i++) {
                const val = dataArray[i] / 255;
                const barH = val * H * 0.9;

                // Color gradient from green to gold
                const t = i / barCount;
                const r = Math.round(91 + (184 - 91) * t);
                const g = Math.round(122 + (147 - 122) * t);
                const b = Math.round(94 + (78 - 94) * t);

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.6 + val * 0.4})`;
                ctx.fillRect(
                    i * barWidth + gap / 2,
                    H - barH,
                    barWidth - gap,
                    barH
                );

                // Glow on top
                if (val > 0.3) {
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${val * 0.15})`;
                    ctx.fillRect(
                        i * barWidth + gap / 2 - 1,
                        H - barH - 4,
                        barWidth - gap + 2,
                        6
                    );
                }
            }
        }

        render();
    }

    // ========== BACKGROUND PARTICLES ==========
    function initParticles() {
        const ctx = particlesCanvas.getContext('2d');
        let particles = [];
        const PARTICLE_COUNT = 60;

        function resize() {
            particlesCanvas.width = window.innerWidth;
            particlesCanvas.height = window.innerHeight;
        }

        resize();
        window.addEventListener('resize', resize);

        // Create particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * particlesCanvas.width,
                y: Math.random() * particlesCanvas.height,
                radius: Math.random() * 1.5 + 0.5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2 - 0.1,
                alpha: Math.random() * 0.4 + 0.1,
                alphaDir: Math.random() > 0.5 ? 1 : -1,
                // Color: gold or green
                color: Math.random() > 0.6
                    ? { r: 184, g: 147, b: 78 }  // gold
                    : { r: 143, g: 169, b: 144 }  // green-light
            });
        }

        function animate() {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);

            for (const p of particles) {
                // Move
                p.x += p.vx;
                p.y += p.vy;

                // Flicker
                p.alpha += p.alphaDir * 0.003;
                if (p.alpha > 0.5) { p.alphaDir = -1; }
                if (p.alpha < 0.05) { p.alphaDir = 1; }

                // Wrap
                if (p.x < 0) p.x = particlesCanvas.width;
                if (p.x > particlesCanvas.width) p.x = 0;
                if (p.y < 0) p.y = particlesCanvas.height;
                if (p.y > particlesCanvas.height) p.y = 0;

                // Draw
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
                ctx.fill();

                // Soft glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * 0.1})`;
                ctx.fill();
            }
        }

        animate();
    }

    // ========== FADE-IN ON SCROLL ==========
    function initScrollAnimations() {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));
    }

    // ========== KEYBOARD SHORTCUTS ==========
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowLeft':
                audio.currentTime = Math.max(0, audio.currentTime - 5);
                break;
            case 'ArrowRight':
                audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
                break;
            case 'ArrowUp':
                e.preventDefault();
                audio.volume = Math.min(1, audio.volume + 0.05);
                volumeSlider.value = audio.volume;
                updateVolumeIcon();
                break;
            case 'ArrowDown':
                e.preventDefault();
                audio.volume = Math.max(0, audio.volume - 0.05);
                volumeSlider.value = audio.volume;
                updateVolumeIcon();
                break;
            case 'KeyM':
                btnVolume.click();
                break;
        }
    });

    // ========== PRELOAD TRACK DURATIONS ==========
    function preloadDurations() {
        const items = trackList.querySelectorAll('.track-item:not(.disabled)');
        items.forEach((item) => {
            const src = item.dataset.src;
            const durEl = item.querySelector('.track-duration');
            if (!src || !durEl) return;

            const tmp = new Audio();
            tmp.preload = 'metadata';
            tmp.src = src;
            tmp.addEventListener('loadedmetadata', () => {
                durEl.textContent = formatTime(tmp.duration);
            });
        });
    }

    // ========== INIT ==========
    initParticles();
    initScrollAnimations();
    preloadDurations();

})();

// ========== SERVICE WORKER REGISTRATION ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('[PWA] Service worker registered:', reg.scope))
            .catch((err) => console.warn('[PWA] SW registration failed:', err));
    });
}
