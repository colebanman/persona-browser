/**
 * Type definitions for PersonaBrowser
 */
export interface PersonaBrowserConfig {
    headless?: boolean;
    windowSize?: {
        width: number;
        height: number;
    };
    logDir?: string;
    userDataDir?: string;
}
export interface NetworkRequest {
    requestId: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    postData?: string;
    timestamp: number;
    responseReceived: boolean;
    response?: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        mimeType: string;
        timestamp: number;
        body?: string;
        base64Encoded?: boolean;
        bodyError?: string;
    };
    failed?: boolean;
    errorText?: string;
    loadingFinished?: number;
    loadingFailed?: number;
}
export interface AccessibilityNode {
    role?: string | {
        value: string;
    };
    name?: string | {
        value: string;
    };
    properties?: Array<{
        name: string | {
            value: string;
        };
        value: boolean | {
            value: boolean;
        };
    }>;
    backendDOMNodeId?: number;
    depth?: number;
    ignored?: boolean;
    ignoredReasons?: Array<string | {
        type: string;
    }>;
    [key: string]: any;
}
export interface AXEntry {
    node: AccessibilityNode;
    frameId?: string | null;
}
export interface ScrollOptions {
    increment?: number;
    percent?: number;
    axis?: 'x' | 'y' | 'horizontal' | 'vertical';
    point?: {
        x: number;
        y: number;
    };
    useContext?: 'focused' | 'lastClicked' | 'activePane' | 'page';
}
export interface ScrollMetrics {
    success: boolean;
    containerType: string;
    axis: string;
    scrollPosition: number;
    maxScroll: number;
    clientSize: number;
    scrollSize: number;
    appliedDelta: number;
    percentUsed?: number | null;
    incrementUsed?: number | null;
    atStart: boolean;
    atEnd: boolean;
    remaining: number;
    scrollTop: number;
    scrollLeft: number;
    viewportHeight: number;
    viewportWidth: number;
    scrollHeight: number;
    scrollWidth: number;
    containerRect?: {
        top: number;
        left: number;
        width: number;
        height: number;
    } | null;
    descriptor?: any;
    targetContext?: any;
    rawPoint?: {
        x: number;
        y: number;
    } | null;
    useContext?: string | null;
    error?: string;
}
export interface ScreenshotOptions {
    filepath?: string;
    saveToDisk?: boolean;
    returnBase64?: boolean;
}
export interface ScreenshotResult {
    filepath?: string;
    data: string;
    mimeType: string;
}
export interface ClickElementByTextOptions {
    exact?: boolean;
    caseSensitive?: boolean;
}
export interface CDPClient {
    Network: any;
    Page: any;
    Runtime: any;
    Input: any;
    DOM: any;
    Accessibility: any;
}
export interface IconHintsResult {
    iconHints: string[];
    labelHints: string[];
    domInfo: {
        id: string | null;
        tag: string | null;
        classes: string[];
        dataTestId: string | null;
        dataCy: string | null;
        ariaLabel: string | null;
        title: string | null;
    } | null;
}
export interface ElementMetadata {
    id: string | null;
    tagName: string | null;
    className: string | null;
    dataTestId: string | null;
    dataCy: string | null;
    ariaLabel: string | null;
    title: string | null;
    role: string | null;
    name: string | null;
    type: string | null;
    placeholder: string | null;
    alt: string | null;
    src: string | null;
    href: string | null;
    value: string | null;
}
export interface WaitForSelectorOptions {
    visible?: boolean;
    hidden?: boolean;
    attached?: boolean;
    timeout?: number;
}
export interface WaitForNavigationOptions {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
    url?: string | RegExp;
}
export interface NetworkResponse {
    url: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: string;
    requestId: string;
}
export interface NetworkRequestInfo {
    url: string;
    method: string;
    headers: Record<string, string>;
    postData?: string;
    requestId: string;
}
export type RequestInterceptor = (request: NetworkRequestInfo) => Promise<void | {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    postData?: string;
}> | void | {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    postData?: string;
};
export type ResponsePredicate = (response: NetworkResponse) => boolean;
export type RequestPredicate = (request: NetworkRequestInfo) => boolean;
//# sourceMappingURL=types.d.ts.map