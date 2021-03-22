const prompt = require('prompt-sync')();
const ODATA = require('./odata');
const commander = require('commander');
const { exit } = require('process');
const program = new commander.Command();
program.version('1.0.0');
program
.requiredOption('-u, --uri <uri>', 'Odata URI')
.addOption(new commander.Option('-a, --action <SearchMode>', 'Set mode of search Key'))
.addOption(new commander.Option('-c, --caseSensitive', 'Searches case sensitive or not').default(false))
.addOption(new commander.Option('-d, --depth <Number of depth>', 'Set the depth of Navigation Properties'))
.addOption(new commander.Option('-e, --entity <Name of entity>', 'Name of the Entity to Search'))
.addOption(new commander.Option('-f, --filter <OData filter>', 'Set $filter for odata request'))
.addOption(new commander.Option('-o, --output <Directory>', 'Output directory of the result files. -p is needed.').default('./odata'))
.addOption(new commander.Option('-p, --persist', 'Persist files on disk').default(false))
.addOption(new commander.Option('-s, --search <Directory>', 'Defines the string to search for.').default(''))
.addOption(new commander.Option('-v, --verbose', 'Set verbose on or off'))
.addOption(new commander.Option('-U, --User <username>', 'Set username for odata request').default('CPIC_EC@knappagT1'))
.addOption(new commander.Option('-P, --Password <password>', 'Set password for odata request'))
.parse();

const oArgs = program.opts();

if (oArgs.User && !oArgs.Password){
  oArgs.Password = prompt('Enter Password: ', {echo: '*'});
}

const oMetaData = ODATA.getMetadataDocument(oArgs.uri.trim(), oArgs.User.trim(), oArgs.Password.trim());
const aEntities = ODATA.getEntities(oMetaData);
const sFilter = (oArgs.filter) ? oArgs.filter : undefined;

if (oArgs.entity){
  process.stdout.write(`\nSearching in Entity ${oArgs.entity.trim()}`);
  executeForSingleEntity(oArgs, sFilter, oArgs.entity.trim());
} else{
  var iCounter = 1;
  aEntities.forEach(async oEntity => {
    const sEntity = oEntity.attributes.Name.trim();
    process.stdout.write(`\nSearching in Entity ${sEntity} (${iCounter} of ${aEntities.length}) `);
    iCounter++;
    executeForSingleEntity(oArgs, sFilter, sEntity);
  });
}

process.exit(0);


/**
 * 
 * @param {object} oArgs - Object that holds all commandline arguments
 * @param {string} sFilter - oData filter
 */
function executeForSingleEntity(oArgs, sFilter, sEntity){
  if (oArgs.depth && oArgs.depth > 0) {
    const aExpands = ODATA.assignExpandString('$expand=', aEntities, sEntity, 1, parseInt(oArgs.depth));
    aExpands.forEach(sExpand => {
      process.stdout.write(".");
      const sUrl = (sFilter) ? `${oArgs.uri.trim()}/${sEntity}?$filter=${sFilter}&${sExpand}` : `${oArgs.uri.trim()}/${sEntity}?${sExpand}`;
      const aContent = JSON.parse(ODATA.getData(sUrl, oArgs.User.trim(), oArgs.Password.trim(), true));
      // console.log(sUrl);
      if (aContent.hasOwnProperty("d")){
        if (oArgs.action.trim() == 'key'){
          ODATA.searchForKey(sExpand, aContent.d.results, oArgs);
        }else {
          ODATA.searchForValue(sExpand, aContent.d.results, oArgs);
        }
      }
    });
  }else{
    const sUrl = (sFilter) ? `${oArgs.uri.trim()}/${sEntity}?$filter=${sFilter}` : `${oArgs.uri.trim()}/${sEntity}?${sExpand}`;
    const aContent = JSON.parse(ODATA.getData(sUrl, oArgs.User.trim(), oArgs.Password.trim(), true));
    if (aContent.hasOwnProperty("d")){
      if (oArgs.action.trim() == 'key'){
        ODATA.searchForKey(sEntity, aContent.d.results, oArgs);
      }else {
        ODATA.searchForValue(sEntity, aContent.d.results, oArgs);
      }
    }
  }
}
