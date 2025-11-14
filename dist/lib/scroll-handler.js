"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normaliseScrollOptions = normaliseScrollOptions;
exports.buildScrollEvaluationScript = buildScrollEvaluationScript;
exports.scrollBy = scrollBy;
/**
 * Normalize scroll options
 */
function normaliseScrollOptions(options) {
    if (typeof options === 'number') {
        return {
            increment: Number.isFinite(options) ? options : 500,
            axis: 'y',
            percent: null,
            point: null,
            useContext: null
        };
    }
    if (!options || typeof options !== 'object') {
        return { increment: 500, axis: 'y', percent: null, point: null, useContext: null };
    }
    const opts = options;
    const axisRaw = typeof opts.axis === 'string' ? opts.axis.trim().toLowerCase() : 'y';
    let axis;
    if (axisRaw === 'x' || axisRaw === 'horizontal') {
        axis = 'x';
    }
    else {
        axis = 'y';
    }
    const percent = typeof opts.percent === 'number' && Number.isFinite(opts.percent)
        ? opts.percent
        : null;
    let increment = null;
    if (typeof opts.increment === 'number' && Number.isFinite(opts.increment)) {
        increment = opts.increment;
    }
    else if (percent === null) {
        increment = 500;
    }
    let point = null;
    if (opts.point && typeof opts.point === 'object') {
        const px = Number(opts.point.x);
        const py = Number(opts.point.y);
        if (Number.isFinite(px) && Number.isFinite(py)) {
            point = { x: px, y: py };
        }
    }
    const allowedContexts = new Set(['focused', 'lastclicked', 'activepane', 'page']);
    let useContext = null;
    if (typeof opts.useContext === 'string') {
        const norm = opts.useContext.trim().toLowerCase();
        if (allowedContexts.has(norm)) {
            useContext = norm;
        }
    }
    return {
        axis,
        increment,
        percent,
        point,
        useContext
    };
}
/**
 * Build scroll evaluation script
 */
