function isVercel() {
    return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

module.exports = {
    isVercel
};
