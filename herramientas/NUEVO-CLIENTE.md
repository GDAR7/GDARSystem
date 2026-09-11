# Montar GDAR para una empresa nueva

El sistema es el mismo para todos los clientes. Lo único que cambia es
`js/empresa.js`: identidad, base de datos, convenciones del contrato, qué
módulos contrató y quiénes entran. Todo lo demás —los 59 scripts, el HTML, los
estilos— se sincroniza desde este repositorio.

Cada cliente tiene **su propio proyecto de Supabase y su propio repositorio**.
No comparten base de datos, y esa es justamente la garantía de que los datos de
una empresa no son alcanzables desde otra.

---

## 1 · Base de datos

El esquema vive versionado en `supabase/migrations/`. **No lo copie de otro
cliente.** Clonar con `pg_dump` fue el procedimiento anterior y es lo que hace
que dos bases terminen en estados distintos sin que nadie sepa cuál es cuál;
a partir del segundo cliente eso vuelve imposible dar soporte.

```
npm install                                   # trae el CLI de Supabase fijado
npx supabase login                            # con la cuenta dueña de los proyectos
npx supabase projects create gdar-<cliente> --region us-east-1
npx supabase link --project-ref <ref-nuevo>
```

Anote la **URL** y la **anon/publishable key** de Settings → API, y ponga la
URL ya mismo en `SUPA_URL_PROD` de `js/empresa.js` (el resto del archivo se
rellena en el paso 3). `npm run db:push` pasa por `herramientas/migrar.js`,
que se niega a migrar un proyecto que `js/empresa.js` no reconozca: el
enlace de `supabase/.temp` queda guardado de la última vez, y nadie se
acuerda de a cuál apuntaba.

```
npm run db:push -- --produccion --sin-respaldo   # la primera vez: base vacía
```

`--produccion` porque lo es, y hay que pedirlo. `--sin-respaldo` solo esta
primera vez, porque una base vacía no tiene nada que respaldar. En adelante,
cada `db:push -- --produccion` respalda antes de tocar el esquema, y si el
respaldo falla no migra.

El cierre de RLS es una migración más, así que la base nace cerrada — no
depende de que alguien se acuerde de ejecutar un script. Compruébelo antes de
cargar datos reales:

```
npm run db:advisors
node herramientas/probarAcceso.js
```

### Cuando el esquema cambia

Nunca edite tablas a mano en el SQL Editor: el cambio quedaría solo en esa base.

```
npm run db:diff -- nombre_del_cambio    # captura el cambio como migración
npm run db:push                         # lo aplica a la base enlazada
```

Suba la migración al repositorio base y aplíquela a cada cliente con
`link` + `db:push`. Así todas las bases avanzan por el mismo camino y siempre
se sabe en qué punto está cada una.

> Los `.sql` sueltos de la carpeta `sql/` son el registro de lo que se aplicó
> antes de versionar el esquema, más los diagnósticos de solo lectura
> (`auditoria_rls.sql`, `diagnostico_duplicados.sql`) y la red de emergencia
> (`rls_revertir.sql`). No se ejecutan en un alta: ya vienen dentro de la
> migración inicial.

## 2 · Repositorio

```
# Un repo nuevo en GitHub, por ejemplo GDAR-otraempresa
git clone https://github.com/GDAR7/GDARSystem.git gdar-otraempresa
cd gdar-otraempresa
git remote rename origin base                 # el repo base, de donde llegan mejoras
git remote add origin https://github.com/GDAR7/GDAR-otraempresa.git
```

Deje `base` apuntando a GDARSystem: es de donde traerá las correcciones más
adelante.

## 3 · Configuración

```
cp js/empresa.ejemplo.js js/empresa.js
```

Rellene los bloques que trae, todos comentados en el propio archivo:

| bloque | qué es |
|---|---|
| `EMPRESA` | nombre corto, RUC, razón social, sede y logo |
| `SUPA_URL_PROD` / `SUPA_KEY_PROD` | la base del paso 1 |
| `SUPA_URL_DEV` / `SUPA_KEY_DEV` | la base de pruebas; si no tiene, repita la de producción |
| `EMPRESA_CORTE` / `EMPRESA_DIAS_MES` | las convenciones del contrato, abajo |
| `EMPRESA_VAL_RESPALDO` | déjelo en `false`, ver §3.2 |
| `EMPRESA_PLAN` | qué contrató |
| `EMPRESA_USERS` | las personas y sus áreas |

Copie **tal cual** el bloque final, el que repinta la pantalla: `index.html`
trae los textos del primer cliente como valor por defecto, y sin ese bloque el
cliente nuevo mostraría el nombre de otra empresa en su pantalla de acceso, en
el título de la pestaña y en las firmas del reporte diario.

### 3.1 · Las convenciones del contrato

`EMPRESA_CORTE` es el día en que abre el período con el que se valoriza: 21
significa «del 21 de un mes al 20 del siguiente», y 1 el mes calendario.
`EMPRESA_DIAS_MES` es el divisor que pasa días-hombre a mes-hombre.

Los dos cambian **lo que se le factura al cliente**. Confírmelos contra el
contrato antes de la primera valorización, no después.

### 3.2 · Las partidas de la valorización

`js/valPresupuesto.js` lleva dentro, como respaldo, el presupuesto contractual
del PRIMER cliente. `EMPRESA_VAL_RESPALDO=false` lo desactiva, y así debe
quedarse: en `true`, este cliente valorizaría con los precios de otra empresa y
el error saldría en un documento firmado.

Las partidas propias van a la tabla `val_presupuesto`, que la migración crea
vacía. Tome `sql/val_presupuesto_ecosermo.sql` como molde —es de ECOSERMO, no
lo ejecute— y escriba el del cliente con sus propios precios.

