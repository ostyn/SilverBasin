import {inject} from 'aurelia-framework';
import {HttpClient, json} from 'aurelia-fetch-client';
@inject(HttpClient)
export class App {
  cachedDirectories = {};
  currentPath = "";
  pathStack = [];
  constructor(httpClient) {
    this.httpClient = httpClient;
    this.load();
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
  popToParent() {
    this.pathStack.pop();
		this.load(this.pathStack.pop());
	}
}
