/** Saca el objeto JSON de una respuesta que puede venir con texto o ```json alrededor. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new SyntaxError('No hay ningún objeto JSON en la respuesta.');
  return JSON.parse(body.slice(start, end + 1));
}
