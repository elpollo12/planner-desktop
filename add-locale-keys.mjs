import { readFileSync, writeFileSync } from 'fs';

const esPath = 'C:/Users/plxus/Documents/Dev/ddr-planner/planner-desktop/public/locales/es/common.json';
const enPath = 'C:/Users/plxus/Documents/Dev/ddr-planner/planner-desktop/public/locales/en/common.json';

// ES file
let es = JSON.parse(readFileSync(esPath, 'utf8'));
es.admin.forms.mustBeInteger = 'Debe ser un número entero';
es.admin.operationCodes.onlyUppercaseNumbers = 'Solo letras mayúsculas y números permitidos';
es.admin.operationCodes.orderMinZero = 'El orden debe ser 0 o mayor';
writeFileSync(esPath, JSON.stringify(es, null, 2) + '\n', 'utf8');
console.log('ES updated');

// EN file
let en = JSON.parse(readFileSync(enPath, 'utf8'));
en.admin.forms.mustBeInteger = 'Must be a whole number';
en.admin.operationCodes.onlyUppercaseNumbers = 'Only uppercase letters and numbers allowed';
en.admin.operationCodes.orderMinZero = 'Order must be 0 or greater';
writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
console.log('EN updated');
