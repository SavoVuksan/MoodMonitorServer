const User = require('./Models/User');
const Emotion = require('./Models/Emotion');
const Entry = require('./Models/Entry');

const express = require('express');
const bodyParser = require('body-parser');

const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Origin", "http://localhost:4200");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    res.header('Access-Control-Allow-Credentials', true);
    next();
});

//Mongoose
mongoose.connect('mongodb://localhost/MoodMonitorDB',{useNewUrlParser: true})
    .then(() => console.log('MongoDB Connected')).catch(err => console.log(err));

//Express session
app.use(
    session({
        secret: 'moodmonitor',
        resave: true,
        saveUninitialized: true,
        cookie: {httpOnly: true}
    })
);



//Passport Middleware
//configurePassport();
passport.use(
    new LocalStrategy({usernameField: 'username', session: true},function(username,password,done){

        User.findOne({username: username}).then( user => {

            if(!user){
                return done(null,false,{message: 'That email is not registered'});

            }

            //Match password
            bcrypt.compare(password,user.password, (err, isMatch) =>{
                if(err) throw err;
                if(isMatch){
                    return done(null, user);
                }else{
                    return done(null, false,{message: 'Password incorrect'});
                }
            });


        })
    })
);
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});
app.use(passport.initialize());
app.use(passport.session());



//Init Bodyparser Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// REQUESTS

app.post('/register', (req,res) =>{
    const { username, email, password, password2} = req.body;

    let errors = [];

    if(!username || !email || !password || !password2){
        errors.push({msg: 'Enter all fields!'});
    }

    if(password !== password2){
        errors.push({msg: 'Passwords do not match!'})
    }

    if(errors.length === 0){
        User.findOne({email: email}).then(user =>{

            if(user){
                errors.push({msg: 'Email already exists'});
                res.send(errors);
            }else{
                const newUser = new User({username,email,password});

                bcrypt.genSalt(10, (err, salt) =>{

                    bcrypt.hash(newUser.password, salt, (err, hash) =>{

                        if(err) throw  err;

                        newUser.password = hash;

                        newUser.save()
                            .then(user =>{
                                res.send("User Registered!");
                            })
                            .catch(err => console.log(err));
                    });
                });

            }

        });
    }


});

app.post('/login', (req, res,next) =>{

    passport.authenticate('local',(err, user, info) =>{
        if(info){console.log(info.message);}
        if(err) throw err;
        if(!user){
           return res.send( {text: 'User not Registered!'});
        }else {


            req.logIn(user, err => {
                if (err) return next(err);
                return res.send({text: "success"});
            });
        }


    })(req, res, next);
});

app.get('/authRequired',(req,res,next) =>{
   console.log(`User authenticated? ${req.isAuthenticated()}`);
   res.send(`Authenticated? ${req.isAuthenticated()}`);
});

app.get('/getPositiveEmotions',(req,res,next) =>{
         Emotion.find({ type: 'positive'}).then((docs) =>{
             const emotions = docs;
             res.send(emotions);
        }).catch((err) => console.log(err));
});

app.get('/getNegativeEmotions', (req,res,next) =>{
    Emotion.find({ type: 'negative'}).then((docs) =>{
        const emotions = docs;
        res.send(emotions);
    }).catch(err => console.log(err));
});

app.post('/saveEntry', (req, res, next) => {
    const {title, tags, text, positiveEmotions, negativeEmotions} = req.body;
    const entry = new Entry({
        title,
        tags,
        text,
        user: mongoose.Types.ObjectId(req.user.id)
    });
    if(positiveEmotions) {
        positiveEmotions.forEach(item => entry.positiveEmotions.push(mongoose.Types.ObjectId(item.id)));
    }
    if(negativeEmotions) {
        negativeEmotions.forEach(item => entry.negativeEmotions.push(mongoose.Types.ObjectId(item.id)));
    }

    entry.save();
    res.send({text: 'Entry Saved!'});
});

app.get('/getEntries', (req, res, next) =>{
    Entry.find({user: mongoose.Types.ObjectId(req.user.id)}).populate('positiveEmotions').populate('negativeEmotions').then(docs => res.send(docs)).catch(err => console.log(err));
});

app.get('/getLastEntry', (req, res, next) =>{
    if(req.user === undefined){res.send({text: "not authorized!"});}else {
        Entry.findOne({user: req.user.id}).sort({createdOn: -1}).then(doc => res.send(doc)).catch(err => console.log(err));
    }
});

app.get('/goodDayCount',(req,res,next) =>{
   if(req.user === undefined){res.send({text: 'not authorized!'});}else{
       Entry.collection.countDocuments({user: mongoose.Types.ObjectId(req.user.id),
           positiveEmotions: {$exists: true, $ne: []},
           negativeEmotions: {$exists: true, $size: 0}}).then(c => res.send({goodDayCount: c}));
   }
});

app.get('/badDayCount',(req,res,next) =>{
   if(req.user === undefined){res.send({text: 'not authorized!'});}else{
       Entry.collection.countDocuments({user: mongoose.Types.ObjectId(req.user.id),
       negativeEmotions: {$exists: true, $ne: []},
           positiveEmotions: {$exists: true, $size: 0}
       }).then(c => res.send({badDayCount: c}));
   }
});

app.get('/getAllEntries',(req,res,next) =>{
   if(req.user === undefined){res.send({text: 'not authorized!'});}else{
       Entry.find({user: mongoose.Types.ObjectId(req.user.id)}).then(docs => res.send(docs));
   }
});

// API
app.post('/api/postEmotion',(req,res,next) =>{
   const {type,name} = req.body;
    const emotion = new Emotion({type,name});
    emotion.save();
    res.send('Saved Emotion!');
});

app.post('/api/postEntryWithDate',(req,res,next) =>{
    const {title, tags, text, positiveEmotions, negativeEmotions, createdOn} = req.body;

    const entry = new Entry({
        title,
        tags,
        text,
        user: mongoose.Types.ObjectId(req.user.id),
        createdOn: new Date(createdOn)
    });
    if(positiveEmotions) {
        positiveEmotions.forEach(item => entry.positiveEmotions.push(mongoose.Types.ObjectId(item.id)));
    }
    if(negativeEmotions) {
        negativeEmotions.forEach(item => entry.negativeEmotions.push(mongoose.Types.ObjectId(item.id)));
    }

    entry.save();
    res.send({text: 'API Entry with Date Saved!'});

});


app.listen(3000, ()=>{
    console.log('Mood Monitor Server running on port 3000!');
});

function configurePassport(){


}



