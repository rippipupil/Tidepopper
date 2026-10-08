# Tidepopper 📚

App de estudio personal (web y móvil) en pixel art 3D. Estudias con tus propios apuntes o con un asistente IA, y cada sesión bien hecha te da monedas y experiencia para construir y defender tu aldea.

## Qué hace ya

- **Asistente IA con cursos por niveles:**
  - Le dices un tema (por ejemplo, código morse), tu nivel y para qué lo quieres, y Claude diseña un curso de 4 a 12 niveles.
  - Cada nivel tiene una lección, ideas clave y una práctica con 20 segundos por pregunta.
  - Con un 60 % pasas, con estrellas según la nota, y se abre el siguiente nivel.
  - Las tarjetas de cada nivel aprobado pasan a tu repaso.
- **Chat con el asistente:** en cualquier estudio o curso, pregúntale lo que quieras. Responde con tu material delante. «Explícamelo mejor» en las flashcards también abre el chat.
- **Mis estudios:** carpetas de colores, una por tema.
- **Añadir apuntes:** PDF, fotos (de la cámara o la galería), texto pegado o tarjetas a mano. La IA (Claude) lee los PDF y las fotos directamente y crea un **resumen** y **tarjetas de repaso**.
- **Flashcards con repetición espaciada:** cada tarjeta vuelve justo antes de que la olvides (*No la sabía · Dudé · La sabía*).
- **Minijuegos** (con las tarjetas de cada estudio):
  - **Contrarreloj:** elige la definición en 10 s.
  - **Parejas:** une cada término con su definición.
  - **Escribe:** lee la definición y escribe el término. Perdona tildes y una errata.
  - **Verdadero o falso:** 30 segundos, todas las que puedas.
  - **Ordena las letras:** forma el término con sus letras.
  - **Explícalo tú:** la IA corrige tu explicación.
- **Modo mixto:** 10 rondas al azar de tipo test, verdadero o falso, escribir y ordenar, sin repetir tipo seguido.
- **Dibujar letras:** si estudias un idioma con otro alfabeto (hiragana, katakana, cirílico, griego o hangul), dibujas cada letra con el dedo y la app compara tu trazo con la letra real. Se puede activar una guía.
- **Misiones diarias:** 3 cada día (repasar, jugar, dibujar, hacer un examen…), con monedas y un cristal si haces las tres.
- **Logros:** 12 logros con cristales; algunos desbloquean decoraciones para la aldea.
- **Exámenes:**
  - *Rápido:* sale de tus tarjetas, sin IA.
  - *Completo con IA:* preguntas tipo test y de desarrollo; la IA corrige y explica.
  - En los dos: nota sobre 10, corrección pregunta a pregunta, historial de notas y fecha del examen con cuenta atrás.
- **Explícalo tú:** escribes un concepto con tus palabras y la IA te dice qué está bien, qué falta y qué es un error.
- **Recompensas:** monedas por acierto (la racha las multiplica), XP y niveles, y cristales por sesiones perfectas. Cada 10 aciertos entrenan una tropa.
- **La aldea:**
  - Mapa isométrico de 16×16 casillas.
  - Construyes cañones, torres de arqueras, catapultas, ballestas, muros, minas… y los colocas o mueves donde quieras.
  - Cada defensa se alimenta de un estudio, y su fuerza es lo que recuerdas de él.
  - Las tarjetas sin repasar son **grietas** por donde entra la Niebla del Olvido.
- **Obras y mejoras:**
  - Cada edificio sube de nivel con monedas y tiempo de obra, como mucho un nivel por encima del ayuntamiento.
  - Cada cabaña es un constructor.
  - **Cada sesión de estudio acelera las obras 30 min.**
- **Aldea con más vida:**
  - Torre mágica (necesita el ayuntamiento a nivel 2).
  - Decoraciones: flores, farol, bandera, estatua y fuente.
  - Los edificios cambian de aspecto al subir de nivel: base dorada en el nivel 3 y cristal en el nivel 5.
  - Las tropas se ven junto al cuartel.
  - Se pueden quitar rocas y árboles, que a veces esconden un cristal.
- **Mina:** produce monedas cada hora, pero solo se puede vaciar los días que estudias.
- **Laboratorio:** con cristales, tus tropas destruyen más en los ataques.
- **La Niebla del Olvido:** cada día nuevo, si tienes tarjetas sin repasar, ataca. Roba más cuanto más débiles sean tus defensas, y los muros ayudan. Te deja un informe.
- **Ataques:** máximo **2 al día**. Cada pregunta de repaso acertada lanza una arquera, y el botín depende de lo que destruyas.
- **Perfil:** clave de Claude y copia de seguridad (descargar y restaurar).

El diseño y las mecánicas están en [`docs/vision.md`](docs/vision.md) y [`docs/aldea.md`](docs/aldea.md).

## Tus datos

Todo se guarda **solo en tu dispositivo** (IndexedDB): estudios, tarjetas, aldea y la clave de la API. No hay servidor ni cuenta. Usa *Perfil → Descargar copia* para no perder nada o para pasar tus datos a otro dispositivo.

## La IA

Crear material y corregir explicaciones usa la API de Claude con **tu propia clave**. Se consigue en console.anthropic.com y se pega en *Perfil*.

Como la app es personal, llama a Claude directamente desde el dispositivo. No compartas tu clave ni una copia de la app con ella puesta. Sin clave, todo lo demás funciona creando tarjetas a mano.

## Desarrollo

```bash
npm install
npm run dev        # servidor local
npm test           # tests de la lógica (repaso, recompensas, aldea…)
npm run typecheck
npm run build
```

Hecho con React + TypeScript + Vite. Los sprites isométricos se generan con `tools/voxel.py` y los iconos con `tools/mkicons.py`.

## Publicación

Cada cambio en `main`:

- se publica como web en GitHub Pages (`.github/workflows/pages.yml`). Hay que activarlo una vez en *Settings → Pages → Source: GitHub Actions*.
- genera el APK de Android (`.github/workflows/android.yml`) con Capacitor.

## Instalar en Android

[**Descargar Tidepopper para Android (APK)**](https://github.com/rippipupil/Tidepopper/releases/latest/download/tidepopper.apk)

Descarga el archivo en el móvil, ábrelo y confirma la instalación. Si Play Protect avisa de una «app desconocida», pulsa *Más detalles → Instalar de todos modos*.

### Firma del APK

Para que cada APK nuevo se instale encima del anterior, todos deben ir firmados con la misma clave. La clave **no está en el repositorio**: el build la lee de estos secretos (*Settings → Secrets and variables → Actions → New repository secret*):

- `RELEASE_KEYSTORE_BASE64`: el archivo de la clave (`.keystore`) en base64.
- `RELEASE_KEYSTORE_PASSWORD`: su contraseña.
- `RELEASE_KEY_ALIAS` (opcional): el alias de la clave; si no se pone, se usa `tidepopper`.

Puedes reutilizar la clave de Meteor Shower, pero necesitas el archivo `.keystore` original y su contraseña: GitHub no deja leer un secreto una vez guardado, así que no se puede copiar de un repositorio a otro. En ese caso añade también `RELEASE_KEY_ALIAS` = `meteorshower`.

Mientras falten los secretos, el APK se firma con una clave temporal. Solo se guarda como artefacto del workflow, sirve para probar y no se publica en Releases.
