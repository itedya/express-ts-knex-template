import Configuration from "./interfaces/configuration.interface";

const configuration: Configuration = {
    environment: (() => {
        const env = process.env.APP_ENV!;
        if (env === "production" || env === "development" || env === "testing") return env;

        throw new Error("Invalid environment type (APP_ENV)! Possible values: production, development, testing.");
    })(),
    encryption: {
        key: Buffer.from(process.env.APP_ENCRYPTION_KEY!, "base64"),
        iv: Buffer.from(process.env.APP_ENCRYPTION_IV!, "base64")
    },
    database: (() => {
        const type = process.env.DB_TYPE;

        if (type === "sqlite") {
            return {
                client: 'sqlite',
                connection: {
                    filename: process.env.DB_FILE!
                },
                useNullAsDefault: true,
                pool: {
                    afterCreate: (conn: any, cb: any) => {
                        conn.run('PRAGMA foreign_keys = ON', cb)
                    }
                }
            }
        } else {
            throw new Error("Not implemented database type");
        }
    })(),
}

export default configuration;