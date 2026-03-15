const fs=require('fs');
const t=fs.readFileSync('src/pages/Maintenance.tsx','utf8');
const m=/['\"]([^'\"\\]*Ã[^'\"\\]*)['\"]/.exec(t);
console.log(m?m[1].slice(0,50):'none');
