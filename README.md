# Tidepopper 🌊

App de estudio personal (web y móvil), inspirada en Turbo AI pero más simple y **gratis**. Sube tu material o graba la clase, y la IA te prepara apuntes, tarjetas, quiz, chat y un pódcast.

## Qué hace

- **Crear notas desde:**
  - 🎙️ **Grabar clase:** graba la clase y la IA la pasa a texto. La grabación se guarda cada 10 s, así que si la app se cierra se puede recuperar.
  - 📄 **Archivos:** PDF, fotos (cámara o galería), Word (.docx), PowerPoint (.pptx), audio, vídeo y texto.
  - ▶️ **YouTube:** pegas el enlace y la IA ve el vídeo.
  - ✍️ **Texto pegado.**
  - 🧭 **Aprender un tema:** la IA diseña un curso por niveles con lecciones interactivas al estilo Duolingo.
- **Cada nota tiene pestañas:**
  - **Apuntes:** resumen, ideas clave e índice. Los apuntes tienen secciones con emojis, tablas, avisos de colores, fórmulas (KaTeX) y diagramas (Mermaid). Se pueden editar, y con *Mejorar con IA* se hacen más fáciles, más detallados o con ejemplos, o se traducen.
  - **Tarjetas:** modo aprender con tarjetas *nuevas*, *aprendiendo* y *dominadas* (repetición espaciada). Se giran al tocarlas, se pueden mezclar o poner al revés, marcar como favoritas y editar, y la IA puede crear más.
  - **Quiz:** tres dificultades (básico, medio, examen). Mezcla tipo test, verdadero o falso, completar la frase, escribir, ordenar y unir parejas. Cada pregunta trae pista y explicación, y al final repasas tus fallos. También hay un quiz rápido sin IA hecho con tus tarjetas.
  - **Quiz a medida:** pídelo con tus palabras, en el quiz o en el chat: «quiz sobre el tema 2», «15 preguntas difíciles de verdadero o falso del último tema», «test de las mitocondrias». La IA recibe solo ese tema y pregunta a fondo sobre él. Cada tema («##» de los apuntes) tiene su nota de dominio y un botón para practicarlo.
  - **Apuntes que mejoran con el tiempo:** pídele cambios al chat («añade un ejemplo al tema 2», «corrige la definición de…», «quita la tabla del tema 3») o pulsa «Guardar en apuntes» bajo una respuesta. Solo se reescribe el tema que toca, te lleva a ver el cambio y puedes deshacerlo. Tras un quiz, «Mejorar mis apuntes con estos fallos» refuerza lo que fallaste. Todas las versiones quedan en Apuntes → Versiones.
  - **Chat:** preguntas lo que quieras sobre la nota. Las respuestas citan la sección de los apuntes de la que salen, y al tocar la cita vas a ella.
  - **Pódcast interactivo:** dos presentadores explican la nota conversando, en 4 estilos (charla, clase, debate o entrevista) y 3 duraciones.
    - De vez en cuando paran y te hacen una pregunta. El pódcast espera tu respuesta y el otro presentador te dice si has acertado y por qué. Al final ves cuántas acertaste.
    - **Voces:** las del dispositivo (gratis, sin internet; eliges entre las voces en español que tenga) o **voces realistas de Gemini** (gratis con la clave, 30 voces a elegir para cada presentador). El audio realista se guarda en el dispositivo, así que la segunda vez no gasta peticiones.
    - Velocidad ajustable y el texto sigue la lectura.
  - **Fuente:** el archivo original, la grabación, la transcripción, y la opción de rehacer los apuntes.
- **Carpetas, buscador, compartir, descargar en Markdown e imprimir o guardar en PDF.**
- **Repasar:** las tarjetas que tocan hoy de todas tus notas, y tu memoria por nota.
- **Tema oscuro y claro.**
- **Preguntas que hacen pensar:** las opciones incorrectas se parecen a la buena (mismo tipo, formato y tema).

El diseño y las decisiones están en [`docs/vision.md`](docs/vision.md).

## Tus datos

Todo se guarda **solo en tu dispositivo** (IndexedDB): notas, tarjetas, archivos y claves. No hay servidor ni cuenta. Usa *Ajustes → Descargar copia* para no perder nada o para pasar tus datos a otro dispositivo. Los datos de la versión 1 (estudios, cursos, tarjetas y chats) se pasan solos a notas al actualizar.

## La IA

La IA funciona **gratis**. Se elige sola, en este orden, y si una falla (sin cuota, sin red…) pasa a la siguiente:

1. **Claude** (opcional, de pago): la mejor calidad. Solo si pones tu clave de console.anthropic.com.
2. **Gemini** (gratis, recomendada): clave gratis sin tarjeta en [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Lee PDF, fotos, audio, vídeo y YouTube (grabar clases y YouTube la necesitan). Usa primero Flash-Lite (más rápido y con más usos gratis al día) y, si se queda sin cuota, Flash. En el plan gratis Google puede usar lo que envíes para mejorar sus modelos.
3. **Groq** (gratis, de reserva): clave gratis en [console.groq.com/keys](https://console.groq.com/keys). Muchos usos al día. Solo texto, y transcribe audio con Whisper.
4. **Copiar y pegar**: sin ninguna clave, la app prepara la petición, la pegas en tu app de Claude y pegas la respuesta de vuelta.

Las claves se ponen en *Ajustes* y se guardan solo en el dispositivo. La app es personal y llama a la IA directamente desde él, así que no compartas una copia de la app con tus claves puestas.

## Desarrollo

```bash
npm install
npm run dev        # servidor local
npm test           # tests de la lógica (repaso, Markdown, quiz, importar archivos…)
npm run typecheck
npm run build
```

Hecho con React + TypeScript + Vite, con marked + DOMPurify + KaTeX + Mermaid para los apuntes, lucide para los iconos y Capacitor para Android.

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
