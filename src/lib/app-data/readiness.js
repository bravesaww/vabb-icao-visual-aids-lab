import { createServerFn } from "@tanstack/react-start";
export const getConnectorReadiness = createServerFn({ method: "POST" }).handler(async () => {
    const { isConnectorTokenReady } = await import("./client.server.js");
    return { ready: isConnectorTokenReady() };
});
