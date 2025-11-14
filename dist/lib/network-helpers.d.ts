import { CDPClient, NetworkResponse, NetworkRequestInfo, ResponsePredicate, RequestPredicate, RequestInterceptor } from './types';
/**
 * Wait for a network response matching a predicate
 */
export declare function waitForResponse(cdp: CDPClient, predicate: ResponsePredicate, timeout?: number): Promise<NetworkResponse>;
/**
 * Wait for a network request matching a predicate
 */
export declare function waitForRequest(cdp: CDPClient, predicate: RequestPredicate, timeout?: number): Promise<NetworkRequestInfo>;
/**
 * Setup request interception
 * Note: This uses Fetch domain which may not be available in all Chrome versions
 */
export declare function setupRequestInterception(cdp: CDPClient, interceptor: RequestInterceptor): void;
/**
 * Disable request interception
 */
export declare function disableRequestInterception(cdp: CDPClient): void;
//# sourceMappingURL=network-helpers.d.ts.map