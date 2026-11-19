/* =========================================================
   MEDINATI — INSCRIPTION (inscription.html)
   Étape 1 : profil · Étape 2 : localisation · Étape 3 : vérification
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const $ = id => document.getElementById(id);

    const steps = [$("step1"), $("step2"), $("step3")];
    if (steps.some(step => !step)) return;

    const fields = {
        firstName: $("firstName"),
        lastName: $("lastName"),
        email: $("email"),
        password: $("password")
    };

    const domainChecks = [...document.querySelectorAll('input[name="domains"]')];
    const domainCount = $("domainCount");
    const domainError = $("domainError");
    const photoInput = $("signupPhoto");
    const photoPreview = $("signupPhotoPreview");
    const photoError = $("photoError");
    const errors = { 1: $("step1Error"), 2: $("step2Error"), 3: $("step3Error") };

    const picker = M.location.createPicker($("signupLocation"), { prefix: "signup" });
    let photoData = "";


    /* ---------- Compte déjà présent sur l’appareil ---------- */

    const existing = M.account.get();
    const notice = $("existingAccount");
    if (existing && notice) {
        notice.querySelector("[data-existing-email]").textContent = existing.email || "";
        notice.hidden = false;
    }


    /* ---------- Domaines (3 maximum) ---------- */

    const selectedDomains = () => domainChecks.filter(input => input.checked).map(input => input.value);

    function updateDomainCount() {
        const count = selectedDomains().length;
        domainCount.textContent = `${count} / 3 sélectionné${count > 1 ? "s" : ""}`;
        if (count) domainError.textContent = "";
    }

    domainChecks.forEach(input => input.addEventListener("change", () => {
        if (selectedDomains().length > 3) {
            input.checked = false;
            domainError.textContent = "Vous pouvez choisir trois domaines au maximum.";
            return;
        }
        updateDomainCount();
    }));
    updateDomainCount();


    /* ---------- Photo (réduite avant stockage) ---------- */

    function resetPreview() {
        const initials = M.text.initialsOf(fields.firstName.value || "M", fields.lastName.value);
        photoPreview.textContent = initials;
    }

    [fields.firstName, fields.lastName].forEach(input => input.addEventListener("input", () => {
        if (!photoData) resetPreview();
    }));

    photoInput?.addEventListener("change", async () => {
        const file = photoInput.files && photoInput.files[0];
        photoError.textContent = "";
        if (!file) {
            photoData = "";
            resetPreview();
            return;
        }
        if (!/^image\//.test(file.type) || file.size > 10 * 1024 * 1024) {
            photoInput.value = "";
            photoError.textContent = "Choisissez une image de 10 Mo maximum.";
            return;
        }
        try {
            photoData = await M.images.resize(file, 320, 0.85);
            const image = new Image();
            image.src = photoData;
            image.alt = "Aperçu de votre photo";
            photoPreview.replaceChildren(image);
        } catch {
            photoInput.value = "";
            photoData = "";
            resetPreview();
            photoError.textContent = "Cette image n’a pas pu être lue. Essayez une autre photo.";
        }
    });


    /* ---------- Navigation entre les étapes ---------- */

    function showStep(number, moveFocus = true) {
        steps.forEach((step, index) => step.classList.toggle("active-step", index === number - 1));
        document.querySelectorAll(".progress-step").forEach((element, index) => {
            element.classList.toggle("active", index < number);
            if (index === number - 1) element.setAttribute("aria-current", "step");
            else element.removeAttribute("aria-current");
        });
        document.querySelectorAll(".progress-line").forEach((line, index) => line.classList.toggle("is-done", index < number - 1));
        Object.values(errors).forEach(element => { if (element) element.textContent = ""; });
        if (!moveFocus) return;
        window.scrollTo({ top: 0, behavior: "smooth" });
        const focusTarget = number === 3 ? $("createAccount") : steps[number - 1].querySelector("input, select");
        if (focusTarget) setTimeout(() => focusTarget.focus({ preventScroll: true }), 50);
    }

    function mark(input, invalid) {
        input.classList.toggle("input-error", invalid);
        input.setAttribute("aria-invalid", invalid ? "true" : "false");
    }

    function validateStep1() {
        const problems = [];
        let firstInvalid = null;
        const check = (input, invalid, label) => {
            mark(input, invalid);
            if (invalid) {
                problems.push(label);
                firstInvalid = firstInvalid || input;
            }
        };

        check(fields.firstName, !fields.firstName.value.trim(), "votre prénom");
        check(fields.lastName, !fields.lastName.value.trim(), "votre nom");
        check(fields.email, !M.text.isEmail(fields.email.value), "une adresse e-mail valide");
        check(fields.password, fields.password.value.length < 8, "un mot de passe d’au moins 8 caractères");

        if (!selectedDomains().length) {
            domainError.textContent = "Choisissez au moins un domaine.";
            problems.push("au moins un domaine");
        }

        errors[1].textContent = problems.length ? `Il manque ${problems.join(", ")}.` : "";
        if (firstInvalid) firstInvalid.focus();
        else if (problems.length) domainChecks[0].focus();
        return problems.length === 0;
    }

    $("nextStep1").addEventListener("click", () => {
        if (validateStep1()) showStep(2);
    });

    /* Le message d’erreur disparaît une fois tout corrigé. */
    steps[0].addEventListener("input", () => {
        if (errors[1].textContent && !steps[0].querySelector(".input-error") && selectedDomains().length) errors[1].textContent = "";
    });
    steps[0].addEventListener("change", () => {
        if (errors[1].textContent && !steps[0].querySelector(".input-error") && selectedDomains().length) errors[1].textContent = "";
    });

    $("backStep1").addEventListener("click", () => showStep(1));

    $("nextStep2").addEventListener("click", () => {
        const error = picker.validate();
        errors[2].textContent = error;
        if (error) return;

        $("summaryName").textContent = `${fields.firstName.value.trim()} ${fields.lastName.value.trim()}`;
        $("summaryEmail").textContent = fields.email.value.trim().toLowerCase();
        $("summaryDomains").textContent = selectedDomains().join(", ");
        $("summaryLocation").textContent = M.location.format(picker.getValue(), "full");
        showStep(3);
    });

    $("backStep2").addEventListener("click", () => showStep(2));


    /* ---------- Création du compte ---------- */

    $("createAccount").addEventListener("click", async () => {
        const email = fields.email.value.trim().toLowerCase();
        const previous = M.account.get();
        const replacesSomeoneElse = previous && String(previous.email || "").toLowerCase() !== email;

        if (replacesSomeoneElse) {
            const confirmed = await M.ui.confirm({
                title: "Remplacer le compte existant ?",
                message: `Le compte ${previous.email} est enregistré sur cet appareil. Le nouveau compte le remplacera, ainsi que ses favoris et ses demandes.`,
                confirmLabel: "Remplacer",
                danger: true
            });
            if (!confirmed) return;
        }

        const user = {
            firstName: fields.firstName.value.trim(),
            lastName: fields.lastName.value.trim(),
            email,
            phone: "",
            bio: "",
            domains: selectedDomains(),
            photo: photoData,
            location: picker.getValue(),
            createdAt: new Date().toISOString()
        };
        M.account.setPassword(user, fields.password.value);

        if (!M.account.save(user)) {
            errors[3].textContent = "Le compte n’a pas pu être enregistré sur cet appareil. Essayez sans photo ou libérez de l’espace.";
            return;
        }

        if (replacesSomeoneElse) {
            ["saved", "messages", "notifications", "recentSearches", "selected"].forEach(key => M.store.remove(M.KEYS[key]));
        }

        M.account.startSession(user);
        M.notifications.add(`Bienvenue sur Medinati, ${user.firstName} ! Votre compte est prêt.`, "account.html");
        M.ui.flash(`Bienvenue ${user.firstName} ! Votre compte a été créé.`, "success");
        window.location.href = "home.html";
    });

    showStep(1, false);
})();
