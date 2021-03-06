import { Component, OnInit, ChangeDetectionStrategy, ViewChild, Input} from 'angular2/core';
import { Router, RouteParams} from 'angular2/router';
import { ExceptionsService } from '../service/Exceptions.service';
import { Observable} from 'rxjs/Rx';
import { ChangeDetectorRef} from 'angular2/core';
import { HTTP_PROVIDERS, Http, Response, Headers, Jsonp, JSONP_PROVIDERS} from 'angular2/http';
import { ModalDirective } from 'ng2-bootstrap/ng2-bootstrap';
import { PaginationModule } from 'ng2-bootstrap/ng2-bootstrap';

@Component({
    selector: 'fieldlevel-exceptions',
    templateUrl: 'partials/pages/FieldLevelExceptions.component.html',
    inputs: ['userName', 'FilterDays', 'AllResponses'],
    providers: [ExceptionsService, JSONP_PROVIDERS]
})

//This component is used to display field level exception data and removed data field information while creating ticket
export class FieldLevelExceptions implements OnInit {
    userName: string;
    accesToken: string;
    IntegrationType: string = 'freshdesk';
    AllResponses: any;
    ExceptionRecordsList: any;
    ExceptionRecordsListBackUp: any = undefined;
    TokenArchivebutton: boolean = false;
    FilterDays: number;

    SearchRecord: string = "";
    maporder: boolean = true;
    Modalpopup: boolean = false;
    ViewDetails: any;
    modalTitle = "Survey Data"
    PopupPage: Number = 1;
    PopupPagesize: Number = 20;
    showarchive: boolean = true;
    ExceptionDescription: string = "";
    AnswerId: string = "";
    SurveyResponse: any;

    constructor(private params: RouteParams, private route: Router, private exception: ExceptionsService) {
    }

    ngOnInit() {
        this.GetExceptions();
    }

    GetExceptions() {
        var that = this;
        this.exception.GetExceptions(this.userName, this.IntegrationType, 'FieldLevel', this.FilterDays).then(
            function (data) {
                that.ExceptionRecordsListBackUp = data;
                that.ExceptionRecordsList = that.ExceptionRecordsListBackUp;
            }
        );
    }

    //Enabling or  disabling  archive button  in CC SF 
    EnableDisableArchive() {
        if (this.ExceptionRecordsList == undefined || this.ExceptionRecordsList == null) {
            return false;
        }
        else {
            return !this.ExceptionRecordsList.some(_ => _.archive);
        }
    }

    //retreiving the selected id from the Recordsdata, these id list are used for record archive or retrigger
    Getselectedids(Recordsdata: any) {
        var getIDFromSelectedCheckBox = [];
        for (var recordcounter = 0; recordcounter < Recordsdata.length; recordcounter++) {
            var Record = {
                id: ""
            }
            if (Recordsdata[recordcounter].trigger == true) {
                Record.id = Recordsdata[recordcounter]._Id;
                getIDFromSelectedCheckBox.push(Record)
            }
            else if (Recordsdata[recordcounter].archive == true) {
                Record.id = Recordsdata[recordcounter]._Id;
                getIDFromSelectedCheckBox.push(Record)
            }
        }
        var myJsonString = JSON.stringify(getIDFromSelectedCheckBox);
        return myJsonString
    }

    // Displaying system date format
    GetDate(Givendate: string) {
        var Newdate = new Date(Givendate);
        var fulldate = Newdate.toLocaleString("en-us",
            {
                month: "short"
            }) + " " + Newdate.getDate() + "," + Newdate.getFullYear() + " " + Newdate.getHours() + ":" + Newdate.getMinutes() + ":" + Newdate.getSeconds()
        return fulldate;
    }

    //sorting the  exception  records 
    SortRecords(column: string, recordList: any) {
        if (recordList.length == 0)
            return;
        this.maporder = !this.maporder;
        recordList.sort((a, b) => {
            var textA = '';
            var textB = '';
            textA = a[column].toUpperCase();
            textB = b[column].toUpperCase();
            if (this.maporder)
                return (textA > textB) ? -1 : (textA < textB) ? 1 : 0;
            else
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });
    }

    //searching the exception records
    SearchRecords(recordListBackup: any) {
        if (recordListBackup.length == 0)
            return recordListBackup;

        var searchist = [];
        var columnNames = Object.keys(recordListBackup[0]);

        for (var rowCounter = 0; rowCounter < recordListBackup.length; rowCounter++) {
            var isvalid = false;
            for (var columnCounter = 0; columnCounter < columnNames.length; columnCounter++) {
                var comparestring = recordListBackup[rowCounter][columnNames[columnCounter]]+"";

                if (columnNames[columnCounter] == "dateTime" || columnNames[columnCounter] == "exceptionRaisedOn" || columnNames[columnCounter] == "createDateTime" || columnNames[columnCounter] == "insertedOn") {
                    comparestring = this.GetDate(comparestring) + "";
                }

                if (comparestring.toUpperCase().indexOf(this.SearchRecord.toUpperCase()) >= 0) {
                    isvalid = true;
                    break;
                }
            }
            if (isvalid)
                searchist.push(recordListBackup[rowCounter])
        }

        return searchist;
    }

    /******  Model popup code */
    ShowModal(Record) {

        this.Modalpopup = true;
        this.ExceptionDescription = Record.exceptionFieldsVsValues;
        var singleresponse = this.AllResponses.filter(item => item.id == Record.answerId);
        this.SurveyResponse = singleresponse[0].responses;

    }

    CloseModal() {
        this.Modalpopup = false;
    }
}
