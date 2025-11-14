"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElementHandle = void 0;
const element_interaction_1 = require("./element-interaction");
const utils_1 = require("./utils");
/**
 * ElementHandle represents a DOM element that can be interacted with
 */
class ElementHandle {
    constructor(nodeId, objectId, backendId, frameId, cdp, ensureFrameDocumentFn, releaseRemoteObjectFn, logDebug) {
        this.nodeId = nodeId;
        this.objectId = objectId;
        this.backendId = backendId;
        this.frameId = frameId;
        this.cdp = cdp;
        this.ensureFrameDocumentFn = ensureFrameDocumentFn;
        this.releaseRemoteObjectFn = releaseRemoteObjectFn;
        this.logDebug = logDebug;
    }
    /**
     * Click this element
     */
    async click() {
        // Create a bound wrapper for fallbackDomClick
        const fallbackDomClickWrapper = (objectId) => {
            return (0, element_interaction_1.fallbackDomClick)(this.cdp, objectId);
        };
        if (this.backendId !== null) {
            return (0, element_interaction_1.clickByBackend)(this.cdp, this.ensureFrameDocumentFn, new Set(), this.logDebug, this.releaseRemoteObjectFn, fallbackDomClickWrapper, this.backendId, this.frameId);
        }
        else if (this.objectId) {
            return (0, element_interaction_1.fallbackDomClick)(this.cdp, this.objectId);
        }
        else {
            throw new Error('Element handle has no valid reference');
        }
    }
    /**
     * Type text into this element (must be an input/textarea)
     */
    async type(text, minDelay = 10, maxDelay = 30) {
        // Focus the element first
        await this.focus();
        await (0, utils_1.delay)(100);
        // Clear existing content
        await this.clear();
        // Type new text
        return (0, element_interaction_1.typeText)(this.cdp, text, minDelay, maxDelay);
    }
    /**
     * Clear the element's value
     */
    async clear() {
        if (!this.objectId) {
            throw new Error('Element handle has no object reference');
        }
        try {
            await this.cdp.Runtime.callFunctionOn({
                objectId: this.objectId,
                functionDeclaration: `function() {
                    if (this.value !== undefined) {
                        this.value = '';
                    } else if (this.textContent !== undefined) {
                        this.textContent = '';
                    }
                }`,
                returnByValue: true
            });
            return true;
        }
        catch (error) {
            console.error('Error clearing element:', error);
            throw error;
        }
    }
    /**
     * Focus this element
     */
    async focus() {
        if (!this.objectId) {
            throw new Error('Element handle has no object reference');
        }
        try {
            await this.cdp.Runtime.callFunctionOn({
                objectId: this.objectId,
                functionDeclaration: `function() {
                    if (typeof this.focus === 'function') {
                        this.focus();
                    }
                }`,
                returnByValue: true
            });
            return true;
        }
        catch (error) {
            console.error('Error focusing element:', error);
            throw error;
        }
    }
    /**
     * Get element property value
     */
    async getProperty(propertyName) {
        if (!this.objectId) {
            throw new Error('Element handle has no object reference');
        }
        try {
            const result = await this.cdp.Runtime.getProperties({
                objectId: this.objectId,
                ownProperties: false
            });
            const prop = result.result.find((p) => p.name === propertyName);
            if (prop && prop.value) {
                return prop.value.value;
            }
            return undefined;
        }
        catch (error) {
            console.error(`Error getting property ${propertyName}:`, error);
            throw error;
        }
    }
    /**
     * Get element attribute value
     */
    async getAttribute(name) {
        if (!this.objectId) {
            throw new Error('Element handle has no object reference');
        }
        try {
            const result = await this.cdp.Runtime.callFunctionOn({
                objectId: this.objectId,
                functionDeclaration: `function(attrName) {
                    return this.getAttribute(attrName);
                }`,
                arguments: [{ value: name }],
                returnByValue: true
            });
            return result.result.value || null;
        }
        catch (error) {
            console.error(`Error getting attribute ${name}:`, error);
            throw error;
        }
    }
    /**
     * Get element text content
     */
    async textContent() {
        if (!this.objectId) {
            throw new Error('Element handle has no object reference');
        }
        try {
            const result = await this.cdp.Runtime.callFunctionOn({
                objectId: this.objectId,
                functionDeclaration: `function() {
                    return this.textContent || this.innerText || '';
                }`,
                returnByValue: true
            });
            return result.result.value || '';
        }
        catch (error) {
            console.error('Error getting text content:', error);
            throw error;
        }
    }
    /**
     * Check if element is visible
     */
    async isVisible() {
        if (!this.objectId) {
            return false;
        }
        try {
            const result = await this.cdp.Runtime.callFunctionOn({
                objectId: this.objectId,
                functionDeclaration: `function() {
                    const style = window.getComputedStyle(this);
                    return style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           style.opacity !== '0' &&
                           this.offsetWidth > 0 && 
                           this.offsetHeight > 0;
                }`,
                returnByValue: true
            });
            return Boolean(result.result.value);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Scroll element into view
     */
    async scrollIntoView() {
        if (!this.objectId) {
            throw new Error('Element handle has no object reference');
        }
        try {
            await this.cdp.Runtime.callFunctionOn({
                objectId: this.objectId,
                functionDeclaration: `function() {
                    this.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                }`,
                returnByValue: true
            });
            // Also use CDP's scrollIntoViewIfNeeded
            if (this.nodeId) {
                try {
                    await this.cdp.DOM.scrollIntoViewIfNeeded({ nodeId: this.nodeId });
                }
                catch { }
            }
            return true;
        }
        catch (error) {
            console.error('Error scrolling element into view:', error);
            throw error;
        }
    }
    /**
     * Dispose of this handle and release resources
     */
    async dispose() {
        if (this.objectId) {
            await this.releaseRemoteObjectFn(this.objectId);
            this.objectId = null;
        }
    }
}
exports.ElementHandle = ElementHandle;
//# sourceMappingURL=element-handle.js.map