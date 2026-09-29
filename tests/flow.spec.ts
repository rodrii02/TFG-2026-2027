import { test, expect, Page } from '@playwright/test';
const technicalPass = 'Archivo válido para revisión técnica';
async function checked(page: Page) {
  await expect(page.getByText(technicalPass, { exact: true })).toBeVisible({ timeout: 65_000 });
  await expect(page.getByRole('button', { name: 'Analizar', exact: true })).toBeEnabled();
}
async function example(page: Page) {
  await page.goto('/inicio'); await page.getByRole('button',{name:'Comenzar análisis'}).click();
  await expect(page.getByRole('button',{name:'Analizar',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Probar con una imagen de ejemplo'}).click();
  await expect(page.getByText('ejemplo-sintetico.png')).toBeVisible();
  await checked(page);
  await expect(page.getByRole('button',{name:'Comprobar imagen'})).toHaveCount(0);
}
test('real Python flow produces a technical report while scientific interpretation remains pending', async ({page}) => {
  const external: string[]=[], errors:string[]=[];
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4200')&&!/^(blob:|data:)/.test(r.url()))external.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  await example(page);
  await expect(page).toHaveURL(/\/captura$/);
  await expect(page.getByRole('button',{name:'Analizar',exact:true})).toBeEnabled();
  await expect(page.getByText('Imagen válida',{exact:true})).toHaveCount(0);
  await page.getByText('Ver comprobaciones técnicas',{exact:true}).click();
  await expect(page.getByText('Archivo legible',{exact:true})).toBeVisible();
  await expect(page.locator('.photo-stage img')).toBeVisible();
  await page.screenshot({path:'docs/screenshots/mfs-web-review.png',fullPage:true});
  await page.getByRole('button',{name:'Analizar',exact:true}).click();
  await expect(page).toHaveURL(/\/resultados$/);
  await expect(page.getByRole('heading',{name:'Revisión técnica completada',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Pendiente de calibración',exact:true})).toBeVisible();
  await expect(page.getByText('Recorrido con una imagen sintética. No es una detección real.')).toBeVisible();
  await page.getByRole('button',{name:'Nuevo análisis',exact:true}).click();
  await expect(page).toHaveURL(/\/inicio$/);
  expect(external).toEqual([]);expect(errors).toEqual([]);
});
test('real input rejects invalid files and recovers automatically', async ({page}) => {
  await page.goto('/captura');const input=page.locator('input[type=file]');
  for (const [name,buffer,detail] of [
    ['fake.jpg',Buffer.from('<svg>fake</svg>'),'Formato no compatible'],
    ['broken.png',Buffer.from([137,80,78,71,13,10,26,10,0,0]),'No se ha podido abrir'],
    ['large.png',Buffer.alloc(20*1024*1024+1),'20 MB'],
  ] as const) {
    await input.setInputFiles({name,mimeType:'image/png',buffer});
    await expect(page.getByText('No hemos podido validar la imagen. Vuelve a hacer la foto o elige otra imagen',{exact:true})).toBeVisible();
    await expect(page.locator('.validation-detail')).toContainText(detail);
    await expect(page.getByRole('button',{name:'Analizar',exact:true})).toBeDisabled();
  }
  await input.setInputFiles('src/assets/example-matrix.png');
  await checked(page);
  await expect(page.locator('.validation-tips')).toHaveCount(0);
});
test('technical decoder failure offers retry and never claims validity', async ({page}) => {
  await page.addInitScript(()=>{
    const decode=window.createImageBitmap.bind(window); let failed=false;
    window.createImageBitmap=(...args: Parameters<typeof createImageBitmap>)=>{
      if(!failed){failed=true;return Promise.reject(new Error('test graphics unavailable'));}
      return decode(...args);
    };
  });
  await page.goto('/captura');await page.locator('input[type=file]').setInputFiles('src/assets/example-matrix.png');
  await expect(page.getByText('No se ha podido comprobar la imagen. Inténtalo de nuevo',{exact:true})).toBeVisible();
  await expect(page.getByText('Imagen válida',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Reintentar comprobación'}).click();
  await checked(page);
});
test('routes cannot bypass validation; reload clears the photograph', async ({page}) => {
  for(const route of ['/resultados','/revision']){await page.goto(route);await expect(page).toHaveURL(/\/captura$/);}
  await example(page);await page.reload();
  await expect(page.getByRole('heading',{name:'Aquí verás tu imagen'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Analizar',exact:true})).toBeDisabled();
});
test('cancelled system picker preserves the current image and permits retry', async ({page}) => {
  await example(page);
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Elegir otra imagen'}).click();await chooser;
  // Playwright has no native picker cancel API: dispatch the browser cancel event explicitly.
  await page.locator('input[type=file]').dispatchEvent('cancel');
  await expect(page.getByText('Selección cancelada. Puedes elegir otra imagen cuando quieras.')).toBeVisible();
  await expect(page.getByText('ejemplo-sintetico.png')).toBeVisible();
  await expect(page.getByRole('button',{name:'Elegir otra imagen'})).toBeEnabled();
});
test('large image is reduced and JPEG EXIF orientation is retained', async ({page}) => {
  await page.goto('/captura');
  // Static generated fixtures; dimensions are resource cases, not matrix quality criteria.
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/large.jpg');
  await expect(page.locator('figcaption')).toContainText('2048 × 1024');
  await expect(page.locator('figcaption')).toContainText('Imagen reducida');
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/rotated.jpg');
  await expect(page.locator('figcaption')).toContainText('800 × 1200');
  await checked(page);
});
test('old WebView fallback refuses a large decode and accepts a smaller copy', async ({page}) => {
  await page.addInitScript(()=>Object.defineProperty(window,'createImageBitmap',{value:undefined,configurable:true}));
  await page.goto('/captura');await page.locator('input[type=file]').setInputFiles('tests/fixtures/large.jpg');
  await expect(page.locator('.validation-detail')).toContainText('2048');
  await page.locator('input[type=file]').setInputFiles('src/assets/example-matrix.png');
  await checked(page);
});
test('all three themes persist and the exact supplied SVG is loaded', async ({page}) => {
  await page.goto('/inicio');
  await expect(page.getByRole('link',{name:'MicroFoodScan, inicio'}).first()).toBeVisible();
  await expect(page.locator('.sidebar .brand-logo')).toHaveAttribute('src','assets/mfs-manzana-camara.svg');
  for (const [name,id] of [['Laboratorio claro','laboratory'],['Botánico contemporáneo','botanical'],['Editorial técnico','editorial']]) {
    await page.getByRole('button',{name:'Ajustes',exact:true}).click();await page.getByRole('radio',{name:new RegExp(name)}).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme',id);await page.getByRole('button',{name:'Listo',exact:true}).click();
    await page.screenshot({path:`docs/screenshots/mfs-web-${id}.png`,fullPage:true});await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme',id);
  }
  await page.getByRole('button',{name:'Ajustes',exact:true}).click();await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Ajustes',exact:true})).toBeFocused();
});
test('mobile browser keeps web flow and MFS accessible name without overflow', async ({page}) => {
  await page.setViewportSize({width:390,height:844});await example(page);
  await expect(page.locator('.browser-app')).toBeVisible();await expect(page.getByText('Prototipo web')).toBeVisible();
  await expect(page.locator('.welcome-carousel')).toHaveCount(0);
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    await expect(page.locator('.web-header .brand-short')).toBeVisible();await expect(page.locator('.web-header .brand')).toHaveAttribute('aria-label','MicroFoodScan, inicio');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button',{name:'Ajustes',exact:true}).click();await expect(page.getByRole('radio',{name:/Editorial técnico/})).toBeVisible();await page.getByRole('button',{name:'Listo',exact:true}).click();
  }
  await page.screenshot({path:'docs/screenshots/mfs-mobile-web.png',fullPage:true});
});
test('native layout simulation: welcome, persistent completion and gallery file path', async ({page}) => {
  await page.addInitScript(()=>Object.assign(window,{CapacitorCustomPlatform:{name:'native-test'}}));
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page).toHaveURL(/\/bienvenida$/);
  await page.locator('.welcome-carousel').evaluate(el=>el.scrollTo({left:el.clientWidth,behavior:'instant'}));
  await expect(page.getByText('BIENVENIDA · 2 DE 3')).toBeVisible();await page.getByRole('button',{name:'Siguiente'}).click();
  await page.getByRole('button',{name:'Continuar'}).click();await page.reload();await expect(page).toHaveURL(/\/inicio$/);
  await page.getByRole('button',{name:'Comenzar análisis'}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Cargar imagen'}).click();
  await (await chooser).setFiles('src/assets/example-matrix.png');
  await checked(page);
  await expect(page.locator('.native-app')).toBeVisible();
  await page.screenshot({path:'docs/screenshots/mfs-native-simulated.png',fullPage:true});
});
test('native welcome can be skipped', async ({page}) => {
  await page.addInitScript(()=>Object.assign(window,{CapacitorCustomPlatform:{name:'native-test'}}));
  await page.goto('/');await page.getByRole('button',{name:'Saltar',exact:true}).click();await page.reload();await expect(page).toHaveURL(/\/inicio$/);
});
test('camera permission denial keeps selected image and supports another attempt', async ({page}) => {
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
  await example(page);await page.getByRole('button',{name:'Repetir foto',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('No se ha autorizado la cámara');await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('ejemplo-sintetico.png')).toBeVisible();await expect(page.getByRole('button',{name:'Elegir otra imagen'})).toBeEnabled();
});
test('web camera frame follows the same automatic check and stops its stream', async ({page}) => {
  await page.addInitScript(()=>{
    let stopped=false;Object.defineProperty(window,'__cameraStopped',{get:()=>stopped});
    navigator.mediaDevices.getUserMedia=async()=>{
      const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;
      const ctx=canvas.getContext('2d')!;ctx.fillStyle='#d9ef9f';ctx.fillRect(0,0,1200,800);
      const stream=canvas.captureStream(10);for(const t of stream.getTracks()){const stop=t.stop.bind(t);t.stop=()=>{stopped=true;stop();};}return stream;
    };
  });
  await page.goto('/captura');await page.getByRole('button',{name:'Hacer foto',exact:true}).click();await page.getByRole('button',{name:'Capturar foto',exact:true}).click();
  await expect(page.getByText('foto-matriz.jpg')).toBeVisible();await checked(page);
  expect(await page.evaluate(()=>Reflect.get(window,'__cameraStopped'))).toBe(true);
});

// These UI contract tests replace only session dependencies via Angular's development
// debug API. No validator override, query parameter or test hook ships in production.
test('explicit validator double: tick, gated analysis, results only after completion, replacement clears tick', async ({page}) => {
  await page.goto('/captura');
  await page.evaluate(()=>{
    const component=(window as any).ng.getComponent(document.querySelector('app-capture'));
    const deps=component.store.session.deps;
    deps.validate=()=>new Promise(resolve=>{(window as any).__validate=()=>resolve({outcome:'valid',scope:'technical-file',technicallyReadable:true,checks:[]});});
    const analyze=deps.analyze;
    deps.analyze=(image:unknown)=>new Promise(resolve=>{(window as any).__analyze=async()=>resolve(await analyze(image));});
  });
  await page.locator('input[type=file]').setInputFiles('src/assets/example-matrix.png');
  await expect(page.getByText('Comprobando si la imagen es válida…',{exact:true})).toBeVisible();
  await expect(page.locator('.photo-stage img')).toBeVisible();await expect(page.getByRole('button',{name:'Analizar',exact:true})).toBeDisabled();
  await page.evaluate(()=>(window as any).__validate());await checked(page);
  await page.getByRole('button',{name:'Analizar',exact:true}).click();await expect(page.getByText('Preparando el informe técnico…')).toBeVisible();await expect(page).toHaveURL(/\/captura$/);
  await page.evaluate(()=>(window as any).__analyze());await expect(page).toHaveURL(/\/resultados$/);
  for(const name of ['Puntos de control','Señales de prueba'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Repetir foto'}).click();await expect(page).toHaveURL(/\/captura$/);
  await page.locator('input[type=file]').setInputFiles({name:'invalid.jpg',mimeType:'image/jpeg',buffer:Buffer.from('invalid')});
  await expect(page.getByText(technicalPass,{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Analizar',exact:true})).toBeDisabled();
});

test('Python worker load failure is retryable and cannot mark the file valid', async ({page}) => {
  await page.route('**/assets/python/validator.worker.mjs', route => route.abort());
  await page.goto('/captura');
  await page.locator('input[type=file]').setInputFiles('src/assets/example-matrix.png');
  await expect(page.getByRole('button',{name:'Reintentar comprobación'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Analizar',exact:true})).toBeDisabled();
  await expect(page.getByText(technicalPass,{exact:true})).toHaveCount(0);
  await page.unroute('**/assets/python/validator.worker.mjs');
  await page.getByRole('button',{name:'Reintentar comprobación'}).click();
  await checked(page);
});
