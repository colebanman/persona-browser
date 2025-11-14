"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clickButton = clickButton;
exports.fallbackDomClick = fallbackDomClick;
exports.clickByBackend = clickByBackend;
exports.typeText = typeText;
exports.fillInput = fillInput;
exports.clearInput = clearInput;
exports.pressKey = pressKey;
exports.doubleClick = doubleClick;
const utils_1 = require("./utils");
const visibility_helpers_1 = require("./visibility-helpers");
/**
 * Click an element by selector
 */
async function clickButton(cdp, selector, checkVisibility = true) {
    try {
        const { root } = await cdp.DOM.getDocument();
        const { nodeId } = await cdp.DOM.querySelector({
            selector,
            nodeId: root.nodeId,
        });
        if (!nodeId) {
            throw new Error(`Element not found: ${selector}`);
        }
        // Check visibility if requested
        if (checkVisibility) {
            const visible = await (0, visibility_helpers_1.isElementVisible)(cdp, nodeId);
            if (!visible) {
                // Try to scroll into view
                await (0, visibility_helpers_1.scrollIntoViewIfNeeded)(cdp, nodeId);
                // Check again after scrolling
                const stillNotVisible = !(await (0, visibility_helpers_1.isElementVisible)(cdp, nodeId));
                if (stillNotVisible) {
                    throw new Error(`Element is not visible: ${selector}`);
                }
            }
        }
        const { model } = await cdp.DOM.getBoxModel({ nodeId });
        // Calculate center coordinates
        const xValues = model.border.filter((_, index) => index % 2 === 0);
        const yValues = model.border.filter((_, index) => index % 2 !== 0);
        const x = xValues.reduce((acc, curr) => acc + curr, 0) / xValues.length;
        const y = yValues.reduce((acc, curr) => acc + curr, 0) / yValues.length;
        // Dispatch mouse events
        await cdp.Input.dispatchMouseEvent({
            x, y,
            button: 'left',
            clickCount: 1,
            type: 'mousePressed'
        });
        await cdp.Input.dispatchMouseEvent({
            x, y,
            button: 'left',
            clickCount: 1,
            type: 'mouseReleased'
        });
        console.log(`Clicked element: ${selector}`);
        return true;
    }
    catch (error) {
        console.error(`Error clicking element ${selector}:`, error);
        throw error;
    }
}
/**
 * Fallback DOM click using JavaScript
 */
async function fallbackDomClick(cdp, objectId) {
    if (!objectId)
        return false;
    try {
        const { result } = await cdp.Runtime.callFunctionOn({
            objectId,
            functionDeclaration: `function() {
                if (!this) return false;
                try {
                    if (typeof this.click === 'function') {
                        this.click();
                        return true;
                    }
                } catch (err) {}
                try {
                    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                    this.dispatchEvent(evt);
                    return true;
                } catch (err) {
                    return false;
                }
            }`,
            returnByValue: true
        });
        return Boolean(result && result.value);
    }
    catch (error) {
        return false;
    }
}
/**
 * Click an element by backend DOM node ID
 */
