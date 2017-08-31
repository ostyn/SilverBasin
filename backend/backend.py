import pymongo
import oneDriveModule

from flask import Flask
from flask_cors import CORS
from configMaster import *

app = Flask(__name__)
cors = CORS(app)
connection = pymongo.MongoClient("mongodb://localhost")
codesCollection = connection.silverBasin.codes
savedPathsCollection = connection.silverBasin.savedPaths
app.register_blueprint(oneDriveModule.construct_blueprint(codesCollection, savedPathsCollection))

if __name__ == "__main__":
    app.run(debug = True, port = 5000, host='0.0.0.0')