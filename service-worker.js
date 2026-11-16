const CACHE_NAME =
    "ardoise-bvp-v7.2";

const FICHIERS_STATIQUES = [
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];

const PAGE_DE_SECOURS =
    "./index.html";


self.addEventListener(
    "install",
    function(event) {

        event.waitUntil(
            caches
                .open(CACHE_NAME)
                .then(
                    function(cache) {

                        return cache.addAll(
                            [
                                PAGE_DE_SECOURS,
                                ...FICHIERS_STATIQUES
                            ]
                        );
                    }
                )
                .then(
                    function() {

                        return self.skipWaiting();
                    }
                )
        );
    }
);


self.addEventListener(
    "activate",
    function(event) {

        event.waitUntil(
            caches
                .keys()
                .then(
                    function(nomsCaches) {

                        return Promise.all(
                            nomsCaches.map(
                                function(nomCache) {

                                    if (
                                        nomCache !==
                                        CACHE_NAME
                                    ) {

                                        return caches.delete(
                                            nomCache
                                        );
                                    }

                                    return Promise.resolve();
                                }
                            )
                        );
                    }
                )
                .then(
                    function() {

                        return self.clients.claim();
                    }
                )
        );
    }
);


self.addEventListener(
    "fetch",
    function(event) {

        const requete =
            event.request;

        const adresse =
            new URL(requete.url);

        /*
            On ne traite que les requêtes GET.
            Les écritures Firebase ne doivent surtout
            pas être transformées ou mises en cache.
        */
        if (requete.method !== "GET") {
            return;
        }

        /*
            Les appels Firebase et les autres ressources
            externes restent entièrement gérés par le réseau.
        */
        if (
            adresse.origin !==
            self.location.origin
        ) {
            return;
        }

        /*
            Pour la page HTML :
            réseau en priorité, cache en secours.
        */
        if (requete.mode === "navigate") {

            event.respondWith(
                fetch(requete)
                    .then(
                        function(reponseReseau) {

                            const copie =
                                reponseReseau.clone();

                            caches
                                .open(CACHE_NAME)
                                .then(
                                    function(cache) {

                                        cache.put(
                                            PAGE_DE_SECOURS,
                                            copie
                                        );
                                    }
                                );

                            return reponseReseau;
                        }
                    )
                    .catch(
                        function() {

                            return caches.match(
                                PAGE_DE_SECOURS
                            );
                        }
                    )
            );

            return;
        }

        /*
            Pour les fichiers statiques :
            cache en priorité, réseau en secours.
        */
        event.respondWith(
            caches
                .match(requete)
                .then(
                    function(reponseCache) {

                        if (reponseCache) {
                            return reponseCache;
                        }

                        return fetch(requete)
                            .then(
                                function(reponseReseau) {

                                    if (
                                        !reponseReseau ||
                                        !reponseReseau.ok
                                    ) {
                                        return reponseReseau;
                                    }

                                    const copie =
                                        reponseReseau.clone();

                                    caches
                                        .open(CACHE_NAME)
                                        .then(
                                            function(cache) {

                                                cache.put(
                                                    requete,
                                                    copie
                                                );
                                            }
                                        );

                                    return reponseReseau;
                                }
                            );
                    }
                )
        );
    }
);