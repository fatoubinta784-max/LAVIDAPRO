/* =========================================================
   MEDINATI — MES DEMANDES DE CONTACT (messages.html)
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const { esc } = M.text;
    const root = document.getElementById("messageList");
    if (!root) return;

    function render() {
        const items = M.messages.list();

        if (!items.length) {
            root.innerHTML = `
                <section class="notification-empty">
                    <span aria-hidden="true">✉</span>
                    <h2>Pas encore de demande</h2>
                    <p>Ouvrez une annonce et choisissez « Contacter », « Postuler » ou « Commander » pour préparer une demande.</p>
                    <a class="detail-contact" href="recherche.html">Explorer les annonces</a>
                </section>`;
            return;
        }

        const online = M.listings.index();
        root.innerHTML = items.map(item => {
            const listing = online.get(String(item.listingId));
            const date = item.date ? new Date(item.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
            const title = listing
                ? `<a href="${esc(M.listings.url(listing))}">${esc(item.title || "Demande de contact")}</a>`
                : esc(item.title || "Demande de contact");
            return `
                <article class="collection-card">
                    <span class="collection-icon" aria-hidden="true">✉</span>
                    <div class="collection-copy">
                        <small>${esc(item.action || "Contact")} · à ${esc(item.to || "un membre Medinati")}${date ? ` · ${esc(date)}` : ""}</small>
                        <h2>${title}</h2>
                        <p>${esc(item.text || "")}</p>
                        <span class="message-status">${esc(item.status || "Enregistrée sur cet appareil")}</span>
                    </div>
                    <div class="collection-actions">
                        <button type="button" data-remove="${esc(item.id)}" aria-label="Supprimer la demande « ${esc(item.title || "")} »">Supprimer</button>
                    </div>
                </article>`;
        }).join("");
    }

    root.addEventListener("click", async event => {
        const button = event.target.closest("[data-remove]");
        if (!button) return;
        const confirmed = await M.ui.confirm({
            title: "Supprimer cette demande ?",
            message: "Elle sera retirée de cet appareil.",
            confirmLabel: "Supprimer",
            danger: true
        });
        if (!confirmed) return;
        M.messages.remove(button.dataset.remove);
        render();
        M.ui.toast("Demande supprimée.");
    });

    render();
})();
