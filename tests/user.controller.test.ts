import {Knex} from "knex";
import {Express} from "express";
import getDatabase from "../src/database/connection";
import {findByColumnInTable, getCountInTable, migrateDownDatabase, migrateUpDatabase} from "./helpers/db.test-helpers";
import createApp from "../src/app";
import supertest from "supertest";
import createTestUserModel, {createAuthenticationToken} from "./helpers/models/user-model.test-helper";
import {iInRange, serialize} from "./helpers/general.test-helpers";
import {plainToInstance} from "class-transformer";
import UserDto from "../src/dtos/user.dto";
import bcrypt from "bcrypt";
import {isUuid} from "./helpers/type.test-helpers";
import {BadRequestCodes} from "../src/exceptions/bad-request.http-exception";

describe('User controller', function () {
    let db: Knex;
    let app: Express;

    beforeAll(async () => {
        db = await getDatabase();
        app = await createApp();
    });

    beforeEach(async () => {
        await migrateDownDatabase(db);
        await migrateUpDatabase(db);
    });

    afterAll(async () => {
        await db.destroy();
    });

    describe('GET / - Get paginated users', function () {
        test("Requires authorization", async () => {
            const result = await supertest(app)
                .get("/user")
                .expect(401)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 401,
                message: "UNAUTHORIZED"
            })
        });

        test("Throws forbidden when not an admin", async () => {
            const user = await createTestUserModel(db);
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .get("/user")
                .set("Authorization", `Bearer ${token}`)
                .expect(403)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 403,
                message: "FORBIDDEN"
            });
        });

        test("Gets paginated users with paginator defaults", async () => {
            const user = await createTestUserModel(db, {seed: 0, isAdmin: true});

            const allUsers = await Promise.all([
                user,
                ...iInRange(2, 20).map(i => createTestUserModel(db, {seed: i}))
            ]);

            const token = await createAuthenticationToken(user.authenticationUuid);

            let result = await supertest(app)
                .get("/user")
                .set("Authorization", `Bearer ${token}`)
                .then(res => res.body);

            expect(result).toStrictEqual({
                items: serialize([user, ...allUsers.slice(1, 5)]),
                total: 20,
                totalPages: 4,
                perPage: 5,
                currentPage: 1,
            });
        });

        test("Gets paginated users with custom paginator options", async () => {
            const user = await createTestUserModel(db, {seed: 0, isAdmin: true});

            const allUsers = await Promise.all([
                user,
                ...iInRange(2, 20).map(i => createTestUserModel(db, {seed: i}))
            ]);

            const token = await createAuthenticationToken(user.authenticationUuid);

            let params = new URLSearchParams();
            params.set("perPage", "8");
            params.set("currentPage", "3");

            let result = await supertest(app)
                .get(`/user?${params.toString()}`)
                .set("Authorization", `Bearer ${token}`)
                .then(res => res.body);

            expect(result).toStrictEqual({
                items: serialize(allUsers.slice(16)),
                total: 20,
                totalPages: 3,
                perPage: 8,
                currentPage: 3,
            });
        });

        test("Gets paginated users with search", async () => {
            const user = await createTestUserModel(db, {seed: 0, isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const allUsers = await Promise.all([
                ...iInRange(1, 10).map(i => createTestUserModel(db, {seed: i})),
                ...iInRange(10, 19).map(i => createTestUserModel(db, {
                    baseUsername: "localuser%seed%",
                    baseEmail: "localuser%seed%@localhost.local",
                    seed: i
                }))
            ]);

            let params = new URLSearchParams();
            params.set("perPage", "8");
            params.set("currentPage", "1");
            params.set("search", "user");

            let result = await supertest(app)
                .get(`/user?${params.toString()}`)
                .set("Authorization", `Bearer ${token}`)
                .then(res => res.body);

            expect(result).toStrictEqual({
                items: serialize(allUsers.slice(10, 18)),
                total: 10,
                totalPages: 2,
                perPage: 8,
                currentPage: 1,
            });

            params.set("currentPage", "2");

            result = await supertest(app)
                .get(`/user?${params.toString()}`)
                .set("Authorization", `Bearer ${token}`)
                .then(res => res.body);

            expect(result).toStrictEqual({
                items: serialize(allUsers.slice(18, 20)),
                total: 10,
                totalPages: 2,
                perPage: 8,
                currentPage: 2,
            });
        })
    });

    describe('POST / - Create user', function () {
        test("Requires authorization", async () => {
            const result = await supertest(app)
                .post("/user")
                .expect(401)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 401,
                message: "UNAUTHORIZED"
            });
        });

        test("Throws forbidden when not an admin", async () => {
            const user = await createTestUserModel(db);
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .expect(403)
                .then(res => res.body);

            expect(result).toStrictEqual({
                statusCode: 403,
                message: "FORBIDDEN"
            });
        });

        test("Creates user successfully", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: "localadmin",
                    password: "localadmin123",
                    email: "localadmin@localhost.local",
                    isAdmin: false
                })
                .expect(200)
                .then(res => res.body);

            const createdUser = await findByColumnInTable(db, "users", "id", user.id + 1)
                .then(res => plainToInstance(UserDto, res));

            expect(createdUser.id).toStrictEqual(user.id + 1);
            expect(createdUser.username).toStrictEqual("localadmin");
            expect(createdUser.email).toStrictEqual("localadmin@localhost.local");
            expect(await bcrypt.compare("localadmin123", createdUser.password)).toBeTruthy();
            expect(await isUuid(createdUser.authenticationUuid)).toBeTruthy();
            expect(createdUser.isAdmin).toBeFalsy();
            expect(await createdUser.createdAt).toBeInstanceOf(Date);
            expect(await createdUser.updatedAt).toBeInstanceOf(Date);

            expect(result).toStrictEqual(serialize(createdUser));
        });

        test("Creates admin user successfully", async () => {
            const user = await createTestUserModel(db, { isAdmin: true });
            const token = await createAuthenticationToken(user.authenticationUuid);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: "localadmin",
                    password: "localadmin123",
                    email: "localadmin@localhost.local",
                    isAdmin: true
                })
                .expect(200)
                .then(res => res.body);

            const createdUser = await findByColumnInTable(db, "users", "id", user.id + 1)
                .then(res => plainToInstance(UserDto, res));

            expect(createdUser.id).toStrictEqual(user.id + 1);
            expect(createdUser.username).toStrictEqual("localadmin");
            expect(createdUser.email).toStrictEqual("localadmin@localhost.local");
            expect(await bcrypt.compare("localadmin123", createdUser.password)).toBeTruthy();
            expect(await isUuid(createdUser.authenticationUuid)).toBeTruthy();
            expect(createdUser.isAdmin).toBeTruthy();
            expect(await createdUser.createdAt).toBeInstanceOf(Date);
            expect(await createdUser.updatedAt).toBeInstanceOf(Date);

            expect(result).toStrictEqual(serialize(createdUser));
        });

        test("Throws bad request when username is not unique", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            expect(await getCountInTable(db, "users")).toBe(1);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: "localadmin0",
                    password: "localadmin123",
                    email: "localadmin@localhost.local",
                    isAdmin: false
                })
                .expect(400)
                .then(res => res.body);

            expect(await getCountInTable(db, "users")).toBe(1);

            expect(result).toStrictEqual({
                statusCode: 400,
                message: "BAD_REQUEST",
                data: [BadRequestCodes.USER_USERNAME_ALREADY_TAKEN]
            });
        });

        test("Throws bad request when email is not unique", async () => {
            const user = await createTestUserModel(db, {isAdmin: true});
            const token = await createAuthenticationToken(user.authenticationUuid);

            expect(await getCountInTable(db, "users")).toBe(1);

            const result = await supertest(app)
                .post("/user")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    username: "localadmin",
                    password: "localadmin123",
                    email: "localadmin0@localhost.local",
                    isAdmin: false
                })
                .expect(400)
                .then(res => res.body);

            expect(await getCountInTable(db, "users")).toBe(1);

            expect(result).toStrictEqual({
                statusCode: 400,
                message: "BAD_REQUEST",
                data: [BadRequestCodes.USER_EMAIL_ALREADY_TAKEN]
            });
        });
    });
});