Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        //looking for stories without parents
        var myFilter;
        var parentFilter = Ext.create('Rally.data.QueryFilter', {
            property: 'Parent', operator: '=', value: 'null'
        });
        
        // if there is a timebox on the dashboard/page, make use of it
        var timeboxScope = this.getContext().getTimeboxScope();
        if( timeboxScope ) {
            // if this is an iteration timebox, set to the original parent filter and move on
            console.log("Timebox query: ", timeboxScope.getQueryFilter());
            if ( timeboxScope.getType() === 'iteration') {
                myFilter = parentFilter;
            }
            else { // release filter
                myFilter = parentFilter.and(timeboxScope.getQueryFilter());
            }
        } 
        else {
            myFilter = parentFilter;
        }
        
        Rally.data.ModelFactory.getModel({
            type: 'PortfolioItem/Feature',
            success: function(model) {
                this.grid = this.add({
                    xtype: 'rallygrid',
                    model: model,
                    columnCfgs: ['FormattedID','Name','Owner', 'State', 'Release'],
                    storeConfig: {
                        filters: [myFilter]
                    }
                });
            },
            scope: this
        });
    },
    
    onTimeboxScopeChange: function(newTimeboxScope) {
        this.callParent(arguments);
        console.log("Timebox Changed called");
        var parentFilter = Ext.create('Rally.data.QueryFilter', {
            property: 'Parent', 
            operator: '=', 
            value: 'null'
        });
        
        var newFilter = parentFilter.and(newTimeboxScope.getQueryFilter());
        var store = this.grid.getStore();
        store.clearFilter(true);
        store.filter(newFilter);
    }
});