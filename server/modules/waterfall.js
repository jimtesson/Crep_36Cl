exports.WaterfallOver = function(list, iterator, callback, param) {

    var nextItemIndex = 0;  //keep track of the index of the next item to be processed
    
    function report() {

    	nextItemIndex++;

        // if nextItemIndex equals the number of items in list, then we're done
        if(nextItemIndex === list.length)
        	callback(list.length);
        else{
            // otherwise, call the iterator on the next item
            if(!param)
            	iterator(list[nextItemIndex], report);
            else
            	iterator(list[nextItemIndex], report,param);
        }
        
    }
    
    // instead of starting all the iterations, we only start the 1st one
    if(!param)
    	iterator(list[0], report);
    else
    	iterator(list[0], report,param);
}
exports.WaterfallOverSamples = function(list, iterator, callback) {

    var nextItemIndex = 0;  //keep track of the index of the next item to be processed
    
    function report(concMatrix) {

    	nextItemIndex++;

        // if nextItemIndex equals the number of items in list, then we're done
        if(nextItemIndex === list.length)
        	callback(list.length,concMatrix);
        else{
            // otherwise, call the iterator on the next item
            iterator(list[nextItemIndex], report);
        }
        
    }
    // instead of starting all the iterations, we only start the 1st one
    iterator(list[0], report);

};
exports.WaterfallOverRegions = function(list,nucl, iterator, callback) {

    var nextItemIndex = 0;  //keep track of the index of the next item to be processed
    resIds = [];
    function report(ids) {
    	resIds =resIds.concat(ids);
    	nextItemIndex++;

        // if nextItemIndex equals the number of items in list, then we're done
        if(nextItemIndex === list.length)
        	callback(resIds);
        else{
            // otherwise, call the iterator on the next item
            iterator(list[nextItemIndex],nucl, report);

        }
        
    }
    // instead of starting all the iterations, we only start the 1st one
    iterator(list[0], nucl,report);
};