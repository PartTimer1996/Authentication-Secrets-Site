//jshint esversion:6

//require and install the below package for the configuration of environment variables
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
var encrypt = require('mongoose-encryption');

const app = express()
const port = 3000;

// See below how we can access environment variables i.e.
// the API key variable that was stored, done for secret also
//console.log(process.env.API_KEY);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static("public"));

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true});

//Creation of Schema and Model to add to this database
const userSchema = new mongoose.Schema (
    { username: String,
        password: String }
        );

const secret = 'secret';

userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

const User = mongoose.model('User', userSchema);


app.get('/', function (req, res)
{
    res.render('home');
})


app.get('/login', function (req, res)
{
    res.render('login');
})

app.get('/register', function (req, res)
{
    res.render('register');
})

app.post('/register', function(req,res){
    const newUser = new User({
        username: req.body.username,
        password: req.body.password
    })

    newUser.save(function(err){
        if(err){
            res.render(err);
        }else{
            res.render('secrets');
        }
    });

})

app.post('/login', function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({username: username}, function (err, foundUser){
        if(err){
            res.render('Error: ' + err);
        }else {
            if(foundUser){
                if(foundUser.password === password){
                    res.render('secrets');
                }else{
                    res.render('Login Failed');
                }
            }
        }
    });
})

app.listen(port, () => console.log(`REST app listening on port ${port}!`))
