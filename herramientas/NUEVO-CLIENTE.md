# Montar GDAR para una empresa nueva

El sistema es el mismo para todos los clientes. Lo único que cambia es
`js/empresa.js`: identidad, base de datos y usuarios. Todo lo demás —los 52
scripts, el HTML, los estilos— se sincroniza desde este repositorio.

Cada cliente tiene **su propio proyecto de Supabase y su propio repositorio**.
No comparten base de datos, y esa es justamente la garantía de que los datos de
una empresa no son alcanzables desde otra.

---

## 1 · Base de datos

Cree un proyecto nuevo en Supabase para el cliente. Anote la **URL** y la
**anon/publishable key** de Settings → API.

Levante el esquema. La forma más rápida es exportarlo del proyecto de un
cliente ya montado (Supabase → Database → Schema, o `pg_dump --schema-only`) y
aplicarlo en el nuevo. Los `.sql` de la carpeta `sql/` de este repositorio
cubren las migraciones sueltas que se fueron agregando.

Revise las políticas RLS antes de cargar datos reales.

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

Rellene los tres bloques: `EMPRESA` (nombre, RUC, logo), `SUPA_URL`/`SUPA_KEY`
del paso 1, y `EMPRESA_USERS` con las personas y sus áreas.

Ponga el logo del cliente en `09.-ERP/Imagenes/` y apunte `EMPRESA.logo` a él.

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

## 5 · Respaldo

Antes de que el cliente empiece a cargar datos de verdad, deje corriendo el
respaldo cada cierto tiempo:

```
node herramientas/backupSupabase.js
```

Guarda las tablas en `respaldos/`, que está en `.gitignore` — esos archivos
llevan DNI y sueldos y **no deben subirse a GitHub**. Si mueve esa carpeta,
mueva también la regla.

---

## Llevar mejoras del repo base a un cliente

```
git fetch base
git merge base/main
```

`js/empresa.js` solo se modifica en el repo del cliente y nunca en el base, así
que no genera conflicto. Si alguna vez se toca en los dos lados, conserve
siempre la versión del cliente.

Después del merge, verifique antes de subir:

```
node --check js/empresa.js
node --check js/config.js
```

## Qué NO se debe hacer

**No reutilizar la base de datos de otro cliente.** Ni "temporalmente". La
llave de Supabase y los códigos de acceso viajan en el JavaScript del
navegador: si dos empresas comparten base, cualquier usuario de una puede leer
los datos de la otra abriendo la consola.

**No editar `js/empresa.js` en el repositorio base.** Ahí vive la configuración
de ECOSERMO; si la cambia, se la lleva al siguiente cliente que clone.
