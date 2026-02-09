// ============================================
// CRYPTO MONITOR - Railway Worker
// Consulta Binance cada 5 min y notifica al backend
// ============================================

const https = require('https');

// URL de tu API en Hostinger
const API_URL = 'https://apicrypto.innovasot.com/api/v1/verificar-niveles';

/**
 * Obtener precio de BTC desde Binance
 */
function obtenerPrecioBTC() {
    return new Promise((resolve, reject) => {
        const url = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(parseFloat(json.price));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Enviar precio al backend de Hostinger
 */
function enviarPrecioAlBackend(precio) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL);
        const postData = JSON.stringify({
            precio_btc: precio
        });
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

/**
 * Ejecutar monitoreo
 */
async function monitorear() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔍 Iniciando monitoreo...`);
    
    try {
        // PASO 1: Obtener precio de Binance
        const precio = await obtenerPrecioBTC();
        console.log(`[${timestamp}] 💰 Precio BTC: $${precio.toFixed(2)}`);
        
        // PASO 2: Enviar al backend
        const resultado = await enviarPrecioAlBackend(precio);
        console.log(`[${timestamp}] ✅ Respuesta del backend:`, resultado);
        
        if (resultado.alertas_generadas > 0) {
            console.log(`[${timestamp}] 🔔 ${resultado.alertas_generadas} alerta(s) generada(s)`);
        }
        
    } catch (error) {
        console.error(`[${timestamp}] ❌ Error:`, error.message);
    }
}

/**
 * Iniciar monitoreo continuo
 */
function iniciar() {
    console.log('🚀 Crypto Monitor iniciado');
    console.log('⏰ Monitoreando cada 5 minutos...\n');
    
    // Ejecutar inmediatamente
    monitorear();
    
    // Ejecutar cada 5 minutos (300000 ms)
    setInterval(monitorear, 5 * 60 * 1000);
}

// Iniciar
iniciar();