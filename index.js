// ============================================
// CRYPTO MONITOR - Multi-source
// CoinGecko + CryptoCompare (Binance bloqueado)
// ============================================

const https = require('https');

/**
 * Obtener precio de BTC desde CoinGecko (con User-Agent)
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
    
    // Intentar obtener de ambas fuentes en paralelo
    const resultados = await Promise.allSettled([
        obtenerPrecioCoinGecko(),
        obtenerPrecioCryptoCompare()
    ]);
    
    const coingecko = resultados[0];
    const cryptocompare = resultados[1];
    
    let precioCoinGecko = null;
    let precioCryptoCompare = null;
    let precioFinal = null;
    
    // Verificar CoinGecko
    if (coingecko.status === 'fulfilled') {
        precioCoinGecko = coingecko.value;
        console.log(`[${timestamp}] 💰 CoinGecko: $${precioCoinGecko.toFixed(2)}`);
    } else {
        console.log(`[${timestamp}] ⚠️  CoinGecko: ${coingecko.reason.message}`);
    }
    
    // Verificar CryptoCompare
    if (cryptocompare.status === 'fulfilled') {
        precioCryptoCompare = cryptocompare.value;
        console.log(`[${timestamp}] 💰 CryptoCompare: $${precioCryptoCompare.toFixed(2)}`);
    } else {
        console.log(`[${timestamp}] ⚠️  CryptoCompare: ${cryptocompare.reason.message}`);
    }
    
    // Determinar precio final
    if (precioCoinGecko && precioCryptoCompare) {
        // Si ambos funcionan, usar el promedio
        precioFinal = (precioCoinGecko + precioCryptoCompare) / 2;
        console.log(`[${timestamp}] 📊 Promedio: $${precioFinal.toFixed(2)}`);
    } else if (precioCoinGecko) {
        // Solo CoinGecko funciona
        precioFinal = precioCoinGecko;
        console.log(`[${timestamp}] ✅ Usando CoinGecko`);
    } else if (precioCryptoCompare) {
        // Solo CryptoCompare funciona
        precioFinal = precioCryptoCompare;
        console.log(`[${timestamp}] ✅ Usando CryptoCompare`);
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
        console.log(`[${timestamp}] ✅ Monitoreo completado`);
        
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
    console.log('⏰ Monitoreando cada 5 minutos...');
    
    // Ejecutar inmediatamente
    monitorear();
    
    // Ejecutar cada 5 minutos
    setInterval(monitorear, 5 * 60 * 1000);
}

// Iniciar
iniciar();