// ============================================
// CRYPTO MONITOR - Railway Worker (DEBUG)
// ============================================

const https = require('https');

/**
 * Obtener precio de BTC desde Binance
 */
function obtenerPrecioBinance() {
    return new Promise((resolve, reject) => {
        const url = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('🔎 Respuesta Binance (raw):', data.substring(0, 200));
                try {
                    const json = JSON.parse(data);
                    console.log('🔎 Respuesta Binance (parsed):', json);
                    resolve(parseFloat(json.price));
                } catch (error) {
                    console.error('❌ Error parseando Binance:', error.message);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('❌ Error de conexión Binance:', error.message);
            reject(error);
        });
    });
}

/**
 * Obtener precio de BTC desde CoinGecko
 */
function obtenerPrecioCoinGecko() {
    return new Promise((resolve, reject) => {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('🔎 Respuesta CoinGecko (raw):', data.substring(0, 200));
                try {
                    const json = JSON.parse(data);
                    console.log('🔎 Respuesta CoinGecko (parsed):', json);
                    resolve(json.bitcoin.usd);
                } catch (error) {
                    console.error('❌ Error parseando CoinGecko:', error.message);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('❌ Error de conexión CoinGecko:', error.message);
            reject(error);
        });
    });
}

/**
 * Obtener precio de BTC consultando ambas fuentes
 */
async function obtenerPrecioBTC() {
    const timestamp = new Date().toISOString();
    
    // Intentar obtener de ambas fuentes en paralelo
    const resultados = await Promise.allSettled([
        obtenerPrecioBinance(),
        obtenerPrecioCoinGecko()
    ]);
    
    const binance = resultados[0];
    const coingecko = resultados[1];
    
    let precioBinance = null;
    let precioCoinGecko = null;
    let precioFinal = null;
    
    // Verificar Binance
    if (binance.status === 'fulfilled') {
        precioBinance = binance.value;
        console.log(`[${timestamp}] 💰 Binance: $${precioBinance.toFixed(2)}`);
    } else {
        console.log(`[${timestamp}] ⚠️  Binance: Error - ${binance.reason.message}`);
    }
    
    // Verificar CoinGecko
    if (coingecko.status === 'fulfilled') {
        precioCoinGecko = coingecko.value;
        console.log(`[${timestamp}] 💰 CoinGecko: $${precioCoinGecko.toFixed(2)}`);
    } else {
        console.log(`[${timestamp}] ⚠️  CoinGecko: Error - ${coingecko.reason.message}`);
    }
    
    // Determinar precio final
    if (precioBinance && precioCoinGecko) {
        precioFinal = (precioBinance + precioCoinGecko) / 2;
        console.log(`[${timestamp}] 📊 Promedio: $${precioFinal.toFixed(2)}`);
    } else if (precioBinance) {
        precioFinal = precioBinance;
        console.log(`[${timestamp}] ✅ Usando precio de Binance`);
    } else if (precioCoinGecko) {
        precioFinal = precioCoinGecko;
        console.log(`[${timestamp}] ✅ Usando precio de CoinGecko`);
    } else {
        throw new Error('No se pudo obtener precio de ninguna fuente');
    }
    
    return precioFinal;
}

/**
 * Ejecutar monitoreo
 */
async function monitorear() {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] 🔍 Iniciando monitoreo...`);
    
    try {
        const precio = await obtenerPrecioBTC();
        console.log(`[${timestamp}] ✅ Precio final BTC: $${precio.toFixed(2)}`);
        
    } catch (error) {
        console.error(`[${timestamp}] ❌ Error:`, error.message);
    }
}

// Ejecutar una sola vez (para testing)
monitorear();