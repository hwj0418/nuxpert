const path = require('path');
const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(fileUpload());
app.use(express.static('static'));

const cors = require('cors');
app.use(cors());

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

// Imports the Google Cloud client library
const vision = require('@google-cloud/vision');
// Creates a GCP vision client
const client = new vision.ImageAnnotatorClient();
// google-cloud storage
const {Storage} = require('@google-cloud/storage');
// Creates a gcp storage client
const storage = new Storage();
// The name for the bucket
const bucketName = 'nuxpert';


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

// mongodb dependency
let mongoClient = require('mongodb').MongoClient;
// let dbUrl = "mongodb://" + process.env.IPADDRESS + ":27017/cscc09";
// let dbUrl = "mongodb+srv://c09Viewer:viewer123@mongo-r9zv2.gcp.mongodb.net/test?retryWrites=true";
let dbUrl = "mongodb+srv://conner:8G0BOdeTu2gzNLyb@mongo-r9zv2.gcp.mongodb.net/test?retryWrites=true";

// other dependencies
const multer  = require('multer');
let upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const nodemailer = require("nodemailer");
const Fuse = require('fuse.js');


// randomly generate the verifacation code
// reference: https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript/1349462
function makeCode(length) {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

// reference: https://nodemailer.com/about/
async function sendEmail(){
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let account = await nodemailer.createTestAccount();
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp.live.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "ssy543030341@hotmail.com", // generated ethereal user
        pass: "******" // generated ethereal password
      }
    });
    let code = makeCode(5);
    // setup email data with unicode symbols
    let mailOptions = {
      from: 'ssy543030341@hotmail.com', // sender address
      to: "conner_s223@outlook.com", // list of receivers
      subject: "Hello ✔", // Subject line
    //   text: "Hello world?", // plain text body
      html: `<b>This verification code is ${code}</b>` // html body
    };
  
    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions)
    console.log("Message sent: %s", info.messageId);
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));  
}
// sendEmail().catch(console.error);

// user management
// var emailVerification = function(email) {
    
// };
  
console.log(makeCode(5));

// upload file to the bucket
// let filename = 'resources/s1.png';
// storage.bucket(bucketName).upload(filename, {
//     destination: filename,
//     metadata: {
//       // Enable long-lived HTTP caching headers
//       // Use only if the contents of the file will never change
//       // (If the contents will change, use cacheControl: 'no-cache')
//       cacheControl: 'public, max-age=31536000',
//     },
// })
// .then(() => {
//     console.log(`${filename} uploaded to ${bucketName}.`);
// })
// .catch(err => {
//     console.error('ERROR:', err);
// });
  
// make pdf part
const pdfMake = require("./node_modules/pdfmake/build/pdfmake.js");
const pdfFonts = require("./node_modules/pdfmake/build/vfs_fonts.js");
pdfMake.vfs = pdfFonts.pdfMake.vfs;
// cited page: https://github.com/bpampuch/pdfmake/blob/0.1/dev-playground/server.js
app.get('/api/pdf', function (req, res) {
    var docDefinition = {
        content: [
            'First paragraph',
            'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
        ]
    };

    const pdfDoc = pdfMake.createPdf(docDefinition);

    pdfDoc.getBase64((data) => {
        // convert the pdf to base64-encoded
        const base64Data = Buffer.from(data.toString('utf-8'), 'base64');
        let local_path = "uploads/test.pdf";
        // generate the local temp file
        fs.writeFile(local_path, base64Data, 'base64', function(err) {
            if(err) throw err;
        });
        // upload the file to the cloud bucket
        let bucket_path = 'usr1/test1.pdf';
        storage.bucket(bucketName).upload(local_path, {
            destination: bucket_path,
            metadata: {
            // Enable long-lived HTTP caching headers
            // Use only if the contents of the file will never change
            // (If the contents will change, use cacheControl: 'no-cache')
            cacheControl: 'public, max-age=31536000',
            },
        })
        .then(() => {
            console.log(`${bucket_path} uploaded to ${bucketName}.`);
            res.contentType('application/pdf');
            res.end(base64Data);
            fs.unlink(local_path, (err) => {
                if (err) throw err;
                console.log(`${local_path} was deleted`);
            });
        })
        .catch(err => {
            console.error('ERROR:', err);
        });
    });
});

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
            if (user) return res.status(409).end("username " + username + " already exists");
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

