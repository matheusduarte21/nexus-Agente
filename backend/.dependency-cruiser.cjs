
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
        name: 'no-circular-dependencies',
        severity: 'error',
        comment: 'Circular dependencies are not allowed.',
        from: { path: '^src/' },
        to: { circular: true },
        },

        {
        name: 'no-unresolved-imports',
        severity: 'error',
        from: { path: '^src/' },
        to: { couldNotResolve: true },
        },

        {
        name: 'no-cross-module-private-imports',
        severity: 'error',
        comment:
            'Modules must communicate through their public API.',
        from: {
            path: '^src/modules/([^/]+)/',
        },
        to: {
            path: '^src/modules/[^/]+/',
            pathNot: [
            '^src/modules/$1/',
            '^src/modules/[^/]+/index\\.ts$',
            ],
        },
        },

        {
        name: 'no-external-access-to-module-internals',
        severity: 'error',
        from: {
            path: '^src/',
            pathNot: '^src/modules/',
        },
        to: {
            path: '^src/modules/[^/]+/',
            pathNot: '^src/modules/[^/]+/index\\.ts$',
        },
        },

        {
        name: 'domain-must-remain-independent',
        severity: 'error',
        comment:
            'Domain code must not depend on frameworks or other layers.',
        from: {
            path: '^src/modules/([^/]+)/domain/',
        },
        to: {
            pathNot: '^src/modules/$1/domain/',
        },
        },

        {
        name: 'application-must-not-depend-on-adapters',
        severity: 'error',
        from: {
            path: '^src/modules/([^/]+)/application/',
        },
        to: {
            path: '^src/modules/$1/(infrastructure|presentation)/',
        },
        },

        {
        name: 'application-must-not-depend-on-frameworks',
        severity: 'error',
        from: {
            path: '^src/modules/[^/]+/application/',
        },
        to: {
            path: '(^|/)(@nestjs|@langchain|langchain|drizzle-orm|axios|openai)(/|$)',
        },
        },
    ],

    options: {
        doNotFollow: {
        path: 'node_modules',
        },

        tsPreCompilationDeps: true,

        tsConfig: {
        fileName: 'tsconfig.json',
        },
    },
};
