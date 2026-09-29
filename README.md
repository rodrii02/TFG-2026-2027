# MicroFoodScan · Lectura local de matrices de señales

Aplicación del TFG para fotografiar o cargar una matriz de señales y comprobar su imagen localmente. Web adaptable y proyectos nativos Android/iOS con una única lógica compartida. **La interpretación del ensayo está pendiente de calibración.** No se detectan micotoxinas, no se calculan concentraciones ni se determina si un alimento es seguro.

## Arranque rápido

Desde esta carpeta (`mi-app/`):

```sh
nvm install
nvm use
npm ci
npm run setup:python
npm start
```

Abre [http://127.0.0.1:4200](http://127.0.0.1:4200). Para ejecutar con las herramientas locales que se han preparado en este equipo, sin cambiar tu instalación global:

```sh
PATH="../.tools/node_modules/.bin:$PATH" npm start
```

La segunda opción depende de la carpeta `.tools/` situada junto a `mi-app/`; para trasladar el proyecto a otro ordenador utiliza `nvm` o instala un Node compatible. No es necesario copiar `node_modules/`, `.angular/`, `.tools/` ni `dist/`.

`setup:python` descarga durante la preparación del proyecto los paquetes compatibles de Python y verifica sus SHA-256. Solo necesita red si faltan archivos. El motor se incluye dentro de la web y de las apps; la aplicación no descarga librerías de un CDN ni sube imágenes. `prestart` y `prebuild` verifican los archivos locales sin descargarlos.

## Versiones y requisitos

Dependencias directas fijadas, sin `next`, `rc`, alfa o beta. Se comprobaron los metadatos reales del registro npm y la documentación oficial el **24 de septiembre de 2026**, antes de instalar.

**Excepción transitiva:** las herramientas oficiales de compilación de Angular incluyen `gensync@1.0.0-beta.2` y `@jridgewell/gen-mapping@0.4.0-beta.0` a través de Babel. No se ha forzado una sustitución fuera de sus rangos. Por tanto, el requisito de no usar betas se cumple para dependencias directas, pero **no para todo el árbol**. Cadena exacta y comprobación en [docs/VERIFICACION.md](docs/VERIFICACION.md#excepción-en-las-dependencias-transitivas).

| Herramienta | Versión utilizada | Compatibilidad verificada |
| --- | --- | --- |
| Angular, CLI y build | 22.2.0 | Última estable de Angular 22 disponible en el registro durante la implementación |
| TypeScript | 6.0.3 | Angular exige `>=6.0 <6.1` |
| Ionic Angular | 9.0.5 | Peer Angular `>=18`, RxJS `>=7.5`, Zone `>=0.13` |
| Capacitor core, CLI, Android, iOS | 8.5.2 | Node `>=22` |
| Camera / Preferences / App | 8.2.4 / 8.0.1 / 8.1.1 | Plugins de Capacitor 8 |
| Node | 24.21.0 | Angular admite `^22.22.3`, `^24.15.0` o `>=26` |
| npm | 12.1.0 en este equipo | npm 11 o posterior recomendado; lockfile incluido |
| Pruebas | Vitest 4.1.11 / Playwright 1.63.0 | Pruebas de funciones y de navegador |
| Python local | Pyodide 314.0.7 / Python 3.14.2 | Pillow 12.2.0, NumPy 2.4.6, OpenCV 4.11.0.86 del mismo catálogo Pyodide; comprobados el 29/09/2026 |

El Node 22.12.0 que tenía el equipo **no es suficiente** para Angular 22. Se descargó Node 24.21.0 en `.tools/`, sin sustituirlo globalmente. npm 10 fallaba al resolver los peers del entorno de pruebas; npm 12 completó la instalación sin `--force` ni `--legacy-peer-deps`.

Hay un override acotado `xcode → uuid@11.1.1`: corrige una alerta de la dependencia de desarrollo de Capacitor conservando la API CommonJS `uuid.v4` utilizada por `xcode`. Se verifica que el proyecto Xcode se puede analizar con esa dependencia. No afecta al código servido al navegador.

Fuentes: [compatibilidad Angular](https://angular.dev/reference/versions), [cambios e imports de Ionic 9](https://github.com/ionic-team/ionic-framework/blob/main/BREAKING.md), [entorno Capacitor 8](https://capacitorjs.com/docs/getting-started/environment-setup), [Camera](https://capacitorjs.com/docs/apis/camera), [Preferences y privacidad de iOS](https://capacitorjs.com/docs/apis/preferences). Los tipos instalados son la fuente final para las APIs. La galería actual utiliza el selector de archivos del sistema a través del WebView.

## Recorridos implementados

- **Web:** inicio directo, barra lateral de escritorio, navegación web compacta en móvil, captura/carga, revisión y resultados. Abrir la web en un teléfono **no activa** el carrusel.
- **App nativa:** `Capacitor.isNativePlatform()` selecciona el layout móvil. La primera apertura muestra tres diapositivas deslizables, con indicadores, teclado, Saltar, Siguiente y Continuar. Preferences guarda la finalización y no se repite al abrir de nuevo.
- **Ajustes:** icono de engranaje en ambas presentaciones. Laboratorio claro, Botánico contemporáneo y Editorial técnico cambian inmediatamente todos los componentes. La elección se guarda con Preferences (almacenamiento local en web, almacenamiento nativo en Android/iOS). Si falla, se informa y se mantiene la sesión.
- **Captura:** selector de archivo del sistema en web y en el WebView nativo; arrastrar/soltar en web. Cámara web con `getUserMedia` y nativa con `Camera.takePhoto`. La galería evita la conversión de `chooseFromGallery` de Camera 8.2.4. Cancelaciones, permisos denegados y errores permiten reintentar.
- **Revisión automática en captura:** previsualización y comprobación Python real con Pillow/OpenCV. Un archivo legible que cumple el mínimo técnico de 200 × 200 px muestra «Archivo válido para revisión técnica» y habilita Analizar. Se distinguen los archivos inválidos y los errores reintentables. No hay confirmaciones manuales; `/revision` redirige a `/captura`.
- **Informe:** tras Analizar muestra la revisión técnica del archivo y, por separado, la localización de la matriz, puntos de control y señales de prueba **pendientes de calibración**. No se inventan posiciones, analitos ni concentraciones.

El botón «Probar con una imagen de ejemplo» carga una matriz sintética con geometría arbitraria, rotulada como ejemplo. Permite recorrer captura → validación Python → Analizar → informe técnico. La interpretación científica permanece pendiente de calibración.

## Estructura

```text
mi-app/
├── src/
│   ├── app/
│   │   ├── core/                 # estado, plataforma, preferencias, guards, ciclo nativo
│   │   ├── layouts/              # contenedores web y móvil distintos
│   │   ├── shared/               # marca, iconos, ajustes, cabecera de paso, vista de foto
│   │   └── features/
│   │       ├── welcome/
│   │       ├── home/
│   │       ├── capture/          # adquisición web/nativa y errores de cámara
│   │       ├── review/
│   │       ├── results/
│   │       └── processing/      # formatos, dimensiones, calidad, localizador e intérprete
│   ├── assets/                  # ilustración, identidad e imagen sintética
│   ├── environments/
│   ├── styles/tokens.scss       # paleta y tokens de los tres temas
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── android/                     # proyecto Gradle generado por Capacitor
├── ios/                         # proyecto Xcode + Swift Package Manager
├── tests/                       # pruebas del recorrido en navegador
├── scripts/                     # verificación nativa y generación de iconos
├── docs/                        # referencias, calibración y capturas de verificación
├── capacitor.config.ts
├── package-lock.json
└── package.json
```

Los componentes de pantalla no interpretan señales. `AnalysisSession` serializa preparación, validación y análisis; aborta operaciones obsoletas y retiene cada URL solo mientras está en uso; `AnalysisStore` adapta ese estado a signals de Angular. `LfaReader` recibe un localizador y un intérprete sustituibles. El algoritmo es el mismo en todas las plataformas.

## Qué se comprueba realmente

1. Archivo no vacío y de hasta **20 MiB**.
2. Firma binaria JPEG, PNG o WebP, sin confiar en el nombre ni en el MIME declarado.
3. Dimensiones codificadas antes de decodificar: enteros positivos, máximo **32 millones de píxeles** y **16.384 por lado**.
4. Lectura de un máximo de 1 MiB de cabecera comprimida, sin copiar el original completo a un ArrayBuffer ni convertirlo a base64. Cabeceras no interpretables se rechazan.
5. Decodificación con `createImageBitmap` solicitando una copia de hasta 2048 píxeles por lado, proporción conservada y orientación EXIF. Salida PNG sin filtros. Cámara nativa solicita el mismo tamaño al plugin. Si no existe un decodificador con reducción, solo se aceptan originales que ya entren en ese presupuesto; no se usa un `Image.decode` grande como alternativa.
6. Se cierran bitmaps/canvas y se revocan URLs al sustituir o descartar la imagen. Las tareas se serializan para evitar decodificaciones simultáneas.

Estos son **límites de recursos del prototipo, no umbrales científicos**. La salida de trabajo se limita a unos 16 MiB de píxeles RGBA por buffer; no garantiza un pico total de memoria del navegador, del plugin o de Python. No se ha demostrado que 2048 píxeles conserven todos los puntos del ensayo: habrá que validar la resolución, compresión, orientación y señal con imágenes reales antes de interpretar señales. La interfaz indica cuando se reduce una imagen.

Después de preparar el PNG acotado, `validar_imagen.py` verifica que existe, formato, dimensiones, integridad con Pillow y lectura con OpenCV. El mínimo de 200 × 200 procede del ejemplo aportado y es un filtro técnico provisional, no una resolución validada para el ensayo. Un resultado positivo habilita el informe técnico; enfoque, iluminación, encuadre y lectura de puntos siguen pendientes. WebP original se admite tras decodificarlo y convertirlo localmente a PNG; Python comprueba esa copia. HEIC necesita exportación a JPEG. No se recorta ni se realza la señal.

Python se ejecuta con Pyodide en un worker de duración limitada: termina al finalizar, cancelar o superar 60 segundos. El runtime y sus paquetes añaden aproximadamente **26,9 MiB** de assets antes de comprimir; requieren memoria adicional y su rendimiento en un teléfono aún debe medirse. Detalles, pruebas y limitaciones: [docs/PYTHON-LOCAL.md](docs/PYTHON-LOCAL.md).

No hay login, backend, analítica, fuentes remotas ni API de interpretación. Las fotos no salen del dispositivo. `fetch` carga el ejemplo, las rutas locales de imagen y el motor Python empaquetado, sin subir imágenes. Los blobs se liberan al cambiar o descartar la imagen. La cámara web se detiene al cerrar, capturar, ocultar la pestaña o abandonar la pantalla. Se escucha `appRestoredResult` de Camera cuando el plugin lo emite, con control de respuestas obsoletas y mensajes de recuperación. El selector del WebView no persiste su resultado si Android mata el proceso: se debe elegir de nuevo la foto. Ambos casos requieren prueba física.

Las fotos y los informes se conservan solo en memoria. Una recarga, cierre o terminación por el sistema pierde el análisis; los guards llevan a captura si no existe un resultado. Solo el tema y la bienvenida se guardan de forma persistente.

## Compilar y servir la web

```sh
npm run build
```

Salida real: **`dist/clarifica/browser/`**. `capacitor.config.ts` usa exactamente ese `webDir`. Para publicar la web, sirve esta carpeta con un servidor estático HTTPS y configura la reescritura de rutas (`/revision`, `/captura`, etc.) a `index.html`. La cámara web requiere HTTPS o localhost. No basta con abrir `index.html` como `file://`.

La instalación Android/iOS de esta entrega utiliza Capacitor. Una web añadida a la pantalla de inicio del navegador conserva el recorrido web; no se implementa un service worker/PWA independiente. La app nativa incluye los archivos web y funciona sin un servidor remoto.

## Android

Requiere **Android Studio 2025.2.1 o posterior**, JDK **21**, Android SDK **36**, Platform Tools y las herramientas de compilación instaladas con el SDK Manager. El mínimo configurado es Android **7 / API 24**. Verifica el JDK de Gradle en los ajustes de Android Studio.

Los directorios ya están generados. Solo si se parte de una copia sin plataformas:

```sh
npm run build
npx cap add android
npx cap add ios
```

Para compilar los cambios y abrir Android:

```sh
npm run sync
npm run android
```

Abre el directorio `android/` si Android Studio lo solicita. Espera la sincronización de Gradle, crea un emulador o conecta un Android con opciones de desarrollador y depuración USB, selecciona el destino y pulsa **Run**. La descarga inicial de SDK/Gradle/dependencias requiere Internet. No se necesita backend para usar la app.

Desde terminal, después de configurar SDK y JDK:

```sh
# En macOS, si JDK 21 está registrado:
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
cd android
./gradlew :app:assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug
```

`local.properties` y la ruta del SDK son propios de cada ordenador y no se incluyen. La cámara se abre mediante la actividad del sistema y `saveToGallery` está desactivado: no se solicitan permisos de escritura de almacenamiento. La cámara es opcional en el manifest; siempre se puede cargar una imagen. Comprueba permisos, cancelación, vuelta desde la cámara, botón Atrás y recuperación de actividad en un **dispositivo físico** antes de entregar la app para uso real.

## iPhone / iOS

Requiere **macOS**, **Xcode 26 o posterior** completo, sus herramientas de línea de comandos y un simulador iOS instalado. Mínimo de despliegue configurado: **iOS 15**. Esta entrega usa **Swift Package Manager**, por lo que no necesita CocoaPods.

```sh
npm run sync
npm run ios
```

Se abre `ios/App/App.xcodeproj`. Si `xcode-select -p` muestra solo `/Library/Developer/CommandLineTools`, selecciona Xcode desde sus ajustes o ejecuta:

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

En Xcode permite resolver los paquetes Swift. En **Signing & Capabilities**, elige tu equipo de desarrollo, ajusta `es.tfg.clarifica` si necesitas un identificador único y configura la firma. Para un iPhone físico: conéctalo, confía en el Mac, activa Developer Mode si iOS lo pide, selecciónalo como destino y pulsa **Run**. La cuenta/equipo y las condiciones de firma o distribución las gestiona Apple.

La cámara requiere un **iPhone físico** para validar la captura; el simulador sirve para navegación y carga de imágenes. `Info.plist` incluye explicaciones en español de cámara y fototeca. `PrivacyInfo.xcprivacy` declara el uso de preferencias (`UserDefaults`, motivo `CA92.1`) y está incluido en los recursos del target. No se declaran datos recopilados por esta aplicación.

## Sincronizar después de cambiar Angular

```sh
npm run sync
```

Equivale a `ng build` seguido de `cap sync`: copia `dist/clarifica/browser` y sincroniza los plugins. Después recompila/ejecuta desde el IDE nativo. No edites los archivos web copiados dentro de Android o iOS; se sobrescriben.

Los permisos, recursos y el manifiesto de privacidad configurados aquí forman parte de los proyectos nativos entregados. Si borras y vuelves a generar una plataforma con `cap add`, debes reponer esas personalizaciones; conserva los directorios en el control de versiones.

## Pruebas y verificación

```sh
npm test                 # funciones, errores, límites y transiciones
npm run test:python      # Python/Pillow/OpenCV reales, sin red, y worker con imagen sintética
npm run build           # compilación Angular de producción
npm run sync            # actualización de Android e iOS
npm run verify:native    # webDir, copia de assets, plugins, permisos y privacidad
npm run test:e2e         # Chrome: carga, revisión, resultados, temas y vistas pequeñas
```

Las pruebas E2E utilizan Google Chrome instalado (`channel: chrome`). Si no lo tienes, instálalo o adapta `playwright.config.ts` al Chromium de Playwright después de `npx playwright install chromium`. Arrancan el servidor local automáticamente si no existe ya uno.

Las comprobaciones realizadas y sus límites están en [docs/VERIFICACION.md](docs/VERIFICACION.md). Se incluyen capturas de escritorio, temas y móvil en `docs/screenshots/`. Los archivos cuyo nombre incluye `simulated` son **la presentación nativa simulada en un navegador**, no fotos de un teléfono ni resultados de un emulador Android/iOS.

La verificación de Python y sus límites se recogen en [docs/PYTHON-LOCAL.md](docs/PYTHON-LOCAL.md). [CAMBIOS-MICROFOODSCAN.md](docs/CAMBIOS-MICROFOODSCAN.md) y [VERIFICACION.md](docs/VERIFICACION.md) son registros de entregas anteriores. No se ha probado físicamente el cierre comunicado. ADB y la ejecución de Chrome no fueron autorizados en esta sesión; Xcode completo no está seleccionado. Los resultados anteriores de navegador no validan este flujo nuevo.

## Referencias y calibración pendiente

Se han revisado todos los mockups, los dos recorridos y la paleta originales. Inventario y decisiones: [docs/REFERENCIAS.md](docs/REFERENCIAS.md).

Antes de habilitar una interpretación científicamente válida se necesita el protocolo del LFA, el mapa definitivo de puntos y controles, micotoxinas y unidades, el comportamiento competitivo/sándwich, tiempos de lectura, imágenes etiquetadas con resultados de laboratorio y un procedimiento de calibración/validación. La lista de trabajo y los puntos de extensión están en [docs/CALIBRACION.md](docs/CALIBRACION.md).

## Identidad visual

Nombre visible: **MicroFoodScan**; marca abreviada **MFS** hasta 480 px, con nombre accesible completo. Se conserva `es.tfg.clarifica`, el directorio de salida Angular y las claves de preferencias para no romper la instalación ni perder los ajustes guardados.

La ruta literal `logos/imagenes/mfs-manzana-camara.svg` no existe. El archivo original se encontró en `../logos:imagenes/manzana-camara-svg/mfs-manzana-camara.svg`; se copia sin modificar a `src/assets/mfs-manzana-camara.svg`. La comprobación nativa verifica igualdad de contenido. `scripts/generate-brand-assets.mjs` rasteriza ese mismo SVG para Android/iOS; necesita Sharp solo para regenerar los PNG, no para compilar ni ejecutar. Puede indicarse una instalación existente mediante `MFS_SHARP_MODULE`.
