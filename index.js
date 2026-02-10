// ============================================
// CRYPTO MONITOR - Railway Worker (TEST)
// Consulta Binance y CoinGecko
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
                try {
                    const json = JSON.parse(data);
                    resolve(json.bitcoin.usd);
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
        // Si ambos funcionan, usar el promedio
        precioFinal = (precioBinance + precioCoinGecko) / 2;
        console.log(`[${timestamp}] 📊 Promedio: $${precioFinal.toFixed(2)}`);
    } else if (precioBinance) {
        // Solo Binance funciona
        precioFinal = precioBinance;
        console.log(`[${timestamp}] ✅ Usando precio de Binance`);
    } else if (precioCoinGecko) {
        // Solo CoinGecko funciona
        precioFinal = precioCoinGecko;
        console.log(`[${timestamp}] ✅ Usando precio de CoinGecko`);
    } else {
        // Ninguno funciona
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
        console.log(`[${timestamp}] ✅ Monitoreo completado (backend aún no conectado)`);
        
    } catch (error) {
        console.error(`[${timestamp}] ❌ Error:`, error.message);
    }
}

/**
 * Iniciar monitoreo continuo
 */
function iniciar() {
    console.log('🚀 Crypto Monitor iniciado (MODO TEST)');
    console.log('📡 Consultando: Binance + CoinGecko');
    console.log('⏰ Monitoreando cada 5 minutos...');
    
    // Ejecutar inmediatamente
    monitorear();
    
    // Ejecutar cada 5 minutos
    setInterval(monitorear, 5 * 60 * 1000);
}

// Iniciar
iniciar();