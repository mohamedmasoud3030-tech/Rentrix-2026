const fs=require('fs');
const files=[
  'src/components/layout/AppShell.tsx',
  'src/App.tsx',
  'src/services/financeService.ts',
  'src/services/pdfService.ts',
  'src/services/googleAuth.ts',
  'src/services/whatsappService.ts',
  'vite.config.ts'
];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const arabic=(t.match(/[\u0600-\u06FF]/g)||[]).length;
  const mojibake=(t.match(/[ØÙÃ]/g)||[]).length;
  console.log(`${f}: arabic=${arabic} mojibakeMarkers=${mojibake}`);
}
