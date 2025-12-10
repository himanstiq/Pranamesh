/**
 * Advanced AQI Scraper with Cloudflare Bypass
 * Uses advanced stealth techniques for bot detection evasion
 */

import { chromium, type Browser, type Page } from 'playwright';

// Cache for scraped data
let cachedScrapedData: { data: AQIScrapedData | null; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface AQIScrapedStation {
    name: string;
    aqi: number;
    pm25?: number;
    pm10?: number;
    temperature?: number;
    humidity?: number;
}

export interface AQIScrapedData {
    delhiAqi: number;
    pm25: number;
    pm10: number;
    temperature: number;
    humidity: number;
    windSpeed: number;
    lastUpdated: string;
    cities: AQIScrapedStation[];
}

let browserInstance: Browser | null = null;

// Realistic user agents for rotation
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// Realistic screen resolutions
const RESOLUTIONS = [
    { width: 1920, height: 1080 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
];

/**
 * Get a random item from array
 */
function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Random delay to simulate human behavior
 */
async function humanDelay(min: number = 500, max: number = 2000): Promise<void> {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get or create browser instance with stealth settings
 */
async function getBrowser(): Promise<Browser> {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    console.log('[Scraper] Launching stealth browser...');

    browserInstance = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--disable-web-security',
            '--disable-features=BlockInsecurePrivateNetworkRequests',
            '--window-size=1920,1080',
            '--start-maximized',
        ],
    });

    return browserInstance;
}

/**
 * Apply advanced stealth settings to page
 */
async function applyAdvancedStealth(page: Page): Promise<void> {
    const resolution = getRandomItem(RESOLUTIONS);
    const userAgent = getRandomItem(USER_AGENTS);

    // Set viewport with random resolution
    await page.setViewportSize(resolution);

    // Override user agent
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': userAgent,
    });

    // Advanced JavaScript evasions
    await page.addInitScript(() => {
        // Override navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        // Override navigator.languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en', 'hi'],
        });

        // Override navigator.plugins with realistic plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const plugins = [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
                ];
                const pluginArray = Object.create(PluginArray.prototype);
                plugins.forEach((p, i) => {
                    const plugin = Object.create(Plugin.prototype);
                    Object.defineProperty(plugin, 'name', { get: () => p.name });
                    Object.defineProperty(plugin, 'filename', { get: () => p.filename });
                    Object.defineProperty(plugin, 'description', { get: () => p.description });
                    pluginArray[i] = plugin;
                });
                Object.defineProperty(pluginArray, 'length', { get: () => plugins.length });
                return pluginArray;
            },
        });

        // Override permissions.query
        const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
        window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
            parameters.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
                : originalQuery(parameters);

        // Add chrome object
        // @ts-expect-error - adding chrome property for detection evasion
        window.chrome = {
            runtime: {},
            loadTimes: () => ({}),
            csi: () => ({}),
            app: {},
        };

        // Override WebGL vendor and renderer
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
            if (parameter === 37445) return 'Google Inc. (NVIDIA)';
            if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)';
            return getParameter.call(this, parameter);
        };

        // Override WebGL2 vendor and renderer
        const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
            if (parameter === 37445) return 'Google Inc. (NVIDIA)';
            if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)';
            return getParameter2.call(this, parameter);
        };

        // Override timezone
        const originalDateTimeFormat = Intl.DateTimeFormat;
        // @ts-expect-error - overriding DateTimeFormat for timezone spoofing
        Intl.DateTimeFormat = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
            options = options || {};
            options.timeZone = options.timeZone || 'Asia/Kolkata';
            return new originalDateTimeFormat(locales, options);
        };
    });
}

/**
 * Simulate human-like mouse movements
 */
async function simulateHumanBehavior(page: Page): Promise<void> {
    const viewport = page.viewportSize();
    if (!viewport) return;

    // Random mouse movements
    for (let i = 0; i < 3; i++) {
        const x = 100 + Math.random() * (viewport.width - 200);
        const y = 100 + Math.random() * (viewport.height - 200);
        await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 20) });
        await humanDelay(300, 800);
    }

    // Random scroll
    const scrollAmount = 100 + Math.random() * 300;
    await page.mouse.wheel(0, scrollAmount);
    await humanDelay(500, 1000);
    await page.mouse.wheel(0, -scrollAmount / 2);
}

/**
 * Wait for Cloudflare challenge to complete
 */
async function waitForCloudflare(page: Page, maxWaitTime: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        const content = await page.content();

        // Check if Cloudflare challenge is present
        const isChallenge =
            content.includes('Checking your browser') ||
            content.includes('Just a moment') ||
            content.includes('cf-challenge') ||
            content.includes('cf_chl_opt') ||
            content.includes('challenge-platform');

        if (!isChallenge) {
            console.log('[Scraper] Cloudflare challenge passed!');
            return true;
        }

        console.log('[Scraper] Waiting for Cloudflare challenge...');
        await simulateHumanBehavior(page);
        await humanDelay(2000, 4000);
    }

    console.log('[Scraper] Cloudflare challenge timeout');
    return false;
}

/**
 * Scrape AQI data from aqi.in Delhi dashboard
 * Enhanced with advanced Cloudflare bypass techniques
 */
