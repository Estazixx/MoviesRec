
const API_KEY = "f96c1216";
const API_URL = "https://www.omdbapi.com/";

const els = {
    searchForm: document.getElementById("searchForm"),
    movieInput: document.getElementById("movieInput"),
    popularGrid: document.getElementById("popularGrid"),
    movieResult: document.getElementById("movieResult"),
    pagination: document.getElementById("pagination"),
    resultsTitle: document.getElementById("resultsTitle"),
    resultsEyebrow: document.getElementById("resultsEyebrow"),
    hero: document.getElementById("hero"),
    heroTitle: document.getElementById("heroTitle"),
    heroMeta: document.getElementById("heroMeta"),
    heroPlot: document.getElementById("heroPlot"),
    heroPoster: document.getElementById("heroPoster"),
    heroDetails: document.getElementById("heroDetails"),
    heroSave: document.getElementById("heroSave"),
    watchlistNav: document.getElementById("watchlistNav"),
    watchlistCount: document.getElementById("watchlistCount"),
    detailsDialog: document.getElementById("detailsDialog"),
    detailsContent: document.getElementById("detailsContent"),
    toast: document.getElementById("toast")
};

let currentSearch = "";
let currentPage = 1;
let totalPages = 1;
let activeView = "home";
let featuredMovie = null;
let toastTimer;

const POPULAR_TITLES = [
    "The Dark Knight",
    "Inception",
    "Interstellar",
    "The Shawshank Redemption",
    "Spider-Man No Way Home",
    "The Matrix",
    "Gladiator",
    "Parasite"
];

function readWatchlist() {
    try {
        return JSON.parse(
            localStorage.getItem("moviehub-watchlist") || "[]"
        );
    } catch {
        return [];
    }
}

let watchlist = readWatchlist();

function saveWatchlist() {
    localStorage.setItem(
        "moviehub-watchlist",
        JSON.stringify(watchlist)
    );

    updateWatchlistCount();
}

function updateWatchlistCount() {
    els.watchlistCount.textContent = watchlist.length;
}

function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        els.toast.classList.remove("show");
    }, 2300);
}

function safePoster(poster) {
    return poster && poster !== "N/A"
        ? poster
        : "https://placehold.co/400x600/22222a/eeeeee?text=No+Poster";
}

async function api(params) {
    const url = new URL(API_URL);

    url.search = new URLSearchParams({
        apikey: API_KEY,
        ...params
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not reach movie service.");
    }

    return response.json();
}

function setActiveNav(view) {
    activeView = view;

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });
}

function createMovieCard(movie) {
    const card = document.createElement("article");
    card.className = "movie-card";

    const posterButton = document.createElement("button");
    posterButton.className = "poster-button";
    posterButton.type = "button";

    const poster = document.createElement("img");
    poster.className = "movie-poster";
    poster.src = safePoster(movie.Poster);
    poster.alt = movie.Title + " poster";
    poster.loading = "lazy";

    const overlay = document.createElement("span");
    overlay.className = "poster-overlay";
    overlay.textContent = "View movie details →";

    posterButton.append(poster, overlay);

    posterButton.addEventListener("click", () => {
        openDetails(movie.imdbID);
    });

    const info = document.createElement("div");
    info.className = "movie-info";

    const title = document.createElement("h3");
    title.className = "movie-title";
    title.textContent = movie.Title;

    const subtitle = document.createElement("p");
    subtitle.className = "movie-subtitle";
    subtitle.textContent =
        `${movie.Year || "Unknown"} · ${movie.Type || "Movie"}`;

    const actions = document.createElement("div");
    actions.className = "movie-actions";

    const detailsButton = document.createElement("button");
    detailsButton.className = "small-button";
    detailsButton.textContent = "Details";

    detailsButton.addEventListener("click", () => {
        openDetails(movie.imdbID);
    });

    const saveButton = document.createElement("button");
    saveButton.className = "small-button";

    refreshSaveButton(saveButton, movie.imdbID);

    saveButton.addEventListener("click", () => {
        toggleWatchlist(movie, saveButton);
    });

    actions.append(detailsButton, saveButton);
    info.append(title, subtitle, actions);
    card.append(posterButton, info);

    return card;
}

function refreshSaveButton(button, imdbID) {
    const saved = watchlist.some(
        item => item.imdbID === imdbID
    );

    button.textContent = saved
        ? "♥ Saved"
        : "♡ Watchlist";

    button.classList.toggle("saved", saved);
}

