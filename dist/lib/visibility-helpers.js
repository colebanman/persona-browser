"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElementVisible = isElementVisible;
exports.isElementAttached = isElementAttached;
exports.scrollIntoViewIfNeeded = scrollIntoViewIfNeeded;
exports.waitForElementVisible = waitForElementVisible;
exports.waitForElementHidden = waitForElementHidden;
const utils_1 = require("./utils");
/**
 * Get objectId from nodeId
 */
async function getObjectIdFromNodeId(cdp, nodeId) {
    try {
        const resolved = await cdp.DOM.resolveNode({ nodeId });
        return resolved?.object?.objectId || null;
    }
    catch (error) {
        return null;
    }
}
/**
 * Check if an element is visible
 */
async function isElementVisible(cdp, nodeId) {
    try {
        const objectId = await getObjectIdFromNodeId(cdp, nodeId);
        if (!objectId)
            return false;
        const result = await cdp.Runtime.callFunctionOn({
            objectId,
            functionDeclaration: `function() {
                if (!this) return false;
                const element = this.nodeType === 1 ? this : this.parentElement;
                if (!element) return false;
                const style = window.getComputedStyle(element);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0' &&
                       element.offsetWidth > 0 && 
                       element.offsetHeight > 0;
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
 * Check if an element is attached to the DOM
 */
async function isElementAttached(cdp, nodeId) {
    try {
        await cdp.DOM.describeNode({ nodeId });
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Scroll element into view if needed
 */
async function scrollIntoViewIfNeeded(cdp, nodeId) {
    try {
        await cdp.DOM.scrollIntoViewIfNeeded({ nodeId });
    }
    catch (error) {
        // Ignore errors - element might already be in view
    }
}
/**
 * Wait for element to become visible
 */
async function waitForElementVisible(cdp, nodeId, timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (await isElementVisible(cdp, nodeId)) {
            return true;
        }
        await (0, utils_1.delay)(100);
    }
    throw new Error(`Timeout waiting for element to become visible`);
}
/**
 * Wait for element to become hidden
 */
async function waitForElementHidden(cdp, nodeId, timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (!(await isElementVisible(cdp, nodeId))) {
            return true;
        }
        await (0, utils_1.delay)(100);
    }
    throw new Error(`Timeout waiting for element to become hidden`);
}
//# sourceMappingURL=visibility-helpers.js.map