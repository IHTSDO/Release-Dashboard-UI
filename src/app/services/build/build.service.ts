import { Injectable } from '@angular/core';
import { Build } from '../../models/build';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FailureJiraAssociation } from 'src/app/models/failureJiraAssociation';

@Injectable({
  providedIn: 'root'
})
export class BuildService {

  constructor(private http: HttpClient) { }

  getBuild(releaseCenterKey, productKey, buildId): Observable<Build> {
      return this.http.get<Build>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId);
  }

  getBuilds(releaseCenterKey, productKey, iclucdeBuildConfig, includeQAConfig,
            visibility, view, pageNumber, pageSize, sorting): Observable<object> {
        let params = new HttpParams()
            .set('includeBuildConfiguration', iclucdeBuildConfig)
            .set('includeQAConfiguration', includeQAConfig)
            .set('visibility', visibility)
            .set('viewMode', view)
            .set('pageNumber', (pageNumber - 1).toString())
            .set('pageSize', pageSize);
            if (sorting) {
              for (let i = 0; i < sorting.length; i++) {
                params = params.append('sort', sorting[i]);
              }
            }
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

  createBuild(releaseCenterKey, productKey, buildName, effectiveDate, replaceExistingEffectiveTime, maxFailureExport): Observable<Build> {
    const data = {
      effectiveDate: effectiveDate,
      buildName: buildName,
      maxFailuresExport: maxFailureExport,
      replaceExistingEffectiveTime: replaceExistingEffectiveTime,
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
          maxFailureExport, effectiveDate, enableTraceabilityValidation): Observable<Build> {
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
      return this.http.post<Build>('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/release', data);
  }

  deleteBuild(releaseCenterKey, productKey, buildId) {
    return this.http.delete('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId);
  }

  changeBuildName(releaseCenterKey, productKey, buildId, buildName) {
    const data = {
      buildName: buildName
    };
    return this.http.put('/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/configuration', data);
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

  getFailureJiraAssociations(releaseCenterKey, productKey, buildId): Observable<FailureJiraAssociation[]> {
    const url = '/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/failure-jira-associations';
    return this.http.get<FailureJiraAssociation[]>(url);
  }

  generateJiraTickets(releaseCenterKey, productKey, buildId, assertionIds: String[]): Observable<FailureJiraAssociation[]> {
    const url = '/release/centers/' + releaseCenterKey + '/products/' + productKey + '/builds/' + buildId + '/failure-jira-associations';
    return this.http.post<FailureJiraAssociation[]>(url, assertionIds, {});
  }

  initialiseBuild() {
      return this.http.get('/release/centers/center/products/product/builds/initialise');
  }
}
