// Scenariul CORS:
// Pagina ta: http://localhost:5500 (Live Server)
// Backend: http://localhost:3000 (Express)
// Browser: "Vrei sa trimiti o cerere de la 5500 la 3000?"
// "Porturi diferite = origini diferite = CORS!"
// Eroarea pe care o vei vedea in Console:
// Access to fetch at "http://localhost:3000/api/speakeri"
// from origin "http://localhost:5500" has been blocked by CORS policy:
// No "Access-Control-Allow-Origin" header is present on the requested resource.
// Cum se rezolva:
// Pe SERVER (Express) adaugam header-ul care permite cererile:
// app.use(cors({ origin: 'http://localhost:5500' }));
// sau pentru orice origine (development only):
// app.use(cors({ origin: '*' }));
// JSONPlaceholder are CORS configurat corect - de aceea functioneaza din browser/*
// ============================================================
// CONFIGURARE
// ============================================================
const ApiConfig = {
    // URL-ul de baza al API-ului
    // In Lab 7-8 schimbam la 'http://localhost:3000/api'
    baseUrl: 'https://jsonplaceholder.typicode.com',
    // Timeout in milisecunde (8 secunde)
    timeout: 8000,
    // Numarul de reincercari la eroare de retea
    maxRetry: 2,
    // Headers trimise cu fiecare cerere
    defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
};
// Token JWT - va fi setat la autentificare (Lab 7-8)
let _accessToken = null;
function setToken(token) { _accessToken = token; }
function clearToken() { _accessToken = null; }// ============================================================
// LOADING STATE GLOBAL
// ============================================================
// Contor de cereri active - cand > 0, pagina e in loading
let _cereriActive = 0;
function _incepCerere() {
    _cereriActive++;
    // Optiona: adaugam clasa pe body pentru indicator global
    document.body.classList.add('api-loading');
}
function _terminaCerere() {
    _cereriActive = Math.max(0, _cereriActive - 1);
    if (_cereriActive === 0) {
        document.body.classList.remove('api-loading');
    }
}// ============================================================
// PROCESAREA RASPUNSULUI
// ============================================================
// Converteste un raspuns HTTP in date sau arunca o eroare clara
async function _proceseazaRaspuns(raspuns) {
    // Citim body-ul o singura data (stream poate fi citit doar o data)
    const contentType = raspuns.headers.get('content-type') || '';
    const esteJson = contentType.includes('application/json');

    // Incercam sa parsam JSON-ul (sau text simplu)
    let body;
    try {
        body = esteJson ? await raspuns.json() : await raspuns.text();
    } catch {
        body = null;
    }
    // Daca status e OK (200-299), returnam datele
    if (raspuns.ok) {
        return body;
    }
    // Status NU e OK - construim un mesaj de eroare clar
    const mesajeStatus = {
        400: 'Date invalide trimise la server.',
        401: 'Nu esti autentificat. Te rugam sa te autentifici.',
        403: 'Nu ai permisiunea pentru aceasta actiune.',
        404: 'Resursa ceruta nu a fost gasita.',
        409: 'Conflict: resursa exista deja.',
        422: 'Datele nu au trecut validarea serverului.',
        429: 'Prea multe cereri. Asteapta putin.',
        500: 'Eroare interna de server. Incearca mai tarziu.',
        503: 'Serverul este temporar indisponibil.',
    };
    // Mesajul din body are prioritate (serverul poate trimite mesaje custom)
    const mesajServer = body?.message || body?.eroare || body?.error;
    const mesajFinal = mesajServer || mesajeStatus[raspuns.status]
        || `Eroare necunoscuta (${raspuns.status})`;
    const eroare = new Error(mesajFinal);
    eroare.status = raspuns.status; // atasam status-ul HTTP la eroare
    eroare.body = body;
    throw eroare;
}// ============================================================
// WRAPPER-UL PRINCIPAL - apiFetch()
// ============================================================
/**
* apiFetch - wrapper peste fetch() cu timeout, retry si erori clare
*
* @param {string} cale - calea API relativa la baseUrl (ex: '/users')
* @param {object} optiuni - optiuni fetch: method, body, headers
* @param {number} retry - numar de reincercari ramase (intern)
* @returns {Promise<any>} - datele JSON de la server
*/
async function apiFetch(cale, optiuni = {}, retry = ApiConfig.maxRetry) {
    const url = `${ApiConfig.baseUrl}${cale}`;
    // Construim headers-urile - combinam default cu cele specifice cererii
    const headers = { ...ApiConfig.defaultHeaders, ...optiuni.headers };
    // Adaugam Authorization daca avem token JWT
    if (_accessToken) {
        headers['Authorization'] = `Bearer ${_accessToken}`;
    }
    // AbortController permite anularea cererii dupa timeout
    const controller = new AbortController();
    const timerId = setTimeout(
        () => controller.abort(),
        ApiConfig.timeout
    );

    _incepCerere();
    console.log(`[API] ${optiuni.method || 'GET'} ${url}`);
    try {
        const raspuns = await fetch(url, {
            method: 'GET', // implicit GET
            ...optiuni,
            headers,
            signal: controller.signal, // pentru timeout
        });
        clearTimeout(timerId); // anulam timerul daca cererea a reusit
        return await _proceseazaRaspuns(raspuns);
    } catch (eroare) {
        clearTimeout(timerId);
        // Eroare de TIMEOUT
        if (eroare.name === 'AbortError') {
            throw new Error(`Cererea a depasit ${ApiConfig.timeout / 1000}s. Verifica
conexiunea.`);
        }
        // Eroare de RETEA (offline, DNS, etc.) - reincercam
        if (!eroare.status && retry > 0) {
            console.warn(`[API] Retea indisponibila. Reincercare ${ApiConfig.maxRetry -
                retry + 1}/${ApiConfig.maxRetry}...`);
            // Asteptam 1 secunda inainte de retry (backoff simplu)
            await new Promise(r => setTimeout(r, 1000));
            return apiFetch(cale, optiuni, retry - 1);
        }
        console.error(`[API] Eroare: ${eroare.message}`);
        throw eroare;
    } finally {
        _terminaCerere(); // mereu decrementam contorul
    }
}
// Metode shorthand pentru comoditate
const api = {
    get: (cale, opts) => apiFetch(cale, { ...opts, method: 'GET' }),
    post: (cale, body) => apiFetch(cale, {
        method: 'POST', body:
            JSON.stringify(body)
    }),
    put: (cale, body) => apiFetch(cale, {
        method: 'PUT', body:
            JSON.stringify(body)
    }),
    patch: (cale, body) => apiFetch(cale, {
        method: 'PATCH', body:
            JSON.stringify(body)
    }),
    delete: (cale) => apiFetch(cale, { method: 'DELETE' }),
    setToken,
    clearToken,
};
// Expunem global (pentru a fi accesibil din app.js fara module system)
window.api = api;
window.apiFetch = apiFetch;
console.log('[API] Client HTTP initializat. Base URL:', ApiConfig.baseUrl);