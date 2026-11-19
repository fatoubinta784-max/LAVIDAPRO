/* =========================================================
   MEDINATI — RECHERCHE (recherche.html?q=…&categorie=…)
   Cherche dans les annonces des membres ET dans les exemples.
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const { esc } = M.text;
    const $ = id => document.getElementById(id);

    const searchInput = $("searchInput");
    const clearSearch = $("clearSearch");
    const resultsList = $("resultsList");
    const resultsCount = $("resultsCount");
    const resultsTitle = $("resultsTitle");
    const emptyState = $("emptyState");
    const recentSection = $("recentSearchesSection");
    const recentList = $("recentSearches");
    const filters = [...document.querySelectorAll(".filter")];
    if (!searchInput || !resultsList) return;

    const listings = M.listings.all();
    let selectedCategory = "all";


    /* ---------- Localisation ---------- */

    const user = M.account.current();
    const place = user ? M.location.format(user.location, "short") : "";
    $("searchLocation").textContent = place ? `📍 ${place}` : "📍 Connectez-vous pour voir votre quartier";


    /* ---------- Recherches récentes ---------- */

    function recentSearches() {
        return M.store.readList(M.KEYS.recentSearches).filter(item => typeof item === "string");
    }

    function rememberSearch(query) {
        const value = query.trim();
        if (!value) return;
        const list = recentSearches().filter(item => item.toLowerCase() !== value.toLowerCase());
        list.unshift(value);
        M.store.write(M.KEYS.recentSearches, list.slice(0, 8));
        displayRecentSearches();
    }

    function displayRecentSearches() {
        const searches = recentSearches();
        recentSection.hidden = searches.length === 0;
        recentList.replaceChildren(...searches.map(search => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "recent-item";
            button.innerHTML = `<span class="recent-icon" aria-hidden="true">🕘</span><span>${esc(search)}</span>`;
            button.addEventListener("click", () => {
                searchInput.value = search;
                performSearch();
            });
            return button;
        }));
    }

    $("clearHistory").addEventListener("click", () => {
        M.store.remove(M.KEYS.recentSearches);
        displayRecentSearches();
    });


    /* ---------- Filtres ---------- */

    function selectCategory(category) {
        selectedCategory = category;
        filters.forEach(filter => {
            const active = filter.dataset.category === category;
            filter.classList.toggle("active", active);
            filter.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    filters.forEach(filter => filter.addEventListener("click", () => {
        selectCategory(filter.dataset.category || "all");
        performSearch();
    }));


    /* ---------- Recherche ---------- */

    function updateUrl(query) {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (selectedCategory !== "all") params.set("categorie", selectedCategory);
        const next = `recherche.html${params.toString() ? `?${params}` : ""}`;
        history.replaceState(null, "", next);
    }

    function cardFor(item) {
        const visual = item.photo
            ? `<img class="result-photo" src="${esc(item.photo)}" alt="">`
            : `<div class="result-icon" aria-hidden="true">${esc(item.icon)}</div>`;
        return `
            <a class="result-card" href="${esc(M.listings.url(item))}" data-id="${esc(item.id)}">
                <div class="result-top">
                    ${visual}
                    <div class="result-info">
                        <h3>${esc(item.title)}</h3>
                        <span class="result-category">${esc(item.categoryName)} · ${esc(item.typeName)}</span>
                    </div>
                </div>
                <p class="result-description">${esc(item.description)}</p>
                <div class="result-location">📍 ${esc(item.location)}${item.demo ? "" : ` · ${esc(M.text.relativeDate(item.date))}`}</div>
            </a>`;
    }

    function performSearch() {
        const query = searchInput.value.trim();
        clearSearch.hidden = query.length === 0;

        const results = listings.filter(item =>
            (selectedCategory === "all" || item.category === selectedCategory) && M.listings.matches(item, query)
        );

        if (query) resultsTitle.textContent = `Résultats pour « ${query} »`;
        else if (selectedCategory !== "all") resultsTitle.textContent = M.listings.CATEGORIES[selectedCategory].label;
        else resultsTitle.textContent = "Découvrir";

        resultsCount.textContent = M.text.plural(results.length, "résultat");
        resultsList.innerHTML = results.map(cardFor).join("");
        emptyState.hidden = results.length > 0;
        updateUrl(query);
    }

    /* Mémoriser la recherche quand on ouvre un résultat. */
    resultsList.addEventListener("click", event => {
        if (event.target.closest(".result-card") && searchInput.value.trim()) rememberSearch(searchInput.value);
    });

    let typingTimer = null;
    searchInput.addEventListener("input", () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(performSearch, 120);
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        rememberSearch(searchInput.value);
        performSearch();
        searchInput.blur();
    });

    clearSearch.addEventListener("click", () => {
        searchInput.value = "";
        performSearch();
        searchInput.focus();
    });


    /* ---------- Démarrage (liens « ?q= » et « ?categorie= ») ---------- */

    const params = new URLSearchParams(window.location.search);
    searchInput.value = params.get("q") || "";
    selectCategory(M.listings.categoryFromParam(params.get("categorie")) || "all");
    displayRecentSearches();
    performSearch();

    const active = filters.find(filter => filter.classList.contains("active"));
    if (active && active.dataset.category !== "all") active.scrollIntoView({ block: "nearest", inline: "center" });
})();