### Qué contrató

No todas las empresas compran lo mismo. `EMPRESA_PLAN` recorta el sistema a lo
que se le vendió, y lo que quede fuera no aparece en el menú de nadie por más
permisos que tenga la persona:

```js
const EMPRESA_PLAN={
  nombre:'Operación',
  areas:['administracion','almacenLogistica','controlEquipos'],
  modulos:['histograma']          // sueltos, del área que sean
};
```

`areas:null` y `modulos:null` significan «todo», que es lo que tiene ECOSERMO.
Las áreas válidas salen de `GDAR_AREAS` y los módulos de `GDAR_MODULOS`, los
dos en `js/registro.js`.

Anote el mismo recorte en el registro de clientes, que es donde se factura:

```
node herramientas/clientes.js alta
```

> **Esto decide qué se ofrece, no a qué se puede llegar.** El JavaScript viaja
> al navegador y cualquiera puede leerlo. Si un módulo no debe ser alcanzable
> de ninguna manera, sus tablas no van en la base de ese cliente — eso sí es
> una cerradura, y lo controlan las migraciones y las políticas RLS.

Ponga el logo del cliente en `09.-ERP/Imagenes/` y apunte `EMPRESA.logo` a él.

### 3.3 · Sellar antes de subir

Cada vez que cambie un archivo de `js/`, de `css/` o el logo:

```
npm run sellar
```

Reescribe `index.html` marcando qué scripts pertenecen a módulos contratados
—los del plan se descargan, el resto no— y le pone a cada archivo un sello con
su contenido (`?v=a1b2c3d4`). Ese sello es lo que hace que el navegador se
entere de que hay una versión nueva.

Importa porque el sistema instala un *service worker* (`sw.js`) que guarda los
archivos en el equipo para que funcione sin señal. Sin sellar, ese service
worker seguiría sirviendo la versión anterior, y quien ya hubiera entrado una
vez no vería el cambio nunca. `npm test` se niega a pasar si algún sello está
viejo, así que no depende de que alguien se acuerde.

## 4 · Dominio

En Cloudflare, sobre `gdarei.com`:

```
Tipo    CNAME
Nombre  <cliente>              →  <cliente>.gdarei.com
Destino gdar7.github.io
Proxy   DNS only  ← nube GRIS, no naranja
```

El proxy activado impide que GitHub emita el certificado HTTPS. Es el error más
frecuente de este paso.

En la raíz del repositorio del cliente, el archivo `CNAME` con una sola línea:

```
cliente.gdarei.com
```

Suba todo. GitHub detecta el CNAME y configura el dominio solo; después, en
Settings → Pages, marque **Enforce HTTPS** cuando la casilla se habilite.

Compruebe los dos extremos:

```
node herramientas/verificarDominio.js cliente.gdarei.com
```

## 5 · Credenciales de las herramientas

Las herramientas de `herramientas/` necesitan la `service_role` del proyecto.
Esa llave **salta todas las políticas RLS**: con ella se lee y se escribe todo.

```
cp .env.example .env
```

Rellene lo que vaya a usar. `.env` está en `.gitignore` y este repositorio es
público: si esa llave se filtra, se filtran los DNI, los sueldos y las cuentas
bancarias de la gente.

Ojo con cuál copia de Supabase → Settings → API. La *anon / publishable* es la
que va en el navegador y con RLS cerrado no lee ni una fila — es exactamente el
error que dejó el respaldo escribiendo archivos vacíos durante meses.

## 6 · Respaldo

Antes de que el cliente empiece a cargar datos de verdad:

```
node herramientas/backupSupabase.js
```

Guarda las tablas en `respaldos/`, que está en `.gitignore` — esos archivos
llevan DNI y sueldos y **no deben subirse a GitHub**. Si prefiere otro destino,
`GDAR_RESPALDOS` en el `.env` lo apunta a donde quiera.

No se conforma con terminar sin error: se niega a empezar si la llave es la
publicable, avisa si todas las tablas vinieron vacías, y compara contra el
respaldo anterior para detectar una tabla que se vació. Sale con código 1 si
algo de eso pasa.

**Que no dependa de que alguien se acuerde.** El respaldo estuvo roto meses
justamente por eso. `.github/workflows/respaldo.yml` lo corre solo todos los
días; los pasos para activarlo están en el encabezado de ese archivo.

---

## Llevar mejoras del repo base a un cliente

```
git fetch base
git merge base/main
```

`js/empresa.js` solo se modifica en el repo del cliente y nunca en el base, así
que no genera conflicto. Si alguna vez se toca en los dos lados, conserve
siempre la versión del cliente.

Después del merge, selle y verifique antes de subir:

```
npm run sellar              # sellos y qué scripts se descargan, según el plan
npm test                    # sintaxis, choques de nombres, botones muertos y las 59 suites
```

Si el merge trajo migraciones nuevas, aplíquelas también a la base del cliente:

```
npx supabase link --project-ref <ref-del-cliente>
npm run db:push
```

El código y el esquema viajan juntos: subir uno sin el otro deja la aplicación
pidiendo columnas que no existen.

## Qué NO se debe hacer

**No reutilizar la base de datos de otro cliente.** Ni "temporalmente". La
llave de Supabase y los códigos de acceso viajan en el JavaScript del
navegador: si dos empresas comparten base, cualquier usuario de una puede leer
los datos de la otra abriendo la consola.

**No editar `js/empresa.js` en el repositorio base.** Ahí vive la configuración
de ECOSERMO; si la cambia, se la lleva al siguiente cliente que clone.
