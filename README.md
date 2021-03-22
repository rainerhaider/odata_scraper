# OData scraper

## Usage:
Use odata_scraper -h to see the full list of parameters.

## Example:
``` console
node odata_scraper.js -u https://api2preview.sapsf.eu/odata/v2 -s AUT -a value -d 2 -f "personIdExternal eq 'ECT10008494'" -e PerPerson
```

## Full list of parameters
```console
Usage: odata_scraper [options]

Options:
  -V, --version                  output the version number
  -u, --uri <uri>                Odata URI
  -a, --action <SearchMode>      Set mode of search Key
  -c, --caseSensitive            Searches case sensitive or not (default: false)
  -d, --depth <Number of depth>  Set the depth of Navigation Properties
  -e, --entity <Name of entity>  Name of the Entity to Search
  -f, --filter <OData filter>    Set $filter for odata request
  -o, --output <Directory>       Output directory of the result files. -p is needed. (default: "./odata")
  -p, --persist                  Persist files on disk (default: false)
  -s, --search <Directory>       Defines the string to search for. (default: "")
  -v, --verbose                  Set verbose on or off
  -U, --User <username>          Set username for odata request
  -P, --Password <password>      Set password for odata request
  -h, --help                     display help for command
```
