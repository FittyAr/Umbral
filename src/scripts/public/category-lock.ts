/**
 * Desbloqueo de categorías protegidas en las páginas públicas.
 *
 * Estaba inline y duplicado byte a byte entre `index.astro` y
 * `[category].astro`: ~175 líneas, de las cuales 70 son la implementación a
 * mano de SHA-256. Como módulo se sirve una vez, minificado y cacheable, en
 * vez de dos veces en crudo dentro del HTML.
 *
 * Sobre el candado en sí: el hash esperado viaja en `data-cat-hash` y la
 * comparación es del lado del cliente, así que esto oculta enlaces de una
 * mirada casual, no protege secretos. Quien tenga el HTML puede atacar el
 * hash offline.
 *
 * SHA-256 va a mano y no con `crypto.subtle` a propósito: `crypto.subtle`
 * sólo existe en contextos seguros, y Umbral se usa mucho en una LAN por HTTP
 * plano, donde sería `undefined`.
 */

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256Sync(str: string): string {
  let result = '';
  const words: number[] = [];
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const utf8 = new TextEncoder().encode(str);
  const byteLength = utf8.length;
  for (let i = 0; i < byteLength; i++) {
    words[i >> 2] |= (utf8[i] & 0xff) << ((3 - (i % 4)) * 8);
  }
  words[byteLength >> 2] |= 0x80 << ((3 - (byteLength % 4)) * 8);
  words[(((byteLength + 8) >> 6) << 4) + 15] = byteLength * 8;

  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);

    for (let idx = 0; idx < 64; idx++) {
      const w15 = w[idx - 15];
      const w2 = w[idx - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 = (hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[idx]
        + (w[idx] = (idx < 16) ? (w[idx] || 0) : (
          ((w[idx - 16] || 0)
          + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
          + (w[idx - 7] || 0)
          + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0
        ))
      ) | 0;
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;

      hash = [(temp1 + temp2) | 0, a, hash[1], hash[2], (hash[3] + temp1) | 0, e, hash[5], hash[6]];
    }

    for (let h = 0; h < 8; h++) {
      hash[h] = (hash[h] + oldHash[h]) | 0;
    }
  }

  for (let hi = 0; hi < 8; hi++) {
    for (let bi = 3; bi >= 0; bi--) {
      const byteVal = (hash[hi] >> (8 * bi)) & 255;
      result += (byteVal < 16 ? '0' : '') + byteVal.toString(16);
    }
  }
  return result;
}

const SESSION_PREFIX = 'umbral_unlocked_';

function readSession(catId: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_PREFIX + catId) === '1';
  } catch {
    return false;
  }
}

function writeSession(catId: string, unlocked: boolean): void {
  try {
    if (unlocked) sessionStorage.setItem(SESSION_PREFIX + catId, '1');
    else sessionStorage.removeItem(SESSION_PREFIX + catId);
  } catch { /* modo privado, cuota llena: el desbloqueo dura la vista */ }
}

function parts(section: Element) {
  return {
    catId: section.getAttribute('data-cat-id') || '',
    lockBox: section.querySelector<HTMLElement>('.category-lock-box'),
    cardsWrap: section.querySelector<HTMLElement>('.category-cards-wrap'),
    lockBadge: section.querySelector<HTMLElement>('.badge-locked'),
    relockBtn: section.querySelector<HTMLElement>('.cat-relock-btn'),
    input: section.querySelector<HTMLInputElement>('.lock-input'),
    err: section.querySelector<HTMLElement>('.lock-error'),
  };
}

function unlockSection(section: Element, saveSession = true): void {
  const { catId, lockBox, cardsWrap, lockBadge, relockBtn } = parts(section);
  section.setAttribute('data-unlocked', 'true');
  if (lockBox) lockBox.style.display = 'none';
  if (cardsWrap) cardsWrap.style.display = 'block';
  if (lockBadge) lockBadge.style.display = 'none';
  if (relockBtn) relockBtn.style.display = 'inline-flex';
  if (saveSession && catId) writeSession(catId, true);
}

function relockSection(section: Element): void {
  const { catId, lockBox, cardsWrap, lockBadge, relockBtn, input, err } = parts(section);
  section.removeAttribute('data-unlocked');
  if (lockBox) lockBox.style.display = 'flex';
  if (cardsWrap) cardsWrap.style.display = 'none';
  if (lockBadge) lockBadge.style.display = 'inline-flex';
  if (relockBtn) relockBtn.style.display = 'none';
  if (input) input.value = '';
  if (err) err.style.display = 'none';
  if (catId) writeSession(catId, false);
}

/** Engancha todas las secciones bloqueadas del documento. */
export function initCategoryLocks(): void {
  const sections = document.querySelectorAll('.category-section[data-is-locked="true"]');
  if (sections.length === 0) return;

  sections.forEach((section) => {
    const expectedHash = section.getAttribute('data-cat-hash');
    const form = section.querySelector('.lock-form');
    const btn = section.querySelector('.lock-submit-btn');
    const { catId, input, err, relockBtn } = parts(section);

    if (catId && readSession(catId)) unlockSection(section, false);

    relockBtn?.addEventListener('click', () => relockSection(section));

    const handleUnlock = (e?: Event) => {
      e?.preventDefault();
      const val = input ? input.value : '';
      if (!val) {
        input?.focus();
        return;
      }
      try {
        if (sha256Sync(val) === expectedHash) {
          if (err) err.style.display = 'none';
          unlockSection(section, true);
          return;
        }
        if (err) err.style.display = 'block';
        if (input) {
          input.classList.remove('shake');
          void input.offsetWidth; // reflow: reinicia la animación
          input.classList.add('shake');
          input.focus();
          input.select();
        }
      } catch (error) {
        console.error('[umbral] Error verifying category password:', error);
      }
    };

    form?.addEventListener('submit', handleUnlock);
    btn?.addEventListener('click', handleUnlock);
  });
}
