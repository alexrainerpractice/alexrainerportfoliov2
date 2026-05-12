document.addEventListener('DOMContentLoaded', () => {
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
        });
    }


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

        const closeBtn = document.createElement('span');
        closeBtn.className = 'fullscreen-close';
        closeBtn.textContent = 'Close';

        overlay.appendChild(leftGutter);
        overlay.appendChild(fullImg);
        overlay.appendChild(rightGutter);
        overlay.appendChild(currentBtn);
        overlay.appendChild(closeBtn);

        document.body.appendChild(overlay);


        leftGutter.addEventListener('click', (e) => {
            updateFullscreenView(currentIndex - 1);
        });

        rightGutter.addEventListener('click', (e) => {
            updateFullscreenView(currentIndex + 1);
        });

        closeBtn.addEventListener('click', closeFullscreen);


        let targetX = 50, targetY = 50;
        let currentX = 50, currentY = 50;
        let rafId = null;

        function updatePan() {
            currentX += (targetX - currentX) * 0.1;
            currentY += (targetY - currentY) * 0.1;
            fullImg.style.transformOrigin = `${currentX.toFixed(2)}% ${currentY.toFixed(2)}%`;

            if (fullImg.classList.contains('zoomed')) {
                rafId = requestAnimationFrame(updatePan);
            }
        }

        function updateFullscreenView(index) {
            if (index < 0 || index >= allPhotos.length) return;

            currentIndex = index;
            const targetImg = allPhotos[currentIndex];
            fullImg.src = targetImg.src;
            fullImg.classList.remove('zoomed');
            overlay.classList.remove('is-zoomed');
            if (rafId) cancelAnimationFrame(rafId);

            currentBtn.textContent = currentIndex + 1;

            if (currentIndex > 0) {
                prevBtn.textContent = currentIndex;
                prevBtn.style.visibility = 'visible';
            } else {
                prevBtn.style.visibility = 'hidden';
            }

            if (currentIndex < allPhotos.length - 1) {
                nextBtn.textContent = currentIndex + 2;
                nextBtn.style.visibility = 'visible';
            } else {
                nextBtn.style.visibility = 'hidden';
            }
        }

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
                targetX = lastX - (deltaX / window.innerWidth * 50);
                targetY = lastY - (deltaY / window.innerHeight * 50);

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
        const counter = carousel.querySelector('.carousel-counter');
        if (!counter) return;

        counter.innerHTML = '';
        const images = carousel.querySelectorAll('img');
        const currentIndex = currentIndexes[carousel.id];

        images.forEach((_, i) => {
            const span = document.createElement('span');
            span.textContent = i + 1;
            if (i === currentIndex) span.classList.add('active');
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                showImage(carousel, i);
            });
            counter.appendChild(span);
        });
    }

    function showImage(carousel, index) {
        const images = carousel.querySelectorAll('img');
        const counter = carousel.querySelector('.carousel-counter');
        const spans = counter ? counter.querySelectorAll('span') : [];

        images.forEach(img => img.classList.remove('active'));
        if (spans.length > 0) spans.forEach(span => span.classList.remove('active'));

        images[index].classList.add('active');
        if (spans[index]) spans[index].classList.add('active');
        currentIndexes[carousel.id] = index;
    }

    const observerOptions = {
        threshold: 0.7
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const carousel = entry.target;
            carousel.classList.toggle('show-counter', entry.isIntersecting);

            if (entry.isIntersecting) {
                activeCarousel = carousel;
                const projectId = carousel.id.replace('carousel-', '');

                projectLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('data-project') === projectId);
                });

                document.querySelectorAll('.about_project').forEach(p => p.classList.remove('show'));
                updateAboutState();
            }
        });
    }, observerOptions);

    carousels.forEach(c => observer.observe(c));

    function scrollToProject(projectId) {
        const targetCarousel = document.getElementById(`carousel-${projectId}`);
        if (targetCarousel) {
            targetCarousel.scrollIntoView({ behavior: 'smooth' });
        }
    }

    projectLinks.forEach(link => {
        const projectId = link.getAttribute('data-project');

        link.addEventListener('click', () => {
            scrollToProject(projectId);
        });

        const btn = link.querySelector('.about_button');
        const desc = link.querySelector('.about_project');
        if (btn && desc) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                scrollToProject(projectId);
                desc.classList.toggle('show');
                updateAboutState();
            });
        }
    });

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

        let targetCarousel = e.target.closest('.carousel');
        if (!targetCarousel) {
            targetCarousel = activeCarousel;
        }

        if (!targetCarousel) return;

        const images = targetCarousel.querySelectorAll('img');
        if (images.length === 0) return;

        const currentIndex = currentIndexes[targetCarousel.id];
        if (e.clientX < window.innerWidth / 2) {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = images.length - 1;
            showImage(targetCarousel, newIndex);
        } else {
            let newIndex = (currentIndex + 1) % images.length;
            showImage(targetCarousel, newIndex);
        }
    });


    let startY = 0;

    const handleDragStart = (x, y, carousel) => {
        isDragging = true;
        startX = x;
        startY = y;
        currentDraggingCarousel = carousel;
    };

    const handleDragMove = (x, y, isTouch = false) => {
        if (!isDragging || !currentDraggingCarousel) return;

        const deltaX = x - startX;
        const deltaY = y - startY;

        // If touch, check if movement is primarily horizontal
        if (isTouch && Math.abs(deltaY) > Math.abs(deltaX)) {
            return; // Allow vertical scroll
        }

        const images = currentDraggingCarousel.querySelectorAll('img');
        const currentIndex = currentIndexes[currentDraggingCarousel.id];

        if (deltaX > DRAG_THRESHOLD) {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = images.length - 1;
            showImage(currentDraggingCarousel, newIndex);
            startX = x;
            startY = y;
        } else if (deltaX < -DRAG_THRESHOLD) {
            let newIndex = (currentIndex + 1) % images.length;
            showImage(currentDraggingCarousel, newIndex);
            startX = x;
            startY = y;
        }
    };

    const handleDragEnd = () => {
        isDragging = false;
        currentDraggingCarousel = null;
    };

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

    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('mouseleave', handleDragEnd);

    document.addEventListener('touchstart', (e) => {
        const carousel = e.target.closest('.carousel');
        if (carousel) handleDragStart(e.touches[0].clientX, e.touches[0].clientY, carousel);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            handleDragMove(e.touches[0].clientX, e.touches[0].clientY, true);
        }
    }, { passive: true });

    document.addEventListener('touchend', handleDragEnd);
    document.addEventListener('touchcancel', handleDragEnd);

    // Initialize counter dots interactivity
    carousels.forEach(carousel => {
        const counter = carousel.querySelector('.carousel-counter');
        if (counter) {
            counter.addEventListener('click', (e) => {
                const span = e.target.closest('span');
                if (span) {
                    const spans = Array.from(counter.querySelectorAll('span'));
                    const index = spans.indexOf(span);
                    if (index !== -1) {
                        showImage(carousel, index);
                    }
                }
            });
        }
    });
});
