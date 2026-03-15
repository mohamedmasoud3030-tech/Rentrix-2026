const fs=require('fs');
const glob=require('glob');
const files=glob.sync('src/**/*.{ts,tsx,js}');
const bad=[];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  if(/[ÃØÙ]/.test(t)) bad.push(f);
}
console.log('filesWithMarkers',bad.length);
console.log(bad.join('\n'));
