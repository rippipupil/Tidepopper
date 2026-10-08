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

## Pantallas diseñadas
Mi aldea · Recompensa al terminar · Mejorar edificio · Informe del ataque.
Los sprites están en `assets/sprites/` y se generan con `tools/mksprites.py`.
