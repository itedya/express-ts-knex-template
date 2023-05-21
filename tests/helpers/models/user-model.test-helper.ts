import UserDto from "../../../src/dtos/user.dto";
import {createInTable, findByColumnInTable} from "../db.test-helpers";
import {v4} from "uuid";
import {plainToInstance} from "class-transformer";
import {Knex} from "knex";
import * as bcrypt from "bcrypt";
import encryptionService from "../../../src/services/encryption.service";
import configuration from "../../../src/configuration";

interface Opts {
    seed?: number,
    isAdmin?: boolean,
    authenticationUuid?: string,
    password?: string
    baseUsername?: string,
    baseEmail?: string,
}

const createTestUserModel = async (db: Knex, opts?: Opts): Promise<UserDto> => {
    if (opts === undefined) opts = {};
    if (opts.seed === undefined) opts.seed = 0;
    if (opts.isAdmin === undefined) opts.isAdmin = false;
    if (opts.authenticationUuid === undefined) opts.authenticationUuid = v4();
    if (opts.baseUsername === undefined) opts.baseUsername = "localadmin%seed%";
    if (opts.baseEmail === undefined) opts.baseEmail = "localadmin%seed%@localhost.local";

    let hashedPassword: string;

    if (opts.password !== undefined) {
        hashedPassword = bcrypt.hashSync("localadmin123", 7);
    } else {
        // localadmin123
        hashedPassword = "$2a$07$WvGJViRkvK5Fkcwhq3AonOdhdGnEVdRWDtwqqXQvyqYOLAq6y5UD2";
    }

    const userId = await createInTable(db, "users", {
        username: opts.baseUsername.replace("%seed%", opts.seed.toString()),
        email: opts.baseEmail.replace("%seed%", opts.seed.toString()),
        password: hashedPassword,
        authenticationUuid: opts.authenticationUuid,
        isAdmin: opts.isAdmin
    });

    return findByColumnInTable(db, "users", "id", userId)
        .then(result => plainToInstance(UserDto, result));
}

const createAuthenticationToken = (authenticationUuid: string) => encryptionService.encryptAES256(authenticationUuid, configuration.encryption.key, configuration.encryption.iv);


export {
    createTestUserModel as default,
    createAuthenticationToken
};