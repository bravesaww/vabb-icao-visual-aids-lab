export function isLoginRequired(result) {
    return result.ok === false && result.loginRequired === true;
}
export function isConnectorPending(result) {
    return result.ok === false && result.pending === true;
}
export function isFramed() {
    try {
        return window.self !== window.top;
    }
    catch {
        return true;
    }
}
export function redirectToLoginIfRequired(result) {
    if (!isLoginRequired(result))
        return false;
    const url = result.loginUrl;
    if (!url)
        return false;
    if (typeof window === "undefined")
        return false;
    if (isFramed()) {
        const opened = window.open(url, "_blank");
        if (opened) {
            opened.opener = null;
            return true;
        }
    }
    window.location.assign(url);
    return true;
}
