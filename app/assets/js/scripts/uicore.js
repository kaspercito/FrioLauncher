/**
 * Core UI functions are initialized in this file.
 */
// Requirements
const $                              = require('jquery')
const {ipcRenderer, shell, webFrame} = require('electron')
const remote                         = require('@electron/remote')
const isDev                          = require('./assets/js/isdev')
const { LoggerUtil }                 = require('helios-core')
const Lang                           = require('./assets/js/langloader')

const loggerUICore             = LoggerUtil.getLogger('UICore')
const loggerAutoUpdater        = LoggerUtil.getLogger('AutoUpdater')

// Seguridad básica
process.traceProcessWarnings = true
process.traceDeprecation = true
window.eval = global.eval = function () { throw new Error('window.eval() no está permitido.') }

// Advertencia al abrir DevTools
remote.getCurrentWebContents().on('devtools-opened', () => {
    console.log('%cThe console is dark and full of terrors.', 'color: white; -webkit-text-stroke: 4px #a02d2a; font-size: 60px; font-weight: bold')
    console.log('%cSi te pidieron pegar algo aquí, te están estafando.', 'font-size: 16px')
    console.log('%cCierra esta ventana si no sabes exactamente qué haces.', 'font-size: 16px')
})

// Deshabilitar zoom
webFrame.setZoomLevel(0)
webFrame.setVisualZoomLevelLimits(1, 1)

// ============================================================
// ACTUALIZACIONES AUTOMÁTICAS vía GitHub Releases (2025)
// Ya está 100% adaptado a tu repo kaspercito/FrioLauncher
// ============================================================
const UPDATE_REPO = 'kaspercito/FrioLauncher'  // ← Tu repo exacto
const UPDATE_URL  = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`

let checkingUpdate = false

async function checkForLauncherUpdate() {
    if (checkingUpdate || isDev) return
    checkingUpdate = true

    try {
        const response = await fetch(UPDATE_URL, {
            headers: { 'User-Agent': 'FrioLauncher-Updater' }
        })
        const data = await response.json()

        if (!response.ok || data.message) {
            loggerAutoUpdater.warn('No se pudo contactar con GitHub Releases.')
            settingsUpdateButtonStatus('Error al buscar actualización')
            checkingUpdate = false
            return
        }

        const latestTag     = data.tag_name.replace(/^v/, '')  // v1.0.1 → 1.0.1
        const currentVersion = remote.app.getVersion()

        if (compareVersions(latestTag, currentVersion) > 0) {
            loggerAutoUpdater.info(`Nueva versión disponible: ${currentVersion} → ${latestTag}`)

            populateSettingsUpdateInformation({
                version: latestTag,
                releaseName: data.name || `Frio Launcher ${latestTag}`,
                releaseNotes: data.body || 'Sin notas de esta versión.',
                downloadUrl: `https://github.com/${UPDATE_REPO}/releases/download/v${latestTag}/FrioLauncher-setup-${latestTag}.exe`
            })

            settingsUpdateButtonStatus('¡Actualización disponible!', false, () => {
                shell.openExternal(`https://github.com/${UPDATE_REPO}/releases/latest`)
            })

            showUpdateUI({ version: latestTag })
        } else {
            loggerAutoUpdater.info('El launcher está actualizado.')
            settingsUpdateButtonStatus('Estás al día')
        }
    } catch (err) {
        loggerAutoUpdater.error('Error comprobando actualización:', err)
        settingsUpdateButtonStatus('Error de conexión')
    }

    checkingUpdate = false
}

// Comparar versiones semánticas
function compareVersions(a, b) {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0
        const nb = pb[i] || 0
        if (na > nb) return 1
        if (na < nb) return -1
    }
    return 0
}

// Mostrar notificación visual de actualización
function showUpdateUI(info) {
    const seal = document.getElementById('image_seal_container')
    if (seal) {
        seal.setAttribute('update', 'true')
        seal.style.cursor = 'pointer'
        seal.onclick = () => {
            switchView(getCurrentView(), VIEWS.settings, 500, 500, () => {
                settingsNavItemListener(document.getElementById('settingsNavUpdate'), false)
            })
        }
    }
}

// Chequeo automático al iniciar y cada 30 minutos
if (!isDev) {
    setTimeout(checkForLauncherUpdate, 8000)
    setInterval(checkForLauncherUpdate, 30 * 60 * 1000)
}

// ============================================================
// Resto del código original (botones cerrar, minimizar, etc.)
// ============================================================

document.addEventListener('readystatechange', function () {
    if (document.readyState === 'interactive') {
        loggerUICore.info('UICore Initializing..')

        // Botón cerrar
        Array.from(document.getElementsByClassName('fCb')).forEach(val => {
            val.addEventListener('click', () => remote.getCurrentWindow().close())
        })

        // Botón maximizar/restaurar
        Array.from(document.getElementsByClassName('fRb')).forEach(val => {
            val.addEventListener('click', () => {
                const win = remote.getCurrentWindow()
                win.isMaximized() ? win.unmaximize() : win.maximize()
                document.activeElement.blur()
            })
        })

        // Botón minimizar
        Array.from(document.getElementsByClassName('fMb')).forEach(val => {
            val.addEventListener('click', () => {
                remote.getCurrentWindow().minimize()
                document.activeElement.blur()
            })
        })

        // Quitar foco de botones sociales
        Array.from(document.getElementsByClassName('mediaURL')).forEach(val => {
            val.addEventListener('click', () => document.activeElement.blur())
        })

    } else if (document.readyState === 'complete') {
        // Ajustes de ancho (tus valores originales)
        document.getElementById('launch_details').style.maxWidth = '266.01px'
        document.getElementById('launch_progress').style.width = '170.8px'
        document.getElementById('launch_details_right').style.maxWidth = '170.8px'
        document.getElementById('launch_progress_label').style.width = '53.21px'
    }
}, false)

// Abrir enlaces externos
$(document).on('click', 'a[href^="http"]', function (event) {
    event.preventDefault()
    shell.openExternal(this.href)
})

// Ctrl + Shift + I = DevTools
document.addEventListener('keydown', e => {
    if ((e.key === 'I' || e.key === 'i') && e.ctrlKey && e.shiftKey) {
        remote.getCurrentWindow().toggleDevTools()
    }
})