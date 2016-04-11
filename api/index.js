var middleware = require('./middleware');
var users = require('./users');
var sessions = require('./sessions');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();


// Mount API routes on the Express web app
module.exports = function(app) {
    // Look for session information before API requests
    app.use(middleware.loadUser);

    // Create a new user
    app.post('/user', jsonParser, users.create);

    // Get information about the currently logged in user
    app.get('/user', jsonParser, middleware.loginRequired, users.getUser);

    // Create a new session
    app.post('/session', jsonParser, sessions.create);

    // Log out (destroy a session)
    app.delete('/session', jsonParser, middleware.loginRequired, sessions.destroy);

    // Check the OneTouch status on the user
    app.get('/authy/status', jsonParser, sessions.authyStatus);

    // The webhook that Authy will call on a OneTouch event
    app.post('/authy/callback', jsonParser, middleware.validateSignature, sessions.authyCallback);

    // Validate the given session with an Authy 2FA token
    app.post('/session/verify', jsonParser, sessions.verify);

    // resend an authorization token
    app.post('/session/resend', jsonParser, sessions.resend);
};
