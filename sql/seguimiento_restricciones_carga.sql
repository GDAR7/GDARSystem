-- ══ CARGA INICIAL: RESTRICCIONES DEL LPS (desde «Restricciones - 2026.xlsx») ══
-- Inserta las 23 restricciones de la hoja «RESTRICCIONES LOOKAHEAD» en
-- seguimiento_tareas con es_restriccion = true. Correr DESPUÉS de
-- sql/seguimiento_restricciones.sql.
--
-- · El id sigue la regla del sistema: el mayor id existente + 1, + 2…
-- · Si se corre dos veces no duplica: salta las que ya estén (mismo N° y título).
-- · Ajustes al pasar de la hoja a la tabla:
--     - Impacto Alto/Medio/Bajo → prioridad Alta/Media/Baja (vacío si no tenía).
--     - La columna «Fecha real de levantamiento» traía texto en varias filas y
--       fechas en restricciones que siguen abiertas: el texto y esas fechas van
--       al final de «Acciones / comentarios»; solo se usa como fecha real si la
--       restricción está Levantada.
--     - N° 11: Fecha de detección «31/09/2026» no existe; se cargó 30/09/2026
--     - N° 20: Fecha real «08/10/206» tiene el año mal escrito

with datos(orden, numero, titulo, fecha, actividad, tipo_restr, responsable, fecha_prom, est, restriccion_det, fecha_comp, reprog, prioridad) as (values
  (1, 1, 'No se cuenta con personal de piso suficiente para liberación de frentes y ejecución de actividades.', null, 'Concreto Ciclopeo en zona de fundación D.P.', 'Interna', 'Nohelia P.', '2026-09-25'::date, 'En gestión', 'Pendiente de afiliación 16 peones para completar score de 54.', null, 0, null),
  (2, 2, 'No se cuenta con equipo soplador de aire Leister', null, 'Instalación de Geomalla Uniaxial', 'Cliente', 'Abel. R/ Ivan M.', '2026-09-18'::date, 'En gestión', 'Se presentó la cotización el día 06/09. Pendiente de aprobación de Sponsor', null, 0, null),
  (3, 4, 'No se cuenta con volqueteros suficientespara cumplir con meta diaria de volumen transportado', null, 'Carguío y transporte relleno en D.A.', 'Interna', 'Nohelia P.', '2026-09-25'::date, 'En gestión', 'Pendiente de afiliación 12 volqueteros para completar score de 30', null, 0, null),
  (4, 5, 'No se cuenta con flexilonas para cubrir capas de material por periodo de lluvias.', null, 'Conformar y compactar relleno común en D.A.', 'Cliente', 'Elver C.', '2026-09-18'::date, 'En gestión', 'Pendiente de entrega por parte de BNV (se envió correo el con cotización, sin embargo Elver C. indicó que BNV abastecerá el insumo - correo del 13/09)', null, 0, null),
  (5, 6, 'EXC - 001 se encuentra en proceso de desmovilización.', null, 'Perfilado de talud en D.P. y D.A.', 'Interna', 'Carlos Z.', '2026-09-18'::date, 'En gestión', 'EXC - 001 se encuentra en inoperativa desde el día 30/09. Actualmente en Oyón en mantto de proveedor. 
Diagnóstico de área de mantto R3 sugiere desmovilización. (correo del 16/09)', null, 0, null),
  (6, 7, 'EXC - 004 Hyundai se encuentra en proceso de afiliación', null, 'Perfilado de talud en D.P. y D.A.', 'Interna', 'Carlos Z.', '2026-09-19'::date, 'En gestión', 'Proceso de afiliación de EXC - 004 se encuentra pendiente de firma en el check list del área de administración - campamentos.', null, 0, null),
  (7, 8, 'VOL - 001 se encuentra en proceso de desmovilización.', null, 'Carguío y transporte relleno en todos los frentes', 'Interna', 'Carlos Z.', '2026-09-20'::date, 'En gestión', 'Diagnóstico del área de mantto R3 sugiere desmovilización tras evaluación en ruta e identificación de diversas fallas (correo del 16/09).', null, 0, null),
  (8, 9, 'Adquisición de agregados', null, 'Concreto Ciclopeo y Concreto Dental en diversos frentes', 'Interna', 'Yonder M.', '2026-09-17'::date, 'Abierta', 'Se solicitó al área de almacén 02 volquetadas de arena para vaciado de concreto el día 13/09. Requerimiento se encuentra pendiente de respuesta del proveedor.', null, 0, null),
  (9, 10, 'Adquisición de cemento', null, 'Concreto Ciclopeo y Concreto Dental en diversos frentes', 'Interna', 'Yonder M.', '2026-09-18'::date, 'Abierta', 'Se solicitó al área de almacén 130 bolsas de cemento (según capacidad de camión furgón). Ofrecimiento de compra para el día 18/09 en Huacho.', null, 0, null),
  (10, 11, 'No se cuenta con materiales para lavadero 3 T.', '2026-09-30'::date, 'Lavado de material', 'Cliente', 'Elver C./ Abel R.', '2026-10-03'::date, 'Levantada', 'Se realizo la cotización al proveedor Zeifer , en el cual , este seguimiento klo esta realizando el almacenero Yonder Melendrez.

Levantamiento: Los insumos se encuentran en R3 a espera de disposición del sponsor.', null, 0, null),
  (11, 12, 'Falta de operadores de cisterna de agua y cisterna de combustible', '2026-09-28'::date, 'Mantenimiento de vías y abastecimiento de combustible', 'Interna', 'Noelia P.', '2026-10-02'::date, 'Levantada', 'Se realizo la ampliación de un operador de cisterna de combusible para cisterna de agua , pero este a la vez , se quedo solo por el descanso medico de su compañero de cisterna de combustible .

Levantamiento: Se cubrió los días de DM con apoyo de operador de mina y operador de cist. Agua R3', null, 0, null),
  (12, 13, 'Ausencia de cisterna de combustible.', '2026-09-28'::date, 'Abastecimiento de combustible  - Operaciones en general', 'Interna', 'Noelia P. / Abel R.', '2026-10-01'::date, 'Levantada', 'Se coordino con el residente de mina (Lisandro) para que nos brinde apoyo con un operador de cisterna de combustible (Lucio) , en el cual indico que apoyaria por 4 días , por lo que Noelia debe ver la posibilidad de contactar a nuestro colaborador Roy , para que regrese dentro de 4 dias al trabajo.

Levantamiento: Se cubrió los días de DM con apoyo de operador de mina y operador de cist. Agua R3', null, 0, null),
  (13, 14, 'Bombeo de agua en Dique Auxiliar.', '2026-09-26'::date, 'Dique auxiliar estribo izquierdo.', 'Cliente', 'Elver C.', '2026-10-03'::date, 'Levantada', 'Se debe definir , cual sera su tratamiento en ese sector si diariamente se tiene que bombear , coordinar con el cliente y Applus , tene rencuenta , que eso no va permitir que se continue con las actividades.

Levantamiento: Se definió procedimiento a ejecutar.', null, 0, null),
  (14, 15, 'No se cuenta con examenes de altura', '2026-09-29'::date, 'Perfilado de talud en todos los frentes de la presa de relaves. .', 'Interna', 'Noelia / Flor', '2026-10-03'::date, 'Abierta', 'Si eso se va tene que dar , eso ya se tiene que gestionar la programacion de las personas involucradas al trabajo de perfilado en el talud y otras actividades involucradas en trabajos en altura .

Avance: Pendiente de programación para el día lunes 12/10 en Natclar Oyón', null, 0, null),
  (15, 15, 'Arnes de seguridad de 4 puntos de ANCLAJE', '2026-09-28'::date, 'Perfilado de talud en todos los frentes de la presa de relaves. .', 'Interna', 'Noelia / Alfredo', '2026-10-03'::date, 'Abierta', 'Se debe gestionar con el area de seguridad , la pronta respuesta con respecto a ese pedido , ya que sin ese tipo de arnes no se va poder realizar el perfilado de talud.

Avance: Se aprobó la cotización presentada el 07/10. Se comunicó a almacén y logística. Entrega programada para el 08/10/26.', null, 0, null),
  (16, 16, 'Escaso materiales para el concreto', '2026-09-27'::date, 'Vaciado de concreto en todos los frentes de la presa de relaves .', 'Interna', 'Antony / Yonder', '2026-10-03'::date, 'Abierta', 'Se dbe estar monitoreando diariamente el tema del stock de materiales de concreto para su requerimiento muy anticipado .

Avance: Se requirió 500 bolsas de cemento adicionales y 4 volquetadas de agregado. A la fecha solo se han atendido 108 bolsas de cemento. No hay respuesta del proveedor por el agregado.', null, 0, null),
  (17, 17, 'Equipos inoperativos', '2026-09-25'::date, 'Todos los frentes', 'Interna', 'Antony / Jaime', '2026-10-03'::date, 'En gestión', 'Se debe concluir , con respecto a los volquetes 01 , cual es el informe de ese equipo , se debe incorporar el volquete 02 que no esta trabajando por camara hunter , la excavadora Hyundai se debe tener su informe y conclusiones si se va seguir con ese equipo o requier esu cambio .

Avance: VOL 001 fue desmovilizado.
VOL 002 se encuentra trabajando en R3.
EXC 004 se encuentra trabajando en R3, según area de mantto se coordinó con el proveedor realizar pruebas mecánicas en R3.', null, 0, null),
  (18, 18, 'Liberación de CAM 003 CLW-850', '2026-09-30'::date, 'Todos los frentes', 'Interna', 'Nohelia P./ Jaime A.', '2026-10-09'::date, 'En gestión', 'La CAM 003 se encuentra en proceso de inspección interna, a la fecha continúa observada por el GPS.

Fecha anotada en la hoja como levantamiento: 09/10/2026 (la restricción sigue «En gestión»).', null, 0, 'Media'),
  (19, 19, 'Cemento para concreto', '2026-10-01'::date, 'Vaciado de concreto en todos los frentes de la presa de relaves .', 'Externa', 'Yonder M.', '2026-10-09'::date, 'En gestión', 'Se solicitó 500 bolsas de cemento, de las cuales solo han sido atendidas 108 el día 07/10/26. Se propuso a Applus (Carlos Marchena) trabajar con marca alternativa "INKA", para lo cual se adquirieron 3 bolsas de cemento "INKA" e indicaron que realizarían las probetas. Sin embargo BNV (Iván Mejía) no autorizó el uso de esta marca.

Fecha anotada en la hoja como levantamiento: 10/10/2026 (la restricción sigue «En gestión»).', null, 0, 'Media'),
  (20, 20, 'Agregado para concreto', '2026-10-01'::date, 'Vaciado de concreto en todos los frentes de la presa de relaves .', 'Externa', 'Yonder M./ Andrés R.', '2026-10-08'::date, 'Abierta', 'Se solicitó 02 volquetadas de arena y 02 volquetadas de piedra de 1/2" a 3/4". Sin embargo a la fecha no se tiene respuesta del proveedor (Cantera Matichacra). Se comunicó la situación a Residencia y Gerencia de Ecosermo.

Fecha anotada en la hoja como levantamiento: 08/10/206 (año mal escrito).', null, 0, 'Alta'),
  (21, 21, 'Agregado para poza de Dique Auxiliar', '2026-10-06'::date, 'Trabajos en Poza de Dique Auxiliar', 'Externa', 'Yonder M./ Andrés R.', '2026-10-08'::date, 'Abierta', 'Se definió el procedimiento para los trabajos de drenaje en la poza del Dique Auxiliar, para lo cual se ha requerido 2m3 para muestreo de los sgtes. materiales:
- Material para Blanket, tamaño de 4” a 6”.
- Agregado para drenaje, tamaño máximo 6”.
Este requerimiento fue solicitado el 06/10/26. Sin embargo a la fecha no hay respuesta del proveedor (Cantera Matichacra). Se comunicó la situación a Residencia y Gerencia de Ecosermo.

Fecha anotada en la hoja como levantamiento: 09/10/2026 (la restricción sigue «Abierta»).', null, 0, 'Alta'),
  (22, 22, 'Flexilonas', '2026-09-11'::date, 'Todos los frentes', 'Sponsor', 'Iván M./ Elver C.', '2026-10-12'::date, 'Abierta', 'Se presentó cotizaciones de flexilonas al sponsor, las cuales no fueron aprobadas. Debido al próximo periodo de lluvias se ha insistido constantemente por este material al sponsor, teniendo como respuesta que ellos mismo comprarán las flexilonas. A la fecha no se ha abastecido del material en R3. Iván M. ha comprometido como fecha de entrega el lunes 12/10/26.

Fecha anotada en la hoja como levantamiento: 12/10/2026 (la restricción sigue «Abierta»).', null, 0, 'Media'),
  (23, 23, 'Afiliación de unidades de Caballococha', '2026-10-01'::date, 'Dique Caballococha', 'Interna', 'Geraldyn U.', '2026-10-13'::date, 'En gestión', 'Las unidades del proyecto Dique Caballococha no se encuentran afiliadas. El proceso de afiliación se encuentra en gestión a cargo del apoyo remoto de administración, Geraldyn Ugarte, a quién se le brindó la información base sobre las unidades.

Fecha anotada en la hoja como levantamiento: 10/10/2026 (la restricción sigue «En gestión»).', null, 0, 'Media')
), base as (select coalesce(max(id),0) as m from public.seguimiento_tareas)
insert into public.seguimiento_tareas
  (id, es_restriccion, numero, titulo, fecha, actividad, tipo_restr, responsable, fecha_prom, est, restriccion_det, fecha_comp, reprog, prioridad, creado_por)
select base.m + d.orden, true, d.numero, d.titulo, d.fecha, d.actividad, d.tipo_restr, d.responsable, d.fecha_prom, d.est, d.restriccion_det, d.fecha_comp, d.reprog, d.prioridad, 'Carga Excel 2026'
from datos d cross join base
where not exists (select 1 from public.seguimiento_tareas s
                  where s.es_restriccion and s.numero = d.numero and s.titulo = d.titulo);

-- Verificación: debe listar 23 restricciones
select numero, titulo, est, fecha, fecha_prom, fecha_comp, prioridad
from public.seguimiento_tareas where es_restriccion order by numero, id;
