# Tidepopper 📚

App de estudio personal (web y móvil) en pixel art 3D. Estudias con tus propios apuntes o con un asistente IA, y cada sesión bien hecha te da monedas y experiencia para construir y defender tu aldea.

## Qué hace ya

- **Mis estudios:** carpetas de colores, una por tema.
- **Añadir apuntes:** PDF, fotos (de la cámara o la galería), texto pegado o tarjetas a mano. La IA (Claude) lee los PDF y las fotos directamente y crea un **resumen** y **tarjetas de repaso**.
- **Flashcards con repetición espaciada:** cada tarjeta vuelve justo antes de que la olvides (*No la sabía · Dudé · La sabía*).
- **Contrarreloj:** un término y 4 definiciones, con 10 segundos para elegir.
- **Explícalo tú:** escribes un concepto con tus palabras y la IA te dice qué está bien, qué falta y qué es un error.
- **Recompensas:** monedas por acierto (la racha las multiplica), XP y niveles, y cristales por sesiones perfectas. Cada 10 aciertos entrenan una tropa.
- **La aldea:**
  - Mapa isométrico de 16×16 casillas.
  - Construyes cañones, torres de arqueras, catapultas, ballestas, muros, minas… y los colocas o mueves donde quieras.
  - Cada defensa se alimenta de un estudio, y su fuerza es lo que recuerdas de él.
  - Las tarjetas sin repasar son **grietas** por donde entra la Niebla del Olvido.
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

Cada cambio en `main` se publica en GitHub Pages (`.github/workflows/pages.yml`). Hay que activarlo una vez en *Settings → Pages → Source: GitHub Actions*.
