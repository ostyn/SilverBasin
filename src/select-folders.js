import { DialogController } from 'aurelia-dialog';
import {HttpClient, json} from 'aurelia-fetch-client';
import {inject} from 'aurelia-framework';

@inject(DialogController, HttpClient)
export class SelectFolders {
  collectedPaths = new Set();
  constructor(controller, httpClient) {
    this.controller = controller;
    this.httpClient = httpClient
  }
  activate(person) {
    this.getSavedPaths();
    this.load();
  }
  cachedDirectories = {};
  currentPath = "";
  pathStack = [];
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
  popToParent() {
    this.pathStack.pop();
    this.load(this.pathStack.pop());
  }
  collectFolder(folder) {
    this.collectedPaths.add(folder.parentReference.path + '/' + folder.name);
  }
  savePaths() {
    let paths = Array.from(this.collectedPaths)
    this.httpClient.fetch('http://localhost:5000/savedPaths',
      {
        method: 'post',
        body: json({ 'paths': paths })
      })
      .then(response => { return response.json() })
      .then(data => {
        this.controller.ok();
      })
      .catch(ex => {
        console.log(ex);
      });
  }
  getSavedPaths() {
    this.httpClient.fetch('http://localhost:5000/savedPaths')
      .then(response => { return response.json() })
      .then(data => {
        this.collectedPaths = new Set(data.paths);
      })
      .catch(ex => {
        console.log(ex);
      });
  }
}