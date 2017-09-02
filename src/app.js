import {inject, computedFrom} from 'aurelia-framework';
import {HttpClient, json} from 'aurelia-fetch-client';
@inject(HttpClient)
export class App {
  currentImage = undefined;
  loadingImage = undefined;
  currentTimeout = undefined;
  @computedFrom('currentImage') //use @computedFrom to avoid dirty-checking
  get getBackground() {
    if(!this.currentImage)
      return {};
    return {
      'background-image': "url(" + this.currentImage["@content.downloadUrl"] + "?width=3840&height=2160)",
      'background-size': (this.currentImage.image.height >= this.currentImage.image.width) ? "contain" : "cover",
      'width': '100%',
      'height' : '100%'
    }
  }
  @computedFrom('loadingImage') //use @computedFrom to avoid dirty-checking
  get getBackgroundPreload() {
    if(!this.loadingImage)
      return {};
    return {
      'background-image': "url(" + this.loadingImage["@content.downloadUrl"] + "?width=3840&height=2160)",
      'width': '0%',
      'height' : '0%',
      'visibility': 'hidden'
    }
  }
  cachedDirectories = {};
  collectedPaths = new Set();
  currentPath = "";
  pathStack = [];
  constructor(httpClient) {
    this.httpClient = httpClient;
    this.load();
    this.getSavedPaths();
    this.getNextImage();
  }
  load(path = "/") {
    this.pathStack.push(path);
    this.currentPath = path;
    if(this.cachedDirectories[path])
      return;
    let queryParams = "";
    if (path != "/")
      queryParams = "?path=" + path;
    return this.httpClient.fetch('http://localhost:5000/listDirectory' + queryParams)
    .then(response => {return response.json()})
    .then(data => {
        this.cachedDirectories[path] = data.value;
    })
    .catch(ex => {
      console.log(ex);
    });
  }
  getSavedPaths() {
    this.httpClient.fetch('http://localhost:5000/savedPaths')
      .then(response => {return response.json()})
      .then(data => {
          this.collectedPaths = new Set(data.paths);
      })
      .catch(ex => {
        console.log(ex);
      });
  }
  getNextImage() {
    clearTimeout(this.currentTimeout);
    this.currentTimeout = setTimeout(this.getNextImage.bind(this), 25000);
    this.currentImage = this.loadingImage;
    this.httpClient.fetch('http://localhost:5000/randomMediaFile')
      .then(response => {return response.json()})
      .then(data => {
          if(!this.currentImage) {
            this.currentImage = data;
            this.getNextImage();
          }
          this.loadingImage = data;
      })
      .catch(ex => {
        console.log(ex);
      });
  }
  popToParent() {
    this.pathStack.pop();
		this.load(this.pathStack.pop());
  }
  collectFolder(folder){
    this.collectedPaths.add(folder.parentReference.path + '/' + folder.name);
  }
  savePaths(){
    let paths = Array.from(this.collectedPaths)
    this.httpClient.fetch('http://localhost:5000/savedPaths', 
      {
        method: 'post',
        body: json({'paths':paths})
      })
    .then(response => {return response.json()})
    .then(data => {
        console.log(data);
    })
    .catch(ex => {
      console.log(ex);
    });
  }
}
