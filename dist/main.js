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
exports.PersonaBrowser = void 0;
const ChromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');
const findChrome = require('chrome-finder');
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const accessibility_tree_1 = require("./lib/accessibility-tree");
// Import modules
const utils_1 = require("./lib/utils");
const dom_helpers_1 = require("./lib/dom-helpers");
const accessibility_helpers_1 = require("./lib/accessibility-helpers");
const element_finding_1 = require("./lib/element-finding");
const element_interaction_1 = require("./lib/element-interaction");
const scroll_handler_1 = require("./lib/scroll-handler");
const network_logger_1 = require("./lib/network-logger");
const network_helpers_1 = require("./lib/network-helpers");
const element_handle_1 = require("./lib/element-handle");
/**
 * PersonaBrowser - Minimal automated browser control with network logging
 *
 * @class PersonaBrowser
 * @example
 * const automation = new PersonaBrowser({
 *     headless: false,
 *     windowSize: { width: 1200, height: 800 },
 *     userDataDir: '/path/to/user/data' // Optional: custom Chrome user data directory
 * });
 */
class PersonaBrowser {
    constructor(options = {}) {
        this.chrome = null;
        this.client = null;
        this.cdp = {};
        this.networkLog = [];
        this.requestMap = new Map();
        this.isolatedWorldContexts = new Map();
        this.frameDocumentsRequested = new Set();
        this.requestInterceptionEnabled = false;
        this.requestInterceptor = null;
        this.pages = new Map(); // Map of targetId -> PersonaBrowser instance
        this.currentTargetId = null;
        this.isLaunched = false;
        this.isClosed = false;
        this.config = {
            headless: options.headless || false,
            windowSize: options.windowSize || { width: 1200, height: 800 },
            logDir: options.logDir || './network-logs',
            userDataDir: options.userDataDir
        };
        this.debugLogPath = path.join(this.config.logDir, 'automation-debug.log');
        // Ensure log directory exists
        if (!fs.existsSync(this.config.logDir)) {
            fs.mkdirSync(this.config.logDir, { recursive: true });
        }
        // Bind helper methods for internal use
        this._logDebug = (event, payload) => (0, utils_1.logDebug)(this.debugLogPath, event, payload || {});
        this._ensureFrameDocument = (frameId) => (0, dom_helpers_1.ensureFrameDocument)(this.cdp, this.frameDocumentsRequested, this._logDebug, frameId);
        this._collectFrameIds = () => (0, dom_helpers_1.collectFrameIds)(this.cdp);
        this._ensureIsolatedWorld = (frameId) => (0, dom_helpers_1.ensureIsolatedWorld)(this.cdp, this.isolatedWorldContexts, frameId);
        this._releaseRemoteObject = (objectId) => (0, dom_helpers_1.releaseRemoteObject)(this.cdp, objectId);
        this._ensureDir = utils_1._ensureDir;
        this._axRole = accessibility_helpers_1.axRole;
        this._axHasProp = accessibility_helpers_1.axHasProp;
        this._findClickableAXAncestor = accessibility_helpers_1.findClickableAXAncestor;
        this._buildTextSearchExpression = element_finding_1.buildTextSearchExpression;
    }
    /**
     * Launch Chrome browser
     */
    async launch() {
        try {
            const chromeFlags = [
                '--no-first-run',
                '--disable-blink-features=AutomationControlled',
                `--window-size=${this.config.windowSize.width},${this.config.windowSize.height}`,
                '--disable-web-security', // Allow cookies for file:// URLs (for testing)
                '--allow-file-access-from-files', // Allow file:// URLs to access other files
            ];
            if (this.config.headless) {
                chromeFlags.push('--headless');
            }
            const launchOptions = {
                chromeFlags,
                chromePath: findChrome(),
                ignoreDefaultFlags: true,
            };
            // Add user data directory if specified
            if (this.config.userDataDir) {
                // Convert to absolute path to ensure Chrome can use it properly
                const userDataDirPath = path.isAbsolute(this.config.userDataDir)
                    ? this.config.userDataDir
                    : path.resolve(process.cwd(), this.config.userDataDir);
                // Ensure the user data directory exists
                if (!fs.existsSync(userDataDirPath)) {
                    fs.mkdirSync(userDataDirPath, { recursive: true });
                }
                // Set userDataDir in launch options
                launchOptions.userDataDir = userDataDirPath;
                // Also add as Chrome flag to ensure it's used (some versions need this)
                chromeFlags.push(`--user-data-dir=${userDataDirPath}`);
                // Log the user data directory being used
                this._logDebug('launch:userDataDir', { userDataDir: userDataDirPath });
                console.log(`Using user data directory: ${userDataDirPath}`);
            }
            this.chrome = await ChromeLauncher.launch(launchOptions);
            this.client = await CDP({ port: this.chrome.port });
            const clientDomains = this.client;
            const { Network, Page, Runtime, Input, DOM, Accessibility } = clientDomains;
            const Target = clientDomains.Target;
            const Fetch = clientDomains.Fetch;
            this.cdp = { Network, Page, Runtime, Input, DOM, Accessibility };
            // Store Fetch domain for request interception if available
            if (Fetch) {
                this.cdp.Fetch = Fetch;
            }
            // Enable Target domain for multi-page support if available
            try {
                if (Target) {
                    await Target.enable();
                    // Get current target ID
                    try {
                        const targets = await Target.getTargets();
                        if (targets && targets.targetInfos && targets.targetInfos.length > 0) {
                            this.currentTargetId = targets.targetInfos[0].targetId || null;
                        }
                    }
                    catch {
                        // Fallback: use page frame tree to get target info
                        try {
                            const frameTree = await Page.getFrameTree();
                            // Use a generated ID based on frame
                            this.currentTargetId = `target-${Date.now()}`;
                        }
                        catch {
                            this.currentTargetId = null;
                        }
                    }
                }
            }
            catch (error) {
                // Target domain might not be available in all Chrome versions
                this._logDebug('launch:targetDomainUnavailable', { message: error.message });
            }
            // Store this instance as the main page
            if (this.currentTargetId) {
                this.pages.set(this.currentTargetId, this);
            }
            else {
                // Use a placeholder ID for the main page
                this.currentTargetId = 'main';
                this.pages.set('main', this);
            }
            await Promise.all([
                this.cdp.DOM.enable(),
                this.cdp.Page.enable(),
                this.cdp.Network.enable(),
                this.cdp.Runtime.enable(),
                this.cdp.Accessibility.enable()
            ]);
            await this._ensureFrameDocument(null);
            (0, network_logger_1.setupNetworkLogging)(this.cdp, this.requestMap, this.networkLog);
            this.isLaunched = true;
            this.isClosed = false;
            this._logDebug('launch:success', { port: this.chrome.port });
            console.log('Chrome browser launched successfully');
            return true;
        }
        catch (error) {
            console.error('Error launching Chrome:', error);
            this._logDebug('launch:error', { message: error.message });
            throw error;
        }
    }
    /**
     * Navigate to a URL
     *
     * @param url - URL to navigate to
     * @param timeout - Maximum time to wait for navigation (default: 30000)
     */
    async navigate(url, timeout = 30000) {
        this._ensureLaunched();
        if (!url || typeof url !== 'string') {
            throw new Error('URL must be a non-empty string');
        }
        if (timeout <= 0 || !Number.isFinite(timeout)) {
            throw new Error('Timeout must be a positive number');
        }
        try {
            await this.cdp.Page.navigate({ url });
            // Wait for load event with timeout
            const loadPromise = this.cdp.Page.loadEventFired();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Timeout waiting for navigation after ${timeout}ms`));
                }, timeout);
            });
            await Promise.race([loadPromise, timeoutPromise]);
            this.isolatedWorldContexts.clear();
            this.frameDocumentsRequested.clear();
            this._logDebug('navigate:success', { url });
            console.log(`Navigated to: ${url}`);
            return true;
        }
        catch (error) {
            console.error('Navigation error:', error);
            this._logDebug('navigate:error', { url, message: error.message });
            throw error;
        }
    }
    /**
     * Wait for a new page load (useful after actions that trigger navigation)
     *
     * @param timeout - Maximum time to wait in milliseconds (default: 30000)
     *
     * @example
     * // After pressing Enter in a form that causes navigation
     * await automation.pressKey('Enter');
     * await automation.waitForPageLoad();
     *
     * // With custom timeout
     * await automation.waitForPageLoad(60000); // Wait up to 60 seconds
     */
    async waitForPageLoad(timeout = 30000) {
        this._ensureLaunched();
        if (timeout <= 0 || !Number.isFinite(timeout)) {
            throw new Error('Timeout must be a positive number');
        }
        try {
            // Use Promise.race to add timeout to loadEventFired
            const loadPromise = this.cdp.Page.loadEventFired();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Timeout waiting for page load after ${timeout}ms`));
                }, timeout);
            });
            await Promise.race([loadPromise, timeoutPromise]);
            // Clear state after page load (same as navigate)
            this.isolatedWorldContexts.clear();
            this.frameDocumentsRequested.clear();
            this._logDebug('waitForPageLoad:success', { timeout });
            console.log('Page load completed');
            return true;
        }
        catch (error) {
            console.error('Error waiting for page load:', error);
            this._logDebug('waitForPageLoad:error', { timeout, message: error.message });
            throw error;
        }
    }
    /**
     * Click an element by selector
     */
    async clickButton(selector) {
        this._ensureLaunched();
        if (!selector || typeof selector !== 'string') {
            throw new Error('Selector must be a non-empty string');
        }
        return (0, element_interaction_1.clickButton)(this.cdp, selector);
    }
    /**
     * Click an element by matching visible text content.
     */
    async clickElementByText(text, options = {}) {
        this._ensureLaunched();
        if (!text || typeof text !== 'string') {
            throw new Error('Text must be a non-empty string');
        }
        const collectAXNodesFn = async () => {
            return (0, accessibility_helpers_1.collectAXNodesAcrossFrames)(this.cdp, this._collectFrameIds, (options) => this.getAccessibilityTree(options), (tree) => this.flattenAccessibilityTree(tree), this._logDebug);
        };
        return (0, element_finding_1.clickElementByText)(this.cdp, this.frameDocumentsRequested, this.isolatedWorldContexts, this._logDebug, collectAXNodesFn, this._ensureFrameDocument, this._ensureIsolatedWorld, this._collectFrameIds, this._releaseRemoteObject, this._buildTextSearchExpression, text, options);
    }
    /**
     * Find all link elements on the page using accessibility tree
     *
     * @returns Array of link objects with name, href, backendId, etc.
     *
     * @example
     * const links = await automation.findLinks();
     * console.log(`Found ${links.length} links`);
     * links.forEach((link, i) => {
     *   console.log(`${i + 1}. ${link.name} - ${link.href}`);
     * });
     */
    async findLinks() {
        this._ensureLaunched();
        const collectAXNodesFn = async () => {
            return (0, accessibility_helpers_1.collectAXNodesAcrossFrames)(this.cdp, this._collectFrameIds, (options) => this.getAccessibilityTree(options), (tree) => this.flattenAccessibilityTree(tree), this._logDebug);
        };
        return (0, element_finding_1.findLinks)(this.cdp, collectAXNodesFn, this._logDebug);
    }
    /**
     * Find all text elements on the page using accessibility tree
     *
     * @param options - Options for filtering text elements
     * @param options.minLength - Minimum text length (default: 1)
     * @param options.maxLength - Maximum text length (default: Infinity)
     * @param options.role - Filter by accessibility role (e.g., 'heading', 'paragraph', etc.)
     *
     * @returns Array of text element objects with text, role, backendId, etc.
     *
     * @example
     * // Find all headings
     * const headings = await automation.findTextElements({ role: 'heading' });
     *
     * // Find all text elements with at least 10 characters
     * const longTexts = await automation.findTextElements({ minLength: 10 });
     */
    async findTextElements(options = {}) {
        this._ensureLaunched();
        if (options.minLength !== undefined && (options.minLength < 0 || !Number.isFinite(options.minLength))) {
            throw new Error('minLength must be a non-negative number');
        }
        if (options.maxLength !== undefined && (options.maxLength < 0 || !Number.isFinite(options.maxLength))) {
            throw new Error('maxLength must be a non-negative number');
        }
        if (options.minLength !== undefined && options.maxLength !== undefined && options.minLength > options.maxLength) {
            throw new Error('minLength must be <= maxLength');
        }
        const collectAXNodesFn = async () => {
            return (0, accessibility_helpers_1.collectAXNodesAcrossFrames)(this.cdp, this._collectFrameIds, (options) => this.getAccessibilityTree(options), (tree) => this.flattenAccessibilityTree(tree), this._logDebug);
        };
        return (0, element_finding_1.findTextElements)(this.cdp, collectAXNodesFn, this._logDebug, options);
    }
    /**
     * Click a link element by index (0-based)
     *
     * @param index - Index of the link to click (0 = first link, 1 = second link, etc.)
     *
     * @example
     * // Click the first link on the page
     * await automation.clickLinkByIndex(0);
     *
     * // Click the third link
     * await automation.clickLinkByIndex(2);
     */
    async clickLinkByIndex(index) {
        this._ensureLaunched();
        if (!Number.isInteger(index) || index < 0) {
            throw new Error('Index must be a non-negative integer');
        }
        const collectAXNodesFn = async () => {
            return (0, accessibility_helpers_1.collectAXNodesAcrossFrames)(this.cdp, this._collectFrameIds, (options) => this.getAccessibilityTree(options), (tree) => this.flattenAccessibilityTree(tree), this._logDebug);
        };
        // Create a bound wrapper for fallbackDomClick
        const fallbackDomClickWrapper = (objectId) => {
            return (0, element_interaction_1.fallbackDomClick)(this.cdp, objectId);
        };
        return (0, element_finding_1.clickLinkByIndex)(this.cdp, this.frameDocumentsRequested, this.isolatedWorldContexts, this._logDebug, collectAXNodesFn, this._ensureFrameDocument, this._ensureIsolatedWorld, this._collectFrameIds, this._releaseRemoteObject, element_interaction_1.clickByBackend, fallbackDomClickWrapper, index);
    }
    /**
     * Click a link element by matching text content
     *
     * @param text - Text to search for in link name or href
     * @param options - Search options
     * @param options.exact - Whether to match exact text (default: false)
     * @param options.caseSensitive - Whether search is case sensitive (default: false)
     *
     * @example
     * // Click link containing "Google"
     * await automation.clickLinkByText('Google');
     *
     * // Click link with exact text match
     * await automation.clickLinkByText('Home', { exact: true });
     */
    async clickLinkByText(text, options = {}) {
        this._ensureLaunched();
        if (!text || typeof text !== 'string') {
            throw new Error('Text must be a non-empty string');
        }
        const collectAXNodesFn = async () => {
            return (0, accessibility_helpers_1.collectAXNodesAcrossFrames)(this.cdp, this._collectFrameIds, (options) => this.getAccessibilityTree(options), (tree) => this.flattenAccessibilityTree(tree), this._logDebug);
        };
        // Create a bound wrapper for fallbackDomClick
        const fallbackDomClickWrapper = (objectId) => {
            return (0, element_interaction_1.fallbackDomClick)(this.cdp, objectId);
        };
        return (0, element_finding_1.clickLinkByText)(this.cdp, this.frameDocumentsRequested, this.isolatedWorldContexts, this._logDebug, collectAXNodesFn, this._ensureFrameDocument, this._ensureIsolatedWorld, this._collectFrameIds, this._releaseRemoteObject, element_interaction_1.clickByBackend, fallbackDomClickWrapper, text, options);
    }
    /**
     * Type text with human-like delays
     */
    async typeText(text, minDelay = 10, maxDelay = 30) {
        this._ensureLaunched();
        if (typeof text !== 'string') {
            throw new Error('Text must be a string');
        }
        if (minDelay < 0 || maxDelay < 0 || minDelay > maxDelay) {
            throw new Error('Delays must be non-negative and minDelay must be <= maxDelay');
        }
        return (0, element_interaction_1.typeText)(this.cdp, text, minDelay, maxDelay);
    }
    /**
     * Fill input field
     */
    async fillInput(selector, value) {
        this._ensureLaunched();
        if (!selector || typeof selector !== 'string') {
            throw new Error('Selector must be a non-empty string');
        }
        if (typeof value !== 'string') {
            throw new Error('Value must be a string');
        }
        return (0, element_interaction_1.fillInput)(this.cdp, (selector) => this.clickButton(selector), (selector) => this.clearInput(selector), (value) => this.typeText(value), selector, value);
    }
    /**
     * Clear input field
     */
    async clearInput(selector) {
        this._ensureLaunched();
        if (!selector || typeof selector !== 'string') {
            throw new Error('Selector must be a non-empty string');
        }
        return (0, element_interaction_1.clearInput)(this.cdp, selector);
    }
    /**
     * Press a keyboard key (e.g., 'Enter', 'ArrowUp', 'Shift', etc.)
     * Supports modifier keys and proper keyDown/keyUp events
     *
     * @param key - The key to press (e.g., 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Tab', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown')
     * @param options - Options for key press
     * @param options.modifiers - Bitmask for modifier keys: 1=Alt, 2=Control, 4=Meta, 8=Shift (can be combined, e.g., 8|2 for Shift+Control)
     * @param options.delay - Delay between keyDown and keyUp in milliseconds (default: 10)
     *
     * @example
     * // Press Enter key
     * await automation.pressKey('Enter');
     *
     * // Press Arrow Up
     * await automation.pressKey('ArrowUp');
     *
     * // Press Shift+Enter
     * await automation.pressKey('Enter', { modifiers: 8 }); // 8 = Shift
     *
     * // Press Control+Shift+A
     * await automation.pressKey('a', { modifiers: 8 | 2 }); // 8 = Shift, 2 = Control
     */
    async pressKey(key, options = {}) {
        this._ensureLaunched();
        if (!key || typeof key !== 'string') {
            throw new Error('Key must be a non-empty string');
        }
        if (options.delay !== undefined && (options.delay < 0 || !Number.isFinite(options.delay))) {
            throw new Error('Delay must be a non-negative number');
        }
        return (0, element_interaction_1.pressKey)(this.cdp, key, options);
    }
    /**
     * Double click an element by selector
     *
     * @param selector - CSS selector for the element to double click
     *
     * @example
     * await automation.doubleClick('button.submit');
     */
    async doubleClick(selector) {
        this._ensureLaunched();
        if (!selector || typeof selector !== 'string') {
            throw new Error('Selector must be a non-empty string');
        }
        return (0, element_interaction_1.doubleClick)(this.cdp, selector);
    }
    /**
     * Execute JavaScript in the page context
     */
    async executeJS(expression) {
        this._ensureLaunched();
        if (!expression || typeof expression !== 'string') {
            throw new Error('Expression must be a non-empty string');
        }
        return (0, utils_1.executeJS)(this.cdp, expression);
    }
    /**
     * Wait for selector to appear
     *
     * @param selector - CSS selector
     * @param options - Wait options (visible, hidden, attached, timeout) or legacy timeout number
     * @returns ElementHandle if options provided, otherwise boolean for backward compatibility
     *
     * @example
     * // Wait for visible element
     * await automation.waitForSelector('#button', { visible: true });
     *
     * // Wait for element to be hidden
     * await automation.waitForSelector('#loading', { hidden: true });
     *
     * // Legacy: timeout only
     * await automation.waitForSelector('#button', 5000);
     */
    async waitForSelector(selector, options = {}) {
        this._ensureLaunched();
        if (!selector || typeof selector !== 'string') {
            throw new Error('Selector must be a non-empty string');
        }
        const nodeId = await (0, utils_1.waitForSelector)(this.cdp, selector, options);
        // Return ElementHandle if options object provided, boolean for backward compatibility
        if (typeof options === 'object' && (options.visible !== undefined || options.hidden !== undefined || options.attached !== undefined)) {
            // Create ElementHandle
            try {
                const resolved = await this.cdp.DOM.resolveNode({ nodeId });
                const objectId = resolved?.object?.objectId || null;
                const backendId = resolved?.object?.backendNodeId || null;
                return new element_handle_1.ElementHandle(nodeId, objectId, backendId, null, this.cdp, this._ensureFrameDocument, this._releaseRemoteObject, this._logDebug);
            }
            catch (error) {
                // Fallback to boolean for backward compatibility
                return true;
            }
        }
        return true;
    }
    /**
     * Take screenshot
     */
    async screenshot(filepath = 'screenshot.png', options = {}) {
        this._ensureLaunched();
        return (0, utils_1.screenshot)(this.cdp, this.config, filepath, options);
    }
    /**
     * Scroll the page or a specific scrollable container.
     */
    async scrollBy(options = {}) {
        this._ensureLaunched();
        return (0, scroll_handler_1.scrollBy)(this.cdp, options);
    }
    /**
     * Get all cookies
     */
    async getCookies() {
        this._ensureLaunched();
        return (0, utils_1.getCookies)(this.cdp);
    }
    /**
     * Set cookies
     */
    async setCookies(cookies) {
        this._ensureLaunched();
        if (!Array.isArray(cookies)) {
            throw new Error('Cookies must be an array');
        }
        return (0, utils_1.setCookies)(this.cdp, cookies);
    }
    /**
     * Reload the current page
     *
     * @param options - Reload options
     * @param options.waitUntil - Wait strategy (default: 'load')
     * @param options.timeout - Maximum time to wait (default: 30000)
     */
    async reload(options = {}) {
        this._ensureLaunched();
        if (options.timeout !== undefined && (options.timeout <= 0 || !Number.isFinite(options.timeout))) {
            throw new Error('Timeout must be a positive number');
        }
        try {
            await this.cdp.Page.reload();
            await (0, utils_1.waitForNavigation)(this.cdp, {
                waitUntil: options.waitUntil || 'load',
                timeout: options.timeout || 30000
            });
            this.isolatedWorldContexts.clear();
            this.frameDocumentsRequested.clear();
            this._logDebug('reload:success');
            console.log('Page reloaded');
            return true;
        }
        catch (error) {
            console.error('Error reloading page:', error);
            this._logDebug('reload:error', { message: error.message });
            throw error;
        }
    }
    /**
     * Navigate back in browser history
     *
     * @param options - Navigation options
     * @param options.waitUntil - Wait strategy (default: 'load')
     * @param options.timeout - Maximum time to wait (default: 30000)
     */
    async goBack(options = {}) {
        this._ensureLaunched();
        if (options.timeout !== undefined && (options.timeout <= 0 || !Number.isFinite(options.timeout))) {
            throw new Error('Timeout must be a positive number');
        }
        try {
            await this.cdp.Page.navigateToHistoryEntry({ entryId: -1 });
            await (0, utils_1.waitForNavigation)(this.cdp, {
                waitUntil: options.waitUntil || 'load',
                timeout: options.timeout || 30000
            });
            this.isolatedWorldContexts.clear();
            this.frameDocumentsRequested.clear();
            this._logDebug('goBack:success');
            console.log('Navigated back');
            return true;
        }
        catch (error) {
            console.error('Error navigating back:', error);
            this._logDebug('goBack:error', { message: error.message });
            throw error;
        }
    }
    /**
     * Navigate forward in browser history
     *
     * @param options - Navigation options
     * @param options.waitUntil - Wait strategy (default: 'load')
     * @param options.timeout - Maximum time to wait (default: 30000)
     */
    async goForward(options = {}) {
        this._ensureLaunched();
        if (options.timeout !== undefined && (options.timeout <= 0 || !Number.isFinite(options.timeout))) {
            throw new Error('Timeout must be a positive number');
        }
        try {
            await this.cdp.Page.navigateToHistoryEntry({ entryId: 1 });
            await (0, utils_1.waitForNavigation)(this.cdp, {
                waitUntil: options.waitUntil || 'load',
                timeout: options.timeout || 30000
            });
            this.isolatedWorldContexts.clear();
            this.frameDocumentsRequested.clear();
            this._logDebug('goForward:success');
            console.log('Navigated forward');
            return true;
        }
        catch (error) {
            console.error('Error navigating forward:', error);
            this._logDebug('goForward:error', { message: error.message });
            throw error;
        }
    }
    /**
     * Get current page URL
     */
    async url() {
        this._ensureLaunched();
        try {
            const result = await this.cdp.Runtime.evaluate({
                expression: 'window.location.href'
            });
            return result.result.value || '';
        }
        catch (error) {
            console.error('Error getting URL:', error);
            throw error;
        }
    }
    /**
     * Get current page title
     */
    async title() {
        this._ensureLaunched();
        try {
            const result = await this.cdp.Runtime.evaluate({
                expression: 'document.title'
            });
            return result.result.value || '';
        }
        catch (error) {
            console.error('Error getting title:', error);
            throw error;
        }
    }
    /**
     * Wait for navigation with options
     *
     * @param options - Navigation wait options
     * @param options.waitUntil - Wait strategy: 'load', 'domcontentloaded', 'networkidle0', 'networkidle2'
     * @param options.timeout - Maximum time to wait (default: 30000)
     * @param options.url - URL pattern to wait for (string or RegExp)
     */
    async waitForNavigation(options = {}) {
        this._ensureLaunched();
        if (options.timeout !== undefined && (options.timeout <= 0 || !Number.isFinite(options.timeout))) {
            throw new Error('Timeout must be a positive number');
        }
        try {
            const result = await (0, utils_1.waitForNavigation)(this.cdp, options);
            this.isolatedWorldContexts.clear();
            this.frameDocumentsRequested.clear();
            this._logDebug('waitForNavigation:success', { waitUntil: options.waitUntil });
            return result;
        }
        catch (error) {
            console.error('Error waiting for navigation:', error);
            this._logDebug('waitForNavigation:error', { message: error.message });
            throw error;
        }
    }
    /**
     * Wait for a network response matching a predicate
     *
     * @param predicate - Function that returns true when response matches
     * @param timeout - Maximum time to wait (default: 30000)
     *
     * @example
     * // Wait for API response
     * const response = await automation.waitForResponse(
     *   (r) => r.url.includes('/api/data') && r.status === 200
     * );
     */
    async waitForResponse(predicate, timeout = 30000) {
        this._ensureLaunched();
        if (typeof predicate !== 'function') {
            throw new Error('Predicate must be a function');
        }
        if (timeout <= 0 || !Number.isFinite(timeout)) {
            throw new Error('Timeout must be a positive number');
        }
        try {
            const response = await (0, network_helpers_1.waitForResponse)(this.cdp, predicate, timeout);
            this._logDebug('waitForResponse:success', { url: response.url, status: response.status });
            return response;
        }
        catch (error) {
            console.error('Error waiting for response:', error);
            this._logDebug('waitForResponse:error', { message: error.message });
            throw error;
        }
    }
    /**
     * Wait for a network request matching a predicate
     *
     * @param predicate - Function that returns true when request matches
     * @param timeout - Maximum time to wait (default: 30000)
     *
     * @example
     * // Wait for API request
     * const request = await automation.waitForRequest(
     *   (r) => r.url.includes('/api/submit') && r.method === 'POST'
     * );
     */
    async waitForRequest(predicate, timeout = 30000) {
        this._ensureLaunched();
        if (typeof predicate !== 'function') {
            throw new Error('Predicate must be a function');
        }
        if (timeout <= 0 || !Number.isFinite(timeout)) {
            throw new Error('Timeout must be a positive number');
        }
        try {
            const request = await (0, network_helpers_1.waitForRequest)(this.cdp, predicate, timeout);
            this._logDebug('waitForRequest:success', { url: request.url, method: request.method });
            return request;
        }
        catch (error) {
            console.error('Error waiting for request:', error);
            this._logDebug('waitForRequest:error', { message: error.message });
            throw error;
        }
    }
    /**
     * Enable request interception
     *
     * @param interceptor - Function to intercept/modify/block requests
     *
     * @example
     * // Block ads
     * automation.setRequestInterception(async (request) => {
     *   if (request.url.includes('ads')) {
     *     return { url: 'about:blank' }; // Block
     *   }
     * });
     *
     * // Modify headers
     * automation.setRequestInterception(async (request) => {
     *   return {
     *     headers: { ...request.headers, 'X-Custom': 'value' }
     *   };
     * });
     */
    setRequestInterception(interceptor) {
        this._ensureLaunched();
        if (typeof interceptor !== 'function') {
            throw new Error('Interceptor must be a function');
        }
        this.requestInterceptor = interceptor;
        this.requestInterceptionEnabled = true;
        (0, network_helpers_1.setupRequestInterception)(this.cdp, interceptor);
        this._logDebug('setRequestInterception:enabled');
    }
    /**
     * Disable request interception
     */
    disableRequestInterception() {
        this.requestInterceptionEnabled = false;
        this.requestInterceptor = null;
        (0, network_helpers_1.disableRequestInterception)(this.cdp);
        this._logDebug('setRequestInterception:disabled');
    }
    /**
     * Query selector - returns ElementHandle or null
     *
     * @param selector - CSS selector
     * @returns ElementHandle if found, null otherwise
     *
     * @example
     * const button = await automation.$('#submit');
     * if (button) {
     *   await button.click();
     * }
     */
    async $(selector) {
        this._ensureLaunched();
        if (!selector || typeof selector !== 'string') {
            throw new Error('Selector must be a non-empty string');
        }
        try {
            const { root } = await this.cdp.DOM.getDocument();
            const { nodeId } = await this.cdp.DOM.querySelector({
                selector,
                nodeId: root.nodeId,
            });
            if (!nodeId) {
                return null;
            }
            const resolved = await this.cdp.DOM.resolveNode({ nodeId });
            const objectId = resolved?.object?.objectId || null;
            const backendId = resolved?.object?.backendNodeId || null;
            return new element_handle_1.ElementHandle(nodeId, objectId, backendId, null, this.cdp, this._ensureFrameDocument, this._releaseRemoteObject, this._logDebug);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Query selector all - returns array of ElementHandles
     *
     * @param selector - CSS selector
     * @returns Array of ElementHandles
     *
     * @example
     * const buttons = await automation.$$('button');
     * for (const button of buttons) {
     *   await button.click();
     * }
     */
    async $$(selector) {
        this._ensureLaunched();
        if (!selector || typeof selector !== 'string') {
            throw new Error('Selector must be a non-empty string');
        }
        try {
            const { root } = await this.cdp.DOM.getDocument();
            const { nodeIds } = await this.cdp.DOM.querySelectorAll({
                selector,
                nodeId: root.nodeId,
            });
            if (!nodeIds || nodeIds.length === 0) {
                return [];
            }
            const handles = [];
            for (const nodeId of nodeIds) {
                try {
                    const resolved = await this.cdp.DOM.resolveNode({ nodeId });
                    const objectId = resolved?.object?.objectId || null;
                    const backendId = resolved?.object?.backendNodeId || null;
                    handles.push(new element_handle_1.ElementHandle(nodeId, objectId, backendId, null, this.cdp, this._ensureFrameDocument, this._releaseRemoteObject, this._logDebug));
                }
                catch (error) {
                    // Skip invalid nodes
                }
            }
            return handles;
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Get the full accessibility tree for the current page
     */
    async getAccessibilityTree(options = {}) {
        this._ensureLaunched();
        if (options.depth !== undefined && (options.depth < 0 || !Number.isInteger(options.depth))) {
            throw new Error('Depth must be a non-negative integer');
        }
        try {
            return await (0, accessibility_tree_1.getAccessibilityTree)(this.cdp, options);
        }
        catch (error) {
            console.error('Error getting accessibility tree:', error);
            throw error;
        }
    }
    /**
     * Get a partial accessibility tree for a specific DOM node
     */
    async getPartialAccessibilityTree(nodeId, options = {}) {
        this._ensureLaunched();
        if (!Number.isInteger(nodeId) || nodeId < 0) {
            throw new Error('NodeId must be a non-negative integer');
        }
        try {
            return await (0, accessibility_tree_1.getPartialAccessibilityTree)(this.cdp, nodeId, options);
        }
        catch (error) {
            console.error('Error getting partial accessibility tree:', error);
            throw error;
        }
    }
    /**
     * Query the accessibility tree for nodes matching specific criteria
     */
    async queryAccessibilityTree(nodeId, options = {}) {
        this._ensureLaunched();
        if (!Number.isInteger(nodeId) || nodeId < 0) {
            throw new Error('NodeId must be a non-negative integer');
        }
        try {
            return await (0, accessibility_tree_1.queryAccessibilityTree)(this.cdp, nodeId, options);
        }
        catch (error) {
            console.error('Error querying accessibility tree:', error);
            throw error;
        }
    }
    /**
     * Flatten the accessibility tree into a list with depth information
     */
    flattenAccessibilityTree(tree) {
        return (0, accessibility_tree_1.flattenAccessibilityTree)(tree);
    }
    /**
     * Find nodes in the accessibility tree by role
     */
    findNodesByRole(tree, role) {
        return (0, accessibility_tree_1.findNodesByRole)(tree, role);
    }
    /**
     * Find nodes in the accessibility tree by accessible name
     */
    findNodesByName(tree, name) {
        return (0, accessibility_tree_1.findNodesByName)(tree, name);
    }
    /**
     * Save network log to file
     */
    async saveNetworkLog(filename) {
        return (0, network_logger_1.saveNetworkLog)(this.config, this.networkLog, filename);
    }
    /**
     * Get network log
     */
    getNetworkLog() {
        return (0, network_logger_1.getNetworkLog)(this.networkLog);
    }
    /**
     * Clear network log
     */
    clearNetworkLog() {
        return (0, network_logger_1.clearNetworkLog)(this.networkLog, this.requestMap);
    }
    /**
     * Create a new page/tab
     *
     * @returns New PersonaBrowser instance for the new page
     *
     * @example
     * const page1 = await automation.newPage();
     * await page1.navigate('https://example.com');
     *
     * const page2 = await automation.newPage();
     * await page2.navigate('https://google.com');
     */
    async newPage() {
        this._ensureLaunched();
        try {
            // Create new target (page/tab)
            const TargetDomain = this.client.Target;
            if (!TargetDomain) {
                throw new Error('Target domain not available. Make sure Chrome supports Target domain.');
            }
            const { targetId } = await TargetDomain.createTarget({ url: 'about:blank' });
            // Connect to the new target
            const newClient = await CDP({ port: this.chrome.port, target: targetId });
            const { Network, Page, Runtime, Input, DOM, Accessibility } = newClient;
            const Fetch = newClient.Fetch;
            const newCdp = { Network, Page, Runtime, Input, DOM, Accessibility };
            if (Fetch) {
                newCdp.Fetch = Fetch;
            }
            // Enable domains
            await Promise.all([
                newCdp.DOM.enable(),
                newCdp.Page.enable(),
                newCdp.Network.enable(),
                newCdp.Runtime.enable(),
                newCdp.Accessibility.enable()
            ]);
            // Create new PersonaBrowser instance for this page
            const pageAutomation = new PersonaBrowser(this.config);
            // Copy internal state
            pageAutomation.chrome = this.chrome;
            pageAutomation.client = newClient;
            pageAutomation.cdp = newCdp;
            pageAutomation.currentTargetId = targetId;
            pageAutomation.pages = this.pages; // Share pages map
            pageAutomation.debugLogPath = this.debugLogPath;
            // Setup network logging
            await pageAutomation._ensureFrameDocument(null);
            (0, network_logger_1.setupNetworkLogging)(newCdp, pageAutomation.requestMap, pageAutomation.networkLog);
            // Store in pages map
            this.pages.set(targetId, pageAutomation);
            this._logDebug('newPage:success', { targetId });
            console.log(`New page created: ${targetId}`);
            return pageAutomation;
        }
        catch (error) {
            console.error('Error creating new page:', error);
            this._logDebug('newPage:error', { message: error.message });
            throw error;
        }
    }
    /**
     * Get all open pages
     *
     * @returns Array of PersonaBrowser instances, one for each page
     */
    getPages() {
        return Array.from(this.pages.values());
    }
    /**
     * Get the current target ID
     */
    getCurrentTargetId() {
        return this.currentTargetId;
    }
    /**
     * Close a specific page
     *
     * @param targetId - Target ID of the page to close (default: current page)
     */
    async closePage(targetId) {
        this._ensureLaunched();
        try {
            const idToClose = targetId || this.currentTargetId;
            if (!idToClose) {
                throw new Error('No target ID specified');
            }
            // Don't close the main page through this method
            if (idToClose === this.currentTargetId && this.pages.size === 1) {
                throw new Error('Cannot close the last remaining page. Use close() instead.');
            }
            // Close the target
            const TargetDomain = this.client.Target;
            if (TargetDomain) {
                await TargetDomain.closeTarget({ targetId: idToClose });
            }
            // Remove from pages map
            const pageInstance = this.pages.get(idToClose);
            if (pageInstance && pageInstance !== this) {
                // Close the client connection
                try {
                    await pageInstance.client.close();
                }
                catch { }
            }
            this.pages.delete(idToClose);
            this._logDebug('closePage:success', { targetId: idToClose });
            console.log(`Page closed: ${idToClose}`);
        }
        catch (error) {
            console.error('Error closing page:', error);
            this._logDebug('closePage:error', { message: error.message });
            throw error;
        }
    }
    /**
     * Close browser and save network log
     */
    async close(saveLog = true) {
        if (this.isClosed) {
            return; // Already closed
        }
        try {
            if (saveLog && this.networkLog.length > 0) {
                await this.saveNetworkLog();
            }
            // Close all child pages first
            const pagesToClose = Array.from(this.pages.values()).filter(page => page !== this);
            for (const page of pagesToClose) {
                try {
                    await page.close(false); // Don't save log for child pages
                }
                catch (error) {
                    // Ignore errors closing child pages
                }
            }
            this.pages.clear();
            // Disable request interception if enabled
            if (this.requestInterceptionEnabled) {
                try {
                    this.disableRequestInterception();
                }
                catch (error) {
                    // Ignore errors disabling interception
                }
            }
            // Try to close the page gracefully first to allow Chrome to save state
            if (this.cdp && this.cdp.Page) {
                try {
                    // Close all pages/tabs to trigger cookie save
                    await this.cdp.Page.close();
                }
                catch (error) {
                    // Ignore errors - page might already be closed
                }
            }
            // Close CDP client to allow Chrome to save state
            if (this.client) {
                try {
                    await this.client.close();
                }
                catch (error) {
                    // Ignore errors during client close
                }
            }
            // Give Chrome time to flush cookies and other data to disk
            // Chrome writes cookies asynchronously, so we need to wait
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Then kill the Chrome process
            if (this.chrome) {
                await this.chrome.kill();
            }
            this.isClosed = true;
            this.isLaunched = false;
            console.log('Browser closed');
        }
        catch (error) {
            console.error('Error closing browser:', error);
            this.isClosed = true; // Mark as closed even if error occurred
            throw error;
        }
    }
    /**
     * Internal method to ensure browser is launched before operations
     * @private
     */
    _ensureLaunched() {
        if (this.isClosed) {
            throw new Error('Browser has been closed. Create a new PersonaBrowser instance.');
        }
        if (!this.isLaunched) {
            throw new Error('Browser not launched. Call launch() first.');
        }
        if (!this.cdp || !this.client) {
            throw new Error('Browser connection lost. Please relaunch.');
        }
    }
}
exports.PersonaBrowser = PersonaBrowser;
exports.default = PersonaBrowser;
//# sourceMappingURL=main.js.map