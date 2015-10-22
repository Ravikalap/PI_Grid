var Ext = window.Ext4 || window.Ext;
var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    uses: [
        'Ext.ux.exporter.Exporter'
    ],
    componentCls: 'app',

    launch: function() {
        app = this;       
        var that = this;
        this._GridRecords = [];
        this._boxcontainer = Ext.create('Ext.form.Panel', {
            layout: { type: 'hbox'},
            width: '95%',
            bodyPadding: 10
        });
        this._loadPortfolioItemTypes(function(){
            console.log(app.piTypes);
            that._loadReleases();    
        });
        
    },

    _loadPortfolioItemTypes : function(callback) {

        var piStore = Ext.create("Rally.data.WsapiDataStore", {
            model: 'TypeDefinition',
            autoLoad: true,
            fetch : true,
            filters: [ { property:"Ordinal", operator:"!=", value:-1} ],
            listeners: {
                load: function(store, records, success) {
                    // console.log("pi record types",records);
                    app.piTypes = _.map(records,function(r){ return r.get("TypePath")});
                    callback();
                },
                scope: this
            },
        });

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
        var me = this;
        // console.log(this._getFilter().toString());
        this._myStore = Ext.create("Rally.data.WsapiDataStore", {
            // model: 'PortfolioItem/Feature',
            model : app.piTypes[0],
            autoLoad: true,
            filters: this._getFilter(),
            context: this.getContext().getDataContext(),
            remoteSort: false,
            listeners: {
                load: function(store, records, success) {
                    // console.log("records",records);
                    // this._getGrandparents(records);
                    // barry starts here
                    me._GridRecords = records;
                    me._createGrid();
                    this.__getGrandParents(records);
                    // barry ends here
                },
                scope: this
            },
            fetch: ["Name", "FormattedID", "CustomField1", 'Release', 
                "Parent"]
        });
    },

    __getGrandParents : function( features ) {

        // console.log("get grandparents",features);

        async.map( features, 

            function(feature, callback) {
                if ( feature.get('Parent')) {
                    Ext.create('Rally.data.WsapiDataStore', {
                        // model: 'PortfolioItem/Initiative',
                        model : app.piTypes[1],
                        autoLoad: true,
                        filters: [{
                            property : 'FormattedID',
                            operator : '=',
                            value    : feature.get('Parent')["FormattedID"]
                        }],
                        fetch: ['Name', 'Parent', 'FormattedID', '_ref','ObjectID'],
                        listeners: {
                            load: function(store, data, success) {
                                // me._onInitiativesLoaded(data, gridRecord);
                                // console.log(_.first(data).get("Parent"));

                                callback(null,_.first(data).get("Parent"));
                            },
                            scope: this
                        }
                    }); 
                } else {
                    callback(null,null);
                }
            },
            function(err,results){
                // console.log("grandparent results",results);
                _.each(features,function(feature,i) {
                    feature.set("Grandparent",results[i])
                })
            }
        )

    },

    _getGrandparents: function(data) {
        var me = this;
        var gridRecord = [];
        async.forEach(data, function(record, callback) {
        // console.log('Processing record ' + record);
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
                    // model: 'PortfolioItem/Initiative',
                    model : app.piTypes[1],
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
                // model: 'PortfolioItem/Initiative',
                model : app.piTypes[1],
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
        // return filter;
        return releaseFilter;
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
        console.log("grid records",this._GridRecords);
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
                    // tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate'),
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
             // model: 'PortfolioItem/Feature',
             model : app.piTypes[0],
             height: '98%'
            })
        });
    }
});