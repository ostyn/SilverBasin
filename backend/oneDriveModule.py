import json, requests
from random import randint
from flask import request, jsonify, Blueprint, abort

from bson.objectid import ObjectId
from configMaster import CLIENT_ID, CLIENT_SECRET

def construct_blueprint(codesCollection):
    oneDriveModule = Blueprint('oneDriveModule', __name__)

    @oneDriveModule.route("/saveAuthToken", methods=['GET'])
    def saveAuthToken():
        code = request.args.get('code')
        if code is None:
            abort(400)
        params = {
                    'client_id': CLIENT_ID, 
                    'redirect_uri': 'http://localhost:5000/saveAuthToken', 
                    'client_secret': CLIENT_SECRET, 
                    'code': code, 
                    'grant_type': 'authorization_code'
                }
        headers = {"Content-type": "application/x-www-form-urlencoded"}
        json_response = requests.post("https://login.live.com/oauth20_token.srf", data=params, headers=headers).text
        r = json.loads(json_response)
        codesCollection.drop()
        codesCollection.insert(
            {
                "code" : code,
                "access_token" : r["access_token"],
                "refresh_token" : r["refresh_token"]
            }
        )
        return '<script>window.location.replace("http://localhost:9000");</script>'
    @oneDriveModule.route("/listDirectory", methods=['GET'])
    def listDirectory(passedPath = None):
        path = request.args.get('path')
        if passedPath is not None:
            path = passedPath
        if path is None:
            path = "/drive/root:"
        entry = codesCollection.find_one()
        if entry is None or entry.get("access_token") is None:
            abort(401)
        headers = {"Content-type": "application/x-www-form-urlencoded"}
        response = requests.get("https://api.onedrive.com/v1.0" + path + ":/children?access_token=" + entry.get("access_token"), headers=headers)
        response = json.loads(response.text)
        if response_is_error(response):
            refresh_code(entry.get("code"), entry.get("refresh_token"))
            return listDirectory(path)
        return jsonify(response)

    # Max number of items per folder is 1000
    @oneDriveModule.route("/randomMediaFile", methods=['GET'])
    def randomMediaFile():
        paths = [ "/drive/root:/Pictures/2017/Seoul"]
        pathLengths = {}
        entry = codesCollection.find_one()
        if entry is None or entry.get("access_token") is None:
            abort(401)
        headers = {"Content-type": "application/x-www-form-urlencoded"}
        count = 0
        for path in paths:
            response = requests.get("https://api.onedrive.com/v1.0" + path + ":/children?top=1000&select=id&filter=file ne null and (image ne null or video ne null)&access_token=" + entry.get("access_token"), headers=headers)
            response = json.loads(response.text)
            if response_is_error(response):
                refresh_code(entry.get("code"), entry.get("refresh_token"))
                return randomMediaFile()
            count += len(response["value"])
            pathLengths[path] = len(response["value"])
        if count <= 0:
            return ""
        randomIndex = randint(0, count-1)
        remainder = randomIndex
        path = ""
        for path in paths:
            remainder -= pathLengths[path]
            if remainder <= 0:
                remainder += pathLengths[path]
                break
        response = requests.get("https://api.onedrive.com/v1.0" + path + ":/children?orderby=name asc&filter=file ne null and (image ne null or video ne null)&top=" + str(remainder + 1) + "&access_token=" + entry.get("access_token"), headers=headers)
        response = json.loads(response.text)
        file = response["value"][remainder]
        file["stats"] = "original random index: " + str(randomIndex) +". Reduced to: " + str(remainder)
        return jsonify(file)

    def response_is_error(response):
        return response.get('error') and response.get('error').get('code') and response.get('error').get('code') == "unauthenticated"

    def refresh_code(code, refresh_token):
        params = {
                    'client_id': CLIENT_ID, 
                    'redirect_uri': 'http://localhost:5000/saveAuthToken', 'client_secret': CLIENT_SECRET, 'refresh_token': refresh_token, 'grant_type': 'refresh_token'}
        headers = {"Content-type": "application/x-www-form-urlencoded"}
        json_response = requests.post("https://login.live.com/oauth20_token.srf", data=params, headers=headers).text
        r = json.loads(json_response)
        codesCollection.drop()
        codesCollection.insert(
            {
                "code" : code,
                "access_token" : r["access_token"],
                "refresh_token" : r["refresh_token"]
            }
        )
    return(oneDriveModule)