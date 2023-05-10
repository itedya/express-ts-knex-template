const randomString = (size: number) => {
    let res = "", i = 0;
    const charset = "abcdefghijklmnopqrstuvwxyz"; //from where to create
    while (i++ < size)
        res += charset.charAt(Math.random() * charset.length)

    return res;
}

export { randomString }