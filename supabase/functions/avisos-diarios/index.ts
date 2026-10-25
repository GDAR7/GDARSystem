// ══ EDGE FUNCTION · avisos-diarios ═════════════════════════════════════════
// La llama pg_cron cada mañana (sql/avisos_automaticos.sql), 5 minutos después
// de que revisar_avisos() dejó los avisos del día. Arma UN correo-resumen por
// destinatario (tabla avisos_correo) y lo manda por EmailJS, con la misma
// plantilla del módulo Notificaciones (to_email, cc_email, subject, message).
//
// Solo atiende pedidos que traen el secreto x-gdar-secreto: nadie de afuera
// puede disparar correos.
//
// Secretos que hay que cargar en el panel (Edge Functions → Secrets):
//   GDAR_AVISOS_SECRETO   el que muestra el último select de avisos_automaticos.sql
//   EMAILJS_SERVICE_ID    los mismos del módulo Notificaciones
//   EMAILJS_TEMPLATE_ID
//   EMAILJS_PUBLIC_KEY
//   EMAILJS_PRIVATE_KEY   EmailJS → Account → Security (y activar «Allow EmailJS
//                         API for non-browser applications»)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.
//
// Pedido de prueba (manda un correo aunque no haya avisos):
//   body {"prueba": true}
//
// Escrito en JavaScript simple (sin tipos) a propósito: Supabase lo acepta
// igual y pruebas/tAvisos.js puede ejecutar armarCorreo() con Node.

const NIVEL_ORDEN = { vencido: 0, urgente: 1, falta: 2, proximo: 3 };
const NIVEL_MARCA = { vencido: '🔴 VENCIDO', urgente: '🟠 URGENTE', falta: '⚠ FALTA', proximo: '🟡 Próximo' };

// Fecha de hoy en Perú, AAAA-MM-DD
function hoyLima(ahora) {
  const d = new Date((ahora || Date.now()) - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
function dmy(iso) {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-');
  return d && m && y ? d + '/' + m + '/' + y : String(iso || '');
}

// El correo: asunto y texto plano, ordenado por gravedad y agrupado por tipo
function armarCorreo(avisos, fecha) {
  const lista = [...(avisos || [])].sort((a, b) =>
    (NIVEL_ORDEN[a.nivel] ?? 9) - (NIVEL_ORDEN[b.nivel] ?? 9) ||
    (a.dias ?? 0) - (b.dias ?? 0) ||
    String(a.titulo).localeCompare(String(b.titulo), 'es'));
  const eq = lista.filter(a => a.tipo === 'equipo_doc');
  const pt = lista.filter(a => a.tipo === 'parte_falta');
  const urg = lista.filter(a => a.nivel === 'vencido' || a.nivel === 'urgente' || a.nivel === 'falta').length;
  const subject = 'GDAR · ' + lista.length + ' aviso' + (lista.length === 1 ? '' : 's') +
    ' del ' + dmy(fecha) + (urg ? ' · ' + urg + ' requiere' + (urg === 1 ? '' : 'n') + ' atención' : '');
  const linea = a => '  ' + (NIVEL_MARCA[a.nivel] || a.nivel) + '  ' + a.titulo + (a.detalle ? '\n      ' + a.detalle : '');
  const partes = ['Avisos automáticos del GDAR · ' + dmy(fecha), ''];
  if (eq.length) partes.push('DOCUMENTOS DE EQUIPOS (' + eq.length + ')', ...eq.map(linea), '');
  if (pt.length) partes.push('PARTES DE TURNO NO RECIBIDOS (' + pt.length + ')', ...pt.map(linea), '');
  partes.push('Revíselos en el GDAR: la campana 🔔 de arriba lleva a cada módulo.',
    'https://ecosermo.gdarei.com', '', '— Correo automático. No es necesario responder.');
  return { subject, message: partes.join('\n') };
}

// Avisos que le tocan a un destinatario según sus tipos
function avisosPara(avisos, destino) {
  const tipos = Array.isArray(destino && destino.tipos) ? destino.tipos : [];
  return (avisos || []).filter(a => !tipos.length || tipos.includes(a.tipo));
}

async function rest(ruta, opciones) {
  const url = Deno.env.get('SUPABASE_URL') + '/rest/v1/' + ruta;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(url, { ...(opciones || {}),
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json',
      ...((opciones && opciones.headers) || {}) } });
  if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return r.status === 204 ? null : r.json();
}

async function enviarEmailJS(para, correo) {
  const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
      template_id: Deno.env.get('EMAILJS_TEMPLATE_ID'),
      user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
      accessToken: Deno.env.get('EMAILJS_PRIVATE_KEY'),
      template_params: { to_email: para, cc_email: '', subject: correo.subject, message: correo.message }
    })
  });
  if (!r.ok) throw new Error('EmailJS ' + r.status + ': ' + (await r.text()).slice(0, 200));
}

const responder = (estado, datos) => new Response(JSON.stringify(datos), {
  status: estado, headers: { 'Content-Type': 'application/json' } });

if (typeof Deno !== 'undefined' && Deno.serve) Deno.serve(async req => {
  const secreto = Deno.env.get('GDAR_AVISOS_SECRETO');
  if (!secreto || req.headers.get('x-gdar-secreto') !== secreto) return responder(401, { error: 'no autorizado' });
  let cuerpo = {};
  try { cuerpo = await req.json(); } catch (_) { /* sin cuerpo */ }
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(cuerpo.fecha || '')) ? cuerpo.fecha : hoyLima();
  try {
    const destinos = await rest('avisos_correo?activo=eq.true&select=correo,tipos');
    if (cuerpo.prueba) {
      const correo = { subject: 'GDAR · Prueba de avisos automáticos',
        message: 'Si recibe este correo, los avisos automáticos del GDAR están bien configurados.\n\n' + new Date().toISOString() };
      for (const d of destinos) await enviarEmailJS(d.correo, correo);
      return responder(200, { prueba: true, enviados: destinos.map(d => d.correo) });
    }
    const avisos = await rest('avisos?fecha=eq.' + fecha + '&enviado_en=is.null&select=*');
    const enviados = [], ids = new Set();
    for (const d of destinos) {
      const suyos = avisosPara(avisos, d);
      if (!suyos.length) continue;
      await enviarEmailJS(d.correo, armarCorreo(suyos, fecha));
      enviados.push(d.correo + ' (' + suyos.length + ')');
      suyos.forEach(a => ids.add(a.id));
    }
    if (ids.size) await rest('avisos?id=in.(' + [...ids].join(',') + ')', {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ enviado_en: new Date().toISOString() }) });
    return responder(200, { fecha, avisos: avisos.length, enviados });
  } catch (e) {
    console.error('[avisos-diarios]', e);
    return responder(500, { error: String(e && e.message || e) });
  }
});
