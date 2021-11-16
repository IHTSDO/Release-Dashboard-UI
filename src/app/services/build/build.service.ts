import { Injectable } from '@angular/core';
import { Build } from '../../models/build';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BuildService {

  constructor(private http: HttpClient) { }

  getBuild(releaseCenterKey, productKey, buildId): Observable<Build> {
      return this.http.get<Build>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId);
  }

  getBuilds(releaseCenterKey, productKey, iclucdeBuildConfig, includeQAConfig, visibility, view, pageNumber, pageSize): Observable<object> {
        const params = new HttpParams()
            .set('includeBuildConfiguration', iclucdeBuildConfig)
            .set('includeQAConfiguration', includeQAConfig)
            .set('visibility', visibility)
            .set('viewMode', view)
            .set('pageNumber', (pageNumber - 1).toString())
            .set('pageSize', pageSize);
      return this.http.get<object>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds', {params: params});
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

  createBuild(releaseCenterKey, productKey, buildName, effectiveDate, maxFailureExport): Observable<Build> {
    const data = {
      effectiveDate: effectiveDate,
      buildName: buildName,
      maxFailuresExport: maxFailureExport,
      loadTermServerData: false,
      loadExternalRefsetData: false
    };
    return this.http.post<Build>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds', data);
  }

  publishBuild(releaseCenterKey, productKey, buildId) {
      return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/publish', {});
  }

  stopBuild(releaseCenterKey, productKey, buildId) {
    return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/cancel', {});
  }

  uploadInputFile(releaseCenterKey, productKey, buildId, file: FormData) {
    return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/inputfiles', file);
  }

  scheduleBuild(releaseCenterKey, productKey, buildId) {
    return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/schedule', {});
  }

  runBuild(releaseCenterKey, productKey, buildName, branch, exportType,
          maxFailureExport, effectiveDate, excludedModuleIds, enableTraceabilityValidation): Observable<Build> {
      const data = {
          effectiveDate: effectiveDate,
          exportCategory: exportType,
          buildName: buildName,
          branchPath: branch,
          maxFailuresExport: maxFailureExport,
          loadTermServerData: true,
          loadExternalRefsetData: true,
          enableTraceabilityValidation: enableTraceabilityValidation
      };
      if (excludedModuleIds) {
        const array = excludedModuleIds.replace(/\s/g, '').split(',');
        data['excludedModuleIds'] = array;
      }
      return this.http.post<Build>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/release', data);
  }

  deleteBuild(releaseCenterKey, productKey, buildId) {
    return this.http.delete('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId);
  }

  getPublishingBuildStatus(releaseCenterKey, productKey, buildId) {
    return this.http.get('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/publish/status');
  }

  updateBuildVisibility(releaseCenterKey, productKey, buildId, visibility) {
    const params = new HttpParams()
                .set('visibility', visibility);
    return this.http.post('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/visibility', {},
                          {params: params});
  }

  updateTags(releaseCenterKey, productKey, buildId, tags: String[]) {
    const params = new HttpParams()
            .set('tags', tags.join(','));
    const url = '/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/tags';
    return this.http.post(url, {}, {params: params});
  }
}
