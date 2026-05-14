require('dotenv').config();
const fs = require('fs');


const ARENA_PAT = process.env.ARENA_PAT;
const ABOUT_CHANNEL = 'portfolio-about-me';
const PHOTO_CHANNEL = 'portfolio-photography-gallery';
const EDITORIAL_CHANNEL = 'portfolio-editorial-phzbw5s5xrm';
const IN_PROGRESS_CHANNEL = 'portfolio-editorial-in-progress';

const headers = {
    'Authorization': `Bearer ${ARENA_PAT}`,
    'Accept': 'application/json'
};

async function fetchArena(endpoint) {
    const url = `https://api.are.na/v3/${endpoint}`;
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, { headers });
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    }
    return res.json();
}

async function fetchAllArenaContents(channelSlug) {
    let allContents = [];
    let page = 1;
    let per = 100;
    let hasMore = true;

    while (hasMore) {
        const data = await fetchArena(`channels/${channelSlug}/contents?per=${per}&page=${page}`);
        const contents = data.contents || data.data || [];
        allContents = allContents.concat(contents);

        if (contents.length < per) {
            hasMore = false;
        } else {
            page++;
        }
    }
    return allContents;
}

async function build() {
    try {
        console.log('Starting Are.na Build Process...');
        let template = fs.readFileSync('template.html', 'utf-8');

        const aboutContents = await fetchAllArenaContents(ABOUT_CHANNEL);
        const aboutTextItem = aboutContents.find(item => item.type === 'Text');
        const aboutHTML = aboutTextItem && aboutTextItem.content ? (aboutTextItem.content.html || aboutTextItem.content.plain || '') : 'About me text not found.';
        template = template.replace('{{ABOUT_ME}}', aboutHTML);

        // --- FETCH IN-PROGRESS TAGS ---
        let inProgressSlugs = new Set();
        try {
            const inProgressContents = await fetchAllArenaContents(IN_PROGRESS_CHANNEL);
            inProgressSlugs = new Set(inProgressContents.map(item => item.slug));
            console.log(`Found ${inProgressSlugs.size} in-progress projects.`);
        } catch (err) {
            console.log(`Warning: Could not fetch In Progress channel: ${err.message}`);
        }

        // --- EDITORIAL SECTION (Fetch first to build image map) ---
        let projectLinksHTML = '';
        let carouselsHTML = '';
        const imageToProjectMap = {}; // Map image IDs to project info

        try {
            const editorialContents = await fetchAllArenaContents(EDITORIAL_CHANNEL);
            const projectChannels = editorialContents.filter(item => {
                const isChannel = item.type === 'Channel';
                const description = item.description ? (item.description.plain || item.description.markdown || '') : '';
                const isNotDraft = !description.toLowerCase().includes('[draft]');
                return isChannel && isNotDraft;
            });

            for (let i = 0; i < projectChannels.length; i++) {
                const project = projectChannels[i];
                const projId = project.slug;
                const isFirst = i === 0;
                const isInProgress = inProgressSlugs.has(projId);

                const projContents = await fetchAllArenaContents(projId);
                const descItem = projContents.find(item => item.type === 'Text');
                const description = descItem && descItem.content ? (descItem.content.html || descItem.content.plain || '') : '';
                const displayTitle = (descItem && descItem.title) ? descItem.title : project.title.replace(/^PORTFOLIO \/ /i, '');
                const images = projContents.filter(item => item.type === 'Image');

                // Map these images to this project
                images.forEach(img => {
                    imageToProjectMap[img.id] = { id: projId, title: displayTitle };
                });

                const labelHTML = isInProgress
                    ? '<span class="in_progress_label">In Progress...</span>'
                    : '<span class="about_button">?</span>';

                projectLinksHTML += `
                        <li ${isFirst ? 'class="active"' : ''} data-project="${projId}">
                            <span class="title-wrapper">
                                <span class="project_number">${i + 1}</span>
                                <span class="project_title">${displayTitle}</span>
                            </span>
                            ${labelHTML}
                            <span class="about_project">${isInProgress ? '' : description}</span>
                        </li>`;

                let carouselImagesHTML = images.map((img, imgIndex) => {
                    const imgUrl = img.image.large ? img.image.large.src : img.image.src;

                    // Handle image credits from description
                    let creditHTML = '';
                    const rawDesc = img.description || '';
                    const description = typeof rawDesc === 'string' ? rawDesc : (rawDesc.plain || '');

                    if (description.toLowerCase().includes('picture taken by')) {
                        const match = description.match(/Picture taken by\s*(?:\[(.*?)\]|:?\s*([^\(\n]+))\s*(?:\((.*?)\))?/i);
                        if (match) {
                            const name = (match[1] || match[2]).trim();
                            const link = match[3] ? match[3].trim() : null;
                            if (link) {
                                creditHTML = `<span class="image-credit"><span class="credit-label">Picture taken by</span> <a href="${link}" target="_blank" class="credit-name">${name}</a></span>`;
                            } else {
                                creditHTML = `<span class="image-credit"><span class="credit-label">Picture taken by</span> <span class="credit-name">${name}</span></span>`;
                            }
                        }
                    }

                    return `
                        <div class="carousel-item ${imgIndex === 0 ? 'active' : ''}">
                            <div class="image-container">
                                <img src="${imgUrl}" onload="this.classList.add('loaded')">
                                ${creditHTML}
                            </div>
                        </div>`;
                }).join('\n');

                carouselsHTML += `
                <div id="carousel-${projId}" class="carousel ${isFirst ? 'active' : ''}">
                    <div class="carousel-inner">
${carouselImagesHTML}
                        <div class="carousel-counter"><div class="counter-track"></div></div>
                    </div>
                </div>`;
            }

            template = template.replace('{{EDITORIAL_PROJECT_LINKS}}', projectLinksHTML);
            template = template.replace('{{EDITORIAL_PROJECT_CAROUSELS}}', carouselsHTML);
        } catch (err) {
            console.log(`Skipping Editorial: ${err.message}`);
            template = template.replace('{{EDITORIAL_PROJECT_LINKS}}', '<!-- Editorial links pending -->');
            template = template.replace('{{EDITORIAL_PROJECT_CAROUSELS}}', '<!-- Editorial carousels pending -->');
        }

        // --- PHOTOGRAPHY SECTION (Use image map for linking) ---
        try {
            const photoContents = await fetchAllArenaContents(PHOTO_CHANNEL);
            const photosHTML = photoContents
                .filter(item => item.type === 'Image')
                .map((item, index) => {
                    const thumbUrl = item.image.medium ? item.image.medium.src : item.image.src;
                    const largeUrl = item.image.large ? item.image.large.src : (item.image.medium ? item.image.medium.src : item.image.src);
                    const projectInfo = imageToProjectMap[item.id];
                    // Ensure description is a string and handle nulls
                    const rawDesc = item.description || '';
                    const description = typeof rawDesc === 'string' ? rawDesc : (rawDesc.plain || '');

                    const dataAttrs = projectInfo
                        ? `data-project-id="${projectInfo.id}" data-project-title="${projectInfo.title}"`
                        : '';

                    return `                <div class="photo-item" ${dataAttrs} data-description="${description.replace(/"/g, '&quot;')}"><img src="${thumbUrl}" data-large="${largeUrl}" loading="lazy" onload="this.classList.add('loaded')"><span>${index + 1}</span></div>`;
                })
                .join('\n');

            template = template.replace('{{PHOTOGRAPHY_GALLERY}}', photosHTML);
        } catch (err) {
            console.log(`Skipping Photography: ${err.message}`);
            template = template.replace('{{PHOTOGRAPHY_GALLERY}}', '<!-- Photography channel pending -->');
        }

        const now = new Date();
        const buildYear = now.getFullYear();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const buildMonth = monthNames[now.getMonth()];

        template = template.replace(/\{\{BUILD_YEAR\}\}/g, buildYear);
        template = template.replace('{{BUILD_MONTH}}', buildMonth);

        fs.writeFileSync('index.html', template);
        console.log('Build complete! index.html generated successfully.');

    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build();
