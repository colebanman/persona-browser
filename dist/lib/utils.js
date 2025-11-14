"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = delay;
exports.executeJS = executeJS;
exports.waitForSelector = waitForSelector;
exports.screenshot = screenshot;
exports.getCookies = getCookies;
exports.setCookies = setCookies;
exports.logDebug = logDebug;
exports._ensureDir = _ensureDir;
exports.waitForNavigation = waitForNavigation;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const visibility_helpers_1 = require("./visibility-helpers");
/**
 * Delay execution for specified milliseconds
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Execute JavaScript in the page context
 */
async function executeJS(cdp, expression) {
    try {
        const result = await cdp.Runtime.evaluate({ expression });
        return result.result.value;
    }
    catch (error) {
        console.error('Error executing JavaScript:', error);
        throw error;
    }
}
/**
 * Wait for selector to appear with options
 */
async function waitForSelector(cdp, selector, options = {}) {
    // Support legacy timeout parameter
    const opts = typeof options === 'number'
        ? { timeout: options }
        : options;
    const timeout = opts.timeout || 30000;
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const { root } = await cdp.DOM.getDocument();
            const { nodeId } = await cdp.DOM.querySelector({
                selector,
                nodeId: root.nodeId,
            });
            if (nodeId) {
                // Check attached if required
                if (opts.attached !== false) {
                    if (!(await (0, visibility_helpers_1.isElementAttached)(cdp, nodeId))) {
                        await delay(100);
                        continue;
                    }
                }
                // Check visibility if required
                if (opts.visible === true) {
                    if (!(await (0, visibility_helpers_1.isElementVisible)(cdp, nodeId))) {
                        await delay(100);
                        continue;
                    }
                }
                else if (opts.hidden === true) {
                    if (await (0, visibility_helpers_1.isElementVisible)(cdp, nodeId)) {
                        await delay(100);
                        continue;
                    }
                }
                console.log(`Element found: ${selector}`);
                return nodeId;
            }
        }
        catch (error) {
            // Element not found yet, continue waiting
        }
        await delay(100);
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
}
/**
 * Take screenshot
 */
async function screenshot(cdp, config, filepath = 'screenshot.png', options = {}) {
    try {
        if (typeof filepath === 'object' && filepath !== null) {
            options = filepath;
            filepath = options.filepath || 'screenshot.png';
        }
        const { saveToDisk = Boolean(filepath), returnBase64 = false, } = options;
        const screenshot = await cdp.Page.captureScreenshot({
            format: 'png',
            fromSurface: true,
        });
        if (saveToDisk && filepath) {
            _ensureDir(path.dirname(filepath));
            fs.writeFileSync(filepath, screenshot.data, 'base64');
            console.log(`Screenshot saved: ${filepath}`);
        }
        if (returnBase64) {
            return {
                filepath: saveToDisk && filepath ? filepath : undefined,
                data: screenshot.data,
                mimeType: 'image/png',
            };
        }
        if (saveToDisk && filepath) {
            return filepath;
        }
        return undefined;
    }
    catch (error) {
        console.error('Error taking screenshot:', error);
        throw error;
    }
}
/**
 * Get all cookies
 */
async function getCookies(cdp) {
    try {
        const { cookies } = await cdp.Network.getCookies();
        return cookies;
    }
    catch (error) {
        console.error('Error getting cookies:', error);
        throw error;
    }
}
/**
 * Set cookies
 */
async function setCookies(cdp, cookies) {
    try {
        await cdp.Network.setCookies({ cookies });
        console.log(`Set ${cookies.length} cookies`);
        return true;
    }
    catch (error) {
        console.error('Error setting cookies:', error);
        throw error;
    }
}
/**
 * Log debug information to file
 */
function logDebug(debugLogPath, event, payload = {}) {
    try {
        const entry = {
            timestamp: new Date().toISOString(),
            event,
            ...payload,
        };
        const line = `${JSON.stringify(entry)}\n`;
        fs.appendFileSync(debugLogPath, line, { encoding: 'utf8' });
    }
    catch (error) {
        console.warn('Failed to write automation debug log:', error && error.message ? error.message : error);
    }
}
/**
 * Ensure directory exists
 */
function _ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
/**
 * Wait for navigation with various wait strategies
 */
async function waitForNavigation(cdp, options = {}) {
    const waitUntil = options.waitUntil || 'load';
    const timeout = options.timeout || 30000;
    const urlPattern = options.url;
    if (waitUntil === 'load') {
        // Simple load event
        const loadPromise = cdp.Page.loadEventFired();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Timeout waiting for page load after ${timeout}ms`));
            }, timeout);
        });
        await Promise.race([loadPromise, timeoutPromise]);
        return null;
    }
    else if (waitUntil === 'domcontentloaded') {
        // DOMContentLoaded event
        const domContentLoadedPromise = new Promise((resolve) => {
            const handler = () => {
                cdp.Page.domContentEventFired(handler);
                resolve();
            };
            cdp.Page.domContentEventFired(handler);
        });
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Timeout waiting for DOMContentLoaded after ${timeout}ms`));
            }, timeout);
        });
        await Promise.race([domContentLoadedPromise, timeoutPromise]);
        return null;
    }
    else if (waitUntil === 'networkidle0' || waitUntil === 'networkidle2') {
        // Network idle - wait for network to be idle
        const maxIdleTime = 500; // ms
        const requiredIdleCount = waitUntil === 'networkidle0' ? 0 : 2;
        let idleCount = 0;
        let lastNetworkActivity = Date.now();
        let activeRequests = 0;
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkIdle = () => {
                const timeSinceLastActivity = Date.now() - lastNetworkActivity;
                if (activeRequests <= requiredIdleCount && timeSinceLastActivity >= maxIdleTime) {
                    resolve(null);
                    return;
                }
                if (Date.now() - startTime >= timeout) {
                    reject(new Error(`Timeout waiting for network idle after ${timeout}ms`));
                    return;
                }
                setTimeout(checkIdle, 100);
            };
            const requestHandler = () => {
                activeRequests++;
                lastNetworkActivity = Date.now();
            };
            const responseHandler = () => {
                activeRequests = Math.max(0, activeRequests - 1);
                lastNetworkActivity = Date.now();
            };
            cdp.Network.requestWillBeSent(requestHandler);
            cdp.Network.responseReceived(responseHandler);
            cdp.Network.loadingFinished(responseHandler);
            cdp.Network.loadingFailed(responseHandler);
            checkIdle();
        });
    }
    else {
        // Default to load
        const loadPromise = cdp.Page.loadEventFired();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Timeout waiting for page load after ${timeout}ms`));
            }, timeout);
        });
        await Promise.race([loadPromise, timeoutPromise]);
        return null;
    }
}
//# sourceMappingURL=utils.js.map