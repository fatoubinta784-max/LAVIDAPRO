/* =========================================================
   MEDINATI — FICHE D’UNE ANNONCE (detail.html?id=…)
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const { esc, relativeDate } = M.text;
    const $ = id => document.getElementById(id);

    const card = $("detailCard");
    const empty = $("detailEmpty");
    if (!card || !empty) return;

    /* Retour : page précédente du site si elle existe, sinon la recherche. */
    const back = $("detailBack");
    if (back && document.referrer && new URL(document.referrer).origin === window.location.origin) {
        back.addEventListener("click", event => {
            event.preventDefault();
            history.back();
        });
    }

    /* L’annonce : par son identifiant, sinon la dernière ouverte (anciens liens). */
    const id = new URLSearchParams(window.location.search).get("id");
    let item = id ? M.listings.find(id) : null;
    if (!item && !id) {
        const legacy = M.store.read(M.KEYS.selected, null);
        if (legacy && legacy.title) item = M.listings.find(legacy.id) || M.listings.normalize(legacy);
    }

    if (!item) {
        empty.hidden = false;
        return;
    }

    const isOwner = M.listings.isOwner(item);
    const actionLabel = item.action && item.action !== "Voir" ? item.action : "Contacter";

    document.title = `${item.title} | Medinati`;
    card.hidden = false;

    $("detailIcon").textContent = item.icon;
    $("detailCategory").textContent = `${item.categoryName} · ${item.typeName}`;
    $("detailTitle").textContent = item.title;
    $("detailMeta").textContent = `Publié par ${item.user} · ${relativeDate(item.date)}`;
    $("detailDescription").textContent = item.description || "Contactez le membre pour en savoir plus.";
    $("detailLocation").textContent = `📍 ${item.location}`;

    if (item.photo) {
        const photo = $("detailPhoto");
        photo.src = item.photo;
        photo.alt = `Photo de l’annonce « ${item.title} »`;
        photo.hidden = false;
    }

    const chips = $("detailChips");
    chips.innerHTML = item.details.map(detail => `<span>${esc(detail)}</span>`).join("");
    chips.hidden = item.details.length === 0;


    /* ---------- Favori ---------- */

    const saveButton = $("saveListing");
    function refreshSave() {
        const isSaved = M.saved.has(item.id);
        saveButton.textContent = isSaved ? "♥ Enregistrée" : "♡ Enregistrer";
        saveButton.classList.toggle("is-saved", isSaved);
        saveButton.setAttribute("aria-pressed", isSaved ? "true" : "false");
    }
    saveButton.addEventListener("click", () => {
        const nowSaved = M.saved.toggle(item);
        refreshSave();
        M.ui.toast(nowSaved ? "Annonce ajoutée à vos favoris." : "Annonce retirée de vos favoris.");
    });
    refreshSave();


    /* ---------- Demande de contact ---------- */

    const contactButton = $("contactListing");
    const form = $("contactForm");
    const textarea = $("contactText");
    const status = $("detailMessage");

    contactButton.textContent = actionLabel;

    contactButton.addEventListener("click", () => {
        if (!M.account.require(`Connectez-vous pour ${actionLabel.toLowerCase()} « ${item.title} ».`, M.listings.url(item))) return;
        textarea.value = M.messages.draft(item, item.action);
        form.hidden = false;
        contactButton.hidden = true;
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });

    $("cancelContact").addEventListener("click", () => {
        form.hidden = true;
        contactButton.hidden = false;
        contactButton.focus();
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        const text = textarea.value.trim();
        if (text.length < 5) {
            textarea.classList.add("input-error");
            textarea.focus();
            return;
        }
        textarea.classList.remove("input-error");
        if (!M.messages.add(item, text, actionLabel)) return;
        form.hidden = true;
        contactButton.hidden = false;
        status.innerHTML = 'Demande enregistrée. <a href="messages.html">Voir mes demandes →</a>';
    });


    /* ---------- Partage ---------- */

    $("shareListing").addEventListener("click", async () => {
        const url = window.location.href;
        const text = `${item.title} — Medinati`;
        if (navigator.share) {
            try { await navigator.share({ title: item.title, text, url }); } catch { /* partage annulé */ }
            return;
        }
        try {
            await navigator.clipboard.writeText(`${text} : ${url}`);
            M.ui.toast("Lien de l’annonce copié.");
        } catch {
            M.ui.toast("Copiez l’adresse de la page pour partager cette annonce.");
        }
    });


    /* ---------- Mes annonces : suppression ---------- */

    if (isOwner) {
        contactButton.hidden = true;
        const remove = $("deleteListing");
        remove.hidden = false;
        $("ownerNote").hidden = false;
        remove.addEventListener("click", async () => {
            const confirmed = await M.ui.confirm({
                title: "Supprimer cette annonce ?",
                message: `« ${item.title} » sera retirée de Medinati sur cet appareil. Cette action est définitive.`,
                confirmLabel: "Supprimer",
                danger: true
            });
            if (!confirmed) return;
            if (M.listings.removePublication(item.id)) {
                M.ui.flash("Votre annonce a été supprimée.", "success");
                window.location.href = "nouvelle.html?vue=miennes";
            }
        });
    }


    /* ---------- Annonces de la même catégorie ---------- */

    const related = M.listings.all().filter(other => other.category === item.category && other.id !== item.id).slice(0, 3);
    if (related.length) {
        $("relatedList").innerHTML = related.map(other => `
            <a class="collection-card related-card" href="${esc(M.listings.url(other))}">
                <span class="collection-icon" aria-hidden="true">${esc(other.icon)}</span>
                <span class="collection-copy">
                    <small>${esc(other.typeName)} · ${esc(other.location)}</small>
                    <strong>${esc(other.title)}</strong>
                </span>
                <span class="related-arrow" aria-hidden="true">→</span>
            </a>`).join("");
        $("detailRelated").hidden = false;
    }
})();
