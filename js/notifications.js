/* =========================================================
   MEDINATI — NOTIFICATIONS (notifications.html)
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const { esc } = M.text;
    const list = document.getElementById("notificationList");
    const markAll = document.getElementById("markAllRead");
    const clearAll = document.getElementById("clearAll");
    const disabledNote = document.getElementById("notificationsOff");
    if (!list) return;

    function render() {
        const items = M.notifications.list();
        if (disabledNote) disabledNote.hidden = M.notifications.enabled();
        markAll.hidden = !items.some(item => !item.read);
        clearAll.hidden = items.length === 0;

        if (!items.length) {
            list.innerHTML = `
                <section class="notification-empty">
                    <span aria-hidden="true">✦</span>
                    <h2>Tout est calme pour le moment</h2>
                    <p>Vos notifications apparaîtront ici lorsque votre activité évoluera.</p>
                    <a class="detail-contact" href="recherche.html">Explorer Medinati</a>
                </section>`;
            return;
        }

        list.innerHTML = items.map(item => {
            const date = item.date ? new Date(item.date).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
            const body = `
                <span class="notification-bullet" aria-hidden="true">${item.read ? "✓" : "•"}</span>
                <div>
                    <p>${esc(item.message || "Nouvelle activité")}</p>
                    <small>${esc(date)}${item.read ? "" : " · Non lue"}</small>
                </div>`;
            /* Seuls les liens vers les pages du site sont suivis. */
            const link = /^[a-z-]+\.html(\?[\w=&%.+-]*)?(#[\w-]*)?$/i.test(String(item.link || "")) ? item.link : "";
            return link
                ? `<a class="notification-row ${item.read ? "" : "unread"}" href="${esc(link)}" data-id="${esc(item.id)}">${body}</a>`
                : `<article class="notification-row ${item.read ? "" : "unread"}" data-id="${esc(item.id)}">${body}</article>`;
        }).join("");
    }

    /* Ouvrir une notification la marque comme lue. */
    list.addEventListener("click", event => {
        const row = event.target.closest("[data-id]");
        if (row) M.notifications.markRead(row.dataset.id);
        if (row && row.tagName !== "A") render();
    });

    markAll.addEventListener("click", () => {
        M.notifications.markAllRead();
        render();
        M.ui.toast("Toutes les notifications sont lues.");
    });

    clearAll.addEventListener("click", async () => {
        const confirmed = await M.ui.confirm({
            title: "Effacer les notifications ?",
            message: "Toutes vos notifications seront supprimées de cet appareil.",
            confirmLabel: "Tout effacer",
            danger: true
        });
        if (!confirmed) return;
        M.notifications.clear();
        render();
    });

    render();
})();
