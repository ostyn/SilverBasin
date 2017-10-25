const express = require("express");
const CONFIG = require('./configMaster');
var cors = require('cors')
var request = require('request-promise')
var bodyParser = require('body-parser');
var app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const db = require('monk')('localhost/silverBasin')
const codesCollection = db.get('codes')
const savedPathsCollection = db.get('savedPaths')

app.listen(5000, function () {
    console.log('Example app listening on port 5000!');
})

var pathLengths = new Map();
var files = new Map();
app.get("/saveAuthToken", saveAuthToken);
function saveAuthToken(req, res) {
    var code = req.query.code;
    if (code == undefined) {
        res.sendStatus(400);
    }
    var params = {
        'client_id': CONFIG.CLIENT_ID,
        'redirect_uri': 'http://localhost:5000/saveAuthToken',
        'client_secret': CONFIG.CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code'
    };
    var headers = { "Content-type": "application/x-www-form-urlencoded" };
    var json_response = request.post("https://login.live.com/oauth20_token.srf", { 'form': params })
        .then((data, something) => {
            codesCollection.drop().then(() => {
                data = JSON.parse(data)
                codesCollection.insert(
                    {
                        "code": code,
                        "access_token": data.access_token,
                        "refresh_token": data.refresh_token
                    }
                )
                    .then((a, b, c, d) => {
                        return res.send('<script>window.location.replace("http://localhost:9000");</script>');
                    });
            });
        });
}
app.get("/listDirectory", listDirectory);
function listDirectory(req, res, passedPath) {
    var path = req.query.path
    if (passedPath == undefined) {
        path = passedPath;
    }
    if (path == undefined) {
        path = "/drive/root:";
    }
    codesCollection.findOne()
        .then((entry) => {
            if (entry == undefined || entry.access_token == undefined) {
                return res.status(401).send({ 'message': 'Authorize the server first' });
            }
            var uri = "https://api.onedrive.com/v1.0" + path + ":/children?filter=folder ne null&access_token=" + entry.access_token;
            request.get(uri)
                .then((data) => {
                    response = JSON.parse(data)
                    return res.send(response);
                })
        });
}

app.get("/savedPaths", getSavedPathsWrapper);
function getSavedPathsWrapper(req, res) {
    getSavedPaths().then((paths) => {
        return res.send({ 'paths': paths });
    })
}
function getSavedPaths() {
    return savedPathsCollection.findOne()
        .then((data) => {
            paths = [];
            if (data != undefined) {
                paths = data["paths"];
            }
            return paths
        });
}

app.post("/savedPaths", postSavedPaths);
function postSavedPaths(req, res) {
    if (req.body.paths == undefined) {
        return res.send({ 'resp': true });
    }
    savedPathsCollection.drop().then(() => {
        if (req.body.paths.length == 0) {
            return res.send({ 'resp': true });
        }
        savedPathsCollection.insert({ 'paths': req.body.paths })
            .then(() => {
                return res.send({ 'resp': true });
            })
    });
}
randomMediaFile().then((file)=>{
    files["current"] = file;
    randomMediaFile().then((file)=>{
        files["next"] = file;
    });
});
var interval = setInterval(nextImage, 30000);

app.get("/nextImage", nextImageWrapper);
async function nextImageWrapper(req, res) {
    await nextImage(new Date());
    return res.send(files);
}

async function nextImage(expirationTime) {
    clearInterval(interval);
    interval = setInterval(nextImage, 30000);
    let temp = files["next"];
    files["next"] = await randomMediaFile();//TODO this is not right. need entry
    files["current"] = temp;
}

app.get("/getCurrentImage", getCurrentImage);
function getCurrentImage(req, res) {
    return res.send(files);
}

async function randomMediaFile() {
    var entry = await codesCollection.findOne();
    if (entry == undefined || entry.access_token == undefined) {
        return undefined
    }
    return getSavedPaths().then(async (paths) => {
        let count = 0
        for (var path of paths) {
            if (pathLengths.has(path) != undefined) {
                try {
                    var data = await request.get("https://api.onedrive.com/v1.0" + path + ":/children?top=1000&select=id&filter=file ne null and image ne null&access_token=" + entry.access_token)
                }
                catch (err) {
                    refresh_code(entry.code, entry.refresh_token);
                }
                var response = JSON.parse(data);
                count += response.value.length;
                pathLengths.set(path, response.value.length);
            }
            else {
                count += pathLengths.get(path);
            }

        }
        if (count <= 0) {
            return {};
        }
        randomIndex = getRandomInt(0, count - 1);
        remainder = randomIndex;
        path = "";
        for (var path of paths) {
            remainder -= pathLengths.get(path);
            if (remainder <= 0) {
                remainder += pathLengths.get(path);
                break;
            }
        }
        try {
            response = await request.get("https://api.onedrive.com/v1.0" + path + ":/children?orderby=name asc&filter=file ne null and image ne null&top=1000&access_token=" + entry.access_token);
        }
        catch (e) {
            console.log(e);
            return randomMediaFile();
        }
        response = JSON.parse(response);
        if (response.value == undefined) {
            return { 'err': response };
        }
        file = response["value"][remainder];
        file["stats"] = "original random index: " + randomIndex + ". Reduced to: " + remainder;
        return file;
    });
}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function refresh_code(code, refresh_token) {
    params = {
        'client_id': CONFIG.CLIENT_ID,
        'redirect_uri': 'http://localhost:5000/saveAuthToken', 'client_secret': CONFIG.CLIENT_SECRET, 'refresh_token': refresh_token, 'grant_type': 'refresh_token'
    };
    return request.post("https://login.live.com/oauth20_token.srf", { 'form': params })
        .then((data) => {
            return codesCollection.drop().then(() => {
                data = JSON.parse(data)
                return codesCollection.insert(
                    {
                        "code": code,
                        "access_token": data.access_token,
                        "refresh_token": data.refresh_token
                    }
                )
            });
        });
}