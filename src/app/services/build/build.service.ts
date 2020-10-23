import { Injectable } from '@angular/core';
import { Build } from '../../models/build';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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
        const params = new HttpParams()
            .set('includeBuildConfiguration', 'true')
            .set('includeQAConfiguration', 'true');
      return this.http.get<Build[]>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds', {params: params});
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

  runBuild(releaseCenterKey, productKey, buildName, branch, exportType, maxFailureExport, effectiveDate, excludedModuleIds): Observable<Build> {
      const data = {
          effectiveDate: effectiveDate,
          exportCategory: exportType,
          buildName: buildName,
          branchPath: branch,
          maxFailuresExport: maxFailureExport,
          loadTermServerData: true,
          loadExternalRefsetData: true
      };
      if (!branch) {
        data['loadTermServerData'] = false;
        data['loadExternalRefsetData'] = false;
      }
      if (excludedModuleIds) {
        var array = excludedModuleIds.replace(/\s/g, "").split(",");
        data['excludedModuleIds'] = array;
      }
      return this.http.post<Build>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/release', data);
  }

  deleteBuild(releaseCenterKey, productKey, buildId) {
    return this.http.delete('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId);
  }
}
