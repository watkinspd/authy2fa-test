var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('../config');
var onetouch = require('../api/onetouch');

// Create authenticated Authy API client
var authy = require('authy')(config.authyApiKey);

// Used to generate password hash
var SALT_WORK_FACTOR = 10;

// Define user model schema
var UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    countryCode: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    authyId: String,
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    authyStatus: {
        type: String,
        default: 'unverified'
    }
});

// Middleware executed before save - hash the user's password
UserSchema.pre('save', function(next) {
   console.log('inpresave');
    var self = this;

    // only hash the password if it has been modified (or is new)
    if (self.isModified('password')) {
      console.log('password modified so do the salt thing');
      // generate a salt
      bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
          if (err) return next(err);

          // hash the password using our new salt
          bcrypt.hash(self.password, salt, function(err, hash) {
              if (err) return next(err);

              // override the cleartext password with the hashed one
              self.password = hash;
              next();
          });
      });
    };

    if (!self.authyId) {
        // Register this user if it's a new user
        console.log('in registeruser');
        authy.register_user(self.email, self.phone, self.countryCode,
            function(err, response) {
            if(err){
                console.log ("error " + JSON.stringify(err));
                return;
            }
            console.log('response user id=' + response.user.id);
            self.authyId = response.user.id;
            self.save(function(err, doc) {
                console.log('in self save');
                if (err || !doc) return next(err);
                console.log('self = doc');
                self = doc;
            });
        });
    };
});

// Test candidate password
UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    var self = this;
    bcrypt.compare(candidatePassword, self.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

// Send a OneTouch request to this user
UserSchema.methods.sendOneTouch = function(cb) {
    var self = this;
    self.authyStatus = 'unverified';
    self.save();
    console.log('just before onetouch send approval request');
    onetouch.send_approval_request(self.authyId, {
        message: 'Request to Login to PWTEst demo app',
        email: self.email
    }, function(err, authyres){
        if (err && err.success != undefined) {
            authyres = err;
            err = null;
        }
        cb.call(self, err, authyres);
    });
};

// Send a 2FA token to this user
UserSchema.methods.sendAuthyToken = function(cb) {
    var self = this;
    console.log('about to authy request sms');
    authy.request_sms(self.authyId, function(err, response) {
        console.log('after request smsm');
        cb.call(self, err);
    });
};

// Test a 2FA token
UserSchema.methods.verifyAuthyToken = function(otp, cb) {
    var self = this;
    console.log('about to authy verify');
    authy.verify(self.authyId, otp, function(err, response) {
        console.log('authy verify');
        cb.call(self, err, response);
    });
};

// Export user model
module.exports = mongoose.model('User', UserSchema);
