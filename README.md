# Express + TypeScript + Knex Template

Well-built express based template for your new application!

## It will not fit you if:

- You do SSR in your apps - it's json-api only template
- You like prisma or typescript ORM and you do your db work using models - we do not use models and orms here, learn sql
  baby!

## It will fit you well if:

- You really like when code in repo does not hide all mechanics in packages
- You are a laravel dev coming to nodejs
    - Knex is like a DB facade in laravel
        - Migrations are done nearly the same
        - It's a sql-builder instead of ORM
    - HTTP Exceptions are written exactly the same
- You would like TS, express, knex, env files and testing working out of the box!
- You are tired of JWT and you want a simple api-token mechanism
- You are tired of rewriting authorization again and again in every project

## Authorization - what is happening here?

Users table has an authenticationUuid column, **it should change its value on every user's data update**.
Token is just simply an encrypted authenticationUuid.
Thanks to this mechanism, we receive token revoking feature that we can use whenever we want (changed authenticationUuid = revoked token).

## How to start

1. Download the template
    ```bash
    git clone git@github.com:itedya/express-ts-knex-template.git
    ```
2. Install dependencies and build TS Code
    ```bash
    npm run build && npm run compile
    ```

3. Create `.env` and `.env.testing` files for two environments (development, testing) and set them up.
    Example configuration is in `.env.example` file, but here for you, some examples anyway **(please remember to generate app encryption values by `npm run generate-encryption-keys`, do not use values provided down below!)**:

    ```dotenv
    APP_ENV="development" # or testing, production
    APP_ENCRYPTION_KEY="OrbiWINakERYB8QSddoV/AR0zAIJpVyWFAim9T4pa1c=" # Generate it by npm run generate-encryption-keys!
    APP_ENCRYPTION_IV="Bka4s3HzIstlw9KkA3rRZg==" # Generate it by npm run generate-encryption-keys!
    DB_TYPE=sqlite
    DB_FILE=database.db
    ```

And it's working!

Watch your code using: `npm run watch`  
Build your code using: `npm run build`  
Test your code using: `npm run test`  
If you want testing with watching: `npm run test -- --watchAll`  
If you want testing only one file with watching: `npm run test -- --watchAll --testNamePattern Your\ File\ Name`

## How to use the database?

In this template we take advantage of Unit Of Work design pattern, which is not very popular (but should be!) in NodeJS world.
It's very simple and I will prove it:

```ts
import unitOfWork from "./unit-of-work";
import UserDto from "./user.dto";

const result = await unitOfWork<UserDto | undefined>(async function () {
    // Begin transaction in db...
    return this.userRepository.findById(1);
    // Commit transaction in db...
})
    .catch(err => {
        // If error occured, rollback the transaction and catch it here

        console.log(err);
    })

console.log(result);
```

### Multiple DBMS support

This template can support many types of dbms (for now only sqlite is implemented, but you can add approx. 3 - 4 files and you will have another one).
So how to add some more?

1. Configuration file
    ```ts
    const configuration = {
        // ...
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
            } else if (type === "pg" /* postgres */) {
                // knex configuration, see: https://knexjs.org/guide/#configuration-options
                // remember to install package required by knex to use your specified dbms!
            } else if (type === "mysql" /* mysql */) {
                // knex configuration, see: https://knexjs.org/guide/#configuration-options
                // remember to install package required by knex to use your specified dbms!
            } else {
                throw new Error("Not implemented database type");
            }
        })(),
        // ...
    }
    ```

2. Set up env file
3. In `unit-of-work.ts` file modify `createContext` function
    ```ts
    import UnitOfWorkContext from "./unit-of-work-context.interface"; 
    import sqliteUserRepository from "./sqlite-user.repository";
    
    const createContext = async (): Promise<UnitOfWorkContext> => {
        const trx = await getDatabase()
            .then(db => db.transaction());
    
        if (configuration.database.client === "sqlite") {
            const userRepository = sqliteUserRepository(trx);
    
            return {trx, userRepository};
        } else if (configuration.database.client === "pg" /* postgres */) {
            // initialize and return your own repos that are compatible with your db type
        } else if (configuration.database.client === "mysql" /* mysql */) {
            // initialize and return your own repos that are compatible with your db type
        } else {
            throw new Error("Unsupported database type! Add your repositories to: src/repositories/unit-of-work.ts");
        }
    }
    ```