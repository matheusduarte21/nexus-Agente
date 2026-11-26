
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({
    path: '.env.migrations',
});

const databaseUrl =
    process.env.MIGRATION_DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        'Migration database configuration is required',
    );
}

function isMigrationUrl(value: string): boolean {
    try {
        const url = new URL(value);

        return (
            ['postgres:', 'postgresql:'].includes(
                url.protocol,
            ) &&
            url.username === 'nexus_migrator' &&
            url.password.length > 0 &&
            url.hostname.length > 0
        );
    } catch {
        return false;
    }
}

if (!isMigrationUrl(databaseUrl)) {
    throw new Error(
        'Invalid migration database configuration',
    );
}

export default defineConfig({
    dialect: 'postgresql',

    schema: './src/platform/database/schema/index.ts',

    out: './drizzle',

    dbCredentials: {
        url: databaseUrl,
    },

    migrations: {
        schema: 'drizzle',
        table: '__drizzle_migrations',
    },

    strict: true,
});
