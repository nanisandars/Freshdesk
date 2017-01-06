import { Component, OnInit, ChangeDetectionStrategy, ViewChild, EventEmitter, Output} from 'angular2/core';
import { Router, RouteParams} from 'angular2/router';
import { CCFDService } from '../service/CCFDService.service';
import {Observable} from 'rxjs/Rx';
import { ChangeDetectorRef} from 'angular2/core';
import {HTTP_PROVIDERS, Http, Response, Headers, Jsonp, JSONP_PROVIDERS, ConnectionBackend} from 'angular2/http';

@Component(
	{
		selector: 'FDSettings',
		templateUrl: './partials/pages/FD.component.html',
		inputs: ['userName', 'CCMappings', 'APIKey', 'Questionslist'],
		outputs: ['PostIntegration'],
		providers: [CCFDService, JSONP_PROVIDERS]
	})

/*
This is used for CC Setting Screen to display Freshdesk related information
*/

export class FDComponent implements OnInit {
	/**
	 * userName, CCMappings are the inputs for this components
	 * userName logged in user name
	 * CCMappings output of CC API (api/UserData/ input is key)  
	 */
	public PostIntegration = new EventEmitter();
	public FDKey: string = '';
	public FDURL: string = '';
	public userName: string;
	public CCMappings: any;
	public CCAccesToken: string = '';

	//CC Life time API Key
	APIKey: string;

	FreshDeskKey: string = "integrations.freshdesk";
	Questionslist: any;
	showloading: boolean = false;
	FDFields: any = undefined;
	existingCCTags: any = undefined;
	existingCCKeys: any = undefined;

	fieldMapConstraint: any = {
		"TEXT": "custom_text",
		"MULTILINETEXT": "custom_paragraph",
		"MULTISELECT": "custom_checkbox",
		"NUMBER": "custom_number",
		"STAR-5": "custom_number",
		"SMILE-5": "custom_number",
		"SCALE": "custom_number",
		"DROPDOWN": "custom_dropdown",
		"DATE": "custom_date"
	};

	defaultFDFields: string = "#name##email##mobile##description##subject##nps#";
	removeFields: string = "requester#status#subject#description#priority#source#ccticket#group#agent#company#product#npsscore#ticket_type";
	Tagmapping: any = [];
	Tagmappingbackup: any = [];
	Editmap: any = [];
	DisableDisablemap: any = [];
	EnableDisablemap: any = [];
	searchKey: string = "";
	Field: string = "";
	Qid: string = "";
	Message: string = '';
	EditQuestiontag: any = undefined;
	FDCredentials: boolean = true;
	InsertEditFlag: boolean = false;
	maporder: boolean = true;
	ActionPerformed: boolean = false;
	InsertEditid: string = "";
	InsertError: string = '';
	Tagdata: string = "";
	Edittag: string = "";
	cdr: any;
	FDPostintegrationdata: any;
	PopupMessage: string = "";
	PopupAction: string = "";
	modalTitle: string = "";
	samplemodal: boolean = false;
	public Postmapping = new EventEmitter();

	constructor(private params: RouteParams, private ccfd: CCFDService, private route: Router, cdr: ChangeDetectorRef) {
		this.showloading = true;
		this.cdr = cdr;
	}

	ngOnInit() {
		this.CCMappings = JSON.parse(this.CCMappings);
		this.FDCredentials = false;
		if (this.CCMappings != null &&  this.CCMappings.integrationdetails!=null ) {
			this.FDURL = this.CCMappings.integrationdetails.split("|")[0];
			this.FDKey = this.CCMappings.integrationdetails.split("|")[1];;
			this.getTicketFields();
		}
		else {
			this.showloading = false;
		}
	}

	//This method is used to authenticate and fetch the ticket fields from freshdesk
	getTicketFields() {
		var that = this;
		this.ccfd.IsCCUserFDAuthenticated(this.userName, this.FreshDeskKey).then(function (data) {
			if (data.message == "authenticated") {
				that.Connect(false);
				that.FDCredentials = true;
				
			}
			that.showloading = false;
		});
		
	}

