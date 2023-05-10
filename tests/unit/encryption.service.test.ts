import encryptionService from "../../src/services/encryption.service";

describe('Encryption service', function () {
    const key = Buffer.from("QqRPiJqI/9O2Qu6sZOqIQW4quL6NN5/+QG6nv/Qh7VM==", "base64");
    const iv = Buffer.from("svQbNKSZuuAc2jwsT046zA==", "base64");

    let encryptionResult: string;

    test("Encrypt AES 256 returns anything", async () => {
        encryptionResult = await encryptionService.encryptAES256("Hello world!", key, iv);

        expect(typeof encryptionResult).toBe("string");
        expect(encryptionResult.length).not.toBe(0);
    });

    test("Decrypt AES 256 returns good string", async () => {
        const result = await encryptionService.decryptAES256(encryptionResult, key, iv);

        expect(result).toBe("Hello world!");
    });
});