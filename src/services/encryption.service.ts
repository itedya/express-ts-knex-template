import * as crypto from "crypto";
import * as bcrypt from "bcrypt";

const encryptAES256 = async (content: string, key: Buffer, iv: Buffer): Promise<string> => {
    let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

const decryptAES256 = async (content: string, key: Buffer, iv: Buffer): Promise<string> => {
    let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(content, 'base64', 'utf8');
    return (decrypted + decipher.final('utf8'));
}

const checkBCrypt = (hash: string, payload: string): Promise<boolean> =>  {
    return bcrypt.compare(payload, hash);
}

const hashBCrypt = (payload: string): Promise<string> => {
    return bcrypt.hash(payload, 12);
}

const encryptionService = { encryptAES256, decryptAES256, hashBCrypt, checkBCrypt };

export default encryptionService;