async function clickByBackend(cdp, ensureFrameDocumentFn, frameDocumentsRequested, logDebug, releaseRemoteObjectFn, fallbackDomClickFn, backendId, frameId) {
    const frameKey = frameId || 'root';
    let retriedDocument = false;
    while (true) {
        await ensureFrameDocumentFn(frameId);
        let objectId = null;
        try {
            const pushRes = await cdp.DOM.pushNodesByBackendIdsToFrontend({ backendNodeIds: [backendId] });
            const nodeIds = Array.isArray(pushRes.nodeIds) ? pushRes.nodeIds : (Array.isArray(pushRes) ? pushRes : []);
            const nodeId = nodeIds && nodeIds[0];
            if (!nodeId)
                throw new Error('Failed to push node to frontend');
            const resolved = await cdp.DOM.resolveNode({ nodeId });
            objectId = resolved && resolved.object && resolved.object.objectId ? resolved.object.objectId : null;
            if (objectId) {
                try {
                    await cdp.Runtime.callFunctionOn({
                        objectId,
                        functionDeclaration: `function() {
                            if (!this) return;
                            try {
                                this.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                            } catch (err) {
                                try { this.scrollIntoView(); } catch (_) {}
                            }
                        }`
                    });
                }
                catch { }
            }
            try {
                await cdp.DOM.scrollIntoViewIfNeeded({ nodeId });
            }
            catch { }
            const { model } = await cdp.DOM.getBoxModel({ nodeId });
            let pointerClicked = false;
            let pointerError = null;
            if (model && Array.isArray(model.border) && model.border.length >= 8) {
                const xValues = model.border.filter((_, index) => index % 2 === 0);
                const yValues = model.border.filter((_, index) => index % 2 !== 0);
                const x = xValues.reduce((acc, curr) => acc + curr, 0) / xValues.length;
                const y = yValues.reduce((acc, curr) => acc + curr, 0) / yValues.length;
                try {
                    await cdp.Input.dispatchMouseEvent({ type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
                    await cdp.Input.dispatchMouseEvent({ type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
                    await cdp.Input.dispatchMouseEvent({ type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
                    pointerClicked = true;
                }
                catch (inputError) {
                    pointerError = inputError;
                }
            }
            else {
                pointerError = new Error('Element has no box model');
            }
            if (!pointerClicked) {
                const fallbackSuccess = await fallbackDomClickFn(objectId);
                if (fallbackSuccess) {
                    logDebug('clickByBackend:fallbackClick', { backendId, frameId: frameKey });
                    return true;
                }
                if (pointerError)
                    throw pointerError;
                throw new Error('Pointer click failed and fallback click unavailable');
            }
            return true;
        }
        catch (clickError) {
            const message = clickError && clickError.message ? clickError.message : String(clickError);
            if (!retriedDocument && message.includes('Document needs to be requested first')) {
                frameDocumentsRequested.delete(frameKey);
                logDebug('clickByBackend:retryDocument', { frameId: frameKey, message });
                retriedDocument = true;
                continue;
            }
            throw clickError;
        }
        finally {
            if (objectId) {
                await releaseRemoteObjectFn(objectId);
            }
        }
    }
}
/**
 * Type text with human-like delays
 */
async function typeText(cdp, text, minDelay = 10, maxDelay = 30) {
    try {
        for (let i = 0; i < text.length; i++) {
            const charDelay = Math.random() * (maxDelay - minDelay) + minDelay;
            await (0, utils_1.delay)(charDelay);
            await cdp.Input.dispatchKeyEvent({
                type: 'char',
                text: text.charAt(i)
            });
        }
        console.log(`Typed text: ${text.substring(0, 20)}...`);
        return true;
    }
    catch (error) {
        console.error('Error typing text:', error);
        throw error;
    }
}
/**
 * Fill input field
 */
async function fillInput(cdp, clickButtonFn, clearInputFn, typeTextFn, selector, value) {
    try {
        await clickButtonFn(selector);
        await (0, utils_1.delay)(500);
        // Clear existing text
        await clearInputFn(selector);
        // Type new text
        await typeTextFn(value);
        return true;
    }
    catch (error) {
        console.error(`Error filling input ${selector}:`, error);
        throw error;
    }
}
/**
 * Clear input field
 */
async function clearInput(cdp, selector) {
    try {
        await cdp.Runtime.evaluate({
            expression: `document.querySelector("${selector}").value = "";`
        });
        return true;
    }
    catch (error) {
        console.error(`Error clearing input ${selector}:`, error);
        throw error;
    }
}
/**
 * Key mapping for virtual key codes and text representations
 */
const KEY_MAP = {
    'Enter': { code: 13, text: '\r', unmodifiedText: '\r' },
    'Tab': { code: 9, text: '\t', unmodifiedText: '\t' },
    'Backspace': { code: 8, text: '\b', unmodifiedText: '\b' },
    'Delete': { code: 46, text: '\u007F', unmodifiedText: '\u007F' },
    'Escape': { code: 27, text: '\u001B', unmodifiedText: '\u001B' },
    'ArrowUp': { code: 38, text: '', unmodifiedText: '' },
    'ArrowDown': { code: 40, text: '', unmodifiedText: '' },
    'ArrowLeft': { code: 37, text: '', unmodifiedText: '' },
    'ArrowRight': { code: 39, text: '', unmodifiedText: '' },
    'Home': { code: 36, text: '', unmodifiedText: '' },
    'End': { code: 35, text: '', unmodifiedText: '' },
    'PageUp': { code: 33, text: '', unmodifiedText: '' },
    'PageDown': { code: 34, text: '', unmodifiedText: '' },
    'Shift': { code: 16, text: '', unmodifiedText: '' },
    'Control': { code: 17, text: '', unmodifiedText: '' },
    'Alt': { code: 18, text: '', unmodifiedText: '' },
    'Meta': { code: 91, text: '', unmodifiedText: '' },
};
/**
 * Press a keyboard key (e.g., 'Enter', 'ArrowUp', 'Shift', etc.)
 * Uses proper CDP key event sequence: rawKeyDown -> char -> keyUp
 * Supports modifier keys and proper keyDown/keyUp events
 */
async function pressKey(cdp, key, options = {}) {
    try {
        const { modifiers = 0, delay: keyDelay = 10 } = options;
        // CDP modifiers bitmask: 1=Alt, 2=Control, 4=Meta, 8=Shift
        // Can be combined using bitwise OR (e.g., 8|2 for Shift+Control)
        // Get key mapping if available
        const keyInfo = KEY_MAP[key];
        const isModifierKey = ['Shift', 'Control', 'Alt', 'Meta'].includes(key);
        // Base event properties
        const baseEvent = {
            key: key,
            modifiers: modifiers
        };
        // Add virtual key code and text if mapped
        if (keyInfo) {
            baseEvent.windowsVirtualKeyCode = keyInfo.code;
            if (keyInfo.text) {
                baseEvent.text = keyInfo.text;
                baseEvent.unmodifiedText = keyInfo.unmodifiedText;
            }
        }
        // For modifier keys, use simpler keyDown/keyUp sequence
        if (isModifierKey) {
            await cdp.Input.dispatchKeyEvent({
                ...baseEvent,
                type: 'keyDown'
            });
            await (0, utils_1.delay)(keyDelay);
            await cdp.Input.dispatchKeyEvent({
                ...baseEvent,
                type: 'keyUp'
            });
        }
        else {
            // For regular keys, use full sequence: rawKeyDown -> char -> keyUp
            // rawKeyDown
            await cdp.Input.dispatchKeyEvent({
                ...baseEvent,
                type: 'rawKeyDown'
            });
            // char event (only if key produces text)
            if (keyInfo && keyInfo.text) {
                await (0, utils_1.delay)(keyDelay);
                await cdp.Input.dispatchKeyEvent({
                    ...baseEvent,
                    type: 'char'
                });
            }
            // keyUp
            await (0, utils_1.delay)(keyDelay);
            await cdp.Input.dispatchKeyEvent({
                ...baseEvent,
                type: 'keyUp'
            });
        }
        console.log(`Pressed key: ${key}${modifiers > 0 ? ` (modifiers: ${modifiers})` : ''}`);
        return true;
    }
    catch (error) {
        console.error(`Error pressing key ${key}:`, error);
        throw error;
    }
}
/**
 * Double click an element by selector
 */
async function doubleClick(cdp, selector) {
    try {
        const { root } = await cdp.DOM.getDocument();
        const { nodeId } = await cdp.DOM.querySelector({
            selector,
            nodeId: root.nodeId,
        });
        if (!nodeId) {
            throw new Error(`Element not found: ${selector}`);
        }
        const { model } = await cdp.DOM.getBoxModel({ nodeId });
        // Calculate center coordinates
        const xValues = model.border.filter((_, index) => index % 2 === 0);
        const yValues = model.border.filter((_, index) => index % 2 !== 0);
        const x = xValues.reduce((acc, curr) => acc + curr, 0) / xValues.length;
        const y = yValues.reduce((acc, curr) => acc + curr, 0) / yValues.length;
        // Dispatch mouse events for double click
        // First click
        await cdp.Input.dispatchMouseEvent({
            x, y,
            button: 'left',
            clickCount: 1,
            type: 'mousePressed'
        });
        await cdp.Input.dispatchMouseEvent({
            x, y,
            button: 'left',
            clickCount: 1,
            type: 'mouseReleased'
        });
        // Small delay between clicks (typical double-click timing)
        await (0, utils_1.delay)(50);
        // Second click (double click)
        await cdp.Input.dispatchMouseEvent({
            x, y,
            button: 'left',
            clickCount: 2,
            type: 'mousePressed'
        });
        await cdp.Input.dispatchMouseEvent({
            x, y,
            button: 'left',
            clickCount: 2,
            type: 'mouseReleased'
        });
        console.log(`Double clicked element: ${selector}`);
        return true;
    }
    catch (error) {
        console.error(`Error double clicking element ${selector}:`, error);
        throw error;
    }
}
//# sourceMappingURL=element-interaction.js.map