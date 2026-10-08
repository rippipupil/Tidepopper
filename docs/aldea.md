# La aldea (gamificación)

Idea: un sistema de aldea al estilo de los juegos de construir y defender (tipo Clash of Clans),
con arte y nombres propios. **La aldea representa tu memoria.** Estudiar bien la hace crecer;
dejar de repasar la debilita.

## Recursos

| Recurso | Cómo se gana | Para qué sirve |
|---|---|---|
| **Monedas** | Cada respuesta correcta (más si es difícil o vas de racha). La mina produce más solo los días que estudias. | Construir y mejorar edificios. |
| **Experiencia (XP)** | Terminar sesiones, cursos y niveles de la IA. | Subir de nivel de jugador, lo que desbloquea edificios y niveles del ayuntamiento. |
| **Cristales** | Sesiones perfectas, rachas (cada 7 días) y jefes finales. | Cosas especiales: decoraciones, un constructor extra temporal. Nunca se compran con dinero real. |

## Edificios

- **Ayuntamiento:** su nivel limita el nivel máximo de todo lo demás. Mejorarlo desbloquea constructores, más torres y muros mejores.
- **Torres (una por estudio):** cada carpeta de estudio es una torre. Su % de defensa = lo que recuerdas de verdad de ese estudio (retención de tus tarjetas).
- **Muros:** protegen el almacén. Se mejoran con monedas.
- **Mina de monedas:** produce monedas por hora, pero solo si mantienes la racha.
- **Almacén:** guarda las monedas, con un tope que sube al mejorarlo.
- **Cabaña del constructor:** las mejoras tardan tiempo real, y **cada sesión de estudio lo acelera 30 min**.

## El enemigo: la Niebla del Olvido

- Las tarjetas que tocaba repasar y no repasaste se convierten en **grietas** en la torre de ese estudio.
- Cada noche, si hay tarjetas vencidas, la Niebla ataca. Las torres fuertes resisten y las débiles pierden algo de monedas del almacén.
- **Nunca se pierden edificios ni progreso de estudio.** El castigo es suave y siempre se arregla igual: repasando.
- El aviso en la aldea ("La niebla llega en 3 h · 18 tarjetas") te dice exactamente qué hacer para defenderte.

## Reglas para que tenga sentido (y no se pueda hacer trampa)

- Solo dan recompensa las respuestas **correctas** y las sesiones **terminadas**.
- Repetir el mismo material fácil rinde cada vez menos. Lo que más paga es lo que te cuesta.
- "Explícalo tú" y los jefes finales dan más, porque exigen entender, no solo reconocer.
- No hay dinero real ni anuncios: es una app personal.


## Vista isométrica y construcción libre
- La aldea es una isla de **16×16 casillas** en vista isométrica, con edificios en vóxeles 3D pixel art.
- **Construir:** abres la tienda, eliges un edificio y tocas una casilla. Se ve en verde si cabe y en coral si choca. Luego pulsas "Colocar".
- **Mover:** tocas un edificio y pulsas "Mover". Cambiarlo de sitio es gratis.
- Zoom 1x (vista completa) y 2x.

## Defensas
Cada defensa se **alimenta de un estudio**, y su fuerza = lo que recuerdas de ese estudio.

| Defensa | Tamaño | Coste | Máx. | Papel |
|---|---|---|---|---|
| Cañón | 2×2 | 250 | 2 | Daño fuerte a corta distancia |
| Torre de arqueras | 2×2 | 350 | 2 | Alcance medio, tierra y aire |
| Catapulta | 2×2 | 450 | 1 | Daño en área, no alcanza de cerca |
| Ballesta | 2×2 | 600 | 1 | Mucho alcance y disparo rápido |
| Muro | 1×1 | 20 | 40 | Frena a los enemigos |

Otros edificios: Ayuntamiento (4×4), Cuartel (3×3), Mina, Almacén, Laboratorio, Cabaña del constructor, y árboles y rocas como decoración.

## Tropas y ataques (máximo 2 al día)
- Las tropas se entrenan **solo estudiando**: 10 aciertos dan una arquera.
- **Atacar** una fortaleza de la Niebla es un repaso: cada pregunta acertada lanza una tropa y destruye parte de la fortaleza. Cada fallo cuesta una tropa.
- Estrellas: 40 %, 75 % y 100 % de destrucción. Botín = monedas según el % destruido.
- **Límite de 2 ataques al día**, para que la aldea sea un premio y no sustituya al estudio. Las preguntas salen de tus propios estudios, sobre todo de las tarjetas que más te cuestan.

## Más mecánicas
- **Laboratorio:** los cristales mejoran tropas y defensas.
- **Obstáculos:** quitar árboles y rocas cuesta monedas y a veces da un cristal.
- **Logros → decoraciones:** estatuas y banderas por rachas, cursos completados o exámenes aprobados.
- **Jefe semanal de la Niebla:** antes de una fecha de examen aparece un jefe especial. Para vencerlo hay que hacer un repaso mezclado de todo el tema.
- **Descanso sano:** tras 10 min seguidos en la aldea, un aviso amable propone volver a estudiar. Fuera del estudio no se gana nada.

## Archivos
- Sprites 2D: `assets/sprites/` (`tools/mksprites.py`).
- Sprites isométricos en vóxeles: `assets/iso/` y `meta.json` con el anclaje de cada uno (`tools/voxel.py`). Para colocar un edificio en la casilla (i, j): `x = OX + (i − j)·12 − ox`, `y = OY + (i + j)·6 − oy`.
