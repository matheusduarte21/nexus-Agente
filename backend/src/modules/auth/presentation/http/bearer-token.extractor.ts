
export function extractBearerToken(authorization: string | undefined,rawHeaders: readonly string[]): string | null {
    if (!authorization || authorization.length > 2064) {
        return null;
    }

    const authorizationHeaders = rawHeaders.filter(
        (name, index) =>
            index % 2 === 0 &&
            name.toLowerCase() === 'authorization',
    );

    if (authorizationHeaders.length !== 1) {
        return null;
    }

    const match =
        /^Bearer +([A-Za-z0-9._~+/-]+=*)$/i.exec(
            authorization,
        );

    if (!match || match[0] !== authorization) {
        return null;
    }

    return match[1] ?? null;
}
