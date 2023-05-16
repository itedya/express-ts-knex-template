const randomString = (size: number) => {
    let res = "", i = 0;
    const charset = "abcdefghijklmnopqrstuvwxyz"; //from where to create
    while (i++ < size)
        res += charset.charAt(Math.random() * charset.length)

    return res;
}

const iInRange = (from: number, to: number) => {
    return Array(to - from + 1).fill(undefined).map((v, i) => i + from);
}

export {randomString, iInRange}