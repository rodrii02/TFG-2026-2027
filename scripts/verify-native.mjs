import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const xcode = require('xcode');
const read = p => readFileSync(p, 'utf8');
const webDir = 'dist/clarifica/browser';
assert.ok(existsSync(`${webDir}/index.html`), 'Build web before verifying native assets');
assert.match(read('capacitor.config.ts'), /webDir: 'dist\/clarifica\/browser'/);
for (const path of ['android/app/src/main/assets', 'ios/App/App']) {
  const config=JSON.parse(read(`${path}/capacitor.config.json`));
  assert.equal(config.appName,'MicroFoodScan'); assert.equal(config.appId,'es.tfg.clarifica'); assert.equal(config.webDir,webDir);
  assert.equal(config.server,undefined,'Native package must not load a remote development server');
  assert.equal(read(`${path}/public/index.html`),read(`${webDir}/index.html`),'Native assets are stale; run npm run sync');
  assert.ok(existsSync(`${path}/public/assets/example-matrix.png`));
  assert.equal(read(`${path}/public/assets/mfs-manzana-camara.svg`),read('src/assets/mfs-manzana-camara.svg'),'Native logo differs from supplied SVG');
  const pythonRoot = `${path}/public/assets/python`;
  const manifest = JSON.parse(read('src/assets/python/runtime/manifest.json'));
  for (const [file, expected] of Object.entries(manifest.files)) {
    const bytes = readFileSync(`${pythonRoot}/runtime/${file}`);
    assert.equal(bytes.length, expected.bytes, `Incomplete Python asset: ${file}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, `Stale Python asset: ${file}`);
  }
  for (const file of ['validator.worker.mjs', 'validar_imagen.py']) assert.equal(read(`${pythonRoot}/${file}`), read(`src/assets/python/${file}`));
}
assert.equal(read('src/assets/mfs-manzana-camara.svg'),read('../logos:imagenes/manzana-camara-svg/mfs-manzana-camara.svg'));
assert.match(read('android/app/src/main/res/values/strings.xml'), /app_name">MicroFoodScan/);
const plist=read('ios/App/App/Info.plist');
assert.match(plist, /<key>CFBundleDisplayName<\/key>\s*<string>MicroFoodScan<\/string>/);
for(const key of ['NSCameraUsageDescription','NSPhotoLibraryUsageDescription','NSPhotoLibraryAddUsageDescription']) assert.ok(plist.includes(`<key>${key}</key>`));
const privacy=read('ios/App/App/PrivacyInfo.xcprivacy'); assert.ok(privacy.includes('CA92.1'));
const project=xcode.project('ios/App/App.xcodeproj/project.pbxproj'); project.parseSync();
const objects=project.hash.project.objects;
assert.ok(Object.values(objects.PBXFileReference).some(v=>v.path==='PrivacyInfo.xcprivacy'));
assert.ok(Object.values(objects.PBXResourcesBuildPhase).some(v=>v.files?.some(f=>f.comment==='PrivacyInfo.xcprivacy in Resources')));
const spm=read('ios/App/CapApp-SPM/Package.swift');
for(const name of ['CapacitorCamera','CapacitorPreferences','CapacitorApp']) assert.ok(spm.includes(name));
const manifest=read('android/app/src/main/AndroidManifest.xml');
assert.ok(manifest.includes('android:allowBackup="false"'));
assert.ok(manifest.includes('android.hardware.camera" android:required="false"'));
assert.ok(!manifest.includes('WRITE_EXTERNAL_STORAGE'));
const androidPlugins=read('android/capacitor.settings.gradle');
for(const name of ['capacitor-camera','capacitor-preferences','capacitor-app']) assert.ok(androidPlugins.includes(name));
const pkg=JSON.parse(read('package.json'));
for(const [name,version] of Object.entries({...pkg.dependencies,...pkg.devDependencies})) assert.ok(!/-(alpha|beta|next|rc)/.test(version),`${name} is a prerelease`);
console.log('Native configuration verified: bundled assets, webDir, plugins, iOS permissions/privacy resources, Android manifest, stable direct dependencies.');
console.log('This is a configuration check, not an APK/IPA compilation or a physical-device test.');
