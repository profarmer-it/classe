/* ==========================================================================
   La Classe (classe.profarmer.it) — agenti specializzati al servizio di un progetto.
   Pro Farmer, dal 9/11/2026. Una classe = un progetto (la prima: Riposa).
   --------------------------------------------------------------------------
   Sicurezza: questa pagina non contiene niente di riservato. Tutto quello che
   mostra arriva dal database dopo l'accesso con e-mail, password e secondo
   fattore (codice dell'app di autenticazione), e solo per i membri della classe
   (regole RLS in 63-classe.sql). Le risposte degli agenti le prepara la funzione
   `classe` sul server; da qui non si scrive niente direttamente nel database.
   Ogni testo che arriva dal database passa da esc() prima di entrare nella pagina.
   ========================================================================== */
'use strict';

(() => {
  // niente dentro una cornice di un altro sito
  if (window.top !== window.self) { document.body.textContent = ''; return; }

  const SUPABASE = {
    url: 'https://gmhmxybqmkcmnbjdnslz.supabase.co',
    chiave: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtaG14eWJxbWtjbW5iamRuc2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NjM4OTgsImV4cCI6MjEwODIzOTg5OH0.af0OZrnCjJ6Wznmv0vmimnUSOPeLcrRSU5AhyvIRNBc'
  };
  const FUNZIONE = SUPABASE.url + '/functions/v1/classe';
  const sb = window.supabase.createClient(SUPABASE.url, SUPABASE.chiave, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'classe-accesso' }
  });
  const app = document.getElementById('app');
  const movimento = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── utilità ──────────────────────────────────────────────────────────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const colore = c => /^#[0-9A-Fa-f]{6}$/.test(String(c)) ? c : '#8896A8';
  // testo dell'agente: a capo e indirizzi web cliccabili (solo https/http), tutto il resto come testo
  // il collegamento mostra il sito e, al tocco, chiede conferma con l'indirizzo intero (clicConv)
  const testoAgente = s => esc(s).replace(/\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g, u => {
    let sito = u; try { sito = new URL(u.replace(/&amp;/g, '&')).hostname; } catch (_) {}
    return `<a href="${u}" target="_blank" rel="noopener noreferrer" data-esterno title="${u}">${esc(sito)} ↗</a>`;
  });
  const ora = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('it-IT', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const soloOra = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
  function giornoDi(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    if (d.toDateString() === new Date().toDateString()) return 'Oggi';
    if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return 'Ieri';
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  const quandoBreve = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toDateString() === new Date().toDateString() ? soloOra(iso) : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' }); };
  const ICONA = {
    chat: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.9 3 3 6.6 3 11c0 2.2 1 4.2 2.6 5.6L5 21l4.3-2.1c.9.2 1.8.3 2.7.3 5.1 0 9-3.6 9-8.1S17.1 3 12 3z"/></svg>',
    gruppo: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 13c-3.3 0-6 1.6-6 3.6V19h12v-2.4C15 14.6 12.3 13 9 13zm7 0c-.5 0-1 0-1.5.1 1 .8 1.5 1.8 1.5 2.9V19h5v-2.2c0-2-2.2-3.8-5-3.8z"/></svg>',
    invia: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg>',
    indietro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    approfondisci: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 7.5v3l2 1.5"/></svg>'
  };

  // ── chiamate alla funzione del server ────────────────────────────────────
  async function chiama(corpo) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { mostraAccesso(); throw new Error('Accedi di nuovo.'); }
    let r;
    try {
      r = await fetch(FUNZIONE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token, apikey: SUPABASE.chiave },
        body: JSON.stringify(corpo)
      }).then(x => x.json());
    } catch (_) { throw new Error('Non c’è rete, o il server non risponde: riprova.'); }
    if (!r || !r.ok) throw new Error((r && r.motivo) || 'Qualcosa non ha funzionato: riprova.');
    return r;
  }

  // ── accesso: e-mail e password, poi il secondo fattore ──────────────────
  function schedaAccesso(titolo, corpo) {
    fermaGiri();
    app.innerHTML = `<main class="accesso"><div class="scheda-accesso"><p class="occhiello">Pro Farmer</p><h1>${esc(titolo)}</h1>${corpo}</div></main>`;
  }
  function mostraAccesso(messaggio) {
    schedaAccesso('La Classe', `
      <p class="aiuto">Entra con l’e-mail e la password di Riposa Pro.</p>
      <form id="f-accesso" class="campi" novalidate>
        <label class="campo">E-mail<input id="a-email" type="email" autocomplete="username" required maxlength="200"></label>
        <label class="campo">Password<input id="a-password" type="password" autocomplete="current-password" required maxlength="200"></label>
        <div data-antirobot class="antirobot"></div>
        <p class="errore" id="a-errore">${esc(messaggio || '')}</p>
        <button class="bottone" type="submit">Entra</button>
      </form>
      <p class="aiuto">Password dimenticata? Si cambia da <a href="https://riposa.profarmer.it/pro/" rel="noopener noreferrer">Riposa Pro</a>.</p>`);
    const f = document.getElementById('f-accesso');
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      const email = document.getElementById('a-email').value.trim().toLowerCase();
      const password = document.getElementById('a-password').value;
      const err = document.getElementById('a-errore');
      const b = f.querySelector('button[type=submit]');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password) { err.textContent = 'Scrivi e-mail e password.'; return; }
      b.disabled = true; b.textContent = 'Entro…'; err.textContent = '';
      try {
        const captchaToken = await Antirobot.token();
        const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken } });
        if (error) throw error;
        await dopoAccesso();
      } catch (e) {
        b.disabled = false; b.textContent = 'Entra';
        const m = String(e && e.message || '');
        err.textContent = Antirobot.errore(e) ? 'Il controllo di sicurezza non è passato: riprova.'
          : /invalid login|invalid_credentials/i.test(m) ? 'E-mail o password sbagliate.'
          : /rate|too many/i.test(m) ? 'Troppi tentativi: aspetta qualche minuto.'
          : /fetch|network/i.test(m) ? 'Non c’è rete: riprova.' : 'Non riesco a farti entrare: riprova tra poco.';
      }
    });
    setTimeout(() => { const e = document.getElementById('a-email'); if (e) e.focus(); }, 50);
  }

  async function dopoAccesso() {
    const { data: classi, error } = await sb.rpc('classe_mie');
    if (error) throw error;
    if (!classi || !classi.length) {
      schedaAccesso('La Classe', '<p class="aiuto">Il tuo account non fa parte di nessuna classe. Se pensi che sia un errore, chiedi a Pro Farmer.</p><button class="bottone secondario" id="esci">Esci</button>');
      document.getElementById('esci').addEventListener('click', esci);
      return;
    }
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel === 'aal2') {
      const confermate = classi.filter(c => c.confermato);
      if (!confermate.length) {
        schedaAccesso('Quasi fatto', '<p class="aiuto">Il secondo fattore è a posto. Per sicurezza Pro Farmer conferma che è proprio il tuo: appena è confermato, la classe si apre da qui.</p><button class="bottone" id="riprova">Riprova</button> <button class="link" id="esci">Esci</button>');
        document.getElementById('riprova').addEventListener('click', () => dopoAccesso().catch(() => mostraAccesso()));
        document.getElementById('esci').addEventListener('click', esci);
        return;
      }
      return apriClassi(confermate);
    }
    if (aal && aal.nextLevel === 'aal2') return mostraCodice(classi);
    return mostraIscrizioneFattore(classi);
  }

  async function mostraIscrizioneFattore(classi) {
    schedaAccesso('Secondo fattore', '<p class="aiuto">Preparo il codice…</p>');
    try {
      // via i fattori lasciati a metà
      const { data: lista } = await sb.auth.mfa.listFactors();
      for (const f of (lista && lista.all) || []) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Classe ' + new Date().toISOString().slice(0, 16) });
      if (error) throw error;
      const qr = String(data.totp.qr_code || '');
      schedaAccesso('Secondo fattore', `
        <p class="aiuto">La Classe vede dati interni: oltre alla password serve un codice che cambia ogni 30 secondi. Una volta sola:</p>
        <ol class="aiuto passi"><li>apri un’app di autenticazione sul telefono (Google Authenticator, Microsoft Authenticator, 1Password o le Password dell’iPhone);</li><li>inquadra il codice QR, oppure copia la chiave;</li><li>scrivi qui le 6 cifre che compaiono.</li></ol>
        ${/^data:image\/svg\+xml/.test(qr) ? `<div class="qr"><img alt="Codice QR per l’app di autenticazione" src="${esc(qr)}"></div>` : ''}
        <p class="segreto" title="Chiave da copiare">${esc(data.totp.secret)}</p>
        <form id="f-codice" novalidate>
          <label class="campo">Codice di 6 cifre<input id="c-codice" class="codice" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required></label>
          <p class="errore" id="c-errore"></p>
          <button class="bottone" type="submit">Conferma</button>
        </form>
        <button class="link" id="esci">Esci</button>`);
      document.getElementById('esci').addEventListener('click', esci);
      gestisciCodice(data.id, classi);
    } catch (e) {
      schedaAccesso('Secondo fattore', `<p class="errore">Non riesco a preparare il codice: riprova tra poco.</p><button class="bottone secondario" id="esci">Esci</button>`);
      document.getElementById('esci').addEventListener('click', esci);
    }
  }

  async function mostraCodice(classi) {
    const { data: lista } = await sb.auth.mfa.listFactors();
    const f = ((lista && lista.totp) || []).find(x => x.status === 'verified');
    if (!f) return mostraIscrizioneFattore(classi);
    schedaAccesso('Il codice', `
      <p class="aiuto">Scrivi le 6 cifre dell’app di autenticazione.</p>
      <form id="f-codice" novalidate>
        <label class="campo">Codice<input id="c-codice" class="codice" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required></label>
        <p class="errore" id="c-errore"></p>
        <button class="bottone" type="submit">Entra</button>
      </form>
      <button class="link" id="esci">Esci</button>`);
    document.getElementById('esci').addEventListener('click', esci);
    gestisciCodice(f.id, classi);
  }

  function gestisciCodice(factorId, classi) {
    const f = document.getElementById('f-codice');
    const campo = document.getElementById('c-codice');
    setTimeout(() => campo.focus(), 50);
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      const code = campo.value.replace(/\D/g, '');
      const err = document.getElementById('c-errore');
      const b = f.querySelector('button[type=submit]');
      if (code.length !== 6) { err.textContent = 'Il codice ha 6 cifre.'; return; }
      b.disabled = true; err.textContent = '';
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) {
        b.disabled = false; campo.value = ''; campo.focus();
        err.textContent = /rate|too many/i.test(error.message || '') ? 'Troppi tentativi: aspetta un minuto.' : 'Codice sbagliato o scaduto: riprova col codice nuovo.';
        return;
      }
      dopoAccesso().catch(() => mostraAccesso());
    });
  }

  async function esci() {
    fermaGiri();
    try { await sb.auth.signOut(); } catch (_) {}
    mostraAccesso();
  }

  function apriClassi(classi) {
    if (classi.length === 1) return apriClasse(classi[0].id);
    schedaAccesso('Le tue classi', '<div class="campi">' + classi.map(c => `<button class="bottone secondario" data-classe="${esc(c.id)}">${esc(c.nome)}</button>`).join('') + '</div><button class="link" id="esci">Esci</button>');
    app.querySelectorAll('[data-classe]').forEach(b => b.addEventListener('click', () => apriClasse(b.dataset.classe)));
    document.getElementById('esci').addEventListener('click', esci);
  }

  // ── la classe ────────────────────────────────────────────────────────────
  let C = null;            // { progetto, reparti, tutti, agenti, collegamenti, stato, giro, note, conv, aperta, scelto, invio }
  let giri = [];
  function fermaGiri() { giri.forEach(clearTimeout); giri = []; }

  async function leggi(q) { const { data, error } = await q; if (error) throw error; return data; }
  const memoria = { leggi(k, d) { try { const v = localStorage.getItem('classe-' + k); return v == null ? d : v; } catch (_) { return d; } },
                    scrivi(k, v) { try { localStorage.setItem('classe-' + k, v); } catch (_) {} } };

  async function apriClasse(id) {
    fermaGiri();
    app.innerHTML = '<main class="accesso"><div class="scheda-accesso"><h1>La Classe</h1><p class="aiuto">Apro la classe…</p></div></main>';
    try {
      const [progetto, tuttiRep, agenti, collegamenti] = await Promise.all([
        leggi(sb.from('classe_progetti').select('id, nome, descrizione').eq('id', id).single()),
        leggi(sb.from('classe_reparti').select('id, nome, colore, lato, ordine, dove, tipo').eq('progetto', id).order('ordine')),
        leggi(sb.from('classe_agenti').select('nome, reparto, ruolo, compito, occhio, con, ordine').eq('progetto', id).order('ordine')),
        leggi(sb.from('classe_collegamenti').select('a, b').eq('progetto', id))
      ]);
      tuttiRep.forEach(r => { r.agenti = agenti.filter(a => a.reparto === r.id); r.colore = colore(r.colore); r.lato = colore(r.lato); });
      const reparti = tuttiRep.filter(r => r.tipo !== 'tutti');
      const tutti = tuttiRep.find(r => r.tipo === 'tutti') || null;
      if (tutti) tutti.agenti = agenti;
      C = { progetto, reparti, tutti, agenti, collegamenti, stato: {}, giro: null, note: [], conv: {}, aperta: null, scelto: null, invio: false };
      disegnaClasse();
      await Promise.all([aggiornaStato(), aggiornaNote(), aggiornaChat()]);
      if (matchMedia('(min-width:761px)').matches) apriChat(tutti ? tutti.id : reparti[0].id, false);
      giro();
    } catch (e) {
      const scaduta = /JWT|jwt|401|aal/i.test(String(e && e.message || ''));
      if (scaduta) return mostraAccesso('Accedi di nuovo.');
      schedaAccesso('La Classe', '<p class="errore">Non riesco ad aprire la classe: riprova tra poco.</p><button class="bottone secondario" id="riprova">Riprova</button> <button class="link" id="esci">Esci</button>');
      document.getElementById('riprova').addEventListener('click', () => apriClasse(id));
      document.getElementById('esci').addEventListener('click', esci);
    }
  }

  // aggiorna da solo: spesso mentre gli agenti scrivono, ogni tanto quando no
  function giro() {
    fermaGiri();
    if (!C) return;
    const scrivono = Object.values(C.conv).some(l => l.some(scrivendo));
    giri.push(setTimeout(async () => {
      if (document.hidden && !scrivono) return giro();
      try { await aggiornaChat(); await aggiornaNote(); if (!scrivono) await aggiornaStato(); } catch (_) {}
      giro();
    }, scrivono ? (document.hidden ? 15000 : 2500) : 30000));
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && C) { Promise.all([aggiornaChat(), aggiornaNote()]).then(giro).catch(() => {}); } });

  async function aggiornaStato() {
    const [stati, g] = await Promise.all([
      leggi(sb.from('classe_stato').select('reparto, esito, controllato_il, riassunto, punti, proposte').eq('progetto', C.progetto.id)),
      leggi(sb.from('classe_giri').select('quando, esito, riassunto').eq('progetto', C.progetto.id).maybeSingle())
    ]);
    C.stato = {}; stati.forEach(s => { C.stato[s.reparto] = s; });
    C.giro = g;
    disegnaStati();
  }
  async function aggiornaNote() {
    const note = await leggi(sb.from('classe_note').select('id, da, a, testo, fonte, creato_il').eq('progetto', C.progetto.id).order('creato_il', { ascending: false }).limit(200));
    const prima = C.note.length && C.note[C.note.length - 1].id;
    C.note = note.reverse();
    const dopo = C.note.length && C.note[C.note.length - 1].id;
    if (prima !== dopo || !document.querySelector('#tendina-note .nota')) disegnaTendina(prima && dopo && prima !== dopo);
  }
  const VECCHIO_MS = 10 * 60e3;
  const scrivendo = m => m.stato === 'in_corso' && Date.now() - new Date(m.creato_il).getTime() < VECCHIO_MS;
  async function aggiornaChat() {
    const msg = await leggi(sb.from('classe_messaggi').select('id, reparto, chi, testo, tipo, stato, creato_il').eq('progetto', C.progetto.id).order('creato_il', { ascending: false }).limit(800));
    const conv = {};
    msg.reverse().forEach(m => { (conv[m.reparto] = conv[m.reparto] || []).push(m); });
    const prima = JSON.stringify(C.conv), dopo = JSON.stringify(conv);
    C.conv = conv;
    if (prima !== dopo) { disegnaLista(); if (C.aperta) disegnaConv(); }
  }

  const ESITI = { ok: ['ok', 'TUTTO A POSTO', '#7BD389'], attenzione: ['attenzione', 'DA GUARDARE', '#F5C451'], problema: ['problema', 'PROBLEMA', '#FF6B6B'] };
  const pillola = es => { const e = ESITI[es]; return e ? `<span class="esito ${e[0]}">● ${e[1]}</span>` : '<span class="esito nessuno">● NESSUN CONTROLLO</span>'; };
  const reparto = id => C.reparti.find(r => r.id === id) || (C.tutti && C.tutti.id === id ? C.tutti : null);
  const agente = n => C.agenti.find(a => a.nome.toLowerCase() === String(n || '').toLowerCase());
  const coppia = r => r.tipo === 'tutti' ? 'Tutta la classe' : r.agenti.map(a => a.nome).join(' e ');
  const titoloChat = r => r.tipo === 'tutti' ? 'Tutta la classe' : `${coppia(r)} (${r.nome})`;
  const coloreDi = n => { const a = agente(n); return a ? reparto(a.reparto).colore : '#F5C451'; };
  const FONTI = { giro: 'giro', chat: 'dalla chat', sessione: 'sessione', approfondimento: 'approfondimento' };

  function disegnaClasse() {
    const aperta = memoria.leggi('tendina', matchMedia('(min-width:1000px)').matches ? '1' : '0') === '1';
    app.innerHTML = `
<main class="pagina">
  <header class="testa">
    <div class="barra"><span class="occhiello">Pro Farmer · La Classe</span><button class="esci" id="esci">Esci</button></div>
    <div class="titolo-riga"><h1>${esc(C.progetto.nome)}</h1><p class="giro" id="ultimo-giro">Leggo l’ultimo giro di controllo…</p></div>
  </header>
  <section class="palco${aperta ? ' con-tendina' : ''}" id="palco" aria-label="L’ufficio della classe">
    <div class="mappa">
      <svg id="ufficio" role="img" aria-label="Mappa dei reparti con la cattedra al centro: tocca un reparto per scrivere alla sua coppia"></svg>
      <button type="button" class="apri-tendina" id="apri-tendina" aria-expanded="${aperta}" aria-controls="tendina">${ICONA.gruppo}<span>Tra di loro</span><b id="nuove-note" hidden></b></button>
      <div class="legenda" id="legenda" role="group" aria-label="Reparti: tocca per scrivere alla coppia"></div>
    </div>
    <aside class="tendina" id="tendina" aria-label="Cosa si dicono gli agenti tra di loro"${aperta ? '' : ' hidden'}>
      <div class="tendina-testa"><span class="avatar gruppo piccolo">${ICONA.gruppo}</span><div><b>Tra di loro</b><span>le note che gli agenti si passano</span></div>
        <button type="button" class="chiudi-tendina" id="chiudi-tendina" aria-label="Chiudi la tendina">×</button></div>
      <div class="tendina-note" id="tendina-note" aria-live="polite"></div>
      <p class="tendina-piede">Scrivono gli agenti: nelle chat, nei giri delle 7 e delle 14, negli approfondimenti e dalle sessioni di lavoro.</p>
    </aside>
  </section>
  <section class="chat-sezione" id="chat" aria-label="Le chat">
    <div class="sezione-testa"><h2>Chat</h2><p>Scrivi a <b>Tutta la classe</b> se non sai a chi chiedere: risponde la coppia giusta e si presenta. Oppure apri la chat della coppia, con l’argomento tra parentesi. Per un lavoro più lungo c’è <b>Approfondisci</b> (la lente): risposta entro un’ora.</p></div>
    <div class="wa" id="wa"><div class="wa-lista"><div class="wa-lista-testa">Chat <span id="wa-conta"></span></div><div class="wa-voci" id="wa-voci" role="list"></div></div><div class="wa-conv" id="wa-conv" aria-live="polite"></div></div>
  </section>
  <details class="come">
    <summary>Come lavora la classe</summary>
    <ol>
      <li><b>Rispondono in chat.</b> Ogni coppia legge i dati veri del suo reparto, cerca sul web e lascia note ai colleghi. Da qui non cambia niente.</li>
      <li><b>Tutta la classe.</b> Se non sai a chi chiedere, scrivi lì: la classe sceglie la coppia, che si presenta e ti dice dove continuare.</li>
      <li><b>Approfondiscono ogni ora.</b> Le domande con «Approfondisci» le lavora una sessione completa, con il codice, il database e i connettori.</li>
      <li><b>Controllano due volte al giorno.</b> Il giro delle 7 e delle 14 scrive lo stato dei reparti e le note tra agenti.</li>
      <li><b>Il via è sempre tuo.</b> Le modifiche a siti, database e social si fanno nelle sessioni di lavoro, col tuo ok.</li>
    </ol>
  </details>
</main>`;
    document.getElementById('esci').addEventListener('click', esci);
    disegnaMappa();
    const leg = document.getElementById('legenda');
    leg.innerHTML = C.reparti.map(r => `<button type="button" data-id="${esc(r.id)}" style="--c:${r.colore}"><span class="pallino"></span>${esc(r.nome)}</button>`).join('');
    leg.addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) scegli(b.dataset.id); });
    document.getElementById('apri-tendina').addEventListener('click', () => tendina(!document.getElementById('palco').classList.contains('con-tendina')));
    document.getElementById('chiudi-tendina').addEventListener('click', () => tendina(false));
    document.getElementById('wa-voci').addEventListener('click', ev => { const b = ev.target.closest('[data-chat]'); if (b) apriChat(b.dataset.chat, false); });
    document.getElementById('wa-conv').addEventListener('click', clicConv);
    disegnaTendina(false);
    disegnaLista(); disegnaConv();
  }

  function tendina(apri) {
    const palco = document.getElementById('palco'), t = document.getElementById('tendina'), b = document.getElementById('apri-tendina');
    palco.classList.toggle('con-tendina', apri); t.hidden = !apri; b.setAttribute('aria-expanded', apri);
    memoria.scrivi('tendina', apri ? '1' : '0');
    if (apri) { document.getElementById('nuove-note').hidden = true; const box = document.getElementById('tendina-note'); box.scrollTop = box.scrollHeight; }
  }
  function disegnaTendina(novita) {
    const box = document.getElementById('tendina-note'); if (!box) return;
    const inFondo = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    let h = '', giorno = '';
    C.note.slice(-80).forEach(n => {
      const g = giornoDi(n.creato_il);
      if (g && g !== giorno) { h += `<div class="giorno">${esc(g)}</div>`; giorno = g; }
      h += `<div class="nota"><div class="nota-testa"><b style="color:${coloreDi(n.da)}">${esc(n.da)}</b><span class="a">→ ${esc(n.a)}</span><span class="quando">${esc(soloOra(n.creato_il))}</span></div>`
        + `<p>${testoAgente(n.testo)}</p><span class="fonte">${esc(FONTI[n.fonte] || '')}</span></div>`;
    });
    box.innerHTML = h || '<p class="vuoto">Ancora nessuna nota tra gli agenti.</p>';
    if (inFondo || !novita) box.scrollTop = box.scrollHeight;
    if (novita && document.getElementById('tendina').hidden) { const b = document.getElementById('nuove-note'); b.hidden = false; b.textContent = 'nuove'; }
  }

  // un reparto (sulla mappa o nella legenda): si apre la chat della sua coppia
  function scegli(id) { if (reparto(id)) apriChat(id, true); }
  function evidenzia(id) {
    Object.entries(isole).forEach(([k, g]) => g.classList.toggle('scelta', k === id));
    document.querySelectorAll('#legenda button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id));
  }
  function controlloHtml(id) {
    const st = C.stato[id];
    if (!st) return '<div class="controllo"><h3>Ultimo controllo ' + pillola() + '</h3><p class="vuoto">Questo reparto non è ancora stato controllato: il giro passa alle 7 e alle 14.</p></div>';
    const punti = Array.isArray(st.punti) ? st.punti : [], prop = Array.isArray(st.proposte) ? st.proposte : [];
    return `<div class="controllo"><h3>Ultimo controllo ${pillola(st.esito)} <span class="dove">${esc(ora(st.controllato_il))}</span></h3>`
      + (st.riassunto ? `<p class="vuoto">${esc(st.riassunto)}</p>` : '')
      + (punti.length ? '<ul>' + punti.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '')
      + (prop.length ? '<div class="proposte"><p>Da decidere con te</p><ul>' + prop.map(x => `<li>${esc(x)}</li>`).join('') + '</ul></div>' : '')
      + '</div>';
  }
  function disegnaStati() {
    const g = C.giro, box = document.getElementById('ultimo-giro');
    if (box) box.innerHTML = g ? `Ultimo giro ${esc(ora(g.quando))} ${pillola(g.esito)}${g.riassunto ? ' <span>' + esc(g.riassunto) + '</span>' : ''}` : 'Nessun giro di controllo ancora: passa alle 7 e alle 14.';
    C.reparti.forEach(r => {
      if (!r.statoTesto) return;
      const st = C.stato[r.id], e = st && ESITI[st.esito];
      r.statoTesto.textContent = e ? `${e[1]} · ${ora(st.controllato_il)}` : `${r.agenti.length} AGENTI · IN ATTESA DEL GIRO`;
      r.statoTesto.setAttribute('fill', e ? e[2] : '#97A6B8');
      if (r.cartello) r.cartello.setAttribute('stroke', e ? e[2] : r.colore);
    });
  }

  // ── la mappa dell'ufficio ────────────────────────────────────────────────
  let isole = {};
  function disegnaMappa() {
    const NS = 'http://www.w3.org/2000/svg';
    const S = 24, C30 = Math.cos(Math.PI / 6), R = 11.5, TOP = 0.7;
    const iso = (x, y, z = 0) => [(x - y) * C30 * S, (x + y) * 0.5 * S - z * S];
    const pt = p => p.map(v => v.toFixed(1)).join(',');
    const el = (nome, attr = {}, testo) => { const e = document.createElementNS(NS, nome); for (const k in attr) e.setAttribute(k, attr[k]); if (testo != null) e.textContent = testo; return e; };
    const poli = (punti, attr) => el('polygon', { points: punti.map(pt).join(' '), ...attr });
    const svg = document.getElementById('ufficio');
    const strati = { fondo: el('g'), fili: el('g'), luci: el('g'), isole: el('g') };
    Object.values(strati).forEach(g => svg.appendChild(g));
    const n = C.reparti.length || 1;
    C.reparti.forEach((r, i) => { const a = -Math.PI * 0.75 + i * 2 * Math.PI / n; r.x = Math.cos(a) * R; r.y = Math.sin(a) * R; });
    const centroAlto = r => iso(r.x, r.y, TOP);
    for (let k = -18; k <= 18; k += 3) {
      strati.fondo.appendChild(el('line', { x1: iso(k, -18)[0], y1: iso(k, -18)[1], x2: iso(k, 18)[0], y2: iso(k, 18)[1], stroke: '#1B2533', 'stroke-width': 1 }));
      strati.fondo.appendChild(el('line', { x1: iso(-18, k)[0], y1: iso(-18, k)[1], x2: iso(18, k)[0], y2: iso(18, k)[1], stroke: '#1B2533', 'stroke-width': 1 }));
    }
    C.collegamenti.forEach(({ a, b }) => {
      const A = reparto(a), B = reparto(b); if (!A || !B) return;
      const p = centroAlto(A), q = centroAlto(B);
      strati.fili.appendChild(el('path', { d: `M${pt(p)} Q${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2 - 40).toFixed(1)} ${pt(q)}`, fill: 'none', stroke: '#5D6B7D', 'stroke-width': 1.4, 'stroke-dasharray': '4 8', class: 'filo', opacity: .8 }));
    });
    const cattedra = iso(0, 0, TOP + 0.2);
    C.reparti.forEach((r, i) => {
      const d = `M${pt(centroAlto(r))} L${pt(cattedra)}`;
      strati.fili.appendChild(el('path', { d, stroke: '#2E3B4D', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }));
      strati.fili.appendChild(el('path', { d, stroke: r.colore, 'stroke-width': 1.6, opacity: .75, fill: 'none' }));
      if (!movimento) return;
      [0, 1].forEach(j => {
        const c = el('circle', { r: 4, fill: j ? '#F5C451' : r.colore });
        c.appendChild(el('animateMotion', { dur: (2.6 + (i % 3) * 0.5) + 's', repeatCount: 'indefinite', path: d, begin: (j * 1.3 + i * 0.2) + 's', ...(j ? { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' } : {}) }));
        strati.luci.appendChild(c);
      });
    });
    function blocco(g, x, y, w, h, z0, z1, colTop, colLato, attrTop = {}) {
      const x0 = x - w / 2, x1 = x + w / 2, y0 = y - h / 2, y1 = y + h / 2;
      g.appendChild(poli([iso(x0, y1, z1), iso(x1, y1, z1), iso(x1, y1, z0), iso(x0, y1, z0)], { fill: colLato, opacity: .95 }));
      g.appendChild(poli([iso(x1, y0, z1), iso(x1, y1, z1), iso(x1, y1, z0), iso(x1, y0, z0)], { fill: colLato, opacity: .75 }));
      g.appendChild(poli([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], { fill: colTop, ...attrTop }));
    }
    const gc = el('g');
    gc.appendChild(el('ellipse', { cx: cattedra[0], cy: cattedra[1] + 6, rx: 92, ry: 46, fill: '#F5C451', opacity: .18, class: 'respiro' }));
    blocco(gc, 0, 0, 5, 5, 0, TOP, '#2A2416', '#5E4A1A', { stroke: '#F5C451', 'stroke-width': 1.5 });
    blocco(gc, 0, -0.3, 2.4, 1.2, TOP, TOP + 0.55, '#C9A24A', '#7A6127');
    const tc = iso(0, 0, TOP + 3.2);
    gc.appendChild(el('rect', { x: tc[0] - 96, y: tc[1] - 26, width: 192, height: 44, rx: 8, fill: '#0E141C', stroke: '#F5C451', 'stroke-width': 1.2 }));
    gc.appendChild(el('text', { x: tc[0], y: tc[1] - 6, 'text-anchor': 'middle', class: 'cattedra-t' }, 'CATTEDRA · GIULIO'));
    gc.appendChild(el('text', { x: tc[0], y: tc[1] + 10, 'text-anchor': 'middle', class: 'cattedra-s' }, 'decide e dà il via'));
    gc.appendChild(el('line', { x1: tc[0], y1: tc[1] + 18, x2: cattedra[0], y2: cattedra[1] - 14, stroke: '#F5C451', 'stroke-width': 1, opacity: .6 }));
    isole = {};
    [...C.reparti, { id: '__cattedra', x: 0, y: 0 }].sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(r => {
      if (r.id === '__cattedra') { strati.isole.appendChild(gc); return; }
      const g = el('g', { class: 'isola', tabindex: 0, role: 'button', 'aria-label': `Reparto ${r.nome}: ${coppia(r)}` });
      blocco(g, r.x, r.y, 6.4, 4.4, 0, TOP, r.colore + '33', r.lato, { stroke: r.colore, 'stroke-width': 1.3, class: 'piano' });
      r.agenti.slice(0, 2).forEach((a, k) => {
        const dx = r.x - 1.5 + k * 3, dy = r.y + 0.2, z = TOP + 0.45;
        blocco(g, dx, dy, 1.9, 1.1, TOP, z, '#E9EEF4', '#8C99A8');
        g.appendChild(poli([iso(dx - 0.6, dy - 0.35, z), iso(dx + 0.6, dy - 0.35, z), iso(dx + 0.6, dy - 0.35, z + 0.85), iso(dx - 0.6, dy - 0.35, z + 0.85)], { fill: '#0E141C', stroke: r.colore, 'stroke-width': 1 }));
        const sc = iso(dx, dy - 0.35, z + 0.42);
        g.appendChild(el('rect', { x: sc[0] - 9, y: sc[1] - 4, width: 18, height: 2.2, rx: 1, fill: r.colore, opacity: .9 }));
        const testa = iso(dx, dy + 1, TOP + 0.9);
        g.appendChild(el('ellipse', { cx: testa[0], cy: testa[1] + 9, rx: 7, ry: 5, fill: r.lato }));
        g.appendChild(el('circle', { cx: testa[0], cy: testa[1], r: 5, fill: '#F0D2B4' }));
        const nm = iso(dx, dy - 0.35, z + 1.6), larg = a.nome.length * 8.4 + 14;
        g.appendChild(el('rect', { x: nm[0] - larg / 2, y: nm[1] - 13, width: larg, height: 19, rx: 4, fill: '#0E141C', stroke: r.colore, 'stroke-width': .8 }));
        g.appendChild(el('text', { x: nm[0], y: nm[1] + 1, 'text-anchor': 'middle', class: 'nome-ag' }, a.nome));
      });
      const titolo = r.nome.toUpperCase(), lw = Math.max(titolo.length * 10.5 + 34, 236);
      const sopra = iso(r.x, r.y - 2.2, TOP + 4.6), cx0 = sopra[0] - lw / 2, cy0 = sopra[1];
      r.cartello = el('rect', { x: cx0, y: cy0 - 22, width: lw, height: 42, rx: 7, fill: '#0E141C', stroke: r.colore, 'stroke-opacity': .6 });
      g.appendChild(r.cartello);
      g.appendChild(el('circle', { cx: cx0 + 14, cy: cy0 - 6, r: 4.5, fill: r.colore }));
      g.appendChild(el('text', { x: cx0 + 25, y: cy0 - 1, class: 'etichetta-rep', fill: '#fff' }, titolo));
      r.statoTesto = el('text', { x: cx0 + 13, y: cy0 + 14, class: 'sotto-rep', fill: '#97A6B8' }, `${r.agenti.length} AGENTI · IN ATTESA DEL GIRO`);
      g.appendChild(r.statoTesto);
      g.addEventListener('click', () => scegli(r.id));
      g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); scegli(r.id); } });
      isole[r.id] = g;
      strati.isole.appendChild(g);
    });
    const bb = strati.isole.getBBox();
    svg.setAttribute('viewBox', `${(bb.x - 16).toFixed(0)} ${(bb.y - 12).toFixed(0)} ${(bb.width + 32).toFixed(0)} ${(bb.height + 24).toFixed(0)}`);
  }

  // ── dettatura a voce ─────────────────────────────────────────────────────
  // Usa il riconoscimento vocale del browser (Safari su iPhone, Chrome): la voce la trascrivono
  // Apple o Google, come per la dettatura della tastiera; qui arriva solo il testo, che si rilegge
  // nel campo e si manda con Invia. Nessun audio viene salvato. Se il browser non lo sa fare,
  // il pulsante non compare (resta il microfono della tastiera del telefono).
  const Dettato = (() => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    const d = { supportato: !!R, attivo: false, parti, ferma };
    let rec = null, base = '';
    function campo() { return document.getElementById('wa-testo'); }
    function aggiornaPulsante() {
      const b = document.querySelector('[data-detta]'); if (!b) return;
      b.classList.toggle('attivo', d.attivo); b.setAttribute('aria-pressed', d.attivo);
      b.setAttribute('aria-label', d.attivo ? 'Ferma la dettatura' : 'Detta il messaggio a voce');
      const ta = campo(); if (ta) ta.placeholder = d.attivo ? 'Parla: il testo compare qui…' : ta.dataset.segnaposto || ta.placeholder;
    }
    function parti() {
      if (!R || d.attivo) return;
      const ta = campo(); if (!ta) return;
      ta.dataset.segnaposto = ta.dataset.segnaposto || ta.placeholder;
      base = ta.value ? ta.value.replace(/\s*$/, ' ') : '';
      try { rec = new R(); } catch (_) { mostraErrore('La dettatura non è disponibile in questo browser: usa il microfono della tastiera.'); return; }
      rec.lang = 'it-IT'; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
      rec.onresult = ev => {
        let finale = '', provvisorio = '';
        for (let i = 0; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) finale += t; else provvisorio += t;
        }
        const t = campo(); if (!t) return;
        t.value = (base + finale + provvisorio).slice(0, 4000);
        t.dispatchEvent(new Event('input'));
      };
      rec.onerror = ev => {
        const m = { 'not-allowed': 'Per dettare consenti il microfono al sito (impostazioni del browser).', 'service-not-allowed': 'Per dettare consenti il microfono al sito (impostazioni del browser).',
                    'no-speech': 'Non ho sentito niente: riprova.', 'audio-capture': 'Non trovo il microfono.', 'network': 'La dettatura ha bisogno della rete.' }[ev.error];
        if (m) mostraErrore(m);
      };
      rec.onend = () => { d.attivo = false; rec = null; aggiornaPulsante(); const t = campo(); if (t) t.value = t.value.replace(/\s+$/, ''); };
      try { rec.start(); d.attivo = true; mostraErrore(''); aggiornaPulsante(); ta.focus(); }
      catch (_) { d.attivo = false; mostraErrore('Non riesco ad avviare la dettatura: riprova.'); }
    }
    function ferma() { if (rec) { try { rec.stop(); } catch (_) {} } d.attivo = false; aggiornaPulsante(); }
    return d;
  })();

  // ── le chat ──────────────────────────────────────────────────────────────
  const avatarCoppia = r => r.tipo === 'tutti'
    ? `<span class="avatar tutti">${ICONA.gruppo}</span>`
    : `<span class="avatar" style="background:${r.colore};font-size:14px">${esc(r.agenti.map(a => a.nome[0]).join(''))}</span>`;
  function voce(r) {
    const l = (C.conv[r.id] || []).filter(m => !scrivendo(m)), m = l[l.length - 1];
    const scrive = (C.conv[r.id] || []).some(scrivendo);
    const sotto = r.tipo === 'tutti' ? 'Non sai a chi chiedere? Scrivi qui' : r.agenti.map(a => a.ruolo).join(' e ');
    return `<button type="button" class="wa-voce${r.tipo === 'tutti' ? ' wa-voce-tutti' : ''}" role="listitem" data-chat="${esc(r.id)}"${C.aperta === r.id ? ' aria-current="true"' : ''}>`
      + avatarCoppia(r) + `<span style="min-width:0"><span class="nome" style="display:block">${r.tipo === 'tutti' ? 'Tutta la classe' : `${esc(coppia(r))} <span class="ruolo">(${esc(r.nome)})</span>`}</span>`
      + `<span class="anteprima" style="display:block">${scrive ? 'stanno scrivendo…' : m ? esc((m.chi === 'tu' ? 'Tu' : m.chi === 'classe' ? 'Classe' : m.chi) + ': ' + m.testo) : esc(sotto)}</span></span>`
      + `<span class="ora">${m ? esc(quandoBreve(m.creato_il)) : ''}</span></button>`;
  }
  function disegnaLista() {
    const box = document.getElementById('wa-voci'); if (!box) return;
    box.innerHTML = (C.tutti ? voce(C.tutti) : '') + C.reparti.map(voce).join('');
    document.getElementById('wa-conta').textContent = C.reparti.length + ' coppie';
  }
  function bolleConGiorni(lista, bolla) {
    let h = '', giorno = '';
    lista.forEach(m => { const g = giornoDi(m.creato_il); if (g && g !== giorno) { h += `<div class="giorno">${esc(g)}</div>`; giorno = g; } h += bolla(m); });
    return h;
  }
  function bollaMessaggio(m) {
    if (m.chi === 'tu') return `<div class="bolla out">${esc(m.testo)}<span class="meta">${m.tipo === 'approfondimento' ? '<span class="fonte">approfondisci</span>' : ''}${esc(soloOra(m.creato_il))}</span></div>`;
    if (m.tipo === 'avviso') return `<div class="bolla avviso-bolla">${esc(m.testo)}</div>`;
    if (m.stato === 'in_corso' && !scrivendo(m)) return `<div class="bolla in errore-bolla">La risposta non è arrivata. Riprova.<span class="meta">${esc(soloOra(m.creato_il))}</span></div>`;
    if (m.stato === 'in_corso') return '<div class="bolla in scrive"><span class="puntini" aria-label="stanno scrivendo"><i></i><i></i><i></i></span></div>';
    if (m.stato === 'errore') return `<div class="bolla in errore-bolla">${esc(m.testo)}<span class="meta">${esc(soloOra(m.creato_il))}</span></div>`;
    const a = agente(m.chi), rep = a && reparto(a.reparto);
    const etichetta = C.aperta && reparto(C.aperta) && reparto(C.aperta).tipo === 'tutti' && rep ? ` <span class="a">· ${esc(rep.nome)}</span>` : '';
    return `<div class="bolla in"><span class="mitt" style="color:${coloreDi(m.chi)}">${esc(m.chi)}${etichetta}</span>${testoAgente(m.testo)}`
      + `<span class="meta">${m.tipo === 'approfondimento' ? '<span class="fonte">approfondimento</span>' : ''}${esc(soloOra(m.creato_il))}</span></div>`;
  }
  function schedaReparto(r) {
    if (r.tipo === 'tutti') return `<div class="avviso">Scrivi a tutti e dodici: la classe sceglie la coppia giusta, che si presenta con l’argomento tra parentesi e ti dice in quale chat continuare.</div>`;
    return `<details class="scheda-rep" style="--c:${r.colore}"><summary>${pillola((C.stato[r.id] || {}).esito)} Chi sono e ultimo controllo</summary>`
      + r.agenti.map(a => `<div class="agente"><h3>${esc(a.nome)} <span>${esc(a.ruolo)}</span></h3><p>${esc(a.compito)}</p><p><span class="lbl">Tiene d'occhio</span>${esc(a.occhio)}</p></div>`).join('')
      + `<p class="dove">${esc(r.dove)}</p>` + controlloHtml(r.id) + '</details>';
  }
  function disegnaConv() {
    const wa = document.getElementById('wa'), box = document.getElementById('wa-conv'); if (!box) return;
    if (!C.aperta) { wa.classList.remove('aperta'); box.innerHTML = '<div class="wa-msg"><div class="avviso">Scegli una chat a sinistra.</div></div>'; return; }
    wa.classList.add('aperta');
    const vecchio = box.querySelector('.wa-msg');
    const inFondo = !vecchio || vecchio.scrollHeight - vecchio.scrollTop - vecchio.clientHeight < 80;
    const schedaAperta = !!box.querySelector('details.scheda-rep[open]');
    const ta0 = box.querySelector('textarea'), bozza = ta0 ? ta0.value : '', fuoco = ta0 && document.activeElement === ta0;
    const r = reparto(C.aperta), lista = C.conv[r.id] || [];
    const scrivono = lista.some(scrivendo);
    box.innerHTML = `<div class="wa-conv-testa"><button type="button" class="indietro" aria-label="Torna alle chat">${ICONA.indietro}</button>`
      + avatarCoppia(r) + `<span class="chi"><b>${esc(titoloChat(r))}</b><span>${r.tipo === 'tutti' ? esc(C.agenti.map(a => a.nome).join(', ')) : esc(r.agenti.map(a => a.nome + ': ' + a.ruolo).join(' · '))}</span></span>`
      + (lista.length ? '<button type="button" class="svuota" data-svuota>Svuota la chat</button>' : '') + '</div>'
      + '<div class="wa-msg">' + schedaReparto(r) + bolleConGiorni(lista, bollaMessaggio) + '</div>'
      + '<p class="wa-errore" id="wa-errore" hidden></p>'
      + `<form class="wa-scrivi" id="wa-form"><textarea id="wa-testo" rows="1" maxlength="4000" placeholder="${r.tipo === 'tutti' ? 'Scrivi a tutta la classe' : 'Scrivi a ' + esc(coppia(r))}" aria-label="Messaggio per ${esc(titoloChat(r))}"></textarea>`
      + `<div class="wa-azioni">${Dettato.supportato ? `<button type="button" class="detta${Dettato.attivo ? ' attivo' : ''}" data-detta aria-pressed="${Dettato.attivo}" aria-label="${Dettato.attivo ? 'Ferma la dettatura' : 'Detta il messaggio a voce'}" title="${Dettato.attivo ? 'Ferma la dettatura' : 'Detta a voce: parla, poi rileggi e invia'}">${ICONA.mic}</button>` : ''}<button type="submit" class="invia" aria-label="Invia"${scrivono || C.invio ? ' disabled' : ''}>${ICONA.invia}</button>`
      + `<button type="button" class="approfondisci" data-approfondisci aria-label="Approfondisci: risposta entro un’ora con tutti gli strumenti" title="Approfondisci: risposta entro un’ora con tutti gli strumenti"${C.invio ? ' disabled' : ''}>${ICONA.approfondisci}</button></div></form>`;
    if (schedaAperta) { const d = box.querySelector('details.scheda-rep'); if (d) d.open = true; }
    const msg = box.querySelector('.wa-msg');
    if (inFondo) msg.scrollTop = msg.scrollHeight;
    const ta = box.querySelector('textarea');
    ta.value = bozza;
    const alza = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; };
    alza(); if (fuoco) ta.focus();
    ta.addEventListener('input', alza);
    ta.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); box.querySelector('#wa-form').requestSubmit(); } });
    box.querySelector('#wa-form').addEventListener('submit', ev => { ev.preventDefault(); manda('scrivi'); });
  }
  function mostraErrore(t) { const p = document.getElementById('wa-errore'); if (p) { p.textContent = t; p.hidden = !t; } }
  async function manda(azione) {
    const ta = document.getElementById('wa-testo'); if (!ta || C.invio) return;
    if (Dettato.attivo) Dettato.ferma();
    const testo = ta.value.trim();
    if (!testo) { mostraErrore(azione === 'approfondisci' ? 'Scrivi prima la domanda da approfondire.' : ''); return; }
    const rep = C.aperta;
    C.invio = true; mostraErrore('');
    document.querySelectorAll('#wa-form button').forEach(b => { b.disabled = true; });
    try {
      await chiama({ azione, progetto: C.progetto.id, reparto: rep, testo });
      ta.value = '';
      C.invio = false;
      await aggiornaChat(); disegnaConv(); giro();
    } catch (e) {
      C.invio = false; disegnaConv(); mostraErrore(e.message);
    }
  }
  async function clicConv(ev) {
    const link = ev.target.closest('a[data-esterno]');
    if (link) { if (!confirm('Apro questo indirizzo?\n\n' + link.href)) ev.preventDefault(); return; }
    if (ev.target.closest('.indietro')) { C.aperta = null; evidenzia(null); disegnaLista(); disegnaConv(); document.getElementById('wa').scrollIntoView({ block: 'nearest' }); return; }
    if (ev.target.closest('[data-approfondisci]')) { manda('approfondisci'); return; }
    if (ev.target.closest('[data-detta]')) { Dettato.attivo ? Dettato.ferma() : Dettato.parti(); return; }
    if (ev.target.closest('[data-svuota]') && C.aperta) {
      const r = reparto(C.aperta);
      if (!confirm(`Cancello la conversazione con ${titoloChat(r)}? Non si può tornare indietro.`)) return;
      try { await chiama({ azione: 'svuota', progetto: C.progetto.id, reparto: r.id }); await aggiornaChat(); disegnaConv(); }
      catch (e) { mostraErrore(e.message); }
    }
  }
  function apriChat(id, scorri) {
    if (Dettato.attivo) Dettato.ferma();
    C.aperta = reparto(id) ? id : null;
    evidenzia(C.aperta);
    disegnaLista(); disegnaConv();
    if (scorri) document.getElementById('chat').scrollIntoView({ behavior: movimento ? 'smooth' : 'auto', block: 'start' });
    const ta = document.getElementById('wa-testo'); if (ta && matchMedia('(pointer:fine)').matches) ta.focus();
  }

  // ── avvio ────────────────────────────────────────────────────────────────
  sb.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') { C = null; fermaGiri(); } });
  (async () => {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return mostraAccesso();
      await dopoAccesso();
    } catch (_) { mostraAccesso(); }
  })();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
