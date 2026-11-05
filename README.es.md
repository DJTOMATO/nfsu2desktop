<p align="center">
  <img src="icon.png" alt="Underground 2 Revived" width="120" height="120">
</p>

<h1 align="center">NFSU2 Desktop</h1>

<p align="center">
  Cliente de escritorio <b>no oficial</b> para <a href="https://nfsu2.xyz/">Underground 2 Revived</a> (Need for Speed: Underground 2).<br>
  <a href="README.md">English</a> · <b>Español</b>
</p>

<p align="center">
  <a href="https://github.com/DJTOMATO/nfsu2desktop/releases"><b>Descargar Instalador (Releases)</b></a> ·
  <a href="https://nfsu2.xyz/">Sitio Web</a> ·
  <a href="https://github.com/DJTOMATO/nfsu2desktop/issues">Reportar un Problema</a> ·
  <a href="https://ko-fi.com/lenabot"><b>Donar en Ko-fi</b></a>
</p>

> [!IMPORTANT]
> **Cliente no oficial:** Este proyecto es una iniciativa comunitaria independiente y **no está afiliado, respaldado, mantenido ni asociado** con los creadores u operadores de [nfsu2.xyz](https://nfsu2.xyz/) ni con Electronic Arts.

---

## ¿Por qué usar un cliente de escritorio?

[Underground 2 Revived](https://nfsu2.xyz/) es una adaptación web del legendario juego de carreras de 2004 *Need for Speed: Underground 2*, ejecutándose directamente en navegadores modernos mediante recompilación estática (`NFSU2Recomp`), WebAssembly y WebGPU. Aunque funciona en navegadores web tradicionales, jugar desde una pestaña común genera varias limitaciones molestas durante las partidas y el modo online:

- **Throttling en segundo plano al hacer Alt+Tab:** Los navegadores limitan drásticamente el uso de CPU y timers en pestañas inactivas o minimizadas. Si salís un momento a Discord, a cambiar de música o consultar un mapa, podés desincronizarte o caerte de la sesión online (Free Roam o carreras).
- **GPU integrada en lugar de dedicada:** En muchas notebooks el navegador predetermina los gráficos integrados de bajo consumo en lugar de tu placa dedicada NVIDIA o AMD.
- **Suspensión de pantalla al jugar con mando o volante:** Al conducir con un joystick o volante sin tocar teclado ni mouse, Windows puede suspender la pantalla en plena carrera.
- **Conflictos con la captura de pantalla (F12):** Los navegadores abren las herramientas de desarrollador al presionar `F12`, interfiriendo con la función de captura nativa del juego.

Este cliente de escritorio empaqueta `nfsu2.xyz` en un entorno Electron limpio y de alto rendimiento con aceleración forzada en placa dedicada, sin throttling en segundo plano y con prevención de suspensión automática.

## Descarga e instalación

Podés bajar el último instalador `Underground 2 Revived Setup.exe` directamente desde la [**página de Releases**](https://github.com/DJTOMATO/nfsu2desktop/releases).

## Qué trae configurado por dentro

- **Uso forzado de GPU dedicada:** Inicia con `force_high_performance_gpu`, `ignore-gpu-blocklist`, `enable-unsafe-webgpu`, `enable-gpu-rasterization`, `enable-zero-copy` y `enable-oop-rasterization` para que Dawn/WebGPU utilice tu placa de video dedicada con presentación zero-copy.
- **Sin límite en segundo plano:** Desactiva por completo el throttling de rendimiento (`disable-renderer-backgrounding`, `disable-background-timer-throttling`, `disable-backgrounding-occluded-windows`, `backgroundThrottling: false`), permitiendo hacer Alt+Tab libremente sin perder la conexión en salas multijugador o Free Roam.
- **Rendimiento completo de WebAssembly:** Soporte nativo para WebAssembly JSPI (`WebAssembly.Suspending`), manejo de excepciones (`try_table`), tail calls y SIMD.
- **Caché local de 3 GB en disco:** Amplia memoria caché en disco para mantener los ~1.8 GB de archivos y texturas del juego descargados localmente, garantizando arranques rápidos sin descargas repetidas.
- **Discord Rich Presence (RPC):** Muestra lo que estás haciendo en vivo en tu perfil de Discord (paseando por Bayview con otros pilotos, puntuación de derrapes, carreras multijugador, tuneando en el taller o en modo foto).
- **Actualizaciones Automáticas Instantáneas (`nfsu2mod.js`):** Sincroniza las últimas funciones de Discord y mejoras del juego automáticamente al abrir la app, disfrutando de novedades al instante sin tener que descargar o reinstalar el cliente.
- **Perfiles persistentes y guardado en la nube:** Tus perfiles guardados, configuraciones y credenciales del baúl en la nube quedan seguros en tu almacenamiento local.
- **Bloqueo de suspensión de pantalla:** Evita que Windows apague la pantalla mientras el cliente está abierto, asegurando una experiencia fluida con mandos y volantes.
- **Atajos optimizados:** Preserva la tecla `F12` para las capturas de pantalla integradas en el juego y asigna las herramientas de desarrollador a `Ctrl + Shift + I`.

## Requisitos del sistema / Especificaciones

| Componente | Mínimo | Recomendado (60 - 120 FPS Widescreen) |
| :--- | :--- | :--- |
| **Sistema Operativo** | Windows 10 (64 bits, 1909+) | Windows 10 / 11 (64 bits) |
| **Procesador (CPU)** | 4 núcleos x86_64 | 6+ núcleos modernos (Ryzen 5 / Core i5 o superior) |
| **Placa de video (GPU)** | Compatible con DirectX 12 / Vulkan y WebGPU | Placa dedicada NVIDIA (GTX 1060 / serie RTX) o AMD (RX 580 / RX 6000+) |
| **Memoria RAM** | 4 GB | 8 GB o más |
| **Almacenamiento** | ~300 MB para el cliente + hasta 3 GB de caché | SSD con 3.5 GB libres |
| **Conexión** | Banda ancha (descarga assets bajo demanda) | Conexión estable para Free Roam y carreras online |

## Atajos de teclado

| Tecla | Acción |
| :--- | :--- |
| `F11` / `Alt + Enter` | Pantalla completa nativa de la ventana |
| `F5` / `Ctrl + R` | Recargar página |
| `Ctrl + Shift + I` | Abrir/cerrar herramientas de desarrollo (DevTools) |
| `F9` | Menú de radio personalizada (elegir carpeta de música local) |
| `F12` | Captura de pantalla dentro del juego |
| `Enter` | Jugar / Iniciar (en la pantalla inicial) |
| `Esc` / `Start` | Pausa / Menú del garaje (dentro del juego) |

## Compilar desde el código fuente

Necesitás tener instalado [Node.js](https://nodejs.org/) (recomendado v20 o superior) y npm.

```bash
git clone https://github.com/DJTOMATO/nfsu2desktop.git
cd nfsu2desktop
npm install
```

Para abrir el cliente en modo desarrollo:

```bash
npm start
```

Para compilar los instaladores de tu plataforma (se guardan en `dist/`):

```bash
# Windows x64 (Instalador NSIS + ZIP portable)
npm run build:win

# Windows ARM64
npm run build:win:arm64

# Linux (AppImage + .deb)
npm run build:linux

# macOS (.dmg + .zip)
npm run build:mac
```

## Apoyo y donaciones

Si el cliente te resulta útil y querés colaborar con el desarrollo y mantenimiento del proyecto, podés invitar un café. ¡Cualquier ayuda es más que bienvenida!

<p align="center">
  <a href="https://ko-fi.com/lenabot">
    <img src="https://img.shields.io/badge/Ko--fi-Apoyar%20en%20Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Apoyar en Ko-fi">
  </a>
</p>

Podés donar directamente en [**ko-fi.com/lenabot**](https://ko-fi.com/lenabot). Mirá [SPONSORS.md](SPONSORS.md) para más información y formas de colaborar.

## Aviso legal

Este proyecto es un **cliente de escritorio no oficial** desarrollado por la comunidad para [nfsu2.xyz](https://nfsu2.xyz/). Es un proyecto independiente y **no está afiliado, mantenido, autorizado ni respaldado** por los creadores u operadores de [nfsu2.xyz](https://nfsu2.xyz/) ni por Electronic Arts. *Need for Speed* y *Need for Speed: Underground 2* son marcas registradas de Electronic Arts Inc. Este repositorio no aloja ni distribuye archivos protegidos por derechos de autor o copias del juego original.

