"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForResponse = waitForResponse;
exports.waitForRequest = waitForRequest;
exports.setupRequestInterception = setupRequestInterception;
exports.disableRequestInterception = disableRequestInterception;
/**
 * Wait for a network response matching a predicate
 */
async function waitForResponse(cdp, predicate, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let resolved = false;
        const responseHandler = async (params) => {
            if (resolved)
                return;
            const { requestId, response, timestamp } = params;
            try {
                const networkResponse = {
                    url: response.url,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers || {},
                    requestId,
                };
                // Try to get response body
                try {
                    const bodyResult = await cdp.Network.getResponseBody({ requestId });
                    networkResponse.body = bodyResult.base64Encoded
                        ? Buffer.from(bodyResult.body, 'base64').toString()
                        : bodyResult.body;
                }
                catch (error) {
                    // Some responses don't have bodies, that's okay
                }
                if (predicate(networkResponse)) {
                    resolved = true;
                    // Note: chrome-remote-interface doesn't support removing handlers easily
                    // The handler will remain but won't cause issues since resolved=true
                    resolve(networkResponse);
                }
            }
            catch (error) {
                // Continue waiting
            }
        };
        cdp.Network.responseReceived(responseHandler);
        // Timeout
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                // Note: handler cleanup not needed - resolved flag prevents execution
                reject(new Error(`Timeout waiting for response after ${timeout}ms`));
            }
        }, timeout);
    });
}
/**
 * Wait for a network request matching a predicate
 */
async function waitForRequest(cdp, predicate, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let resolved = false;
        const requestHandler = (params) => {
            if (resolved)
                return;
            const { requestId, request } = params;
            const networkRequest = {
                url: request.url,
                method: request.method,
                headers: request.headers || {},
                postData: request.postData,
                requestId,
            };
            if (predicate(networkRequest)) {
                resolved = true;
                // Note: chrome-remote-interface doesn't support removing handlers easily
                // The handler will remain but won't cause issues since resolved=true
                resolve(networkRequest);
            }
        };
        cdp.Network.requestWillBeSent(requestHandler);
        // Timeout
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                // Note: handler cleanup not needed - resolved flag prevents execution
                reject(new Error(`Timeout waiting for request after ${timeout}ms`));
            }
        }, timeout);
    });
}
/**
 * Setup request interception
 * Note: This uses Fetch domain which may not be available in all Chrome versions
 */
function setupRequestInterception(cdp, interceptor) {
    // Try to use Fetch domain for request interception (more reliable)
    const Fetch = cdp.Fetch;
    if (Fetch) {
        Fetch.enable({
            handleAuthRequests: false,
            patterns: [{ urlPattern: '*' }]
        });
        Fetch.requestPaused(async (params) => {
            const { requestId, request } = params;
            const networkRequest = {
                url: request.url,
                method: request.method,
                headers: request.headers || {},
                postData: request.postData,
                requestId: requestId,
            };
            try {
                const result = await interceptor(networkRequest);
                if (result === undefined || result === null) {
                    // Continue with original request
                    await Fetch.continueRequest({ requestId });
                }
                else if (typeof result === 'object') {
                    // Modify request
                    await Fetch.continueRequest({
                        requestId,
                        url: result.url,
                        method: result.method,
                        headers: result.headers ? Object.entries(result.headers).map(([name, value]) => ({ name, value })) : undefined,
                        postData: result.postData,
                    });
                }
            }
            catch (error) {
                // On error, fail the request
                try {
                    await Fetch.failRequest({ requestId, errorReason: 'Failed' });
                }
                catch { }
            }
        });
    }
    else {
        // Fallback: Network domain interception (may not work in all versions)
        try {
            if (cdp.Network.setRequestInterception) {
                cdp.Network.setRequestInterception({ patterns: [{ urlPattern: '*' }] });
                if (cdp.Network.requestIntercepted) {
                    cdp.Network.requestIntercepted(async (params) => {
                        const { interceptionId, request } = params;
                        const networkRequest = {
                            url: request.url,
                            method: request.method,
                            headers: request.headers || {},
                            postData: request.postData,
                            requestId: params.requestId || '',
                        };
                        try {
                            const result = await interceptor(networkRequest);
                            if (result === undefined || result === null) {
                                await cdp.Network.continueInterceptedRequest({ interceptionId });
                            }
                            else if (typeof result === 'object') {
                                await cdp.Network.continueInterceptedRequest({
                                    interceptionId,
                                    url: result.url,
                                    method: result.method,
                                    headers: result.headers,
                                    postData: result.postData,
                                });
                            }
                        }
                        catch (error) {
                            try {
                                await cdp.Network.continueInterceptedRequest({
                                    interceptionId,
                                    errorReason: 'Failed'
                                });
                            }
                            catch { }
                        }
                    });
                }
            }
            else {
                throw new Error('Request interception not supported. Fetch domain not available.');
            }
        }
        catch (error) {
            throw new Error(`Request interception setup failed: ${error.message}`);
        }
    }
}
/**
 * Disable request interception
 */
function disableRequestInterception(cdp) {
    const Fetch = cdp.Fetch;
    if (Fetch) {
        Fetch.disable();
    }
    else {
        try {
            if (cdp.Network.setRequestInterception) {
                cdp.Network.setRequestInterception({ patterns: [] });
            }
        }
        catch (error) {
            // Ignore errors when disabling
        }
    }
}
//# sourceMappingURL=network-helpers.js.map