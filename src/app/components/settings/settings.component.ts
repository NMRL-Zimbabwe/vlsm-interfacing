import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { ElectronService } from '../../core/services';
import { ElectronStoreService } from '../../services/electron-store.service';
import * as os from 'os';


@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  public settingsForm: FormGroup;
  public appPath: string = "";
  public appVersion: string = null;
  public machineIps: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private electronService: ElectronService,
    private router: Router,
    private electronStoreService: ElectronStoreService
  ) {
    const commonSettingsStore = this.electronStoreService.get('commonConfig');
    const instrumentSettingsStore = this.electronStoreService.get('instrumentsConfig');
    this.appPath = this.electronStoreService.get('appPath');
    this.appVersion = this.electronStoreService.get('appVersion');
    this.machineIps = this.getMachineIps();

    // Initialize the form with the existing settings
    this.settingsForm = this.formBuilder.group({
      commonSettings: this.formBuilder.group({
        labID: ['', Validators.required],
        labName: ['', Validators.required],
        mysqlHost: [''],
        mysqlPort: [''],
        mysqlDb: [''],
        mysqlUser: [''],
        mysqlPassword: [''],
        interfaceAutoConnect: ['yes', Validators.required]
      }),
      instrumentsSettings: this.formBuilder.array(
        (instrumentSettingsStore || []).map(instrument => this.formBuilder.group(instrument))
      )
    }, { validators: [this.uniqueInstrumentNameValidator(), this.uniqueIpPortValidator()] });

    this.settingsForm.patchValue({
      commonSettings: commonSettingsStore
    });

  }

  ngOnInit(): void { }

  uniqueInstrumentNameValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const instrumentsSettings = control.get('instrumentsSettings') as FormArray;
      const duplicateIndexes = this.findDuplicates(
        instrumentsSettings.value.map(instrument => instrument.analyzerMachineName)
      );
      duplicateIndexes.forEach(index => {
        instrumentsSettings.at(index).get('analyzerMachineName').setErrors({ 'duplicateInstrumentName': true });
      });
      return null;  // This validator no longer returns an error itself
    };
  }

  uniqueIpPortValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const instrumentsSettings = control.get('instrumentsSettings') as FormArray;
      const duplicateIndexes = this.findDuplicates(
        instrumentsSettings.value.map(instrument => `${instrument.analyzerMachineHost}:${instrument.analyzerMachinePort}`)
      );
      duplicateIndexes.forEach(index => {
        instrumentsSettings.at(index).setErrors({ 'duplicateIpPort': true });
      });
      return null;  // This validator no longer returns an error itself
    };
  }

  findDuplicates(arr: string[]): number[] {
    const duplicates = [];
    const itemCounts = arr.reduce((acc, item, index) => {
      acc[item] = acc[item] ? [...acc[item], index] : [index];
      return acc;
    }, {});
    for (let key in itemCounts) {
      if (itemCounts[key].length > 1) {
        duplicates.push(...itemCounts[key]);
      }
    }
    return duplicates;
  }

  onConnectionModeChange(index: number, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const connectionMode = selectElement.value;
    if (connectionMode === 'tcpserver') {
      this.instrumentsSettings.at(index).get('analyzerMachineHost').setValue(this.machineIps[0]);
    }
  }




  // Getter for easy access to the instrumentsSettings FormArray
  get instrumentsSettings(): FormArray {
    return this.settingsForm.get('instrumentsSettings') as FormArray;
  }

  createInstrumentFormGroup(): FormGroup {
    return this.formBuilder.group({
      analyzerMachineType: ['', Validators.required],
      interfaceCommunicationProtocol: ['', Validators.required],
      analyzerMachineName: ['', Validators.required],
      analyzerMachineHost: ['', Validators.required],
      analyzerMachinePort: ['', Validators.required],
      interfaceConnectionMode: ['', Validators.required]
    });
  }

  getMachineIps(): string[] {
    const networkInterfaces = os.networkInterfaces();
    const ips = [];


    for (let interfaceName in networkInterfaces) {
      const iface = networkInterfaces[interfaceName];
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && !alias.internal) {
          ips.push(alias.address);
        }
      }
    }

    // Adding 127.0.0.1 as a default option
    ips.push('127.0.0.1');

    return ips;
  }


  addInstrument(): void {
    this.instrumentsSettings.push(this.createInstrumentFormGroup());
  }

  confirmRemoval(index: number, analyzerMachineName: string, event: Event): void {
    event.preventDefault();
    const confirmed = window.confirm(`Are you sure you want to remove Instrument ${analyzerMachineName}?`);
    if (confirmed) {
      this.removeInstrument(index);
    }
  }


  removeInstrument(index: number): void {
    this.instrumentsSettings.removeAt(index);
  }

  updateSettings(): void {
    const that = this;
    if (that.settingsForm.valid) {
      const updatedSettings = that.settingsForm.value;


      // Ensure all required keys exist in each instrument setting
      updatedSettings.instrumentsSettings = updatedSettings.instrumentsSettings.map(instrument => {
        const defaultInstrument = {
          analyzerMachineType: '',
          interfaceCommunicationProtocol: '',
          analyzerMachineName: '',
          analyzerMachineHost: '',
          analyzerMachinePort: '',
          interfaceConnectionMode: ''
        };
        return { ...defaultInstrument, ...instrument };
      });


      that.electronStoreService.set('commonConfig', updatedSettings.commonSettings);
      that.electronStoreService.set('instrumentsConfig', updatedSettings.instrumentsSettings);

      new Notification('Success', {
        body: 'Updated Interface Tool settings'
      });

      that.router.navigate(['/dashboard']);
    } else {
      console.error('Form is not valid');
    }
  }

  checkMysqlConnection() {

    const that = this;
    const mysql = that.electronService.mysql;
    const commonSettings = that.settingsForm.get('commonSettings').value;
    const connection = mysql.createConnection({
      host: commonSettings.mysqlHost,
      user: commonSettings.mysqlUser,
      password: commonSettings.mysqlPassword,
      port: commonSettings.mysqlPort
    });

    connection.connect(function (err: string) {

      if (err) {

        const dialogConfig = {
          type: 'error',
          message: 'Oops! Something went wrong! Unable to connect to the MySQL database on host ' + commonSettings.mysqlHost,
          detail: err + '\n\nPlease check if all the database connection settings are correct and the MySQL server is running.',
          buttons: ['OK']
        };
        that.electronService.openDialog('showMessageBox', dialogConfig);
      } else {
        const dialogConfig = {
          type: 'info',
          message: 'MySQL Connected successfully. Please click on SAVE SETTINGS to update these settings.',
          buttons: ['OK']
        };
        that.electronService.openDialog('showMessageBox', dialogConfig);
        connection.destroy();
      }

    });
  }
}
