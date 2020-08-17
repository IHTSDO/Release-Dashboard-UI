import { Injectable } from '@angular/core';
import { Build } from '../../models/build';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BuildConfiguration } from '../../models/buildConfiguration';
import { QAConfiguration } from '../../models/qaConfiguration';

@Injectable({
  providedIn: 'root'
})
export class BuildService {

  constructor(private http: HttpClient) { }

  getBuild(releaseCenterKey, productKey, buildId): Observable<Build> {
      return this.http.get<Build>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId);
  }

  getBuilds(releaseCenterKey, productKey): Observable<Build[]> {
      return this.http.get<Build[]>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds');
  }

  getBuildConfiguration(releaseCenterKey, productKey, buildId): Observable<BuildConfiguration> {
      return this.http.get<BuildConfiguration>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/configuration');
  }

  getQAConfiguration(releaseCenterKey, productKey, buildId): Observable<QAConfiguration> {
      return this.http.get<QAConfiguration>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/qaTestConfig');
  }

  getBuildLog(releaseCenterKey, productKey, buildId) {
      const url = '/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/logs/build_log.txt';
      return this.http.get(url, {responseType: 'arraybuffer'});
  }

  listPackageOutputFiles(releaseCenterKey, productKey, buildId) {
      return this.http.get('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/outputfiles');
  }

  getBuildPackage(releaseCenterKey, productKey, buildId, fileName) {
      const url = '/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/outputfiles/' + fileName;
      return this.http.get(url, {responseType: 'arraybuffer'});
  }

  publishBuild(releaseCenterKey, productKey, buildId) {
      return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/publish', {});
  }

  stopBuild(releaseCenterKey, productKey, buildId) {
    return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/cancel', {});
  }
}
