/* =========================================================
   MEDINATI — MES FAVORIS (favoris.html)
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const { esc } = M.text;
    const root = document.getElementById("savedList");
    const count = document.getElementById("savedCount");
    if (!root) return;

    function render() {
        const items = M.saved.list();
        if (count) count.textContent = items.length ? M.text.plural(items.length, "annonce enregistrée", "annonces enregistrées") : "";

        if (!items.length) {
            root.innerHTML = `
                <section class="notification-empty">
                    <span aria-hidden="true">♡</span>
                    <h2>Votre sélection est vide</h2>
                    <p>Touchez « Enregistrer » sur une annonce pour la retrouver facilement ici.</p>
                    <a class="detail-contact" href="recherche.html">Découvrir les annonces</a>
                </section>`;
            return;
        }

        const online = M.listings.index();
        root.innerHTML = items.map(item => {
            const live = online.get(item.id);
            const photo = live && live.photo;
            const visual = photo
                ? `<img class="collection-thumb" src="${esc(photo)}" alt="">`
                : `<span class="collection-icon" aria-hidden="true">${esc(item.icon)}</span>`;
            const link = live ? `<a href="${esc(M.listings.url(live))}">${esc(item.title)}</a>` : esc(item.title);
            return `
                <article class="collection-card">
                    ${visual}
                    <div class="collection-copy">
                        <small>${esc(item.categoryName)}${live ? "" : " · n’est plus en ligne"}</small>
                        <h2>${link}</h2>
                        <p>${esc(item.description)}</p>
                        <span>📍 ${esc(item.location)}</span>
                    </div>
                    <div class="collection-actions">
                        ${live ? `<a class="collection-open" href="${esc(M.listings.url(live))}">Voir</a>` : ""}
                        <button type="button" data-remove="${esc(item.id)}" aria-label="Retirer « ${esc(item.title)} » des favoris">Retirer</button>
                    </div>
                </article>`;
        }).join("");
    }

    root.addEventListener("click", event => {
        const button = event.target.closest("[data-remove]");
        if (!button) return;
        M.saved.remove(button.dataset.remove);
        render();
        M.ui.toast("Annonce retirée de vos favoris.");
    });

    render();
})();