function toggleWatchlist(movie, button) {
    const index = watchlist.findIndex(
        item => item.imdbID === movie.imdbID
    );

    if (index >= 0) {
        watchlist.splice(index, 1);
        showToast("Removed from your watchlist");
    } else {
        watchlist.push({
            imdbID: movie.imdbID,
            Title: movie.Title,
            Year: movie.Year,
            Type: movie.Type,
            Poster: movie.Poster
        });

        showToast("Added to your watchlist");
    }

    saveWatchlist();

    if (button) {
        refreshSaveButton(button, movie.imdbID);
    }

    updateHeroSaveButton();

    if (activeView === "watchlist") {
        renderWatchlist();
    }
}

function updateHeroSaveButton() {
    if (!featuredMovie) return;

    const saved = watchlist.some(
        item => item.imdbID === featuredMovie.imdbID
    );

    els.heroSave.textContent = saved
        ? "♥ Saved to watchlist"
        : "♡ Add to watchlist";
}

async function showFeatured(imdbID) {
    try {
        const movie = await api({
            i: imdbID,
            plot: "short"
        });

        if (movie.Response !== "True") {
            throw new Error("Movie not found");
        }

        featuredMovie = movie;

        els.heroTitle.textContent = movie.Title;
        els.heroKicker.textContent = "FEATURED MOVIE";

        els.heroMeta.textContent = [
            movie.Year,
            movie.Runtime,
            movie.Genre,
            movie.imdbRating !== "N/A"
                ? `IMDb ${movie.imdbRating}`
                : ""
        ].filter(Boolean).join(" • ");

        els.heroPlot.textContent =
            movie.Plot !== "N/A"
                ? movie.Plot
                : "Discover more about this movie.";

        els.heroPoster.src = safePoster(movie.Poster);
        els.heroPoster.alt = movie.Title + " poster";
        els.heroPoster.hidden = movie.Poster === "N/A";

        els.heroDetails.disabled = false;
        els.heroSave.disabled = false;

        updateHeroSaveButton();

    } catch (error) {
        console.error(error);
        showToast("Couldn't load featured movie.");
    }
}

async function loadPopular() {
    els.popularGrid.replaceChildren(
        status("Finding popular picks...")
    );

    const movies = await Promise.all(
        POPULAR_TITLES.map(async title => {
            try {
                const data = await api({
                    t: title,
                    type: "movie"
                });

                return data.Response === "True"
                    ? data
                    : null;

            } catch {
                return null;
            }
        })
    );

    const valid = movies.filter(Boolean);

    els.popularGrid.replaceChildren();

    if (!valid.length) {
        els.popularGrid.append(
            status("Popular movies couldn't load. Check your API key.")
        );
        return;
    }

    valid.forEach(movie => {
        els.popularGrid.append(createMovieCard(movie));
    });

    if (!featuredMovie) {
        showFeatured(valid[0].imdbID);
    }
}

function status(message) {
    const p = document.createElement("p");
    p.className = "status-message";
    p.textContent = message;
    return p;
}

async function searchMovies(query, page = 1) {
    const trimmed = query.trim();

    if (!trimmed) {
        showToast("Enter a movie title first.");
        return;
    }

    currentSearch = trimmed;
    currentPage = page;

    setActiveNav("home");

    els.resultsTitle.textContent =
        `Results for "${trimmed}"`;

    els.resultsEyebrow.textContent = "MOVIE SEARCH";

    els.movieResult.replaceChildren(
        status("Searching movies...")
    );

    els.pagination.replaceChildren();

    try {
        const data = await api({
            s: trimmed,
            page: String(page),
            type: "movie"
        });

        if (data.Response !== "True") {
            els.movieResult.replaceChildren(
                status(data.Error || "No movies found.")
            );
            return;
        }

        totalPages = Math.ceil(
            Number(data.totalResults) / 10
        );

        els.movieResult.replaceChildren(
            ...data.Search.map(createMovieCard)
        );

        renderPagination();

        document.getElementById("resultsSection")
            .scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

    } catch (error) {
        console.error(error);

        els.movieResult.replaceChildren(
            status("Something went wrong. Check your connection and API key.")
        );
    }
}

function renderPagination() {
    els.pagination.replaceChildren();

    if (totalPages <= 1) return;

    if (currentPage > 1) {
        const previous = document.createElement("button");
        previous.textContent = "← Previous";

        previous.addEventListener("click", () => {
            searchMovies(currentSearch, currentPage - 1);
        });

        els.pagination.append(previous);
    }

    const pageLabel = document.createElement("span");
    pageLabel.textContent =
        `Page ${currentPage} of ${totalPages}`;

    els.pagination.append(pageLabel);

    if (currentPage < totalPages) {
        const next = document.createElement("button");
        next.textContent = "Next →";

        next.addEventListener("click", () => {
            searchMovies(currentSearch, currentPage + 1);
        });

        els.pagination.append(next);
    }
}

