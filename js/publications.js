/* =========================================================
   MEDINATI — PUBLICATIONS (nouvelle.html)
   Fil des annonces, publication, actions sur une annonce.

   Liens utiles :
   nouvelle.html?publier=1        → ouvre le choix du type
   nouvelle.html?publier=vente    → ouvre directement le formulaire
   nouvelle.html?vue=miennes      → affiche « Mes publications »
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const { esc, relativeDate } = M.text;
    const $ = id => document.getElementById(id);

    const feed = $("publicationFeed");
    if (!feed) return;

    const searchInput = $("publicationSearchInput");
    const formContent = $("formContent");
    const actionContent = $("actionContent");
    const TYPES = M.listings.TYPES;

    let currentFilter = "all";


    /* =====================================================
       PROFIL DANS L’EN-TÊTE ET LA BARRE LATÉRALE
    ===================================================== */

    function renderProfile() {
        const user = M.account.current();
        const name = user ? M.account.fullName(user) : "Bienvenue";
        const place = user ? user.location || {} : {};
        $("sidebarName").textContent = name;
        $("sidebarPlace").textContent = user ? M.location.format(place, "city") || "Votre quartier" : "Connectez-vous pour publier";
        $("locationCity").textContent = place.city || "Votre ville";
        $("locationDistrict").textContent = place.neighborhood || place.district || "Choisissez votre quartier";
        $("changeLocation").href = user ? "account.html#localisation" : "connexion.html?retour=nouvelle.html";
        $("changeLocation").textContent = user ? "Modifier" : "Se connecter";
        document.querySelectorAll("[data-tab-mine]").forEach(tab => { tab.hidden = !user; });
    }


    /* =====================================================
       FIL DES PUBLICATIONS
    ===================================================== */

    function nearby(item) {
        const user = M.account.current();
        const place = user && user.location;
        if (!place) return true;
        const where = M.text.fold(item.location);
        return [place.neighborhood, place.district, place.city]
            .filter(Boolean)
            .some(part => where.includes(M.text.fold(part)));
    }

    function visiblePublications() {
        const query = searchInput.value.trim();
        return M.listings.publications().filter(item => {
            if (!M.listings.matches(item, query)) return false;
            if (currentFilter === "all") return true;
            if (currentFilter === "nearby") return nearby(item);
            if (currentFilter === "mine") return M.listings.isOwner(item);
            return item.type === currentFilter;
        });
    }

    function emptyFeed() {
        if (currentFilter === "mine") {
            return `
                <div class="empty-feed">
                    <div class="empty-icon" aria-hidden="true">✍️</div>
                    <h3>Vous n’avez encore rien publié</h3>
                    <p>Proposez un service, vendez un objet ou partagez une information avec votre quartier.</p>
                    <button type="button" class="detail-contact" data-open-publish>＋ Publier une annonce</button>
                </div>`;
        }
        if (currentFilter === "nearby" && !M.account.current()) {
            return `
                <div class="empty-feed">
                    <div class="empty-icon" aria-hidden="true">📍</div>
                    <h3>Connectez-vous pour voir votre quartier</h3>
                    <p>Votre localisation permet d’afficher les annonces proches de chez vous.</p>
                    <a class="detail-contact" href="connexion.html?retour=nouvelle.html">Se connecter</a>
                </div>`;
        }
        return `
            <div class="empty-feed">
                <div class="empty-icon" aria-hidden="true">🔎</div>
                <h3>Aucune publication trouvée</h3>
                <p>Essayez une autre recherche ou une autre catégorie, ou publiez la première annonce.</p>
                <button type="button" class="detail-contact" data-open-publish>＋ Publier une annonce</button>
            </div>`;
    }

    function card(item) {
        const isSaved = M.saved.has(item.id);
        const mine = M.listings.isOwner(item);
        const details = item.details.map(detail => `<span class="pub-detail">${esc(detail)}</span>`).join("");
        const mainAction = item.action
            ? `<button type="button" class="primary" data-action="main" data-id="${esc(item.id)}">${esc(item.action)}</button>`
            : `<a class="primary pub-link-button" href="${esc(M.listings.url(item))}">Voir</a>`;

        return `
            <article class="publication-card" data-id="${esc(item.id)}">
                <div class="pub-header">
                    <div class="pub-avatar" aria-hidden="true">${esc(item.initials)}</div>
                    <div class="pub-user">
                        <strong>${esc(item.user)}${mine ? ' <span class="pub-mine">Vous</span>' : ""}</strong>
                        <small>${esc(relativeDate(item.date))}</small>
                    </div>
                    <button type="button" class="pub-menu" data-action="menu" data-id="${esc(item.id)}" aria-label="Plus d’options pour « ${esc(item.title)} »">⋮</button>
                </div>

                <span class="pub-type">${esc(item.icon)} ${esc(item.typeName)}</span>

                <h3><a class="pub-title-link" href="${esc(M.listings.url(item))}">${esc(item.title)}</a></h3>

                ${item.photo ? `<img class="pub-photo" src="${esc(item.photo)}" alt="Photo de « ${esc(item.title)} »" loading="lazy">` : ""}

                <p class="pub-description">${esc(item.description)}</p>

                ${details ? `<div class="pub-details">${details}</div>` : ""}

                <div class="pub-footer">
                    <span class="pub-location">📍 ${esc(item.location)}</span>
                    <div class="pub-actions">
                        <button type="button" data-action="save" data-id="${esc(item.id)}" aria-pressed="${isSaved}">${isSaved ? "♥ Enregistrée" : "♡ Enregistrer"}</button>
                        ${mine ? `<a class="primary pub-link-button" href="${esc(M.listings.url(item))}">Gérer</a>` : mainAction}
                    </div>
                </div>
            </article>`;
    }

    function renderPublications() {
        const items = visiblePublications();
        feed.innerHTML = items.length ? items.map(card).join("") : emptyFeed();
    }


    /* =====================================================
       ONGLETS ET RECHERCHE
    ===================================================== */

    const tabs = [...document.querySelectorAll(".feed-tabs .tab")];

    function selectTab(filter) {
        currentFilter = filter;
        tabs.forEach(tab => {
            const active = tab.dataset.filter === filter;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-pressed", active ? "true" : "false");
        });
        renderPublications();
    }

    tabs.forEach(tab => tab.addEventListener("click", () => selectTab(tab.dataset.filter)));

    let typingTimer = null;
    searchInput.addEventListener("input", () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(renderPublications, 120);
    });

    $("searchPublication").addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        searchInput.focus({ preventScroll: true });
    });


    /* =====================================================
       PUBLIER
    ===================================================== */

    /* Liste des types, construite depuis le socle commun. */
    $("publicationTypes").innerHTML = Object.entries(TYPES).map(([key, type]) => `
        <button type="button" data-type="${key}">
            <span aria-hidden="true">${type.icon}</span>
            <strong>${esc(type.label)}</strong>
            <small>${esc(type.hint)}</small>
        </button>`).join("");

    function openPublicationSelector() {
        if (!M.account.require("Connectez-vous pour publier une annonce.", "nouvelle.html?publier=1")) return;
        M.ui.openModal("publishModal");
    }

    function startForm(type) {
        if (!M.account.require("Connectez-vous pour publier une annonce.", `nouvelle.html?publier=${type}`)) return;
        M.ui.closeModal("publishModal");
        createForm(type);
        M.ui.openModal("formModal");
    }

    $("openPublish").addEventListener("click", openPublicationSelector);
    $("quickPublish").addEventListener("click", openPublicationSelector);

    document.addEventListener("click", event => {
        if (event.target.closest("[data-open-publish]")) openPublicationSelector();
    });

    $("publicationTypes").addEventListener("click", event => {
        const button = event.target.closest("button[data-type]");
        if (button) startForm(button.dataset.type);
    });

    document.querySelectorAll(".quick-actions button").forEach(button => {
        button.addEventListener("click", () => {
            if (button.dataset.type) startForm(button.dataset.type);
            else openPublicationSelector();
        });
    });

    /* Champs propres à chaque type : [nom, libellé, type de champ, options ou exemple]. */
    const EXTRA_FIELDS = {
        emploi: [["poste", "Poste", "text", "Ex : Assistante administrative"], ["contrat", "Type de contrat", "select", ["CDI", "CDD", "Stage", "Alternance", "Temps partiel", "Mission"]]],
        vente: [["prix", "Prix", "text", "Ex : 250 MAD"], ["etat", "État", "select", ["Neuf", "Très bon état", "Bon état", "Occasion"]]],
        immobilier: [["operation", "Type", "select", ["Location", "Vente", "Recherche"]], ["prix", "Prix ou loyer", "text", "Ex : 4 000 MAD"]],
        restaurant: [["specialite", "Spécialité", "text", "Ex : Cuisine guinéenne, grillades…"], ["horaires", "Horaires", "text", "Ex : 11 h – 23 h"]],
        evenement: [["dateEvent", "Date", "date", ""], ["lieu", "Lieu", "text", "Lieu de l’événement"]],
        service: [["domaine", "Domaine du service", "text", "Ex : Informatique, coiffure…"], ["tarif", "Tarif", "text", "Ex : À partir de 100 MAD"]],
        formation: [["domaine", "Domaine", "text", "Ex : Informatique"], ["format", "Format", "select", ["Présentiel", "En ligne", "Hybride"]]],
        livraison: [["depart", "Départ", "text", "Ex : Oulfa"], ["destination", "Destination", "text", "Ex : Maârif"]]
    };

    const FIELD_LABELS = { poste: "Poste", contrat: "Contrat", prix: "Prix", etat: "État", operation: "Opération", specialite: "Spécialité", horaires: "Horaires", dateEvent: "Date", lieu: "Lieu", domaine: "Domaine", tarif: "Tarif", format: "Format", depart: "Départ", destination: "Destination" };

    function extraFieldsHtml(type) {
        const fields = EXTRA_FIELDS[type] || [];
        if (!fields.length) return "";
        return `<div class="form-grid">${fields.map(([name, label, kind, extra]) => {
            const id = `pub-${name}`;
            const control = kind === "select"
                ? `<select id="${id}" name="${name}">${extra.map(option => `<option>${esc(option)}</option>`).join("")}</select>`
                : `<input id="${id}" name="${name}" type="${kind}" maxlength="80" placeholder="${esc(extra)}">`;
            return `<div class="form-group"><label for="${id}">${esc(label)}</label>${control}</div>`;
        }).join("")}</div>`;
    }

    let pendingPhoto = "";

    function createForm(type) {
        const info = TYPES[type] || TYPES.information;
        const user = M.account.current();
        pendingPhoto = "";

        formContent.innerHTML = `
            <h2 id="formTitle">${info.icon} ${esc(info.label)}</h2>
            <p class="modal-subtitle">Complétez les informations de votre publication.</p>

            <form id="publicationForm" class="pub-form" novalidate>
                <div class="form-group">
                    <label for="pub-title">Titre</label>
                    <input id="pub-title" name="title" required maxlength="90" placeholder="Titre de votre publication">
                </div>

                ${extraFieldsHtml(type)}

                <div class="form-group">
                    <label for="pub-description">Description</label>
                    <textarea id="pub-description" name="description" required maxlength="1000" placeholder="Décrivez votre publication…"></textarea>
                </div>

                <div class="form-group">
                    <label for="pub-location">Localisation</label>
                    <input id="pub-location" name="location" required maxlength="80" value="${esc(M.location.format(user && user.location, "short"))}">
                </div>

                <div class="form-group pub-photo-field">
                    <label for="pub-photo">Photo <span>(facultatif)</span></label>
                    <input id="pub-photo" type="file" accept="image/*">
                    <img id="pub-photo-preview" class="pub-photo-preview" alt="Aperçu de la photo" hidden>
                </div>

                <p class="form-alert" id="publicationError" role="alert"></p>

                <button type="submit" class="form-submit">Publier</button>
            </form>`;

        const form = $("publicationForm");
        const photoInput = $("pub-photo");
        const preview = $("pub-photo-preview");
        const error = $("publicationError");

        photoInput.addEventListener("change", async () => {
            const file = photoInput.files && photoInput.files[0];
            error.textContent = "";
            pendingPhoto = "";
            preview.hidden = true;
            if (!file) return;
            if (file.size > 15 * 1024 * 1024) {
                photoInput.value = "";
                error.textContent = "Cette photo est trop lourde (15 Mo maximum).";
                return;
            }
            try {
                pendingPhoto = await M.images.resize(file, 960, 0.78);
                preview.src = pendingPhoto;
                preview.hidden = false;
            } catch {
                photoInput.value = "";
                error.textContent = "Cette image n’a pas pu être lue. Essayez une autre photo.";
            }
        });

        form.addEventListener("submit", event => submitPublication(event, type));
    }

    function submitPublication(event, type) {
        event.preventDefault();
        const form = event.target;
        const error = $("publicationError");
        const user = M.account.current();
        if (!user) {
            M.account.require("Connectez-vous pour publier une annonce.", "nouvelle.html?publier=1");
            return;
        }

        const data = new FormData(form);
        const title = String(data.get("title") || "").trim();
        const description = String(data.get("description") || "").trim();
        const location = String(data.get("location") || "").trim();

        const missing = [];
        [["title", title, "un titre"], ["description", description, "une description"], ["location", location, "une localisation"]].forEach(([name, value, label]) => {
            const input = form.elements[name];
            input.classList.toggle("input-error", !value);
            if (!value) missing.push(label);
        });
        if (missing.length) {
            error.textContent = `Ajoutez ${missing.join(", ")}.`;
            form.querySelector(".input-error").focus();
            return;
        }

        const details = [];
        for (const [key, value] of data.entries()) {
            if (["title", "description", "location"].includes(key) || !String(value).trim()) continue;
            const shown = key === "dateEvent" ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : String(value).trim();
            details.push(`${FIELD_LABELS[key] || key} : ${shown}`);
        }

        const publication = {
            id: M.text.uid("pub"),
            type,
            user: M.account.fullName(user),
            initials: M.account.initials(user),
            title,
            description,
            location,
            details,
            date: new Date().toISOString(),
            photo: pendingPhoto,
            ownerEmail: user.email
        };

        if (!M.listings.add(publication)) {
            error.textContent = pendingPhoto
                ? "L’espace de cet appareil est plein. Réessayez sans photo, ou supprimez d’anciennes annonces."
                : "La publication n’a pas pu être enregistrée sur cet appareil.";
            return;
        }

        M.ui.closeModal("formModal");
        M.notifications.add(`Votre annonce « ${title} » est publiée.`, M.listings.url({ id: publication.id }));
        selectTab("all");
        M.ui.toast("Publication créée avec succès.", "success");
        feed.querySelector(".publication-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }


    /* =====================================================
       ACTIONS SUR UNE PUBLICATION
    ===================================================== */

    feed.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) {
            /* Un clic ailleurs sur la carte ouvre l’annonce. */
            const cardElement = event.target.closest(".publication-card[data-id]");
            if (cardElement && !event.target.closest("a, button")) {
                window.location.href = M.listings.url({ id: cardElement.dataset.id });
            }
            return;
        }

        const item = M.listings.find(button.dataset.id);
        if (!item) return;

        if (button.dataset.action === "save") {
            const nowSaved = M.saved.toggle(item);
            button.textContent = nowSaved ? "♥ Enregistrée" : "♡ Enregistrer";
            button.setAttribute("aria-pressed", nowSaved ? "true" : "false");
            M.ui.toast(nowSaved ? "Publication enregistrée dans vos favoris." : "Publication retirée de vos favoris.");
        }
        if (button.dataset.action === "main") openAction(item);
        if (button.dataset.action === "menu") openMenu(item);
    });

    /* Postuler, Commander, Participer… : prépare une demande de contact. */
    function openAction(item) {
        if (!M.account.require(`Connectez-vous pour ${item.action.toLowerCase()}.`, M.listings.url(item))) return;

        actionContent.innerHTML = `
            <div class="action-content">
                <h2 id="actionTitle">${esc(item.action)} · ${esc(item.title)}</h2>
                <p>📍 ${esc(item.location)} — publié par ${esc(item.user)}</p>
                <form id="actionForm" novalidate>
                    <label for="actionText">Votre message</label>
                    <textarea id="actionText" rows="4" maxlength="600">${esc(M.messages.draft(item, item.action))}</textarea>
                    <p class="form-alert" id="actionError" role="alert"></p>
                    <div class="action-buttons">
                        <button type="submit" class="primary">Enregistrer la demande</button>
                        <a class="action-secondary" href="${esc(M.listings.url(item))}">Voir l’annonce</a>
                    </div>
                </form>
                <p class="detail-hint">Votre demande est gardée sur cet appareil, dans « Mes demandes ».</p>
            </div>`;

        M.ui.openModal("actionModal");

        $("actionForm").addEventListener("submit", event => {
            event.preventDefault();
            const text = $("actionText").value.trim();
            if (text.length < 5) {
                $("actionError").textContent = "Écrivez quelques mots à la personne.";
                return;
            }
            if (!M.messages.add(item, text, item.action)) return;
            M.ui.closeModal("actionModal");
            M.ui.toast("Demande enregistrée dans « Mes demandes ».", "success");
        });
    }

    function openMenu(item) {
        const mine = M.listings.isOwner(item);
        const isSaved = M.saved.has(item.id);

        actionContent.innerHTML = `
            <div class="action-content">
                <h2 id="actionTitle">${esc(item.title)}</h2>
                <p>Que souhaitez-vous faire ?</p>
                <div class="action-buttons action-list">
                    <a href="${esc(M.listings.url(item))}">👁 Voir l’annonce</a>
                    <button type="button" data-menu="save">${isSaved ? "♥ Retirer des favoris" : "♡ Enregistrer"}</button>
                    <button type="button" data-menu="share">↗ Partager</button>
                    ${mine
                        ? '<button type="button" data-menu="delete" class="danger">🗑 Supprimer mon annonce</button>'
                        : '<button type="button" data-menu="report">⚠ Signaler</button>'}
                </div>
            </div>`;

        M.ui.openModal("actionModal");

        actionContent.querySelector(".action-list").addEventListener("click", async event => {
            const choice = event.target.closest("[data-menu]");
            if (!choice) return;
            const action = choice.dataset.menu;

            if (action === "save") {
                const nowSaved = M.saved.toggle(item);
                M.ui.toast(nowSaved ? "Publication enregistrée dans vos favoris." : "Publication retirée de vos favoris.");
                M.ui.closeModal("actionModal");
                renderPublications();
            }

            if (action === "share") {
                const url = new URL(M.listings.url(item), window.location.href).href;
                try {
                    if (navigator.share) await navigator.share({ title: item.title, text: `${item.title} — Medinati`, url });
                    else {
                        await navigator.clipboard.writeText(`${item.title} — Medinati : ${url}`);
                        M.ui.toast("Lien de l’annonce copié.");
                    }
                } catch { /* partage annulé ou indisponible */ }
            }

            if (action === "report") {
                M.notifications.add(`Votre signalement de « ${item.title} » a été enregistré.`);
                M.ui.closeModal("actionModal");
                M.ui.toast("Merci. Votre signalement a été pris en compte.");
            }

            if (action === "delete") {
                M.ui.closeModal("actionModal");
                const confirmed = await M.ui.confirm({
                    title: "Supprimer cette annonce ?",
                    message: `« ${item.title} » sera retirée de Medinati sur cet appareil. Cette action est définitive.`,
                    confirmLabel: "Supprimer",
                    danger: true
                });
                if (confirmed && M.listings.removePublication(item.id)) {
                    renderPublications();
                    M.ui.toast("Annonce supprimée.");
                }
            }
        });
    }


    /* =====================================================
       DÉMARRAGE
    ===================================================== */

    renderProfile();

    const params = new URLSearchParams(window.location.search);
    selectTab(params.get("vue") === "miennes" && M.account.current() ? "mine" : "all");

    const publishParam = params.get("publier");
    if (publishParam) {
        history.replaceState(null, "", "nouvelle.html");
        if (TYPES[publishParam]) startForm(publishParam);
        else openPublicationSelector();
    }
})();
