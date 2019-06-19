//jshint esversion:6

//require and install the below package for the configuration of environment variables
require('dotenv').config();
//const md5 = require('md5');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const bcrypt = require("bcrypt");
const saltRounds =10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
const port = 3000;

// See below how we can access environment variables i.e.
// the API key variable that was stored, done for secret also
//console.log(process.env.API_KEY);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

//continue here
app.use(session({
    secret: "my lil secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


app.use(express.static("public"));

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);


//Creation of Schema and Model to add to this database
const userSchema = new mongoose.Schema (
    { username: String,
        password: String,
        googleId: String,
        secret: String
    }
        );

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//const secret = 'secret';

//userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

const User = mongoose.model('User', userSchema);

//How to initilise the passport usage for our user schema
passport.use(User.createStrategy());

// add data to cookie
passport.serializeUser(function(user, done){
    done(null, user.id)
});

//read cookie for the data
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    })
});

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get('/', function (req, res)
{
    res.render('home');
})

app.get("/auth/google",
    passport.authenticate("google", {scope : ['profile']}, function(){

    })
)

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect('/secrets');
    });

app.get('/login', function (req, res)
{
    res.render('login');
})

app.get('/register', function (req, res)
{
    res.render('register');
})

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect("/");
})

app.get("/secrets", function (req,res){
    User.find({'secret':{$ne:null}}, function(err, foundUsers){
        if(err){
            console.log(err);
        }else {
            if(foundUsers){
                res.render("secrets", {usersWithSecrets: foundUsers})
            }
        }
    });

})

app.get("/submit", function(req,res){
    if(req.isAuthenticated()){
        res.render('submit');
    }else {
        res.redirect('/login')
    }
})

app.post('/register', function(req,res){

    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if (err)
        {
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
        }
    });
})

app.post('/login', function(req, res){

    const user = new User({
    username: req.body.username,
    password: req.body.password

    });

    req.login(user, function(err){
       if(err){
           console.log(err);
           res.redirect("/login");
       } else {
           passport.authenticate("local")(req, res, function(){
               res.redirect("secrets");
           });
       }
    });
})

app.post('/submit', function(req, res){
    const secretsubmitted = req.body.secret;

    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser) {
                foundUser.secret = secretsubmitted;

                foundUser.save(function()
                {
                    res.redirect('/secrets')


                });
            }
        }
    })
})


app.listen(port, () => console.log(`REST app listening on port ${port}!`))
