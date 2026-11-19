/* =========================================================
   MEDINATI — SOCLE COMMUN (app.js)

   Chargé sur toutes les pages, AVANT le script propre à la
   page (dossier js/). Il regroupe tout ce qui était recopié
   de page en page :

   1. Stockage local (lecture / écriture sûres)
   2. Outils de texte (échappement HTML, dates…)
   3. Sécurité : hachage des mots de passe (SHA-256 salé)
   4. Compte et session (connexion / déconnexion)
   5. Annonces (publications des membres + exemples)
   6. Favoris, demandes de contact, notifications
   7. Localisation (liste des pays et sélecteur)
   8. Images (réduction des photos avant stockage)
   9. Interface (toasts, fenêtres, badges, thème)
   10. Mise à jour des anciennes données

   Tout est accessible via l’objet global window.Medinati.
========================================================= */

(function () {
    "use strict";

    /* =====================================================
       1. STOCKAGE LOCAL
    ===================================================== */

    const KEYS = {
        user: "medinati_user",
        session: "medinati_session",
        publications: "medinati_publications",
        saved: "medinati_saved",
        messages: "medinati_messages",
        notifications: "medinati_notifications",
        notificationsEnabled: "medinati_notifications_enabled",
        recentSearches: "medinati_recent_searches",
        selected: "medinati_selected_item",
        darkMode: "medinati_dark_mode",
        version: "medinati_version",
        legacyPhoto: "medinati_profile_photo",
        flash: "medinati_flash"
    };

    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return fallback;
            const value = JSON.parse(raw);
            return value === null || value === undefined ? fallback : value;
        } catch {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            const full = error && (error.name === "QuotaExceededError" || error.code === 22);
            toast(
                full
                    ? "L’espace de stockage de cet appareil est plein. Supprimez des photos ou des annonces, puis réessayez."
                    : "Impossible d’enregistrer sur cet appareil (navigation privée ?).",
                "error"
            );
            return false;
        }
    }

    function remove(key) {
        try { localStorage.removeItem(key); } catch { /* stockage indisponible */ }
    }

    function readList(key) {
        const value = read(key, []);
        return Array.isArray(value) ? value : [];
    }


    /* =====================================================
       2. TEXTE
    ===================================================== */

    const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

    function esc(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ESCAPES[char]);
    }

    /* Minuscules sans accents : « Événement » trouve « evenement ». */
    function fold(value) {
        return String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    }

    function initialsOf(...parts) {
        const words = parts.join(" ").trim().split(/\s+/).filter(Boolean);
        if (!words.length) return "M";
        const first = words[0].charAt(0);
        const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
        return (first + last).toUpperCase();
    }

    function plural(count, singular, pluralForm) {
        return `${count} ${count > 1 ? (pluralForm || singular + "s") : singular}`;
    }

    function relativeDate(value) {
        if (!value) return "Récemment";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Récemment";
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return "À l’instant";
        if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
        if (seconds < 172800) return "Hier";
        return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
    }

    function uid(prefix) {
        return `${prefix || "id"}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    }

    function isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
    }


    /* =====================================================
       3. SÉCURITÉ — SHA-256
       Le mot de passe n’est jamais stocké : seule une
       empreinte salée l’est. (Une vraie sécurité demandera
       un serveur ; ceci évite déjà le mot de passe en clair.)
    ===================================================== */

    const K256 = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    function sha256(text) {
        const bytes = new TextEncoder().encode(String(text));
        const length = bytes.length;
        const total = ((length + 9 + 63) >> 6) << 6;
        const buffer = new Uint8Array(total);
        buffer.set(bytes);
        buffer[length] = 0x80;
        const view = new DataView(buffer.buffer);
        const bits = length * 8;
        view.setUint32(total - 8, Math.floor(bits / 0x100000000));
        view.setUint32(total - 4, bits >>> 0);

        const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        const w = new Uint32Array(64);
        const rotr = (x, n) => (x >>> n) | (x << (32 - n));

        for (let offset = 0; offset < total; offset += 64) {
            for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
            for (let i = 16; i < 64; i++) {
                const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
                const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
            }
            let [a, b, c, d, e, f, g, h] = hash;
            for (let i = 0; i < 64; i++) {
                const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
                const t1 = (h + s1 + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0;
                const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
                const t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
                h = g; g = f; f = e; e = (d + t1) >>> 0;
                d = c; c = b; b = a; a = (t1 + t2) >>> 0;
            }
            hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;
            hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;
            hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;
            hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
        }
        return hash.map(word => word.toString(16).padStart(8, "0")).join("");
    }

    function makeSalt() {
        const bytes = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
        else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    }

    function hashPassword(password, salt) {
        let digest = sha256(`${salt}:${password}`);
        for (let i = 0; i < 1500; i++) digest = sha256(digest + salt);
        return digest;
    }


    /* =====================================================
       4. COMPTE ET SESSION
    ===================================================== */

    const account = {

        /* Le compte enregistré sur cet appareil (connecté ou non). */
        get() {
            const user = read(KEYS.user, null);
            return user && typeof user === "object" ? user : null;
        },

        /* Le compte connecté, ou null. */
        current() {
            const user = account.get();
            const session = read(KEYS.session, null);
            if (!user || !session || !user.email || !session.email) return null;
            return String(session.email).toLowerCase() === String(user.email).toLowerCase() ? user : null;
        },

        save(user) {
            const ok = write(KEYS.user, user);
            if (ok) refreshChrome();
            return ok;
        },

        fullName(user) {
            if (!user) return "";
            return [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
                || user.fullName || user.name || "Membre Medinati";
        },

        firstName(user) {
            if (!user) return "";
            return user.firstName || String(user.fullName || user.name || "").split(" ")[0] || "";
        },

        initials(user) {
            if (!user) return "M";
            return initialsOf(user.firstName || user.fullName || user.name || "M", user.lastName || "");
        },

        setPassword(user, password) {
            user.salt = makeSalt();
            user.passwordHash = hashPassword(password, user.salt);
            delete user.password;
        },

        checkPassword(user, password) {
            if (!user) return false;
            if (user.passwordHash && user.salt) return hashPassword(password, user.salt) === user.passwordHash;
            if (typeof user.password === "string") return user.password === password;
            return false;
        },

        login(email, password) {
            const user = account.get();
            if (!user) return { ok: false, error: "Aucun compte n’existe encore sur cet appareil. Créez votre compte pour commencer." };
            const sameEmail = String(user.email || "").toLowerCase() === String(email || "").trim().toLowerCase();
            if (!sameEmail || !account.checkPassword(user, password)) {
                return { ok: false, error: "Adresse e-mail ou mot de passe incorrect." };
            }
            if (!user.passwordHash) {
                account.setPassword(user, password);
                write(KEYS.user, user);
            }
            account.startSession(user);
            return { ok: true, user };
        },

        startSession(user) {
            write(KEYS.session, { email: user.email, since: new Date().toISOString() });
        },

        /* Se déconnecter ne supprime JAMAIS le compte. */
        logout() {
            remove(KEYS.session);
        },

        /* Redirige vers la connexion si besoin. Renvoie true si connecté. */
        require(message, returnTo) {
            if (account.current()) return true;
            const target = returnTo || currentPage();
            flash(message || "Connectez-vous pour continuer.");
            window.location.href = `connexion.html?retour=${encodeURIComponent(target)}`;
            return false;
        }
    };

    function currentPage() {
        const file = window.location.pathname.split("/").pop() || "home.html";
        return file + window.location.search;
    }

    /* N’autorise que les pages du site comme destination de retour. */
    function safeReturn(value) {
        const target = String(value || "");
        return /^[a-z-]+\.html(\?[\w=&%.+-]*)?$/i.test(target) && !/^connexion|^inscription/i.test(target)
            ? target
            : "home.html";
    }


    /* =====================================================
       5. ANNONCES
    ===================================================== */

    /* Catégories de la recherche et de l’accueil. */
    const CATEGORIES = {
        marketplace: { label: "Marketplace", icon: "🛍️" },
        emploi: { label: "Emploi", icon: "💼" },
        services: { label: "Services", icon: "🔧" },
        immobilier: { label: "Immobilier", icon: "🏠" },
        restaurant: { label: "Restaurants", icon: "🍔" },
        formation: { label: "Formation", icon: "📚" },
        livraison: { label: "Livraison", icon: "🚚" },
        evenement: { label: "Événements", icon: "🎉" },
        communaute: { label: "Communauté", icon: "🤝" }
    };

    /* Types de publication et la catégorie à laquelle ils appartiennent. */
    const TYPES = {
        emploi: { label: "Offre d’emploi", short: "Emploi", icon: "💼", category: "emploi", action: "Postuler", hint: "Recruter une personne" },
        service: { label: "Proposer un service", short: "Service", icon: "🔧", category: "services", action: "Contacter", hint: "Présenter votre activité" },
        vente: { label: "Vendre un produit", short: "Vente", icon: "🛍️", category: "marketplace", action: "Commander", hint: "Publier un article" },
        immobilier: { label: "Logement", short: "Immobilier", icon: "🏠", category: "immobilier", action: "Demander", hint: "Louer, vendre ou rechercher" },
        restaurant: { label: "Restaurant / Commerce", short: "Restaurant", icon: "🍔", category: "restaurant", action: "Réserver", hint: "Faire connaître votre adresse" },
        livraison: { label: "Livraison / Transport", short: "Livraison", icon: "🚚", category: "livraison", action: "Demander", hint: "Proposer ou rechercher" },
        formation: { label: "Formation", short: "Formation", icon: "📚", category: "formation", action: "S’inscrire", hint: "Partager une formation" },
        evenement: { label: "Événement", short: "Événement", icon: "🎉", category: "evenement", action: "Participer", hint: "Créer une activité" },
        aide: { label: "Demande d’aide", short: "Entraide", icon: "🤝", category: "communaute", action: "Répondre", hint: "Demander ou proposer de l’aide" },
        projet: { label: "Projet / Opportunité", short: "Projet", icon: "💡", category: "communaute", action: "Contacter", hint: "Trouver des collaborateurs" },
        information: { label: "Information", short: "Information", icon: "📢", category: "communaute", action: "", hint: "Partager une information" }
    };

    const TYPE_FROM_CATEGORY = {
        marketplace: "vente", emploi: "emploi", services: "service", immobilier: "immobilier",
        restaurant: "restaurant", formation: "formation", livraison: "livraison",
        evenement: "evenement", communaute: "aide"
    };

    /* Accepte « Restaurants », « événements », « Communauté »… dans les liens. */
    function categoryFromParam(value) {
        const key = fold(value).replace(/s$/, "");
        const aliases = { marketplace: "marketplace", emploi: "emploi", service: "services", immobilier: "immobilier", restaurant: "restaurant", formation: "formation", livraison: "livraison", evenement: "evenement", communaute: "communaute" };
        return aliases[key] || "";
    }

    /* Publications de départ (affichées tant que les membres n’ont rien publié). */
    const DEFAULT_PUBLICATIONS = [
        { id: 1, type: "emploi", user: "Entreprise Atlas", title: "Recherche assistante administrative", description: "Nous recherchons une personne sérieuse et organisée pour rejoindre notre équipe.", location: "Oulfa, Casablanca", details: ["Temps plein", "Débutant accepté"] },
        { id: 2, type: "service", user: "Yassine Services", title: "Service de réparation informatique", description: "Installation, maintenance et dépannage d’ordinateurs pour particuliers et professionnels.", location: "Oulfa, Casablanca", details: ["Ordinateurs", "Maintenance"] },
        { id: 3, type: "vente", user: "Boutique du quartier", title: "Vêtements disponibles", description: "Nouvelle collection disponible. Plusieurs modèles et tailles disponibles.", location: "Casablanca", details: ["Prix : 250 MAD", "Disponible"] },
        { id: 4, type: "immobilier", user: "Agence Oulfa", title: "Appartement à louer", description: "Appartement disponible dans un quartier calme, proche des commerces et transports.", location: "Oulfa, Casablanca", details: ["2 chambres", "Loyer : 4 000 MAD"] },
        { id: 5, type: "evenement", user: "Communauté locale", title: "Rencontre communautaire", description: "Une rencontre ouverte aux habitants pour partager des idées et créer de nouveaux projets.", location: "Casablanca", details: ["Samedi", "Entrée libre"] }
    ];

    /* Annonces d’exemple de la recherche (anciennes données de recherche et de résultats réunies). */
    const DEMO_LISTINGS = [
        { id: "demo-1", type: "vente", user: "Vendeur du quartier", title: "Smartphone Samsung", description: "Smartphone en bon état, vendu avec son chargeur.", details: ["Bon état"] },
        { id: "demo-2", type: "emploi", user: "Studio numérique", title: "Développeur Web", description: "Opportunité professionnelle en développement web.", details: ["Temps plein"] },
        { id: "demo-3", type: "service", user: "Artisan local", title: "Plombier professionnel", description: "Dépannage et installation de plomberie à proximité." },
        { id: "demo-4", type: "immobilier", user: "Particulier", title: "Studio meublé à louer", description: "Studio meublé disponible à la location, proche des transports.", details: ["Meublé"] },
        { id: "demo-5", type: "restaurant", user: "Le Gourmet", title: "Restaurant Le Gourmet", description: "Cuisine maison, sur place ou à emporter." },
        { id: "demo-6", type: "formation", user: "Centre de formation", title: "Formation informatique", description: "Bureautique, internet et outils numériques pour débutants.", details: ["Présentiel"] },
        { id: "demo-7", type: "livraison", user: "Livraison express", title: "Service de livraison", description: "Livraison de colis et de courses dans votre zone." },
        { id: "demo-8", type: "vente", user: "Particulier", title: "Ordinateur portable", description: "Ordinateur portable disponible, idéal pour les études." },
        { id: "demo-9", type: "evenement", user: "Maison de quartier", title: "Atelier créatif du quartier", description: "Un atelier convivial ouvert aux habitants de la ville." },
        { id: "demo-10", type: "aide", user: "Voisins solidaires", title: "Entraide entre voisins", description: "Un espace pour partager des conseils et s’entraider près de chez vous." },
        { id: "demo-11", type: "emploi", user: "Café central", title: "Serveur / Serveuse", description: "Offre d’emploi dans le secteur de la restauration.", details: ["Temps partiel"] },
        { id: "demo-12", type: "service", user: "Artisan local", title: "Électricien", description: "Intervention rapide pour vos travaux électriques." },
        { id: "demo-13", type: "immobilier", user: "Agence locale", title: "Maison à vendre", description: "Maison familiale disponible à la vente." }
    ];

    function defaultPlace() {
        const user = account.current();
        return user ? locationTools.format(user.location, "short") || "Près de chez vous" : "Près de chez vous";
    }

    /* Donne à toute annonce (ancienne ou nouvelle) la même forme. */
    function normalize(raw) {
        if (!raw || typeof raw !== "object") return null;
        const type = TYPES[raw.type] ? raw.type : (TYPE_FROM_CATEGORY[raw.category] || "information");
        const typeInfo = TYPES[type];
        const category = CATEGORIES[raw.category] ? raw.category : typeInfo.category;
        const owner = String(raw.user || raw.author || "Membre Medinati");
        const photo = typeof raw.photo === "string" && raw.photo.startsWith("data:image/") ? raw.photo : "";
        return {
            id: String(raw.id ?? ""),
            type,
            typeName: typeInfo.short,
            category,
            categoryName: CATEGORIES[category].label,
            icon: raw.icon || typeInfo.icon,
            title: String(raw.title || raw.name || "Annonce"),
            description: String(raw.description || raw.content || ""),
            location: String(raw.location || defaultPlace()),
            user: owner,
            initials: raw.initials || initialsOf(owner),
            details: Array.isArray(raw.details) ? raw.details.map(String).filter(Boolean) : [],
            action: raw.action !== undefined ? String(raw.action) : typeInfo.action,
            date: raw.date || "",
            photo,
            ownerEmail: String(raw.ownerEmail || ""),
            demo: Boolean(raw.demo)
        };
    }

    const listings = {
        CATEGORIES,
        TYPES,
        categoryFromParam,
        normalize,

        /* Publications des membres (créées sur cet appareil + publications de départ). */
        raw() {
            let list = read(KEYS.publications, null);
            if (!Array.isArray(list)) {
                const now = new Date().toISOString();
                list = DEFAULT_PUBLICATIONS.map(item => ({ ...item, date: now }));
                write(KEYS.publications, list);
            }
            return list;
        },

        publications() {
            return listings.raw()
                .map(normalize)
                .filter(Boolean)
                .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
        },

        demo() {
            const place = defaultPlace();
            return DEMO_LISTINGS.map(item => normalize({ ...item, demo: true, location: item.location || place }));
        },

        /* Toutes les annonces indexées par identifiant (une seule lecture du stockage). */
        index() {
            return new Map(listings.all().map(item => [item.id, item]));
        },

        all() {
            return [...listings.publications(), ...listings.demo()];
        },

        find(id) {
            const key = String(id ?? "");
            if (!key) return null;
            return listings.all().find(item => item.id === key) || null;
        },

        mine() {
            const user = account.current();
            if (!user) return [];
            return listings.publications().filter(item => listings.isOwner(item));
        },

        add(publication) {
            const list = listings.raw();
            list.unshift(publication);
            return write(KEYS.publications, list);
        },

        removePublication(id) {
            const key = String(id);
            const list = listings.raw().filter(item => String(item.id) !== key);
            const ok = write(KEYS.publications, list);
            if (ok) {
                write(KEYS.saved, readList(KEYS.saved).filter(item => String(item.id) !== key));
                refreshChrome();
            }
            return ok;
        },

        isOwner(item) {
            const user = account.current();
            return Boolean(user && item && item.ownerEmail
                && item.ownerEmail.toLowerCase() === String(user.email).toLowerCase());
        },

        url(item) {
            return `detail.html?id=${encodeURIComponent(item.id)}`;
        },

        /* Garde aussi une copie pour les anciens liens sans identifiant. */
        open(item) {
            const copy = { ...item, photo: "" };
            write(KEYS.selected, copy);
            window.location.href = listings.url(item);
        },

        matches(item, query) {
            if (!query) return true;
            const haystack = fold([item.title, item.description, item.categoryName, item.typeName, item.location, item.user, item.details.join(" ")].join(" "));
            return fold(query).split(/\s+/).filter(Boolean).every(word => haystack.includes(word));
        }
    };


    /* =====================================================
       6. FAVORIS, DEMANDES, NOTIFICATIONS
    ===================================================== */

    const saved = {
        list() {
            return readList(KEYS.saved).map(normalize).filter(Boolean);
        },
        has(id) {
            return readList(KEYS.saved).some(item => String(item.id) === String(id));
        },
        /* Renvoie true si l’annonce est maintenant dans les favoris. */
        toggle(item) {
            const list = readList(KEYS.saved);
            const index = list.findIndex(entry => String(entry.id) === String(item.id));
            if (index >= 0) list.splice(index, 1);
            else list.unshift({ ...item, photo: "" });
            if (!write(KEYS.saved, list)) return index < 0 ? false : true;
            refreshChrome();
            return index < 0;
        },
        remove(id) {
            write(KEYS.saved, readList(KEYS.saved).filter(item => String(item.id) !== String(id)));
            refreshChrome();
        }
    };

    const ACTION_TEXTS = {
        Postuler: title => `Bonjour, je souhaite postuler à l’offre « ${title} ». Je reste disponible pour échanger.`,
        Commander: title => `Bonjour, je suis intéressé(e) par « ${title} ». Est-ce toujours disponible ?`,
        Demander: title => `Bonjour, je souhaite avoir plus d’informations sur « ${title} ».`,
        Réserver: title => `Bonjour, je souhaite réserver chez « ${title} ».`,
        "S’inscrire": title => `Bonjour, je souhaite m’inscrire à « ${title} ».`,
        Participer: title => `Bonjour, je souhaite participer à « ${title} ».`,
        Répondre: title => `Bonjour, je peux vous aider pour « ${title} ».`
    };

    const messages = {
        list() {
            return readList(KEYS.messages);
        },
        draft(item, action) {
            const make = ACTION_TEXTS[action];
            return make ? make(item.title) : `Bonjour, je suis intéressé(e) par « ${item.title} ».`;
        },
        add(item, text, action) {
            const user = account.current();
            const list = readList(KEYS.messages);
            const entry = {
                id: uid("msg"),
                listingId: item.id,
                title: item.title,
                action: action || "Contacter",
                to: item.user,
                from: user ? account.fullName(user) : "",
                text: String(text || messages.draft(item, action)).trim(),
                date: new Date().toISOString(),
                status: "Enregistrée sur cet appareil"
            };
            list.unshift(entry);
            if (!write(KEYS.messages, list)) return null;
            notifications.add(`Votre demande pour « ${item.title} » a été enregistrée.`, "messages.html");
            refreshChrome();
            return entry;
        },
        remove(id) {
            write(KEYS.messages, readList(KEYS.messages).filter(item => String(item.id) !== String(id)));
            refreshChrome();
        }
    };

    const notifications = {
        list() {
            return readList(KEYS.notifications);
        },
        enabled() {
            return read(KEYS.notificationsEnabled, true) !== false;
        },
        setEnabled(value) {
            write(KEYS.notificationsEnabled, Boolean(value));
            refreshChrome();
        },
        add(message, link) {
            if (!notifications.enabled()) return;
            const list = readList(KEYS.notifications);
            list.unshift({ id: uid("notif"), message: String(message), link: link || "", date: new Date().toISOString(), read: false });
            write(KEYS.notifications, list.slice(0, 60));
            refreshChrome();
        },
        unread() {
            if (!notifications.enabled()) return 0;
            return readList(KEYS.notifications).filter(item => !item.read).length;
        },
        markRead(id) {
            write(KEYS.notifications, readList(KEYS.notifications).map(item => String(item.id) === String(id) ? { ...item, read: true } : item));
            refreshChrome();
        },
        markAllRead() {
            write(KEYS.notifications, readList(KEYS.notifications).map(item => ({ ...item, read: true })));
            refreshChrome();
        },
        clear() {
            write(KEYS.notifications, []);
            refreshChrome();
        }
    };


    /* =====================================================
       7. LOCALISATION
       Pays → Région → Ville → Commune → Quartiers.
       Une saisie libre est proposée pour les lieux absents.
    ===================================================== */

    const LOCATIONS = {
        "Guinée": {
            "Conakry": {
                "Conakry": {
                    "Kaloum": ["Almamya", "Boulbinet", "Sandervalia"],
                    "Dixinn": ["Dixinn Centre", "Bellevue", "Minière"],
                    "Matam": ["Madina", "Bonfi", "Coléah"],
                    "Matoto": ["Matoto", "Gbessia", "Yimbaya"],
                    "Ratoma": ["Hamdallaye", "Kipé", "Nongo"]
                }
            },
            "Kindia": { "Kindia": { "Kindia": ["Abattoir", "Banlieue", "Wondy"] } },
            "Labé": { "Labé": { "Labé": ["Daka", "Kouroula", "Pounthioun"] } }
        },
        "Maroc": {
            "Casablanca-Settat": {
                "Casablanca": {
                    "Anfa": ["Anfa", "Racine", "Bourgogne"],
                    "Ain Chock": ["Ain Chock", "Californie", "Hay Al Qods"],
                    "Hay Hassani": ["Hay Hassani", "Oulfa", "Lissasfa"],
                    "Moulay Rachid": ["Moulay Rachid", "Sidi Othmane", "Al Qods"]
                }
            },
            "Béni Mellal-Khénifra": { "Béni Mellal": { "Béni Mellal": ["Hay Charaf", "Al Atlas", "Mghila"] } }
        },
        "France": {
            "Île-de-France": { "Paris": { "Paris": ["Montmartre", "Le Marais", "Belleville"] } },
            "Auvergne-Rhône-Alpes": { "Lyon": { "Lyon": ["Part-Dieu", "Vieux Lyon", "La Guillotière"] } }
        },
        "Sénégal": { "Dakar": { "Dakar": { "Dakar": ["Plateau", "Médina", "Almadies"] } } },
        "Mali": { "Bamako": { "Bamako": { "Bamako": ["Badalabougou", "Hamdallaye", "ACI 2000"] } } },
        "Côte d’Ivoire": {
            "Abidjan": {
                "Abidjan": {
                    "Cocody": ["Cocody", "Riviera", "Angré"],
                    "Yopougon": ["Yopougon Centre", "Niangon", "Toits Rouges"]
                }
            }
        },
        "Nigeria": { "Lagos": { "Lagos": { "Lagos": ["Ikeja", "Victoria Island", "Lekki"] } } },
        "Tunisie": { "Tunis": { "Tunis": { "Tunis": ["Centre Ville", "La Marsa", "Carthage"] } } },
        "Italie": { "Lazio": { "Rome": { "Rome": ["Centro Storico", "Trastevere", "Prati"] } } },
        "Chine": { "Beijing": { "Beijing": { "Beijing": ["Chaoyang", "Haidian", "Dongcheng"] } } }
    };

    const locationTools = {
        LOCATIONS,

        /* "short" → « Quartier, Ville » ; "full" → tout le chemin. */
        format(location, mode) {
            if (!location) return "";
            if (typeof location === "string") return location;
            const district = location.district && location.district !== location.city ? location.district : "";
            if (mode === "short") return [location.neighborhood || district, location.city].filter(Boolean).join(", ") || location.country || "";
            if (mode === "city") return [location.city, location.country].filter(Boolean).join(", ");
            return [location.neighborhood, district, location.city, location.region, location.country].filter(Boolean).join(", ");
        },

        createPicker(root, options) {
            return createLocationPicker(root, options || {});
        }
    };

    function createLocationPicker(root, options) {
        const p = options.prefix || "loc";
        const field = (id, label, tag) => tag === "select"
            ? `<div class="form-group"><label for="${id}">${label}</label><select id="${id}"></select></div>`
            : `<div class="form-group"><label for="${id}">${label}</label><input id="${id}" type="text" maxlength="60" autocomplete="off"></div>`;

        root.classList.add("location-picker");
        root.innerHTML = `
            <div class="lp-lists">
                ${field(`${p}Country`, "Pays", "select")}
                ${field(`${p}Region`, "Région", "select")}
                ${field(`${p}Commune`, "Ville et commune", "select")}
                ${field(`${p}Quarter`, "Quartier", "select")}
            </div>
            <div class="lp-manual" hidden>
                ${field(`${p}ManualCountry`, "Pays", "input")}
                ${field(`${p}ManualCity`, "Ville", "input")}
                ${field(`${p}ManualDistrict`, "Commune ou arrondissement", "input")}
                ${field(`${p}ManualQuarter`, "Quartier", "input")}
            </div>
            <button type="button" class="lp-toggle">Mon lieu n’est pas dans la liste</button>`;

        const $ = id => root.querySelector(`#${p}${id}`);
        const country = $("Country"), region = $("Region"), commune = $("Commune"), quarter = $("Quarter");
        const lists = root.querySelector(".lp-lists"), manualBox = root.querySelector(".lp-manual");
        const toggle = root.querySelector(".lp-toggle");
        let manual = false;

        function fill(select, entries, placeholder) {
            select.replaceChildren(new Option(placeholder, ""));
            entries.forEach(([value, label]) => select.add(new Option(label, value)));
            select.disabled = entries.length === 0;
        }

        function reset(select, placeholder) {
            fill(select, [], placeholder);
        }

        function communeEntries() {
            const regionData = LOCATIONS[country.value]?.[region.value] || {};
            const entries = [];
            Object.entries(regionData).forEach(([city, communes]) => {
                Object.keys(communes).forEach(name => entries.push([`${city}::${name}`, name === city ? city : `${name} · ${city}`]));
            });
            return entries;
        }

        fill(country, Object.keys(LOCATIONS).map(name => [name, name]), "Choisissez votre pays");
        reset(region, "Choisissez d’abord un pays");
        reset(commune, "Choisissez d’abord une région");
        reset(quarter, "Choisissez d’abord une commune");

        country.addEventListener("change", () => {
            const regions = Object.keys(LOCATIONS[country.value] || {});
            fill(region, regions.map(name => [name, name]), regions.length ? "Choisissez votre région" : "Choisissez d’abord un pays");
            reset(commune, "Choisissez d’abord une région");
            reset(quarter, "Choisissez d’abord une commune");
        });

        region.addEventListener("change", () => {
            const entries = communeEntries();
            fill(commune, entries, entries.length ? "Choisissez votre commune" : "Choisissez d’abord une région");
            reset(quarter, "Choisissez d’abord une commune");
        });

        commune.addEventListener("change", () => {
            const [city, name] = commune.value.split("::");
            const quarters = LOCATIONS[country.value]?.[region.value]?.[city]?.[name] || [];
            fill(quarter, quarters.map(value => [value, value]), quarters.length ? "Choisissez votre quartier" : "Choisissez d’abord une commune");
        });

        function setManual(value) {
            manual = value;
            lists.hidden = manual;
            manualBox.hidden = !manual;
            toggle.textContent = manual ? "Choisir dans la liste" : "Mon lieu n’est pas dans la liste";
        }

        toggle.addEventListener("click", () => {
            setManual(!manual);
            (manual ? $("ManualCountry") : country).focus();
        });

        function select(selectElement, value) {
            if (!value) return false;
            const option = [...selectElement.options].find(item => item.value === value);
            if (!option) return false;
            selectElement.value = value;
            selectElement.dispatchEvent(new Event("change"));
            return true;
        }

        return {
            setValue(location) {
                if (!location || typeof location !== "object") return;
                const listed = select(country, location.country)
                    && select(region, location.region)
                    && select(commune, `${location.city}::${location.district}`)
                    && select(quarter, location.neighborhood);
                if (listed) { setManual(false); return; }
                $("ManualCountry").value = location.country || "";
                $("ManualCity").value = location.city || "";
                $("ManualDistrict").value = location.district || "";
                $("ManualQuarter").value = location.neighborhood || "";
                setManual(Boolean(location.country || location.city));
            },

            getValue() {
                if (manual) {
                    return {
                        country: $("ManualCountry").value.trim(),
                        region: "",
                        city: $("ManualCity").value.trim(),
                        district: $("ManualDistrict").value.trim(),
                        neighborhood: $("ManualQuarter").value.trim()
                    };
                }
                const [city, district] = (commune.value || "::").split("::");
                return { country: country.value, region: region.value, city, district, neighborhood: quarter.value };
            },

            /* Renvoie un message d’erreur, ou "" si tout est complet. */
            validate() {
                const checks = manual
                    ? [[$("ManualCountry"), "Indiquez votre pays."], [$("ManualCity"), "Indiquez votre ville."], [$("ManualQuarter"), "Indiquez votre quartier."]]
                    : [[country, "Choisissez votre pays."], [region, "Choisissez votre région."], [commune, "Choisissez votre commune."], [quarter, "Choisissez votre quartier."]];
                root.querySelectorAll(".input-error").forEach(element => element.classList.remove("input-error"));
                for (const [element, message] of checks) {
                    if (!element.value.trim()) {
                        element.classList.add("input-error");
                        element.focus();
                        return message;
                    }
                }
                return "";
            }
        };
    }


    /* =====================================================
       8. IMAGES
       Les photos sont réduites avant d’être stockées :
       une photo de 4 Mo devient ~50 Ko.
    ===================================================== */

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("image"));
            image.src = src;
        });
    }

    async function resizeImage(source, maxSide, quality) {
        const isFile = typeof source !== "string";
        if (isFile && !/^image\//.test(source.type || "")) throw new Error("type");
        const url = isFile ? URL.createObjectURL(source) : source;
        try {
            const image = await loadImage(url);
            const scale = Math.min(1, (maxSide || 640) / Math.max(image.naturalWidth, image.naturalHeight));
            const width = Math.max(1, Math.round(image.naturalWidth * scale));
            const height = Math.max(1, Math.round(image.naturalHeight * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);
            return canvas.toDataURL("image/jpeg", quality || 0.82);
        } finally {
            if (isFile) URL.revokeObjectURL(url);
        }
    }


    /* =====================================================
       9. INTERFACE
    ===================================================== */

    function toast(message, kind) {
        if (!document.body) return;
        let zone = document.querySelector(".mdn-toast-zone");
        if (!zone) {
            zone = document.createElement("div");
            zone.className = "mdn-toast-zone";
            zone.setAttribute("role", "status");
            zone.setAttribute("aria-live", "polite");
            document.body.appendChild(zone);
        }
        const item = document.createElement("div");
        item.className = `mdn-toast${kind ? ` is-${kind}` : ""}`;
        item.textContent = message;
        zone.appendChild(item);
        requestAnimationFrame(() => item.classList.add("is-visible"));
        setTimeout(() => {
            item.classList.remove("is-visible");
            setTimeout(() => item.remove(), 300);
        }, 3400);
    }

    /* Message affiché à l’arrivée sur la page suivante. */
    function flash(message, kind) {
        try { sessionStorage.setItem(KEYS.flash, JSON.stringify({ message, kind: kind || "" })); } catch { /* ignoré */ }
    }

    function showFlash() {
        try {
            const raw = sessionStorage.getItem(KEYS.flash);
            if (!raw) return;
            sessionStorage.removeItem(KEYS.flash);
            const { message, kind } = JSON.parse(raw);
            if (message) toast(message, kind);
        } catch { /* ignoré */ }
    }

    let lastFocus = null;

    function openModal(target) {
        const modal = typeof target === "string" ? document.getElementById(target) : target;
        if (!modal) return;
        lastFocus = document.activeElement;
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        const first = modal.querySelector("input:not([type=hidden]), select, textarea, button:not(.close)");
        setTimeout(() => first && first.focus(), 40);
    }

    function closeModal(target) {
        const modal = typeof target === "string" ? document.getElementById(target) : target;
        if (!modal) return;
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
        if (!document.querySelector(".modal:not(.hidden)")) document.body.classList.remove("modal-open");
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }

    function confirmDialog(options) {
        const settings = { title: "Confirmer", message: "", confirmLabel: "Confirmer", cancelLabel: "Annuler", danger: false, ...options };
        return new Promise(resolve => {
            const overlay = document.createElement("div");
            overlay.className = "modal mdn-confirm";
            overlay.innerHTML = `
                <div class="modal-box" role="alertdialog" aria-modal="true" aria-labelledby="mdnConfirmTitle" aria-describedby="mdnConfirmText">
                    <h2 id="mdnConfirmTitle">${esc(settings.title)}</h2>
                    <p id="mdnConfirmText">${esc(settings.message)}</p>
                    <div class="mdn-confirm-actions">
                        <button type="button" class="mdn-btn mdn-btn-ghost" data-answer="no">${esc(settings.cancelLabel)}</button>
                        <button type="button" class="mdn-btn ${settings.danger ? "mdn-btn-danger" : "mdn-btn-primary"}" data-answer="yes">${esc(settings.confirmLabel)}</button>
                    </div>
                </div>`;
            const previous = document.activeElement;
            const finish = answer => {
                document.removeEventListener("keydown", onKey, true);
                overlay.remove();
                if (!document.querySelector(".modal:not(.hidden)")) document.body.classList.remove("modal-open");
                if (previous && document.contains(previous)) previous.focus();
                resolve(answer);
            };
            const onKey = event => {
                if (event.key === "Escape") { event.stopPropagation(); finish(false); }
            };
            overlay.addEventListener("click", event => {
                const button = event.target.closest("[data-answer]");
                if (button) finish(button.dataset.answer === "yes");
                else if (event.target === overlay) finish(false);
            });
            document.addEventListener("keydown", onKey, true);
            document.body.appendChild(overlay);
            document.body.classList.add("modal-open");
            overlay.querySelector("[data-answer=yes]").focus();
        });
    }

    /* Fermeture des fenêtres : bouton [data-close-modal], clic sur le fond, touche Échap.
       Bouton « Afficher » des mots de passe : [data-toggle-password="idDuChamp"]. */
    document.addEventListener("click", event => {
        const eye = event.target.closest("[data-toggle-password]");
        if (eye) {
            const input = document.getElementById(eye.dataset.togglePassword);
            if (input) {
                const show = input.type === "password";
                input.type = show ? "text" : "password";
                eye.textContent = show ? "Masquer" : "Afficher";
                eye.setAttribute("aria-pressed", show ? "true" : "false");
                input.focus();
            }
            return;
        }
        const closer = event.target.closest("[data-close-modal]");
        if (closer) {
            closeModal(closer.closest(".modal"));
            return;
        }
        const target = event.target;
        if (target.classList && target.classList.contains("modal") && !target.classList.contains("mdn-confirm")) closeModal(target);
    });

    /* Un champ signalé en erreur redevient normal dès qu’on le corrige. */
    document.addEventListener("input", event => {
        const field = event.target;
        if (field && field.classList && field.classList.contains("input-error")) {
            field.classList.remove("input-error");
            field.removeAttribute("aria-invalid");
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        const open = [...document.querySelectorAll(".modal:not(.hidden):not(.mdn-confirm)")].pop();
        if (open) closeModal(open);
    });

    /* Badges (cloche, demandes, favoris) et état connecté. */
    function refreshChrome() {
        if (!document.body) return;
        const counts = {
            notifications: notifications.unread(),
            messages: readList(KEYS.messages).length,
            saved: readList(KEYS.saved).length
        };
        document.querySelectorAll("[data-badge]").forEach(element => {
            const count = counts[element.dataset.badge] || 0;
            element.textContent = count > 99 ? "99+" : String(count);
            element.hidden = count === 0;
        });
        const user = account.current();
        document.querySelectorAll("[data-user-initials]").forEach(element => { element.textContent = account.initials(user); });
        document.querySelectorAll("[data-when-logged-in]").forEach(element => { element.hidden = !user; });
        document.querySelectorAll("[data-when-logged-out]").forEach(element => { element.hidden = Boolean(user); });
    }

    function applyTheme() {
        if (document.body) document.body.classList.toggle("dark-mode", read(KEYS.darkMode, false) === true);
    }

    function setDarkMode(enabled) {
        write(KEYS.darkMode, Boolean(enabled));
        applyTheme();
    }


    /* =====================================================
       10. MISE À JOUR DES ANCIENNES DONNÉES
       Les comptes créés avec l’ancienne version restent
       valides : mot de passe haché, photo déplacée, etc.
    ===================================================== */

    function migrate() {
        if (Number(read(KEYS.version, 0)) >= 2) return;
        const user = account.get();
        let legacyPhoto = "";
        try { legacyPhoto = localStorage.getItem(KEYS.legacyPhoto) || ""; } catch { /* ignoré */ }
        remove(KEYS.legacyPhoto);

        if (user) {
            if (typeof user.password === "string" && !user.passwordHash) account.setPassword(user, user.password);
            if (!user.firstName && user.fullName) {
                const parts = String(user.fullName).trim().split(/\s+/);
                user.firstName = parts.shift() || "";
                user.lastName = parts.join(" ");
            }
            delete user.fullName;
            if (!user.photo && legacyPhoto.startsWith("data:image/")) user.photo = legacyPhoto;
            write(KEYS.user, user);
            /* Avant, avoir un compte voulait dire être connecté : on garde cet état. */
            if (!read(KEYS.session, null) && user.email) account.startSession(user);

            const ownName = user.firstName || user.name;
            const list = read(KEYS.publications, null);
            if (Array.isArray(list) && ownName) {
                list.forEach(item => {
                    if (!item.ownerEmail && Number(item.id) > 1e12 && item.user === ownName) item.ownerEmail = user.email;
                });
                write(KEYS.publications, list);
            }
        }
        write(KEYS.version, 2);
        shrinkStoredPhoto();
    }

    /* Réduit une ancienne photo de profil trop lourde. */
    function shrinkStoredPhoto() {
        const user = account.get();
        if (!user || typeof user.photo !== "string" || user.photo.length < 150000) return;
        resizeImage(user.photo, 320, 0.85)
            .then(small => {
                const fresh = account.get();
                if (fresh) { fresh.photo = small; write(KEYS.user, fresh); }
            })
            .catch(() => { /* on garde l’ancienne photo */ });
    }


    /* =====================================================
       DÉMARRAGE (le script est chargé en fin de page)
    ===================================================== */

    window.Medinati = {
        KEYS,
        store: { read, write, remove, readList },
        text: { esc, fold, initialsOf, plural, relativeDate, uid, isEmail },
        security: { sha256, hashPassword },
        account,
        safeReturn,
        listings,
        saved,
        messages,
        notifications,
        location: locationTools,
        images: { resize: resizeImage },
        ui: { toast, flash, openModal, closeModal, confirm: confirmDialog, refresh: refreshChrome, setDarkMode }
    };

    migrate();
    applyTheme();
    refreshChrome();
    showFlash();

    /* Les autres onglets ouverts restent à jour. */
    window.addEventListener("storage", () => { applyTheme(); refreshChrome(); });
})();
