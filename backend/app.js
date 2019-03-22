const path = require('path');
const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(fileUpload());
app.use(express.static('static'));

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

// Imports the Google Cloud client library
const vision = require('@google-cloud/vision');

// Creates a client
const client = new vision.ImageAnnotatorClient();

var Nutrient = (function(){
    return function item(nutrient){
        this.name = nutrient.name;
        this.details = nutrient.details;
    };
}());

var User = (function(){
    return function item(user){
        this.username = user.username;
        this.password = user.password;
    };
}());

// security dependency
const cookie = require('cookie');
const crypto = require('crypto');
const validator = require('validator');

function generateSalt (){
    return crypto.randomBytes(16).toString('base64');
}

function generateHash (password, salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    return hash.digest('base64');
}

const session = require('express-session');
app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));

let isAuthenticated = function(req, res, next) {
    if (!req.username) return res.status(401).end("access denied");
    next();
};

var checkUsername = function(req, res, next) {
    if (!validator.isAlphanumeric(req.body.username)) return res.status(400).end("bad input");
    next();
};

var sanitizeContent = function(req, res, next) {
    req.body.content = validator.escape(req.body.content);
    next();
};

var checkId = function(req, res, next) {
    if (!validator.isAlphanumeric(req.params.id)) return res.status(400).end("bad input");
    next();
};

let mongoClient = require('mongodb').MongoClient;
// let dbUrl = "mongodb://" + process.env.IPADDRESS + ":27017/cscc09";
// let olddbUrl = "mongodb://localhost:27017/mydb";
// let dbUrl = "mongodb+srv://c09Viewer:viewer123@mongo-r9zv2.gcp.mongodb.net/test?retryWrites=true";
let dbUrl = "mongodb+srv://conner:8G0BOdeTu2gzNLyb@mongo-r9zv2.gcp.mongodb.net/test?retryWrites=true";
// mongoClient.connect(dbUrl, {useNewUrlParser: true}, function(err, db) {
//     if (err) return res.status(500).end(err);
//     let nutrients = db.db('cscc09').collection('nutrients');
//     console.log('Connected to db!');
//     db.close();
// });

var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });
var fs = require('fs');
const nodemailer = require("nodemailer");

async function sendEmail(){

    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let account = await nodemailer.createTestAccount();
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: account.user, // generated ethereal user
        pass: account.pass // generated ethereal password
      }
    });
  
    // setup email data with unicode symbols
    let mailOptions = {
      from: '"Fred Foo 👻" <foo@example.com>', // sender address
      to: "ssy543030341@hotmail.com", // list of receivers
      subject: "Hello ✔", // Subject line
      text: "Hello world?", // plain text body
      html: "<b>Hello world?</b>" // html body
    };
  
    console.log('hhhhh');
    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions)
    console.log('done');
    console.log("Message sent: %s", info.messageId);
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}
  
// sendEmail().catch(console.error);

// user management
// var emailVerification = function(email) {
    
// };

// sign up
app.post('/signup/', function (req, res, next) {
    let username = req.body.username;
    let password = req.body.password;
    let email = req.body.email;
    mongoClient.connect(dbUrl, {useNewUrlParser: true}, function(err, db) {
        if (err) return res.status(500).end(err.message);
        let users = db.db('cscc09').collection('users');   
        // console.log(username);
        users.findOne({username: username}, {projection: {_id: 0, username: 1}}, function(err, user) {
            if (err) return res.status(500).end(err.message);
            // if (user) return res.status(409).end("username " + username + " already exists");
            let salt = generateSalt();
            let hash = generateHash(password, salt);
            // update the db
            users.updateOne({username: username},{ $set: {username: username, hash: hash, salt: salt}}, {upsert: true}, function(err){
                if (err) return res.status(500).end(err.message);
                // initialize cookie
                // res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                //       path : '/', 
                //       maxAge: 60 * 60 * 24 * 7
                // }));
                db.close();
                return res.json("user " + username + " signed up");
            });            
        });
    });
});


