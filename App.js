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
        var me = this;
        this._myStore = Ext.create("Rally.data.WsapiDataStore", {
            model: 'PortfolioItem/Feature',
            autoLoad: true,
            filters: this._getFilter(),
            context: this.getContext().getDataContext(),
            remoteSort: false,
            listeners: {
                load: function(store, records, success) {
                    me._GridRecords = records;
                    me._createGrid();
                    this._getGrandParents(records);
                },
                scope: this
            },
            fetch: ["Name", "FormattedID", "CustomField1", 'Release', "Parent"]
        });
    },

    _getGrandParents : function( features ) {

        async.map( features, 

            function(feature, callback) {
                if ( feature.get('Parent')) {
                    Ext.create('Rally.data.WsapiDataStore', {
                        model: 'PortfolioItem/Initiative',
                        autoLoad: true,
                        filters: [{
                            property : 'FormattedID',
                            operator : '=',
                            value    : feature.get('Parent')["FormattedID"]
                        }],
                        fetch: ['Name', 'Parent', 'FormattedID', '_ref','ObjectID'],
                        listeners: {
                            load: function(store, data, success) {
                                //console.log(_.first(data).get("Parent"));
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
                //console.log("grandparent results",results);
                _.each(features,function(feature,i) {
                    feature.set("Grandparent",results[i]);
                });
            }
        );

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
    },
    
    renderName : function(value,meta,rec,row,col) {
        return value ? value.Name : value;
    },
    renderID : function(value, meta, rec, row, col) {
        return value ? value.FormattedID : value;
    },

    _createGrid: function() {
        //console.log("grid records",this._GridRecords);
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
             model: 'PortfolioItem/Feature',
             height: '98%'
            })
        });
    }
});