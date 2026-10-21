const fs = require('fs');

const content = fs.readFileSync('qa/LEDGER.csv', 'utf8');
const lines = content.split('\n').filter(l => l.trim().length > 0);

console.log('Total lines (including header):', lines.length);

const phases = {};
let totalPass = 0, totalFail = 0, totalNotRun = 0, totalBlocked = 0;

for (let i = 1; i < lines.length; i++) {
  // Parse CSV line properly handling escaped quotes
  const line = lines[i];
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      if (inQuotes && line[j + 1] === '"') {
        current += '"';
        j++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);

  if (fields.length < 8) continue;

  const id = fields[0];
  const phase = fields[1];
  const status = fields[7];

  if (!phases[phase]) {
    phases[phase] = { PASS: 0, FAIL: 0, NOT_RUN: 0, BLOCKED: 0, total: 0 };
  }

  phases[phase][status] = (phases[phase][status] || 0) + 1;
  phases[phase].total++;

  if (status === 'PASS') totalPass++;
  else if (status === 'FAIL') totalFail++;
  else if (status === 'NOT_RUN') totalNotRun++;
  else if (status === 'BLOCKED') totalBlocked++;
}

console.log('Breakdown by phase:');
console.log(JSON.stringify(phases, null, 2));

console.log('Grand Totals:', {
  totalPass,
  totalFail,
  totalNotRun,
  totalBlocked,
  grandTotal: totalPass + totalFail + totalNotRun + totalBlocked
});

console.log('\n--- ALL FAIL ROWS ---');
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      if (inQuotes && line[j + 1] === '"') { current += '"'; j++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else { current += char; }
  }
  fields.push(current);
  if (fields[7] === 'FAIL') {
    console.log(`[${fields[0]}] ${fields[1]}: ${fields[4]} -> OBSERVED: ${fields[6]}`);
  }
}