export async function scrapeAQIIn(): Promise<AQIScrapedData | null> {
    // Check cache first
    if (cachedScrapedData && Date.now() - cachedScrapedData.timestamp < CACHE_DURATION) {
        console.log('[Scraper] Returning cached scraped data');
        return cachedScrapedData.data;
    }

    let page: Page | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Scraper] Starting scrape attempt ${attempt}/${maxRetries}...`);
            const browser = await getBrowser();

            // Create new context with unique fingerprint
            const context = await browser.newContext({
                userAgent: getRandomItem(USER_AGENTS),
                viewport: getRandomItem(RESOLUTIONS),
                locale: 'en-US',
                timezoneId: 'Asia/Kolkata',
                geolocation: { latitude: 28.6139, longitude: 77.2090 }, // Delhi
                permissions: ['geolocation'],
            });

            page = await context.newPage();

            // Apply advanced stealth settings
            await applyAdvancedStealth(page);

            // Navigate to the page
            console.log('[Scraper] Navigating to aqi.in...');
            await page.goto('https://www.aqi.in/dashboard/india/delhi', {
                waitUntil: 'networkidle',
                timeout: 60000,
            });

            // Wait for initial load
            await humanDelay(2000, 4000);

            // Handle Cloudflare challenge if present
            const cloudflareCleared = await waitForCloudflare(page);
            if (!cloudflareCleared) {
                console.log(`[Scraper] Cloudflare blocked attempt ${attempt}`);
                await page.close();
                await context.close();
                page = null;
                continue;
            }

            // Simulate human behavior
            await simulateHumanBehavior(page);

            // Extract AQI data
            console.log('[Scraper] Extracting AQI data...');

            const data = await page.evaluate(() => {
                const extractNumber = (text: string | null): number => {
                    if (!text) return 0;
                    const match = text.match(/\d+/);
                    return match ? parseInt(match[0], 10) : 0;
                };

                // Get main AQI value
                let delhiAqi = 0;
                const aqiElements = document.querySelectorAll('[class*="aqi"], [class*="AQI"]');
                aqiElements.forEach((el) => {
                    const text = el.textContent || '';
                    const num = extractNumber(text);
                    if (num > 50 && num < 600 && num > delhiAqi) {
                        delhiAqi = num;
                    }
                });

                // Also try to find from body text
                const bodyText = document.body.innerText;

                // Look for PM2.5 value
                let pm25 = 0;
                const pm25Match = bodyText.match(/PM2\.?5\s*[:=]?\s*(\d+)/i);
                if (pm25Match) pm25 = parseInt(pm25Match[1], 10);

                const pm25Alt = bodyText.match(/(\d+)\s*µg\/m³.*PM2\.?5|PM2\.?5.*?(\d+)\s*µg\/m³/i);
                if (pm25Alt && !pm25) pm25 = parseInt(pm25Alt[1] || pm25Alt[2], 10);

                // Look for PM10 value
                let pm10 = 0;
                const pm10Match = bodyText.match(/PM10\s*[:=]?\s*(\d+)/i);
                if (pm10Match) pm10 = parseInt(pm10Match[1], 10);

                // Look for temperature
                let temperature = 0;
                const tempMatch = bodyText.match(/(\d+)\s*°C/);
                if (tempMatch) temperature = parseInt(tempMatch[1], 10);

                // Look for humidity
                let humidity = 0;
                const humMatch = bodyText.match(/Humidity\s*(\d+)|(\d+)\s*%\s*Humidity/i);
                if (humMatch) humidity = parseInt(humMatch[1] || humMatch[2], 10);

                // Look for wind speed
                let windSpeed = 0;
                const windMatch = bodyText.match(/(\d+)\s*km\/h/i);
                if (windMatch) windSpeed = parseInt(windMatch[1], 10);

                // Get cities/stations data
                const cities: { name: string; aqi: number }[] = [];
                const cityLinks = document.querySelectorAll('a[href*="/dashboard/india/"]');
                cityLinks.forEach((link) => {
                    const text = link.textContent || '';
                    const aqiMatch = text.match(/(\d{2,3})/);
                    const nameMatch = text.match(/^([A-Za-z\s]+)/);
                    if (aqiMatch && nameMatch) {
                        const aqi = parseInt(aqiMatch[1], 10);
                        const name = nameMatch[1].trim();
                        if (aqi > 0 && aqi < 600 && name.length > 2) {
                            cities.push({ name, aqi });
                        }
                    }
                });

                return {
                    delhiAqi,
                    pm25,
                    pm10,
                    temperature,
                    humidity,
                    windSpeed,
                    cities,
                };
            });

            console.log('[Scraper] Scraped data:', data);

            // Validate data
            if (data.delhiAqi === 0) {
                console.log(`[Scraper] No AQI data found on attempt ${attempt}`);
                await page.close();
                await context.close();
                page = null;
                continue;
            }

            const result: AQIScrapedData = {
                delhiAqi: data.delhiAqi,
                pm25: data.pm25 || Math.round(data.delhiAqi * 0.7),
                pm10: data.pm10 || Math.round(data.delhiAqi * 1.1),
                temperature: data.temperature || 15,
                humidity: data.humidity || 70,
                windSpeed: data.windSpeed || 10,
                lastUpdated: new Date().toISOString(),
                cities: data.cities || [],
            };

            // Cache the result
            cachedScrapedData = {
                data: result,
                timestamp: Date.now(),
            };

            console.log(`[Scraper] Successfully scraped: AQI=${result.delhiAqi}, PM2.5=${result.pm25}, PM10=${result.pm10}`);

            await page.close();
            await context.close();
            return result;

        } catch (error) {
            console.error(`[Scraper] Error on attempt ${attempt}:`, error);
            if (page) {
                try { await page.close(); } catch { /* ignore */ }
            }

            if (attempt === maxRetries) {
                console.error('[Scraper] All attempts failed');
                return null;
            }

            await humanDelay(3000, 5000);
        }
    }

    return null;
}

/**
 * Close browser instance
 */
export async function closeBrowser(): Promise<void> {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
}

/**
 * Clear cached data
 */
export function clearScraperCache(): void {
    cachedScrapedData = null;
}
