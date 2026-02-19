// ==========================
// 🔐 API CONFIG
// ==========================
const API_KEY = '$2y$10$SfS5zkVmbWbo35xuzdS18tuA9qebNnWXQxckJo6EOUW6UQC0MS';

const books = {
    'sahih-bukhari': 7563,
    'sahih-muslim': 3033,
    'al-tirmidhi': 3956,
    'abu-dawood': 5274,
    'ibn-e-majah': 4341,
    'sunan-nasai': 5758,
    'mishkat': 6294,
    'musnad-ahmad': 28199,
    'al-silsila-sahiha': 4035
};

// ==========================
// 🎯 DOM ELEMENTS
// ==========================
const btn = document.getElementById('generate-btn');
const contentDiv = document.getElementById('hadith-content');
const metadataDiv = document.getElementById('metadata');
const referenceText = document.getElementById('reference');

const themeBtn = document.getElementById("theme-btn");
const icon = document.getElementById("icon");
const starsContainer = document.getElementById("stars");
const particlesContainer = document.getElementById("particles");

// ==========================
// 🔁 RETRY CONTROL
// ==========================
let retryCount = 0;
const MAX_RETRIES = 5;

// ==========================
// 🚀 INIT
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();

    if (btn) {
        btn.addEventListener('click', getHadith);
    }
});

// ==========================
// 📡 FETCH HADITH
// ==========================
async function getHadith() {

    if (!btn || !contentDiv) return;

    // Loading UI
    btn.disabled = true;
    btn.innerText = "Loading...";
    contentDiv.innerHTML = '<p class="loading-text">Fetching Hadith...</p>';
    if (metadataDiv) metadataDiv.style.display = 'none';

    try {
        const bookSlugs = Object.keys(books);
        const randomSlug = bookSlugs[Math.floor(Math.random() * bookSlugs.length)];

        const maxRange = books[randomSlug];
        const randomNum = Math.floor(Math.random() * maxRange) + 1;

        const apiUrl = `https://hadithapi.com/api/hadiths?apiKey=${encodeURIComponent(API_KEY)}&book=${randomSlug}&hadithNumber=${randomNum}`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        let hadithData = null;

        if (data.hadiths && data.hadiths.data && data.hadiths.data.length > 0) {
            hadithData = data.hadiths.data[0];
        } else if (data.data && data.data.length > 0) {
            hadithData = data.data[0];
        }

        if (!hadithData) {
            retryFetch();
            return;
        }

        displayHadith(hadithData, randomSlug);

    } catch (error) {
        console.error(error);

        if (contentDiv) {
            contentDiv.innerHTML = '<p style="color:red;">Error loading Hadith. Try again.</p>';
        }

        if (btn) {
            btn.disabled = false;
            btn.innerText = "Try Again";
        }
    }
}

// ==========================
// 🔁 RETRY HANDLER
// ==========================
function retryFetch() {
    retryCount++;

    if (retryCount > MAX_RETRIES) {
        if (contentDiv) {
            contentDiv.innerHTML = '<p>No suitable Hadith found. Try again.</p>';
        }

        if (btn) {
            btn.disabled = false;
            btn.innerText = "Try Again";
        }

        retryCount = 0;
        return;
    }

    getHadith();
}

// ==========================
// 📖 DISPLAY HADITH
// ==========================
function displayHadith(hadith, bookSlug) {

    if (!contentDiv) return;

    let text = hadith.hadithEnglish;

    // Skip if no English
    if (!text || text.trim() === "") {
        retryFetch();
        return;
    }

    retryCount = 0;

    text = text.replace(/\n/g, '<br>');

    contentDiv.innerHTML = `<p>${text}</p>`;

    // Format book name
    const formattedBook = bookSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    if (referenceText) {
        referenceText.innerText = `${formattedBook} — Hadith ${hadith.hadithNumber}`;
    }

    if (metadataDiv) {
        metadataDiv.style.display = 'block';
    }

    if (btn) {
        btn.disabled = false;
        btn.innerText = "Read another Hadith";
    }
}

// ==========================
// 🌗 THEME SYSTEM
// ==========================
function initTheme() {

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        document.documentElement.classList.add("dark");

        if (icon) icon.innerText = "🌙";

        generateStars();

    } else {
        document.body.classList.remove("dark");
        document.documentElement.classList.remove("dark");

        if (icon) icon.innerText = "☀️";

        generateParticles();
    }
}

// Toggle theme
if (themeBtn) {
    themeBtn.addEventListener("click", () => {

        const isDark = document.body.classList.toggle("dark");
        document.documentElement.classList.toggle("dark");

        if (isDark) {
            localStorage.setItem("theme", "dark");

            if (icon) icon.innerText = "🌙";

            if (particlesContainer) particlesContainer.innerHTML = "";
            generateStars();

        } else {
            localStorage.setItem("theme", "light");

            if (icon) icon.innerText = "☀️";

            if (starsContainer) starsContainer.innerHTML = "";
            generateParticles();
        }
    });
}

// ==========================
// ✨ STARS (DARK MODE)
// ==========================
function generateStars() {
    if (!starsContainer) return;

    starsContainer.innerHTML = "";

    for (let i = 0; i < 80; i++) {
        const star = document.createElement("div");
        star.classList.add("star");

        star.style.top = Math.random() * 100 + "%";
        star.style.left = Math.random() * 100 + "%";
        star.style.animationDuration = (Math.random() * 2 + 1) + "s";

        starsContainer.appendChild(star);
    }
}

// ==========================
// ☀️ PARTICLES (LIGHT MODE)
// ==========================
function generateParticles() {
    if (!particlesContainer) return;

    particlesContainer.innerHTML = "";

    for (let i = 0; i < 40; i++) {
        const particle = document.createElement("div");
        particle.classList.add("particle");

        particle.style.top = Math.random() * 100 + "%";
        particle.style.left = Math.random() * 100 + "%";
        particle.style.animationDuration = (Math.random() * 5 + 5) + "s";

        particlesContainer.appendChild(particle);
    }
}

const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("nav-menu");

if (hamburger) {
    hamburger.addEventListener("click", () => {
        navMenu.classList.toggle("active");
    });
}
document.querySelectorAll("#nav-menu a").forEach(link => {
    link.addEventListener("click", () => {
        navMenu.classList.remove("active");
    });
});