function buildScrollEvaluationScript(options) {
    const payload = {
        axis: options.axis,
        increment: options.increment,
        percent: options.percent,
        point: options.point,
        useContext: options.useContext
    };
    const json = JSON.stringify(payload);
    return `(() => {
        const config = ${json};

        const axis = config.axis === 'x' ? 'x' : 'y';
        const useContext = typeof config.useContext === 'string' ? config.useContext : null;
        const percent = typeof config.percent === 'number' && isFinite(config.percent) ? config.percent : null;
        const increment = typeof config.increment === 'number' && isFinite(config.increment)
            ? config.increment
            : (percent === null ? 500 : null);

        if (!window.__chromeAutomationScrollInit) {
            window.__chromeAutomationScrollInit = true;
            window.addEventListener('click', (event) => {
                window.__chromeAutomationLastClickEl = event.target || null;
            }, true);
        }

        const clamp01 = (value) => {
            if (!isFinite(value)) return 0;
            return Math.min(1, Math.max(0, value));
        };

        const toRect = (rect) => {
            if (!rect) return null;
            return {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            };
        };

        const describeElement = (element) => {
            if (!element || !(element instanceof Element)) {
                return null;
            }
            const classes = Array.from(element.classList || []).slice(0, 5);
            const role = element.getAttribute ? element.getAttribute('role') : null;
            const ariaLabel = element.getAttribute ? element.getAttribute('aria-label') : null;
            let name = '';
            if (typeof element.innerText === 'string') {
                name = element.innerText.trim();
            } else if (typeof element.textContent === 'string') {
                name = element.textContent.trim();
            }
            if (name && name.length > 200) {
                name = name.slice(0, 200);
            }
            return {
                tag: element.tagName,
                id: element.id || null,
                classes,
                role,
                ariaLabel,
                name: name || null,
                dataTestId: element.getAttribute ? element.getAttribute('data-testid') : null
            };
        };

        const isScrollable = (element) => {
            if (!element || !(element instanceof Element)) {
                return false;
            }
            const style = window.getComputedStyle(element);
            if (!style) return false;
            const overflow = axis === 'x' ? style.overflowX : style.overflowY;
            if (!/(auto|scroll|overlay)/i.test(overflow)) return false;
            const client = axis === 'x' ? element.clientWidth : element.clientHeight;
            const scroll = axis === 'x' ? element.scrollWidth : element.scrollHeight;
            return scroll > client + 1;
        };

        const findScrollableAncestor = (seed) => {
            let current = seed;
            while (current && current !== document && current !== document.documentElement) {
                if (isScrollable(current)) {
                    return current;
                }
                current = current.parentElement;
            }
            return null;
        };

        let target = null;
        if (config.point && typeof config.point === 'object' && isFinite(config.point.x) && isFinite(config.point.y)) {
            const absX = clamp01(config.point.x) * window.innerWidth;
            const absY = clamp01(config.point.y) * window.innerHeight;
            target = document.elementFromPoint(absX, absY);
        }

        if (!target && useContext === 'focused') {
            target = document.activeElement || null;
        }

        if (!target && useContext === 'lastclicked') {
            target = window.__chromeAutomationLastClickEl || null;
        }

        if (!target && useContext === 'activepane') {
            target = window.__chromeAutomationLastScrollTarget || null;
        }

        let container = null;
        if (target) {
            container = findScrollableAncestor(target);
            if (!container && target instanceof Element) {
                const client = axis === 'x' ? target.clientWidth : target.clientHeight;
                const scroll = axis === 'x' ? target.scrollWidth : target.scrollHeight;
                if (scroll > client + 1) {
                    container = target;
                }
            }
        }

        let containerType = 'element';
        if (!container) {
            container = document.scrollingElement || document.documentElement || document.body;
            containerType = 'page';
        }

        if (!container) {
            return {
                success: false,
                error: 'No scrollable container found'
            };
        }

        if (container instanceof Element) {
            window.__chromeAutomationLastScrollTarget = container;
        }

        const clientSize = axis === 'x' ? container.clientWidth : container.clientHeight;
        const scrollSize = axis === 'x' ? container.scrollWidth : container.scrollHeight;
        const maxScroll = Math.max(0, scrollSize - clientSize);
        const before = axis === 'x' ? container.scrollLeft : container.scrollTop;

        let delta;
        if (percent !== null) {
            const magnitude = Math.abs(percent);
            const basis = clientSize || (axis === 'x' ? window.innerWidth : window.innerHeight) || 0;
            delta = (magnitude / 100) * basis;
            if (percent < 0) delta = -delta;
        } else {
            delta = increment || 0;
        }

        if (!isFinite(delta)) {
            delta = 0;
        }

        container.scrollBy({
            top: axis === 'y' ? delta : 0,
            left: axis === 'x' ? delta : 0,
            behavior: 'auto'
        });

        const after = axis === 'x' ? container.scrollLeft : container.scrollTop;
        const appliedDelta = after - before;

        const rect = container.getBoundingClientRect ? container.getBoundingClientRect() : null;

        const scrollTopVal = typeof container.scrollTop === 'number' ? container.scrollTop : (window.scrollY || 0);
        const scrollLeftVal = typeof container.scrollLeft === 'number' ? container.scrollLeft : (window.scrollX || 0);
        const viewportHeight = container.clientHeight || window.innerHeight || 0;
        const viewportWidth = container.clientWidth || window.innerWidth || 0;
        const scrollHeightVal = typeof container.scrollHeight === 'number'
            ? container.scrollHeight
            : (document.body ? document.body.scrollHeight : 0);
        const scrollWidthVal = typeof container.scrollWidth === 'number'
            ? container.scrollWidth
            : (document.body ? document.body.scrollWidth : 0);
        const remaining = Math.max(0, maxScroll - after);

        return {
            success: true,
            containerType,
            axis,
            scrollPosition: after,
            maxScroll,
            clientSize,
            scrollSize,
            appliedDelta,
            percentUsed: percent,
            incrementUsed: percent === null ? increment : null,
            atStart: after <= 1,
            atEnd: after >= maxScroll - 1,
            remaining,
            scrollTop: scrollTopVal,
            scrollLeft: scrollLeftVal,
            viewportHeight,
            viewportWidth,
            scrollHeight: scrollHeightVal,
            scrollWidth: scrollWidthVal,
            containerRect: toRect(rect),
            descriptor: describeElement(container),
            targetContext: describeElement(target),
            rawPoint: config.point || null,
            useContext: useContext || null
        };
    })();`;
}
/**
 * Scroll the page or a specific scrollable container.
 */
async function scrollBy(cdp, options = {}) {
    try {
        const normalized = normaliseScrollOptions(options);
        const expression = buildScrollEvaluationScript(normalized);
        const { result } = await cdp.Runtime.evaluate({
            expression,
            returnByValue: true,
            awaitPromise: false,
        });
        const metrics = (result && typeof result.value === 'object' && result.value !== null)
            ? result.value
            : {};
        if (metrics && metrics.success === false) {
            const reason = typeof metrics.error === 'string' ? metrics.error : 'Scroll command failed';
            throw new Error(reason);
        }
        const applied = typeof metrics.appliedDelta === 'number' ? metrics.appliedDelta : (normalized.increment || 0);
        const containerType = metrics.containerType || 'page';
        console.log(`Scrolled ${containerType} by ${applied} (${normalized.axis}-axis)`);
        return metrics;
    }
    catch (error) {
        console.error('Error scrolling:', error);
        throw error;
    }
}
//# sourceMappingURL=scroll-handler.js.map