// upload image and return text
app.post('/api/search/image', upload.single('image'), function (req, res, next) {
    // save the file into uploads dir
    let path = 'uploads/' + req.files.image.md5;
    fs.writeFile(path, (Buffer.from(req.files.image.data)).toString('binary'),  "binary",function(err) { });
    let nutrients = [];
    client.textDetection(path).then(results => {
        let vertices = results[0].fullTextAnnotation.pages[0].blocks[0].boundingBox.vertices;
        // console.log(results[0]);
        // console.log(vertices);
        // console.log(results[0].textAnnotations);
        // console.log(results[0].textAnnotations[0].description);

        // find all the nutrients detected by Google Vision API
        let raw = results[0].textAnnotations[0].description.split("\n").filter(phrase => !(/^\d+$/.test(phrase)) && !(/pour/.test(phrase)) && !(/Per/.test(phrase)) && (/\d/.test(phrase)) && !(/%/.test(phrase)));
        // handle the situation where the detected looks like this --- Iron/Fer, in long-text spliting
        let eng_fr = raw.filter(phrase => /\w\/\w/.test(phrase));
        raw.forEach(function(phrase) {
            // console.log(phrase);
            let basic = phrase.split("/")[0];
            let filtered = basic.split(/(\d+)/)[0].trim()
            if (filtered != "Calories") nutrients.push(filtered);
        });
        eng_fr.forEach(function(phrase) {
            if(phrase.split(" ")[0].includes("/")) nutrients.push(phrase.split(" ")[0]);
        });
        // for each nutrient, find their corresponding coordinates
        // console.log(nutrients);
        let json_result = {};
        let keywords = results[0].textAnnotations.slice(1);
        let width = results[0].fullTextAnnotation.pages[0].width;
        let height = results[0].fullTextAnnotation.pages[0].height;
        nutrients.forEach(function(nutrient) {
            // basic scenario
            let detail = keywords.filter(keyword => keyword.description == nutrient);
            // handle situation where the detected text contains '/' in the end
            if(detail.length == 0){
                detail = keywords.filter(keyword => keyword.description == nutrient+"\/");
            }
            // handle the situation where the nutrient contains at least two words
            // if(detail.length == 0){
            //     console.log(nutrient);
            //     let splited = nutrient.split(" ");
            //     console.log(keywords.filter(keyword => keyword.description == splited[0]));
            //     let index = keywords.indexOf(keywords.filter(keyword => keyword.description == splited[0]), 2);
            //     console.log(index);
            //     // detail = keywords.filter();
            // }

            // pack the nutrient with the coordinates
            if (detail.length != 0){
                let vertices = detail[0].boundingPoly.vertices;
                let ymin = height, ymax = 0, xmin = width, xmax = 0;
                vertices.forEach(function(vertice) {
                    if (vertice.x > xmax) xmax = vertice.x;
                    if (vertice.x < xmin) xmin = vertice.x;
                    if (vertice.y > ymax) ymax = vertice.y;
                    if (vertice.y < ymin) ymin = vertice.y;
                });
                let vertice = {};
                vertice["yMax"] = ymax;
                vertice["yMin"] = ymin;
                vertice["xMax"] = xmax;
                vertice["xMin"] = xmin;
                // get rid off the '/' in some phrases like 'Iron/Fer'
                json_result[nutrient.split("/")[0].toLowerCase()] = vertice;
            }
            // console.log(detail);
        });
        json_result['width'] = width;
        json_result['height'] = height;
        // console.log(json_result);
        // return res.json(results[0]);
        return res.json(json_result);
        // return res.json(results[0].fullTextAnnotation.pages[0].blocks[0].boundingBox);
        // labels.forEach(label => console.log(label.description));
    }).catch(err => {
        console.error('ERROR:', err);
    });
});

// need to update the method
app.get('/api/nutrient/:name/', function (req, res, next) {
    mongoClient.connect(dbUrl, {useNewUrlParser: true}, function(err, db) {
        if (err) return res.status(500).end(err.message);
        let nutrients = db.db('cscc09').collection('nutrients');
        // need to update the Item(req.body)
        // nutrients.find().toArray(function(err, nutrient) {      
        //     db.close();
        //     return res.json(nutrient);
        // });
        nutrients.findOne({name: req.params.name}, {projection: {_id: 0, name: 1, details: 1}}, function(err, nutrient) {
            db.close();
            return res.json(nutrient);
        });
    });
    // items.find({}).sort({createdAt:-1}).limit(5).exec(function(err, items) { 
    //     if (err) return res.status(500).end(err);
    //     console.log(req);
    //     console.loads(res.status(500).end());
    //     return res.json(items.reverse());
    // });
});

app.post('/api/nutrients/', function (req, res, next) {
    mongoClient.connect(dbUrl, {useNewUrlParser: true}, function(err, db) {
        if (err) return res.status(500).end(err.message);
        // console.log(db.db('cscc09'));
        // console.log(typeof db);
        let nutrients = db.db('cscc09').collection('nutrients');
        // need to update the Item(req.body)
        console.log(new Nutrient(req.body));
        nutrients.insertOne(new Nutrient(req.body), function(err, nutrient) {
            if (err) return res.status(500).end(err.message);
            // Finish up test
            db.close();
            if(nutrient.insertedCount == 1) return res.json(req.body);
        });
    });
});

app.get('/', (req, res) => {
    res.send('Hello world\n');
});

const http = require('http');
const PORT = 8080;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});