// signin
app.post('/signin/', function (req, res, next) {
    let username = req.body.username;
    let password = req.body.password;
    mongoClient.connect(dbUrl, {useNewUrlParser: true}, function(err, db) {
        if (err) return res.status(500).end(err.message);
        let users = db.db('cscc09').collection('users');   
        // console.log(username);
        users.findOne({username: username}, {projection: {_id: 0, username: 1, hash: 1, salt: 1}}, function(err, user) {
            if (err) return res.status(500).end(err.message);
            if (!user) return res.status(401).end("access denied");
            if (user.hash !== generateHash(password, user.salt)) return res.status(401).end("access denied"); 
            // initialize cookie
            // res.setHeader('Set-Cookie', cookie.serialize('username', username, {
            //     path : '/', 
            //     maxAge: 60 * 60 * 24 * 7
            // }));
            // // start a session
            // req.session.user = user;
            return res.json("user " + username + " signed in");
        });
    });
});



// upload image and return text
app.post('/api/search/image/', upload.single('image'), function (req, res, next) {
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
        let raw = results[0].textAnnotations[0].description.split("\n").filter(phrase => (!(/^\d+$/.test(phrase)) && !(/pour/.test(phrase)) && !(/Per/.test(phrase)) && !(/%/.test(phrase))) && ((/\d/.test(phrase)) || (/O/.test(phrase))));
        // handle the situation where the detected looks like this --- Iron/Fer, in long-text spliting
        let eng_fr = raw.filter(phrase => /\w\/\w/.test(phrase));
        raw.forEach(function(phrase) {
            // console.log(phrase);
            let basic = phrase.split("/")[0];
            // console.log(phrase);
            let remove_total_filtered = basic.replace("Total", "");
            // handle the situation when Google API detects '0' into 'O'
            let remove_uppero_filtered = remove_total_filtered.split('O')[0]
            let further_filtered = remove_uppero_filtered.split(/(\d+)/)[0].trim()
            // console.log(remove_total_filtered);
            if (further_filtered != "Calories" && further_filtered != "Includes") nutrients.push(further_filtered);
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
            // handle the situation where the nutrient contains at least two words
            if(detail.length == 0){
                // console.log(nutrient);
                let splited = nutrient.split(" ");
                for (let i = 0; i < keywords.length; i++){
                    if(splited[0] == keywords[i].description){
                        let j = 1, valid = true;
                        while(j < splited.length && valid){
                            if(splited[j] == keywords[i+j].description){
                                // console.log(keywords[i+j]);
                                j++;
                            } else{
                                valid = false; 
                            }
                        }
                        if(valid){
                            console.log(`Successfully match ${nutrient}`)
                            break;
                        }
                    }
                }
                // console.log(keywords.filter(keyword => keyword.description == splited[0]));
                let index = keywords.indexOf(keywords.filter(keyword => keyword.description == splited[0]), 2);
                // console.log(index);
                // detail = keywords.filter();
            }
        });
        json_result['width'] = width;
        json_result['height'] = height;
        console.log(nutrients);
        // return res.json(results[0]);
        // console.log(nutrients);
        // console.log(json_result);
        // return res.json(results[0].textAnnotations[0].description.split("\n"));
        // return res.json(nutrients);
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
        nutrients.findOne({name: req.params.name}, {projection: {_id: 0, name: 1, details: 1}}, function(err, nutrient) {
            db.close();
            return res.json(nutrient);
        });
    });
});

app.get('/api/fuzzy/nutrient/:keyword/', function (req, res, next) {
    mongoClient.connect(dbUrl, {useNewUrlParser: true}, function(err, db) {
        if (err) return res.status(500).end(err.message);
        let nutrients = db.db('cscc09').collection('nutrients');
        nutrients.find().project({_id: 0, name: 1, details: 1}).toArray(function(err, nutrients_lst) {
            db.close();
            // need to update the config
            let options = {
                shouldSort: true,
                threshold: 0.6,
                location: 0,
                distance: 100,
                maxPatternLength: 32,
                minMatchCharLength: 1,
                keys: [
                    "name"
                ]
            };
            var fuse = new Fuse(nutrients_lst, options);
            var result = fuse.search(req.params.keyword);     
            return res.json(result);   
        });
    });
});


app.post('/api/nutrients/', function (req, res, next) {
    mongoClient.connect(dbUrl, {useNewUrlParser: true}, function(err, db) {
        if (err) return res.status(500).end(err.message);
        let nutrients = db.db('cscc09').collection('nutrients');
        // console.log(new Nutrient(req.body));
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
const https = require('https');
const PORT = 8080;

// let privateKey = fs.readFileSync( 'server.key' );
// let certificate = fs.readFileSync( 'server.crt' );
// let config = {
//         key: privateKey,
//         cert: certificate
// };

// https.createServer(config, app).listen(PORT, function (err) {
//     if (err) console.log(err);
//     else console.log("HTTPS server on https://localhost:%s", PORT);
// });

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});