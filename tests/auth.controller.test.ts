import supertest from "supertest";
import {Knex} from "knex";
import getDatabase from "../src/database/connection";
import {Express} from "express";
import createApp from "../src/app";
import {
    createInTable,
    findByColumnInTable, getAllInTable,
    getCountInTable,
    migrateDownDatabase,
    migrateUpDatabase
} from "./helpers/db.test-helpers";
import {testValidationExceptions} from "./helpers/request.test-helpers";
import {randomString} from "./helpers/general.test-helpers";
import * as bcrypt from "bcrypt";
import {v4} from "uuid";
import {plainToInstance} from "class-transformer";
import UserDto from "../src/dtos/user.dto";
import {isString, isUuid} from "./helpers/type.test-helpers";
import encryptionService from "../src/services/encryption.service";
import configuration from "../src/configuration";
import {BadRequestCodes} from "../src/exceptions/bad-request.http-exception";

describe('Auth Controller', function () {
    let db: Knex;
    let app: Express;

    beforeAll(async () => {
        db = await getDatabase();
        app = await createApp();
    });

    beforeEach(async () => {
        await migrateUpDatabase(db);
    });

    afterEach(async () => {
        await migrateDownDatabase(db);
    })

    afterAll(async () => {
        await db.destroy();
    })

    const hashedPassword = bcrypt.hashSync("!L0c4l4dmin123/", 12);
    const createTestUser = async (): Promise<UserDto> => {
        const id = await createInTable(db, "users", {
            username: "localadmin",
            email: "localadmin@localhost.local",
            password: hashedPassword,
            authenticationUuid: v4()
        });

        return findByColumnInTable(db, "users", "id", id)
            .then(res => {
                expect(res).not.toBeUndefined();
                return plainToInstance(UserDto, res);
            });
    }

    describe('/auth/login - Login method', function () {
        describe("Validates request data properly", () => {
            testValidationExceptions((body: any) => {
                return supertest(app)
                    .post("/auth/login")
                    .send(body)
                    .expect(400);
            }, [
                {
                    name: "Login and password required",
                    body: {},
                    expectedErrors: [
                        'login.isString',
                        'login.isLength',
                        'password.isString',
                        'password.isStrongPassword',
                        'password.isLength',
                    ]
                },
                {
                    name: "Login must be a string",
                    body: {login: 30, password: "AB$!@213abb"},
                    expectedErrors: ["login.isString", "login.isLength"]
                },
                {
                    name: "Login must have minimum 3 characters",
                    body: {login: "12", password: "AB$!@213abb"},
                    expectedErrors: ["login.isLength"]
                },
                {
                    name: "Login must have maximum 64 characters",
                    body: {login: randomString(65), password: "AB$!@213abb"},
                    expectedErrors: ["login.isLength"]
                },
                {
                    name: "Password must be a string",
                    body: {login: randomString(30), password: 123},
                    expectedErrors: ["password.isString", "password.isLength", "password.isStrongPassword"]
                },
                {
                    name: "Password must have minimum 8 characters",
                    body: {login: "localadmin", password: "AA$@2lk"},
                    // is strong password checks minimum length too!
                    expectedErrors: ["password.isLength", "password.isStrongPassword"]
                },
                {
                    name: "Password must have maximum 64 characters",
                    body: {
                        login: "localadmin",
                        password: "@&k!3CAyAX#3zwUyy$Er!NvLBoCF4T8X858@b@#jbaZkAxe%BpRj&NM4x#7uhr@zMqbHH4RRYaw4wwhZ"
                    },
                    expectedErrors: ["password.isLength"],
                },
                {
                    name: "Password must be strong",
                    body: {login: "localadmin", password: "AB$#12222"},
                    expectedErrors: ["password.isStrongPassword"]
                }
            ]);
        });
        test("Logs in by username", async () => {
            const user = await createTestUser();

            await supertest(app)
                .post("/auth/login")
                .send({
                    login: "localadmin",
                    password: "!L0c4l4dmin123/"
                })
                .expect(200)
                .then(async res => {
                    const body = res.body;

                    expect(isString(body.token)).toBeTruthy();
                    expect(body.user.id).toBe(user.id);
                    expect(body.user.username).toBe(user.username);
                    expect(body.user.email).toBe(user.email);
                    expect(body.user.password).toBeUndefined();
                    expect(body.user.authenticationUuid).toBeUndefined();
                    expect(new Date(body.user.createdAt).toISOString()).toBe(new Date(user.createdAt).toISOString());
                    expect(new Date(body.user.updatedAt).toISOString()).toBe(new Date(user.updatedAt).toISOString());

                    const decryptedToken = await encryptionService.decryptAES256(body.token, configuration.encryption.key, configuration.encryption.iv);
                    expect(decryptedToken).toBe(user.authenticationUuid);
                })
        });
        test("Logs in by email", async () => {
            const user = await createTestUser();

            await supertest(app)
                .post("/auth/login")
                .send({
                    login: "localadmin@localhost.local",
                    password: "!L0c4l4dmin123/"
                })
                .expect(200)
                .then(async res => {
                    const body = res.body;

                    expect(isString(body.token)).toBeTruthy();
                    expect(body.user.id).toBe(user.id);
                    expect(body.user.username).toBe(user.username);
                    expect(body.user.email).toBe(user.email);
                    expect(body.user.password).toBeUndefined();
                    expect(body.user.authenticationUuid).toBeUndefined();
                    expect(new Date(body.user.createdAt).toISOString()).toBe(new Date(user.createdAt).toISOString());
                    expect(new Date(body.user.updatedAt).toISOString()).toBe(new Date(user.updatedAt).toISOString());

                    const decryptedToken = await encryptionService.decryptAES256(body.token, configuration.encryption.key, configuration.encryption.iv);
                    expect(decryptedToken).toBe(user.authenticationUuid);
                })
        });
        test("Returns bad request with proper code if user does not exist.", async () => {
            await supertest(app)
                .post("/auth/login")
                .send({
                    login: "localadmin",
                    password: "!L0c4l4dmin1234/"
                })
                .expect(400)
                .then(async res => {
                    const body = res.body;
                    expect(body.statusCode).toBe(400);
                    expect(body.message).toBe("BAD_REQUEST");
                    expect(body.data).toStrictEqual([BadRequestCodes.USER_NOT_FOUND]);
                });
        });
    });

    describe('/auth/register - Register method', function () {
        describe("Validates request data properly", () => {
            testValidationExceptions((body: any) => {
                return supertest(app)
                    .post("/auth/register")
                    .send(body)
                    .expect(400);
            }, [
                {
                    name: "username, email and password required",
                    body: {},
                    expectedErrors: [
                        'username.isString',
                        'username.isAlphanumeric',
                        'username.isLength',
                        'email.isString',
                        'email.isLength',
                        'email.isEmail',
                        'password.isString',
                        'password.isStrongPassword',
                        'password.isLength',
                    ]
                },
                {
                    name: "username must be a string",
                    body: {username: 30, email: "localadmin@localhost.local", password: "AB$!@213abb"},
                    expectedErrors: [
                        'username.isString',
                        'username.isAlphanumeric',
                        'username.isLength'
                    ]
                },
                {
                    name: "username must have minimum 3 characters",
                    body: {username: "12", email: "localadmin@localhost.local", password: "AB$!@213abb"},
                    expectedErrors: [
                        'username.isLength'
                    ]
                },
                {
                    name: "username must have maximum 64 characters",
                    body: {username: randomString(65), email: "localadmin@localhost.local", password: "AB$!@213abb"},
                    expectedErrors: ["username.isLength"]
                },
                {
                    name: "username must be alphanumeric",
                    body: {username: "$!@#!*@#&*!", email: "localadmin@localhost.local", password: "AB$!@213abb"},
                    expectedErrors: ["username.isAlphanumeric"]
                },
                {
                    name: "email must be a string",
                    body: {username: "localadmin", email: 123, password: "AB$!@213abb"},
                    expectedErrors: [
                        'email.isString',
                        'email.isLength',
                        'email.isEmail',
                    ]
                },
                {
                    name: "email have maximum 320 characters",
                    body: {username: "localadmin", email: randomString(321), password: "AB$!@213abb"},
                    expectedErrors: [
                        'email.isLength',
                        'email.isEmail',
                    ]
                },
                {
                    name: "email must be a valid email",
                    body: {username: "localadmin", email: "123321", password: "AB$!@213abb"},
                    expectedErrors: [
                        'email.isEmail',
                    ]
                },
                {
                    name: "Password must be a string",
                    body: {username: "localadmin", email: "localadmin@localhost.local", password: 123},
                    expectedErrors: ["password.isString", "password.isLength", "password.isStrongPassword"]
                },
                {
                    name: "Password must have minimum 8 characters",
                    body: {username: "localadmin", email: "localadmin@localhost.local", password: "AA$@2lk"},
                    // is strong password checks minimum length too!
                    expectedErrors: ["password.isLength", "password.isStrongPassword"]
                },
                {
                    name: "Password must have maximum 64 characters",
                    body: {
                        username: "localadmin",
                        email: "localadmin@localhost.local",
                        password: "@&k!3CAyAX#3zwUyy$Er!NvLBoCF4T8X858@b@#jbaZkAxe%BpRj&NM4x#7uhr@zMqbHH4RRYaw4wwhZ"
                    },
                    expectedErrors: ["password.isLength"],
                },
                {
                    name: "Password must be strong",
                    body: {username: "localadmin", email: "localadmin@localhost.local", password: "AB$#12222"},
                    expectedErrors: ["password.isStrongPassword"]
                }
            ]);
        });
        test("Returns created user", async () => {
            await supertest(app)
                .post("/auth/register")
                .send({
                    username: "localadmin",
                    password: "Localadmin123!@#",
                    email: "localadmin@localhost.local",
                })
                .expect(200)
                .then(async res => {
                    const user = await getAllInTable(db, "users").then(res => res[0]);
                    const { body } = res;

                    expect(body.id).toBe(user.id);
                    expect(body.username).toBe(user.username);
                    expect(body.email).toBe(user.email);
                    expect(body.password).toBeUndefined();
                    expect(body.authenticationUuid).toBeUndefined();
                    expect(new Date(body.createdAt)).toStrictEqual(new Date(user.createdAt));
                    expect(new Date(body.updatedAt)).toStrictEqual(new Date(user.updatedAt));

                    expect(await bcrypt.compare("Localadmin123!@#", user.password)).toBeTruthy();
                    expect(isUuid(user.authenticationUuid)).toBeTruthy();
                });

            expect(await getCountInTable(db, "users")).toBe(1);
        });
        test("Returns bad request with proper code if username has been already taken.", async () => {
            await createTestUser();
            expect(await getCountInTable(db, "users")).toBe(1);

            await supertest(app)
                .post("/auth/register")
                .send({
                    username: "localadmin",
                    password: "Localadmin123!@#",
                    email: "localadmin2@localhost.local",
                })
                .expect(400)
                .then(async res => {
                    const { body } = res;
                    expect(body.statusCode).toBe(400);
                    expect(body.message).toBe("BAD_REQUEST");
                    expect(body.data).toStrictEqual([BadRequestCodes.USER_USERNAME_ALREADY_TAKEN]);
                });

            expect(await getCountInTable(db, "users")).toBe(1);
        });
        test("Returns bad request with proper code if email has been already taken.", async () => {
            await createTestUser();
            expect(await getCountInTable(db, "users")).toBe(1);

            await supertest(app)
                .post("/auth/register")
                .send({
                    username: "localadmin2",
                    password: "Localadmin123!@#",
                    email: "localadmin@localhost.local",
                })
                .expect(400)
                .then(async res => {
                    const { body } = res;
                    expect(body.statusCode).toBe(400);
                    expect(body.message).toBe("BAD_REQUEST");
                    expect(body.data).toStrictEqual([BadRequestCodes.USER_EMAIL_ALREADY_TAKEN]);
                });

            expect(await getCountInTable(db, "users")).toBe(1);
        });
    });

    describe('/auth/user - Get user method', function () {
        test("Returns 401 if not logged in", async () => {
            await supertest(app)
                .get("/auth/user")
                .expect(401)
                .then(res => {
                    expect(res.body.statusCode).toBe(401);
                    expect(res.body.message).toBe("UNAUTHORIZED");
                    expect(res.body.data).toBeUndefined();
                });
        });
        test("Returns currently logged in user", async () => {
            const user = await createTestUser();
            const token = await encryptionService.encryptAES256(user.authenticationUuid, configuration.encryption.key, configuration.encryption.iv);

            await supertest(app)
                .get("/auth/user")
                .set("Authorization", `Bearer ${token}`)
                .expect(200)
                .then(res => {
                    expect(res.body.id).toBe(user.id);
                    expect(res.body.username).toBe(user.username);
                    expect(res.body.email).toBe(user.email);
                    expect(res.body.password).toBeUndefined();
                    expect(res.body.authenticationUuid).toBeUndefined();
                    expect(new Date(res.body.createdAt)).toStrictEqual(new Date(user.createdAt));
                    expect(new Date(res.body.updatedAt)).toStrictEqual(new Date(user.updatedAt));
                });
        });
    });
});