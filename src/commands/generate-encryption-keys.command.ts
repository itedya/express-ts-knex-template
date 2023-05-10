import * as crypto from "crypto";

const run = () => {
    const key = crypto.randomBytes(32).toString('base64');
    const iv = crypto.randomBytes(16).toString('base64');

    console.log("Your key is: " + key);
    console.log("Your iv is: " + iv);
}

run();