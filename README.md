# JAUC-JS · Just An Ugly Code

## Requisitos

| Necesitás | Detalle |
| --- | --- |
| Node.js con npm | Node **22.12 o superior**. Para una instalación nueva, usar una versión LTS compatible desde [nodejs.org](https://nodejs.org/en/download). |
| Navegador | Chrome, Edge o Firefox actualizado. |
| Conexión a Internet | Para descargar las dependencias la primera vez. Después, la demo funciona localmente. |
| Puertos disponibles | **4200** para el frontend y **5038** para el backend. |
| Editor | Recomendado: uno con soporte de TypeScript. Git es opcional para guardar cada refactor. |

El catálogo vive en memoria y se reinicia con el backend. El proyecto simula cotizaciones; no guarda pedidos ni modifica stock. La ejecución no requiere base de datos, cuentas, claves de API ni un archivo de variables de entorno.

## Inicio rápido en Windows

Hacé doble clic en **[iniciar.bat](iniciar.bat)**.

1. Verifica Node.js y npm.
2. Si faltan las dependencias, ejecuta `npm ci` en la raíz.
3. Abre dos terminales con sus propios logs: backend y frontend.
4. Cuando ambas estén listas, abrí **http://127.0.0.1:4200**.

Para detenerlo, presioná **Ctrl+C en cada terminal** y cerrá las ventanas. El primer inicio puede tardar mientras npm descarga paquetes. Si falla, el lanzador deja visible el error.

El archivo funciona aunque lo ejecutes desde otra carpeta y admite rutas con espacios. Cuando cambie `package-lock.json`, ejecutá `npm ci` nuevamente.

## Inicio manual: Windows, macOS o Linux

Desde la raíz de JAUC-JS:

```sh
npm ci
```

Terminal 1, desde esa misma raíz:

```sh
npm run dev:back
```

Terminal 2, también desde la raíz:

```sh
npm run dev:front
```

- Aplicación: **http://127.0.0.1:4200**
- Salud de la API: **http://127.0.0.1:5038/api/health**
- Dashboard de ejemplo: **http://127.0.0.1:5038/api/dashboard/151**

Vite reenvía `/api` al backend. Ambos servidores escuchan solamente en el equipo local. Los cambios de código se recargan automáticamente.

## Comandos de verificación

```sh
npm run typecheck
npm test
npm run build
```

O todo junto:

```sh
npm run check
```

La base incluye **29 pruebas** del servicio y de los endpoints HTTP. Los tests HTTP usan un puerto libre temporal y no requieren levantar los servidores.

Los tests llamados **LEGACY** describen comportamientos actuales, incluidos errores deliberados. Que pasen significa que el comportamiento se conserva; no certifica que esas reglas sean correctas. Al corregir un bug, cambiá explícitamente su expectativa y conservá la cobertura del resto.

### Probar lo compilado

Después de `npm run build`:

```sh
# Terminal 1, desde la raíz:
npm run start --workspace backend

# Terminal 2, desde la raíz:
npm run preview --workspace frontend
```

Detené antes los servidores de desarrollo, porque usan los mismos puertos. El backend se compila a `backend/dist` y el frontend a `frontend/dist`. La vista previa local conserva el proxy a la API; un despliegue externo necesitaría su propia configuración de alojamiento y de `/api`.

## TypeScript y dependencias

El `tsconfig.json` de la raíz contiene opciones compartidas con `strict: true`. Cada aplicación declara sus archivos y su entorno:

- Backend: `NodeNext`, módulos de Node, tipos de Node y compilación de producción separada.
- Frontend: `Bundler`, tipos del DOM y Vite, sin emitir JavaScript desde TypeScript.
- Los tests se verifican, pero quedan fuera del backend compilado.

Usá `npm run typecheck` desde la raíz. La raíz sola es una configuración base, no una aplicación. Las versiones directas están fijadas y `package-lock.json` fija el árbol de dependencias. Se eligió TypeScript 5.9.3 para este material.