const fs = require('fs');
let a = fs.readFileSync('public/app.js', 'utf8');
a = a.replace(/\r\n/g, '\n');

// Fix invalid left-hand side - can't use ?. on left of =
a = a.replace(
  `$('#settingsForm [name="hero_title"]')?.value = settings.hero_title || '';`,
  `const _ht = $('#settingsForm [name="hero_title"]'); if(_ht) _ht.value = settings.hero_title || '';`
);
a = a.replace(
  `$('#settingsForm [name="hero_subtitle"]')?.value = settings.hero_subtitle || '';`,
  `const _hs = $('#settingsForm [name="hero_subtitle"]'); if(_hs) _hs.value = settings.hero_subtitle || '';`
);
a = a.replace(
  `$('#settingsForm [name="about_text"]')?.value = settings.about_text || '';`,
  `const _at = $('#settingsForm [name="about_text"]'); if(_at) _at.value = settings.about_text || '';`
);

fs.writeFileSync('public/app.js', a);

// verify no syntax errors
try {
  require('vm').runInNewContext(a);
} catch(e) {
  if (e instanceof SyntaxError) console.log('⚠️  Still has syntax error:', e.message);
  else console.log('✅ No syntax errors (runtime errors are ok)');
} 
console.log('done!');