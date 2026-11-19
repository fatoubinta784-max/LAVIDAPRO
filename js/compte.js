/* =========================================================
   MEDINATI — MON COMPTE (account.html)
   Accessible uniquement connecté(e).
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const $ = id => document.getElementById(id);
    if (!document.querySelector(".account-page")) return;

    if (!M.account.require("Connectez-vous pour accéder à votre compte.", "account.html")) return;

    const DOMAINS = [
        ["Commerce", "🛍️"], ["Échanges", "🔄"], ["Formation", "📚"],
        ["Immobilier", "🏠"], ["Restaurants & livraison", "🍽️"], ["Services", "🧰"],
        ["Événements", "🎉"], ["Emploi", "💼"], ["Communauté", "🤝"]
    ];

    const user = () => M.account.current() || {};


    /* =====================================================
       AFFICHAGE
    ===================================================== */

    function handleOf(person) {
        const slug = M.text.fold(M.account.fullName(person)).replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
        return slug ? `@${slug}` : "";
    }

    function setText(id, value, fallback) {
        const element = $(id);
        element.textContent = value || fallback || "—";
        element.classList.toggle("is-empty", !value);
    }

    function render() {
        const person = user();
        const name = M.account.fullName(person);

        $("displayName").textContent = name;
        $("accountUsername").textContent = handleOf(person);

        const created = person.createdAt ? new Date(person.createdAt) : null;
        $("memberSince").textContent = created && !Number.isNaN(created.getTime())
            ? `Membre depuis ${created.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
            : "Membre Medinati";

        const bio = $("profileBioText");
        bio.textContent = person.bio || "";
        bio.hidden = !person.bio;

        const photo = $("profilePhoto");
        if (person.photo) {
            const image = new Image();
            image.src = person.photo;
            image.alt = `Photo de profil de ${name}`;
            photo.replaceChildren(image);
        } else {
            photo.textContent = M.account.initials(person);
        }

        setText("accountFullName", name);
        setText("accountEmail", person.email);
        setText("accountPhone", person.phone, "Non renseigné");

        const domains = Array.isArray(person.domains) ? person.domains.slice(0, 3) : [];
        const domainList = $("profileDomains");
        domainList.replaceChildren(...(domains.length ? domains : ["Aucun domaine choisi"]).map(domain => {
            const chip = document.createElement("span");
            chip.className = domains.length ? "profile-domain" : "profile-domain is-empty";
            chip.textContent = domain;
            return chip;
        }));

        const place = person.location && typeof person.location === "object" ? person.location : {};
        setText("locCountry", place.country);
        setText("locCity", place.city);
        setText("locDistrict", place.district);
        setText("locNeighborhood", place.neighborhood);

        $("countMine").textContent = M.listings.mine().length;
        $("countSaved").textContent = M.saved.list().length;
        $("countMessages").textContent = M.messages.list().length;
        $("countNotifications").textContent = M.notifications.unread();

        $("notificationSwitch").checked = M.notifications.enabled();
        $("darkModeSwitch").checked = document.body.classList.contains("dark-mode");
    }


    /* =====================================================
       PROFIL (nom, téléphone, présentation, domaines)
    ===================================================== */

    const domainChoices = $("profileDomainChoices");
    domainChoices.innerHTML = DOMAINS.map(([value, icon]) => `
        <label><input type="checkbox" name="profileDomains" value="${M.text.esc(value)}"><span>${icon} ${M.text.esc(value)}</span></label>`).join("");
    const domainInputs = [...domainChoices.querySelectorAll("input")];

    domainInputs.forEach(input => input.addEventListener("change", () => {
        if (domainInputs.filter(item => item.checked).length > 3) {
            input.checked = false;
            $("profileError").textContent = "Vous pouvez choisir trois domaines au maximum.";
        } else {
            $("profileError").textContent = "";
        }
    }));

    function openProfile() {
        const person = user();
        $("profileFirstName").value = person.firstName || "";
        $("profileLastName").value = person.lastName || "";
        $("profilePhone").value = person.phone || "";
        $("profileBio").value = person.bio || "";
        const chosen = Array.isArray(person.domains) ? person.domains : [];
        domainInputs.forEach(input => { input.checked = chosen.includes(input.value); });
        $("removePhoto").hidden = !person.photo;
        $("profileError").textContent = "";
        M.ui.openModal("profileModal");
    }

    $("editProfile").addEventListener("click", openProfile);
    document.querySelectorAll("[data-open-profile]").forEach(button => button.addEventListener("click", openProfile));

    $("saveProfile").addEventListener("click", () => {
        const firstName = $("profileFirstName").value.trim();
        const lastName = $("profileLastName").value.trim();
        const phone = $("profilePhone").value.trim();
        const bio = $("profileBio").value.trim();
        const domains = domainInputs.filter(input => input.checked).map(input => input.value);
        const error = $("profileError");

        if (!firstName || !lastName) {
            error.textContent = "Indiquez votre prénom et votre nom.";
            (firstName ? $("profileLastName") : $("profileFirstName")).focus();
            return;
        }
        if (phone && !/^\+?[\d\s().-]{6,20}$/.test(phone)) {
            error.textContent = "Ce numéro de téléphone ne semble pas valide.";
            $("profilePhone").focus();
            return;
        }
        if (!domains.length) {
            error.textContent = "Choisissez au moins un domaine.";
            return;
        }

        const person = M.account.get();
        Object.assign(person, { firstName, lastName, phone, bio, domains });
        if (!M.account.save(person)) return;

        /* Le nouveau nom apparaît aussi sur vos annonces. */
        const fullName = M.account.fullName(person);
        const initials = M.account.initials(person);
        const list = M.listings.raw().map(item =>
            item.ownerEmail && item.ownerEmail.toLowerCase() === person.email.toLowerCase()
                ? { ...item, user: fullName, initials }
                : item);
        M.store.write(M.KEYS.publications, list);

        M.ui.closeModal("profileModal");
        render();
        M.ui.toast("Profil mis à jour.", "success");
    });


    /* =====================================================
       PHOTO
    ===================================================== */

    const photoInput = $("photoInput");
    $("photoBtn").addEventListener("click", () => photoInput.click());

    photoInput.addEventListener("change", async () => {
        const file = photoInput.files && photoInput.files[0];
        photoInput.value = "";
        if (!file) return;
        if (!/^image\//.test(file.type) || file.size > 15 * 1024 * 1024) {
            M.ui.toast("Choisissez une image de 15 Mo maximum.", "error");
            return;
        }
        try {
            const small = await M.images.resize(file, 320, 0.85);
            const person = M.account.get();
            person.photo = small;
            if (M.account.save(person)) {
                render();
                M.ui.toast("Photo de profil mise à jour.", "success");
            }
        } catch {
            M.ui.toast("Cette image n’a pas pu être lue. Essayez une autre photo.", "error");
        }
    });

    $("removePhoto").addEventListener("click", () => {
        const person = M.account.get();
        person.photo = "";
        if (M.account.save(person)) {
            $("removePhoto").hidden = true;
            render();
            M.ui.toast("Photo de profil retirée.");
        }
    });


    /* =====================================================
       LOCALISATION
    ===================================================== */

    const picker = M.location.createPicker($("accountLocation"), { prefix: "account" });

    function openLocation() {
        picker.setValue(user().location);
        $("locationError").textContent = "";
        M.ui.openModal("locationModal");
    }

    $("changeLocation").addEventListener("click", openLocation);

    $("saveLocation").addEventListener("click", () => {
        const error = picker.validate();
        $("locationError").textContent = error;
        if (error) return;
        const person = M.account.get();
        person.location = picker.getValue();
        if (!M.account.save(person)) return;
        M.ui.closeModal("locationModal");
        render();
        M.ui.toast("Localisation mise à jour.", "success");
    });


    /* =====================================================
       PRÉFÉRENCES
    ===================================================== */

    $("settingsBtn").addEventListener("click", () => {
        $("preferences").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("darkModeSwitch").addEventListener("change", event => {
        M.ui.setDarkMode(event.target.checked);
        M.ui.toast(event.target.checked ? "Mode sombre activé sur tout le site." : "Mode sombre désactivé.");
    });

    $("notificationSwitch").addEventListener("change", event => {
        M.notifications.setEnabled(event.target.checked);
        render();
        M.ui.toast(event.target.checked ? "Notifications activées." : "Notifications désactivées.");
    });


    /* =====================================================
       MOT DE PASSE
    ===================================================== */

    $("openPassword").addEventListener("click", () => {
        $("passwordForm").reset();
        $("passwordError").textContent = "";
        M.ui.openModal("passwordModal");
    });

    $("passwordForm").addEventListener("submit", event => {
        event.preventDefault();
        const current = $("currentPassword").value;
        const next = $("newPassword").value;
        const confirmation = $("confirmPassword").value;
        const error = $("passwordError");
        const person = M.account.get();

        if (!M.account.checkPassword(person, current)) {
            error.textContent = "Le mot de passe actuel est incorrect.";
            $("currentPassword").focus();
            return;
        }
        if (next.length < 8) {
            error.textContent = "Le nouveau mot de passe doit contenir au moins 8 caractères.";
            $("newPassword").focus();
            return;
        }
        if (next !== confirmation) {
            error.textContent = "Les deux nouveaux mots de passe ne correspondent pas.";
            $("confirmPassword").focus();
            return;
        }

        M.account.setPassword(person, next);
        if (!M.account.save(person)) return;
        M.ui.closeModal("passwordModal");
        M.notifications.add("Votre mot de passe a été modifié.");
        M.ui.toast("Mot de passe modifié.", "success");
    });


    /* =====================================================
       CONFIDENTIALITÉ ET AIDE
    ===================================================== */

    $("openPrivacy").addEventListener("click", () => M.ui.openModal("privacyModal"));
    $("openHelp").addEventListener("click", () => M.ui.openModal("helpModal"));

    $("eraseData").addEventListener("click", async () => {
        M.ui.closeModal("privacyModal");
        const confirmed = await M.ui.confirm({
            title: "Effacer toutes vos données ?",
            message: "Votre compte, vos annonces, favoris, demandes et notifications seront supprimés de cet appareil. Cette action est définitive.",
            confirmLabel: "Tout effacer",
            danger: true
        });
        if (!confirmed) return;

        const email = String(user().email || "").toLowerCase();
        M.store.write(M.KEYS.publications, M.listings.raw().filter(item => String(item.ownerEmail || "").toLowerCase() !== email));
        ["user", "session", "saved", "messages", "notifications", "notificationsEnabled", "recentSearches", "selected", "darkMode"]
            .forEach(key => M.store.remove(M.KEYS[key]));
        M.ui.flash("Toutes vos données ont été effacées de cet appareil.");
        window.location.href = "home.html";
    });


    /* =====================================================
       DÉCONNEXION (le compte reste enregistré)
    ===================================================== */

    $("logoutBtn").addEventListener("click", async () => {
        const confirmed = await M.ui.confirm({
            title: "Se déconnecter ?",
            message: "Vous pourrez vous reconnecter à tout moment avec votre e-mail et votre mot de passe.",
            confirmLabel: "Se déconnecter"
        });
        if (!confirmed) return;
        M.account.logout();
        M.ui.flash("Vous êtes déconnecté(e). À bientôt !");
        window.location.href = "connexion.html";
    });


    /* =====================================================
       DÉMARRAGE
    ===================================================== */

    render();
    if (window.location.hash === "#localisation") openLocation();
})();
