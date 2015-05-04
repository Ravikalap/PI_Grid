var Ext = window.Ext4 || window.Ext;
var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    uses: [
        'Ext.ux.exporter.Exporter'
    ],
    componentCls: 'app',

    launch: function() {
        this._GridRecords = [];
        this._boxcontainer = Ext.create('Ext.form.Panel', {
            layout: { type: 'hbox'},
            width: '95%',
            bodyPadding: 10
        });
        this._loadReleases();
    },
    
    _loadReleases: function() {
        app = this;
        this._releaseCombobox = this.add({
                xtype: 'rallyreleasecombobox',
                listeners: {
                    ready: this._loadFeatures,
                    change: this._onReleaseComboboxChanged,
                    scope: this
                }
            });
            
        this._myButton = this.add({
            xtype : 'rallybutton',
            height : 20,
            text : 'Export to CSV',
            listeners : {
                scope :this,
                click : function() {
                    var exporter = Ext.create("GridExporter",{});
                    exporter.exportGrid(app._myGrid);
                }
            }
        });
        
        this._boxcontainer.add(this._releaseCombobox);
        this._boxcontainer.add(this._myButton);
        this.add(this._boxcontainer);
    },

    _loadFeatures: function() {
        this._myStore = Ext.create("Rally.data.WsapiDataStore", {
            model: 'PortfolioItem/Feature',
            autoLoad: true,
            filters: this._getFilter(),
            context: this.getContext().getDataContext(),
            remoteSort: false,
            listeners: {
                load: function(store, records, success) {
                    this._getGrandparents(records);
                },
                scope: this
            },
            fetch: ["Name", "FormattedID", "CustomField1", 'Release', 
                "Parent"]
        });
    },

    _getGrandparents: function(data) {
        var me = this;
        var gridRecord = [];
        var lastRecord = false;
        var length = data.length;

        Ext.Array.each(data, function(record) {
            length--;
            if(length === 0) { lastRecord = true; }
            gridRecord = {
                _ref: record.get('_ref'),
                ObjectID: record.get('ObjectID'),
                FormattedID: record.get('FormattedID'),
                Release: record.get('Release'),
                Name: record.get('Name'),
                Parent: record.get('Parent'),
                Grandparent: 0
            };
            me._setGrandparent(gridRecord, lastRecord);
            me._GridRecords.push(gridRecord);
        });
    },
    
    _setGrandparent: function (gridRecord, lastRecord) {
        var parent = gridRecord.Parent;
        if ( parent ) {
            Ext.create('Rally.data.WsapiDataStore', {
                model: 'PortfolioItem/Initiative',
                autoLoad: true,
                filters: [{
                    property : 'Name',
                    operator : '=',
                    value    : parent.Name
                }],
                fetch: ['Name', 'Parent', 'FormattedID', '_ref'],
                listeners: {
                    load: function(store, data, success) {
                        this._onInitiativesLoaded(data, gridRecord, lastRecord);
                    },
                    scope: this
                }
            }); 
        }
    },
    
    _onInitiativesLoaded: function(resultsData, currentRec, lastRecord) {
        var me = this;
        var gp;
       Ext.Array.each(resultsData, function(record) {
            gp = record.get('Parent');
        });
        
        if ( gp ) {
            currentRec.Grandparent = gp;
        }
        if( lastRecord ) {
            me._createGrid(resultsData);
        }
        console.log("grid data: ", currentRec);
    },
    
    _getFilter: function() {
        var combo = this.down('rallyreleasecombobox');
        var execFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'CustomField1',
            operator: '=',
            value: 'Exec'
        });
        
        var releaseFilter = combo.getQueryFromSelected();
        var filter = releaseFilter.and(execFilter);
        return filter;
    },
    
    _onReleaseComboboxChanged: function() {
        if (this._myGrid) {
            var store = this._myGrid.getStore();
            store.clearFilter(!0);
            this._myGrid.destroy();
            this._GridRecords = [];
            this._loadFeatures();
        }
        else {
            console.log("grid not created yet");
        }
    },
    
    renderName : function(value,meta,rec,row,col) {
        return value ? value.Name : value;
    },
    renderID : function(value, meta, rec, row, col) {
        return value ? value.FormattedID : value;
    },
    
    renderParent: function(value, meta, rec, row, col ) {
        var name = value.FormattedID + " " + value.Name;
        console.log("parent name: ", name );
        return name;
    }, 
    
    _createGrid: function(gridRecords) {
        this._myGrid = this.add({
            xtype: 'rallygrid',
            columnCfgs: [
                {
                    xtype: 'templatecolumn',
                    text: 'ID',
                    dataIndex: 'FormattedID',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name',
                    dataIndex: 'Name',
                    flex: 2
                },
                {
                    text: 'Release',
                    dataIndex: 'Release',
                    renderer: this.renderName,
                    flex: 1
                },
                /*{
                        text: 'Parent ID',
                        dataIndex: 'Parent',
                        renderer: this.renderID,
                        tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                        
                },*/
                {
                    text: 'Parent',
                    dataIndex: 'Parent',
                    renderer: this.renderParent,
                    tpl: Ext.create('Rally.ui.renderer.template.ParentTemplate')
                },
                {
                    text: 'Grandparent',
                    dataIndex: 'Grandparent',
                    renderer: this.renderParent,
                    flex: 2
                }
            ],
            context: this.getContext(),
            store: Ext.create('Rally.data.custom.Store', {
             data: this._GridRecords,
             model: 'PortfolioItem/Feature',
             height: '98%'
            })
        });
    }
});