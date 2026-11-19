/* =========================================================
   MEDINATI — CONNEXION (connexion.html)
========================================================= */

(function () {
    "use strict";

    const M = window.Medinati;
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");
    const target = M.safeReturn(new URLSearchParams(window.location.search).get("retour"));

    function say(text, kind) {
        message.textContent = text;
        message.className = `auth-message${kind ? ` is-${kind}` : ""}`;
    }

    /* Déjà connecté : on propose de continuer. */
    const current = M.account.current();
    if (current) {
        say(`Vous êtes déjà connecté(e) avec ${current.email}.`, "success");
        const next = document.getElementById("alreadyConnected");
        if (next) {
            next.href = target;
            next.hidden = false;
        }
    }

    /* Un seul compte par appareil : on pré-remplit l’adresse. */
    const known = M.account.get();
    if (known && known.email && !emailInput.value) {
        emailInput.value = known.email;
        if (!current) passwordInput.focus();
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        emailInput.classList.toggle("input-error", !M.text.isEmail(email));
        passwordInput.classList.toggle("input-error", !password);
        if (!M.text.isEmail(email)) {
            say("Saisissez une adresse e-mail valide.", "error");
            emailInput.focus();
            return;
        }
        if (!password) {
            say("Saisissez votre mot de passe.", "error");
            passwordInput.focus();
            return;
        }

        const result = M.account.login(email, password);
        if (!result.ok) {
            say(result.error, "error");
            passwordInput.select();
            return;
        }

        say("Connexion réussie. Ouverture de votre espace…", "success");
        M.ui.flash(`Bon retour, ${M.account.firstName(result.user)} !`, "success");
        window.location.href = target;
    });
})();
