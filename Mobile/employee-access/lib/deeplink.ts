import type { Href } from "expo-router";

type DeepLinkTarget =
    | { kind: "relay-capture"; ws: string }
    | { kind: "face-setup" };

const SUPPORTED_SCHEMES = new Set(["employeeaccess", "sofrs"]);
const RELAY_CAPTURE_PATH = "relay-capture";
const FACE_SETUP_PATH = "face-setup";

const normalizePathSegment = (value: string): string =>
    value.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();

const resolveRouteSegment = (url: URL): string => {
    const hostSegment = normalizePathSegment(url.hostname);
    if (hostSegment.length > 0) {
        return hostSegment;
    }

    return normalizePathSegment(url.pathname);
};

const parseRelayCapture = (url: URL): DeepLinkTarget | null => {
    const ws = url.searchParams.get("ws")?.trim();
    if (!ws) {
        return null;
    }

    return {
        kind: "relay-capture",
        ws,
    };
};

const parseCustomSchemeLink = (url: URL): DeepLinkTarget | null => {
    const scheme = url.protocol.replace(":", "").toLowerCase();
    if (!SUPPORTED_SCHEMES.has(scheme)) {
        return null;
    }

    const routeSegment = resolveRouteSegment(url);
    if (routeSegment === RELAY_CAPTURE_PATH) {
        return parseRelayCapture(url);
    }

    if (routeSegment === FACE_SETUP_PATH) {
        return { kind: "face-setup" };
    }

    return null;
};

const parseWebFallbackLink = (url: URL): DeepLinkTarget | null => {
    const protocol = url.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
        return null;
    }

    const routeSegment = normalizePathSegment(url.pathname);
    if (routeSegment === FACE_SETUP_PATH) {
        return { kind: "face-setup" };
    }

    if (routeSegment === RELAY_CAPTURE_PATH) {
        return parseRelayCapture(url);
    }

    return null;
};

export const parseDeepLink = (rawUrl: string): DeepLinkTarget | null => {
    const sanitized = rawUrl.trim();
    if (!sanitized) {
        return null;
    }

    try {
        const parsedUrl = new URL(sanitized);
        return parseCustomSchemeLink(parsedUrl) ?? parseWebFallbackLink(parsedUrl);
    } catch {
        return null;
    }
};

const toRouterHref = (target: DeepLinkTarget): Href => {
    if (target.kind === "relay-capture") {
        return {
            pathname: "/relay-capture",
            params: { ws: target.ws },
        };
    }

    return "/face-setup";
};

export const resolveDeepLinkRoute = (rawUrl: string): Href | null => {
    const parsed = parseDeepLink(rawUrl);
    if (!parsed) {
        return null;
    }

    return toRouterHref(parsed);
};
