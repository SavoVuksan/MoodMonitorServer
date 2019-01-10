import express from './node_modules/express/index';
import mongo from './node_modules/mongodb/index';
import bodyParser from './node_modules/body-parser/index';

import mongoose from './node_modules/mongoose/index';
import passport from './node_modules/passport/lib/index';
import session from './node_modules/express-session/index';
import bcrypt from './node_modules/bcryptjs/index';

import User from './Models/User';

const app = express();



//MongoDB connection via Mongoose OM-Library
mongoose.connect('mongodb://localhost/MoodMonitorDB', {useNewUrlParser: true})
    .then(() => console.log('MongoDB Connected')).catch(err => console.log(err));

//Express session
app.use(
    session({
        secret: 'moodmonitor',
        resave: true,
        saveUninitialized: true
    })
);

//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

//Init Bodyparser Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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

// Login
app.post('/login', (req, res, next) => {
    passport.authenticate('local', function(req2, res2){
        console.log(req2.user);
        res.send(req2.user);
    });
});


/**
 * OLD CODE
 */

let connection;

const mongoClient = mongo.MongoClient;


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.listen(3000, ()=>{

    console.log('Mood Monitor Server running on port 3000!');

    mongoClient.connect('mongodb://localhost:27017',(err,db) =>{
        if(err)
            throw err;
        connection = db.db('MoodMonitorDB').collection('MMCollection');
    });

});

app.get('/' ,(req,res) =>{
    res.send('Hello World!');
});
app.get('/positiveEmotions', (req,res) =>{
    connection.find({}).project({positiveEmotions: 1, _id: 0}).toArray((err,elements) =>{
       res.send(elements);
    });
});
app.get('/negativeEmotions', (req,res) => {
    connection.find({}).project({negativeEmotions: 1, _id: 0}).toArray((err, elements) =>{
       res.send(elements);
    });
});

app.post('/saveEntry', (req,res) =>{
    console.log(req.body);
    connection.insert(req.body,{},(err, doc) =>{
        console.log(doc);
    });
    res.send({text: "Entry saved Successfully!"});
});

app.get('/goodDayCount',(req,res) =>{
   connection.aggregate([
       {
           '$match': {
               'posEmotions': {
                   '$gt': []
               },
               'negEmotions': {
                   '$lte': []
               }
           }
       }, {
           '$count': 'posEmotions'
       },
       {
           $project: {
               'posDays': '$posEmotions'
           }
       }
   ],null).toArray((err, elements) =>{
        console.log(elements);
        res.send(elements[0]);
    });
});

app.get('/badDayCount',(req,res) =>{
    connection.aggregate([
        {
            '$match': {
                'negEmotions': {
                    '$gt': []
                },
                'posEmotions': {
                    '$lte': []
                }
            }
        }, {
            '$count': 'negEmotions'
        },
        {
            $project: {
                'negDays': '$negEmotions'
            }
        }
    ],null).toArray((err, elements) =>{
        console.log(elements);
        res.send(elements[0]);
    });
});
app.get('/lastMood',(req,res) =>{

    connection.aggregate([
        {
            $match: {
                date: {
                    $exists: true
                }
            }
        }, {
            $sort: {
                date: -1
            }
        }, {
            $limit: 1
        }
    ],null).toArray((err,element) =>{
       res.send(element[0]);
    });
});
console.log("hello");

app.get('/getRangeEntries', (req,res) =>{
    let from = req.query.from;
    let to = req.query.to;
    connection.aggregate([
        {
            $match: {
                date: {
                    $gt: `${from}`
                },
                date: {
                    $lt: `${to}`
                }
            }
        }, {
            $sort: {
                date: 1
            }
        }
    ],null).toArray((err,elements) =>{
        res.send(elements);
    });
});

app.get('/searchEntries', (req,res) =>{
    //console.log(req.body);
    connection.find({
        positiveEmotions: {
            $exists: false
        },
        negativeEmotions: {
            $exists: false
        }
    }).project({_id: 0}).toArray((err,elements) =>{
       res.send(elements);
    });
});