async function openDetails(imdbID) {
    els.detailsContent.textContent =
        "Loading movie details...";

    els.detailsDialog.showModal();

    try {
        const movie = await api({
            i: imdbID,
            plot: "full"
        });

        if (movie.Response !== "True") {
            throw new Error("Details unavailable");
        }

        const layout = document.createElement("div");
        layout.className = "details-layout";

        const poster = document.createElement("img");
        poster.className = "details-poster";
        poster.src = safePoster(movie.Poster);
        poster.alt = movie.Title + " poster";

        const copy = document.createElement("div");
        copy.className = "details-copy";

        const title = document.createElement("h2");
        title.textContent = movie.Title;

        const facts = document.createElement("p");
        facts.className = "details-facts";
        facts.textContent = [
            movie.Year,
            movie.Rated,
            movie.Runtime,
            movie.Genre
        ].filter(value => value && value !== "N/A")
            .join(" • ");

        const plot = document.createElement("p");
        plot.textContent =
            movie.Plot !== "N/A"
                ? movie.Plot
                : "No plot summary available.";

        copy.append(title, facts, plot);

        const details = [
            ["IMDb rating", movie.imdbRating],
            ["Director", movie.Director],
            ["Cast", movie.Actors],
            ["Writer", movie.Writer],
            ["Awards", movie.Awards]
        ];

        details.forEach(([label, value]) => {
            if (!value || value === "N/A") return;

            const p = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = label + ": ";

            p.append(
                strong,
                document.createTextNode(value)
            );

            copy.append(p);
        });

        const imdb = document.createElement("a");
        imdb.className = "button button-primary";
        imdb.href =
            `https://www.imdb.com/title/${movie.imdbID}/`;
        imdb.target = "_blank";
        imdb.rel = "noopener noreferrer";
        imdb.textContent = "Open on IMDb ↗";

        copy.append(imdb);
        layout.append(poster, copy);

        els.detailsContent.replaceChildren(layout);

    } catch (error) {
        console.error(error);

        els.detailsContent.textContent =
            "Couldn't load movie details. Please try again.";
    }
}

function renderWatchlist() {
    setActiveNav("watchlist");

    els.resultsEyebrow.textContent = "YOUR SAVED MOVIES";
    els.resultsTitle.textContent = "My Watchlist";

    els.pagination.replaceChildren();

    if (!watchlist.length) {
        els.movieResult.replaceChildren(
            status("Your watchlist is empty. Search for movies and save your favorites!")
        );
        return;
    }

    els.movieResult.replaceChildren(
        ...watchlist.map(createMovieCard)
    );

    document.getElementById("resultsSection")
        .scrollIntoView({ behavior: "smooth" });
}

function showPopularView() {
    setActiveNav("popular");

    document.getElementById("popularSection")
        .scrollIntoView({ behavior: "smooth" });
}

// SEARCH

els.searchForm.addEventListener("submit", event => {
    event.preventDefault();

    searchMovies(els.movieInput.value, 1);
});

// CATEGORY BUTTONS

document.getElementById("categoryList")
    .addEventListener("click", event => {

        const button = event.target.closest("[data-query]");

        if (!button) return;

        document.querySelectorAll(".category-chip")
            .forEach(chip => {
                chip.classList.toggle(
                    "selected",
                    chip === button
                );
            });

        els.movieInput.value = button.dataset.query;

        searchMovies(button.dataset.query, 1);
    });

// NAVIGATION

document.querySelectorAll(".nav-link")
    .forEach(button => {

        button.addEventListener("click", () => {

            if (button.dataset.view === "watchlist") {
                renderWatchlist();

            } else if (button.dataset.view === "popular") {
                showPopularView();

            } else {
                setActiveNav("home");

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        });
    });

els.watchlistNav.addEventListener(
    "click",
    renderWatchlist
);

document.getElementById("refreshPopular")
    .addEventListener("click", loadPopular);

document.getElementById("dialogClose")
    .addEventListener("click", () => {
        els.detailsDialog.close();
    });

els.detailsDialog.addEventListener("click", event => {
    if (event.target === els.detailsDialog) {
        els.detailsDialog.close();
    }
});

els.heroDetails.addEventListener("click", () => {
    if (featuredMovie) {
        openDetails(featuredMovie.imdbID);
    }
});

els.heroSave.addEventListener("click", () => {
    if (featuredMovie) {
        toggleWatchlist(featuredMovie);
    }
});

// INITIALIZE

updateWatchlistCount();
loadPopular();
