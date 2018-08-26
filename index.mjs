import express from './node_modules/express/index';
import mongo from './node_modules/mongodb/index';
import bodyParser from './node_modules/body-parser/index';

const app = express();
const mongoClient = mongo.MongoClient;
let connection;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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
   connection.find({}).project()
});
