/*
app.js - DevConnect Dinamic
Versiunea cu fetch() si async/await
API: JSONPlaceholder (https://jsonplaceholder.typicode.com)
*/
// ============================================================
// 0. HELPER UI - functii reutilizabile
// ============================================================
// Afiseaza un spinner de loading intr-un container
function afiseazaLoading(container, mesaj = 'Se incarca...') {
    container.innerHTML = `
<div class='loading-container'>
<div class='spinner'></div>
<p class='loading-text'>${mesaj}</p>
</div>
`;
}
// Afiseaza un mesaj de eroare intr-un container
function afiseazaEroareContainer(container, mesaj, onRetry = null) {
    container.innerHTML = `
<div class='eroare-container'>
<p class='eroare-icon'>!</p>
<p class='eroare-mesaj'>${mesaj}</p>
${onRetry ? `<button class='btn-retry'>Incearca din nou</button>` : ''}
</div>
`;
    // Atasam handler pentru butonul de retry
    if (onRetry) {
        container.querySelector('.btn-retry')?.addEventListener('click', onRetry);
    }
}// ============================================================
// 1. DATE - Fetch de la API public (JSONPlaceholder)
// ============================================================
// URL-ul de baza al API-ului

const STORAGE_KEY = 'devconnect_v2';
// Transforma un user JSONPlaceholder intr-un obiect speaker DevConnect
// JSONPlaceholder returneaza: { id, name, email, company.name, ... }
// Noi avem nevoie de: { id, nume, titlu, companie, sesiune, poza, ... }
function transformaUserInSpeaker(user, index) {
    const sesiuni = [
        'React la Scara Mare', 'Node.js in Productie', 'AI in Web Dev',
        'CI/CD cu GitHub Actions', 'Docker pentru Incepatori', 'Web Security 2025',
        'TypeScript Best Practices', 'GraphQL vs REST', 'Micro-frontends',
        'Performance Web',
    ];
    const titluri = [
        'Senior Frontend Engineer', 'DevOps Lead', 'AI Researcher',
        'Cloud Architect', 'Security Engineer', 'Node.js Contributor',
        'UX Engineer', 'Backend Lead', 'Full Stack Developer', 'CTO',
    ];
    const tipuri = ['Talk', 'Workshop', 'Talk', 'Workshop', 'Talk',
        'Panel', 'Talk', 'Workshop', 'Talk', 'Panel'];
    return {
        id: user.id,
        nume: user.name,
        titlu: titluri[index % titluri.length],

        companie: user.company.name,
        sesiune: sesiuni[index % sesiuni.length],
        tip: tipuri[index % tipuri.length],
        data: index < 5 ? '2025-09-15' : '2025-09-16',
        ora: index % 3 === 0 ? '10:00' : index % 3 === 1 ? '14:00' : '11:00',
        sala: index % 2 === 0 ? 'Sala A' : 'Sala B',
        // pravatar.cc genereaza avatare consistente dupa ID
        poza: `https://i.pravatar.cc/300?img=${user.id}`,
        email: user.email,
    };
}
// Functia async care incarca speakerii de la API
async function incarcaSpeakeri() {
    // Cerem primii 6 utilizatori de la JSONPlaceholder
    const raspuns = await fetch(`${API_BASE}/users?_limit=6`);
    // Verificam ca serverul a raspuns cu status OK (200-299)
    if (!raspuns.ok) {
        throw new Error(`Eroare API: ${raspuns.status} ${raspuns.statusText}`);
    }
    // Convertim raspunsul JSON in array de obiecte JavaScript
    const utilizatori = await raspuns.json();
    // Transformam fiecare user in format speaker DevConnect
    return utilizatori.map(transformaUserInSpeaker);
}
// Functia async pentru workshopuri (din posts JSONPlaceholder)
async function incarcaWorkshopuri() {
    const raspuns = await fetch(`${API_BASE}/posts?_limit=3`);
    if (!raspuns.ok) throw new Error(`Eroare: ${raspuns.status}`);
    const postari = await raspuns.json();
    const nivele = ['Incepator', 'Intermediar', 'Avansat'];
    return postari.map((post, i) => ({
        id: post.id,
        titlu: post.title.length > 40 ? post.title.slice(0, 40) + '...' : post.title,
        speaker: 'Speaker DevConnect',
        durata: ['2 ore', '3 ore', '4 ore'][i % 3],
        nivel: nivele[i % 3],
        locuri: 30,
        locuriLibere: [8, 0, 22][i % 3],
        data: i < 2 ? '15 septembrie' : '16 septembrie',
        ora: ['10:00-12:00', '14:00-18:00', '11:00-13:00'][i % 3],
        sala: i % 2 === 0 ? 'Sala A' : 'Sala B',
        descriere: post.body.length > 100 ? post.body.slice(0, 100) + '...' :
            post.body,
    }));
}// ============================================================
// 2. RANDARE - cu loading state si gestionare erori
// ============================================================
function creeazaCardSpeaker(speaker) {
    const culoareTip = speaker.tip === 'Workshop' ? '#2E5FAC' : '#1A6B6B';

    return `
<article class='card-speaker' data-id='${speaker.id}'>
<figure>
<img
src='${speaker.poza}'
alt='${speaker.nume}'
width='300'
height='300'
loading='lazy'
>
<figcaption>${speaker.companie}</figcaption>
</figure>
<div class='card-body'>
<span class='badge-tip' style='background:${culoareTip}'>${speaker.tip}</span>
<h3>${speaker.nume}</h3>
<p class='titlu-job'>${speaker.titlu}</p>
<p class='sesiune'>${speaker.sesiune}</p>
<p class='data-sesiune'>${speaker.data} • ${speaker.ora} • ${speaker.sala}</p>
</div>
</article>
`;
}
// Versiunea ASYNC a randeazaSpeakeri - acum incarca date din retea
async function randeazaSpeakeri() {
    const container = document.querySelector('.grid-speakeri');
    if (!container) return;
    afiseazaLoading(container, 'Se incarca speakerii...');
    try {
        const speakeri = await incarcaSpeakeri();
        container.innerHTML = speakeri.map(creeazaCardSpeaker).join('');
        console.log(`Randat ${speakeri.length} speakeri.`);
    } catch (eroare) {
        console.error('Eroare la incarcarea speakerilor:', eroare);
        afiseazaEroareContainer(
            container,
            `Nu am putut incarca speakerii. (${eroare.message})`,
            randeazaSpeakeri
        );
    }
}
function creeazaCardWorkshop(workshop) {
    const complet = workshop.locuriLibere === 0;
    const procent = Math.round(
        ((workshop.locuri - workshop.locuriLibere) / workshop.locuri) * 100
    );
    return `
<article class='card-workshop ${complet ? 'complet' : ''}'>
<div class='workshop-header'>
<span class='badge-nivel nivel-${workshop.nivel.toLowerCase()}'>${workshop.nivel}</span>
<span class='workshop-durata'>${workshop.durata}</span>
</div>
<h3 class='workshop-titlu'>${workshop.titlu}</h3>
<p class='workshop-speaker'>cu ${workshop.speaker}</p>
<p class='workshop-descriere'>${workshop.descriere}</p>

<div class='bara-progres'>
<div class='bara-umpluta' style='width:${procent}%'></div>
</div>
<p class='text-locuri'>
${complet
            ? '<strong>Complet</strong>'
            : `<strong>${workshop.locuriLibere}</strong> locuri disponibile`
        }
</p>
<button class='btn-inscriere ${complet ? 'btn-asteptare' : 'btn-primar'}'>
${complet ? 'Lista de asteptare' : 'Inscrie-te'}
</button>
</article>
`;
}
async function randeazaWorkshopuri() {
    const sectiuneContact = document.querySelector('#contact .container');
    if (!sectiuneContact) return;
    let titluWorkshopuri = document.querySelector('.titlu-workshopuri');
    let divW = document.querySelector('.grid-workshopuri');
    if (!divW) {
        titluWorkshopuri = document.createElement('h2');
        titluWorkshopuri.textContent = 'Workshopuri Disponibile';
        titluWorkshopuri.className = 'titlu-workshopuri';
        divW = document.createElement('div');
        divW.className = 'grid-workshopuri';
        const form = sectiuneContact.querySelector('form');
        sectiuneContact.insertBefore(titluWorkshopuri, form);
        sectiuneContact.insertBefore(divW, form);
    }
    afiseazaLoading(divW, 'Se incarca workshopurile...');
    try {
        const workshopuri = await incarcaWorkshopuri();
        divW.innerHTML = workshopuri.map(creeazaCardWorkshop).join('');
    } catch (err) {
        afiseazaEroareContainer(
            divW,
            `Eroare workshops: ${err.message}`,
            randeazaWorkshopuri
        );
    }
}// ============================================================
// 3. VALIDARE (neschimbat din Lab 4)
// ============================================================
const reguli = {
    'nume-complet': (v) => v.trim().length < 3 ? 'Minim 3 caractere.' : '',
    email: (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Email invalid.' : '',
    telefon: (v) => v.trim() && !/^(\+40|0)[0-9]{9}$/.test(v.replace(/\s/g, '')) ?
        'Format: +40 7XX XXX XXX' : '',
};
function afiseazaEroareCamp(id, msg) {
    const span = document.getElementById('eroare-' + id);
    const input = document.getElementById(id);
    if (!span || !input) return;
    if (msg) {
        span.textContent = msg; span.removeAttribute('hidden');
        input.style.borderColor = '#dc3545';
    } else {
        span.textContent = ''; span.setAttribute('hidden', '');
        input.style.borderColor = '#28a745';
    }
}
function valideazaCamp(id) {
    const input = document.getElementById(id);
    if (!input || !reguli[id]) return true;
    const err = reguli[id](input.value);
    afiseazaEroareCamp(id, err);
    return err === '';
}
// ============================================================
// 4. FORMULAR (neschimbat din Lab 4)
// ============================================================
// In Lab 5 folosim cheia 'devconnect_v2' pentru a separa datele
// fata de versiunea anterioara (Lab 4 - 'devconnect_inregistrari')
function colecteazaDate() {
    return {
        numeComplet: document.getElementById('nume-complet')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim() || '',
        telefon: document.getElementById('telefon')?.value.trim() || '',

        tipParticipant:
            document.querySelector('input[name="tipParticipant"]:checked')?.value || 'student',
        workshopuri:
            Array.from(document.querySelectorAll('input[name="workshop"]:checked')).map(c => c.value
            ),
        mesaj: document.getElementById('mesaj')?.value.trim() || '',
        timestamp: new Date().toISOString(),
    };
}
function afiseazaStatus(tip, mesaj) {
    const div = document.getElementById('mesaj-status');
    if (!div) return;
    div.textContent = mesaj; div.removeAttribute('hidden');
    Object.assign(div.style, {
        padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontWeight: '600',
        background: tip === 'succes' ? '#d4edda' : '#f8d7da',
        color: tip === 'succes' ? '#155724' : '#721c24',
        border: tip === 'succes' ? '1px solid #c3e6cb' : '1px solid #f5c6cb',
    });
    div.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function handleSubmit(e) {
    e.preventDefault();
    const ids = ['nume-complet', 'email', 'telefon'];
    ids.forEach(id => {
        const el = document.getElementById(id); if (el)
            el.dataset.atins = 'true';
    });
    const valid = ids.every(id => valideazaCamp(id));
    if (!valid) { afiseazaStatus('eroare', 'Corecteaza campurile marcate.'); return; }
    const date = colecteazaDate();
    const existente = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (existente.some(r => r.email === date.email)) {
        afiseazaStatus('eroare', `${date.email} este deja inregistrat.`); return;
    }
    existente.push(date);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existente));
    afiseazaStatus('succes', `Multumim, ${date.numeComplet.split(' ')[0]}! Confirmare la
${date.email}.`);
    e.target.reset();
}
// ============================================================
// 5. INIT - acum async pentru a astepta datele
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOM gata - initializez DevConnect v2 (async)...');
    // Promise.all: incarcam speakeri si workshopuri IN PARALEL
    // Mai rapid decat await randeazaSpeakeri(); await randeazaWorkshopuri();
    await Promise.all([
        randeazaSpeakeri(),
        randeazaWorkshopuri(),
    ]);
    // Formular
    const form = document.getElementById('form-inregistrare');
    if (form) {
        form.addEventListener('submit', handleSubmit);
        ['nume-complet', 'email', 'telefon'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('blur', () => {
                el.dataset.atins = 'true'; valideazaCamp(id);
            });

            el.addEventListener('input', () => {
                if (el.dataset.atins === 'true')
                    valideazaCamp(id);
            });
        });
    }
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const t = document.querySelector(link.getAttribute('href'));
            if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
        });
    });
    console.log('DevConnect v2 initiat.');
});
window.devconnect_debug = () => console.table(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
);// INAINTE (fetch() direct din Lab 5):
async function incarcaSpeakeri() {
    const raspuns = await fetch(`${API_BASE}/users?_limit=6`);
    if (!raspuns.ok) throw new Error(`Eroare: ${raspuns.status}`);
    const utilizatori = await raspuns.json();
    return utilizatori.map(transformaUserInSpeaker);
}
// DUPA (cu apiFetch din api.js):
async function incarcaSpeakeri() {
    // apiFetch adauga automat: timeout, retry, gestionare erori, logging
    // Nu mai trebuie sa verificam raspuns.ok - apiFetch arunca eroare deja
    const utilizatori = await apiFetch('/users?_limit=6');
    return utilizatori.map(transformaUserInSpeaker);
}
// La fel pentru workshopuri:
// INAINTE:
// const raspuns = await fetch(`${API_BASE}/posts?_limit=3`);

// if (!raspuns.ok) throw new Error(...);
// const postari = await raspuns.json();
// DUPA:
async function incarcaWorkshopuri() {
    const postari = await apiFetch('/posts?_limit=3');
    // ... restul transformarii ramane la fel
    const nivele = ['Incepator', 'Intermediar', 'Avansat'];
    return postari.map((post, i) => ({
        id: post.id,
        titlu: post.title.length > 40 ? post.title.slice(0, 40) + '...' : post.title,
        speaker: 'Speaker DevConnect',
        durata: ['2 ore', '3 ore', '4 ore'][i % 3],
        nivel: nivele[i % 3],
        locuri: 30,
        locuriLibere: [8, 0, 22][i % 3],
        data: i < 2 ? '15 septembrie' : '16 septembrie',
        ora: ['10:00-12:00', '14:00-18:00', '11:00-13:00'][i % 3],
        sala: i % 2 === 0 ? 'Sala A' : 'Sala B',
        descriere: post.body.length > 100 ? post.body.slice(0, 100) + '...' :
            post.body,
    }));
}
// Sterge variabila API_BASE din app.js (acum e in ApiConfig din api.js)
// const API_BASE = 'https://jsonplaceholder.typicode.com'; ← STERGE ACEASTA LINIE