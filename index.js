// ============================================
// CRYPTO MONITOR - Railway → Hostinger
// Consulta precios y envía al backend
// ============================================

const https = require('https');

// URL de tu API en Hostinger
const API_URL = 'https://apicrypto.innovasot.com/api/v1/verificar-niveles';

/**
 * Obtener precio de BTC desde CoinGecko
 */
function obtenerPrecioCoinGecko() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.coingecko.com',
            path: '/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        
        https.get(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.bitcoin && json.bitcoin.usd) {
                        resolve(json.bitcoin.usd);
                    } else {
                        reject(new Error('Formato de respuesta inválido'));
                    }
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
 * Obtener precio de BTC desde CryptoCompare
 */
function obtenerPrecioCryptoCompare() {
    return new Promise((resolve, reject) => {
        const url = 'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD';
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.USD) {
                        resolve(json.USD);
                    } else {
                        reject(new Error('Formato de respuesta inválido'));
                    }
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
 * Obtener precio de BTC consultando múltiples fuentes
 */
async function obtenerPrecioBTC() {
    const timestamp = new Date().toISOString();
    
    const resultados = await Promise.allSettled([
        obtenerPrecioCoinGecko(),
        obtenerPrecioCryptoCompare()
    ]);
    
    const coingecko = resultados[0];
    const cryptocompare = resultados[1];
    
    let precioCoinGecko = null;
    let precioCryptoCompare = null;
    let precioFinal = null;
    
    if (coingecko.status === 'fulfilled') {
        precioCoinGecko = coingecko.value;
        console.log(`[${timestamp}] 💰 CoinGecko: $${precioCoinGecko.toFixed(2)}`);
    } else {
        console.log(`[${timestamp}] ⚠️  CoinGecko: ${coingecko.reason.message}`);
    }
    
    if (cryptocompare.status === 'fulfilled') {
        precioCryptoCompare = cryptocompare.value;
        console.log(`[${timestamp}] 💰 CryptoCompare: $${precioCryptoCompare.toFixed(2)}`);
    } else {
        console.log(`[${timestamp}] ⚠️  CryptoCompare: ${cryptocompare.reason.message}`);
    }
    
    if (precioCoinGecko && precioCryptoCompare) {
        precioFinal = (precioCoinGecko + precioCryptoCompare) / 2;
        console.log(`[${timestamp}] 📊 Promedio: $${precioFinal.toFixed(2)}`);
    } else if (precioCoinGecko) {
        precioFinal = precioCoinGecko;
        console.log(`[${timestamp}] ✅ Usando CoinGecko`);
    } else if (precioCryptoCompare) {
        precioFinal = precioCryptoCompare;
        console.log(`[${timestamp}] ✅ Usando CryptoCompare`);
    } else {
        throw new Error('No se pudo obtener precio de ninguna fuente');
    }
    
    return precioFinal;
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
 * Ejecutar monitoreo completo
 */
async function monitorear() {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] 🔍 Iniciando monitoreo...`);
    
    try {
        // PASO 1: Obtener precio de BTC
        const precio = await obtenerPrecioBTC();
        console.log(`[${timestamp}] ✅ Precio final BTC: $${precio.toFixed(2)}`);
        
        // PASO 2: Enviar al backend de Hostinger
        console.log(`[${timestamp}] 📤 Enviando al backend...`);
        const resultado = await enviarPrecioAlBackend(precio);
        
        // PASO 3: Mostrar resultado
        if (resultado.success) {
            console.log(`[${timestamp}] ✅ Respuesta del backend:`, resultado.message);
            console.log(`[${timestamp}] 📊 Operaciones revisadas: ${resultado.operaciones_revisadas}`);
            console.log(`[${timestamp}] 🔔 Alertas generadas: ${resultado.alertas_generadas}`);
            
            if (resultado.alertas && resultado.alertas.length > 0) {
                console.log(`[${timestamp}] 🎯 Detalles de alertas:`);
                resultado.alertas.forEach(alerta => {
                    console.log(`[${timestamp}]    - Operación #${alerta.operacion_id}: Nivel +${alerta.nivel}% alcanzado ($${alerta.ganancia_usd.toFixed(2)})`);
                });
            }
        } else {
            console.log(`[${timestamp}] ⚠️  Respuesta: ${resultado.message || 'Sin mensaje'}`);
        }
        
        console.log(`[${timestamp}] ✅ Monitoreo completado\n`);
        
    } catch (error) {
        console.error(`[${timestamp}] ❌ Error:`, error.message);
    }
}

/**
 * Iniciar monitoreo continuo
 */
function iniciar() {
    console.log('🚀 Crypto Monitor iniciado');
    console.log('📡 Fuentes: CoinGecko + CryptoCompare');
    console.log(`🎯 Backend: ${API_URL}`);
    console.log('⏰ Monitoreando cada 5 minutos...\n');
    
    // Ejecutar inmediatamente
    monitorear();
    
    // Ejecutar cada 5 minutos (300000 ms)
    setInterval(monitorear, 5 * 60 * 1000);
}

// Iniciar
iniciar();