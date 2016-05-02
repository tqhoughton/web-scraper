//this creates a valid filename that is tied to the date in local time
var path = "allMatches_" + new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString() + ".txt";
path = path.replace(/ /g,"_").replace(",", "").replace(/:/g, "");
var links = [];
var items = [];

var fs = require('fs');

var casper = require('casper').create({
    //verbose: true,
    //logLevel: "debug"
});

//this is a function that recursively grabs all item urls across a site's pagination
var getUrlsAndStore = function() {
    var linkInfo = casper.getElementsInfo("span > .listlink");
    
    for (var i = 0; i < linkInfo.length; i++) {
        links.push("http://www.ksl.com/" + linkInfo[i].attributes.href);
    }
    
    var nextLink = "a[rel=next]";
    if (casper.visible(nextLink)) {
        casper.thenClick(nextLink);
        return casper.then(getUrlsAndStore);
    } else {
        return casper.echo("no more pages");
    }
    
}

//helper function for getting id's
var getIdFromUrl = function(str) {
    //first, we find the first instance of the string 'ad='
    var pos = str.indexOf("ad=") + 3;
    return parseInt(str.substr(pos, 8));
}

//once we have all of the urls, this function recursively grabs the necessary data from each listing.
var getPagesInfo = function(urls) {
    if (urls.length === 0) {
        return casper.echo("no more pages to grab!");
    } else {
        casper.thenOpen(urls[0], function() {
            casper.echo(urls.length + " listings left to grab");
            var price = casper.getElementInfo(".productPriceBox").text;
            price = price.toString();
            price = price.replace(/\n/g, "").replace("$", "").replace(",", "").trim();
            price = parseInt(price) / 100;
            var title = casper.getElementInfo(".productContentTitle").text;
            var description = casper.getElementInfo(".productContentText").text;
            var url = urls[0];
            
            var newObj = {
                price: price,
                title: title,
                description: description,
                url: url,
                id: getIdFromUrl(url)
            }
            
            items.push(newObj);
            urls.splice(0, 1);
            return getPagesInfo(urls);
        });
    }
};

//once we have all of our data, we write it to a text file
var writeToFile = function(objs) {
    var filestream = "";
    var newFileStream = "";
    
    for (var i = 0; i < objs.length; i++) {
        var currentObj = objs[i];
        var format = "\r\n" + "TITLE: " + currentObj.title + "\r\n" + "PRICE: $" + currentObj.price + "\r\n" + "DESCRIPTION: " + currentObj.description + "\r\n" + "URL: " + currentObj.url + "\r\n" + "ID: " + currentObj.id + "\r\n";
        filestream += format;
    }
    
    fs.write(path, filestream, "w");
}

var searchTerms = {
    //itemType: "computers",
    item: "Macbook Pro",
    lowerPriceRange: 800,
    upperPriceRange: 1000,
    minHDSpace: 256,
    zip: 84062
}


casper.start("http://www.ksl.com/?nid=13", function() {
    this.fill('form.searchForm', {
        'search' : searchTerms.item,
        'zip' : searchTerms.zip,
        'min_price' : searchTerms.lowerPriceRange,
        'max_price' : searchTerms.upperPriceRange
        
    }, true);
})

casper.then(function() {
    this.echo("getting urls...");
    getUrlsAndStore().then(function() {
        this.echo("grabbing page info...");
        getPagesInfo(links);
        }).then(function() {
            this.echo("writing to file...");
            writeToFile(items);
    })
})

casper.run(function() {
    this.echo("Write Complete!")
    this.exit();
})