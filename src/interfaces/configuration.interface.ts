interface SQLiteDatabaseConfiguration {
    client: 'sqlite',
    connection: {
        filename: string
    },
    useNullAsDefault: true
}

interface Configuration {
    environment: 'production' | 'development' | 'testing',
    encryption: {
        key: Buffer,
        iv: Buffer
    },
    database: SQLiteDatabaseConfiguration
}

export default Configuration;