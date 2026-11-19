/* =========================================================
   MEDINATI — ACCUEIL (home.html)
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const { esc } = M.text;
    const user = M.account.current();


    /* ---------- Salutation et localisation ---------- */

    if (user) {
        document.getElementById("welcomeName").textContent = `Bonjour ${M.account.firstName(user)} 👋`;
        const place = M.location.format(user.location, "short");
        if (place) document.getElementById("currentLocation").textContent = `📍 ${place}`;
    }


    /* ---------- Recherche : vide = tout explorer ---------- */

    const form = document.getElementById("homeSearch");
    form.addEventListener("submit", event => {
        event.preventDefault();
        const query = document.getElementById("globalSearch").value.trim();
        window.location.href = `recherche.html${query ? `?q=${encodeURIComponent(query)}` : ""}`;
    });


    /* ---------- Dernières annonces ---------- */

    const list = document.getElementById("publicationsList");
    const latest = M.listings.publications().slice(0, 4);

    list.innerHTML = latest.length
        ? latest.map(item => `
            <a class="publication-card publication-link" href="${esc(M.listings.url(item))}">
                <div class="publication-header">
                    <div class="publication-avatar" aria-hidden="true">${esc(item.initials)}</div>
                    <div>
                        <strong>${esc(item.user)}</strong>
                        <small>${esc(item.icon)} ${esc(item.typeName)} · ${esc(M.text.relativeDate(item.date))}</small>
                    </div>
                </div>
                ${item.photo ? `<img class="publication-photo" src="${esc(item.photo)}" alt="">` : ""}
                <h3>${esc(item.title)}</h3>
                <p>${esc(item.description)}</p>
                <div class="publication-location">📍 ${esc(item.location)}</div>
            </a>`).join("")
        : `
            <div class="publication-card">
                <h3>Le quartier vous attend 🎉</h3>
                <p>Aucune annonce pour l’instant. Soyez la première personne à publier !</p>
                <a class="detail-contact" href="nouvelle.html?publier=1">＋ Publier une annonce</a>
            </div>`;
})();
