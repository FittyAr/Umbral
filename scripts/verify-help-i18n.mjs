import { helpEs } from '../src/i18n/help/es.ts';
import { helpPt } from '../src/i18n/help/pt.ts';

const esKeys = Object.keys(helpEs).sort();
const ptKeys = Object.keys(helpPt).sort();

const missingInPt = esKeys.filter((k) => !ptKeys.includes(k));
const extraInPt = ptKeys.filter((k) => !esKeys.includes(k));

console.log('helpEs keys:', esKeys.length);
console.log('helpPt keys:', ptKeys.length);

if (missingInPt.length) {
  console.error('Missing in helpPt:', missingInPt);
}
if (extraInPt.length) {
  console.error('Extra in helpPt:', extraInPt);
}

if (missingInPt.length || extraInPt.length || esKeys.length !== ptKeys.length) {
  process.exit(1);
}

console.log('OK: key sets match (' + esKeys.length + ' keys each)');
