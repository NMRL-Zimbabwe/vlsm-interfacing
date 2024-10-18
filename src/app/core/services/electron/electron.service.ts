import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, net, webFrame } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as mysql from 'mysql';


@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  childProcess: typeof childProcess;
  fs: typeof fs;
  mysql: typeof mysql;
  net: typeof net;
  sqlite: any;

  constructor() {

    const that = this;
    // Conditional imports
    if (that.isElectron) {
      that.ipcRenderer = window.require('electron').ipcRenderer;
      that.webFrame = window.require('electron').webFrame;

      that.childProcess = window.require('child_process');
      that.fs = window.require('fs');

      that.mysql = window.require('mysql');
      that.net = window.require('net');

      that.sqlite = window.require('sqlite3');

      // Notes :
      // * A NodeJS's dependency imported with 'window.require' MUST BE present in `dependencies` of both `app/package.json`
      // and `package.json (root folder)` in order to make it work here in Electron's Renderer process (src folder)
      // because it will loaded at runtime by Electron.
      // * A NodeJS's dependency imported with TS module import (ex: import { Dropbox } from 'dropbox') CAN only be present
      // in `dependencies` of `package.json (root folder)` because it is loaded during build phase and does not need to be
      // in the final bundle. Reminder : only if not used in Electron's Main process (app folder)

      // If you want to use a NodeJS 3rd party deps in Renderer process,
      // ipcRenderer.invoke can serve many common use cases.
      // https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendererinvokechannel-args

    }

  }

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  getUserDataPath(): Promise<string> {
    return this.ipcRenderer.invoke('getUserDataPath');
  }

  openDialog(method: any, config: any): any {
    this.ipcRenderer.invoke('dialog', method, config);
  }

  // execSqliteQuery(sql: any, args?: any): any {
  //   return new Promise((resolve) => {
  //     this.ipcRenderer.once('sqlite3-reply', (_, arg) => {
  //       resolve(arg)
  //     });
  //     this.ipcRenderer.send('sqlite3-query', sql, args);
  //   });
  // }
  execSqliteQuery(sql: any, args?: any): any {
    return new Promise((resolve) => {
      const uniqueEvent = `sqlite3-reply-${Date.now()}-${Math.random()}`; // Unique event name
      this.ipcRenderer.once(uniqueEvent, (_, arg) => {
        resolve(arg);
      });
      this.ipcRenderer.send('sqlite3-query', sql, args, uniqueEvent); // Send unique event name
    });
  }


  logInfo(message: string, instrumentId: string = null) {
    ipcRenderer.invoke('log-info', message, instrumentId);
  }

  logError(message: string, instrumentId: string = null) {
    ipcRenderer.invoke('log-error', message, instrumentId);
  }

  logWarning(message: string, instrumentId: string = null) {
    ipcRenderer.invoke('log-warning', message, instrumentId);
  }

}
