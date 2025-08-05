export default {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './db/database.sqlite'
    },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './seeds'
    },
    useNullAsDefault: true
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: './db/database.sqlite'
    },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './seeds'
    },
    useNullAsDefault: true
  }
};