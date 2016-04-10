module.exports = {
    // Production Authy API key
    // it is in config.json because it is referenced in multiple other components
    authyApiKey: process.env.AUTHY_API_KEY || "not set"
};
