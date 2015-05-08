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
        async.forEach(data, function(record, callback) {
        console.log('Processing record ' + record);
        gridRecord = {
                _ref: record.get('_ref'),
                _type: Rally.util.Ref.getTypeFromRef(record),
                ObjectID: record.get('ObjectID'),
                FormattedID: record.get('FormattedID'),
                Release: record.get('Release'),
                Name: record.get('Name'),
                Parent: record.get('Parent'),
                Grandparent: 0
            };
            if( record.get('Parent')) {
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
                            me._onInitiativesLoaded(data, gridRecord);
                        },
                        scope: this
                    }
                }); 
            }
            me._GridRecords.push(gridRecord);
        callback();
        }, function(err){
            // if any of the processing produced an error, err would equal that error
            if( err ) {
              // One of the iterations produced an error.
              // All processing will now stop.
              console.log('A record failed to process');
            } else {
              console.log('All records have been processed successfully', me._GridRecords);
              me._createGrid();
            }
        });
        
       /* Ext.Array.each(data, function(record) {
            gridRecord = {
                _ref: record.get('_ref'),
                _type: Rally.util.Ref.getTypeFromRef(record),
                ObjectID: record.get('ObjectID'),
                FormattedID: record.get('FormattedID'),
                Release: record.get('Release'),
                Name: record.get('Name'),
                Parent: record.get('Parent'),
                Grandparent: 0
            };
            if( record.get('Parent')) {
                me._setGrandparent(gridRecord);
            }
            me._GridRecords.push(gridRecord);
        });
        this._createGrid();*/
    },
    
    _setGrandparent: function (gridRecord) {
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
                        this._onInitiativesLoaded(data, gridRecord);
                    },
                    scope: this
                }
            }); 
        }
    },
    
    _onInitiativesLoaded: function(resultsData, currentRec) {
        var gp;
        Ext.Array.each(resultsData, function(record) {
            gp = record.get('Parent');
        });
        
        if ( gp ) {
            currentRec.Grandparent = gp;
        }
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
        return value.name;
    }, 
    
    _createGrid: function() {
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
                {
                    xtype: 'templatecolumn',
                    text: 'Parent',
                    dataIndex: 'Parent',
                    tpl: Ext.create('Rally.ui.renderer.template.ParentTemplate'),
                    flex: 2
                        
                },
                {
                    xtype: 'templatecolumn',
                    text: 'Grandparent',
                    dataIndex: 'Grandparent',
                    tpl: Ext.create('Rally.ui.renderer.template.ChildObjectFormattedIDTemplate', {
                        showName: true,
                        childObjectProperty: 'Grandparent'
                    }),
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