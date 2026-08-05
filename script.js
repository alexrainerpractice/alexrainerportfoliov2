document.addEventListener('DOMContentLoaded', () => {
    // Disable pinch-to-zoom on iOS
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    }, { passive: false });

    // Disable double-tap to zoom on iOS
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    const body = document.body;

    function updateAboutState() {
        const profileAboutVisible = document.querySelector('.about_me.show');
        body.classList.toggle('profile-about-open', !!profileAboutVisible);

        const anyVisible = document.querySelector('.about_me.show, .about_project.show');
        body.classList.toggle('about-open', !!anyVisible);
    }

    function updateDate() {
        const timeEl = document.getElementById('dynamic-time');
        if (timeEl) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            timeEl.textContent = timeStr;
        }
    }
    updateDate();
    setInterval(updateDate, 60000);

    const toggleEditorial = document.getElementById('toggle-editorial');
    const togglePhotography = document.getElementById('toggle-photography');
    const editorialList = document.getElementById('editorial-list');
    const photographyView = document.getElementById('photography-gallery-view');
    const middleWrapper = document.querySelector('.middle-wrapper');

    if (toggleEditorial && togglePhotography) {
        toggleEditorial.addEventListener('click', () => {
            document.body.classList.remove('photography-active');
            const overlay = document.querySelector('.fullscreen-overlay');
            if (overlay) {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            }
            toggleEditorial.classList.add('active');
            togglePhotography.classList.remove('active');
            editorialList.style.display = 'block';
            photographyView.style.display = 'none';
            if (middleWrapper) middleWrapper.style.display = 'block';
        });

        togglePhotography.addEventListener('click', () => {
            togglePhotography.classList.add('active');
            toggleEditorial.classList.remove('active');
            editorialList.style.display = 'none';
            photographyView.style.display = 'block';
            if (middleWrapper) middleWrapper.style.display = 'none';
            document.body.classList.add('photography-active');
        });
    }

    const gridDecrease = document.getElementById('grid-decrease');
    const gridIncrease = document.getElementById('grid-increase');
    const scales = [0.6, 1.0, 1.6]; // Small, Medium, Big
    // Default: Small (0) on mobile, Medium (1) on desktop
    let scaleIndex = window.innerWidth <= 768 ? 0 : 1;

    if (gridDecrease && gridIncrease) {
        gridDecrease.addEventListener('click', () => {
            if (scaleIndex > 0) {
                scaleIndex--;
                updateGridScale();
            }
        });
        gridIncrease.addEventListener('click', () => {
            if (scaleIndex < scales.length - 1) {
                scaleIndex++;
                updateGridScale();
            }
        });
    }

    function updateGridScale() {
        const grid = document.querySelector('.photography-grid');
        if (grid) {
            grid.style.setProperty('--photo-grid-scale', scales[scaleIndex]);
        }
    }
    // Apply initial scale
    updateGridScale();

    document.addEventListener('click', (e) => {
        const img = e.target.closest('.photo-item img');
        if (!img) return;

        e.stopPropagation();

        const allPhotos = Array.from(document.querySelectorAll('.photo-item img'));
        let currentIndex = allPhotos.indexOf(img);

        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';

        const fullImg = document.createElement('img');

        const leftGutter = document.createElement('div');
        leftGutter.className = 'nav-gutter left';
        const prevBtn = document.createElement('span');
        leftGutter.appendChild(prevBtn);

        const rightGutter = document.createElement('div');
        rightGutter.className = 'nav-gutter right';
        const nextBtn = document.createElement('span');
        rightGutter.appendChild(nextBtn);

        const currentBtn = document.createElement('span');
        currentBtn.className = 'current-num';

        function getCurrentTx(el) {
            const style = window.getComputedStyle(el);
            const matrix = new WebKitCSSMatrix(style.transform);
            return matrix.m41;
        }

        const carouselCounter = document.createElement('div');
        carouselCounter.className = 'carousel-counter fullscreen-counter';
        const counterTrack = document.createElement('div');
        counterTrack.className = 'counter-track';
        carouselCounter.appendChild(counterTrack);

        // Fill counter track with thumbnails
        allPhotos.forEach((photo, i) => {
            const thumb = document.createElement('img');
            thumb.src = photo.src;
            thumb.className = 'thumb-nav';
            if (i === currentIndex) thumb.classList.add('active');
            thumb.addEventListener('click', (e) => {
                e.stopPropagation();
                updateFullscreenView(i);
            });
            counterTrack.appendChild(thumb);
        });

        const projectLink = document.createElement('div');
        projectLink.className = 'project-link-overlay';
        projectLink.style.display = 'none';

        const photoDesc = document.createElement('div');
        photoDesc.className = 'photo-description-overlay';
        photoDesc.style.display = 'none';

        overlay.appendChild(leftGutter);
        overlay.appendChild(fullImg);
        overlay.appendChild(rightGutter);
        overlay.appendChild(currentBtn);
        overlay.appendChild(carouselCounter);
        overlay.appendChild(projectLink);
        overlay.appendChild(photoDesc);

        document.body.appendChild(overlay);
        document.body.classList.add('is-fullscreen-open');

        const gridClose = document.getElementById('grid-close');
        if (gridClose) {
            gridClose.addEventListener('click', closeFullscreen, { once: true });
        }

        leftGutter.addEventListener('click', (e) => {
            updateFullscreenView(currentIndex - 1);
        });

        rightGutter.addEventListener('click', (e) => {
            updateFullscreenView(currentIndex + 1);
        });

        let targetX = 50, targetY = 50;
        let currentX = 50, currentY = 50;
        let rafId = null;

        function updatePan() {
            currentX += (targetX - currentX) * 0.25;
            currentY += (targetY - currentY) * 0.25;
            fullImg.style.transformOrigin = `${currentX.toFixed(2)}% ${currentY.toFixed(2)}%`;

            if (fullImg.classList.contains('zoomed')) {
                rafId = requestAnimationFrame(updatePan);
            }
        }

        function updateFullscreenView(index) {
            if (index < 0 || index >= allPhotos.length) return;

            currentIndex = index;
            const targetImg = allPhotos[currentIndex];
            const largeUrl = targetImg.getAttribute('data-large');

            // Show instant preview thumbnail from grid
            fullImg.src = targetImg.src;

            // Load 100% full-resolution original image ONLY for this specific photo
            if (largeUrl && largeUrl !== targetImg.src) {
                const targetIdx = index;
                const highResLoader = new Image();
                highResLoader.onload = () => {
                    if (currentIndex === targetIdx) {
                        fullImg.src = largeUrl;
                    }
                };
                highResLoader.src = largeUrl;
            }

            // Detect orientation for adaptive zoom
            const isHorizontal = targetImg.naturalWidth > targetImg.naturalHeight;
            fullImg.classList.toggle('is-horizontal', isHorizontal);
            fullImg.classList.toggle('is-vertical', !isHorizontal);

            const wasZoomed = fullImg.classList.contains('zoomed');
            if (!wasZoomed) {
                fullImg.classList.remove('zoomed');
                overlay.classList.remove('is-zoomed');
                if (rafId) cancelAnimationFrame(rafId);
            } else {
                targetX = 50; targetY = 50;
            }

            const totalPhotos = allPhotos.length;
            currentBtn.textContent = totalPhotos - currentIndex;

            if (currentIndex > 0) {
                prevBtn.textContent = totalPhotos - (currentIndex - 1);
                prevBtn.style.visibility = 'visible';
            } else {
                prevBtn.style.visibility = 'hidden';
            }

            if (currentIndex < totalPhotos - 1) {
                nextBtn.textContent = totalPhotos - (currentIndex + 1);
                nextBtn.style.visibility = 'visible';
            } else {
                nextBtn.style.visibility = 'hidden';
            }

            // Project link logic
            const photoItem = targetImg.closest('.photo-item');
            const projectId = photoItem?.getAttribute('data-project-id');
            const projectTitle = photoItem?.getAttribute('data-project-title');

            if (projectId && projectTitle) {
                projectLink.innerHTML = `Related Project: <span class="project-title-link">${projectTitle}</span>`;
                projectLink.style.display = 'block';
                projectLink.onclick = (e) => {
                    e.stopPropagation();
                    closeFullscreen();
                    const toggleEditorial = document.getElementById('toggle-editorial');
                    if (toggleEditorial) toggleEditorial.click();
                    setTimeout(() => scrollToProject(projectId), 100);
                };
            } else {
                projectLink.style.display = 'none';
            }

            // Description logic
            const description = photoItem?.getAttribute('data-description');
            if (description && description.trim() !== '') {
                photoDesc.innerHTML = description;
                photoDesc.style.display = 'block';
            } else {
                photoDesc.style.display = 'none';
            }

            // Update thumbnails
            const thumbs = counterTrack.querySelectorAll('.thumb-nav');
            thumbs.forEach((t, i) => {
                t.classList.toggle('active', i === currentIndex);
            });
            updateFullscreenCounterPosition(currentIndex);
        }

        function updateFullscreenCounterPosition(index) {
            const thumbs = counterTrack.querySelectorAll('.thumb-nav');
            const activeThumb = thumbs[index];
            if (!activeThumb) return;

            const containerWidth = carouselCounter.offsetWidth;
            const thumbOffset = activeThumb.offsetLeft + (activeThumb.offsetWidth / 2);
            let tx = (containerWidth / 2) - thumbOffset;

            counterTrack.style.transform = `translateX(${tx}px)`;
        }

        function getFullscreenBounds() {
            const thumbs = counterTrack.querySelectorAll('.thumb-nav');
            if (thumbs.length === 0) return { min: 0, max: 0 };
            const containerWidth = carouselCounter.offsetWidth;

            const firstThumb = thumbs[0];
            const lastThumb = thumbs[thumbs.length - 1];

            const maxTx = (containerWidth / 2) - (firstThumb.offsetLeft + firstThumb.offsetWidth / 2);
            const minTx = (containerWidth / 2) - (lastThumb.offsetLeft + lastThumb.offsetWidth / 2);

            return { min: minTx, max: maxTx };
        }

        // Add smooth scrubbing to fullscreen counter
        let isCounterDragging = false;
        let counterStartX = 0;
        let counterInitialTx = 0;

        carouselCounter.addEventListener('touchstart', (e) => {
            isCounterDragging = true;
            counterStartX = e.touches[0].clientX;
            counterInitialTx = getCurrentTx(counterTrack);
            counterTrack.style.transition = 'none'; // Disable transition while dragging
        }, { passive: true });

        carouselCounter.addEventListener('touchmove', (e) => {
            if (!isCounterDragging) return;
            const x = e.touches[0].clientX;
            const deltaX = x - counterStartX;
            let currentTx = counterInitialTx + deltaX;

            // Clamp tx to bounds
            const bounds = getFullscreenBounds();
            if (currentTx > bounds.max) currentTx = bounds.max;
            if (currentTx < bounds.min) currentTx = bounds.min;

            counterTrack.style.transform = `translateX(${currentTx}px)`;

            // Find closest thumb to center
            const containerCenter = carouselCounter.offsetWidth / 2;
            const thumbs = Array.from(counterTrack.querySelectorAll('.thumb-nav'));

            let closestIndex = currentIndex;
            let minDistance = Infinity;

            thumbs.forEach((thumb, i) => {
                const thumbCenter = thumb.offsetLeft + (thumb.offsetWidth / 2) + currentTx;
                const distance = Math.abs(containerCenter - thumbCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = i;
                }
            });

            if (closestIndex !== currentIndex) {
                // Debounce/optimize updateFullscreenView during scrubbing
                currentIndex = closestIndex;
                const targetImg = allPhotos[currentIndex];
                fullImg.src = targetImg.src; // Instant low-res update
                currentBtn.textContent = currentIndex + 1;

                // Update active thumb state immediately
                const thumbs = counterTrack.querySelectorAll('.thumb-nav');
                thumbs.forEach((t, i) => t.classList.toggle('active', i === currentIndex));
            }
        }, { passive: false });

        carouselCounter.addEventListener('touchend', () => {
            isCounterDragging = false;
            counterTrack.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
            updateFullscreenView(currentIndex); // Final high-res update and centering
        });

        updateFullscreenView(currentIndex);

        const handleKeys = (e) => {
            if (e.key === 'ArrowRight') {
                updateFullscreenView(currentIndex + 1);
            } else if (e.key === 'ArrowLeft') {
                updateFullscreenView(currentIndex - 1);
            } else if (e.key === 'Escape') {
                closeFullscreen();
            }
        };
        window.addEventListener('keydown', handleKeys);

        function closeFullscreen() {
            window.removeEventListener('keydown', handleKeys);
            if (rafId) cancelAnimationFrame(rafId);
            document.body.classList.remove('is-fullscreen-zoomed');
            document.body.classList.remove('is-fullscreen-open');
            overlay.remove();
        }

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {

            }
        });

        fullImg.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasZoomed = fullImg.classList.contains('zoomed');
            fullImg.classList.toggle('zoomed');
            overlay.classList.toggle('is-zoomed');
            document.body.classList.toggle('is-fullscreen-zoomed', overlay.classList.contains('is-zoomed'));

            if (!wasZoomed) {
                rafId = requestAnimationFrame(updatePan);
            } else {
                if (rafId) cancelAnimationFrame(rafId);
            }
        });

        // Pan logic
        fullImg.addEventListener('mousemove', (e) => {
            if (fullImg.classList.contains('zoomed')) {
                const rect = fullImg.getBoundingClientRect();
                let x = (e.clientX - rect.left) / rect.width * 100;
                let y = (e.clientY - rect.top) / rect.height * 100;
                targetX = Math.max(0, Math.min(100, x));
                targetY = Math.max(0, Math.min(100, y));
            }
        });

        let startX, startY;
        let lastX = 50, lastY = 50;
        let lastTap = 0;

        let isOverlayDragging = false;
        let overlayStartX = 0;
        let overlayInitialIndex = 0;

        overlay.addEventListener('touchstart', (e) => {
            if (fullImg.classList.contains('zoomed')) return;
            isOverlayDragging = true;
            overlayStartX = e.touches[0].clientX;
            overlayInitialIndex = currentIndex;
        }, { passive: true });

        overlay.addEventListener('touchmove', (e) => {
            if (!isOverlayDragging || fullImg.classList.contains('zoomed')) return;
            const x = e.touches[0].clientX;
            const deltaX = x - overlayStartX;
            const steps = Math.round(deltaX / SWIPE_STEP);

            if (steps !== 0) {
                // Not looping
                let newIndex = overlayInitialIndex - steps;
                if (newIndex < 0) newIndex = 0;
                if (newIndex >= allPhotos.length) newIndex = allPhotos.length - 1;

                if (newIndex !== currentIndex) {
                    updateFullscreenView(newIndex);
                }
            }
        }, { passive: false });

        overlay.addEventListener('touchend', () => {
            isOverlayDragging = false;
        });

        fullImg.addEventListener('touchstart', (e) => {
            if (fullImg.classList.contains('zoomed') && e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                lastX = targetX;
                lastY = targetY;
            }
        }, { passive: true });

        fullImg.addEventListener('touchmove', (e) => {
            if (fullImg.classList.contains('zoomed') && e.touches.length === 1) {
                e.preventDefault();
                const deltaX = e.touches[0].clientX - startX;
                const deltaY = e.touches[0].clientY - startY;

                // Sensitivity adjustment
                targetX = lastX - (deltaX / window.innerWidth * 80);
                targetY = lastY - (deltaY / window.innerHeight * 80);

                targetX = Math.max(0, Math.min(100, targetX));
                targetY = Math.max(0, Math.min(100, targetY));
            }
        }, { passive: false });

        fullImg.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {

                const wasZoomed = fullImg.classList.contains('zoomed');
                fullImg.classList.toggle('zoomed');
                overlay.classList.toggle('is-zoomed');
                document.body.classList.toggle('is-fullscreen-zoomed', overlay.classList.contains('is-zoomed'));
                if (!wasZoomed) {
                    rafId = requestAnimationFrame(updatePan);
                } else {
                    if (rafId) cancelAnimationFrame(rafId);
                }
            }
            lastTap = currentTime;
        });

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateFullscreenView(currentIndex - 1);
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateFullscreenView(currentIndex + 1);
        });
    });

    const mainAboutBtn = document.querySelector('.navigation .about_button');
    const aboutMe = document.querySelector('.about_me');
    if (mainAboutBtn) {
        mainAboutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            aboutMe.classList.toggle('show');
            updateAboutState();
        });
    }

    const projectLinks = document.querySelectorAll('.project_nav li');
    const carousels = document.querySelectorAll('.carousel');
    let activeCarousel = carousels[0];
    let currentIndexes = {};

    carousels.forEach(c => {
        currentIndexes[c.id] = 0;
        initCarouselCounter(c);
    });

    function initCarouselCounter(carousel) {
        const track = carousel.querySelector('.counter-track');
        if (!track) return;

        track.innerHTML = '';
        const items = carousel.querySelectorAll('.carousel-item');
        const currentIndex = currentIndexes[carousel.id];

        items.forEach((_, i) => {
            const span = document.createElement('span');
            span.textContent = i + 1;
            if (i === currentIndex) span.classList.add('active');
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                showImage(carousel, i);
            });
            track.appendChild(span);
        });

        // Initial position
        updateCounterPosition(carousel, currentIndex);
    }

    function updateCounterPosition(carousel, index) {
        const counter = carousel.querySelector('.carousel-counter');
        const track = carousel.querySelector('.counter-track');
        if (!counter || !track) return;

        const spans = track.querySelectorAll('span');
        const activeSpan = spans[index];
        if (!activeSpan) return;

        const containerWidth = counter.offsetWidth;
        const spanOffset = activeSpan.offsetLeft + (activeSpan.offsetWidth / 2);
        let tx = (containerWidth / 2) - spanOffset;

        track.style.transform = `translateX(${tx}px)`;
    }

    function getEditorialBounds(carousel) {
        const counter = carousel.querySelector('.carousel-counter');
        const track = carousel.querySelector('.counter-track');
        if (!counter || !track) return { min: 0, max: 0 };

        const containerWidth = counter.offsetWidth;
        const spans = track.querySelectorAll('span');
        if (spans.length === 0) return { min: 0, max: 0 };

        const firstSpan = spans[0];
        const lastSpan = spans[spans.length - 1];

        const maxTx = (containerWidth / 2) - (firstSpan.offsetLeft + firstSpan.offsetWidth / 2);
        const minTx = (containerWidth / 2) - (lastSpan.offsetLeft + lastSpan.offsetWidth / 2);

        return { min: minTx, max: maxTx };
    }

    function showImage(carousel, index) {
        const inner = carousel.querySelector('.carousel-inner');
        const track = carousel.querySelector('.counter-track');
        const items = carousel.querySelectorAll('.carousel-item');
        const spans = track ? track.querySelectorAll('span') : [];

        if (!inner) return;

        // Update active classes for other logic
        items.forEach(item => item.classList.remove('active'));
        if (spans.length > 0) spans.forEach(span => span.classList.remove('active'));

        if (items[index]) {
            items[index].classList.add('active');
            const video = items[index].querySelector('video');
            if (video) video.play().catch(() => {});
        }
        if (spans[index]) spans[index].classList.add('active');

        currentIndexes[carousel.id] = index;
        updateCounterPosition(carousel, index);
    }

    const SWIPE_STEP = 35;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentDraggingCarousel = null;
    let initialX = 0;
    let initialIndex = 0;
    let startTime = 0;
    let lastDragTime = 0;

    const handleDragStart = (x, y, carousel) => {
        isDragging = true;
        startX = x;
        startY = y;
        initialX = x;
        startTime = Date.now();
        initialIndex = currentIndexes[carousel.id] || 0;
        currentDraggingCarousel = carousel;
    };

    const handleDragMove = (x, y, isTouch = false) => {
        if (!isDragging || !currentDraggingCarousel) return;

        const dx = x - initialX;
        const items = currentDraggingCarousel.querySelectorAll('.carousel-item');
        if (items.length <= 1) return;

        const SWIPE_STEP = 60;
        const steps = Math.round(dx / SWIPE_STEP);

        // Not looping
        let newIndex = initialIndex - steps;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= items.length) newIndex = items.length - 1;

        if (newIndex !== currentIndexes[currentDraggingCarousel.id]) {
            showImage(currentDraggingCarousel, newIndex);
        }
    };

    const handleDragEnd = (endX) => {
        isDragging = false;
        currentDraggingCarousel = null;
    };


    let isClickScrolling = false;

    const observer = new IntersectionObserver((entries) => {
        // Track intersection ratios for all observed carousels
        entries.forEach(entry => {
            const carousel = entry.target;
            carousel.dataset.ratio = entry.intersectionRatio;

            // Only show counter if carousel is at least 50% visible (prevents jumping on scroll)
            const showThreshold = 0.5;
            carousel.classList.toggle('show-counter', entry.intersectionRatio >= showThreshold);
        });

        if (isClickScrolling) return;

        let bestCarousel = activeCarousel;
        let maxRatio = -1;

        carousels.forEach((carousel, index) => {
            const ratio = parseFloat(carousel.dataset.ratio || '0');

            // At the very top, favor the first item
            if (index === 0 && window.scrollY < 20 && ratio > 0.01) {
                bestCarousel = carousel;
                maxRatio = 2;
                return;
            }

            if (ratio > maxRatio) {
                maxRatio = ratio;
                bestCarousel = carousel;
            }
        });

        if (bestCarousel && (maxRatio >= 0.4 || maxRatio === 2)) {
            activateProject(bestCarousel);
        }
    }, { threshold: [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0] });

    function activateProject(carousel) {
        if (!carousel) return;
        const projectId = carousel.id.replace('carousel-', '');

        // Update selection
        projectLinks.forEach(link => {
            const isActive = link.getAttribute('data-project') === projectId;
            link.classList.toggle('active', isActive);
            if (!isActive) {
                const desc = link.querySelector('.about_project');
                if (desc) desc.classList.remove('show');
            }
        });

        activeCarousel = carousel;
        updateAboutState();

        // Ensure counter is correctly positioned even if it was previously hidden
        const currentIndex = currentIndexes[carousel.id] || 0;
        updateCounterPosition(carousel, currentIndex);
    }

    carousels.forEach(c => observer.observe(c));

    function scrollToProject(projectId) {
        const targetCarousel = document.getElementById(`carousel-${projectId}`);
        if (targetCarousel) {
            isClickScrolling = true;

            // Highlight immediately
            activateProject(targetCarousel);

            // Calculate position and scroll
            const yOffset = targetCarousel.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
                top: yOffset,
                behavior: 'smooth'
            });

            // Release lock after scroll completes
            setTimeout(() => {
                isClickScrolling = false;
            }, 1000);
        }
    }

    // Click handling for project list
    const projectNav = document.querySelector('.project_nav');
    if (projectNav) {
        projectNav.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;

            const projectId = li.getAttribute('data-project');
            if (!projectId) return;

            // If clicking the about button, toggle description
            const aboutBtn = e.target.closest('.about_button');
            if (aboutBtn) {
                const desc = li.querySelector('.about_project');
                if (desc) {
                    e.stopPropagation();
                    const isOpening = !desc.classList.contains('show');
                    if (isOpening) {
                        scrollToProject(projectId);
                    }
                    desc.classList.toggle('show');
                    updateAboutState();
                }
                return;
            }

            // Otherwise, just scroll to project
            scrollToProject(projectId);
        });
    }

    document.addEventListener('click', (e) => {

        if (aboutMe && aboutMe.classList.contains('show')) {
            if (!mainAboutBtn.contains(e.target) && !aboutMe.contains(e.target)) {
                aboutMe.classList.remove('show');
                updateAboutState();
            }
        }

        if (photographyView && photographyView.style.display === 'block') {
            return;
        }

        if (e.target.closest('.photo-item img') || e.target.closest('.fullscreen-overlay')) {
            return;
        }

        if (e.target.closest('.about_button') ||
            e.target.closest('.carousel-counter') ||
            e.target.closest('.socials') ||
            e.target.closest('.project_nav')) {
            return;
        }

        // Block click if we just finished a drag to prevent double-swiping
        if (Date.now() - lastDragTime < 300) {
            return;
        }

        if (!e.target.closest('.carousel')) {
            return;
        }

        let targetCarousel = e.target.closest('.carousel');
        if (!targetCarousel) return;

        // Click-to-navigate enabled for all devices (swipes handled by separate drag logic)

        const items = targetCarousel.querySelectorAll('.carousel-item');
        if (items.length === 0) return;

        const currentIndex = currentIndexes[targetCarousel.id];
        if (e.clientX < window.innerWidth / 2) {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = items.length - 1;
            showImage(targetCarousel, newIndex);
        } else {
            let newIndex = (currentIndex + 1) % items.length;
            showImage(targetCarousel, newIndex);
        }
    });

    // Keyboard navigation for carousels
    document.addEventListener('keydown', (e) => {
        if (!activeCarousel) return;

        const items = activeCarousel.querySelectorAll('.carousel-item');
        if (items.length === 0) return;

        const currentIndex = currentIndexes[activeCarousel.id] || 0;

        if (e.key === 'ArrowLeft') {
            let newIndex = Math.max(0, currentIndex - 1);
            showImage(activeCarousel, newIndex);
        } else if (e.key === 'ArrowRight') {
            let newIndex = Math.min(items.length - 1, currentIndex + 1);
            showImage(activeCarousel, newIndex);
        }
    });

    document.addEventListener('mousedown', (e) => {
        const carousel = e.target.closest('.carousel');
        if (carousel) handleDragStart(e.clientX, e.clientY, carousel);
    });

    document.addEventListener('mousemove', (e) => {
        const carousel = e.target.closest('.carousel');
        if (carousel) {
            if (e.clientX < window.innerWidth / 2) {
                carousel.classList.add('cursor-prev');
                carousel.classList.remove('cursor-next');
            } else {
                carousel.classList.add('cursor-next');
                carousel.classList.remove('cursor-prev');
            }
        }
        if (isDragging) {
            handleDragMove(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mouseup', (e) => handleDragEnd(e.clientX));
    document.addEventListener('mouseleave', (e) => handleDragEnd(e.clientX));

    let dragDirection = null;

    // Initialize counter dots interactivity and touch handlers
    carousels.forEach(carousel => {
        carousel.addEventListener('touchstart', (e) => {
            const isCounter = e.target.closest('.carousel-counter');
            if (isCounter) {
                isDragging = false;
                return;
            }

            isDragging = true;
            dragDirection = null;
            currentDraggingCarousel = carousel;

            const touch = e.touches[0];
            initialX = touch.clientX;
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
            initialIndex = currentIndexes[carousel.id] || 0;
        }, { passive: true });

        carousel.addEventListener('touchmove', (e) => {
            if (!isDragging || currentDraggingCarousel !== carousel) return;

            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            const dx = x - initialX;
            const dy = y - startY;

            if (!dragDirection) {
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    dragDirection = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
                }
            }

            if (dragDirection === 'h') {
                if (e.cancelable) e.preventDefault();
                handleDragMove(x, y, true);
            }
        }, { passive: false });

        carousel.addEventListener('touchend', (e) => {
            const x = e.changedTouches ? e.changedTouches[0].clientX : initialX;
            handleDragEnd(x);
            dragDirection = null;
        }, { passive: true });

        carousel.addEventListener('touchcancel', (e) => {
            handleDragEnd(initialX);
            dragDirection = null;
        }, { passive: true });

        const counter = carousel.querySelector('.carousel-counter');
        if (counter) {
            const handleCounterTap = (e) => {
                const span = e.target.closest('span');
                if (span) {
                    e.stopPropagation();
                    const spans = Array.from(counter.querySelectorAll('span'));
                    const index = spans.indexOf(span);
                    if (index !== -1) {
                        showImage(carousel, index);
                    }
                }
            };

            counter.addEventListener('click', handleCounterTap);

            // Add smooth scrubbing to editorial counter
            const track = counter.querySelector('.counter-track');
            if (!track) return;

            let isEditorialCounterDragging = false;
            let counterStartX = 0;
            let counterInitialTx = 0;

            counter.addEventListener('touchstart', (e) => {
                isEditorialCounterDragging = true;
                counterStartX = e.touches[0].clientX;
                counterInitialTx = getCurrentTx(track);
                track.style.transition = 'none';
            }, { passive: true });

            counter.addEventListener('touchmove', (e) => {
                if (!isEditorialCounterDragging) return;
                const x = e.touches[0].clientX;
                const deltaX = x - counterStartX;
                let currentTx = counterInitialTx + deltaX;

                // Clamp tx to bounds
                const bounds = getEditorialBounds(carousel);
                if (currentTx > bounds.max) currentTx = bounds.max;
                if (currentTx < bounds.min) currentTx = bounds.min;

                track.style.transform = `translateX(${currentTx}px)`;

                const containerCenter = counter.offsetWidth / 2;
                const spans = Array.from(track.querySelectorAll('span'));

                let closestIndex = currentIndexes[carousel.id] || 0;
                let minDistance = Infinity;

                spans.forEach((span, i) => {
                    const spanCenter = span.offsetLeft + (span.offsetWidth / 2) + currentTx;
                    const distance = Math.abs(containerCenter - spanCenter);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = i;
                    }
                });

                if (closestIndex !== currentIndexes[carousel.id]) {
                    // Debounce/optimize
                    currentIndexes[carousel.id] = closestIndex;
                    const items = carousel.querySelectorAll('.carousel-item');
                    const spans = Array.from(track.querySelectorAll('span'));

                    items.forEach(item => item.classList.remove('active'));
                    spans.forEach(span => span.classList.remove('active'));

                    if (items[closestIndex]) items[closestIndex].classList.add('active');
                    if (spans[closestIndex]) spans[closestIndex].classList.add('active');
                }
            }, { passive: false });

            counter.addEventListener('touchend', () => {
                isEditorialCounterDragging = false;
                track.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
                updateCounterPosition(carousel, currentIndexes[carousel.id]);
            });
        }
    });
});
