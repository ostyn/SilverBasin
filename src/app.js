import {inject, computedFrom} from 'aurelia-framework';
import {HttpClient, json} from 'aurelia-fetch-client';
import {DialogService} from 'aurelia-dialog';
import {SelectFolders} from './select-folders';
@inject(HttpClient, DialogService)
export class App {
  currentImage = undefined;
  loadingImage = undefined;
  currentTimeout = undefined;
  @computedFrom('currentImage') //use @computedFrom to avoid dirty-checking
  get getBackground() {
    if(!this.currentImage || !this.currentImage.image)
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
  constructor(httpClient, dialogService) {
    this.dialogService = dialogService;
    this.httpClient = httpClient;
    this.getCurrentImage();
  }
  getCurrentImage() {
    clearTimeout(this.currentTimeout);
    this.currentTimeout = setTimeout(this.getCurrentImage.bind(this), 30000);
    this.currentImage = this.loadingImage;
    this.httpClient.fetch('http://localhost:5000/getCurrentImage')
      .then(response => {
        if(response.status < 400)
          return response.json()
      })
      .then(data => {
          this.loadingImage = data.next;
          this.currentImage = data.current;
      })
      .catch(ex => {
        console.log(ex);
      });
  }
  getNextImage() {
    clearTimeout(this.currentTimeout);
    this.currentTimeout = setTimeout(this.getCurrentImage.bind(this), 30000);
    this.currentImage = this.loadingImage;
    this.httpClient.fetch('http://localhost:5000/nextImage')
      .then(response => {
        if(response.status < 400)
          return response.json()
      })
      .then(data => {
          this.loadingImage = data.next;
          this.currentImage = data.current;
      })
      .catch(ex => {
        console.log(ex);
      });
  }
  openFolderDialog(){
    this.dialogService.open({ viewModel: SelectFolders, model: this.person, lock: false })
      .whenClosed(response => {
        if (!response.wasCancelled) {
          console.log('good - ', response.output);
        } else {
          console.log('bad');
        }
        console.log(response.output);
      });
  }
  toggleMenu() {
    this.showMenu = !this.showMenu;
  }
}