	//This methos is used to get the latest tag information from CC
	GetExistingTags() {
		var finalarray = [];
		var QuestionsArray = [];
		var missingTags = this.defaultFDFields;
		var tagslist=[];
		var that = this;
		this.Questionslist.forEach(function (singleQuestion, index) {
			if (singleQuestion.questionTags.length != 0) {
				
				if (that.defaultFDFields.indexOf("#" + singleQuestion.questionTags[0].toLowerCase() + "#") < 0){
					tagslist.push(singleQuestion.questionTags[0])
					QuestionsArray[singleQuestion.questionTags[0]] = singleQuestion.questionTags[0] + '::' + singleQuestion.displayType + '::' + singleQuestion.id;
				}else
					missingTags = missingTags.replace("#" + singleQuestion.questionTags[0].toLowerCase() + "#", ",");
			}
		});

	
		tagslist.sort(function (a, b) {
            return (a > b) ? -1 : (a < b) ? 1 : 0;
        });
      
        tagslist.reverse();
		
		var tagdata=[];
		for(var singltag of tagslist)
		{
			tagdata[singltag]=QuestionsArray[singltag];
		}
		finalarray.push(tagdata);	
		finalarray.push(missingTags.replace(/#/gi, ',').replace(/,,/gi,',').replace(/^,|,$/gm,''));
		return finalarray;

	}

	/**
	 Assigns  the mapping from  CC to Tagmapping object
	if any tags are removed in CC UI manually those tags are removed from  the  Mapping list using  'SkipRemovedTagsinCC' method
	*/

	LoadMappings() {
		this.showloading = false;
		var that = this;
		this.Tagmappingbackup = null;

		if (this.FDFields) {
			if (this.CCMappings != null) {
				this.Tagmappingbackup = this.CCMappings.mappings;

				this.existingCCTags = this.GetExistingTags()[0];
				this.existingCCKeys = Object.keys(this.existingCCTags);
				this.Tagmappingbackup = this.ccfd.SkipRemovedTagsinCC(this.Questionslist, this.Tagmappingbackup);
		
				this.Tagmapping = this.Tagmappingbackup;
				
			}
			else {
				this.Tagmappingbackup = null;
			}
			this.Tagmapping = this.Tagmappingbackup;
		}
		else {
			this.FDCredentials = false;
		}
	}

	//This method is used to display the default tag mappings between CC and FD
	loadDefaultMapping() {
		var that = this;
		var qustionsString = JSON.stringify(that.Questionslist).toLowerCase();
		that.Questionslist.filter(function (obj) {
			if (obj["questionTags"].length > 0) {
				var tagName = obj["questionTags"][0].toLowerCase();
				var defaultType = obj["displayType"];
				var Qid = obj["id"];
				if (that.defaultFDFields.indexOf(tagName) > 0 && tagName != 'nps') {
					that.AddNewMapping(that.Tagmappingbackup, tagName, tagName, Qid);
				}
			}
		});
	}

	//This method is used to format the Mappings in the CC API (User Data) Input Format
	prepareIntegrationData() {
		var integrationData = {
			"integrationdetails": this.FDURL + "|" + this.FDKey,
			"mappings": this.Tagmappingbackup,
			"mappingsbackup": this.Tagmappingbackup,
			"username": this.userName,
			"ccapikey": this.APIKey
		};
		return integrationData;
	}

	//This method is used to save or post the default mappings
	saveDefaultMapping() {
		var that = this;
		this.ccfd.saveDefaultMappingsAndCredentials(this.FreshDeskKey, JSON.stringify(this.prepareIntegrationData())).then(
			function (data) {
				that.existingCCTags = that.GetExistingTags()[0];
				that.existingCCKeys = Object.keys(that.existingCCTags);
				that.FDCredentials = true;
				that.showloading = false;
			}
		).catch(function (data) {
			that.existingCCTags = that.GetExistingTags()[0];
			that.existingCCKeys = Object.keys(that.existingCCTags);
			that.FDCredentials = true;
			that.showloading = false;
		});

	}

	//This method is used to authenticate the systems
	Connect(loadDefaultMapping: boolean) {
		this.showloading = true;
		
	
		this.FDFields = null;
		this.Message = "";
		this.cdr.detectChanges();
		var that = this;
		this.ccfd.Connect2FD(this.FDKey, this.FDURL, this.APIKey, this.userName).then
			(
			function (data) {
				that.FDFields = data;
				that.FDFields = that.FDFields.filter((item) => that.removeFields.indexOf(item.name.toLowerCase()) == -1);
that.sortFDFields();

				if (Object.keys(that.GetExistingTags()[1]).length >=6) {
					that.Message = "Please create the following tags: ";
					that.Message += that.GetExistingTags()[1];
					that.showloading=false;
					return;
				}
				else {
					if (loadDefaultMapping) {
						that.loadDefaultMapping();
						that.saveDefaultMapping();
					}
					else {
						that.LoadMappings();
					}
				}
			}
			).catch(function (data) {				
				that.Message =  "Please enter valid Fresh Desk Admin API Key and Fresh Desk Domain" ;
				that.showloading = false;
				setTimeout(function () {
					that.Message = "";
				}, 5000);
			});
		this.cdr.detectChanges();
	}
	sortFDFields() {
		var Fieldlist = [];
		for (var {name: n } of this.FDFields) {
			Fieldlist.push(n);
		}

		Fieldlist.sort(function (a, b) {

            return (a > b) ? -1 : (a < b) ? 1 : 0;
        });

        Fieldlist.reverse();
		var FDlist=[]
		for (var singlefield of Fieldlist) {
			for (var singlefdfield of this.FDFields) {

				if (singlefield == singlefdfield.name) {
                    FDlist.push(singlefdfield)
				}
			}

		}
		this.FDFields = FDlist;
	}
	/**
	* Verifies if  given mapping exist or not
	* QuestionId: Given Question ID
	* field: Field name of givne integration type
	* mapid: Mapping id of the given mapping, if the  given mapping is fresh then the mapid is empty , 
	* so same function can be used to check mapping both on adding maps and editing maps
	* Tagmappinglist: Mapping list  backup list that  is not effected by search 
	* Return empty string on success else error string is returned
	* Note: Then function return error message unique to all type of integrations, a string 'integrationtype' is returned for field case errors, that string has to be replaced with the respective integration type  Eg: integrationtype field=> Salesforce field
	*  */

	IsThisMappingExist(QuestionId: string, field: String, mapId: string, Tagmappinglist: any) {
		var QuestionTagcount = 0;
		var FieldCount = 0;

		if (QuestionId.trim() == "" && field.trim() == "") {
			return "Please Select any Question Tag and Fresh Desk Field";

		}
		else if (QuestionId.trim() == "") {
			return "Please Select a Question Tag";

		}
		else if (field.trim() == "") {
			return "Please Select a Fresh Desk Field";
		}

		for (var count = 0; count < Tagmappinglist.length; count++) {
			if ((Tagmappinglist[count].QtnID.toUpperCase() == QuestionId.toUpperCase()) && (Tagmappinglist[count]._Id != mapId) && (Tagmappinglist[count].disabled == "false")) {
				QuestionTagcount++;

			}
			if ((Tagmappinglist[count].Field.toUpperCase() == field.toUpperCase()) && (Tagmappinglist[count]._Id.toUpperCase() != mapId.toUpperCase()) && (Tagmappinglist[count].disabled == "false")) {
				FieldCount++;
			}

		}
		if (QuestionTagcount >= 1) {
			return "Question Tag already used";
		}
		if (FieldCount >= 1) {
			return "Fresh Desk Field  already used";
		}
		return "";


	}

	/**
	 * Adds new mapping to the existing mapping 
	 * Tagmappingbackup:Complete Mapping list backup, not effected by search
	 * QuestionTag: Given Question tag
	 * field: Field name of given integration type
	 * QuestionID:Question id of the selected tag
	 * 
	 *  */

	AddNewMapping(Tagmappingbackup: any, QuestionTag: string, field: String, QuestionID: string) {

		var today = new Date();
		var _id = "tag_" + Math.floor((Math.random() * 1000000000) + 1) + "" + today.getMonth() + "" + today.getDate() + "" + today.getHours() + "" + today.getMilliseconds();
		var singlemap = { "_Id": _id, "Tag": QuestionTag, "QtnID": QuestionID, "Field": field, "disabled": "false", time: today };
		this.Tagmappingbackup.push(singlemap);
		this.SearchMap();

		return "";

	}

	/**
	 * Adds new  mapping  or editing the existing mapping, if mapid is empty then  AddNewMapping method is called else editing of the mapping is done.
	 * Tagmappingbackup:Complete Mapping list backup, not effected by search in UI
	 * Tagmappinglist: Mapping list to display in UI, effected by search in UI
	 * QuestionTag: Given Question tag
	 * field: Field name of given integration type
	 * mapid: Mapping id, empty string for new mapping(incase of adding)
	 * QuestionID:Question id of the selected tag
	 * searchkey:  Key used for search, not used in editing, but used to assign the exact mapping to Mapping list(to display in UI) with modified values  from mapping backup list if search is in use, so the same modificataion done to backup list are reflected in display list
	 *  */

	AddorEditmapping(Tagmappingbackup: any, Tagmappinglist: any, QuestionTag: string, field: string, mapid: string, QuestionID: string, searchkey: string) {

		var message = this.IsThisMappingExist(QuestionID, field, mapid, Tagmappingbackup)
		if (message != "")
			return message;
		if (mapid == "") {

			this.AddNewMapping(Tagmappingbackup, QuestionTag, field, QuestionID);
			this.SearchMap();
		}
		else {

			Tagmappinglist = this.EditTagFieldMapping(mapid, QuestionTag + '::' + QuestionID, field, 'false', Tagmappingbackup, searchkey)
		}
		return "";
	}

	// Method is used to validate the data types of the mappings, as per CC provided information
	validateMappings(Tagdata: any, Field: string) {
		var res = Tagdata.split("::");
		var tag = res[0];
		var displayType = res[1].toUpperCase();
		var qid = res[2];
		var fdData = Field.split("::");
		var fdType = fdData[0];
		var fdField = fdData[1];

		if (this.InsertEditFlag) {

			var keysInConstraint = Object.keys(this.fieldMapConstraint).toString().toUpperCase();
			if (this.fieldMapConstraint[displayType] == null) {
				if (!(fdType.toUpperCase() == "CUSTOM_TEXT")) {
					this.InsertError = 'This CC Tag must be matched with a FD Field which is of type CUSTOM_TEXT';
					return false;
				}
			}
			else if (fdType.toUpperCase() == this.fieldMapConstraint[displayType].toUpperCase()) {
				return true;
			}
			else {
				this.InsertError = 'CC Tag data type and FD Field data type are not matched.';
				return false;
			}
			return true;
		}
		else {

			var keysInConstraint = Object.keys(this.fieldMapConstraint).toString().toUpperCase();
			if (this.fieldMapConstraint[displayType] == null) {
				if (!(fdType.toUpperCase() == "CUSTOM_TEXT")) {
					this.InsertError = 'This CC Tag must be matched with a FD Field which is of type CUSTOM_TEXT';
					return false;
				}

			}
			else if (fdType.toUpperCase() == this.fieldMapConstraint[displayType].toUpperCase()) {
				return true;
			}
			else {
				this.InsertError = 'CC Tag data type and FD Field data type are not matched.';
				return false;
			}
			return true;

		}
	}

	//Insert for   CC to SF Tag- field mapping 
	AddMapping(Tagdata: any, Field: string) {
		if (Tagdata == "" && Field == "") {
			this.InsertError = "Please Select any Question Tag and Field";
			return;
		}
		else if (Tagdata == "") {
			this.InsertError = "Please Select a Question Tag";
			return;
		}
		else if (Field == "") {
			this.InsertError = "Please Select a FreshDesk Field";
			return;
		}

		var res = Tagdata.split("::");
		var tag = res[0];
		var displayType = res[1].toUpperCase();
		var qid = res[2];
		var fdData = Field.split("::");
		var fdType = fdData[0];
		var fdField = fdData[1];

		//this.InsertError=this.AddorEditmapping(this.Tagmappingbackup,this.Tagmapping,tag,fdField,this.InsertEditid,qid,this.searchKey).replace('integrationtype',this.Integrationtype);
		var validationresult = this.validateMappings(Tagdata, Field);

		if (validationresult) {
			this.InsertError = this.AddorEditmapping(this.Tagmappingbackup, this.Tagmapping, tag, fdField, this.InsertEditid, qid, this.searchKey);
		}
		if (this.InsertError != "")
			return;

		//Posting  mapping data and Inegration type to Parent component
		this.InsertEditFlag = false;
		this.InsertEditid = "";
		this.Qid = "";
		this.Field = "";
		this.Tagdata = "";

		if (this.CCMappings == null) {
			this.FDPostintegrationdata = this.prepareIntegrationData();
		}
		else {
			this.LogTheMapping();
		}
		this.PostIntegration.emit({ mapping: this.FDPostintegrationdata, value: this.FreshDeskKey });
		this.CancelEdit();

	}

	/**
	 * 
	 * Editing the selected map to given details , this function is used  to enable, disable, update the seleceted mapping
	 * _id: Mapping id
	 *   Field: Field name of givne integration type
	 *  isDisabled:  is mapping  disabled or not
	 *   Tagmapping: Mapping list used as backup that contains all the  mapping, irrespective of search parameter
	 *   searchkey: Key used for search, not used in editing, but used to assign the exact mapping to Mapping list(to display in UI) with modified values  from mapping backup list if search is in use, so the same modificataion done to backup list are reflected in display list
	*/

	EditTagFieldMapping(_id: string, Questiontag: string, Field: string, isDisabled: string, Tagmappingbackup: any, searchkey: string) {

		var res = Questiontag.split("::");
		var tag = res[0];
		var Fieldarr = Field.split("::");
		var qid = res[1];
		for (var counterbkp = 0; counterbkp < Tagmappingbackup.length; counterbkp++) {

			if (Tagmappingbackup[counterbkp]._Id != _id)
				continue;
			if (tag != '') {
				Tagmappingbackup[counterbkp].Tag = tag;
			}
			if (qid != '') {
				Tagmappingbackup[counterbkp].QtnID = res[1];
			}
			if (Field != '') {
				Tagmappingbackup[counterbkp].Field = Fieldarr[0];
			}
			if (isDisabled != '') {
				Tagmappingbackup[counterbkp].disabled = isDisabled;
			}
		}

		this.LogTheMapping();
		this.PostIntegration.emit({ mapping: this.FDPostintegrationdata, value: this.FreshDeskKey });
		this.SearchMap();
	}

	// Used to maintain the previous mapping backup with date and time
	LogTheMapping() {
		this.FDPostintegrationdata = this.CCMappings;
		this.FDPostintegrationdata.FDAPIKey = this.FDKey;
		this.FDPostintegrationdata.FDURL = this.FDURL;
		this.FDPostintegrationdata.Mappings = this.Tagmappingbackup;
		for (var counterbkp = 0; counterbkp < this.Tagmappingbackup.length; counterbkp++) {
			this.Tagmappingbackup[counterbkp].time = new Date();
			if (this.FDPostintegrationdata.MappingsBackup == null)
				this.FDPostintegrationdata.MappingsBackup = [];
			this.FDPostintegrationdata.MappingsBackup.push(this.Tagmappingbackup[counterbkp]);
		}
		this.PostIntegration.emit({ mapping: this.FDPostintegrationdata, value: this.FreshDeskKey });
	}

	//To display information in Pop up
	ShowinPopup(map: any, Action: string) {
		this.PopupAction = Action;
		this.samplemodal = true;
		switch (Action) {
			case "Edit": this.Editmap = map;
				this.PopupMessage = "Are you sure you want to edit?";
				this.modalTitle = "Edit Dialog";
				break;
			case "Enable": this.DisableDisablemap = map;
				this.PopupMessage = "Are you sure you want to enable?";
				this.modalTitle = "Enable Dialog";
				break;
			case "Disable": this.EnableDisablemap = map;
				this.PopupMessage = "Are you sure you want to disable?";
				this.modalTitle = "Disable Dialog";
				break;
		}
	}

	ngModalClose() {
		this.samplemodal = false;
		this.PopupMessage = "";
	}

	ConfirmAction() {
		this.samplemodal = false;
		switch (this.PopupAction) {
			case "Edit": this.EditInsertMap();
				break;
			case "Enable": this.EnableInsertMapping();
				break;
			case "Disable": this.DisableInsertMapping();

		}
	}

	//To fetch the respective edited tag data
	GetTagOnEdit(Questionid: string) { 
		var questionobject = this.Questionslist.filter(item => item.id == Questionid);
		var Tagslist = questionobject[0].questionTags;
		var locationslist = questionobject[0].displayLocation;
		if (locationslist.length == 0) {
			return Object.keys(this.existingCCTags);
		}
		var LocationQuestions = this.Questionslist.filter(item => item.displayLocation.some(r => locationslist.includes(r)));
		LocationQuestions.forEach((singlequestion: any) => { Tagslist = Tagslist.concat(singlequestion.questionTags) });
		LocationQuestions = this.Questionslist.filter(item => (item.displayLocation.length===0));
		LocationQuestions.forEach((singlequestion: any) => { Tagslist = Tagslist.concat(singlequestion.questionTags) });

		var finaltagslist = [];
			Tagslist.sort(function (a, b) {
            return (a > b) ? -1 : (a < b) ? 1 : 0;
        });
     
        Tagslist.reverse();
		  var missingTags = this.defaultFDFields;
		
		Tagslist.forEach((singleTag: any) => { 
			if(missingTags.toUpperCase().indexOf(singleTag.toUpperCase())==-1){
			if (finaltagslist.indexOf(singleTag) < 0) {
				finaltagslist.push(singleTag);
				
			}
			}
		});



   


		return finaltagslist;
	}

	//Editing mapping 
	EditInsertMap() {

		var map = this.Editmap;
		var selectedFieldType = this.FDFields.filter(item => item.name.toLowerCase() == map["Field"].toLowerCase());
		this.InsertError = "";
		this.Message = '';
		this.InsertEditFlag = true;
		this.EditQuestiontag = null;
		this.EditQuestiontag = this.GetTagOnEdit(map.QtnID);
		this.Qid = map.QtnID + '$$$' + map.Tag;

		//storing the id of the mapping selected for edit
		this.InsertEditid = map._Id;
		var fdDrpValue = selectedFieldType[0].type + '::' + map["Field"];
		this.Field = fdDrpValue;
		this.Tagdata = "";
	}

	//Disable  Tag- field mapping
	DisableInsertMapping() {
		this.InsertError = "";
		this.Message = '';
		this.EditTagFieldMapping(this.EnableDisablemap._Id, this.EnableDisablemap.Tag + '::' + this.EnableDisablemap.QtnID, this.EnableDisablemap.Field, 'true', this.Tagmappingbackup, this.searchKey);
		this.CancelEdit();
	}

	//Enable  Tag- field mapping
	EnableInsertMapping() {
		var id = this.DisableDisablemap._Id;
		var QuestionTag = this.DisableDisablemap.Tag;
		var FDField = this.DisableDisablemap.Field;
		this.InsertError = this.IsThisMappingExist(this.DisableDisablemap.QtnID, FDField, id, this.Tagmappingbackup);
		this.Message = '';
		if (this.InsertError != "") {
			this.InsertError = "Question tag/Fresh Desk Field already used, cannot be enabled";
			return;
		}
		this.EditTagFieldMapping(this.DisableDisablemap._Id, this.DisableDisablemap.Tag + '::' + this.DisableDisablemap.QtnID, this.DisableDisablemap.Field, 'false', this.Tagmappingbackup, this.searchKey);
		this.CancelEdit();
	}

	//Cancel Popup
	CancelEdit() {
		this.EditQuestiontag = null;
		this.InsertEditid = "";
		this.InsertError = "";
		this.InsertEditFlag = false;
		this.Field = "";
		this.Tagdata = "";
		this.Message = "";
	}

	SearchMap() {
		this.InsertError = "";
		this.Tagmapping = this.Tagmappingbackup.filter((item) => item.Tag.toUpperCase().indexOf(this.searchKey.toUpperCase()) > -1 || item.Field.toUpperCase().indexOf(this.searchKey.toUpperCase()) > -1);
	}

	/**
	 * Sorting the map based on the given column
	 * column: Column to sort on
	 * Maporder: order of sorting, ascending or descending, common  for  all columns    
	 */

	SortMap(column: string) {
	
		this.maporder = !this.maporder;
		this.Tagmapping.sort((a, b) => {
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

}
