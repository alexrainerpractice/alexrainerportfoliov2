require('dotenv').config();
const fs = require('fs');


const ARENA_PAT = process.env.ARENA_PAT;
const ABOUT_CHANNEL = 'portfolio-about-me';
const PHOTO_CHANNEL = 'portfolio-photography-gallery';
const EDITORIAL_CHANNEL = 'portfolio-editorial-phzbw5s5xrm';

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

async function build() {
    try {
        console.log('Starting Are.na Build Process...');


        let template = fs.readFileSync('template.html', 'utf-8');


        const aboutData = await fetchArena(`channels/${ABOUT_CHANNEL}/contents?per=100`);
        const aboutTextItem = aboutData.data.find(item => item.type === 'Text');
        const aboutHTML = aboutTextItem && aboutTextItem.content ? (aboutTextItem.content.html || aboutTextItem.content.plain || '') : 'About me text not found.';

        template = template.replace('{{ABOUT_ME}}', aboutHTML);


        try {
            const photoData = await fetchArena(`channels/${PHOTO_CHANNEL}/contents?per=100`);
            const photosHTML = photoData.data
                .filter(item => item.type === 'Image')
                .map((item, index) => {
                    const imgUrl = item.image.large ? item.image.large.src : item.image.src;
                    return `                <div class="photo-item"><img src="${imgUrl}" loading="lazy"><span>${index + 1}</span></div>`;
                })
                .join('\n');

            template = template.replace('{{PHOTOGRAPHY_GALLERY}}', photosHTML);
        } catch (err) {
            console.log(`Skipping Photography (channel might not exist yet): ${err.message}`);
            template = template.replace('{{PHOTOGRAPHY_GALLERY}}', '<!-- Photography channel pending -->');
        }


        try {
            const editorialMaster = await fetchArena(`channels/${EDITORIAL_CHANNEL}/contents?per=100`);
            const projectChannels = editorialMaster.data.filter(item => {
                const isChannel = item.type === 'Channel';
                const description = item.description ? (item.description.plain || item.description.markdown || '') : '';
                const isNotDraft = !description.toLowerCase().includes('[draft]');
                return isChannel && isNotDraft;
            });

            let projectLinksHTML = '';
            let carouselsHTML = '';

            for (let i = 0; i < projectChannels.length; i++) {
                const project = projectChannels[i];
                const projId = project.slug;
                const isFirst = i === 0;


                const projData = await fetchArena(`channels/${projId}/contents?per=100`);


                const descItem = projData.data.find(item => item.type === 'Text');
                const description = descItem && descItem.content ? (descItem.content.html || descItem.content.plain || '') : '';


                const displayTitle = (descItem && descItem.title) ? descItem.title : project.title.replace(/^PORTFOLIO \/ /i, '');


                const images = projData.data.filter(item => item.type === 'Image');


                projectLinksHTML += `
                        <li ${isFirst ? 'class="active"' : ''} data-project="${projId}">
                            <span class="title-wrapper">
                                <span class="project_number">${i + 1}</span>
                                <span class="project_title">${displayTitle}</span>
                            </span>
                            <span class="about_button">?</span>
                            <span class="about_project">${description}</span>
                        </li>`;


                let carouselImagesHTML = images.map((img, imgIndex) => {
                    const imgUrl = img.image.large ? img.image.large.src : img.image.src;
                    return `                    <img src="${imgUrl}" ${imgIndex === 0 ? 'class="active"' : ''}>`;
                }).join('\n');

                carouselsHTML += `
                <div id="carousel-${projId}" class="carousel ${isFirst ? 'active' : ''}">
                    <div class="carousel-inner">
${carouselImagesHTML}
                        <div class="carousel-counter"></div>
                    </div>
                </div>`;
            }

            template = template.replace('{{EDITORIAL_PROJECT_LINKS}}', projectLinksHTML);
            template = template.replace('{{EDITORIAL_PROJECT_CAROUSELS}}', carouselsHTML);
        } catch (err) {
            console.log(`Skipping Editorial (channel might not exist yet): ${err.message}`);
            template = template.replace('{{EDITORIAL_PROJECT_LINKS}}', '<!-- Editorial links pending -->');
            template = template.replace('{{EDITORIAL_PROJECT_CAROUSELS}}', '<!-- Editorial carousels pending -->');
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
